import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { config } from '../config';
import PGListing from '../models/PGListing';

export const AiParseSchema = z.object({
  query: z.string().optional(),
  radius_km: z.number().min(1).max(30).optional(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  gender_preference: z.enum(['male', 'female', 'unisex']).optional(),
  amenities: z.array(z.string()).optional(),
  sort_by: z.enum(['recommended', 'distance', 'price', 'rating', 'popularity']).optional(),
});

export type StructuredSearchFilters = z.infer<typeof AiParseSchema>;

// In-Memory Query Cache to protect Gemini API quota on identical prompts (TTL 5 mins)
interface CacheEntry {
  reply: string;
  expiresAt: number;
}
const chatCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, entry] of chatCache.entries()) {
    if (entry.expiresAt < now) {
      chatCache.delete(key);
    }
  }
};

export const isAiAvailable = (): boolean => {
  return Boolean(config.geminiApiKey && config.geminiApiKey.trim().length > 0);
};

export function isRetryableError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code || err.response?.status;
  const message = (err.message || err.toString() || '').toLowerCase();

  // Non-retryable errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found)
  if (status === 400 || status === 401 || status === 403 || status === 404) return false;
  if (
    message.includes('invalid_argument') ||
    message.includes('unauthenticated') ||
    message.includes('api_key_invalid') ||
    message.includes('key not valid') ||
    message.includes('permission_denied')
  ) {
    return false;
  }

  // Retryable temporary errors (503 Service Unavailable, 429 Too Many Requests, 500, 504, Timeouts)
  if (status === 503 || status === 429 || status === 500 || status === 504) return true;
  if (
    message.includes('503') ||
    message.includes('429') ||
    message.includes('unavailable') ||
    message.includes('high demand') ||
    message.includes('spikes in demand') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('timeout') ||
    message.includes('fetch failed') ||
    message.includes('econnreset')
  ) {
    return true;
  }

  if (typeof status === 'number' && status >= 500) return true;
  return false;
}

