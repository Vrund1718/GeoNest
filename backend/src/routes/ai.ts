import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { parseVoiceSearch, handleAiChat, isAiAvailable } from '../services/aiService';

const router = Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a minute before trying again.' },
});

const ParseSearchInputSchema = z.object({
  text: z.string().min(1).max(300),
});

const ChatInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(1000),
    })
  ).min(1).max(20),
});

router.post('/parse-search', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = ParseSearchInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid input text (max 300 characters).' });
    }

    const filters = await parseVoiceSearch(parseResult.data.text);
    return res.json({ ok: true, filters, aiAvailable: isAiAvailable() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process voice search text.' });
  }
});

router.post('/chat', aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = ChatInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid conversation format.' });
    }

    const reply = await handleAiChat(parseResult.data.messages);
    return res.json({ ok: true, reply, aiAvailable: isAiAvailable() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process chat message.' });
  }
});

export default router;
