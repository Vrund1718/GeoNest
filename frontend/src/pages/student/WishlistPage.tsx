import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { WishlistEntry } from '../../types';
import { PGCard, EmptyState, PageHeader } from '../../components/shared';

export const WishlistPage: React.FC = () => {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/wishlist/me');
      setEntries(data.wishlist || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (pgId: string) => {
    try {
      await api.post(`/pg/${pgId}/wishlist`);
      load();
    } catch {}
  };

  return (
    <div>
      <PageHeader title="My Wishlist" subtitle={`${entries.length} saved PG${entries.length === 1 ? '' : 's'}.`} />
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({length:6}).map((_,i) => <div key={i} className="card aspect-[4/5] animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState title="Your wishlist is empty" description="While you search for PGs, tap the star to save favorites here." icon="⭐" action={<Link to="/student/search" className="btn-primary">Browse PGs</Link>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {entries.map((e) => {
            const pg = e.pgId as any;
            return (
              <div key={e._id} className="relative">
                <PGCard pg={pg} to={`/pg/${pg._id}`} />
                <button
                  onClick={() => remove(pg._id)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 text-amber-500 flex items-center justify-center hover:bg-slate-50"
                  title="Remove"
                >★</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
