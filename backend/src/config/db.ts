import dns from 'dns';
import mongoose from 'mongoose';
import env from './env';

// Use Google's public DNS servers instead of system DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Enable Mongoose debug mode for verbose logging
mongoose.set('debug', true);

export const connectDB = async () => {
  try {
    console.log('🔍 Connecting to MongoDB with URI:', env.MONGODB_URI.replace(/:.*@/, ':****@'));
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Wait 10s instead of default 30s
      family: 4, // Force IPv4
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Don't exit process anymore—let server start anyway for testing
  }
};
