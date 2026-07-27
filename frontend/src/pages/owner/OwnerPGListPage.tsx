import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Home as HomeIcon } from 'lucide-react';
import { PGKeytagCard, PGKeytagData } from '../../components/PGKeytagCard';
import { StatusVariant } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { ownerApi, PgListing, ApiError } from '../../services/api';

type StatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'ACTIVE' | 'REJECTED';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'REJECTED', label: 'Rejected' },
];

const mapStatus = (s: PgListing['status']): StatusVariant => {
  switch (s) {
    case 'ACTIVE':
      return 'active';
    case 'PENDING':
      return 'pending';
    case 'REJECTED':
      return 'rejected';
    case 'INACTIVE':
      return 'inactive';
    case 'DRAFT':
      return 'draft';
    default:
      return 'draft';
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
  primaryImage: p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url,
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
        <div className="h-7 w-20 rounded bg-ink/8 animate-pulse" />
      </div>
    </div>
  </article>
);

export const OwnerPGListPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [list, setList] = useState<PgListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    ownerApi
      .listPgs()
      .then((res) => {
        if (alive) setList(res.data || []);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof ApiError ? e.message : 'Could not load your PG listings.';
        toast.show({ variant: 'error', title: 'Failed to load PGs', message: msg });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [toast]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return list;
    return list.filter((p) => p.status === filter);
  }, [list, filter]);

  const keytagList = useMemo(() => filtered.map(mapToKeytag), [filtered]);

  const deleteItem = async (id: string) => {
    setActionInFlight(true);
    try {
      await ownerApi.softDeletePg(id);
      setList((prev) => prev.filter((p) => p.id !== id));
      toast.show({ variant: 'success', title: 'PG deleted', message: 'The listing has been removed.' });
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Please try again in a moment.';
      toast.show({ variant: 'error', title: 'Delete failed', message: msg });
    } finally {
      setActionInFlight(false);
      setConfirmDeleteId(null);
    }
  };

  const deactivateItem = async (id: string) => {
    setActionInFlight(true);
    try {
      const res = await ownerApi.updatePg(id, { status: 'INACTIVE' });
      setList((prev) => prev.map((p) => (p.id === id ? res.data : p)));
      toast.show({ variant: 'success', title: 'PG deactivated', message: 'The listing is no longer visible to students.' });
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Please try again in a moment.';
      toast.show({ variant: 'error', title: 'Could not deactivate', message: msg });
    } finally {
      setActionInFlight(false);
      setConfirmDeactivateId(null);
    }
  };

  const deleteTarget = list.find((p) => p.id === confirmDeleteId);
  const deactivateTarget = list.find((p) => p.id === confirmDeactivateId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink leading-tight">
            My PGs
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            {loading
              ? 'Loading your listings…'
              : list.length === 0
              ? 'No listings yet'
              : `You have ${list.length} listing${list.length === 1 ? '' : 's'} total`}
          </p>
        </div>
        <Button
          onClick={() => navigate('/dashboard/owner/add')}
          className="inline-flex items-center gap-2"
        >
          <Plus size={18} aria-hidden="true" /> List a PG
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Filter listings by status"
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
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo ${
                selected
                  ? 'bg-indigo text-sand shadow-sm'
                  : 'text-ink/70 hover:text-ink hover:bg-sand border border-transparent hover:border-indigo/20'
              }`}
            >
              {f.label}
              {f.key !== 'ALL' && (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                  selected ? 'bg-sand/20 text-sand' : 'bg-ink/5 text-ink/50'
                }`}>
                  {list.filter((p) => p.status === f.key).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div
          className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading PG listings"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : keytagList.length === 0 ? (
        <section
          aria-label="Empty state"
          className="rounded-2xl bg-white border border-ink/10 p-10 text-center shadow-sm"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-sand flex items-center justify-center text-indigo mb-4">
            <HomeIcon size={30} aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            {filter === 'ALL'
              ? 'No rooms listed yet'
              : `No ${filter.toLowerCase()} listings`}
          </h2>
          <p className="text-ink/60 mb-6 max-w-md mx-auto">
            {filter === 'ALL'
              ? 'Your first listing is one form away. Add photos, set a price, and students can find you today.'
              : 'Switch to a different status tab or create a new listing to get started.'}
          </p>
          <Link to="/dashboard/owner/add">
            <Button className="inline-flex items-center gap-2">
              <Plus size={18} aria-hidden="true" /> List a PG
            </Button>
          </Link>
        </section>
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {keytagList.map((pg) => (
            <PGKeytagCard
              key={pg.id}
              pg={pg}
              onEdit={() => navigate(`/dashboard/owner/add?edit=${pg.id}`)}
              onDeactivate={
                pg.status === 'active'
                  ? () => setConfirmDeactivateId(pg.id)
                  : undefined
              }
              onDelete={() => setConfirmDeleteId(pg.id)}
              onClick={() => navigate(`/dashboard/owner/add?edit=${pg.id}`)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        variant="destructive"
        title="Delete this PG listing?"
        description={
          deleteTarget ? (
            <>
              <span className="font-medium">{deleteTarget.name}</span> will be permanently removed from GeoNest. Students will no longer see it in search.
            </>
          ) : (
            'This listing will be permanently removed from GeoNest.'
          )
        }
        confirmLabel={actionInFlight ? 'Deleting…' : 'Yes, delete'}
        cancelLabel="Cancel"
        onCancel={() => !actionInFlight && setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && deleteItem(confirmDeleteId)}
      />

      <ConfirmDialog
        open={!!confirmDeactivateId}
        variant="warning"
        title="Deactivate this PG listing?"
        description={
          deactivateTarget ? (
            <>
              <span className="font-medium">{deactivateTarget.name}</span> will be hidden from students. You can reactivate it later from your list.
            </>
          ) : (
            'This listing will be hidden from students until you reactivate it.'
          )
        }
        confirmLabel={actionInFlight ? 'Deactivating…' : 'Deactivate'}
        cancelLabel="Keep active"
        onCancel={() => !actionInFlight && setConfirmDeactivateId(null)}
        onConfirm={() => confirmDeactivateId && deactivateItem(confirmDeactivateId)}
      />
    </div>
  );
};
