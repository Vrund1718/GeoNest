import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  UserCircle2,
  ChevronLeft,
  X,
  Check,
  CheckCircle2,
  XCircle,
  Building2,
  CalendarClock,
} from 'lucide-react';
import { PgListing } from '../services/api';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';

interface VerificationReviewPanelProps {
  pg: PgListing | null;
  onClose?: () => void;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string, reason: string) => Promise<void> | void;
  approving?: boolean;
  rejecting?: boolean;
  rejectionOpen: boolean;
  setRejectionOpen: (open: boolean) => void;
  rejectionReason: string;
  setRejectionReason: (r: string) => void;
  rejectionError?: string;
}

const pinIcon = L.divIcon({
  className: 'geonest-pin',
  html: `<div style="transform:translate(-50%,-100%);"><svg width="32" height="40" viewBox="0 0 32 40" fill="none"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#E8A33D" stroke="#2A2420" stroke-width="1.5"/><circle cx="16" cy="15" r="5" fill="#FBF3E6"/></svg></div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

export const VerificationReviewPanel = ({
  pg,
  onClose,
  onApprove,
  onReject,
  approving,
  rejecting,
  rejectionOpen,
  setRejectionOpen,
  rejectionReason,
  setRejectionReason,
  rejectionError,
}: VerificationReviewPanelProps) => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!pg || !mapRef.current) return;
    if (pg.latitude != null && pg.longitude != null) {
      mapRef.current.flyTo([pg.latitude, pg.longitude], 15, {
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: 0.4,
      });
    }
  }, [pg?.id, pg?.latitude, pg?.longitude]);

  if (!pg) {
    return (
      <aside
        aria-label="No PG selected"
        className="h-full rounded-2xl bg-white border border-ink/10 shadow-sm p-10 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 rounded-full bg-sand flex items-center justify-center text-indigo mb-4">
          <Building2 size={32} aria-hidden="true" />
        </div>
        <h2 className="font-display text-xl font-semibold text-ink mb-2">
          Select a listing to review
        </h2>
        <p className="text-ink/60 text-sm max-w-sm">
          Pending PGs are listed on the left. Click one to see photos, location, amenities, and owner contact details before approving or rejecting.
        </p>
      </aside>
    );
  }

  const owner = pg.owner;
  const primaryUrl =
    pg.images?.find((i) => i.isPrimary)?.url || pg.images?.[0]?.url;
  const otherImages = pg.images?.filter((i) => i.url !== primaryUrl) || [];

  const submissionLabel = pg.createdAt
    ? new Date(pg.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <aside
      aria-label={`Review ${pg.name}`}
      className="h-full flex flex-col rounded-2xl bg-white border border-ink/10 shadow-sm overflow-hidden"
    >
      <header className="flex items-start justify-between gap-3 p-5 border-b border-ink/5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to queue list"
                className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-sand transition-colors focus:outline-none focus:ring-2 focus:ring-indigo"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <StatusBadge variant="pending">Pending review</StatusBadge>
            <span className="inline-flex items-center gap-1 text-xs text-ink/50 font-mono">
              <CalendarClock size={12} /> {submissionLabel}
            </span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-indigo leading-tight min-w-0 break-words">
            {pg.name}
          </h2>
          <p className="text-sm text-ink/60 mt-1 line-clamp-2">
            {[pg.address, pg.city, pg.collegeName]
              .filter(Boolean)
              .join(' • ')}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review panel"
            className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-sand transition-colors focus:outline-none focus:ring-2 focus:ring-indigo lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-5">
          <section aria-label="Photos">
            <div className="rounded-xl overflow-hidden aspect-[4/3] bg-sand border border-ink/10 mb-2">
              {primaryUrl ? (
                <img
                  src={primaryUrl}
                  alt={`Primary photo of ${pg.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink/30">
                  <MapPin size={40} strokeWidth={1.5} aria-hidden="true" />
                </div>
              )}
            </div>
            {otherImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {otherImages.slice(0, 4).map((im) => (
                  <img
                    key={im.id}
                    src={im.url}
                    alt={`Additional photo of ${pg.name}`}
                    className="aspect-square object-cover rounded-lg border border-ink/10"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </section>

          <section
            aria-label="Price and capacity summary"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <div className="p-3 rounded-lg bg-sand/60">
              <p className="text-[11px] uppercase tracking-wider text-ink/40">
                Price
              </p>
              <p className="font-mono font-semibold text-ink">
                ₹{(pg.pricePerMonth || 0).toLocaleString('en-IN')}
                <span className="text-[11px] font-sans font-normal text-ink/50">
                  {' '}
                  /mo
                </span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-sand/60">
              <p className="text-[11px] uppercase tracking-wider text-ink/40">
                Rooms
              </p>
              <p className="font-semibold text-ink">
                {pg.availableRooms ?? 0} / {pg.totalRooms ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-sand/60">
              <p className="text-[11px] uppercase tracking-wider text-ink/40">
                Accomodates
              </p>
              <p className="font-semibold text-ink">
                {pg.genderPreference === 'CO_ED'
                  ? 'Co-Ed'
                  : pg.genderPreference || '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-sand/60">
              <p className="text-[11px] uppercase tracking-wider text-ink/40">
                Food
              </p>
              <p className="font-semibold text-ink">
                {pg.foodIncluded ? 'Included' : 'Not included'}
              </p>
            </div>
          </section>

          {pg.description && (
            <section aria-label="Description">
              <p className="text-[11px] uppercase tracking-wider text-ink/40 mb-1">
                Description
              </p>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {pg.description}
              </p>
            </section>
          )}

          {pg.amenities && pg.amenities.length > 0 && (
            <section aria-label="Amenities">
              <p className="text-[11px] uppercase tracking-wider text-ink/40 mb-2">
                Amenities ({pg.amenities.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pg.amenities.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo/10 text-indigo border border-indigo/20"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section
            aria-label="Map location"
            className="rounded-xl overflow-hidden border border-ink/10 bg-sand"
          >
            <div className="h-56 w-full">
              {pg.latitude != null && pg.longitude != null ? (
                <MapContainer
                  ref={(m) => {
                    mapRef.current = m as unknown as L.Map;
                  }}
                  center={[pg.latitude, pg.longitude]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[pg.latitude, pg.longitude]}
                    icon={pinIcon}
                    interactive={false}
                  />
                </MapContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-ink/30 text-sm">
                  No location set by owner
                </div>
              )}
            </div>
          </section>

          <section
            aria-label="Owner contact"
            className="rounded-xl border border-ink/10 bg-sand/40 p-4 space-y-2 text-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo/10 text-indigo flex items-center justify-center flex-shrink-0">
                <UserCircle2 size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-ink leading-tight">
                  {owner?.name || 'Owner name unavailable'}
                </p>
                <p className="text-xs text-ink/50">Listing owner</p>
              </div>
            </div>
            {owner?.email && (
              <a
                href={`mailto:${owner.email}`}
                className="flex items-center gap-2 text-ink/70 hover:text-indigo transition-colors"
              >
                <Mail size={14} aria-hidden="true" className="flex-shrink-0" />
                <span className="truncate">{owner.email}</span>
              </a>
            )}
            {owner?.phone && (
              <a
                href={`tel:${owner.phone}`}
                className="flex items-center gap-2 text-ink/70 hover:text-indigo transition-colors"
              >
                <Phone size={14} aria-hidden="true" className="flex-shrink-0" />
                <span className="font-mono">{owner.phone}</span>
              </a>
            )}
          </section>
        </div>
      </div>

      <footer className="border-t border-ink/5 p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
        <Button
          variant="secondary"
          onClick={() => setRejectionOpen(true)}
          disabled={rejecting}
          className="inline-flex items-center justify-center gap-2"
        >
          <XCircle size={16} aria-hidden="true" />
          {rejecting ? 'Rejecting…' : 'Reject'}
        </Button>
        <Button
          onClick={() => void onApprove(pg.id)}
          disabled={approving || rejecting}
          className="inline-flex items-center justify-center gap-2 !bg-sage !border-sage hover:!bg-sage/90 focus:!ring-sage"
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          {approving ? 'Approving…' : 'Approve'}
        </Button>
      </footer>

      {rejectionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm"
          onClick={() => !rejecting && setRejectionOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-ink/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-ink/5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center flex-shrink-0">
                  <XCircle size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3
                    id="reject-title"
                    className="font-display text-lg font-semibold text-ink"
                  >
                    Reject {pg.name}
                  </h3>
                  <p className="text-xs text-ink/60 mt-0.5">
                    The owner will see this reason. Be specific — they can edit and resubmit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !rejecting && setRejectionOpen(false)}
                disabled={rejecting}
                aria-label="Close reject dialog"
                className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-sand transition-colors focus:outline-none focus:ring-2 focus:ring-indigo"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onReject(pg.id, rejectionReason);
              }}
              className="p-5 space-y-3"
            >
              <label
                htmlFor="rejection-reason"
                className="block text-sm font-medium text-ink"
              >
                Rejection reason <span className="text-coral">*</span>
              </label>
              <textarea
                id="rejection-reason"
                required
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Address cannot be verified on the map. Upload clearer photos of the exterior, and a copy of the rental license."
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm bg-white text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-indigo focus:border-indigo/30 resize-none"
                aria-invalid={!!rejectionError}
                aria-describedby={rejectionError ? 'reject-reason-err' : undefined}
                disabled={rejecting}
              />
              <p className="text-xs text-ink/50 flex items-center gap-1">
                <Check size={12} aria-hidden="true" /> Minimum 10 characters
              </p>
              {rejectionError && (
                <p
                  id="reject-reason-err"
                  role="alert"
                  className="text-xs text-coral"
                >
                  {rejectionError}
                </p>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRejectionOpen(false)}
                  disabled={rejecting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={rejecting}
                  className="!bg-coral !border-coral hover:!bg-coral/90 focus:!ring-coral inline-flex items-center gap-2"
                >
                  {rejecting ? 'Sending…' : 'Confirm rejection'}
                  <X size={14} aria-hidden="true" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
