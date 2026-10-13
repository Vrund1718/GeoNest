import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Complaint, ComplaintIntelligence } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Clock,
  Wrench,
  ShieldAlert,
  Bot,
  UserCheck,
  ChevronRight,
  Info,
} from 'lucide-react';

const statusColor = (s: Complaint['status']) => {
  switch (s) {
    case 'open':
      return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900';
    case 'assigned':
      return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900';
    case 'in_progress':
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900';
    case 'resolved':
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900';
    case 'reopened':
      return 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800';
    case 'closed':
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  }
};

const priorityBadge = (p: Complaint['priority']) => {
  switch (p) {
    case 'critical':
      return 'bg-rose-600 text-white font-bold animate-pulse shadow-xs';
    case 'high':
    case 'urgent':
      return 'bg-orange-500 text-white font-semibold';
    case 'medium':
      return 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900';
    case 'low':
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export const ComplaintsPage: React.FC = () => {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    pgId: '',
    type: 'other',
    priority: 'medium' as Complaint['priority'],
    description: '',
    photoUrlInput: '',
    photoUrls: [] as string[],
  });

  // AI intelligence preview state
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiPreview, setAiPreview] = useState<ComplaintIntelligence | null>(null);
  const [safetyHazardWarning, setSafetyHazardWarning] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reopen modal state
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [resComplaints, resActive] = await Promise.all([
        api.get('/complaints/me'),
        api.get('/active-bookings'),
      ]);
      const bookings = resActive.data.bookings || [];
      const validBookings = bookings.filter((b: any) => b && (b.pgId || b._id));
      setItems(resComplaints.data.complaints || []);
      setActiveBookings(validBookings);
      if (validBookings.length > 0) {
        const firstId = validBookings[0].pgId?._id ? String(validBookings[0].pgId._id) : String(validBookings[0].pgId || '');
        setForm((prev) => ({ ...prev, pgId: prev.pgId || firstId }));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasActive = activeBookings.length > 0;

  // Debounced AI Preview analysis as student describes the issue
  const triggerAiAnalysis = useCallback(async (description: string, category?: string, priority?: string) => {
    if (!description || description.trim().length < 12) {
      setAiPreview(null);
      setSafetyHazardWarning(null);
      return;
    }

    setAnalyzingAi(true);
    try {
      const { data } = await api.post('/complaints/analyze', {
        description: description.trim(),
        userCategory: category,
        userPriority: priority,
      });

      if (data.ok && data.intelligence) {
        setAiPreview(data.intelligence);
        if (data.isSafetyHazard) {
          setSafetyHazardWarning(data.safetyHazardKeyword || 'Hazardous condition detected');
          // Automatically set priority to critical on safety hazard
          setForm((prev) => ({ ...prev, priority: 'critical' }));
        } else {
          setSafetyHazardWarning(null);
        }
      }
    } catch {
      // Non-blocking preview error
    } finally {
      setAnalyzingAi(false);
    }
  }, []);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, description: val }));

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      triggerAiAnalysis(val, form.type, form.priority);
    }, 700);
  };

  const applyAiSuggestion = () => {
    if (!aiPreview) return;
    setForm((prev) => ({
      ...prev,
      type: aiPreview.category,
      priority: aiPreview.priority,
    }));
    showToast('Applied AI suggested category and priority!');
  };

  const handleAddPhoto = () => {
    if (!form.photoUrlInput.trim()) return;
    setForm((prev) => ({
      ...prev,
      photoUrls: [...prev.photoUrls, prev.photoUrlInput.trim()],
      photoUrlInput: '',
    }));
  };

  const handleRemovePhoto = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pgId && activeBookings.length > 0) {
      const fallbackId = activeBookings[0].pgId?._id ? String(activeBookings[0].pgId._id) : String(activeBookings[0].pgId || '');
      form.pgId = fallbackId;
    }
    if (!form.pgId) return showToast('Please select a PG accommodation');
    if (form.description.trim().length < 10) return showToast('Description must be at least 10 characters');

    setSubmitting(true);
    try {
      const payload = {
        pgId: form.pgId,
        type: form.type,
        priority: form.priority,
        description: form.description.trim(),
        photoUrls: form.photoUrls,
        intelligence: aiPreview || undefined,
      };

      await api.post('/complaints', payload);
      showToast('Complaint raised successfully with AI triage!');
      setShowModal(false);
      setAiPreview(null);
      setSafetyHazardWarning(null);
      setForm((prev) => ({
        ...prev,
        description: '',
        type: 'other',
        priority: 'medium',
        photoUrls: [],
        photoUrlInput: '',
      }));
      load();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to file complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResolved = async (complaintId: string) => {
    if (!confirm('Confirm that this maintenance issue has been resolved to your satisfaction?')) return;
    try {
      await api.post(`/complaints/${complaintId}/confirm-resolved`);
      showToast('Complaint confirmed as resolved!');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to confirm resolution');
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenTargetId) return;
    if (reopenReason.trim().length < 5) {
      return showToast('Please enter a brief explanation for reopening');
    }

    setReopening(true);
    try {
      await api.post(`/complaints/${reopenTargetId}/reopen`, { reason: reopenReason.trim() });
      showToast('Complaint reopened and escalated to property owner.');
      setReopenTargetId(null);
      setReopenReason('');
      load();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to reopen complaint');
    } finally {
      setReopening(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Complaints & Maintenance"
        subtitle="AI-classified maintenance triage, live resolution tracking, and SLA targets."
        actions={
          hasActive ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Raise Smart Complaint</span>
            </button>
          ) : (
            <Link to="/student/search" className="btn-secondary">
              Browse PGs
            </Link>
          )
        }
      />

      {!hasActive && (
        <div className="card p-5 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-start gap-4">
          <div className="text-3xl">🔒</div>
          <div>
            <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">No Registered PG Found</h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              You can file maintenance complaints once you register or book an accommodation.
            </p>
          </div>
        </div>
      )}

      {/* Raise Complaint Modal with AI Triage */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-xl p-6 space-y-4 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-sand-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 grid place-items-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Raise Smart Complaint</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">AI auto-classifies issue urgency and triage next steps</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
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
                  {activeBookings.map((b) => {
                    const optVal = b.pgId?._id ? String(b.pgId._id) : String(b.pgId || b._id);
                    return (
                      <option key={b._id} value={optVal}>
                        {b.pgId?.name || 'PG Accommodation'} ({b.status})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Describe the Issue</label>
                  {analyzingAi && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      AI analyzing triage…
                    </span>
                  )}
                </div>
                <textarea
                  className="input min-h-[95px] text-sm"
                  placeholder="Describe what's wrong, location, or equipment (e.g., 'Water is leaking under the washbasin in Room 302', 'Sparks seen near main switch')..."
                  value={form.description}
                  onChange={handleDescriptionChange}
                  required
                />
              </div>

              {/* Safety Hazard Override Alert */}
              {safetyHazardWarning && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-rose-900 dark:text-rose-100">Critical Hazard Detected: "{safetyHazardWarning}"</p>
                    <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                      This issue will immediately escalate as <strong>Critical</strong> with target resolution within 4 hours.
                    </p>
                  </div>
                </div>
              )}

              {/* AI Suggested Intelligence Panel */}
              {aiPreview && (
                <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>AI Suggested Triage (Reviewable)</span>
                    </div>
                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>Auto-apply suggestion</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Detected Category</span>
                      <span className="font-bold capitalize text-slate-800 dark:text-slate-100">
                        {aiPreview.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Recommended Priority</span>
                      <span className="font-bold capitalize text-slate-800 dark:text-slate-100">
                        {aiPreview.priority} (Confidence: {Math.round(aiPreview.confidence * 100)}%)
                      </span>
                    </div>
                  </div>

                  {aiPreview.suggestedAction && (
                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      <strong className="text-indigo-800 dark:text-indigo-300">Recommended Action: </strong>
                      {aiPreview.suggestedAction}
                    </div>
                  )}
                </div>
              )}

              {/* Editable Category & Priority Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input capitalize"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {[
                      'plumbing',
                      'electrical',
                      'wifi',
                      'cleaning',
                      'furniture',
                      'appliances',
                      'food',
                      'security',
                      'hygiene',
                      'noise',
                      'water',
                      'other',
                    ].map((t) => (
                      <option key={t} value={t} className="capitalize">
                        {t.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Urgency Priority</label>
                  <select
                    className="input capitalize"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                  >
                    <option value="low">Low (Cosmetic / Minor)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="high">High (Disruptive)</option>
                    <option value="critical">Critical (Safety Hazard)</option>
                  </select>
                </div>
              </div>

              {/* Optional Photos */}
              <div className="space-y-1.5">
                <label className="label">Photo Evidence (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    className="input text-xs flex-1"
                    value={form.photoUrlInput}
                    onChange={(e) => setForm({ ...form, photoUrlInput: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="btn-secondary text-xs !py-1.5 !px-3 shrink-0"
                  >
                    + Add Link
                  </button>
                </div>
                {form.photoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {form.photoUrls.map((url, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-xs px-2.5 py-1 rounded-md"
                      >
                        <span className="truncate max-w-[150px]">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(i)}
                          className="text-rose-500 hover:text-rose-700 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 justify-end border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{submitting ? 'Submitting…' : 'Submit Smart Complaint'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Complaint Modal */}
      {reopenTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-sand-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Reopen Ticket</span>
              </h3>
              <button onClick={() => setReopenTargetId(null)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleReopenSubmit} className="space-y-3.5">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Please explain why this issue requires further repair or persists:
              </p>
              <textarea
                className="input min-h-[90px] text-xs"
                placeholder="e.g. Water is still leaking after technician visited..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setReopenTargetId(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={reopening} className="btn-primary !bg-rose-600 hover:!bg-rose-700">
                  {reopening ? 'Reopening…' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] card shadow-pop px-5 py-3 bg-slate-900 dark:bg-slate-800 text-white text-sm border-slate-800 dark:border-slate-700">
          {toast}
        </div>
      )}

      {/* Complaints List Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No complaints filed"
          description="Report any maintenance, plumbing, electrical, or Wi-Fi issues once you have an active stay."
          icon="🛡️"
        />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((c) => {
            const isResolved = c.status === 'resolved' || c.status === 'closed';
            const hasDueAt = c.dueAt || c.estimatedResolutionDate;
            const dueAtDate = hasDueAt ? new Date(hasDueAt) : null;
            const isCritical = c.priority === 'critical';

            return (
              <div
                key={c._id}
                id={`complaint-${c._id}`}
                className="p-5 transition-all duration-200 hover:bg-sand-50/50 dark:hover:bg-slate-900/30 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-2">
                      <Link to={`/pg/${(c.pgId as any)?._id || c.pgId}`} className="link hover:underline">
                        {(c.pgId as any)?.name || 'PG Accommodation'}
                      </Link>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="capitalize">{c.type.replace('_', ' ')}</span>

                      {/* Priority Badge */}
                      <span className={`badge text-[11px] px-2 py-0.5 rounded-md ${priorityBadge(c.priority)} capitalize`}>
                        {isCritical ? '🚨 Critical Hazard' : `${c.priority} Priority`}
                      </span>

                      {/* AI Classification Indicator */}
                      {c.intelligence && (
                        <span className="badge text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          <span>AI Triage</span>
                        </span>
                      )}

                      {c.intelligence?.reviewedByHuman && (
                        <span className="badge text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Staff Verified</span>
                        </span>
                      )}

                      {c.reopenCount && c.reopenCount > 0 ? (
                        <span className="badge text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                          Reopened x{c.reopenCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <span>Ticket #{c._id.toString().slice(-6).toUpperCase()}</span>
                      <span>·</span>
                      <span>Filed on {new Date(c.createdAt).toLocaleString()}</span>
                      {c.assignedTo && (
                        <>
                          <span>·</span>
                          <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> Assigned to: {c.assignedTo}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`badge capitalize text-xs ${statusColor(c.status)}`}>
                      {c.status.replace('_', ' ')}
                    </span>

                    {/* Student Action Buttons */}
                    {isResolved ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReopenTargetId(c._id);
                          setReopenReason('');
                        }}
                        className="btn-secondary text-xs !py-1 !px-2.5 flex items-center gap-1 hover:text-rose-600"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reopen Ticket</span>
                      </button>
                    ) : c.status === 'in_progress' ? (
                      <button
                        type="button"
                        onClick={() => handleConfirmResolved(c._id)}
                        className="btn-secondary text-xs !py-1 !px-2.5 flex items-center gap-1 hover:text-emerald-600"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Confirm Resolved</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-sand-200 dark:border-slate-800">
                  {c.description}
                </p>

                {/* AI Triage Suggested Next Step */}
                {c.intelligence?.suggestedAction && (
                  <div className="text-xs p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-indigo-950 dark:text-indigo-100">Next Step: </strong>
                      {c.intelligence.suggestedAction}
                    </div>
                  </div>
                )}

                {/* Resolution SLA Target Banner */}
                {dueAtDate && !isResolved && (
                  <div className="text-xs p-2.5 rounded-lg bg-sand-50 dark:bg-slate-900/70 border border-sand-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>
                        Target Resolution SLA: <strong>{dueAtDate.toLocaleString()}</strong> ({c.estimatedResolutionHours || 48}h target)
                      </span>
                    </span>
                    {c.ratingDeducted && (
                      <span className="badge bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold text-[10px]">
                        Overdue Rating Penalty Deducted
                      </span>
                    )}
                  </div>
                )}

                {/* Resolved Banner */}
                {isResolved && c.resolvedAt && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Resolved on {new Date(c.resolvedAt).toLocaleString()}</span>
                    </span>
                  </div>
                )}

                {/* Response Log */}
                {c.responses && c.responses.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Activity & Resolution Notes
                    </span>
                    {c.responses.map((resp, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                          <span className="font-semibold capitalize text-slate-700 dark:text-slate-200">{resp.role}</span>
                          <span>{new Date(resp.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{resp.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