export const parseVoiceSearch = async (text: string): Promise<StructuredSearchFilters> => {
  const sanitizedText = text.trim().slice(0, 300);
  if (!sanitizedText) {
    return { query: 'Ahmedabad' };
  }

  if (!isAiAvailable()) {
    return { query: sanitizedText };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    const prompt = `You are a search query parser for GeoNest, an accommodation and PG recommendation platform in India.
Analyze the user's spoken search query and convert it into structured JSON matching this schema:
{
  "query": "name of landmark, college, area or city if mentioned",
  "radius_km": number (default 5, max 30),
  "min_price": number (minimum monthly rent in INR),
  "max_price": number (maximum monthly rent in INR),
  "gender_preference": "male" | "female" | "unisex" (if specified like 'girls', 'boys', 'female', 'male'),
  "amenities": array of strings (e.g. ["Wi-Fi", "AC", "Mess", "Laundry", "Gym"]),
  "sort_by": "recommended" | "distance" | "price" | "rating" | "popularity"
}

User input: "${sanitizedText}"

Return ONLY valid raw JSON with no markdown formatting or markdown codeblocks.`;

    const response = await ai.models.generateContent({
      model: config.geminiModel || 'gemini-2.0-flash',
      contents: prompt,
    });

    const rawOutput = response.text || '';
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { query: sanitizedText };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = AiParseSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    return { query: sanitizedText };
  } catch (err) {
    console.error('[AI Parse Search Error]', err);
    return { query: sanitizedText };
  }
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function generateWithTimeout(
  ai: GoogleGenAI,
  modelName: string,
  formattedContents: any[],
  systemInstruction: string,
  timeoutMs: number = 20000
): Promise<string> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs / 1000}s for model "${modelName}"`));
    }, timeoutMs);
  });

  try {
    const apiCall = ai.models.generateContent({
      model: modelName,
      contents: formattedContents as any,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    });

    const response = (await Promise.race([apiCall, timeoutPromise])) as any;
    const replyText = response.text;
    if (!replyText) {
      throw new Error(`Empty response returned from model "${modelName}"`);
    }
    return replyText;
  } finally {
    clearTimeout(timeoutId!);
  }
}

export const handleAiChat = async (
  messages: ChatMessage[],
  appContext?: Record<string, any>
): Promise<string> => {
  if (!isAiAvailable()) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  clearExpiredCache();

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() || '';
  const cacheKey = lastUserMessage.toLowerCase().trim();

  // Check cache for quick suggestion queries (if messages history is short <= 2)
  if (messages.length <= 2 && cacheKey) {
    const cached = chatCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[AI Cache Hit] Serving cached answer for query: "${lastUserMessage}"`);
      return cached.reply;
    }
  }

  // Extract search terms for PG database context
  let pgResults: any[] = [];
  try {
    const searchTerms = lastUserMessage.split(/\s+/).filter((w) => w.length > 3).slice(0, 3);
    const queryCond = searchTerms.length > 0
      ? {
          $or: [
            { name: { $regex: searchTerms.join('|'), $options: 'i' } },
            { city: { $regex: searchTerms.join('|'), $options: 'i' } },
            { collegeName: { $regex: searchTerms.join('|'), $options: 'i' } },
            { address: { $regex: searchTerms.join('|'), $options: 'i' } },
          ],
        }
      : {};

    pgResults = await PGListing.find(queryCond).limit(5).lean();
    if (pgResults.length === 0 && searchTerms.length > 0) {
      pgResults = await PGListing.find({}).limit(5).lean();
    }
  } catch (dbErr) {
    console.warn('[AI Service] Non-critical DB context fetch warning:', dbErr);
  }

  const contextData = pgResults.map((pg) => ({
    id: pg._id,
    name: pg.name,
    city: pg.city,
    address: pg.address,
    college: pg.collegeName || 'N/A',
    rent: pg.pricePerMonth,
    gender: pg.genderPreference,
    availableRooms: pg.availableRooms,
    rating: (pg as any).averageRating || 'N/A',
  }));

  const systemInstruction = `You are GeoNest Assistant, a helpful, accurate, concise assistant inside the GeoNest app. Answer the user's actual question directly. Use the app context provided (user's location, current page, selected item, and relevant app data) when it helps. If you don't know something or the data isn't available, say so instead of guessing. Never repeat the same generic answer. Keep answers short and clear, use simple language, and ask a clarifying question if the request is ambiguous. Reply in the same language the user writes in.

CURRENT GEONEST DATABASE LISTINGS AVAILABLE FOR REFERENCE:
${JSON.stringify(contextData, null, 2)}

${appContext ? `CURRENT APP CONTEXT FROM USER SESSION:\n${JSON.stringify(appContext, null, 2)}` : ''}`;

  const formattedContents = messages.slice(-10).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  // Build model candidate chain
  const candidateModels = Array.from(
    new Set([
      config.geminiModel || 'gemini-2.0-flash',
      ...(config.geminiFallbackModels || []),
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
    ])
  ).filter(Boolean);

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  let lastError: any = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const replyText = await generateWithTimeout(
          ai,
          currentModel,
          formattedContents,
          systemInstruction,
          20000
        );

        console.log(
          `[AI Service Success] Answer generated by model "${currentModel}" on attempt ${attempt}.`
        );

        // Cache successful response for identical short queries
        if (messages.length <= 2 && cacheKey) {
          chatCache.set(cacheKey, {
            reply: replyText,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
        }

        return replyText;
      } catch (err: any) {
        lastError = err;
        const retryable = isRetryableError(err);

        if (!retryable) {
          console.error(`[AI Service Fatal] Non-retryable error on model "${currentModel}":`, err?.message || err);
          throw err;
        }

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000 + Math.floor(Math.random() * 500);
          console.warn(
            `[AI Service Warning] Model "${currentModel}" failed attempt ${attempt}/${maxRetries} (${err?.message || err}). Retrying in ${delayMs}ms...`
          );
          await new Promise((res) => setTimeout(res, delayMs));
        } else {
          console.warn(
            `[AI Service Warning] Model "${currentModel}" failed all ${maxRetries} attempts. Trying fallback models...`
          );
        }
      }
    }
  }

  console.error('[AI Chat Service Error] All Gemini models in fallback chain failed.');
  throw lastError || new Error('All Gemini model candidates failed to respond.');
};
