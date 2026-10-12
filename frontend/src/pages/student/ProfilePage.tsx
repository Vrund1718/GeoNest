import React, { useState } from 'react';
import { PageHeader } from '../../components/shared';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

export const ProfilePage: React.FC = () => {
  const { user, refresh, sendOtp, verifyOtp } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Phone OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  if (!user) return null;

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  const isPhoneChanged = form.phone.trim() !== user.phone.trim();

  const handleStartPhoneVerify = async () => {
    const rawDigits = form.phone.replace(/\D/g, '');
    const cleanDigits = rawDigits.startsWith('91') && rawDigits.length === 12 ? rawDigits.slice(2) : rawDigits;
    if (!cleanDigits.match(/^[6-9]\d{9}$/)) {
      showToast('Enter a valid 10-digit Indian mobile number');
      return;
    }
    const fullPhone = `+91${cleanDigits}`;
    setSendingOtp(true);
    const res = await sendOtp(fullPhone);
    setSendingOtp(false);
    if (res.ok) {
      setOtpSent(true);
      if (res.devOtp) setDevOtpHint(res.devOtp);
      setShowOtpModal(true);
      setResendTimer(30);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      showToast(res.error || 'Failed to send OTP');
    }
  };

  const handleConfirmOtpAndUpdate = async () => {
    if (otpCode.length !== 6) {
      showToast('Please enter a 6-digit OTP');
      return;
    }
    const rawDigits = form.phone.replace(/\D/g, '');
    const cleanDigits = rawDigits.startsWith('91') && rawDigits.length === 12 ? rawDigits.slice(2) : rawDigits;
    const fullPhone = `+91${cleanDigits}`;

    setVerifyingOtp(true);
    const res = await verifyOtp(fullPhone, otpCode);
    setVerifyingOtp(false);

    if (res.ok && res.verified && res.phoneVerificationToken) {
      // Save profile with verification token
      setSaving(true);
      try {
        await api.put('/profile', {
          name: form.name,
          phone: fullPhone,
          phoneVerificationToken: res.phoneVerificationToken,
        });
        await refresh();
        setShowOtpModal(false);
        showToast('Profile & phone number updated successfully!');
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Update failed');
      }
      setSaving(false);
    } else {
      showToast(res.error || 'Invalid OTP code');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPhoneChanged) {
      handleStartPhoneVerify();
      return;
    }

    setSaving(true);
    try {
      await api.put('/profile', { name: form.name });
      await refresh();
      showToast('Profile updated');
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Update failed');
    }
    setSaving(false);
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" subtitle="Manage your personal details and account." />

      <div className="card p-6 mb-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-2xl flex items-center justify-center shadow-pop">{initials}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-ink-700 dark:text-slate-100">{user.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="badge bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 capitalize">{user.role}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="card p-6 space-y-4">
        <h3 className="font-semibold text-ink-700 dark:text-slate-100 mb-2">Personal details</h3>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input bg-sand-50 dark:bg-slate-900/60 text-ink/50 dark:text-slate-400 border-ink/10 dark:border-slate-700" value={user.email} disabled />
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Contact support to change email.</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Phone</label>
            {isPhoneChanged && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">OTP verification required on save</span>
            )}
          </div>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setForm({ name: user.name, phone: user.phone })} className="btn-secondary">Reset</button>
          <button type="submit" disabled={saving || sendingOtp} className="btn-primary">
            {sendingOtp ? 'Sending OTP…' : saving ? 'Saving…' : isPhoneChanged ? 'Verify & Save' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-sand-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Verify New Phone Number</h3>
              <button onClick={() => setShowOtpModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-lg">✕</button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We sent a 6-digit verification code to <strong>{form.phone}</strong>.
            </p>

            {devOtpHint && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <span>💡 Trial/Dev code: <strong>{devOtpHint}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtpHint)}
                  className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline uppercase tracking-wider"
                >
                  Auto-fill
                </button>
              </div>
            )}

            <div>
              <label className="label text-xs">Enter 6-digit OTP</label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                className="input text-center tracking-[0.5em] font-mono font-bold text-lg"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              {resendTimer > 0 ? (
                <span>Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleStartPhoneVerify}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold uppercase tracking-wider text-[11px]"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOtpAndUpdate}
                disabled={verifyingOtp || otpCode.length !== 6 || saving}
                className="btn-primary flex-1"
              >
                {verifyingOtp || saving ? 'Verifying…' : 'Confirm & Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] card shadow-pop px-5 py-3 bg-slate-900 dark:bg-slate-800 text-white text-sm border-slate-800 dark:border-slate-700">{toast}</div>
      )}
    </div>
  );
};
