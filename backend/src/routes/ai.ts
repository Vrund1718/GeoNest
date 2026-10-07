import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { parseVoiceSearch, handleAiChat, isAiAvailable } from '../services/aiService';

const router = Router();

// Express rate limiter for AI endpoints (30 requests per minute per IP)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit',
    message: 'Too many AI requests. Please wait a minute before trying again.',
  },
});

const ParseSearchInputSchema = z.object({
  text: z.string().min(1).max(300),
});

const ChatInputSchema = z
  .object({
    message: z.string().min(1).max(2000).optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(2000),
        })
      )
      .min(1)
      .max(20)
      .optional(),
    context: z.record(z.any()).optional(),
  })
  .refine((data) => Boolean(data.message || (data.messages && data.messages.length > 0)), {
    message: 'Either message or messages array must be provided.',
  });

router.post('/parse-search', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = ParseSearchInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'bad_request', message: 'Invalid input text (max 300 characters).' });
    }

    const filters = await parseVoiceSearch(parseResult.data.text);
    return res.json({ ok: true, filters, aiAvailable: isAiAvailable() });
  } catch (err: any) {
    console.error('[AI Parse Search Router Error]', err?.message || err);
    return res.status(500).json({ error: 'server_error', message: 'Failed to process voice search text.' });
  }
});

const handleChatHandler = async (req: Request, res: Response) => {
  try {
    const parseResult = ChatInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Invalid conversation format or message too long (max 2000 characters).',
      });
    }

    if (!isAiAvailable()) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'AI Assistant is currently offline. GEMINI_API_KEY is not configured on the server.',
      });
    }

    const { message, messages, context } = parseResult.data;

    let history: { role: 'user' | 'assistant'; content: string }[] = [];
    if (messages && messages.length > 0) {
      history = messages.slice(-10);
    } else if (message) {
      history = [{ role: 'user', content: message.trim() }];
    }

    const reply = await handleAiChat(history, context);
    return res.json({ ok: true, reply, aiAvailable: true });
  } catch (err: any) {
    const errMessage = (err?.message || err?.toString() || '').toLowerCase();
    const status = err?.status || err?.statusCode || err?.response?.status;

    console.error('[AI Chat Router Error]', err?.message || err);

    if (errMessage.includes('gemini_api_key') || status === 401 || errMessage.includes('unauthenticated')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Gemini API key is invalid or not configured on the server.',
      });
    }

    if (
      status === 503 ||
      status === 404 ||
      errMessage.includes('503') ||
      errMessage.includes('404') ||
      errMessage.includes('unavailable') ||
      errMessage.includes('high demand') ||
      errMessage.includes('no longer available') ||
      errMessage.includes('spikes in demand')
    ) {
      return res.status(503).json({
        error: 'overloaded',
        message: 'The AI assistant is experiencing high demand right now. Please try again in a moment.',
      });
    }

    if (status === 429 || errMessage.includes('429') || errMessage.includes('quota') || errMessage.includes('rate limit')) {
      return res.status(429).json({
        error: 'rate_limit',
        message: 'Too many requests. Please wait a minute and try again.',
      });
    }

    return res.status(500).json({
      error: 'server_error',
      message: err?.message || 'Failed to process chat message. Please try again.',
    });
  }
};

router.post('/chat', aiRateLimiter, handleChatHandler);
router.post('/assistant', aiRateLimiter, handleChatHandler);

export default router;
