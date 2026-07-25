import { Request, Response, NextFunction } from 'express';
import z from 'zod';
import User, { IUser } from '../models/User';
import { generateToken } from '../utils/jwt';
import {
  sendVerificationOtp,
  checkVerificationOtp,
  mapTwilioError,
} from '../utils/twilio';
import { sendOtpLimiter, verifyOtpLimiter } from '../utils/rateLimiter';
import { hashPasswordPlaceholder } from '../utils/password';
import env from '../config/env';

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

const sendOtpSchema = z.object({
  phone: z.string().regex(E164_REGEX, 'Phone number must be in E.164 format (e.g. +91XXXXXXXXXX)'),
  channel: z.enum(['sms', 'call']).default('sms'),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(E164_REGEX, 'Phone number must be in E.164 format (e.g. +91XXXXXXXXXX)'),
  otp: z.string().regex(/^\d{4,8}$/, 'OTP must be a 4 to 8 digit numeric code'),
});

const COOKIE_NAME = 'geonest_token';
const COOKIE_TTL_MS = 24 * 60 * 60 * 1000;

const setAuthCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: COOKIE_TTL_MS,
    path: '/',
  });
};

const buildUserPayload = (user: IUser) => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, channel } = sendOtpSchema.parse(req.body);

    const limitResult = sendOtpLimiter.hit(`send:${phone}`);
    if (!limitResult.allowed) {
      const retrySeconds = Math.ceil(limitResult.retryAfterMs / 1000);
      return res.status(429).json({
        error: {
          message: `Too many OTP requests — please try again in ${retrySeconds}s`,
          code: 'RATE_LIMITED',
          retryAfterMs: limitResult.retryAfterMs,
        },
      });
    }

    try {
      const result = await sendVerificationOtp(phone, channel);
      return res.json({
        success: true,
        phone: result.to,
        channel: result.channel,
        cooldownMs: 30000,
      });
    } catch (twilioErr: any) {
      console.error('[Twilio/sendOtp] Error:', twilioErr);
      const mapped = mapTwilioError(twilioErr);
      return res.status(mapped.status).json({
        error: {
          message: mapped.message,
          code: mapped.code,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);

    const limitResult = verifyOtpLimiter.hit(`verify:${phone}`);
    if (!limitResult.allowed) {
      const retrySeconds = Math.ceil(limitResult.retryAfterMs / 1000);
      return res.status(429).json({
        error: {
          message: `Too many attempts — please try again in ${retrySeconds}s`,
          code: 'MAX_ATTEMPTS',
          retryAfterMs: limitResult.retryAfterMs,
        },
      });
    }

    let checkResult;
    try {
      checkResult = await checkVerificationOtp(phone, otp);
    } catch (twilioErr: any) {
      console.error('[Twilio/verifyOtp] Error:', twilioErr);
      const mapped = mapTwilioError(twilioErr);
      return res.status(mapped.status).json({
        error: {
          message: mapped.message,
          code: mapped.code,
        },
      });
    }

    if (!checkResult.valid || checkResult.status !== 'approved') {
      if (checkResult.status === 'expired') {
        return res.status(400).json({
          error: {
            message: 'OTP has expired, please request a new one',
            code: 'OTP_EXPIRED',
          },
        });
      }
      return res.status(401).json({
        error: {
          message: 'Invalid or incorrect OTP',
          code: 'INVALID_OTP',
          remainingAttempts: limitResult.remaining,
        },
      });
    }

    verifyOtpLimiter.reset(`verify:${phone}`);
    sendOtpLimiter.reset(`send:${phone}`);

    let user = await User.findOne({ phone });

    if (!user) {
      const maskedPhone = phone.replace(/\D/g, '');
      const placeholderEmail = `phone+${maskedPhone}@geonest.local`;
      const passwordHash = await hashPasswordPlaceholder();

      user = await User.create({
        name: `User ${maskedPhone.slice(-4)}`,
        email: placeholderEmail,
        phone,
        role: 'student',
        passwordHash,
      });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.json({
      token,
      user: buildUserPayload(user),
    });
  } catch (error) {
    next(error);
  }
};
