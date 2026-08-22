import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Booking } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

const statusBadge = (s: Booking['status']) =>
  s === 'requested' ? 'bg-amber-50 text-amber-700' :
  s === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
  s === 'completed' ? 'bg-blue-50 text-blue-700' :
  'bg-slate-100 text-slate-600';

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
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No booking requests yet" description="Once you list verified PGs, students will start sending booking requests here." icon="📋" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-surface-50"><tr>
                <th className="table-header">Student</th>
                <th className="table-header">PG</th>
                <th className="table-header">Status</th>
                <th className="table-header">Dates</th>
                <th className="table-header">Requested</th>
                <th className="table-header">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((b) => (
                  <tr key={b._id} id={`booking-${b._id}`} className="hover:bg-surface-50 transition-all duration-500">
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-slate-800">{(b.userId as any).name}</div>
                        <div className="text-xs text-slate-500">{(b.userId as any).email}</div>
                        <div className="text-xs text-slate-400">{(b.userId as any).phone}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">{(b.pgId as any).name}</div>
                        <div className="text-xs text-slate-500">{(b.pgId as any).city}</div>
                      </div>
                    </td>
                    <td className="table-cell"><span className={`badge capitalize ${statusBadge(b.status)}`}>{b.status.replace('_', ' ')}</span></td>
                    <td className="table-cell text-xs text-slate-600">
                      <div>{new Date(b.startDate).toLocaleDateString()}</div>
                      <div>→ {new Date(b.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="table-cell text-xs text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
