import mongoose from 'mongoose';
import { config } from '../config';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err: any) {
    console.warn(`Primary MongoDB URI (${config.mongodbUri}) failed: ${err.message || err}`);
    const localUri = 'mongodb://127.0.0.1:27017/smart-pg-db';
    if (config.mongodbUri !== localUri) {
      console.log(`Attempting fallback connection to local MongoDB at ${localUri}...`);
      try {
        const localConn = await mongoose.connect(localUri);
        console.log(`Local MongoDB Connected: ${localConn.connection.host}`);
        return;
      } catch (localErr: any) {
        console.error('Failed to connect to local MongoDB:', localErr.message || localErr);
      }
    }
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};
