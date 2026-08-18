import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { PGListing } from '../../types';
import { EmptyState, PageHeader } from '../../components/shared';

export const OwnerPGListPage: React.FC = () => {
  const nav = useNavigate();
  const [pgs, setPgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/owners/pg');
      setPgs(data.pgs || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const softDel = async (id: string) => {
    if (!confirm('Soft delete this PG listing?')) return;
    try { await api.delete(`/owners/pg/${id}`); load(); } catch {}
  };

  return (
    <div>
      <PageHeader title="My PG Listings" subtitle={`${pgs.length} total listings`} actions={
        <Link to="/owner/pg/new" className="btn-primary">+ Add new PG</Link>
      } />
      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-sand-100" />)}</div>
      ) : pgs.length === 0 ? (
        <EmptyState title="You haven't listed any PGs yet" description="Add your first paying guest accommodation to start receiving booking requests." icon="🏢" action={<Link to="/owner/pg/new" className="btn-primary">+ Add new PG</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink/15">
              <thead className="bg-sand-50/70"><tr>
                <th className="table-header">PG</th>
                <th className="table-header">Location</th>
                <th className="table-header">Price</th>
                <th className="table-header">Rooms</th>
                <th className="table-header">Status</th>
                <th className="table-header">Verified</th>
                <th className="table-header"></th>
              </tr></thead>
              <tbody className="divide-y divide-ink/10">
                {pgs.map((pg) => (
                  <tr key={pg._id} className="hover:bg-sand-50/60 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {pg.primaryImage ? <img src={pg.primaryImage} className="w-12 h-12 rounded-md object-cover bg-sand-100 ring-1 ring-ink/10" /> : <div className="w-12 h-12 rounded-md bg-sand-100 grid place-items-center ring-1 ring-ink/10">🏠</div>}
                        <div>
                          <div className="font-medium text-ink-700">{pg.name}</div>
                          <div className="text-xs text-ink/55 capitalize">{pg.genderPreference} · {pg.collegeName || pg.city}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell max-w-xs truncate">{pg.address}</td>
                    <td className="table-cell font-medium text-ink-700">₹{pg.pricePerMonth.toLocaleString()}/mo</td>
                    <td className="table-cell">{pg.availableRooms}/{pg.totalRooms}</td>
                    <td className="table-cell">
                      <span className={`badge capitalize ring-1 ${pg.status === 'active' ? 'bg-sage/10 text-sage ring-sage/20' : pg.status === 'inactive' ? 'bg-marigold-50 text-marigold-600 ring-marigold-100' : 'bg-sand-100 text-ink/60 ring-ink/10'}`}>{pg.status}</span>
                    </td>
                    <td className="table-cell">
                      {pg.isVerified ? <span className="badge bg-sage/10 text-sage ring-1 ring-sage/20">✓ Yes</span> : <span className="badge bg-marigold-50 text-marigold-600 ring-1 ring-marigold-100">Pending</span>}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => nav(`/owner/pg/${pg._id}/edit`)} className="btn-secondary !py-1 !px-2.5 text-xs">Edit</button>
                        <button onClick={() => nav(`/owner/pg/${pg._id}/images`)} className="btn-secondary !py-1 !px-2.5 text-xs">Images</button>
                        <button onClick={() => softDel(pg._id)} className="btn-danger !py-1 !px-2.5 text-xs">Delete</button>
                      </div>
                    </td>
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
