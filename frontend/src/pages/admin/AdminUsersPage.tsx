import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { EmptyState, PageHeader } from '../../components/shared';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const params = filterRole ? { role: filterRole } : {};
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterRole]);

  const roleBadge = (r: string) =>
    r === 'admin' ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300' :
    r === 'owner' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300' :
    'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300';

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Users" subtitle={`${users.length} total`} actions={
        <select className="input w-full sm:w-48" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="owner">Owners</option>
          <option value="admin">Admins</option>
        </select>
      } />

      {loading ? (
        <div className="space-y-3">{Array.from({length:8}).map((_,i) => <div key={i} className="card h-16 animate-pulse bg-sand-100 dark:bg-slate-700/50" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState title="No users found" icon="👥" />
      ) : (
        <div className="table-container card overflow-hidden">
          <table className="w-full divide-y divide-ink/10 dark:divide-slate-700">
            <thead className="bg-sand-50/60 dark:bg-slate-900/50">
              <tr>
                <th className="table-header">User</th>
                <th className="table-header">Role</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Joined</th>
                <th className="table-header text-right">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-sand-50/50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-sm flex items-center justify-center shrink-0">
                        {(u.name || 'U')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-ink-700 dark:text-slate-100 text-sm">{u.name || 'User'}</div>
                        <div className="text-xs text-ink/55 dark:text-slate-400 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell"><span className={`badge capitalize ${roleBadge(u.role)}`}>{u.role}</span></td>
                  <td className="table-cell text-ink/70 dark:text-slate-300 text-sm">{u.phone}</td>
                  <td className="table-cell text-xs text-ink/55 dark:text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="table-cell text-right font-medium text-ink-700 dark:text-slate-200">{u.bookingsCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
