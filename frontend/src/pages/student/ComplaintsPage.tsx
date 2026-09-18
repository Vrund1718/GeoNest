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
  const [activeBookings, setActiveBookings] = useState<any[]>([]);

  const load = async () => {
    try {
      const [resComplaints, resActive] = await Promise.all([
        api.get('/complaints/me'),
        api.get('/active-bookings')
      ]);
      setItems(resComplaints.data.complaints || []);
      setActiveBookings(resActive.data.bookings || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const hasActive = activeBookings.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Complaints" 
        subtitle="Issues raised with your PGs." 
        actions={
          hasActive ? (
            <Link to="/student/my-pg" className="btn-primary">Raise Complaint</Link>
          ) : (
            <Link to="/student/search" className="btn-secondary">Browse PGs</Link>
          )
        } 
      />

      {!hasActive && (
        <div className="card p-5 bg-amber-50 border-amber-200 text-amber-900 flex items-start gap-4">
          <div className="text-3xl">🔒</div>
          <div>
            <h4 className="font-bold text-sm text-amber-950">Complaint Filing Restricted</h4>
            <p className="text-xs text-amber-800 mt-1">
              You can only file a complaint if you have an active PG booking. Once your stay booking is confirmed, you will be able to file complaint tickets for your PG.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No complaints filed" description="Report any accommodation issues once you have an active PG stay." icon="⚠️" />
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
              
              <p className="text-sm text-slate-600 mb-3">{c.description}</p>

              {c.estimatedResolutionDate && c.status !== 'resolved' && (
                <div className="text-xs p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-800 flex items-center justify-between">
                  <span>⏱️ <strong>Estimated Resolution:</strong> {c.estimatedResolutionHours}h ({new Date(c.estimatedResolutionDate).toLocaleString()})</span>
                  {c.ratingDeducted && <span className="badge bg-red-100 text-red-700 font-semibold">Overdue Rating Deduction Applied</span>}
                </div>
              )}

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
