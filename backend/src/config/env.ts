import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string(),
  CLIENT_URL: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1, 'TWILIO_VERIFY_SERVICE_SID is required'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
});

const rawEnv = envSchema.parse(process.env);

const clientOrigins = rawEnv.CLIENT_URL
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const env = {
  ...rawEnv,
  CLIENT_ORIGINS: clientOrigins,
};

export default env;
