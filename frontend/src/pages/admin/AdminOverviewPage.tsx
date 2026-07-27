import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Home as HomeIcon,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import {
  AdminMetricCard,
  AdminMetricCardSkeleton,
} from '../../components/AdminMetricCard';
import { adminApi, AdminOverviewStats, ApiError } from '../../services/api';

export const AdminOverviewPage = () => {
  const toast = useToast();
  const [stats, setStats] = useState<AdminOverviewStats>({
    totalUsers: 0,
    totalPGs: 0,
    pendingVerifications: 0,
    openComplaints: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    adminApi
      .overview()
      .then((res) => {
        if (alive) setStats(res.data || stats);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof ApiError ? e.message : 'Could not load overview stats.';
        toast.show({ variant: 'error', title: 'Failed to load overview', message: msg });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const SkeletonCard = AdminMetricCardSkeleton;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink leading-tight">
          Overview
        </h1>
        <p className="text-ink/60 text-sm mt-1">
          A quick snapshot of the GeoNest platform today.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            label="Total Users"
            value={stats.totalUsers}
            Icon={Users}
            href="/dashboard/admin/users"
            accent="marigold"
          />
          <AdminMetricCard
            label="Total PGs"
            value={stats.totalPGs}
            Icon={HomeIcon}
            accent="sage"
          />
          <AdminMetricCard
            label="Pending Verifications"
            value={stats.pendingVerifications}
            Icon={ClipboardCheck}
            href="/dashboard/admin/verification"
            accent="marigold"
          />
          <AdminMetricCard
            label="Open Complaints"
            value={stats.openComplaints}
            Icon={AlertTriangle}
            href="/dashboard/admin/complaints"
            accent="coral"
          />
        </div>
      )}

      <section
        aria-label="Needs attention"
        className="rounded-2xl bg-white border border-ink/10 p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-marigold/15 text-marigold flex items-center justify-center">
            <AlertTriangle size={18} aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink">
            Needs attention
          </h2>
        </div>
        <ul className="divide-y divide-ink/5 border border-ink/5 rounded-xl overflow-hidden">
          <li>
            <Link
              to="/dashboard/admin/verification"
              className="group flex items-center justify-between gap-4 p-4 hover:bg-indigo/5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo focus:bg-indigo/5 motion-reduce:transition-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-marigold/15 text-marigold flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink leading-snug">
                    Pending Verifications
                  </p>
                  <p className="text-xs text-ink/50 truncate">
                    {stats.pendingVerifications === 0
                      ? 'All caught up — no PGs awaiting review.'
                      : `${stats.pendingVerifications} listing${stats.pendingVerifications === 1 ? '' : 's'} waiting for admin review.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {stats.pendingVerifications > 0 && (
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-marigold/15 text-marigold">
                    {stats.pendingVerifications}
                  </span>
                )}
                <ArrowRight size={18} className="text-ink/30 group-hover:text-indigo group-hover:translate-x-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none" aria-hidden="true" />
              </div>
            </Link>
          </li>
          <li>
            <Link
              to="/dashboard/admin/complaints"
              className="group flex items-center justify-between gap-4 p-4 hover:bg-indigo/5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo focus:bg-indigo/5 motion-reduce:transition-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-coral/15 text-coral flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink leading-snug">
                    Open Complaints
                  </p>
                  <p className="text-xs text-ink/50 truncate">
                    {stats.openComplaints === 0
                      ? 'No unresolved complaints right now.'
                      : `${stats.openComplaints} complaint${stats.openComplaints === 1 ? '' : 's'} need${stats.openComplaints === 1 ? 's' : ''} triage.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {stats.openComplaints > 0 && (
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-coral/15 text-coral">
                    {stats.openComplaints}
                  </span>
                )}
                <ArrowRight size={18} className="text-ink/30 group-hover:text-indigo group-hover:translate-x-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none" aria-hidden="true" />
              </div>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
};
