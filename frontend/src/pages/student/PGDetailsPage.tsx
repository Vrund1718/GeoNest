import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import api from '../../lib/api';
import { Amenity, Complaint, Image, NearbyPlace, PGListing, Review } from '../../types';
import { RatingStars, PageHeader } from '../../components/shared';
import { useAuth } from '../../context/AuthContext';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="background:#2C3A63;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">🏠</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export const PGDetailsPage: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [pg, setPg] = useState<PGListing | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [nearby, setNearby] = useState<Record<string, NearbyPlace[]>>({});
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookDates, setBookDates] = useState({ start: '', end: '' });
  const [booking, setBooking] = useState(false);
  const [wishlisting, setWishlisting] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaint, setComplaint] = useState({ type: 'other' as any, description: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/pg/${id}`);
      setPg(data.pg);
      setImages(data.images || []);
      setReviews(data.reviews || []);
      setAvgRating(data.averageRating);
      setNearby(data.nearbyPlaces || {});
    } catch (e: any) { showToast(e.response?.data?.error || 'Failed to load'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id || !user) return;
    api.get('/wishlist/me').then((r) => {
      const match = (r.data.wishlist || []).find((w: any) => w.pgId?._id === id);
      setWishlisted(!!match);
    }).catch(() => {});
  }, [id, user]);

  const book = async () => {
    if (!id || !bookDates.start || !bookDates.end) return showToast('Please select dates');
    setBooking(true);
    try {
      await api.post(`/pg/${id}/book`, { startDate: bookDates.start, endDate: bookDates.end });
      showToast('Booking request sent!');
      nav('/student/bookings');
    } catch (e: any) { showToast(e.response?.data?.error || 'Booking failed'); }
    setBooking(false);
  };

  const toggleWishlist = async () => {
    if (!id) return;
    setWishlisting(true);
    try {
      const { data } = await api.post(`/pg/${id}/wishlist`);
      setWishlisted(!!data.wishlisted);
      showToast(data.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (e: any) { showToast(e.response?.data?.error || 'Failed'); }
    setWishlisting(false);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reviewForm.text.trim()) return showToast('Write a review');
    try {
      const { data } = await api.post(`/pg/${id}/reviews`, reviewForm);
      setReviews((r) => [data.review, ...r]);
      setReviewForm({ rating: 5, text: '' });
      showToast('Review added');
    } catch (e: any) { showToast(e.response?.data?.error || 'Failed'); }
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || complaint.description.trim().length < 10) return showToast('Describe the issue (min 10 chars)');
    try {
      await api.post(`/pg/${id}/complaints`, complaint);
      setComplaint({ type: 'other', description: '' });
      setComplaintOpen(false);
      showToast('Complaint filed');
    } catch (e: any) { showToast(e.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-12 h-12 border-4 border-marigold-500 border-t-transparent rounded-full" /></div>;
  if (!pg) return <div className="card p-10 text-center text-ink/55">PG not found.</div>;

  const [lng, lat] = pg.location.coordinates;
  const placeTypes = Object.keys(nearby);

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => nav(-1)} className="btn-ghost mb-4 !px-0">← Back</button>

      <div className="card overflow-hidden mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
          <div className="lg:col-span-2 aspect-[4/3] lg:aspect-auto bg-sand-100 overflow-hidden">
            {images[activeImg]?.url ? (
              <img src={images[activeImg].url} alt={pg.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl text-ink/20">🏠</div>
            )}
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-2 gap-1 p-1">
            {images.slice(0, 6).map((img, i) => (
              <button key={img._id} onClick={() => setActiveImg(i)} className={`aspect-square overflow-hidden rounded-md ${activeImg === i ? 'ring-2 ring-marigold-500' : ''}`}>
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PageHeader
            title={pg.name}
            subtitle={`${pg.address}, ${pg.city}${pg.collegeName ? ` · near ${pg.collegeName}` : ''}`}
            actions={
              <div className="flex gap-2 flex-wrap">
                <button onClick={toggleWishlist} disabled={wishlisting} className="btn-secondary">
                  {wishlisted ? '⭐ Wishlisted' : '☆ Add to Wishlist'}
                </button>
                <button onClick={() => setComplaintOpen(true)} className="btn-secondary">⚠️ File Complaint</button>
              </div>
            }
          />

          <div className="card p-5">
            <h3 className="font-semibold mb-3">About this PG</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <Stat label="Monthly rent" value={`₹${pg.pricePerMonth.toLocaleString()}`} />
              <Stat label="Security deposit" value={`₹${pg.securityDeposit.toLocaleString()}`} />
              <Stat label="Availability" value={`${pg.availableRooms} / ${pg.totalRooms}`} />
              <Stat label="For" value={pg.genderPreference === 'male' ? 'Boys' : pg.genderPreference === 'female' ? 'Girls' : 'All'} />
            </div>
            <div className="flex items-center gap-4">
              <RatingStars rating={avgRating} size="md" />
              <span className="text-sm text-ink/55">{reviews.length} reviews</span>
              {pg.isVerified && <span className="badge bg-sage/10 text-sage">✓ Verified</span>}
              {pg.collegeName && <span className="badge bg-indigo-50 text-indigo-700">🎓 {pg.collegeName}</span>}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-4">Amenities ({pg.amenities?.length || 0})</h3>
            {pg.amenities?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pg.amenities.map((a: Amenity | string) => {
                  const name = typeof a === 'string' ? a : a.name;
                  const cat = typeof a === 'string' ? 'other' : (a.category || 'other');
                  const emoji = ({
                    common: '🏘️', room: '🛏️', kitchen: '🍳', washroom: '🚿', security: '🛡️', other: '✨',
                  } as any)[cat] || '✨';
                  return (
                    <div key={name} className="flex items-center gap-2 p-3 rounded-lg bg-sand-50 border border-ink/15">
                      <span className="text-xl">{emoji}</span>
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                  );
                })}
              </div>
            ) : <div className="text-sm text-ink/55">No amenities listed.</div>}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-4">Location</h3>
            <div className="h-72 rounded-lg overflow-hidden border border-ink/15">
              <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[lat, lng]} icon={pinIcon} />
              </MapContainer>
            </div>
          </div>

          {placeTypes.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Nearby places</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placeTypes.map((pt) => nearby[pt]?.length > 0 && (
                  <div key={pt}>
                    <h4 className="text-sm font-semibold capitalize text-ink-700 mb-2 flex items-center gap-2">
                      {({ hospital: '🏥', atm: '🏧', gym: '💪', restaurant: '🍽️', medical_store: '💊', bus_stop: '🚌', metro_station: '🚇', police: '🚓' } as any)[pt] || '📍'}
                      {' '}{pt.replace('_', ' ')}
                    </h4>
                    <ul className="space-y-2">
                      {nearby[pt].slice(0, 3).map((np: NearbyPlace) => (
                        <li key={np._id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-sand-50">
                          <span>{np.name}</span>
                          <span className="badge bg-sand-50 text-ink-600">{np.distanceMeters < 1000 ? `${np.distanceMeters} m` : `${(np.distanceMeters / 1000).toFixed(1)} km`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Reviews ({reviews.length})</h3>
              {avgRating != null && <div className="text-lg font-bold text-marigold-600">{avgRating.toFixed(1)} / 5</div>}
            </div>

            {user?.role === 'student' && (
              <form onSubmit={submitReview} className="mb-6 p-4 rounded-lg bg-sand-50 border border-ink/15 space-y-3">
                <h4 className="font-medium">Write a review</h4>
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: s })} className={`text-2xl ${reviewForm.rating >= s ? 'text-marigold-500' : 'text-ink/15'}`}>★</button>
                  ))}
                  <span className="text-sm text-ink/55 ml-2">{reviewForm.rating}/5</span>
                </div>
                <textarea className="input min-h-[80px]" placeholder="Share your experience..." value={reviewForm.text} onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })} />
                <button type="submit" className="btn-primary text-sm">Submit review</button>
              </form>
            )}

            {reviews.length === 0 ? (
              <div className="text-sm text-ink/55 text-center py-6">Be the first to review this PG.</div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r._id} className="border-b border-ink/10 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs">
                          {(r.userId as any).name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{(r.userId as any).name}</div>
                          <div className="text-xs text-ink/40">{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <RatingStars rating={r.rating} />
                    </div>
                    <p className="text-sm text-ink-600 mt-2">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5 sticky top-24">
            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-indigo-700">₹{pg.pricePerMonth.toLocaleString()}</span>
                <span className="text-ink/55 text-sm">/month</span>
              </div>
              <div className="text-xs text-ink/55 mt-0.5">+ ₹{pg.securityDeposit.toLocaleString()} security deposit (refundable)</div>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="label">Move-in date</label>
                <input type="date" className="input" value={bookDates.start} onChange={(e) => setBookDates({ ...bookDates, start: e.target.value })} />
              </div>
              <div>
                <label className="label">Move-out date</label>
                <input type="date" className="input" value={bookDates.end} onChange={(e) => setBookDates({ ...bookDates, end: e.target.value })} />
              </div>
            </div>
            <button onClick={book} disabled={booking || pg.availableRooms <= 0} className="btn-primary w-full py-3">
              {booking ? 'Requesting...' : pg.availableRooms <= 0 ? 'No rooms available' : 'Request to book'}
            </button>
            <p className="text-[11px] text-ink/55 mt-2 text-center">You won't be charged yet. Owner will confirm your request.</p>
            <div className="separator" />
            <div className="space-y-2 text-xs text-ink/55">
              <p>✓ Free cancellation up to 48 hours before move-in</p>
              <p>✓ Verified listing, secure payments</p>
              <p>✓ 24/7 support</p>
            </div>
          </div>
        </div>
      </div>

      {complaintOpen && (
        <div className="fixed inset-0 z-50 bg-ink-700/60 flex items-center justify-center p-4" onClick={() => setComplaintOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-2">File a complaint</h3>
            <p className="text-sm text-ink/55 mb-4">Let us know about an issue with this PG.</p>
            <form onSubmit={submitComplaint} className="space-y-4">
              <div>
                <label className="label">Type</label>
                <select className="input" value={complaint.type} onChange={(e) => setComplaint({ ...complaint, type: e.target.value })}>
                  {['hygiene', 'noise', 'safety', 'staff', 'amenity', 'other'].map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[100px]" value={complaint.description} onChange={(e) => setComplaint({ ...complaint, description: e.target.value })} placeholder="Explain the issue in detail..." />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setComplaintOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] card shadow-pop px-5 py-3 bg-ink-700 text-white text-sm border-ink-700">{toast}</div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="text-xs text-ink/55">{label}</div>
    <div className="text-base font-semibold mt-0.5">{value}</div>
  </div>
);
