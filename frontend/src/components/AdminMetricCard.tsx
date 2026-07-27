import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface AdminMetricCardProps {
  label: string;
  value: number;
  Icon: LucideIcon;
  href?: string;
  accent?: 'marigold' | 'sage' | 'coral' | 'sand';
}

export const AdminMetricCard = ({
  label,
  value,
  Icon,
  href,
  accent = 'marigold',
}: AdminMetricCardProps) => {
  const accentClass =
    accent === 'marigold'
      ? 'text-marigold'
      : accent === 'sage'
      ? 'text-sage'
      : accent === 'coral'
      ? 'text-coral'
      : 'text-sand';

  const Content = (
    <div
      className={`group relative bg-indigo rounded-2xl px-6 py-5 text-sand shadow-md hover:shadow-xl hover:-translate-y-[2px] transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none overflow-hidden h-full`}
    >
      <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity duration-150 motion-reduce:transition-none">
        <Icon size={120} strokeWidth={1.25} aria-hidden="true" />
      </div>
      <div className="relative">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sand/10 text-sand mb-4">
          <Icon size={20} aria-hidden="true" />
        </div>
        <p
          className={`font-display text-5xl font-semibold leading-none mb-2 tabular-nums ${accentClass}`}
        >
          {value.toLocaleString('en-IN')}
        </p>
        <p className="text-sm text-sand/80 leading-tight">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="block focus:outline-none focus:ring-2 focus:ring-indigo rounded-2xl"
      >
        {Content}
      </Link>
    );
  }
  return Content;
};

export const AdminMetricCardSkeleton = () => (
  <div
    className="bg-indigo/90 rounded-2xl px-6 py-5 h-full"
    aria-hidden="true"
  >
    <div className="w-10 h-10 rounded-xl bg-sand/10 mb-4 animate-pulse" />
    <div className="h-12 w-1/2 rounded bg-marigold/40 animate-pulse mb-2" />
    <div className="h-3.5 w-4/5 rounded bg-sand/30 animate-pulse" />
  </div>
);
