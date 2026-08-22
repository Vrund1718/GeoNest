import twilio from 'twilio';
import { config } from '../config';

let client: ReturnType<typeof twilio> | null = null;

export function isTwilioConfigured(): boolean {
  return Boolean(
    config.twilio.accountSid &&
      config.twilio.authToken &&
      config.twilio.verifyServiceSid
  );
}

export function getTwilioClient() {
  if (!isTwilioConfigured()) {
    throw new Error('Twilio credentials are not configured');
  }
  if (!client) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
}

export function twilioApiError(err: any, fallback: string) {
  const code = err?.code;
  let message = err?.message || fallback;

  // Trial accounts cannot SMS unverified numbers (Verify uses the same restriction).
  if (code === 21608 || code === 60205) {
    message =
      'This phone number is not verified on your Twilio trial account. ' +
      'Add it under Phone Numbers → Verified Caller IDs in the Twilio console, or upgrade the account.';
  } else if (code === 20404) {
    message =
      'Twilio Verify service not found. Check TWILIO_VERIFY_SERVICE_SID matches an active Verify service in your Twilio console.';
  } else if (code === 20003 || code === 401) {
    message = 'Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.';
  }

  return {
    error: message,
    code: code || 'TWILIO_ERROR',
    twilioStatus: err?.status,
  };
}
