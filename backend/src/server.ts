import app from './app';
import { connectDB } from './config/db';
import env from './config/env';

const startServer = async () => {
  // Try to connect to MongoDB, but don't exit if it fails (for testing)
  try {
    await connectDB();
  } catch (error) {
    console.error('⚠️ MongoDB connection failed (continuing with server start anyway)', error);
  }
  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT}`);
    console.log(`📡 API available at http://localhost:${env.PORT}/api`);
  });
};

startServer();
