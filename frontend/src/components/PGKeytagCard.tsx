import { StatusBadge, StatusVariant } from './StatusBadge';
import { Pencil, Power, Trash2, Maximize2, MapPin } from 'lucide-react';

export interface PGKeytagData {
  id: string;
  name: string;
  city: string;
  collegeName?: string;
  distanceKm?: number;
  pricePerMonth: number;
  status: StatusVariant;
  primaryImage?: string;
  statusReason?: string;
}

interface PGKeytagCardProps {
  pg: PGKeytagData;
  onClick?: () => void;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
  onExpand?: () => void;
  className?: string;
}

export const PGKeytagCard = ({
  pg,
  onClick,
  onEdit,
  onDeactivate,
  onDelete,
  onExpand,
  className = '',
}: PGKeytagCardProps) => {
  const subtitleDistance =
    pg.distanceKm !== undefined
      ? ` • ${pg.distanceKm.toFixed(1)} km away`
      : '';
  const subtitle = `${pg.city}${pg.collegeName ? ` • ${pg.collegeName}` : ''}${subtitleDistance}`;

  return (
    <article
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className={`group relative rounded-2xl bg-sand shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo overflow-hidden cursor-pointer border border-ink/5 ${className}`}
    >
      <div className="absolute top-0 left-0 right-0 h-8 flex items-start justify-start pt-3 pl-4 pointer-events-none">
        <div className="relative">
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            className="absolute -top-1 -left-1"
            aria-hidden="true"
          >
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="#2C3A63"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.5"
            />
            <circle cx="22" cy="22" r="10" fill="#FBF3E6" />
            <circle cx="22" cy="22" r="10" fill="none" stroke="#2C3A63" strokeWidth="1" opacity="0.25" />
          </svg>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 -rotate-6 translate-y-0">
        <div className="bg-marigold text-ink px-2 py-1 rounded-md shadow-md">
          <span className="font-mono font-medium text-sm whitespace-nowrap">
            ₹{pg.pricePerMonth.toLocaleString('en-IN')}/mo
          </span>
        </div>
      </div>

      <div className="p-5 pt-10">
        <div className="mb-4 aspect-[4/3] rounded-xl overflow-hidden bg-ink/5">
          {pg.primaryImage ? (
            <img
              src={pg.primaryImage}
              alt={`Primary photo of ${pg.name} PG accommodation in ${pg.city}`}
              className="w-full h-full object-cover transition-transform duration-200 ease-out motion-reduce:transition-none group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink/30">
              <MapPin size={48} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display text-lg font-semibold text-indigo leading-snug line-clamp-2">
            {pg.name}
          </h3>
        </div>

        <p className="text-sm text-ink/60 mb-3 line-clamp-2 min-h-[2.5rem]">
          {subtitle}
        </p>

        <div className="flex items-center justify-between mb-4">
          <StatusBadge variant={pg.status} reason={pg.statusReason}>
            {pg.status.charAt(0).toUpperCase() +
              pg.status.slice(1).replace('-', ' ')}
          </StatusBadge>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.();
            }}
            className="p-1.5 rounded-md text-ink/40 hover:text-indigo hover:bg-indigo/10 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo"
            aria-label={`Expand ${pg.name} details`}
          >
            <Maximize2 size={16} />
          </button>
        </div>

        <div
          className="flex items-center gap-2 flex-wrap"
          onClick={(e) => e.stopPropagation()}
          role="toolbar"
          aria-label="PG quick actions"
        >
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-indigo border border-indigo/30 hover:bg-indigo hover:text-sand transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo"
              aria-label={`Edit ${pg.name}`}
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          {onDeactivate && (
            <button
              type="button"
              onClick={onDeactivate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-marigold border border-marigold/30 hover:bg-marigold hover:text-ink transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-marigold"
              aria-label={`Deactivate ${pg.name}`}
            >
              <Power size={14} /> Deactivate
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-coral border border-coral/30 hover:bg-coral hover:text-sand transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-coral"
              aria-label={`Delete ${pg.name}`}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
