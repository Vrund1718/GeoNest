import React from 'react';
import { PGListing } from '../types';
import { Link } from 'react-router-dom';

const formatDistance = (m?: number) => {
  if (m == null) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

export const RatingStars: React.FC<{ rating: number | null | undefined; size?: 'sm' | 'md' }> = ({ rating, size = 'sm' }) => {
  const r = rating || 0;
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`${cls} ${r >= i ? 'text-marigold-500' : 'text-ink/15'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.05 2.93A1 1 0 0110 2.5a1 1 0 01.95.43l1.9 3.24 3.55.36a1 1 0 01.57 1.76l-2.77 2.37.91 3.45a1 1 0 01-1.5 1.09L10 13.51l-3.11 2.19a1 1 0 01-1.5-1.09l.91-3.45L1.03 8.3a1 1 0 01.57-1.76l3.55-.36L9.05 2.93z" />
        </svg>
      ))}
      {rating != null && <span className={`text-${size === 'sm' ? 'xs' : 'sm'} text-ink/55 ml-1`}>{rating.toFixed(1)}</span>}
    </div>
  );
};

export const PGCard: React.FC<{ pg: PGListing; to?: string; onClick?: () => void }> = ({ pg, to = `/pg/${pg._id}`, onClick }) => {
  const genderBadge =
    pg.genderPreference === 'male' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' :
    pg.genderPreference === 'female' ? 'bg-coral/10 text-coral ring-1 ring-coral/20' :
    'bg-sand-100 text-ink-700 ring-1 ring-ink/10';
  const genderLabel = pg.genderPreference === 'male' ? 'Boys' : pg.genderPreference === 'female' ? 'Girls' : 'Unisex';

  const content = (
    <div className="card overflow-hidden h-full flex flex-col hover:shadow-pop transition group">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
        {pg.primaryImage ? (
          <img src={pg.primaryImage} alt={pg.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/20 text-5xl">🏠</div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`badge ${genderBadge}`}>{genderLabel}</span>
          {pg.isVerified && <span className="badge bg-sage/10 text-sage ring-1 ring-sage/20">✓ Verified</span>}
        </div>
        {pg.distanceMeters != null && (
          <div className="absolute top-3 right-3 badge bg-white/95 text-ink-700 ring-1 ring-ink/10 shadow-sm">
            📍 {formatDistance(pg.distanceMeters)}
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-ink-700 line-clamp-1">{pg.name}</h3>
        </div>
        <p className="text-xs text-ink/55 mt-0.5 line-clamp-2">{pg.address}, {pg.city}</p>
        <div className="mt-2 flex items-center gap-2">
          <RatingStars rating={pg.averageRating} />
          {pg.reviewCount != null && pg.reviewCount > 0 && (
            <span className="text-xs text-ink/55">({pg.reviewCount})</span>
          )}
        </div>
        {Array.isArray(pg.amenities) && pg.amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {pg.amenities.slice(0, 4).map((a) => (
              <span key={typeof a === 'string' ? a : a._id} className="badge bg-sand-50 text-ink-600 ring-1 ring-ink/10">
                {typeof a === 'string' ? a : a.name}
              </span>
            ))}
            {pg.amenities.length > 4 && <span className="badge text-ink/40">+{pg.amenities.length - 4}</span>}
          </div>
        )}
        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            <div className="text-xl font-bold text-indigo-700">₹{pg.pricePerMonth.toLocaleString()}</div>
            <div className="text-xs text-ink/55">per month</div>
          </div>
          <div className="text-xs text-ink/55 text-right">
            {pg.availableRooms}/{pg.totalRooms} rooms
          </div>
        </div>
      </div>
    </div>
  );
  if (onClick) return <div onClick={onClick} className="cursor-pointer">{content}</div>;
  return <Link to={to} className="block">{content}</Link>;
};

export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode; icon?: string }> = ({
  title, description, action, icon = '📭',
}) => (
  <div className="card p-10 flex flex-col items-center text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="font-semibold text-lg text-ink-700">{title}</h3>
    {description && <p className="text-sm text-ink/55 mt-2 max-w-md">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <div className="flex items-start justify-between gap-4 mb-6">
    <div>
      <h1 className="h1">{title}</h1>
      {subtitle && <p className="text-sm text-ink/55 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex-shrink-0">{actions}</div>}
  </div>
);
