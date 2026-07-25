import twilio from 'twilio';
import env from '../config/env';

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export type OtpChannel = 'sms' | 'call';

export interface SendOtpResult {
  status: string;
  sid: string;
  to: string;
  channel: string;
}

export interface VerifyOtpResult {
  status: 'approved' | 'denied' | 'pending' | 'expired' | string;
  valid: boolean;
  to?: string;
  amount?: string;
  payee?: string;
  sid?: string;
}

export const sendVerificationOtp = async (
  to: string,
  channel: OtpChannel = 'sms'
): Promise<SendOtpResult> => {
  const verification = await client.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to, channel });

  return {
    status: verification.status,
    sid: verification.sid,
    to: verification.to,
    channel: verification.channel,
  };
};

export const checkVerificationOtp = async (
  to: string,
  code: string
): Promise<VerifyOtpResult> => {
  const check = await client.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to, code });

  return {
    status: check.status,
    valid: check.status === 'approved',
    to: check.to,
    sid: check.sid,
  };
};

export const TWILIO_ERROR_MAP: Record<string, { status: number; message: string; code: string }> = {
  '60200': { status: 400, message: 'Invalid phone number format', code: 'INVALID_PHONE' },
  '60203': { status: 429, message: 'Too many attempts, please try again later', code: 'RATE_LIMITED' },
  '60204': { status: 408, message: 'OTP has expired, please request a new one', code: 'OTP_EXPIRED' },
  '60205': { status: 429, message: 'Max verification attempts reached, please try again later', code: 'MAX_ATTEMPTS' },
  '60206': { status: 400, message: 'That number is not allowed. Please contact support.', code: 'BLOCKED_NUMBER' },
  '60207': { status: 429, message: 'Too many requests sent to this number, please try again later', code: 'RATE_LIMITED' },
  '60208': { status: 429, message: 'Too many verification requests for this number', code: 'RATE_LIMITED' },
  '60209': { status: 429, message: 'Too many verification attempts, please try again later', code: 'MAX_ATTEMPTS' },
  '60210': { status: 429, message: 'Too many phone checks for this number, try again later', code: 'RATE_LIMITED' },
  '60211': { status: 429, message: 'Cooldown active. Please wait before requesting another OTP', code: 'COOLDOWN_ACTIVE' },
  '60212': { status: 429, message: 'Too many recent check attempts. Try again later', code: 'MAX_ATTEMPTS' },
  '60033': { status: 400, message: 'Invalid phone number', code: 'INVALID_PHONE' },
  '20003': { status: 500, message: 'Verification service unavailable, please try again later', code: 'TWILIO_DOWN' },
  '20404': { status: 500, message: 'Verification service unavailable, please try again later', code: 'TWILIO_DOWN' },
  '21608': { status: 400, message: 'Invalid phone number format', code: 'INVALID_PHONE' },
  '21610': { status: 400, message: 'Invalid phone number format', code: 'INVALID_PHONE' },
  '21614': { status: 400, message: 'Invalid phone number', code: 'INVALID_PHONE' },
};

export const mapTwilioError = (err: any): { status: number; message: string; code: string } => {
  const twilioCode = String(err?.code ?? '');
  const mapped = TWILIO_ERROR_MAP[twilioCode];
  if (mapped) return mapped;

  if (err?.status === 429) {
    return { status: 429, message: 'Too many requests — please wait before retrying', code: 'RATE_LIMITED' };
  }

  return {
    status: 500,
    message: 'Could not verify code right now, please try again later',
    code: 'TWILIO_ERROR',
  };
};
