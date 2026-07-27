import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ComplaintsTable } from '../../components/ComplaintsTable';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { adminApi, ApiError, Complaint } from '../../services/api';

export const AdminComplaintsPage = () => {
  const toast = useToast();
  const [list, setList] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<
    Record<string, Complaint['status'] | undefined>
  >({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const setNoteDraft = useCallback((id: string, value: string) => {
    setNoteDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const load = () => {
    setLoading(true);
    let alive = true;
    adminApi
      .listComplaints()
      .then((res) => {
        if (alive) setList(res.data || []);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg =
          e instanceof ApiError ? e.message : 'Could not load complaints.';
        toast.show({
          variant: 'error',
          title: 'Failed to load complaints',
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

  const openCount = list.filter(
    (c) => c.status === 'REQUESTED' || c.status === 'IN_PROGRESS'
  ).length;

  const onStatusChange = useCallback(
    async (
      id: string,
      status: Complaint['status'],
      adminNote?: string
    ): Promise<{ ok: true; updated: Complaint } | { ok: false; error: string }> => {
      const original = list.find((c) => c.id === id);
      if (!original) return { ok: false, error: 'Complaint not found' };

      setUpdatingIds((prev) => ({ ...prev, [id]: status }));
      // Optimistic update: show new status immediately in UI even before API returns
      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status,
                resolvedAt:
                  status === 'RESOLVED' && !c.resolvedAt
                    ? new Date().toISOString()
                    : c.resolvedAt,
              }
            : c
        )
      );

      try {
        const res = await adminApi.updateComplaint(id, status, adminNote);
        const updated = res.data;
        setList((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
        );
        toast.show({
          variant: 'success',
          title: 'Complaint updated',
          message: `Status set to ${status
            .toLowerCase()
            .replace('_', ' ')}.`,
        });
        return { ok: true, updated };
      } catch (e: unknown) {
        // Revert optimistic update on failure
        setList((prev) =>
          prev.map((c) => (c.id === id ? original : c))
        );
        const msg =
          e instanceof ApiError ? e.message : 'Please try again in a moment.';
        toast.show({
          variant: 'error',
          title: 'Update failed',
          message: msg,
        });
        return { ok: false, error: msg };
      } finally {
        setUpdatingIds((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [list, toast]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink leading-tight">
            Complaints
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            {loading
              ? 'Loading complaints…'
              : list.length === 0
              ? 'No complaints on record.'
              : `${list.length} total complaint${
                  list.length === 1 ? '' : 's'
                } across the platform.`}
          </p>
        </div>
        <StatusBadge variant={openCount > 0 ? 'requested' : 'verified'}>
          <span className="font-mono">{openCount}</span>
          <span className="ml-1">
            {openCount === 1 ? 'open case' : 'open cases'}
          </span>
        </StatusBadge>
      </div>

      {!loading && openCount > 0 && (
        <section
          aria-label="Open complaints alert"
          className="rounded-xl bg-marigold/10 border border-marigold/20 text-ink p-4 flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-marigold/15 text-marigold flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} aria-hidden="true" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-ink mb-0.5">
              {openCount} {openCount === 1 ? 'case' : 'cases'} need attention
            </p>
            <p className="text-ink/60">
              Requested or in-progress items below — students and owners are
              waiting for a response.
            </p>
          </div>
        </section>
      )}

      <ComplaintsTable
        complaints={list}
        loading={loading}
        updatingIds={updatingIds}
        noteDrafts={noteDrafts}
        setNoteDraft={setNoteDraft}
        onStatusChange={onStatusChange}
      />
    </div>
  );
};
