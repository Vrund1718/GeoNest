import React from 'react';
import { PGListing } from '../types';
import { Link } from 'react-router-dom';
import { Star, MapPin, Check, Plus } from 'lucide-react';

const formatDistance = (m?: number) => {
  if (m == null) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

export const RatingStars: React.FC<{ rating: number | null | undefined; size?: 'sm' | 'md' }> = ({ rating, size = 'sm' }) => {
  const r = rating || 0;
  const cls = size === 'sm' ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4 sm:w-5 sm:h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${
            r >= i
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
      {rating != null && rating > 0 ? (
        <span className={`text-${size === 'sm' ? 'xs' : 'sm'} text-ink/55 dark:text-slate-400 font-medium ml-1`}>
          {rating.toFixed(1)}
        </span>
      ) : (
        <span className={`text-${size === 'sm' ? 'xs' : 'sm'} text-slate-400 dark:text-slate-500 font-medium ml-1`}>
          No reviews yet
        </span>
      )}
    </div>
  );
};

export const PGCard: React.FC<{
  pg: PGListing;
  to?: string;
  onClick?: () => void;
  isCompared?: boolean;
  onCompareToggle?: (pg: PGListing) => void;
}> = ({ pg, to = `/pg/${pg._id}`, onClick, isCompared = false, onCompareToggle }) => {
  const genderBadge =
    pg.genderPreference === 'male'
      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-100 dark:ring-indigo-800'
      : pg.genderPreference === 'female'
      ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 ring-1 ring-rose-100 dark:ring-rose-800'
      : 'bg-sand-100 dark:bg-slate-700 text-ink-700 dark:text-slate-200 ring-1 ring-ink/10 dark:ring-slate-600';
  const genderLabel = pg.genderPreference === 'male' ? 'Boys' : pg.genderPreference === 'female' ? 'Girls' : 'Unisex';

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCompareToggle) onCompareToggle(pg);
  };

  const isObjectId = (str: string) => /^[0-9a-fA-F]{24}$/.test(str);
  const cleanAmenities = Array.isArray(pg.amenities)
    ? pg.amenities
        .map((a) => (typeof a === 'string' ? a : a?.name))
        .filter((name): name is string => Boolean(name) && !isObjectId(name))
    : [];

  const cardInner = (
    <div className="card overflow-hidden h-full flex flex-col hover:shadow-pop dark:hover:shadow-slate-700/30 transition-all duration-200 group border dark:border-slate-700">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-100 dark:bg-slate-700">
        {pg.primaryImage ? (
          <img
            src={pg.primaryImage}
            alt={pg.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/20 dark:text-slate-500 text-4xl sm:text-5xl">🏠</div>
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap z-10">
          <span className={`badge ${genderBadge}`}>{genderLabel}</span>
          {pg.isVerified && (
            <span className="badge bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
              ✓ Verified
            </span>
          )}
        </div>
        {pg.distanceMeters != null && (
          <div className="absolute top-2.5 right-2.5 badge bg-white/95 dark:bg-slate-800/95 text-ink-700 dark:text-slate-200 ring-1 ring-ink/10 dark:ring-slate-700 shadow-sm backdrop-blur-xs flex items-center gap-1 z-10">
            <MapPin className="w-3 h-3 text-indigo-500" />
            <span>{formatDistance(pg.distanceMeters)}</span>
          </div>
        )}

        {/* Compare Checkbox Button */}
        {onCompareToggle && (
          <button
            type="button"
            onClick={handleCompareClick}
            aria-label={isCompared ? `Remove ${pg.name} from compare` : `Add ${pg.name} to compare`}
            className={`absolute bottom-2.5 right-2.5 badge z-10 transition-all shadow-md flex items-center gap-1 ${
              isCompared
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            {isCompared ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            <span className="text-[11px] font-semibold">{isCompared ? 'Compared' : 'Compare'}</span>
          </button>
        )}
      </div>

      <div className="p-3.5 sm:p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 text-sm sm:text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {pg.name}
          </h3>
        </div>
        <p className="text-xs text-ink/55 dark:text-slate-400 mt-0.5 line-clamp-2">{pg.address}, {pg.city}</p>
        
        <div className="mt-2 flex items-center gap-2">
          <RatingStars rating={pg.averageRating} />
          {pg.reviewCount != null && pg.reviewCount > 0 && (
            <span className="text-xs text-ink/55 dark:text-slate-400">({pg.reviewCount})</span>
          )}
        </div>

        {cleanAmenities.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {cleanAmenities.slice(0, 4).map((amenity) => (
              <span
                key={amenity}
                className="badge bg-sand-50 dark:bg-slate-700/80 text-ink-600 dark:text-slate-300 ring-1 ring-ink/10 dark:ring-slate-600 text-[11px]"
              >
                {amenity}
              </span>
            ))}
            {cleanAmenities.length > 4 && (
              <span className="badge text-ink/40 dark:text-slate-500 text-[11px]">+{cleanAmenities.length - 4}</span>
            )}
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-1">
            <span className="badge bg-sand-50 dark:bg-slate-700/80 text-ink-600 dark:text-slate-300 ring-1 ring-ink/10 dark:ring-slate-600 text-[11px]">
              {pg.availableRooms > 0 ? `${pg.availableRooms} rooms available` : 'Fully booked'}
            </span>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-ink/10 dark:border-slate-700/60 flex items-end justify-between">
          <div>
            <div className="text-lg sm:text-xl font-bold text-indigo-700 dark:text-indigo-400">
              ₹{pg.pricePerMonth.toLocaleString()}
            </div>
            <div className="text-[11px] text-ink/55 dark:text-slate-400">per month</div>
          </div>
          <div className="text-xs text-ink/55 dark:text-slate-400 text-right">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{pg.availableRooms}</span>/{pg.totalRooms} rooms
          </div>
        </div>
      </div>
    </div>
  );

  if (onClick) return <div onClick={onClick} className="cursor-pointer h-full">{cardInner}</div>;
  return <Link to={to} className="block h-full">{cardInner}</Link>;
};

export const SkeletonCard: React.FC = () => (
  <div className="card overflow-hidden h-full flex flex-col animate-pulse border dark:border-slate-700">
    <div className="aspect-[4/3] bg-sand-200 dark:bg-slate-700 w-full" />
    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="h-5 bg-sand-200 dark:bg-slate-700 rounded-md w-3/4" />
        <div className="h-3 bg-sand-200 dark:bg-slate-700 rounded-md w-1/2" />
        <div className="h-4 bg-sand-200 dark:bg-slate-700 rounded-md w-1/3" />
      </div>
      <div className="pt-3 border-t border-ink/10 dark:border-slate-700 flex justify-between items-center">
        <div className="h-6 bg-sand-200 dark:bg-slate-700 rounded-md w-24" />
        <div className="h-4 bg-sand-200 dark:bg-slate-700 rounded-md w-16" />
      </div>
    </div>
  </div>
);

export const SkeletonDetail: React.FC = () => (
  <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
    <div className="h-8 bg-sand-200 dark:bg-slate-700 rounded-lg w-2/3" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-72 sm:h-96">
      <div className="md:col-span-2 bg-sand-200 dark:bg-slate-700 rounded-2xl h-full" />
      <div className="grid grid-rows-2 gap-4 h-full">
        <div className="bg-sand-200 dark:bg-slate-700 rounded-2xl" />
        <div className="bg-sand-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="h-40 bg-sand-200 dark:bg-slate-700 rounded-2xl" />
        <div className="h-32 bg-sand-200 dark:bg-slate-700 rounded-2xl" />
      </div>
      <div className="h-64 bg-sand-200 dark:bg-slate-700 rounded-2xl" />
    </div>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: string;
}> = ({ title, description, action, icon = '📭' }) => (
  <div className="card p-8 sm:p-12 flex flex-col items-center text-center border dark:border-slate-700">
    <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{icon}</div>
    <h3 className="font-semibold text-base sm:text-lg text-ink-700 dark:text-slate-100">{title}</h3>
    {description && (
      <p className="text-xs sm:text-sm text-ink/55 dark:text-slate-400 mt-2 max-w-md leading-relaxed">
        {description}
      </p>
    )}
    {action && <div className="mt-5 sm:mt-6">{action}</div>}
  </div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
    <div>
      <h1 className="h1">{title}</h1>
      {subtitle && <p className="text-xs sm:text-sm text-ink/55 dark:text-slate-400 mt-0.5 sm:mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="shrink-0">{actions}</div>}
  </div>
);
