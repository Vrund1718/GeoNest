import React, { useState } from 'react';
import { PageHeader } from '../../components/shared';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

export const ProfilePage: React.FC = () => {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile', form);
      await refresh();
      setToast('Profile updated');
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      setToast(e.response?.data?.error || 'Update failed');
      setTimeout(() => setToast(null), 2500);
    }
    setSaving(false);
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" subtitle="Manage your personal details and account." />

      <div className="card p-6 mb-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-brand-600 text-white font-bold text-2xl flex items-center justify-center shadow-pop">{initials}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold">{user.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="badge bg-brand-50 text-brand-700 capitalize">{user.role}</span>
            <span className="text-xs text-slate-400">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="card p-6 space-y-4">
        <h3 className="font-semibold mb-2">Personal details</h3>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input bg-surface-50" value={user.email} disabled />
          <p className="text-[11px] text-slate-400 mt-1">Contact support to change email.</p>
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] card shadow-pop px-5 py-3 bg-slate-900 text-white text-sm border-slate-800">{toast}</div>
      )}
    </div>
  );
};
