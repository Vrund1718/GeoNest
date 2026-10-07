import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-pg-db',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  accessTokenTtlMin: parseInt(process.env.ACCESS_TOKEN_TTL_MIN || '15', 10),
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
  },
  otpTokenSecret: process.env.OTP_TOKEN_SECRET || 'dev-otp-secret',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  geminiFallbackModels: (process.env.GEMINI_FALLBACK_MODELS || 'gemini-flash-lite-latest,gemini-3.5-flash,gemini-flash-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  aiApiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
  orsApiKey: process.env.ORS_API_KEY || '',
};

export const isCloudinaryEnabled = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
);

if (config.nodeEnv === 'production') {
  const insecureSecrets = [
    { name: 'JWT_ACCESS_SECRET', val: config.jwtAccessSecret, defaultVal: 'dev-access-secret' },
    { name: 'JWT_REFRESH_SECRET', val: config.jwtRefreshSecret, defaultVal: 'dev-refresh-secret' },
    { name: 'OTP_TOKEN_SECRET', val: config.otpTokenSecret, defaultVal: 'dev-otp-secret' },
  ];
  for (const s of insecureSecrets) {
    if (!s.val || s.val === s.defaultVal) {
      throw new Error(`[SECURITY FATAL] ${s.name} must be set to a secure random string in production!`);
    }
  }
}
