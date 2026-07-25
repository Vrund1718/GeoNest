import dns from 'dns';
import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import env from './env';

dns.setServers(['8.8.8.8', '8.8.4.4']);

mongoose.set('debug', true);

mongoose.set('bufferTimeoutMS', 3000);

export const connectDB = async () => {
  try {
    console.log('🔍 Connecting to MongoDB with URI:', env.MONGODB_URI.replace(/:.*@/, ':****@'));
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
      heartbeatFrequencyMS: 5000,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
};

export const requireDBConnection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return res.status(503).json({
      error: {
        message: `Database ${states[state] || 'unavailable'} — please try again in a moment`,
        code: 'DATABASE_UNAVAILABLE',
      },
    });
  }
  next();
};
