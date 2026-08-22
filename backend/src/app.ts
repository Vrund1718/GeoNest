import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/auth';
import ownerRoutes from './routes/owner';
import adminRoutes from './routes/admin';
import geoRoutes from './routes/geo';
import pgRoutes from './routes/pg';
import userRoutes from './routes/user';
import recRoutes from './routes/recommendations';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://images.unsplash.com', 'https://res.cloudinary.com'],
        'connect-src': ["'self'", 'https://raw.githubusercontent.com'],
      },
    },
  })
);

app.use(
  cors({
    origin: [config.frontendOrigin].filter(Boolean),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many search requests, try again later.' },
});

const recLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many recommendation requests, try again later.' },
});

const authCredentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const email =
      (req.body?.email as string | undefined)?.trim().toLowerCase() ||
      (req.body?.phone as string | undefined)?.trim() ||
      '';
    return email ? `${ip}:${email}` : ip;
  },
  handler: (req, res, _next, options) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const email =
      (req.body?.email as string | undefined)?.trim().toLowerCase() ||
      (req.body?.phone as string | undefined)?.trim() ||
      '(no-email)';
    console.warn(
      `[RATE-LIMIT] auth block on ${req.method} ${req.originalUrl || (req.baseUrl + req.path)} — key=${ip}:${email} limit=${options.max} windowMs=${options.windowMs} userAgent=${req.headers['user-agent']?.slice(0, 80) ?? ''}`
    );
    res.status(options.statusCode).json({
      error: {
        code: 'AUTH_RATE_LIMITED',
        message: 'Too many auth attempts, try again later.',
      },
    });
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const phone = (req.body?.phone as string | undefined)?.trim() || '';
    return phone ? `${ip}:${phone}` : ip;
  },
  message: { error: 'Too many OTP requests, try again later.' },
});

app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/auth/signup', authCredentialLimiter);
app.use('/auth/login', authCredentialLimiter);
app.use('/auth/send-otp', otpRateLimiter);
app.use('/auth', authRoutes);
app.use('/owners', ownerRoutes);
app.use('/admin', adminRoutes);
app.use('/geo', geoRoutes);
app.use('/pg', searchLimiter, pgRoutes);
app.use('/recommendations', recLimiter, recRoutes);

app.use('/api/auth/signup', authCredentialLimiter);
app.use('/api/auth/login', authCredentialLimiter);
app.use('/api/auth/send-otp', otpRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/pg', searchLimiter, pgRoutes);
app.use('/api/recommendations', recLimiter, recRoutes);

app.use('/api', userRoutes);
app.use('/', userRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled]', err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large' });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Max 5MB.' });
  }
  if (err?.message?.includes('Only JPG')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
