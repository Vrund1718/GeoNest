import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Complaint } from '../services/api';
import { StatusBadge } from './StatusBadge';

export type ComplaintStatusFilter =
  | 'ALL'
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

const STATUS_FILTERS: {
  key: ComplaintStatusFilter;
  label: string;
}[] = [
  { key: 'ALL', label: 'All' },
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_OPTIONS: {
  value: Complaint['status'];
  label: string;
}[] = [
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const variantForStatus = (s: Complaint['status']) => {
  switch (s) {
    case 'REQUESTED':
      return 'requested' as const;
    case 'IN_PROGRESS':
      return 'in-progress' as const;
    case 'RESOLVED':
      return 'resolved' as const;
    case 'REJECTED':
      return 'rejected' as const;
  }
};

export interface ComplaintsTableUpdateHandlers {
  onStatusChange: (
    id: string,
    status: Complaint['status'],
    adminNote?: string
  ) => Promise<{ ok: true; updated: Complaint } | { ok: false; error: string }>;
}

interface ComplaintsTableProps extends ComplaintsTableUpdateHandlers {
  complaints: Complaint[];
  loading: boolean;
  updatingIds: Record<string, Complaint['status'] | undefined>;
  noteDrafts: Record<string, string>;
  setNoteDraft: (id: string, value: string) => void;
}

const SkeletonRow = () => (
  <tr aria-hidden="true" className="animate-pulse">
    <td className="px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-ink/10" />
        <div className="space-y-1">
          <div className="h-3.5 w-32 rounded bg-ink/10" />
          <div className="h-3 w-28 rounded bg-ink/5" />
        </div>
      </div>
    </td>
    <td className="px-4 py-4">
      <div className="h-3.5 w-36 rounded bg-ink/10" />
    </td>
    <td className="px-4 py-4">
      <div className="h-5 w-20 rounded-full bg-ink/10" />
    </td>
    <td className="px-4 py-4">
      <div className="h-3.5 w-64 rounded bg-ink/10 mb-1" />
      <div className="h-3.5 w-40 rounded bg-ink/5" />
    </td>
    <td className="px-4 py-4">
      <div className="h-7 w-32 rounded-full bg-ink/10" />
    </td>
    <td className="px-4 py-4">
      <div className="h-3.5 w-20 rounded bg-ink/10" />
    </td>
    <td className="px-4 py-4">
      <div className="h-8 w-36 rounded bg-ink/10" />
    </td>
  </tr>
);

export const ComplaintsTable = ({
  complaints,
  loading,
  updatingIds,
  noteDrafts,
  setNoteDraft,
  onStatusChange,
}: ComplaintsTableProps) => {
  const [filter, setFilter] = useState<ComplaintStatusFilter>('ALL');

  const counts = useMemo(() => {
    const c: Record<ComplaintStatusFilter, number> = {
      ALL: complaints.length,
      REQUESTED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      REJECTED: 0,
    };
    complaints.forEach((x) => {
      c[x.status] = (c[x.status] || 0) + 1;
    });
    return c;
  }, [complaints]);

  const filtered = useMemo(
    () =>
      filter === 'ALL'
        ? complaints
        : complaints.filter((x) => x.status === filter),
    [complaints, filter]
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="space-y-4">
        <div
          role="tablist"
          aria-label="Filter complaints by status"
          className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-white border border-ink/10 shadow-sm"
        >
          {STATUS_FILTERS.slice(0, 3).map((f) => (
            <div
              key={f.key}
              className="h-8 w-20 rounded-lg bg-ink/10 animate-pulse"
            />
          ))}
        </div>
        <div
          className="rounded-2xl bg-white border border-ink/10 shadow-sm overflow-hidden"
          aria-busy="true"
        >
          <table className="w-full border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-sand/40 border-b border-ink/10 text-left">
                {['Complainant', 'PG', 'Type', 'Description', 'Status', 'Filed', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                    >
                      <div className="h-3.5 w-16 rounded bg-ink/10 animate-pulse" />
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Filter complaints by status"
        className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-white border border-ink/10 shadow-sm"
      >
        {STATUS_FILTERS.map((f) => {
          const selected = filter === f.key;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo ${
                selected
                  ? 'bg-indigo text-sand shadow-sm'
                  : 'text-ink/70 hover:text-ink hover:bg-sand border border-transparent hover:border-indigo/20'
              }`}
            >
              {f.label}
              {f.key !== 'ALL' && (
                <span
                  className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                    selected
                      ? 'bg-sand/20 text-sand'
                      : 'bg-ink/5 text-ink/50'
                  }`}
                >
                  {counts[f.key] || 0}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <section
          aria-label="Empty complaints"
          className="rounded-2xl bg-white border border-ink/10 p-10 text-center shadow-sm"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center text-sage mb-4">
            <CheckCircle size={30} aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            All caught up
          </h2>
          <p className="text-ink/60 max-w-md mx-auto">
            {filter === 'ALL'
              ? 'No unresolved complaints right now — good work. Check back later or head to the verification queue.'
              : `No ${filter.toLowerCase().replace('_', ' ')} complaints matching this filter.`}
          </p>
        </section>
      ) : (
        <div className="rounded-2xl bg-white border border-ink/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-sand/40 border-b border-ink/10 text-left">
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                  >
                    Complainant
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                  >
                    PG
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                  >
                    Filed
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                  >
                    Admin action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {filtered.map((c) => {
                  const optimistic = updatingIds[c.id];
                  const displayStatus = optimistic ?? c.status;
                  const isUpdating = optimistic !== undefined;
                  return (
                    <tr
                      key={c.id}
                      className="align-top hover:bg-sand/20 transition-colors motion-reduce:transition-none"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo/10 text-indigo flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold">
                              {(c.complainantName || c.userId).slice(0, 1).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink leading-tight">
                              {c.complainantName || 'User'}
                            </p>
                            {c.complainantEmail && (
                              <a
                                href={`mailto:${c.complainantEmail}`}
                                className="text-xs text-ink/50 hover:text-indigo block truncate"
                              >
                                {c.complainantEmail}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-ink font-medium leading-tight">
                          {c.pgName || 'Unknown listing'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-sand text-ink border border-ink/10">
                          {c.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-sm">
                        <p className="text-sm text-ink/80 leading-snug line-clamp-3">
                          {c.description}
                        </p>
                        <textarea
                          id={`note-${c.id}`}
                          value={noteDrafts[c.id] ?? ''}
                          onChange={(e) => setNoteDraft(c.id, e.target.value)}
                          rows={2}
                          placeholder="Add an admin note (resolution, context, follow-up)…"
                          className="mt-2 w-full rounded-lg border border-ink/10 px-2.5 py-1.5 text-xs bg-white text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-indigo focus:border-indigo/30 resize-none"
                          aria-label={`Admin note for ${c.type} complaint`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge variant={variantForStatus(displayStatus)}>
                          {displayStatus.charAt(0).toUpperCase() +
                            displayStatus.slice(1).replace('_', ' ')}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-4 text-sm text-ink/60 font-mono whitespace-nowrap">
                        {c.createdAt ? formatDate(c.createdAt) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative">
                          <label
                            htmlFor={`status-${c.id}`}
                            className="sr-only"
                          >
                            Update status
                          </label>
                          <select
                            id={`status-${c.id}`}
                            value={displayStatus}
                            disabled={isUpdating}
                            onChange={async (e) => {
                              const next = e.target.value as Complaint['status'];
                              await onStatusChange(
                                c.id,
                                next,
                                (noteDrafts[c.id] || '').trim() || undefined
                              );
                            }}
                            className={`appearance-none w-full pr-8 pl-3 py-1.5 rounded-lg border text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo disabled:opacity-60 disabled:cursor-not-allowed ${
                              displayStatus === 'REJECTED'
                                ? 'border-coral/40 text-coral focus:ring-coral'
                                : displayStatus === 'RESOLVED'
                                ? 'border-sage/40 text-sage focus:ring-sage'
                                : 'border-ink/15 text-ink'
                            }`}
                            aria-busy={isUpdating}
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            {isUpdating ? (
                              <Loader2
                                size={14}
                                className="animate-spin text-indigo"
                                aria-hidden="true"
                              />
                            ) : (
                              <ChevronDown
                                size={14}
                                className="text-ink/40"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </div>
                        {isUpdating && optimistic === displayStatus && (
                          <p className="mt-1 text-[10px] font-mono text-indigo/80 inline-flex items-center gap-1">
                            {displayStatus === c.status ? (
                              <>
                                <CheckCircle size={10} aria-hidden="true" /> Updated
                              </>
                            ) : (
                              <>
                                <Loader2
                                  size={10}
                                  className="animate-spin"
                                  aria-hidden="true"
                                />{' '}
                                Updating…
                              </>
                            )}
                          </p>
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
    </div>
  );
};

export const ComplaintEmptyStateIcon = AlertTriangle;
export const ComplaintEmptyStateIconReject = XCircle;
