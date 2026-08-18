import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PasswordInput } from '../../components/PasswordInput';

type Role = 'student' | 'owner' | 'admin';

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'student' as Role });
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setF = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setFieldErrors({});
    setLoading(true);
    const res = await signup(form);
    setLoading(false);
    if (res.ok) {
      const target = form.role === 'admin' ? '/admin' : form.role === 'owner' ? '/owner' : '/student';
      nav(target, { replace: true });
    } else {
      setErr(res.error || 'Signup failed');
      if (res.errors) {
        const map: Record<string, string> = {};
        for (const e2 of res.errors) map[e2.field?.replace('body.', '') || 'form'] = e2.message;
        setFieldErrors(map);
      }
    }
  };

  const fe = (k: string) => fieldErrors[k];

  return (
    <div className="min-h-screen flex bg-sand-50">
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-800 via-indigo-700 to-indigo-900" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: '22px 22px',
          }}
        />
        <svg className="absolute -right-40 -bottom-40 w-[580px] h-[580px] opacity-35 animate-float-slow motion-reduce:animate-none" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <radialGradient id="sGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E8A33D" />
              <stop offset="100%" stopColor="#E8A33D" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="100" fill="url(#sGlow)" />
        </svg>
        <svg className="absolute left-[-80px] top-[-60px] w-[360px] h-[360px] opacity-30 animate-float-slow motion-reduce:animate-none" viewBox="0 0 200 200" aria-hidden="true" style={{ animationDelay: '-3s' }}>
          <defs>
            <radialGradient id="sGlow2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FBCF6A" />
              <stop offset="100%" stopColor="#FBCF6A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="100" fill="url(#sGlow2)" />
        </svg>

        <div className="relative z-10 p-10 md:p-14 flex flex-col justify-between h-full text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-marigold/95 text-indigo-800 grid place-items-center shadow-paper">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
                <path d="M10 21v-6h4v6" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="font-display text-xl tracking-tight">GeoNest</p>
              <p className="text-white/65 text-xs">Smart PG · India</p>
            </div>
          </div>

          <div className="max-w-md mt-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] tracking-wide uppercase text-white/80 backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-sage" />
              New in your city — 312 PGs listed this month
            </div>
            <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight mt-6">
              Join Smart PG today.
            </h1>
            <p className="mt-5 text-white/75 text-base leading-relaxed max-w-md">
              List your PG or find the perfect home for your college journey. It only takes a minute —
              no spam, ever.
            </p>
          </div>

          <div className="mt-10 space-y-4 max-w-md">
            {[
              { h: 'Students', t: 'Filter by college, gender, rent and meals — and move in with confidence.', i: '🎓' },
              { h: 'Owners', t: 'List once, manage bookings, amenities, and verification — all from one dashboard.', i: '🏡' },
              { h: 'Everyone', t: 'Verified listings, transparent pricing, support when you need it.', i: '🛡️' },
            ].map((b) => (
              <div key={b.h} className="flex gap-4 items-start rounded-2xl bg-white/8 border border-white/15 backdrop-blur px-4 py-3.5 shadow-insetSoft">
                <div className="w-9 h-9 rounded-xl bg-marigold/90 text-indigo-800 grid place-items-center shrink-0 text-lg" aria-hidden="true">{b.i}</div>
                <div>
                  <p className="font-display leading-none text-white">{b.h}</p>
                  <p className="mt-1 text-sm text-white/70 leading-snug">{b.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-3 mb-7">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-pop">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            </div>
            <p className="font-display text-ink-700 text-lg tracking-tight">GeoNest</p>
          </div>

          <div className="rounded-3xl bg-white shadow-paper ring-1 ring-ink/5 p-7 sm:p-9">
            <h2 className="font-display text-2xl tracking-tight text-ink-700">Create your account</h2>
            <p className="text-sm text-ink/60 mt-1.5">Start your accommodation journey.</p>

            {err && (
              <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-coral/25 bg-coral/[0.07] text-coral px-4 py-3 text-sm leading-relaxed">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <span>{err}</span>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label">I am a</label>
                <div role="radiogroup" aria-label="Account type" className="grid grid-cols-3 gap-2">
                  {(['student', 'owner'] as const).map((r) => {
                    const active = form.role === r;
                    return (
                      <button
                        type="button"
                        key={r}
                        role="radio"
                        aria-checked={active}
                        onClick={() => setF('role', r)}
                        className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition
                          ${active
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                            : 'border-ink/15 text-ink/70 hover:bg-sand-100 hover:border-ink/25'}`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="signup-name" className="label">
                  Full name {fe('name') && <span className="text-coral font-normal ml-2 text-xs">{fe('name')}</span>}
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  className={`input ${fe('name') ? 'border-coral/60 focus:ring-coral/30 focus:border-coral' : ''}`}
                  value={form.name}
                  onChange={(e) => setF('name', e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="signup-email" className="label">
                    Email {fe('email') && <span className="text-coral font-normal ml-2 text-xs">{fe('email')}</span>}
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    className={`input ${fe('email') ? 'border-coral/60 focus:ring-coral/30 focus:border-coral' : ''}`}
                    value={form.email}
                    onChange={(e) => setF('email', e.target.value.toLowerCase())}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="signup-phone" className="label">
                    Phone {fe('phone') && <span className="text-coral font-normal ml-2 text-xs">{fe('phone')}</span>}
                  </label>
                  <input
                    id="signup-phone"
                    type="tel"
                    required
                    className={`input ${fe('phone') ? 'border-coral/60 focus:ring-coral/30 focus:border-coral' : ''}`}
                    value={form.phone}
                    onChange={(e) => setF('phone', e.target.value)}
                    placeholder="+91…"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <PasswordInput
                id="signup-password"
                label="Password"
                error={fe('password')}
                value={form.password}
                onChange={(e) => setF('password', e.target.value)}
                placeholder="8+ chars, upper, lower, digit"
                required
                autoComplete="new-password"
                hint="Min 8 chars, at least one upper, lower, and digit."
              />

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-11 rounded-xl shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/60 focus-visible:ring-offset-2"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" aria-hidden="true" />
                    Creating your account…
                  </span>
                ) : (
                  'Sign up'
                )}
              </button>
            </form>

            <p className="text-sm text-ink/70 mt-6 text-center">
              Already have an account? <Link to="/login" className="link font-semibold">Login</Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-ink/40 mt-6">
            By signing up you agree to our terms & privacy. We never share your phone with landlords.
          </p>
        </div>
      </div>
    </div>
  );
};
