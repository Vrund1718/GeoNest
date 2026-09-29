import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import api from '../../lib/api';
import { Amenity, Image, NearbyPlace, PGListing, Review } from '../../types';
import { RatingStars, PageHeader, SkeletonDetail } from '../../components/shared';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Share2, Copy, MessageCircle, Star, AlertCircle, Check, MapPin, Calendar, Heart, ShieldCheck } from 'lucide-react';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="background:#4f46e5;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">🏠</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export const PGDetailsPage: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
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
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaint, setComplaint] = useState({ type: 'other' as any, description: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [bookedRanges, setBookedRanges] = useState<{ startDate: string; endDate: string; status: string }[]>([]);
  const [overlapSuggestion, setOverlapSuggestion] = useState<{ message: string; suggestedRange?: { start: string; end: string } } | null>(null);
  const [restrictedComplaintModal, setRestrictedComplaintModal] = useState(false);
  const [indiaGeoJson, setIndiaGeoJson] = useState<any>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/AbhinavSwami28/india-official-geojson/main/india-states-simplified.geojson')
      .then(res => res.json())
      .then(data => setIndiaGeoJson(data))
      .catch(() => {});
  }, []);

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

      api.get(`/pg/${id}/booked-dates`).then((res) => {
        setBookedRanges(res.data.bookings || []);
      }).catch(() => {});
    } catch (e: any) { 
      const errorMsg = e.response?.data?.error || 'Failed to load PG details';
      toast.error(errorMsg);
      if (e.response?.status === 404) {
        setTimeout(() => nav(user?.role === 'owner' ? '/owner' : '/student/search'), 1500);
      }
    }
    setLoading(false);
  }, [id, nav, user?.role]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id || !user) return;
    api.get('/wishlist/me').then((r) => {
      const match = (r.data.wishlist || []).find((w: any) => w.pgId?._id === id);
      setWishlisted(!!match);
    }).catch(() => {});

    if (user.role === 'student') {
      api.get('/active-bookings').then((r) => {
        const activeForThisPg = (r.data.bookings || []).some((b: any) => b.pgId?._id === id || b.pgId === id);
        setHasActiveBooking(activeForThisPg);
      }).catch(() => {});
    }
  }, [id, user]);

  const book = async () => {
    if (!user) {
      nav('/login', { state: { from: `/pg/${id}` } });
      return;
    }
    if (!id || !bookDates.start || !bookDates.end) {
      toast.error('Please select move-in and move-out dates');
      return;
    }
    setBooking(true);
    setOverlapSuggestion(null);
    try {
      await api.post(`/pg/${id}/book`, { startDate: bookDates.start, endDate: bookDates.end });
      toast.success('Booking request sent successfully!');
      nav('/student/bookings');
    } catch (e: any) {
      if (e.response?.data?.isOverlapping) {
        setOverlapSuggestion({
          message: e.response.data.error,
          suggestedRange: e.response.data.suggestedRange
        });
        toast.error('Dates overlap with existing booking!');
      } else {
        toast.error(e.response?.data?.error || 'Booking request failed');
      }
    }
    setBooking(false);
  };

  const handleOpenComplaint = () => {
    if (!user) {
      nav('/login', { state: { from: `/pg/${id}` } });
      return;
    }
    if (user?.role === 'student' && !hasActiveBooking) {
      setRestrictedComplaintModal(true);
    } else {
      setComplaintOpen(true);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      nav('/login', { state: { from: `/pg/${id}` } });
      return;
    }
    if (!id) return;
    setWishlisting(true);
    try {
      const { data } = await api.post(`/pg/${id}/wishlist`);
      setWishlisted(!!data.wishlisted);
      if (data.wishlisted) {
        toast.success('Added to your wishlist! ⭐');
      } else {
        toast.success('Removed from wishlist');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to update wishlist');
    }
    setWishlisting(false);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const openWhatsAppShare = () => {
    const text = `Check out ${pg?.name || 'this PG'} on GeoNest: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reviewForm.text.trim()) {
      toast.error('Please write a review comment');
      return;
    }
    try {
      const { data } = await api.post(`/pg/${id}/reviews`, reviewForm);
      setReviews((r) => [data.review, ...r]);
      setReviewForm({ rating: 5, text: '' });
      toast.success('Thank you for your review!');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to submit review');
    }
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || complaint.description.trim().length < 10) {
      toast.error('Please describe the issue (min 10 characters)');
      return;
    }
    try {
      await api.post(`/pg/${id}/complaints`, complaint);
      setComplaint({ type: 'other', description: '' });
      setComplaintOpen(false);
      toast.success('Complaint submitted successfully');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to submit complaint');
    }
  };

  if (loading) return <SkeletonDetail />;
  if (!pg) return <div className="card p-10 text-center text-ink/55 dark:text-slate-400">PG not found.</div>;

  const [lng, lat] = pg.location.coordinates;
  const placeTypes = Object.keys(nearby);

  return (
    <div className="max-w-7xl mx-auto">
      <Helmet>
        <title>{`${pg.name} — GeoNest`}</title>
        <meta name="description" content={`Book ${pg.name} in ${pg.city}. Rent: ₹${pg.pricePerMonth}/mo. ${pg.address}`} />
        <meta property="og:title" content={`${pg.name} — GeoNest PG Accommodation`} />
        <meta property="og:description" content={`Explore verified PG rooms near ${pg.collegeName || pg.city}`} />
        {pg.primaryImage && <meta property="og:image" content={pg.primaryImage} />}
      </Helmet>

      <button onClick={() => nav(-1)} className="btn-ghost mb-4 !px-0 flex items-center gap-1 text-sm font-medium">
        ← Back to search
      </button>

      {/* Hero Image Gallery */}
      <div className="card overflow-hidden mb-6 border dark:border-slate-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
          <div className="lg:col-span-2 aspect-[16/10] sm:aspect-[4/3] bg-sand-100 dark:bg-slate-700 overflow-hidden">
            {images[activeImg]?.url ? (
              <img src={images[activeImg].url} alt={pg.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl sm:text-8xl text-ink/20 dark:text-slate-500">🏠</div>
            )}
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-2 gap-1 p-1 bg-sand-50 dark:bg-slate-900">
            {images.slice(0, 6).map((img, i) => (
              <button
                key={img._id}
                onClick={() => setActiveImg(i)}
                className={`aspect-square overflow-hidden rounded-xl transition ${activeImg === i ? 'ring-2 ring-indigo-600 dark:ring-indigo-400' : 'opacity-80 hover:opacity-100'}`}
              >
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
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={toggleWishlist}
                  disabled={wishlisting}
                  className={`btn-secondary text-xs sm:text-sm py-2 px-3 flex items-center gap-1.5 ${
                    wishlisted ? 'border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' : ''
                  }`}
                >
                  <Star className={`w-4 h-4 ${wishlisted ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span>{wishlisted ? 'Wishlisted' : 'Wishlist'}</span>
                </button>

                <button
                  type="button"
                  onClick={copyShareLink}
                  className="btn-secondary text-xs sm:text-sm py-2 px-3 flex items-center gap-1.5"
                  title="Copy Link"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy Link</span>
                </button>

                <button
                  type="button"
                  onClick={openWhatsAppShare}
                  className="btn-secondary text-xs sm:text-sm py-2 px-3 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenComplaint}
                  className="btn-secondary text-xs sm:text-sm py-2 px-3 text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Report</span>
                </button>
              </div>
            }
          />

          <div className="card p-4 sm:p-6 border dark:border-slate-700">
            <h3 className="font-semibold text-base sm:text-lg text-ink-700 dark:text-slate-100 mb-3">About this PG</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <Stat label="Monthly rent" value={`₹${pg.pricePerMonth.toLocaleString()}`} />
              <Stat label="Security deposit" value={`₹${pg.securityDeposit.toLocaleString()}`} />
              <Stat label="Availability" value={`${pg.availableRooms} / ${pg.totalRooms} rooms`} />
              <Stat label="Gender" value={pg.genderPreference === 'male' ? 'Boys' : pg.genderPreference === 'female' ? 'Girls' : 'All'} />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <RatingStars rating={avgRating} size="md" />
              <span className="text-xs sm:text-sm text-ink/55 dark:text-slate-400">({reviews.length} reviews)</span>
              {pg.isVerified && (
                <span className="badge bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Verified
                </span>
              )}
              {pg.collegeName && (
                <span className="badge bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  🎓 {pg.collegeName}
                </span>
              )}
            </div>
          </div>

          <div className="card p-4 sm:p-6 border dark:border-slate-700">
            <h3 className="font-semibold text-base sm:text-lg text-ink-700 dark:text-slate-100 mb-4">Amenities ({pg.amenities?.length || 0})</h3>
            {pg.amenities?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {pg.amenities.map((a: Amenity | string) => {
                  const name = typeof a === 'string' ? a : a.name;
                  const cat = typeof a === 'string' ? 'other' : (a.category || 'other');
                  const emoji = ({
                    common: '🏘️', room: '🛏️', kitchen: '🍳', washroom: 'Shower', security: '🛡️', other: '✨',
                  } as any)[cat] || '✨';
                  return (
                    <div key={name} className="flex items-center gap-2.5 p-3 rounded-xl bg-sand-50 dark:bg-slate-700/50 border border-ink/10 dark:border-slate-700">
                      <span className="text-lg">{emoji}</span>
                      <span className="text-xs sm:text-sm font-medium text-ink-700 dark:text-slate-200">{name}</span>
                    </div>
                  );
                })}
              </div>
            ) : <div className="text-sm text-ink/55 dark:text-slate-400">No amenities listed.</div>}
          </div>

          <div className="card p-4 sm:p-6 border dark:border-slate-700">
            <h3 className="font-semibold text-base sm:text-lg text-ink-700 dark:text-slate-100 mb-4">Location</h3>
            <div className="h-64 sm:h-72 rounded-2xl overflow-hidden border border-ink/10 dark:border-slate-700">
              <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
                <TileLayer
                  key={theme}
                  attribution={
                    theme === 'dark'
                      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  }
                  url={
                    theme === 'dark'
                      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  }
                />
                {indiaGeoJson && (
                  <GeoJSON 
                    data={indiaGeoJson} 
                    style={{ color: '#475569', weight: 1.5, fillOpacity: 0, dashArray: '3' }}
                    interactive={false}
                  />
                )}
                <Marker position={[lat, lng]} icon={pinIcon} />
              </MapContainer>
            </div>
          </div>

          {placeTypes.length > 0 && (
            <div className="card p-4 sm:p-6 border dark:border-slate-700">
              <h3 className="font-semibold text-base sm:text-lg text-ink-700 dark:text-slate-100 mb-4">Nearby places</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placeTypes.map((pt) => nearby[pt]?.length > 0 && (
                  <div key={pt}>
                    <h4 className="text-xs sm:text-sm font-semibold capitalize text-ink-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                      {({ hospital: '🏥', atm: '🏧', gym: '💪', restaurant: '🍽️', medical_store: '💊', bus_stop: '🚌', metro_station: '🚇', police: '🚓' } as any)[pt] || '📍'}
                      {' '}{pt.replace('_', ' ')}
                    </h4>
                    <ul className="space-y-1.5">
                      {nearby[pt].slice(0, 3).map((np: NearbyPlace) => (
                        <li key={np._id} className="flex items-center justify-between text-xs sm:text-sm p-2 rounded-lg hover:bg-sand-50 dark:hover:bg-slate-700/50">
                          <span className="text-ink-700 dark:text-slate-300 truncate max-w-[200px]">{np.name}</span>
                          <span className="badge bg-sand-100 dark:bg-slate-700 text-ink-600 dark:text-slate-300 text-[11px] shrink-0">
                            {np.distanceMeters < 1000 ? `${np.distanceMeters} m` : `${(np.distanceMeters / 1000).toFixed(1)} km`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div className="card p-4 sm:p-6 border dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base sm:text-lg text-ink-700 dark:text-slate-100">Reviews ({reviews.length})</h3>
              {avgRating != null && <div className="text-base sm:text-lg font-bold text-amber-500">{avgRating.toFixed(1)} / 5</div>}
            </div>

            {user?.role === 'student' && (
              <form onSubmit={submitReview} className="mb-6 p-4 rounded-2xl bg-sand-50 dark:bg-slate-900 border border-ink/10 dark:border-slate-700 space-y-3">
                <h4 className="font-medium text-sm sm:text-base text-ink-700 dark:text-slate-200">Write a review</h4>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                      className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center"
                    >
                      <Star className={`w-6 h-6 ${reviewForm.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    </button>
                  ))}
                  <span className="text-sm text-ink/55 dark:text-slate-400 ml-2 font-semibold">{reviewForm.rating}/5</span>
                </div>
                <textarea
                  className="input min-h-[90px] py-2"
                  placeholder="Share your experience staying at this PG..."
                  value={reviewForm.text}
                  onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                />
                <button type="submit" className="btn-primary text-xs sm:text-sm py-2 px-4 min-h-[40px]">Submit Review</button>
              </form>
            )}

            {reviews.length === 0 ? (
              <div className="text-sm text-ink/55 dark:text-slate-400 text-center py-6">Be the first to review this PG.</div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => {
                  const reviewerName = typeof r.userId === 'object' && r.userId ? (r.userId as any).name || 'Student' : 'Student';
                  return (
                    <div key={r._id} className="border-b border-ink/10 dark:border-slate-700/60 pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center justify-center text-xs shrink-0">
                            {reviewerName[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-semibold text-ink-700 dark:text-slate-200">{reviewerName}</div>
                            <div className="text-[10px] text-ink/40 dark:text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</div>
                          </div>
                        </div>
                        <RatingStars rating={r.rating} />
                      </div>
                      <p className="text-xs sm:text-sm text-ink-600 dark:text-slate-300 mt-2 leading-relaxed">{r.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Booking Request Box */}
        <div className="space-y-6">
          <div className="card p-4 sm:p-6 sticky top-20 border dark:border-slate-700">
            <div className="mb-4 pb-4 border-b border-ink/10 dark:border-slate-700">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-indigo-700 dark:text-indigo-400">₹{pg.pricePerMonth.toLocaleString()}</span>
                <span className="text-ink/55 dark:text-slate-400 text-xs sm:text-sm">/month</span>
              </div>
              <div className="text-xs text-ink/55 dark:text-slate-400 mt-1">+ ₹{pg.securityDeposit.toLocaleString()} security deposit (refundable)</div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="label">Move-in date</label>
                <input
                  type="date"
                  className="input"
                  value={bookDates.start}
                  onChange={(e) => { setBookDates({ ...bookDates, start: e.target.value }); setOverlapSuggestion(null); }}
                />
              </div>
              <div>
                <label className="label">Move-out date</label>
                <input
                  type="date"
                  className="input"
                  value={bookDates.end}
                  onChange={(e) => { setBookDates({ ...bookDates, end: e.target.value }); setOverlapSuggestion(null); }}
                />
              </div>
            </div>

            {overlapSuggestion && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-2">
                <div className="font-semibold flex items-center gap-1">
                  <span>⛔</span> Unavailable Dates
                </div>
                <p>{overlapSuggestion.message}</p>
                {overlapSuggestion.suggestedRange && (
                  <button
                    type="button"
                    onClick={() => {
                      setBookDates({
                        start: overlapSuggestion.suggestedRange!.start,
                        end: overlapSuggestion.suggestedRange!.end
                      });
                      setOverlapSuggestion(null);
                    }}
                    className="btn-primary w-full text-xs py-1.5 bg-rose-700 hover:bg-rose-800 text-white"
                  >
                    Select Next Available: {overlapSuggestion.suggestedRange.start} to {overlapSuggestion.suggestedRange.end}
                  </button>
                )}
              </div>
            )}

            {bookedRanges.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <div className="font-semibold mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reserved Dates:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {bookedRanges.map((b, idx) => (
                    <li key={idx}>
                      {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={book}
              disabled={booking || pg.availableRooms <= 0}
              className="btn-primary w-full py-3 min-h-[46px]"
            >
              {booking ? 'Sending Request...' : pg.availableRooms <= 0 ? 'No rooms available' : 'Request to book'}
            </button>
            <p className="text-[11px] text-ink/55 dark:text-slate-400 mt-2 text-center">You won't be charged yet. Owner will review your request.</p>
            
            <div className="separator" />
            <div className="space-y-2 text-xs text-ink/55 dark:text-slate-400">
              <p className="flex items-center gap-1.5">✓ Free cancellation policy</p>
              <p className="flex items-center gap-1.5">✓ Verified listing & owner</p>
              <p className="flex items-center gap-1.5">✓ 24/7 student support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Complaint Modal */}
      {complaintOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setComplaintOpen(false)}>
          <div className="card w-full max-w-md p-6 border dark:border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">File a complaint</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Let us know about an issue with this accommodation.</p>
            <form onSubmit={submitComplaint} className="space-y-4">
              <div>
                <label className="label">Type of issue</label>
                <select className="input" value={complaint.type} onChange={(e) => setComplaint({ ...complaint, type: e.target.value })}>
                  {[
                    'hygiene', 'noise', 'safety', 'staff', 'amenity', 'electrician',
                    'plumber', 'wifi', 'furniture', 'water', 'security', 'pest_control',
                    'food', 'other'
                  ].map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[100px] py-2" value={complaint.description} onChange={(e) => setComplaint({ ...complaint, description: e.target.value })} placeholder="Explain the issue in detail..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setComplaintOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restricted Complaint Modal */}
      {restrictedComplaintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setRestrictedComplaintModal(false)}>
          <div className="card w-full max-w-md p-6 text-center space-y-4 border dark:border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl">🔒</div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Booking Record Required</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              You can file a complaint after requesting a booking or stay record for <strong>"{pg.name}"</strong>.
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setRestrictedComplaintModal(false)} className="btn-secondary flex-1">Close</button>
              <button onClick={() => { setRestrictedComplaintModal(false); nav('/student/bookings'); }} className="btn-primary flex-1">My Bookings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="text-[11px] sm:text-xs text-ink/55 dark:text-slate-400 font-medium">{label}</div>
    <div className="text-sm sm:text-base font-semibold text-ink-700 dark:text-slate-200 mt-0.5">{value}</div>
  </div>
);
