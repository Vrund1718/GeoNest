import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string(),
  CLIENT_URL: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
