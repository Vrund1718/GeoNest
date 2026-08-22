import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (data: { name: string; email: string; phone: string; password: string; role: string; phoneVerificationToken: string }) => Promise<{ ok: boolean; error?: string; errors?: any[] }>;
  sendOtp: (phone: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<{ ok: boolean; verified: boolean; phoneVerificationToken?: string; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractApiError(err: any, fallback: string) {
  const data = err.response?.data;
  console.error('[Auth API error]', {
    status: err.response?.status,
    body: data,
    message: err.message,
  });
  if (data?.error) return data.error as string;
  if (Array.isArray(data?.errors)) {
    return data.errors.map((e: { message?: string }) => e.message).filter(Boolean).join(', ') || fallback;
  }
  if (!err.response) return 'Cannot reach server — is the backend running on port 5000?';
  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.user);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.response?.data?.error || 'Login failed' };
    }
  }, []);

  const signup = useCallback(async (data: { name: string; email: string; phone: string; password: string; role: string; phoneVerificationToken: string }) => {
    try {
      const { data: res } = await api.post('/auth/signup', data);
      setUser(res.user);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.response?.data?.error || 'Signup failed', errors: err.response?.data?.errors };
    }
  }, []);


  const sendOtp = useCallback(async (phone: string) => {
    try {
      console.log('[sendOtp] POST /auth/send-otp', { phone });
      await api.post('/auth/send-otp', { phone });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: extractApiError(err, 'Failed to send OTP') };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    try {
      console.log('[verifyOtp] POST /auth/verify-otp', { phone, codeLength: code.length });
      const { data: res } = await api.post('/auth/verify-otp', { phone, code });
      return { ok: true, verified: res.verified, phoneVerificationToken: res.phoneVerificationToken };
    } catch (err: any) {
      return { ok: false, verified: false, error: extractApiError(err, 'Verification failed') };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, signup, sendOtp, verifyOtp, logout, refresh }), [user, loading, login, signup, sendOtp, verifyOtp, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
