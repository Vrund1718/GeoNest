import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Owner from '../models/Owner';
import {
  AuthRequest,
  requireAuth,
  setAuthCookies,
  clearAuthCookies,
  extractTokens,
} from '../middleware/auth';
import { signUpSchema, logInSchema, validate, sendOtpSchema, verifyOtpSchema } from '../middleware/validate';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { normalizeIndianPhone } from '../utils/phone';
import { getTwilioClient, isTwilioConfigured, twilioApiError } from '../utils/twilioClient';

const router = Router();

router.post('/signup', validate(signUpSchema), async (req, res) => {
  try {
    const { name, email, phone, password, role, phoneVerificationToken } = req.body;
    const normPhone = normalizeIndianPhone(phone);
    if (!normPhone) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    // Verify phone verification token
    try {
      const decoded = jwt.verify(phoneVerificationToken, config.otpTokenSecret) as any;
      if (!decoded.verified || decoded.phone !== normPhone) {
        return res.status(400).json({ error: 'Phone number not verified or mismatch' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired phone verification token' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ errors: [{ field: 'email', message: 'Email already in use' }] });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      phoneVerified: true,
      hashedPassword,
      role,
    });

    if (role === 'owner') {
      await Owner.create({ userId: user._id, verificationStatus: 'unverified' });
    }

    const publicUser: any = user.toObject(); delete publicUser.hashedPassword;
    setAuthCookies(res, user);
    return res.status(201).json({ user: publicUser });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', validate(logInSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const publicUser: any = user.toObject(); delete publicUser.hashedPassword;
    setAuthCookies(res, user);
    return res.json({ user: publicUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  const u = req.user;
  const publicUser = (u as any).toObject
    ? (u as any).toObject({ transform: (_: any, ret: any) => { delete ret.hashedPassword; return ret; } })
    : { ...(u as any), hashedPassword: undefined };
  return res.json({ user: publicUser });
});

router.post('/refresh', async (req, res) => {
  const { refresh } = extractTokens(req);
  if (!refresh) return res.status(401).json({ error: 'No refresh token' });
  try {
    const decoded = jwt.verify(refresh, config.jwtRefreshSecret) as any;
    const user = await User.findById(decoded.sub).select('-hashedPassword');
    if (!user || user.tokenVersion !== decoded.v) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Token revoked' });
    }
    setAuthCookies(res, user);
    return res.json({ user });
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  }
  clearAuthCookies(res);
  return res.json({ message: 'Logged out' });
});

// In-memory fallback OTP store with TTL (10 minutes)
interface StoredOtp {
  code: string;
  expiresAt: number;
}
const fallbackOtpStore = new Map<string, StoredOtp>();

function cleanExpiredOtps() {
  const now = Date.now();
  for (const [phone, data] of fallbackOtpStore.entries()) {
    if (data.expiresAt < now) {
      fallbackOtpStore.delete(phone);
    }
  }
}

router.post('/send-otp', validate(sendOtpSchema), async (req, res) => {
  cleanExpiredOtps();
  const phone = normalizeIndianPhone(req.body.phone);
  if (!phone) {
    return res.status(400).json({
      error: 'Phone must be +91 followed by a 10-digit Indian mobile number',
      code: 'INVALID_PHONE',
    });
  }

  const isDevOrTest = config.nodeEnv !== 'production';
  const generatedCode = isDevOrTest ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

  // If Twilio is configured, attempt real Twilio dispatch
  if (isTwilioConfigured()) {
    try {
      console.log(`[Twilio] send OTP → verifications.create() to ${phone}`);
      const verification = await getTwilioClient().verify.v2
        .services(config.twilio.verifyServiceSid)
        .verifications.create({ to: phone, channel: 'sms' });

      console.log(`[Twilio] OTP sent. status=${verification.status} sid=${verification.sid}`);
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('[Twilio Error - Send OTP]', {
        message: err.message,
        code: err.code,
        status: err.status,
      });

      // If Twilio trial account restriction (21608: unverified number on trial account), or in non-production
      if (err.code === 21608 || isDevOrTest) {
        fallbackOtpStore.set(phone, {
          code: generatedCode,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });
        console.warn(`[OTP Fallback] Twilio trial restricted (code ${err.code}). Using fallback OTP for ${phone}: ${generatedCode}`);
        return res.status(200).json({
          success: true,
          devMode: true,
          devOtp: isDevOrTest ? generatedCode : undefined,
          message: 'OTP sent (Trial account fallback: use code logged to console)',
        });
      }

      const payload = twilioApiError(err, 'Failed to send OTP');
      return res.status(err.status || 500).json(payload);
    }
  }

  // If Twilio is not configured, but we are in dev/test environment
  if (isDevOrTest) {
    fallbackOtpStore.set(phone, {
      code: generatedCode,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    console.log(`[OTP Dev] Twilio unconfigured. Dev OTP for ${phone}: ${generatedCode}`);
    return res.status(200).json({
      success: true,
      devMode: true,
      devOtp: generatedCode,
      message: 'OTP sent (Dev mode)',
    });
  }

  return res.status(503).json({
    error: 'SMS service is not configured on the server',
    code: 'TWILIO_NOT_CONFIGURED',
  });
});

router.post('/verify-otp', validate(verifyOtpSchema), async (req, res) => {
  cleanExpiredOtps();
  const phone = normalizeIndianPhone(req.body.phone);
  const { code } = req.body;
  if (!phone) {
    return res.status(400).json({
      error: 'Phone must be +91 followed by a 10-digit Indian mobile number',
      code: 'INVALID_PHONE',
    });
  }

  // First check fallback/dev OTP store
  const stored = fallbackOtpStore.get(phone);
  const isDevOrTest = config.nodeEnv !== 'production';
  if ((stored && stored.code === code && stored.expiresAt > Date.now()) || (isDevOrTest && code === '123456')) {
    fallbackOtpStore.delete(phone);
    const phoneVerificationToken = jwt.sign(
      { phone, verified: true },
      config.otpTokenSecret,
      { expiresIn: '15m' }
    );
    return res.json({ verified: true, phoneVerificationToken });
  }

  // If Twilio is configured, verify with Twilio
  if (isTwilioConfigured()) {
    try {
      console.log(`[Twilio] verify OTP → verificationChecks.create() for ${phone}`);
      const verification = await getTwilioClient().verify.v2
        .services(config.twilio.verifyServiceSid)
        .verificationChecks.create({ to: phone, code });

      console.log(`[Twilio] check status=${verification.status}`);

      if (verification.status === 'approved') {
        const phoneVerificationToken = jwt.sign(
          { phone, verified: true },
          config.otpTokenSecret,
          { expiresIn: '15m' }
        );
        return res.json({ verified: true, phoneVerificationToken });
      }

      return res.status(400).json({
        verified: false,
        error: 'Invalid or expired code',
        code: 'INVALID_OTP',
      });
    } catch (err: any) {
      console.error('[Twilio Error - Verify OTP]', {
        message: err.message,
        code: err.code,
        status: err.status,
      });

      const payload = twilioApiError(err, 'Failed to verify OTP');
      return res.status(err.status || 500).json(payload);
    }
  }

  return res.status(400).json({
    verified: false,
    error: 'Invalid or expired code',
    code: 'INVALID_OTP',
  });
});

export default router;
