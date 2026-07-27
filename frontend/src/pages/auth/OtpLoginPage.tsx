import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { FormField } from '../../components/FormField';
import { z } from 'zod';
import { ApiError } from '../../services/api';

const phoneSchema = z.object({
  dialCode: z.string().min(1, 'Country code is required'),
  nationalNumber: z
    .string()
    .min(8, 'Phone number is too short')
    .max(15, 'Phone number is too long')
    .regex(/^\d+$/, 'Phone number must contain only digits'),
});

const otpSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/, 'OTP must be a 4 to 8 digit numeric code'),
});

const DEFAULT_COUNTRY_DIAL_CODE = '+91';

const formatE164 = (dialCode: string, nationalNumber: string): string => {
  const normalizedDial = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  const digitsOnly = nationalNumber.replace(/\D/g, '');
  return `${normalizedDial}${digitsOnly}`;
};

type OtpLoginStep = 'phone' | 'otp';

const OTP_DIGITS = 6;

export const OtpLoginPage = () => {
  const navigate = useNavigate();
  const { sendOtp, verifyOtpAndLogin, user } = useAuth();

  const [step, setStep] = useState<OtpLoginStep>('phone');
  const [dialCode, setDialCode] = useState<string>(DEFAULT_COUNTRY_DIAL_CODE);
  const [nationalNumber, setNationalNumber] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');

  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);

  const [cooldownMs, setCooldownMs] = useState<number>(0);
  const cooldownTimerRef = useRef<number | null>(null);

  const fullPhoneE164 = useMemo(
    () => formatE164(dialCode, nationalNumber),
    [dialCode, nationalNumber]
  );

  useEffect(() => {
    if (user) {
      navigate(`/dashboard/${user.role}`, { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current != null) {
        window.clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = (ms: number) => {
    setCooldownMs(ms);
    if (cooldownTimerRef.current != null) {
      window.clearInterval(cooldownTimerRef.current);
    }
    const startedAt = Date.now();
    const initialMs = ms;
    cooldownTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, initialMs - elapsed);
      setCooldownMs(remaining);
      if (remaining <= 0 && cooldownTimerRef.current != null) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }, 250);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    setGeneralError('');
    setInfoMessage('');

    let parsed;
    try {
      parsed = phoneSchema.parse({ dialCode, nationalNumber });
    } catch (err: any) {
      const fieldErrors: Record<string, string> = {};
      err.issues.forEach((issue: any) => {
        const key = issue.path[0];
        if (key === 'dialCode') fieldErrors.dialCode = issue.message;
        if (key === 'nationalNumber') fieldErrors.phone = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const phone = formatE164(parsed.dialCode, parsed.nationalNumber);
    setIsSendingOtp(true);
    try {
      await sendOtp(phone);
      setStep('otp');
      setOtpCode('');
      startCooldown(30000);
      setInfoMessage(`OTP sent to ${phone}. Please enter the code below.`);
    } catch (err: any) {
      console.error('[OTP Login] sendOtp error:', err);
      if (err instanceof ApiError) {
        if (err.code === 'RATE_LIMITED') {
          const retryAfterMs = err.message?.includes('s') ? undefined : undefined;
          setGeneralError(err.message);
          if (retryAfterMs) startCooldown(retryAfterMs);
        } else if (err.code === 'INVALID_PHONE') {
          setErrors({ phone: err.message });
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError('Could not send OTP. Please try again.');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    setGeneralError('');

    let parsed;
    try {
      parsed = phoneSchema.parse({ dialCode, nationalNumber });
      const parsedOtp = otpSchema.parse({ code: otpCode });
      parsed = { ...parsed, otp: parsedOtp.code };
    } catch (err: any) {
      const fieldErrors: Record<string, string> = {};
      err.issues.forEach((issue: any) => {
        const key = issue.path[0];
        if (key === 'dialCode') fieldErrors.dialCode = issue.message;
        if (key === 'nationalNumber') fieldErrors.phone = issue.message;
        if (key === 'code') fieldErrors.otp = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const phone = formatE164(parsed.dialCode, parsed.nationalNumber);
    setIsVerifyingOtp(true);
    try {
      await verifyOtpAndLogin(phone, otpCode);
    } catch (err: any) {
      console.error('[OTP Login] verifyOtp error:', err);
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_OTP':
            setErrors({ otp: err.message });
            break;
          case 'OTP_EXPIRED':
            setErrors({ otp: err.message });
            setInfoMessage('Please request a new OTP.');
            break;
          case 'MAX_ATTEMPTS':
          case 'RATE_LIMITED':
            setGeneralError(err.message);
            break;
          default:
            setGeneralError(err.message);
        }
      } else {
        setGeneralError('Verification failed. Please try again.');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const cooldownSeconds = Math.ceil(cooldownMs / 1000);
  const canResend = cooldownMs <= 0 && !isSendingOtp && !isVerifyingOtp;

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="h-2 bg-marigold" />
        <div className="p-8">
          <h1 className="font-display text-3xl font-bold text-ink mb-2 text-center">
            Login with OTP
          </h1>
          <p className="text-ink/60 text-center mb-8">
            {step === 'phone'
              ? 'Enter your phone number to receive an OTP'
              : 'Enter the verification code we sent'}
          </p>

          {infoMessage && !generalError && (
            <div className="bg-marigold/10 border border-marigold/30 text-ink px-4 py-3 rounded mb-4 text-sm">
              {infoMessage}
            </div>
          )}

          {generalError && (
            <div className="bg-coral/10 border border-coral/30 text-coral px-4 py-3 rounded mb-4 text-sm">
              {generalError}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp}>
              <div className="flex gap-3 items-end">
                <div className="w-24">
                  <FormField
                    label="Code"
                    type="text"
                    placeholder="+91"
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    error={errors.dialCode}
                    maxLength={5}
                  />
                </div>
                <div className="flex-1">
                  <FormField
                    label="Phone number"
                    type="tel"
                    value={nationalNumber}
                    onChange={(e) => setNationalNumber(e.target.value)}
                    error={errors.phone}
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={isSendingOtp}
              >
                {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-ink/70">
                    OTP sent to{' '}
                    <span className="font-medium text-ink">
                      {fullPhoneE164}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtpCode('');
                      setInfoMessage('');
                      setErrors({});
                    }}
                    className="text-sm text-indigo hover:underline"
                  >
                    Change number
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Verification code (6 digits)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_DIGITS}
                  value={otpCode}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, OTP_DIGITS);
                    setOtpCode(digitsOnly);
                  }}
                  className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent transition-all duration-150 ease-out hover:border-indigo hover:shadow-sm tracking-[0.5em] text-center text-xl font-semibold motion-reduce:transition-none ${
                    errors.otp ? 'border-coral' : 'border-ink/20'
                  }`}
                  placeholder="••••••"
                />
                {errors.otp && (
                  <p className="text-coral text-xs mt-1" role="alert">{errors.otp}</p>
                )}
              </div>

              <div className="mt-4">
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={isSendingOtp}
                    className="text-sm text-indigo hover:underline disabled:opacity-50"
                  >
                    {isSendingOtp ? 'Resending OTP...' : 'Resend OTP'}
                  </button>
                ) : (
                  <p className="text-sm text-ink/50">
                    Resend OTP in{' '}
                    <span className="font-medium text-ink">
                      {cooldownSeconds}s
                    </span>
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isVerifyingOtp || otpCode.length < OTP_DIGITS}
              >
                {isVerifyingOtp ? 'Verifying...' : 'Verify & Login'}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center space-y-2">
            <p className="text-ink/60">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-indigo font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
            <p className="text-ink/60">
              Prefer email?{' '}
              <Link
                to="/login"
                className="text-indigo font-medium hover:underline"
              >
                Login with password
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
