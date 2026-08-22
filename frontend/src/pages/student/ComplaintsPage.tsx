import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Complaint } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

const statusColor = (s: Complaint['status']) =>
  s === 'open' ? 'bg-red-50 text-red-700' :
  s === 'in_progress' ? 'bg-amber-50 text-amber-700' :
  'bg-emerald-50 text-emerald-700';

export const ComplaintsPage: React.FC = () => {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/complaints/me');
      setItems(data.complaints || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="My Complaints" subtitle="Issues raised with your PGs." actions={<Link to="/student/search" className="btn-secondary">File complaint from PG page</Link>} />
      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No complaints filed" description="Visit any PG details page to report an issue." icon="⚠️" />
      ) : (
        <div className="card divide-y divide-slate-100">
          {items.map((c) => (
            <div key={c._id} id={`complaint-${c._id}`} className="p-5 transition-all duration-500">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="font-semibold text-slate-800">
                    <Link to={`/pg/${(c.pgId as any)?._id || c.pgId}`} className="link">{(c.pgId as any)?.name || 'PG'}</Link>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="capitalize">{c.type.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Filed on {new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <span className={`badge ${statusColor(c.status)} capitalize`}>{c.status.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-slate-600">{c.description}</p>
              {c.status === 'resolved' && c.resolvedAt && (
                <p className="mt-3 text-xs text-emerald-600 bg-emerald-50 rounded-md p-2 border border-emerald-100">Resolved on {new Date(c.resolvedAt).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
