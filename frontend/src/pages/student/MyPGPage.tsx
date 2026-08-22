import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Booking, Payment, Complaint, PGListing } from '../../types';
import { EmptyState, PageHeader, RatingStars } from '../../components/shared';
import { useAuth } from '../../context/AuthContext';

export const MyPGPage: React.FC = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modals
  const [showRenew, setShowRenew] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showComplaint, setShowComplaint] = useState(false);

  // Form states
  const [renewDates, setRenewDates] = useState({ start: '', end: '' });
  const [complaintForm, setComplaintForm] = useState({
    type: 'other',
    description: '',
    priority: 'medium',
    photoUrls: [] as string[]
  });

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resMyPg, resComplaints] = await Promise.all([
        api.get('/my-pg'),
        api.get('/complaints/me')
      ]);
      
      const allBookings = resMyPg.data.bookings || [];
      setBookings(allBookings);
      setPayments(resMyPg.data.payments || []);
      setComplaints(resComplaints.data.complaints || []);
      
      // Default to the first active/confirmed booking
      const active = allBookings.find((b: Booking) => b.status === 'confirmed') || allBookings[0];
      setActiveBooking(active || null);
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to load data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    try {
      await api.post(`/bookings/${activeBooking._id}/renew`, renewDates);
      showToast('Renewal request sent to owner!');
      setShowRenew(false);
      loadData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Renewal failed');
    }
  };

  const handlePayment = async (amount: number) => {
    if (!activeBooking) return;
    try {
      await api.post(`/bookings/${activeBooking._id}/pay`, { amount, paymentMethod: 'Card (Mock)' });
      showToast('Payment successful!');
      setShowPay(false);
      loadData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Payment failed');
    }
  };

  const handleComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    if (complaintForm.description.length < 10) return showToast('Description too short');
    
    try {
      await api.post('/complaints', {
        pgId: (activeBooking.pgId as PGListing)._id,
        ...complaintForm
      });
      showToast('Complaint raised successfully!');
      setShowComplaint(false);
      setComplaintForm({ type: 'other', description: '', priority: 'medium', photoUrls: [] });
      loadData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to raise complaint');
    }
  };

  if (loading) return <div className="p-10 text-center text-ink/55">Loading your services...</div>;

  if (bookings.length === 0) {
    return (
      <EmptyState 
        title="No active PG booking yet" 
        description="Once you book a PG and it's confirmed, you'll see your services here." 
        icon="🏢"
        action={<Link to="/student/search" className="btn-primary">Browse PGs</Link>}
      />
    );
  }

  const pg = activeBooking?.pgId as PGListing;
  const owner = pg?.ownerId as any;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My PG Services" 
        subtitle="Manage your stay, payments, and support." 
        actions={
          bookings.length > 1 && (
            <select 
              className="input text-sm" 
              value={activeBooking?._id} 
              onChange={(e) => setActiveBooking(bookings.find(b => b._id === e.target.value) || null)}
            >
              {bookings.map(b => (
                <option key={b._id} value={b._id}>{(b.pgId as PGListing).name} ({b.status})</option>
              ))}
            </select>
          )
        }
      />

      {/* Overview Card */}
      <div className="card overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 aspect-video md:aspect-auto bg-sand-100 overflow-hidden">
            {pg.primaryImage ? (
              <img src={pg.primaryImage} alt={pg.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink/20 text-5xl">🏠</div>
            )}
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-ink-700">{pg.name}</h2>
                <span className={`badge ${activeBooking?.status === 'confirmed' ? 'bg-sage/10 text-sage' : 'bg-sand-200 text-ink/50'}`}>
                  {activeBooking?.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-ink/55 flex items-center gap-1 mb-4">
                <span>📍</span> {pg.address}, {pg.city}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-sand-200">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink/40 font-bold">Stay Dates</div>
                  <div className="text-sm font-medium">{new Date(activeBooking!.startDate).toLocaleDateString()} - {new Date(activeBooking!.endDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink/40 font-bold">Monthly Rent</div>
                  <div className="text-sm font-bold text-indigo-700">₹{pg.pricePerMonth.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink/40 font-bold">Room Type</div>
                  <div className="text-sm font-medium capitalize">{pg.genderPreference} Sharing</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink/40 font-bold">Owner Contact</div>
                  <div className="text-sm font-medium">{owner?.userId?.phone || 'Not available'}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => setShowPay(true)} className="btn-primary flex-1">Pay Rent / Dues</button>
              <button onClick={() => setShowRenew(true)} className="btn-secondary flex-1">Renew / Extend Stay</button>
              <button onClick={() => setShowComplaint(true)} className="btn-secondary flex-1">Raise Complaint</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment History */}
        <div className="card p-6">
          <h3 className="font-semibold text-ink-700 mb-4 flex items-center gap-2">
            <span>💳</span> Payment History
          </h3>
          {payments.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink/40 bg-sand-50 rounded-xl">No payments found yet.</div>
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p._id} className="flex items-center justify-between p-3 bg-sand-50 rounded-xl border border-sand-200">
                  <div>
                    <div className="text-sm font-bold">₹{p.amount.toLocaleString()}</div>
                    <div className="text-[10px] text-ink/40">{new Date(p.createdAt).toLocaleString()} · {p.paymentMethod}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${p.status === 'success' ? 'bg-sage/10 text-sage' : 'bg-coral/10 text-coral'}`}>
                      {p.status}
                    </span>
                    {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs">Receipt</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support & Complaints */}
        <div className="card p-6">
          <h3 className="font-semibold text-ink-700 mb-4 flex items-center gap-2">
            <span>⚠️</span> Recent Complaints
          </h3>
          {complaints.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink/40 bg-sand-50 rounded-xl">No complaints filed.</div>
          ) : (
            <div className="space-y-3">
              {complaints.slice(0, 5).map(c => (
                <div key={c._id} className="p-3 bg-sand-50 rounded-xl border border-sand-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold capitalize text-indigo-700">{c.type.replace('_', ' ')}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${c.status === 'resolved' ? 'bg-sage/10 text-sage' : 'bg-amber-100 text-amber-700'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-ink/60 line-clamp-1">{c.description}</p>
                  <div className="text-[9px] text-ink/30 mt-1">{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
              <Link to="/student/complaints" className="block text-center text-xs text-indigo-600 hover:underline mt-4">View all complaints</Link>
            </div>
          )}
        </div>
      </div>

      {/* Renew Modal */}
      {showRenew && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-ink-700 mb-4">Extend Your Stay</h3>
            <form onSubmit={handleRenew} className="space-y-4">
              <div>
                <label className="label">Extension Start Date</label>
                <input 
                  type="date" 
                  required 
                  className="input" 
                  value={renewDates.start} 
                  onChange={e => setRenewDates(d => ({ ...d, start: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Extension End Date</label>
                <input 
                  type="date" 
                  required 
                  className="input" 
                  value={renewDates.end} 
                  onChange={e => setRenewDates(d => ({ ...d, end: e.target.value }))}
                />
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl">
                <p className="text-sm text-indigo-700">Rent will be charged at <b>₹{pg.pricePerMonth.toLocaleString()}/month</b>. The owner will review and approve your request.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRenew(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPay && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-ink-700 mb-4">Pay Your Rent</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-sand-50 rounded-xl">
                <span className="text-sm text-ink/60">Current Dues</span>
                <span className="text-2xl font-bold text-ink-700">₹{pg.pricePerMonth.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <label className="label text-xs">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 border-2 border-indigo-600 bg-indigo-50 rounded-xl text-sm font-semibold">Credit/Debit Card</button>
                  <button className="p-3 border-2 border-sand-200 hover:border-sand-300 rounded-xl text-sm font-semibold">UPI / Net Banking</button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPay(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => handlePayment(pg.pricePerMonth)} className="btn-primary flex-1">Pay Now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {showComplaint && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-ink-700 mb-4">File a Complaint</h3>
            <form onSubmit={handleComplaint} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select 
                    required 
                    className="input"
                    value={complaintForm.type}
                    onChange={e => setComplaintForm(f => ({ ...f, type: e.target.value as any }))}
                  >
                    <option value="electrician">Electrician</option>
                    <option value="plumber">Plumber</option>
                    <option value="hygiene">Cleanliness / Housekeeping</option>
                    <option value="wifi">Wi-Fi / Internet</option>
                    <option value="furniture">Furniture / Fittings</option>
                    <option value="pest_control">Pest Control</option>
                    <option value="water">Water Supply</option>
                    <option value="security">Security / Safety</option>
                    <option value="noise">Noise Disturbance</option>
                    <option value="food">Food / Mess</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select 
                    required 
                    className="input"
                    value={complaintForm.priority}
                    onChange={e => setComplaintForm(f => ({ ...f, priority: e.target.value as any }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Describe the issue</label>
                <textarea 
                  required 
                  rows={4} 
                  className="input" 
                  placeholder="Tell us what's wrong (min 10 characters)..."
                  value={complaintForm.description}
                  onChange={e => setComplaintForm(f => ({ ...f, description: e.target.value }))}
                ></textarea>
              </div>
              <div>
                <label className="label">Photos (Optional)</label>
                <div className="flex gap-2">
                  <div className="w-16 h-16 border-2 border-dashed border-sand-300 rounded-xl flex items-center justify-center text-ink/20 cursor-pointer hover:border-indigo-400 hover:text-indigo-400 transition-colors">
                    <span>+</span>
                  </div>
                </div>
                <p className="text-[10px] text-ink/30 mt-1">Maximum 3 photos, up to 5MB each.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowComplaint(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] card shadow-pop px-5 py-3 bg-ink-700 text-white text-sm border-ink-700 animate-in slide-in-from-bottom-5 duration-300">
          {toast}
        </div>
      )}
    </div>
  );
};
