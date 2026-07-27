import { ReactNode } from 'react';
import { Tooltip } from './Tooltip';

export type StatusVariant =
  | 'active'
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'inactive'
  | 'draft'
  | 'in-progress'
  | 'requested'
  | 'resolved';

interface StatusBadgeProps {
  variant: StatusVariant;
  children: ReactNode;
  reason?: string;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  active: 'border-sage text-sage bg-sage/10',
  verified: 'border-sage text-sage bg-sage/10',
  pending: 'border-marigold text-marigold bg-marigold/10',
  rejected: 'border-coral text-coral bg-coral/10',
  inactive: 'border-ink/30 text-ink/60 bg-ink/5',
  draft: 'border-indigo/40 text-indigo bg-indigo/10',
  'in-progress': 'border-indigo text-indigo bg-indigo/10',
  requested: 'border-marigold text-marigold bg-marigold/10',
  resolved: 'border-sage text-sage bg-sage/10',
};

export const StatusBadge = ({
  variant,
  children,
  reason,
  className = '',
}: StatusBadgeProps) => {
  const badge = (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );

  if (reason) {
    return (
      <Tooltip content={reason}>
        <span>{badge}</span>
      </Tooltip>
    );
  }

  return badge;
};
