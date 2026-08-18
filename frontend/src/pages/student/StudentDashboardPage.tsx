import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { PGCard, EmptyState, PageHeader } from '../../components/shared';
import { Recommendation, PGListing } from '../../types';

export const StudentDashboardPage: React.FC = () => {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [recentPg, setRecentPg] = useState<PGListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, s] = await Promise.all([
          api.get('/recommendations?limit=8'),
          api.get('/pg/search?query=Nirma%20University&radiusKm=8&sortBy=recommended'),
        ]);
        setRecs(r.data.recommendations || []);
        setRecentPg((s.data.results || []).slice(0, 6));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const stats = [
    { label: 'Bookings', val: recs.length ? 'View' : '0', icon: '📅', to: '/student/bookings', color: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' },
    { label: 'Wishlist', val: '—', icon: '⭐', to: '/student/wishlist', color: 'bg-marigold-50 text-marigold-600 ring-1 ring-marigold-100' },
    { label: 'Verified PGs', val: '15+', icon: '✅', to: '/student/search', color: 'bg-sage/10 text-sage ring-1 ring-sage/20' },
    { label: 'Avg. Rent', val: '₹10k', icon: '💰', to: '/student/search', color: 'bg-coral/10 text-coral ring-1 ring-coral/20' },
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
          <Link key={s.label} to={s.to} className="card p-4 hover:shadow-pop transition">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{s.val}</div>
          </Link>
        ))}
      </div>

      <div className="mb-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="h2">Recommended for you</h2>
            <p className="text-sm text-ink/55 mt-0.5">Personalized picks based on preferences and bookings.</p>
          </div>
          <Link to="/student/search" className="link text-sm">View all →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card aspect-[4/5] animate-pulse bg-sand-100" />
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
            <h2 className="h2">Near Nirma University</h2>
            <p className="text-sm text-ink/55 mt-0.5">Ahmedabad's popular student hub.</p>
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
