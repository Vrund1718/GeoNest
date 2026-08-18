import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PasswordInput } from '../../components/PasswordInput';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as any)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.ok) {
      nav(from, { replace: true });
    } else {
      setErr(res.error || 'Login failed');
    }
  };

  const fillDemo = (role: string) => {
    if (role === 'admin') setEmail('admin@smartpg.local');
    else if (role === 'owner') setEmail('rajesh@smartpg.local');
    else setEmail('aarav@smartpg.local');
    setPassword('StrongPass1');
  };

  return (
    <div className="min-h-screen flex bg-sand-50">
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: '22px 22px',
          }}
        />
        <svg className="absolute -left-40 -top-40 w-[520px] h-[520px] opacity-30 animate-float-slow" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <radialGradient id="glowA" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FBCF6A" />
              <stop offset="100%" stopColor="#FBCF6A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="100" fill="url(#glowA)" />
        </svg>
        <svg className="absolute -right-32 bottom-[-140px] w-[460px] h-[460px] opacity-40 animate-float-slow motion-reduce:animate-none" viewBox="0 0 200 200" aria-hidden="true" style={{ animationDelay: '-4s' }}>
          <defs>
            <radialGradient id="glowB" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E8A33D" />
              <stop offset="100%" stopColor="#E8A33D" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="100" fill="url(#glowB)" />
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
              <span className="w-1.5 h-1.5 rounded-full bg-marigold-500" />
              9,400+ verified paying-guest homes
            </div>
            <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight mt-6">
              Find your <span className="text-marigold-500">perfect</span> paying-guest home near college.
            </h1>
            <p className="mt-5 text-white/75 text-base leading-relaxed max-w-md">
              Discover verified PGs near campus, compare rents & amenities, read reviews from
              real students, and book your room — all in under five minutes.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { k: 'Near', v: '2,100+ colleges', icon: '🎓' },
              { k: 'Verified', v: 'by admins', icon: '🛡️' },
              { k: 'Avg. rent', v: '₹9,800/mo', icon: '🏷️' },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur px-4 py-3.5 shadow-insetSoft">
                <div className="text-2xl" aria-hidden="true">{s.icon}</div>
                <p className="mt-1.5 font-display text-lg leading-none text-white">{s.k}</p>
                <p className="text-[11px] text-white/65 mt-1">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-pop">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            </div>
            <p className="font-display text-ink-700 text-lg tracking-tight">GeoNest</p>
          </div>

          <div className="rounded-3xl bg-white shadow-paper ring-1 ring-ink/5 p-7 sm:p-9">
            <h2 className="font-display text-2xl tracking-tight text-ink-700">Welcome back</h2>
            <p className="text-sm text-ink/60 mt-1.5">Sign in to continue to your dashboard.</p>

            {err && (
              <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-coral/25 bg-coral/[0.07] text-coral px-4 py-3 text-sm leading-relaxed">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <span>{err}</span>
              </div>
            )}

            <form onSubmit={submit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="login-email" className="label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.ac.in"
                  autoComplete="email"
                />
              </div>

              <PasswordInput
                id="login-password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                hint={
                  <span>
                    Tip: passwords use <code className="px-1 rounded bg-sand-100 font-mono text-[10px]">bcrypt</code> — at least 8 chars.
                  </span>
                }
              />

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 h-11 rounded-xl shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/60 focus-visible:ring-offset-2">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" aria-hidden="true" />
                    Signing you in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-7 pt-5 border-t border-ink/10">
              <p className="text-[11px] uppercase tracking-wider text-ink/45 font-semibold">Try a demo account</p>
              <p className="text-xs text-ink/55 mt-1">pw: <code className="font-mono bg-sand-100 px-1 rounded">StrongPass1</code></p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => fillDemo('student')} className="btn-secondary text-xs py-1.5 px-3 rounded-lg">Student</button>
                <button type="button" onClick={() => fillDemo('owner')} className="btn-secondary text-xs py-1.5 px-3 rounded-lg">Owner</button>
                <button type="button" onClick={() => fillDemo('admin')} className="btn-secondary text-xs py-1.5 px-3 rounded-lg">Admin</button>
              </div>
            </div>

            <p className="text-sm text-ink/70 mt-8 text-center">
              New here? <Link to="/signup" className="link font-semibold">Create an account</Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-ink/40 mt-6">
            Protected by rate-limiting · cookies are httpOnly & never exposed to JS.
          </p>
        </div>
      </div>
    </div>
  );
};
