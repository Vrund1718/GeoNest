import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Booking } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

const statusBadge = (s: Booking['status']) =>
  s === 'requested' ? 'bg-amber-50 text-amber-700' :
  s === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
  s === 'completed' ? 'bg-blue-50 text-blue-700' :
  'bg-slate-100 text-slate-600';

export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/bookings/me');
      setBookings(data.bookings || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    try {
      await api.put(`/bookings/${id}/status`, { status: 'cancelled' });
      load();
    } catch {}
  };

  return (
    <div>
      <PageHeader title="My Bookings" subtitle="Track and manage your accommodation bookings." />
      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings yet" description="Browse PGs and submit a booking request to get started." icon="📅" action={<Link to="/student/search" className="btn-primary">Find a PG</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-surface-50"><tr>
                <th className="table-header">PG</th>
                <th className="table-header">Status</th>
                <th className="table-header">Check-in</th>
                <th className="table-header">Check-out</th>
                <th className="table-header">Booked on</th>
                <th className="table-header"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => {
                  const pg = b.pgId as any;
                  return (
                    <tr key={b._id} className="hover:bg-surface-50">
                      <td className="table-cell">
                        <Link to={`/pg/${pg?._id || b.pgId}`} className="flex items-center gap-3 hover:text-brand-700">
                          {pg?.primaryImage && <img src={pg.primaryImage} className="w-10 h-10 rounded-md object-cover bg-slate-100" />}
                          <div>
                            <div className="font-medium text-slate-800">{pg?.name || 'PG'}</div>
                            <div className="text-xs text-slate-500">{pg?.city}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="table-cell"><span className={`badge ${statusBadge(b.status)} capitalize`}>{b.status.replace('_', ' ')}</span></td>
                      <td className="table-cell">{new Date(b.startDate).toLocaleDateString()}</td>
                      <td className="table-cell">{new Date(b.endDate).toLocaleDateString()}</td>
                      <td className="table-cell text-xs text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                      <td className="table-cell text-right">
                        {b.status === 'requested' && (
                          <button onClick={() => cancel(b._id)} className="btn-danger text-xs !py-1 !px-2.5">Cancel</button>
                        )}
                        {b.status === 'confirmed' && (
                          <button onClick={() => cancel(b._id)} className="btn-secondary text-xs !py-1 !px-2.5">Cancel</button>
                        )}
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
