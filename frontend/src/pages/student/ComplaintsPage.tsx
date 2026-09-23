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
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    pgId: '',
    type: 'other',
    priority: 'medium',
    description: '',
  });

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    try {
      const [resComplaints, resActive] = await Promise.all([
        api.get('/complaints/me'),
        api.get('/active-bookings')
      ]);
      const bookings = resActive.data.bookings || [];
      setItems(resComplaints.data.complaints || []);
      setActiveBookings(bookings);
      if (bookings.length > 0 && !form.pgId) {
        setForm(prev => ({ ...prev, pgId: bookings[0].pgId?._id || bookings[0].pgId }));
      }
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const hasActive = activeBookings.length > 0;

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pgId) return showToast('Please select a PG');
    if (form.description.trim().length < 10) return showToast('Description must be at least 10 characters');

    setSubmitting(true);
    try {
      await api.post('/complaints', form);
      showToast('Complaint raised successfully!');
      setShowModal(false);
      setForm(prev => ({ ...prev, description: '', type: 'other', priority: 'medium' }));
      load();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to file complaint');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Complaints" 
        subtitle="Issues raised with your PGs." 
        actions={
          hasActive ? (
            <button onClick={() => setShowModal(true)} className="btn-primary">+ Raise Complaint</button>
          ) : (
            <Link to="/student/search" className="btn-secondary">Browse PGs</Link>
          )
        } 
      />

      {!hasActive && (
        <div className="card p-5 bg-amber-50 border-amber-200 text-amber-900 flex items-start gap-4">
          <div className="text-3xl">🔒</div>
          <div>
            <h4 className="font-bold text-sm text-amber-950">No Registered PG Found</h4>
            <p className="text-xs text-amber-800 mt-1">
              You can file a complaint once you register or book a PG accommodation.
            </p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800">Raise a Complaint</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-4">
              <div>
                <label className="label">Select PG</label>
                <select
                  className="input"
                  value={form.pgId}
                  onChange={(e) => setForm({ ...form, pgId: e.target.value })}
                  required
                >
                  {activeBookings.map((b) => (
                    <option key={b._id} value={b.pgId?._id || b.pgId}>
                      {b.pgId?.name || 'PG Accommodation'} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Issue Type</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {[
                      'hygiene', 'noise', 'safety', 'staff', 'amenity', 'electrician',
                      'plumber', 'wifi', 'furniture', 'water', 'security', 'pest_control',
                      'food', 'other'
                    ].map(t => (
                      <option key={t} value={t} className="capitalize">
                        {t.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select
                    className="input"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Explain the issue in detail (min 10 characters)..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Submitting…' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] card shadow-pop px-5 py-3 bg-slate-900 text-white text-sm border-slate-800">{toast}</div>
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
