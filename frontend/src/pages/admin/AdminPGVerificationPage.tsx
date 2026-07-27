import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { PGKeytagCard, PGKeytagData } from '../../components/PGKeytagCard';
import { StatusBadge, StatusVariant } from '../../components/StatusBadge';
import { VerificationReviewPanel } from '../../components/VerificationReviewPanel';
import { useToast } from '../../components/Toast';
import {
  adminApi,
  ApiError,
  PgListing,
} from '../../services/api';

const mapStatus = (s: PgListing['status']): StatusVariant => {
  switch (s) {
    case 'ACTIVE':
      return 'verified';
    case 'PENDING':
      return 'pending';
    case 'REJECTED':
      return 'rejected';
    case 'INACTIVE':
      return 'inactive';
    case 'DRAFT':
      return 'draft';
    default:
      return 'pending';
  }
};

const mapToKeytag = (p: PgListing): PGKeytagData => ({
  id: p.id,
  name: p.name,
  city: p.city,
  collegeName: p.collegeName,
  distanceKm: p.distanceKm,
  pricePerMonth: p.pricePerMonth,
  status: mapStatus(p.status),
  primaryImage:
    p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url,
  statusReason: p.rejectionReason,
});

const Skeleton = () => (
  <article
    aria-hidden="true"
    className="relative rounded-2xl bg-sand border border-ink/5 overflow-hidden"
  >
    <div className="p-5 pt-10">
      <div className="mb-4 aspect-[4/3] rounded-xl bg-ink/5 animate-pulse" />
      <div className="h-5 w-2/3 rounded bg-ink/10 animate-pulse mb-2" />
      <div className="h-3.5 w-5/6 rounded bg-ink/8 animate-pulse mb-3" />
      <div className="h-5 w-1/3 rounded-full bg-ink/10 animate-pulse mb-4" />
      <div className="flex gap-2">
        <div className="h-7 w-16 rounded bg-ink/8 animate-pulse" />
        <div className="h-7 w-24 rounded bg-ink/8 animate-pulse" />
      </div>
    </div>
  </article>
);

export const AdminPGVerificationPage = () => {
  const toast = useToast();
  const [list, setList] = useState<PgListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMobileOpen, setPanelMobileOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    let alive = true;
    adminApi
      .listPending()
      .then((res) => {
        if (alive) {
          const data = res.data || [];
          setList(data);
          if (
            !selectedId ||
            !data.find((d) => d.id === selectedId)
          ) {
            setSelectedId(data[0]?.id || null);
          }
        }
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg =
          e instanceof ApiError
            ? e.message
            : 'Could not load the verification queue.';
        toast.show({
          variant: 'error',
          title: 'Failed to load queue',
          message: msg,
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  };

  useEffect(load, [toast]);

  const selected = useMemo(
    () => list.find((p) => p.id === selectedId) || null,
    [list, selectedId]
  );
  const keytagList = useMemo(() => list.map(mapToKeytag), [list]);

  const handleApprove = async (id: string) => {
    setApproving(true);
    try {
      await adminApi.verify(id, true);
      setList((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        const remaining = list.filter((p) => p.id !== id);
        setSelectedId(remaining[0]?.id || null);
        setPanelMobileOpen(false);
      }
      toast.show({
        variant: 'success',
        title: 'PG approved',
        message:
          'The listing is now live and students can find it in search.',
      });
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError ? e.message : 'Please try again in a moment.';
      toast.show({
        variant: 'error',
        title: 'Could not approve',
        message: msg,
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setRejectionError(
        'Rejection reason must be at least 10 characters — the owner needs specifics to fix it.'
      );
      return;
    }
    setRejectionError(undefined);
    setRejecting(true);
    try {
      await adminApi.verify(id, false, trimmed);
      setList((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        const remaining = list.filter((p) => p.id !== id);
        setSelectedId(remaining[0]?.id || null);
      }
      setRejectionOpen(false);
      setRejectionReason('');
      setPanelMobileOpen(false);
      toast.show({
        variant: 'success',
        title: 'PG rejected',
        message: 'The owner has been notified with the reason.',
      });
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError ? e.message : 'Please try again in a moment.';
      toast.show({
        variant: 'error',
        title: 'Could not reject',
        message: msg,
      });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink leading-tight">
            PG Verification
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            {loading
              ? 'Loading the verification queue…'
              : list.length === 0
              ? 'No pending listings.'
              : `${list.length} listing${
                  list.length === 1 ? '' : 's'
                } waiting for review.`}
          </p>
        </div>
        <StatusBadge variant="pending">
          <span className="font-mono">{list.length}</span>
          <span className="ml-1">pending</span>
        </StatusBadge>
      </div>

      {loading ? (
        <div
          className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
          aria-label="Loading verification queue"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <section
          aria-label="Empty queue"
          className="rounded-2xl bg-white border border-ink/10 p-12 text-center shadow-sm"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center text-sage mb-4">
            <ClipboardCheck size={30} aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            All caught up
          </h2>
          <p className="text-ink/60 max-w-md mx-auto">
            Nothing waiting on you right now. Check back later or head to
            complaints if anything needs triage.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 min-h-[70vh]">
          <div
            className={`lg:col-span-5 xl:col-span-4 space-y-5 ${
              panelMobileOpen ? 'hidden lg:block' : ''
            }`}
            aria-label="Pending queue"
          >
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
              {keytagList.map((pg) => {
                const isSelected = selectedId === pg.id;
                return (
                  <div
                    key={pg.id}
                    className={`transition-all duration-150 ease-out motion-reduce:transition-none ${
                      isSelected
                        ? 'ring-2 ring-indigo ring-offset-2 ring-offset-sand rounded-2xl'
                        : ''
                    }`}
                  >
                    <PGKeytagCard
                      pg={pg}
                      onClick={() => {
                        setSelectedId(pg.id);
                        setPanelMobileOpen(true);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className={`lg:col-span-7 xl:col-span-8 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] ${
              panelMobileOpen ? '' : 'hidden lg:block'
            }`}
          >
            <VerificationReviewPanel
              pg={selected}
              onClose={
                panelMobileOpen
                  ? () => setPanelMobileOpen(false)
                  : undefined
              }
              onApprove={handleApprove}
              onReject={handleReject}
              approving={approving}
              rejecting={rejecting}
              rejectionOpen={rejectionOpen}
              setRejectionOpen={(v) => {
                setRejectionOpen(v);
                if (!v) {
                  setRejectionError(undefined);
                  setRejectionReason('');
                }
              }}
              rejectionReason={rejectionReason}
              setRejectionReason={(v) => {
                setRejectionReason(v);
                if (rejectionError && v.trim().length >= 10) {
                  setRejectionError(undefined);
                }
              }}
              rejectionError={rejectionError}
            />
          </div>
        </div>
      )}
    </div>
  );
};
