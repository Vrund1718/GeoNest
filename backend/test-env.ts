import dotenv from 'dotenv';
import path from 'path';

console.log('🔍 Loading .env file...');
console.log('Current directory:', process.cwd());
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  console.log('✅ Loaded .env file successfully!');
  console.log('📝 Environment variables:');
  console.log('  PORT:', process.env.PORT);
  console.log('  MONGODB_URI:', process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:.*@/, ':****@') : 'NOT FOUND!');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT FOUND!');
  console.log('  CLIENT_URL:', process.env.CLIENT_URL);
}
