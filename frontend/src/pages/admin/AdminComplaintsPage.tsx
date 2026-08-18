import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Complaint } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

const statusColor = (s: Complaint['status']) =>
  s === 'open' ? 'bg-red-50 text-red-700' : s === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

export const AdminComplaintsPage: React.FC = () => {
  const [items, setItems] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      const params = filter ? { status: filter } : {};
      const { data } = await api.get('/admin/complaints', { params });
      setItems(data.complaints || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, s: Complaint['status']) => {
    setSaving(id);
    try { await api.put(`/admin/complaints/${id}`, { status: s }); load(); } catch {}
    setSaving(null);
  };

  return (
    <div>
      <PageHeader title="All Complaints" subtitle="Review and moderate issues." actions={
        <select className="input w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      } />
      {loading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No complaints match the filter" icon="✅" />
      ) : (
        <div className="card divide-y divide-slate-100">
          {items.map((c) => (
            <div key={c._id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="capitalize badge bg-slate-50 text-slate-700">{c.type.replace('_',' ')}</span>
                    {(c.pgId as any)?.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Filed by {(c.userId as any)?.name || 'Unknown'} · {(c.userId as any)?.email} · {new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <span className={`badge capitalize ${statusColor(c.status)}`}>{c.status.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-slate-600 mb-4">{c.description}</p>
              <div className="flex gap-2 justify-end">
                {c.status !== 'open' && (
                  <button onClick={() => setStatus(c._id, 'open')} disabled={saving === c._id} className="btn-danger !py-1 !px-3 text-xs">Open</button>
                )}
                {c.status !== 'in_progress' && (
                  <button onClick={() => setStatus(c._id, 'in_progress')} disabled={saving === c._id} className="btn-secondary !py-1 !px-3 text-xs">In progress</button>
                )}
                {c.status !== 'resolved' && (
                  <button onClick={() => setStatus(c._id, 'resolved')} disabled={saving === c._id} className="btn-primary !py-1 !px-3 text-xs">✓ Mark resolved</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
