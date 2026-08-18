import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { PageHeader } from '../../components/shared';

export const AdminOverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/admin/overview'); setMetrics(data.metrics || {}); } catch {}
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Total Users', key: 'totalUsers', icon: '👥', to: '/admin/users', color: 'bg-sky-50 text-sky-700' },
    { label: 'Owners', key: 'owners', icon: '🏢', to: '/admin/users', color: 'bg-purple-50 text-purple-700' },
    { label: 'Students', key: 'students', icon: '🎓', to: '/admin/users', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Total PGs', key: 'totalPGs', icon: '🏠', to: '/admin/verifications', color: 'bg-amber-50 text-amber-700' },
    { label: 'Verified PGs', key: 'verifiedPGs', icon: '✅', to: '/admin/verifications', color: 'bg-green-50 text-green-700' },
    { label: 'Pending Verifications', key: 'pendingVerifications', icon: '⏳', to: '/admin/verifications', color: 'bg-orange-50 text-orange-700' },
    { label: 'Open Complaints', key: 'openComplaints', icon: '⚠️', to: '/admin/complaints', color: 'bg-red-50 text-red-700' },
    { label: 'Pending Bookings', key: 'pendingBookings', icon: '📋', to: '/admin/complaints', color: 'bg-pink-50 text-pink-700' },
  ];

  return (
    <div>
      <PageHeader title="Admin Overview" subtitle="Platform-wide metrics at a glance." />
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({length:8}).map((_,i) => <div key={i} className="card h-28 animate-pulse bg-slate-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} className="card p-5 hover:shadow-pop transition">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl mb-3 ${c.color}`}>{c.icon}</div>
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="text-2xl font-bold mt-0.5">{metrics[c.key] ?? 0}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
