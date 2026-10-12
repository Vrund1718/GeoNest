import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import mongoose from 'mongoose';
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
      model: config.geminiModel || 'gemini-3.5-flash-lite',
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
  timeoutMs: number = 7500
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

const formatDbFallbackResponse = (pgs: any[], query: string): string => {
  if (!pgs || pgs.length === 0) {
    return `I searched GeoNest, but no PG accommodations currently match your exact criteria ("${query}"). Try increasing your budget or searching for a broader area!`;
  }

  const items = pgs
    .map((pg, idx) => {
      const amenities = (pg.amenities || [])
        .map((a: any) => (typeof a === 'string' ? a : a?.name))
        .filter(Boolean)
        .slice(0, 4)
        .join(', ') || 'Wi-Fi, Security';

      const rating = pg.averageRating ? `${pg.averageRating}/5 ⭐` : 'Verified';
      const college = pg.collegeName ? ` (Near ${pg.collegeName})` : '';
      const rooms = pg.availableRooms !== undefined ? `${pg.availableRooms} rooms available` : 'Available';

      return `${idx + 1}. **${pg.name}** — ₹${pg.pricePerMonth}/month\n   📍 ${pg.address || ''}, ${pg.city || ''}${college}\n   🏷️ Preference: ${pg.genderPreference || 'unisex'} | ⭐ ${rating} | 🛌 ${rooms}\n   ✨ Amenities: ${amenities}`;
    })
    .join('\n\n');

  return `Here are top PG accommodations from GeoNest matching your query:\n\n${items}\n\n*(Note: Direct database grounding returned due to AI service timeout)*`;
};

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

  // Check cache for short repeat queries
  if (messages.length <= 2 && cacheKey) {
    const cached = chatCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[AI Cache Hit] Serving cached answer for query: "${lastUserMessage}"`);
      return cached.reply;
    }
  }

  // Intelligent DB query grounding based on user message
  let pgResults: any[] = [];
  try {
    if (mongoose.connection.readyState === 1) {
      const dbFilter: any = { status: { $ne: 'deleted' } };

    // Extract price constraint (e.g. 10k, 10 k, 10000, 10,000, under 12k)
    let parsedPrice: number | null = null;
    const kMatch = lastUserMessage.match(/(?:under|below|less than|within|\bmax\b|budget of)?\s*₹?\s*(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch) {
      parsedPrice = Math.round(parseFloat(kMatch[1]) * 1000);
    } else {
      const standardMatch =
        lastUserMessage.match(/(?:under|below|less than|within|\bmax\b|budget of)\s*₹?\s*(\d{4,6}|\d{1,2},\d{3})/i) ||
        lastUserMessage.match(/₹?\s*(\d{4,6})/);
      if (standardMatch) {
        parsedPrice = parseInt(standardMatch[1].replace(/,/g, ''), 10);
      }
    }

    if (parsedPrice && parsedPrice >= 500) {
      dbFilter.pricePerMonth = { $lte: parsedPrice };
    }

    // Extract gender preference constraint
    if (/\b(?:girls?|female|women)\b/i.test(lastUserMessage)) {
      dbFilter.genderPreference = { $in: ['female', 'unisex'] };
    } else if (/\b(?:boys?|male|men)\b/i.test(lastUserMessage)) {
      dbFilter.genderPreference = { $in: ['male', 'unisex'] };
    }

    // Extract search keywords filtering out stop words
    const stopWords = new Set([
      'under', 'below', 'less', 'than', 'pgs', 'pg', 'hostels', 'hostel', 'show', 'me',
      'which', 'find', 'best', 'top', 'with', 'in', 'for', 'rs', 'inr', 'k', 'near',
      'compare', 'options', 'available', 'room', 'rooms', 'rent', 'and', 'the', 'a', 'an'
    ]);
    const keywords = lastUserMessage
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w) && isNaN(Number(w)));

    if (keywords.length > 0) {
      const searchRegex = new RegExp(keywords.join('|'), 'i');
      dbFilter.$or = [
        { city: searchRegex },
        { collegeName: searchRegex },
        { address: searchRegex },
        { name: searchRegex },
      ];
    }

    pgResults = await PGListing.find(dbFilter)
      .select('name city address collegeName pricePerMonth securityDeposit genderPreference averageRating availableRooms totalRooms isVerified amenities')
      .populate({ path: 'amenities', select: 'name' })
      .limit(5)
      .lean();

    // Fallback search if strict filter returned 0 items
    if (pgResults.length === 0) {
      const relaxedFilter: any = { status: { $ne: 'deleted' } };
      if (keywords.length > 0) {
        const searchRegex = new RegExp(keywords.join('|'), 'i');
        relaxedFilter.$or = [
          { city: searchRegex },
          { collegeName: searchRegex },
          { address: searchRegex },
          { name: searchRegex },
        ];
      }
      pgResults = await PGListing.find(relaxedFilter)
        .select('name city address collegeName pricePerMonth securityDeposit genderPreference averageRating availableRooms totalRooms isVerified amenities')
        .populate({ path: 'amenities', select: 'name' })
        .limit(5)
        .lean();
    }

    if (pgResults.length === 0) {
      pgResults = await PGListing.find({ status: { $ne: 'deleted' } })
        .select('name city address collegeName pricePerMonth securityDeposit genderPreference averageRating availableRooms totalRooms isVerified amenities')
        .populate({ path: 'amenities', select: 'name' })
        .limit(5)
        .lean();
      }
    }
  } catch (dbErr) {
    console.warn('[AI Service] Non-critical DB context fetch warning:', dbErr);
  }

  const contextData = pgResults.map((pg) => {
    const cleanAmenities = (pg.amenities || [])
      .map((a: any) => (typeof a === 'string' ? a : a?.name))
      .filter(Boolean);

    return {
      id: pg._id,
      name: pg.name,
      city: pg.city,
      address: pg.address,
      college: pg.collegeName || 'N/A',
      rentPerMonth: `₹${pg.pricePerMonth}`,
      securityDeposit: `₹${pg.securityDeposit || 0}`,
      genderPreference: pg.genderPreference,
      availableRooms: pg.availableRooms,
      totalRooms: pg.totalRooms,
      isVerified: Boolean(pg.isVerified),
      rating: pg.averageRating ? `${pg.averageRating}/5` : 'No ratings yet',
      amenities: cleanAmenities.join(', ') || 'Standard PG facilities',
    };
  });

  const systemInstruction = `You are "GeoNest Assistant", an intelligent, concise, and helpful AI assistant for GeoNest — an accommodation and PG (paying guest) listing platform in India.

YOUR CORE RESPONSIBILITIES & RULES:
1. Help users search, compare, and find PG accommodations, understand listing details (rent, security deposit, amenities, location, rooms available), and guide them on how to use GeoNest features (such as adding a PG as an owner, booking a stay, scheduling visits, or using search filters).
2. Answer ONLY topics related to GeoNest, accommodation, student living, and site navigation.
3. If asked off-topic questions (e.g. weather, sports, general math, external news), politely stay on topic: "I am GeoNest Assistant! I focus on accommodation and PG listings in GeoNest. I can help you find PGs, compare options, or guide you on listing your property, but I don't have weather or external real-time data."
4. Ground ALL your accommodation answers strictly in the real database listings provided below. Never invent fake PG names, prices, or locations. If no PGs match the requested budget or filters, clearly state that no exact matches were found in the database and present the available options from the database.
5. Be concise, friendly, and structured. Use Markdown formatting (bolding, bullet points) when listing PGs. Reply in the same language the user writes in.

REAL GEONEST DATABASE LISTINGS AVAILABLE FOR GROUNDING:
${JSON.stringify(contextData, null, 2)}

${appContext ? `CURRENT USER SESSION CONTEXT:\n${JSON.stringify(appContext, null, 2)}` : ''}`;

  const formattedContents = messages.slice(-10).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  // Candidate models fallback chain
  const candidateModels = Array.from(
    new Set([
      config.geminiModel || 'gemini-3.5-flash-lite',
      ...(config.geminiFallbackModels || []),
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ])
  ).filter(Boolean);

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  let lastError: any = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];
    const maxRetries = 1; // 1 attempt per model for max speed

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const replyText = await generateWithTimeout(
          ai,
          currentModel,
          formattedContents,
          systemInstruction,
          7500
        );

        console.log(
          `[AI Service Success] Answer generated by model "${currentModel}" on attempt ${attempt}.`
        );

        if (messages.length <= 2 && cacheKey) {
          chatCache.set(cacheKey, {
            reply: replyText,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
        }

        return replyText;
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[AI Service Warning] Model "${currentModel}" failed attempt ${attempt} (${err?.message || err}).`
        );
      }
    }
  }

  console.warn('[AI Chat Service Notice] All Gemini models failed or timed out. Triggering DB direct grounding fallback.');
  const fallbackReply = formatDbFallbackResponse(pgResults, lastUserMessage);

  if (messages.length <= 2 && cacheKey) {
    chatCache.set(cacheKey, {
      reply: fallbackReply,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  return fallbackReply;
};

