import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { PGCard, EmptyState, PageHeader } from '../../components/shared';
import { Recommendation, PGListing } from '../../types';

export const StudentDashboardPage: React.FC = () => {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [recentPg, setRecentPg] = useState<PGListing[]>([]);
  const [bookingsCount, setBookingsCount] = useState<number>(0);
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, s, bRes, wRes] = await Promise.all([
          api.get('/recommendations?limit=8').catch(() => ({ data: { recommendations: [] } })),
          api.get('/pg/search?query=Nirma%20University&radiusKm=8&sortBy=recommended').catch(() => ({ data: { results: [] } })),
          api.get('/user/bookings/me').catch(() => ({ data: { bookings: [] } })),
          api.get('/user/wishlist/me').catch(() => ({ data: { wishlist: [] } })),
        ]);
        setRecs(r.data.recommendations || []);
        const results = s.data.results || [];
        setRecentPg(results.slice(0, 6));

        if (Array.isArray(bRes.data?.bookings)) setBookingsCount(bRes.data.bookings.length);
        if (Array.isArray(wRes.data?.wishlist)) setWishlistCount(wRes.data.wishlist.length);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const totalPrices = recentPg.map((p) => p.pricePerMonth).filter(Boolean);
  const avgRentVal = totalPrices.length
    ? `₹${Math.round(totalPrices.reduce((a, b) => a + b, 0) / totalPrices.length / 1000)}k`
    : '₹10k';
  const verifiedCount = recentPg.filter((p) => p.isVerified).length || 15;

  const stats = [
    { label: 'Bookings', val: bookingsCount > 0 ? `${bookingsCount} Active` : '0', icon: '📅', to: '/student/bookings', color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-100 dark:ring-indigo-800' },
    { label: 'Wishlist', val: wishlistCount > 0 ? `${wishlistCount} Saved` : '0', icon: '⭐', to: '/student/wishlist', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 ring-1 ring-amber-100 dark:ring-amber-800' },
    { label: 'Verified PGs', val: `${verifiedCount}+`, icon: '✅', to: '/student/search', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-100 dark:ring-emerald-800' },
    { label: 'Avg. Rent', val: avgRentVal, icon: '💰', to: '/student/search', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-100 dark:ring-rose-800' },
  ];

  return (
    <div>
      <PageHeader
        title="Welcome back 👋"
        subtitle="Find a PG near your college or explore recommendations made for you."
        actions={<Link to="/student/search" className="btn-primary">🔍 Search PGs</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card p-4 hover:shadow-pop dark:hover:shadow-slate-700/30 transition">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{s.val}</div>
          </Link>
        ))}
      </div>

      <div className="mb-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="h2 text-slate-900 dark:text-slate-100">Recommended for you</h2>
            <p className="text-sm text-ink/55 dark:text-slate-400 mt-0.5">Personalized picks based on preferences and bookings.</p>
          </div>
          <Link to="/student/search" className="link text-sm">View all →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card aspect-[4/5] animate-pulse bg-sand-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : recs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recs.map((r) => (
              <div key={r.pg._id} className="relative">
                <PGCard pg={{ ...r.pg, averageRating: r.pg.averageRating ?? null, primaryImage: r.pg.primaryImage ?? null }} />
                <div className="absolute top-3 right-3 z-10 badge bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-700/20">Match {Math.round(r.score * 100)}%</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No recommendations yet" description="Start by searching and adding PGs to your wishlist to unlock personalized recommendations." action={<Link to="/student/search" className="btn-primary">Search PGs</Link>} icon="✨" />
        )}
      </div>

      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="h2 text-slate-900 dark:text-slate-100">Near Nirma University</h2>
            <p className="text-sm text-ink/55 dark:text-slate-400 mt-0.5">Ahmedabad's popular student hub.</p>
          </div>
          <Link to="/student/map" className="link text-sm">Explore on map →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentPg.slice(0, 6).map((pg) => <PGCard key={pg._id} pg={pg} />)}
        </div>
      </div>
    </div>
  );
};
