import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  Home as HomeIcon,
  GraduationCap,
  UserCircle2,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import {
  adminApi,
  ApiError,
  UserSummary,
} from '../../services/api';

type RoleFilter = 'ALL' | UserSummary['role'];
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const ROLE_FILTERS: { key: RoleFilter; label: string; Icon: typeof Users }[] = [
  { key: 'ALL', label: 'All', Icon: Users },
  { key: 'student', label: 'Students', Icon: GraduationCap },
  { key: 'owner', label: 'Owners', Icon: HomeIcon },
  { key: 'admin', label: 'Admins', Icon: Shield },
];

const roleVariant = (role: UserSummary['role']) => {
  switch (role) {
    case 'admin':
      return 'verified' as const;
    case 'owner':
      return 'in-progress' as const;
    default:
      return 'draft' as const;
  }
};

const SkeletonRow = () => (
  <tr aria-hidden="true" className="animate-pulse align-top">
    <td className="px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-ink/10" />
        <div className="space-y-1 flex-1 min-w-0">
          <div className="h-4 w-40 rounded bg-ink/10" />
          <div className="h-3 w-48 rounded bg-ink/5" />
        </div>
      </div>
    </td>
    <td className="px-4 py-4">
      <div className="h-6 w-20 rounded-full bg-ink/10" />
    </td>
    <td className="px-4 py-4">
      <div className="h-6 w-20 rounded-full bg-ink/10" />
    </td>
    <td className="px-4 py-4">
      <div className="h-3.5 w-28 rounded bg-ink/10" />
    </td>
    <td className="px-4 py-4">
      <div className="h-8 w-24 rounded bg-ink/10" />
    </td>
  </tr>
);

const PAGE_SIZE = 10;

