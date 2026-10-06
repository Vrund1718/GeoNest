import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { CancellationPreview, Booking } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

const statusBadge = (s: Booking['status']) =>
  s === 'requested' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' :
  s === 'confirmed' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
  s === 'completed' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' :
  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelPreview, setCancelPreview] = useState<CancellationPreview | null>(null);
  const [cancelAgreed, setCancelAgreed] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/bookings/me');
      setBookings(data.bookings || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && window.location.hash) {
      const id = window.location.hash.substring(1);
      const el = document.getElementById(`booking-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2'), 3000);
      }
    }
  }, [loading]);

  const initiateCancel = async (id: string) => {
    try {
      const { data } = await api.get(`/bookings/${id}/cancellation-preview`);
      setCancelPreview(data.preview);
      setCancelAgreed(false);
    } catch {
      alert('Failed to calculate cancellation charges.');
    }
  };

  const confirmCancel = async () => {
    if (!cancelPreview || !cancelAgreed) return;
    setCancelling(true);
    try {
      await api.put(`/bookings/${cancelPreview.bookingId}/status`, { status: 'cancelled' });
      setCancelPreview(null);
      load();
    } catch {
      alert('Failed to cancel booking.');
    }
    setCancelling(false);
  };

  return (
    <div>
      <PageHeader title="My Bookings" subtitle="Track and manage your accommodation bookings." />
      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings yet" description="Browse PGs and submit a booking request to get started." icon="📅" action={<Link to="/student/search" className="btn-primary">Find a PG</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-sand-50/60 dark:bg-slate-900/50"><tr>
                <th className="table-header">PG</th>
                <th className="table-header">Status</th>
                <th className="table-header">Check-in</th>
                <th className="table-header">Check-out</th>
                <th className="table-header">Booked on</th>
                <th className="table-header text-right">Actions</th>
              </tr></thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/60">
                {bookings.map((b) => {
                  const pg = b.pgId as any;
                  return (
                    <tr key={b._id} id={`booking-${b._id}`} className="hover:bg-sand-50 dark:hover:bg-slate-700/50 transition-all duration-300">
                      <td className="table-cell">
                        <Link to={`/pg/${pg?._id || b.pgId}`} className="flex items-center gap-3 hover:text-indigo-600 dark:hover:text-indigo-400">
                          {pg?.primaryImage && <img src={pg.primaryImage} className="w-10 h-10 rounded-md object-cover bg-slate-100 dark:bg-slate-700" />}
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">{pg?.name || 'PG'}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{pg?.city}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${statusBadge(b.status)} capitalize`}>{b.status.replace('_', ' ')}</span>
                        {b.cancellationDetails && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">
                            Refund: ₹{b.cancellationDetails.netRefundAmount.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">{new Date(b.startDate).toLocaleDateString()}</td>
                      <td className="table-cell">{new Date(b.endDate).toLocaleDateString()}</td>
                      <td className="table-cell text-xs text-slate-500 dark:text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                      <td className="table-cell text-right">
                        {(b.status === 'requested' || b.status === 'confirmed') && (
                          <button onClick={() => initiateCancel(b._id)} className="btn-secondary text-xs !py-1 !px-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 hover:border-rose-200 dark:hover:border-rose-800">
                            Cancel Booking
                          </button>
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

      {/* Cancellation Summary Modal */}
      {cancelPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-sand-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink-800 dark:text-slate-100">Booking Cancellation Breakdown</h3>
                <p className="text-xs text-ink/55 dark:text-slate-400">{cancelPreview.pgName}</p>
              </div>
              <button onClick={() => setCancelPreview(null)} className="text-ink/40 dark:text-slate-400 hover:text-ink dark:hover:text-slate-100 text-xl">✕</button>
            </div>

            <div className="space-y-3 bg-sand-50 dark:bg-slate-900/60 p-4 rounded-xl text-sm border border-sand-200 dark:border-slate-700">
              <div className="flex justify-between text-xs text-ink/60 dark:text-slate-400">
                <span>Stay Dates:</span>
                <span>{new Date(cancelPreview.startDate).toLocaleDateString()} – {new Date(cancelPreview.endDate).toLocaleDateString()} ({cancelPreview.totalDays} days)</span>
              </div>
              <div className="flex justify-between text-xs text-ink/60 dark:text-slate-400">
                <span>Days Utilized (to today):</span>
                <span className="font-semibold text-ink-800 dark:text-slate-200">{cancelPreview.daysUtilized} days</span>
              </div>
              <div className="flex justify-between text-xs text-ink/60 dark:text-slate-400">
                <span>Daily Rent Rate:</span>
                <span>₹{cancelPreview.dailyRate} / day</span>
              </div>

              <div className="separator my-2" />

              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Total Booking Paid / Rent:</span>
                <span>₹{cancelPreview.totalPaid.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-rose-700 dark:text-rose-400">
                <span>Usage Charge ({cancelPreview.daysUtilized} days):</span>
                <span>- ₹{cancelPreview.usageCharge.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-rose-700 dark:text-rose-400">
                <span>Cancellation Policy Fee (10%):</span>
                <span>- ₹{cancelPreview.cancellationCharge.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>Security Deposit Refund:</span>
                <span>+ ₹{cancelPreview.securityDepositRefund.toLocaleString()}</span>
              </div>

              <div className="separator my-2" />

              <div className="flex justify-between items-center text-base font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-slate-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                <span>Eligible Refund Amount:</span>
                <span className="text-xl text-emerald-600 dark:text-emerald-400">₹{cancelPreview.netRefundAmount.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs italic bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
              ℹ️ {cancelPreview.policyNote}
            </p>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium">
              <input 
                type="checkbox" 
                checked={cancelAgreed} 
                onChange={(e) => setCancelAgreed(e.target.checked)} 
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>I have reviewed the cancellation charges breakdown and confirm that I wish to proceed with cancelling this stay booking.</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setCancelPreview(null)} className="btn-secondary flex-1">
                Keep My Booking
              </button>
              <button 
                onClick={confirmCancel} 
                disabled={!cancelAgreed || cancelling} 
                className="btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Finalizing Cancellation...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
