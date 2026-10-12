import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { EmptyState, PageHeader, RatingStars } from '../../components/shared';
import { MapContainer, TileLayer, Marker, GeoJSON } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = L.divIcon({ className: '', iconSize: [30,30], iconAnchor: [15,30],
  html: '<div style="background:#176ef5;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2);"></div>' });

export const AdminPGVerificationPage: React.FC = () => {
  const [pgs, setPgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [acting, setActing] = useState(false);
  const [indiaGeoJson, setIndiaGeoJson] = useState<any>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/AbhinavSwami28/india-official-geojson/main/india-states-simplified.geojson')
      .then(res => res.json())
      .then(data => setIndiaGeoJson(data))
      .catch(() => {});
  }, []);

  const load = async () => {
    try { const { data } = await api.get('/admin/pg/pending'); setPgs(data.pgs || []); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const verify = async (v: boolean) => {
    if (!selected) return;
    setActing(true);
    try {
      await api.put(`/admin/pg/${selected._id}/verify`, { verified: v });
      setSelected(null);
      load();
    } catch {}
    setActing(false);
  };

  return (
    <div>
      <PageHeader title="PG Verifications" subtitle={`${pgs.length} pending`} />
      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : pgs.length === 0 ? (
        <EmptyState title="No pending verifications" description="All submitted PGs have been reviewed." icon="✅" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            {pgs.map((pg) => (
              <button key={pg._id} onClick={() => setSelected(pg)} className={`w-full card p-4 text-left hover:shadow-card transition ${selected?._id === pg._id ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{pg.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{pg.address}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="badge bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 capitalize">{pg.genderPreference}</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">₹{pg.pricePerMonth.toLocaleString()}</span>
                      <RatingStars rating={null} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold">
                    {(pg.ownerId?.userId?.name || 'O')[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium dark:text-slate-200 truncate">{pg.ownerId?.userId?.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{pg.ownerId?.userId?.email}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            {!selected ? (
              <div className="card p-12 text-center text-slate-500 dark:text-slate-400">
                <div className="text-5xl mb-4">👈</div>
                Select a PG from the left to review.
              </div>
            ) : (
              <div className="card p-6 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold dark:text-slate-100">{selected.name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selected.address}, {selected.city}</p>
                    </div>
                    <span className="badge bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">Pending review</span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    <div><div className="text-xs text-slate-500 dark:text-slate-400">Rent</div><div className="font-semibold dark:text-slate-200">₹{selected.pricePerMonth.toLocaleString()}/mo</div></div>
                    <div><div className="text-xs text-slate-500 dark:text-slate-400">Deposit</div><div className="font-semibold dark:text-slate-200">₹{selected.securityDeposit.toLocaleString()}</div></div>
                    <div><div className="text-xs text-slate-500 dark:text-slate-400">Rooms</div><div className="font-semibold dark:text-slate-200">{selected.availableRooms}/{selected.totalRooms}</div></div>
                    <div><div className="text-xs text-slate-500 dark:text-slate-400">Gender</div><div className="font-semibold dark:text-slate-200 capitalize">{selected.genderPreference}</div></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold dark:text-slate-100 mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selected.amenities || []).map((a: any) => <span key={a._id} className="badge bg-sand-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">{a.name}</span>)}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold dark:text-slate-100 mb-2">Owner</h4>
                  <div className="p-4 bg-sand-50 dark:bg-slate-900/60 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center justify-center">{(selected.ownerId?.userId?.name || 'O')[0]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold dark:text-slate-100 truncate">{selected.ownerId?.userId?.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{selected.ownerId?.userId?.email} · {selected.ownerId?.userId?.phone}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold dark:text-slate-100 mb-2">Location</h4>
                  <div className="h-64 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <MapContainer key={selected._id} center={[selected.location.coordinates[1], selected.location.coordinates[0]]} zoom={16}>
                      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {indiaGeoJson && (
                        <GeoJSON 
                          data={indiaGeoJson} 
                          style={{ color: '#475569', weight: 1.5, fillOpacity: 0, dashArray: '3' }}
                          interactive={false}
                        />
                      )}
                      <Marker position={[selected.location.coordinates[1], selected.location.coordinates[0]]} icon={pinIcon} />
                    </MapContainer>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-slate-800">
                  <button onClick={() => verify(false)} disabled={acting} className="btn-danger flex-1">Reject</button>
                  <button onClick={() => verify(true)} disabled={acting} className="btn-primary flex-1">{acting ? 'Processing...' : '✓ Approve & Verify'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
