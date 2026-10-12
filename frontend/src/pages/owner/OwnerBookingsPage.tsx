import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Booking } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

const statusBadge = (s: Booking['status']) =>
  s === 'requested' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' :
  s === 'confirmed' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
  s === 'completed' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' :
  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

export const OwnerBookingsPage: React.FC = () => {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/owners/bookings');
      setItems(data.bookings || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, s: Booking['status']) => {
    try {
      await api.put(`/owners/bookings/${id}/status`, { status: s });
      load();
    } catch {}
  };

  return (
    <div>
      <PageHeader title="Booking Requests" subtitle={`${items.filter(b => b.status === 'requested').length} pending`} />
      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No booking requests yet" description="Once you list verified PGs, students will start sending booking requests here." icon="📋" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-sand-50/70 dark:bg-slate-800/80"><tr>
                <th className="table-header">Student</th>
                <th className="table-header">PG</th>
                <th className="table-header">Status</th>
                <th className="table-header">Dates</th>
                <th className="table-header">Requested</th>
                <th className="table-header">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((b) => {
                  const student = typeof b.userId === 'object' && b.userId ? (b.userId as any) : null;
                  const pg = typeof b.pgId === 'object' && b.pgId ? (b.pgId as any) : null;
                  return (
                    <tr key={b._id} id={`booking-${b._id}`} className="hover:bg-sand-50/60 dark:hover:bg-slate-700/50 transition-all duration-300">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">{student?.name || 'Student'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{student?.email || 'N/A'}</div>
                          {student?.phone && <div className="text-xs text-slate-400 dark:text-slate-500">{student.phone}</div>}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">{pg?.name || 'PG Accommodation'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{pg?.city || ''}</div>
                        </div>
                      </td>
                      <td className="table-cell"><span className={`badge capitalize ${statusBadge(b.status)}`}>{b.status.replace('_', ' ')}</span></td>
                      <td className="table-cell text-xs text-slate-600 dark:text-slate-300">
                        <div>{b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A'}</div>
                        <div>→ {b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A'}</div>
                      </td>
                      <td className="table-cell text-xs text-slate-500 dark:text-slate-400">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="table-cell">
                        {b.status === 'requested' && (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setStatus(b._id, 'confirmed')} className="!py-1 !px-2.5 text-xs btn-primary">Confirm</button>
                            <button onClick={() => setStatus(b._id, 'cancelled')} className="!py-1 !px-2.5 text-xs btn-secondary">Reject</button>
                          </div>
                        )}
                        {b.status === 'confirmed' && (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setStatus(b._id, 'completed')} className="!py-1 !px-2.5 text-xs btn-secondary">Mark complete</button>
                            <button onClick={() => setStatus(b._id, 'cancelled')} className="!py-1 !px-2.5 text-xs btn-danger">Cancel</button>
                          </div>
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