export const AdminUsersPage = () => {
  const toast = useToast();
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [active, setActive] = useState<ActiveFilter>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(() => {
    setLoading(true);
    let alive = true;
    const filters: Parameters<typeof adminApi.listUsers>[0] = {
      page,
    limit: PAGE_SIZE,
    };
    if (role !== 'ALL') filters.role = role;
    if (active !== 'ALL') filters.status = active;
    if (query.trim()) filters.query = query.trim();
    adminApi
      .listUsers(filters)
      .then((res) => {
        if (!alive) return;
        setList(res.data || []);
        setTotal(res.total ?? res.data?.length ?? 0);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg =
          e instanceof ApiError ? e.message : 'Could not load users.';
        toast.show({
          variant: 'error',
          title: 'Failed to load users',
          message: msg,
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [role, active, query, page, toast]);

  useEffect(fetchUsers, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleActive = async (user: UserSummary) => {
    const nextActive = user.status !== 'ACTIVE';
    setTogglingIds((prev) => ({ ...prev, [user.id]: nextActive }));
    const original = user;
    setList((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? { ...u, status: nextActive ? 'ACTIVE' : 'INACTIVE' }
          : u
      )
    );
    try {
      await adminApi.toggleUserActive(user.id, nextActive);
      toast.show({
        variant: 'success',
        title: nextActive ? 'User activated' : 'User deactivated',
        message: nextActive
          ? `${user.name} can now sign in to GeoNest.`
          : `${user.name} will be prevented from signing in until reactivated.`,
      });
    } catch (e: unknown) {
      setList((prev) => prev.map((u) => (u.id === user.id ? original : u)));
      const msg =
        e instanceof ApiError ? e.message : 'Please try again.';
      toast.show({
        variant: 'error',
        title: 'Could not update user',
        message: msg,
      });
    } finally {
      setTogglingIds((prev) => {
        const n = { ...prev };
        delete n[user.id];
        return n;
      });
    }
  };

  const formatDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink leading-tight">
            Manage Users
          </h1>
          <p className="text-ink/60 text-sm mt-1">
              {loading
                ? 'Loading users…'
                : total === 0
                ? 'No users match your filters.'
                : `${total.toLocaleString('en-IN')} registered user${
                    total === 1 ? '' : 's'
                  } on GeoNest.`}
            </p>
        </div>
        <StatusBadge variant="draft">
          <span className="font-mono">{total}</span>
          <span className="ml-1">total</span>
        </StatusBadge>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <aside
          aria-label="User filters"
          className="lg:col-span-3 xl:col-span-3 space-y-4"
        >
          <div className="rounded-2xl bg-white border border-ink/10 p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo/10 text-indigo flex items-center justify-center">
                <Filter size={16} aria-hidden="true" />
              </div>
              <h2 className="font-display font-semibold text-ink">Filters</h2>
            </div>

            <div>
              <label
                htmlFor="user-search"
                className="block text-xs font-medium text-ink/60 uppercase tracking-wider mb-2"
              >
                Search
              </label>
              <div className="relative">
                <Search
                size={16}
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none"
                />
                <input
                  id="user-search"
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Name or email…"
                  className="w-full rounded-xl border border-ink/15 pl-9 pr-3 py-2 text-sm bg-white text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-indigo focus:border-indigo/30"
                />
              </div>
            </div>

            <div>
              <p className="block text-xs font-medium text-ink/60 uppercase tracking-wider mb-2">
                Role
              </p>
              <div className="grid gap-1.5">
                {ROLE_FILTERS.map((f) => {
                  const sel = role === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setRole(f.key);
                        setPage(1);
                      }}
                      className={`w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo ${
                        sel
                          ? 'bg-indigo text-sand shadow-sm'
                          : 'text-ink/80 hover:bg-sand border border-transparent hover:border-indigo/15'
                      }`}
                    >
                      <f.Icon size={16} aria-hidden="true" />
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="block text-xs font-medium text-ink/60 uppercase tracking-wider mb-2">
                Account status
              </p>
              <div
                role="radiogroup"
                aria-label="Active status filter"
                className="grid grid-cols-3 gap-1.5"
              >
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((k) => {
                  const sel = active === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => {
                        setActive(k);
                        setPage(1);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo ${
                        sel
                          ? 'bg-indigo text-sand border-indigo'
                          : 'bg-white text-ink/80 border-ink/15 hover:bg-sand/60 hover:border-indigo/30'
                      }`}
                    >
                      {k.toLowerCase() === 'all' ? 'All' : k.slice(0, 1).toUpperCase() + k.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <section
          aria-label="Users table"
          className="lg:col-span-9 xl:col-span-9"
        >
          {loading ? (
            <div
              className="rounded-2xl bg-white border border-ink/10 shadow-sm overflow-hidden"
              aria-busy="true"
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-sand/40 border-b border-ink/10 text-left">
                      {['User', 'Role', 'Status', 'Joined', 'Action'].map(
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
                    {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl bg-white border border-ink/10 p-10 text-center shadow-sm">
              <div className="mx-auto w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center text-sage mb-4">
                <Users size={30} aria-hidden="true" />
              </div>
              <h2 className="font-display text-xl font-semibold text-ink mb-2">
                No users match these filters
              </h2>
              <p className="text-ink/60 max-w-md mx-auto">
                Try clearing the role / search or switching account status toggle to cast a wider net.
              </p>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRole('ALL');
                    setActive('ALL');
                    setQuery('');
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white border border-ink/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-sand/40 border-b border-ink/10 text-left">
                        <th
                          scope="col"
                          className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                        >
                          User
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                        >
                          Role
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
                          Joined
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-[11px] uppercase tracking-wider text-ink/50 font-semibold"
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {list.map((u) => {
                        const toggling = togglingIds[u.id];
                        return (
                          <tr
                            key={u.id} className="align-top">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo/10 text-indigo flex items-center justify-center flex-shrink-0">
                                  <UserCircle2 size={18} aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-ink leading-tight">
                                    {u.name}
                                  </p>
                                  <a
                                    href={`mailto:${u.email}`}
                                    className="text-xs text-ink/55 hover:text-indigo block truncate"
                                  >
                                    {u.email}
                                  </a>
                                  {u.phone && (
                                    <span className="text-[11px] font-mono text-ink/45 block">
                                      {u.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <StatusBadge variant={roleVariant(u.role)}>
                                {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                              </StatusBadge>
                            </td>
                            <td className="px-4 py-4">
                              <StatusBadge
                                variant={
                                  u.status === 'ACTIVE' ? 'verified' : 'inactive'
                                }
                              >
                                {u.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                              </StatusBadge>
                            </td>
                            <td className="px-4 py-4 text-sm text-ink/60 font-mono whitespace-nowrap">
                              {formatDate(u.createdAt)}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => void toggleActive(u)}
                                disabled={toggling !== undefined}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo disabled:opacity-60 disabled:cursor-not-allowed ${
                                  u.status === 'ACTIVE'
                                    ? 'text-marigold border-marigold/40 hover:bg-marigold/10'
                                    : 'text-sage border-sage/40 hover:bg-sage/10'
                                }`}
                                aria-busy={toggling !== undefined}
                              >
                                {toggling !== undefined ? (
                                  <>
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                      aria-hidden="true"
                                    />{' '}
                                    Updating…
                                  </>
                                ) : u.status === 'ACTIVE' ? (
                                  'Deactivate'
                                ) : (
                                  'Activate'
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-ink/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-ink/50">
                    Showing page{' '}
                    <span className="font-mono text-ink">{page}</span> of{' '}
                    <span className="font-mono text-ink">{totalPages}</span>
                  </p>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                      className="p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span
                      aria-hidden="true" className="sr-only">
                      Page {page}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || loading}
                      className="p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
