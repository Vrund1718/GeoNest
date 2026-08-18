import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Complaint } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

const statusColor = (s: Complaint['status']) =>
  s === 'open' ? 'bg-red-50 text-red-700' : s === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

export const OwnerComplaintsPage: React.FC = () => {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try { const { data } = await api.get('/owners/complaints'); setItems(data.complaints || []); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  return (
    <div>
      <PageHeader title="Complaints" subtitle="Issues raised by students." />
      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No complaints yet 🎉" description="Great — nothing needs your attention right now." icon="✅" />
      ) : (
        <div className="card divide-y divide-slate-100">
          {items.map((c) => (
            <div key={c._id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="font-semibold text-slate-800">
                    {(c.pgId as any)?.name || 'PG'}
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="capitalize">{c.type.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">by {(c.userId as any)?.name || 'Student'} · {new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <span className={`badge capitalize ${statusColor(c.status)}`}>{c.status.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-slate-600">{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
