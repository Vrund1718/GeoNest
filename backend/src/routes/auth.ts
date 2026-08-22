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

    // Verify phone verification token
    try {
      const decoded = jwt.verify(phoneVerificationToken, config.otpTokenSecret) as any;
      if (!decoded.verified || decoded.phone !== phone) {
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

router.post('/send-otp', validate(sendOtpSchema), async (req, res) => {
  if (!isTwilioConfigured()) {
    console.error('[Twilio] Missing env vars:', {
      accountSid: Boolean(config.twilio.accountSid),
      authToken: Boolean(config.twilio.authToken),
      verifyServiceSid: Boolean(config.twilio.verifyServiceSid),
    });
    return res.status(503).json({
      error: 'SMS service is not configured on the server',
      code: 'TWILIO_NOT_CONFIGURED',
    });
  }

  const phone = normalizeIndianPhone(req.body.phone);
  if (!phone) {
    return res.status(400).json({
      error: 'Phone must be +91 followed by a 10-digit Indian mobile number',
      code: 'INVALID_PHONE',
    });
  }

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
      moreInfo: err.moreInfo,
    });

    const payload = twilioApiError(err, 'Failed to send OTP');
    return res.status(err.status || 500).json(payload);
  }
});

router.post('/verify-otp', validate(verifyOtpSchema), async (req, res) => {
  if (!isTwilioConfigured()) {
    return res.status(503).json({
      error: 'SMS service is not configured on the server',
      code: 'TWILIO_NOT_CONFIGURED',
    });
  }

  const phone = normalizeIndianPhone(req.body.phone);
  const { code } = req.body;
  if (!phone) {
    return res.status(400).json({
      error: 'Phone must be +91 followed by a 10-digit Indian mobile number',
      code: 'INVALID_PHONE',
    });
  }

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
        { expiresIn: '10m' }
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
});

export default router;
