import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { PageHeader } from '../../components/shared';
import { AlertOctagon, CheckCircle2, ShieldAlert, EyeOff } from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [{ data: overviewData }, { data: reportsData }] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/reports').catch(() => ({ data: { reports: [] } })),
      ]);
      setMetrics(overviewData.metrics || {});
      setReports(reportsData.reports || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReportAction = async (reportId: string, status: string, hideListing: boolean = false) => {
    try {
      await api.put(`/admin/reports/${reportId}`, { status, hideListing });
      toast.success(hideListing ? 'Listing hidden & report resolved.' : 'Report dismissed.');
      loadData();
    } catch (err: any) {
      toast.error('Failed to update report status');
    }
  };

  const cards = [
    { label: 'Total Users', key: 'totalUsers', icon: '👥', to: '/admin/users', color: 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300' },
    { label: 'Owners', key: 'owners', icon: '🏢', to: '/admin/users', color: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
    { label: 'Students', key: 'students', icon: '🎓', to: '/admin/users', color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
    { label: 'Total PGs', key: 'totalPGs', icon: '🏠', to: '/admin/verifications', color: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
    { label: 'Verified PGs', key: 'verifiedPGs', icon: '✅', to: '/admin/verifications', color: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' },
    { label: 'Pending Verifications', key: 'pendingVerifications', icon: '⏳', to: '/admin/verifications', color: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300' },
    { label: 'Open Complaints', key: 'openComplaints', icon: '⚠️', to: '/admin/complaints', color: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' },
    { label: 'Flagged Reports', key: 'pendingReports', icon: '🚨', to: '#moderation-queue', color: 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Overview & Moderation" subtitle="Platform-wide metrics & listing moderation queue." />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} className="card p-5 hover:shadow-pop transition border dark:border-slate-700">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 ${c.color}`}>{c.icon}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{c.label}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{metrics[c.key] ?? 0}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Flagged Listings Moderation Queue */}
      <div id="moderation-queue" className="card p-5 space-y-4 border dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            Reported Listings Moderation Queue
          </h3>
          <span className="badge bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800 text-xs">
            {reports.filter(r => r.status === 'pending').length} pending
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            No listing reports submitted yet. Everything looks clean!
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {reports.map((report) => (
              <div key={report._id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {report.pgId?.name || 'Unknown PG'}
                    </span>
                    <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] capitalize">
                      {report.reason?.replace('_', ' ')}
                    </span>
                    <span className={`badge capitalize text-[10px] ${
                      report.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : report.status === 'action_taken' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{report.details}</p>
                  <div className="text-[11px] text-slate-400">
                    Reported by {report.userId?.name || 'Student'} on {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {report.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReportAction(report._id, 'action_taken', true)}
                      className="btn-danger !py-1.5 !px-3 text-xs flex items-center gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Hide Listing
                    </button>
                    <button
                      onClick={() => handleReportAction(report._id, 'dismissed', false)}
                      className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
