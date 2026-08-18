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
    r === 'admin' ? 'bg-purple-50 text-purple-700' :
    r === 'owner' ? 'bg-amber-50 text-amber-700' :
    'bg-sky-50 text-sky-700';

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.length} total`} actions={
        <select className="input w-48" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="owner">Owners</option>
          <option value="admin">Admins</option>
        </select>
      } />
      {loading ? (
        <div className="space-y-2">{Array.from({length:8}).map((_,i) => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState title="No users" icon="👥" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-surface-50"><tr>
                <th className="table-header">User</th>
                <th className="table-header">Role</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Joined</th>
                <th className="table-header text-right">Bookings</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-semibold text-sm flex items-center justify-center">{u.name[0]}</div>
                        <div>
                          <div className="font-medium text-slate-800">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell"><span className={`badge capitalize ${roleBadge(u.role)}`}>{u.role}</span></td>
                    <td className="table-cell text-slate-600">{u.phone}</td>
                    <td className="table-cell text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="table-cell text-right font-medium">{u.bookingsCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
