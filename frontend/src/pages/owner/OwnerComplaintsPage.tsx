import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Complaint } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

const statusColor = (s: Complaint['status']) =>
  s === 'open' ? 'bg-red-50 text-red-700' : s === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

export const OwnerComplaintsPage: React.FC = () => {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [statusVal, setStatusVal] = useState<Complaint['status']>('in_progress');
  const [resolutionHours, setResolutionHours] = useState(48);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    try { 
      const { data } = await api.get('/owners/complaints'); 
      setItems(data.complaints || []); 
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openRespondModal = (c: Complaint) => {
    setSelectedComplaint(c);
    setStatusVal(c.status);
    setResolutionHours(c.estimatedResolutionHours || 48);
    setResponseMsg('');
  };

  const handleUpdateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      await api.put(`/owners/complaints/${selectedComplaint._id}`, {
        status: statusVal,
        responseMessage: responseMsg,
        estimatedResolutionHours: resolutionHours,
      });
      setSelectedComplaint(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update complaint');
    }
    setUpdating(false);
  };

  return (
    <div>
      <PageHeader title="Complaints Management" subtitle="Respond to student issues and set estimated resolution timelines." />
      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No complaints yet 🎉" description="Great — nothing needs your attention right now." icon="✅" />
      ) : (
        <div className="card divide-y divide-slate-100">
          {items.map((c) => {
            const isOverdue = c.ratingDeducted;
            return (
              <div key={c._id} id={`complaint-${c._id}`} className="p-5 transition-all duration-500 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{(c.pgId as any)?.name || 'PG'}</span>
                      <span className="text-slate-300">·</span>
                      <span className="capitalize">{c.type.replace('_', ' ')}</span>
                      {isOverdue && (
                        <span className="badge bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                          ⚠️ Rating Penalty Applied (-0.5 pts)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">by {(c.userId as any)?.name || 'Student'} ({(c.userId as any)?.email}) · {new Date(c.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge capitalize ${statusColor(c.status)}`}>{c.status.replace('_', ' ')}</span>
                    <button onClick={() => openRespondModal(c)} className="btn-secondary text-xs !py-1 !px-2.5">
                      Respond / Update Timeline
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-600 bg-sand-50 p-3 rounded-lg border border-sand-200">{c.description}</p>

                {c.estimatedResolutionDate && (
                  <div className="text-xs text-indigo-800 bg-indigo-50/70 p-2.5 rounded-md border border-indigo-100 flex items-center justify-between">
                    <span>⏱️ <strong>Estimated Resolution Time:</strong> {c.estimatedResolutionHours} hours (Target: {new Date(c.estimatedResolutionDate).toLocaleString()})</span>
                    {c.status !== 'resolved' && <span className="text-[10px] text-amber-700 font-medium">⚠️ Resolve within 7 days to prevent auto rating deduction</span>}
                  </div>
                )}

                {c.responses && c.responses.length > 0 && (
                  <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                    <div className="text-xs font-semibold text-slate-700">Response History:</div>
                    {c.responses.map((resp, i) => (
                      <div key={i} className="text-xs text-slate-600 pl-3 border-l-2 border-indigo-400">
                        <span className="font-semibold capitalize text-indigo-900">{resp.role}: </span>
                        <span>{resp.message}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({new Date(resp.createdAt).toLocaleString()})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Owner Respond & Timeline Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-ink-700/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-sand-200 pb-3">
              <h3 className="font-bold text-lg text-slate-800">Update Complaint Timeline</h3>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleUpdateComplaint} className="space-y-4">
              <div>
                <label className="label">Update Status</label>
                <select className="input" value={statusVal} onChange={(e) => setStatusVal(e.target.value as any)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="label">Estimated Resolution Time (Hours)</label>
                <select className="input" value={resolutionHours} onChange={(e) => setResolutionHours(Number(e.target.value))}>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={48}>48 Hours (2 Days)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                  <option value={120}>120 Hours (5 Days)</option>
                  <option value={168}>168 Hours (7 Days - Max Limit)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Note: Unresolved complaints after 7 days will automatically deduct -0.5 points from your PG rating.
                </p>
              </div>

              <div>
                <label className="label">Response Message to Student</label>
                <textarea 
                  className="input min-h-[90px]" 
                  placeholder="Provide an update or instructions for the student..." 
                  value={responseMsg} 
                  onChange={(e) => setResponseMsg(e.target.value)} 
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setSelectedComplaint(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={updating} className="btn-primary flex-1">
                  {updating ? 'Saving...' : 'Save & Update Timeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
