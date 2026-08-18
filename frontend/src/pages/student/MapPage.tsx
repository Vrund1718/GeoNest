import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import api from '../../lib/api';
import { PGListing } from '../../types';
import { RatingStars, PGCard, EmptyState } from '../../components/shared';
import { useNavigate } from 'react-router-dom';

const customIcon = (color: string) => L.divIcon({
  className: 'custom-pin',
  html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">🏠</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export const MapPage: React.FC = () => {
  const nav = useNavigate();
  const [query, setQuery] = useState('Nirma University');
  const [radiusKm, setRadiusKm] = useState(5);
  const [center, setCenter] = useState<[number, number]>([23.103, 72.5957]);
  const [results, setResults] = useState<PGListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoName, setGeoName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [geoRes, pgRes] = await Promise.all([
        api.get('/geo/search', { params: { query } }),
        api.get('/pg/search', { params: { query, radiusKm, sortBy: 'distance' } }),
      ]);
      if (geoRes.data?.lat != null) {
        setCenter([geoRes.data.lat, geoRes.data.lng]);
        setGeoName(geoRes.data.displayName || query);
      }
      setResults(pgRes.data.results || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [query, radiusKm]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const selected = useMemo(() => results.find((r) => r._id === selectedId) || null, [results, selectedId]);

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="col-span-1 lg:col-span-2 flex flex-col min-h-0">
        <form onSubmit={onSubmit} className="mb-4 flex gap-2">
          <input className="input flex-1" placeholder="College or city..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn-primary">🔍</button>
        </form>
        <div className="flex items-center gap-3 mb-4">
          <label className="label !mb-0 shrink-0">Radius:</label>
          <input type="range" min={1} max={15} value={radiusKm} className="flex-1 range-slider" onChange={(e) => setRadiusKm(parseInt(e.target.value))} />
          <span className="text-sm text-slate-600 font-medium w-12">{radiusKm} km</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="card h-32 animate-pulse bg-slate-100" />)
          ) : results.length === 0 ? (
            <EmptyState title="No PGs found in this area" description="Try adjusting the radius or searching another college." icon="📍" />
          ) : (
            results.map((pg) => (
              <div key={pg._id} onClick={() => { setSelectedId(pg._id); }} className={`cursor-pointer ${selectedId === pg._id ? 'ring-2 ring-brand-500 rounded-xl' : ''}`}>
                <PGCard pg={pg} to={`/pg/${pg._id}`} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="col-span-1 lg:col-span-3 min-h-[500px] relative">
        <div className="absolute top-3 left-3 z-[400] card px-3 py-2 text-xs text-slate-600 shadow-pop">
          📍 {geoName || query} · {results.length} PGs
        </div>
        <MapContainer center={center} zoom={14} className="h-full min-h-[500px] shadow-card border border-slate-200">
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={center} icon={customIcon('#16a34a')}>
            <Popup><div className="text-sm"><strong>{query}</strong></div><div className="text-xs text-slate-500 mt-1">{geoName}</div></Popup>
          </Marker>
          <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#2d8dff', fillColor: '#2d8dff', fillOpacity: 0.08, weight: 2 }} />
          {results.map((pg) => {
            const [lng, lat] = pg.location.coordinates;
            const color = pg.genderPreference === 'male' ? '#0284c7' : pg.genderPreference === 'female' ? '#db2777' : '#64748b';
            return (
              <Marker key={pg._id} position={[lat, lng]} icon={customIcon(color)} eventHandlers={{ click: () => setSelectedId(pg._id) }}>
                <Popup>
                  <div className="w-56">
                    <div className="font-semibold">{pg.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{pg.address}</div>
                    <div className="mt-2 flex items-center gap-2"><RatingStars rating={pg.averageRating} /> <span className="text-xs text-slate-500">({pg.reviewCount || 0})</span></div>
                    <div className="mt-2 flex items-end justify-between">
                      <div><span className="text-lg font-bold text-brand-700">₹{pg.pricePerMonth.toLocaleString()}</span><span className="text-xs text-slate-500">/mo</span></div>
                      <button onClick={() => nav(`/pg/${pg._id}`)} className="btn-primary !py-1 !px-3 text-xs">View</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {selected && (
          <div className="absolute bottom-4 left-4 right-4 card shadow-pop p-4 z-[400]">
            <div className="flex gap-4">
              <img src={selected.primaryImage || ''} className="w-28 h-28 rounded-lg object-cover bg-slate-100 flex-shrink-0" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{selected.name}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">{selected.address}, {selected.city}</div>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="btn-ghost !px-2 !py-1 text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xl font-bold text-brand-700">₹{selected.pricePerMonth.toLocaleString()}</span>
                  <span className="badge bg-slate-100">{selected.availableRooms}/{selected.totalRooms} rooms</span>
                  {selected.distanceMeters != null && <span className="badge bg-sky-50 text-sky-700">{Math.round(selected.distanceMeters)} m</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => nav(`/pg/${selected._id}`)} className="btn-primary text-sm">View details →</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
