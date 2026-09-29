import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../lib/api';
import { EmptyState, PageHeader } from '../../components/shared';
import { Building, Eye, Heart, CalendarCheck, BedDouble, TrendingUp } from 'lucide-react';

export const OwnerPGListPage: React.FC = () => {
  const nav = useNavigate();
  const [pgs, setPgs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [{ data: pgData }, { data: analyticsData }] = await Promise.all([
        api.get('/owners/pg'),
        api.get('/owners/analytics').catch(() => ({ data: null })),
      ]);
      setPgs(pgData.pgs || []);
      setAnalytics(analyticsData);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const softDel = async (id: string) => {
    if (!confirm('Soft delete this PG listing?')) return;
    try {
      await api.delete(`/owners/pg/${id}`);
      load();
    } catch {}
  };

  const summary = analytics?.summary || {};
  const monthlyStats = analytics?.monthlyStats || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My PG Listings & Analytics"
        subtitle={`${pgs.length} total property listings`}
        actions={
          <Link to="/owner/pg/new" className="btn-primary flex items-center gap-1.5">
            <span>+</span> Add new PG
          </Link>
        }
      />

      {/* Analytics KPI Cards */}
      {!loading && pgs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 grid place-items-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink/55 dark:text-slate-400 font-medium">Total Views</div>
              <div className="text-xl font-bold text-ink-700 dark:text-slate-100">{summary.totalViews || 0}</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 grid place-items-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink/55 dark:text-slate-400 font-medium">Wishlists</div>
              <div className="text-xl font-bold text-ink-700 dark:text-slate-100">{summary.wishlistCount || 0}</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink/55 dark:text-slate-400 font-medium">Bookings</div>
              <div className="text-xl font-bold text-ink-700 dark:text-slate-100">{summary.totalBookings || 0}</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-ink/55 dark:text-slate-400 font-medium">Occupancy</div>
              <div className="text-xl font-bold text-ink-700 dark:text-slate-100">{summary.occupancyRate || 0}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Recharts Analytics Graph */}
      {!loading && monthlyStats.length > 0 && pgs.length > 0 && (
        <div className="card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink-700 dark:text-slate-200 flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Listing Performance Trends
            </h3>
            <span className="text-xs text-ink/50 dark:text-slate-400">Past 6 months</span>
          </div>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="views" name="Views" stroke="#4f46e5" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#10b981" fillOpacity={1} fill="url(#colorBookings)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-sand-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : pgs.length === 0 ? (
        <EmptyState
          title="You haven't listed any PGs yet"
          description="Add your first paying guest accommodation to start receiving booking requests."
          icon="🏢"
          action={
            <Link to="/owner/pg/new" className="btn-primary">
              + Add new PG
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink/15 dark:divide-slate-700">
              <thead className="bg-sand-50/70 dark:bg-slate-800/80">
                <tr>
                  <th className="table-header">PG Details</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Price</th>
                  <th className="table-header">Room Availability</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Verified</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 dark:divide-slate-700">
                {pgs.map((pg) => {
                  const available = pg.availableRooms ?? 0;
                  const total = pg.totalRooms ?? 1;
                  const isFull = available === 0;

                  return (
                    <tr key={pg._id} className="hover:bg-sand-50/60 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          {pg.primaryImage ? (
                            <img src={pg.primaryImage} className="w-12 h-12 rounded-md object-cover bg-sand-100 dark:bg-slate-700 ring-1 ring-ink/10 dark:ring-slate-600" />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-sand-100 dark:bg-slate-700 grid place-items-center ring-1 ring-ink/10 dark:ring-slate-600 text-lg">
                              🏠
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-ink-700 dark:text-slate-200">{pg.name}</div>
                            <div className="text-xs text-ink/55 dark:text-slate-400 capitalize">
                              {pg.genderPreference} · {pg.collegeName || pg.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell max-w-xs truncate text-ink/80 dark:text-slate-300">{pg.address}</td>
                      <td className="table-cell font-semibold text-ink-700 dark:text-slate-200">₹{pg.pricePerMonth?.toLocaleString()}/mo</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${
                            isFull ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            {available}/{total} {isFull ? 'Full' : 'Avail'}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge capitalize ring-1 ${
                            pg.status === 'active'
                              ? 'bg-sage/10 text-sage ring-sage/20'
                              : pg.status === 'inactive'
                              ? 'bg-marigold-50 text-marigold-600 ring-marigold-100'
                              : 'bg-sand-100 text-ink/60 ring-ink/10'
                          }`}
                        >
                          {pg.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        {pg.isVerified ? (
                          <span className="badge bg-sage/10 text-sage ring-1 ring-sage/20">✓ Yes</span>
                        ) : (
                          <span className="badge bg-marigold-50 text-marigold-600 ring-1 ring-marigold-100">Pending</span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => nav(`/owner/pg/${pg._id}/edit`)} className="btn-secondary !py-1 !px-2.5 text-xs">
                            Edit
                          </button>
                          <button onClick={() => nav(`/owner/pg/${pg._id}/images`)} className="btn-secondary !py-1 !px-2.5 text-xs">
                            Images
                          </button>
                          <button onClick={() => softDel(pg._id)} className="btn-danger !py-1 !px-2.5 text-xs">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
