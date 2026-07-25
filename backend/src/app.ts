import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/error.middleware';
import { requireDBConnection } from './config/db';
import env from './config/env';

const app = express();

const allowedOrigins = new Set(env.CLIENT_ORIGINS);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (env.NODE_ENV === 'development') {
      try {
        const { hostname, protocol } = new URL(origin);
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'http:') {
          return callback(null, true);
        }
      } catch {
        // fall through to reject
      }
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', requireDBConnection, authRoutes);

app.use(errorHandler);

export default app;
