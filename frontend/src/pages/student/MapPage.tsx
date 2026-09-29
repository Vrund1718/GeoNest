import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../lib/api';
import { PGListing } from '../../types';
import { RatingStars, PGCard, EmptyState } from '../../components/shared';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { MapPin, Search, List, Map as MapIcon, X, ExternalLink } from 'lucide-react';

const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
    // Safe invalidateSize call to fix grey tiles on view change
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [center, map]);
  return null;
};

const MapInvalidator: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const customIcon = (color: string) => L.divIcon({
  className: 'custom-pin',
  html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">🏠</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export const MapPage: React.FC = () => {
  const nav = useNavigate();
  const { theme } = useTheme();
  const [query, setQuery] = useState('Nirma University');
  const [radiusKm, setRadiusKm] = useState(5);
  const [center, setCenter] = useState<[number, number]>([23.103, 72.5957]);
  const [results, setResults] = useState<PGListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoName, setGeoName] = useState('');
  const [indiaGeoJson, setIndiaGeoJson] = useState<any>(null);

  // Mobile View Tab: 'list' | 'map'
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('map');

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/AbhinavSwami28/india-official-geojson/main/india-states-simplified.geojson')
      .then(res => res.json())
      .then(data => setIndiaGeoJson(data))
      .catch(() => {});
  }, []);

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
    <div className="flex flex-col h-[calc(100dvh-6rem)] max-w-7xl mx-auto">
      {/* Mobile Tab Toggle */}
      <div className="flex lg:hidden bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-ink/10 dark:border-slate-700 mb-3 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
            mobileTab === 'list'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-ink/70 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-700'
          }`}
        >
          <List className="w-4 h-4" />
          <span>List View ({results.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
            mobileTab === 'map'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-ink/70 dark:text-slate-300 hover:bg-sand-100 dark:hover:bg-slate-700'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>Map View</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* Left Column: Search & List */}
        <div className={`col-span-1 lg:col-span-2 flex-col min-h-0 ${mobileTab === 'list' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="card p-3 sm:p-4 mb-3">
            <form onSubmit={onSubmit} className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 dark:text-slate-500 pointer-events-none" />
                <input
                  className="input pl-9"
                  placeholder="College or city..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button className="btn-primary min-h-[44px] px-4">Search</button>
            </form>
            <div className="flex items-center gap-3">
              <label className="label !mb-0 shrink-0 text-xs sm:text-sm">Radius:</label>
              <input
                type="range"
                min={1}
                max={15}
                value={radiusKm}
                className="flex-1 range-slider"
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              />
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium w-12 text-right">{radiusKm} km</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="card h-32 animate-pulse bg-slate-100 dark:bg-slate-700/50" />)
            ) : results.length === 0 ? (
              <EmptyState title="No PGs found in this area" description="Try adjusting the radius or searching another college." icon="📍" />
            ) : (
              results.map((pg) => (
                <div
                  key={pg._id}
                  onClick={() => {
                    setSelectedId(pg._id);
                    if (window.innerWidth < 1024) {
                      setMobileTab('map');
                    }
                  }}
                  className={`cursor-pointer transition-all ${selectedId === pg._id ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 rounded-2xl shadow-md' : ''}`}
                >
                  <PGCard pg={pg} to={`/pg/${pg._id}`} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Map View Container */}
        <div className={`col-span-1 lg:col-span-3 min-h-[350px] lg:min-h-0 relative flex flex-col rounded-2xl overflow-hidden border border-ink/10 dark:border-slate-700 shadow-card ${mobileTab === 'map' ? 'flex flex-1' : 'hidden lg:flex'}`}>
          <div className="absolute top-3 left-3 z-[400] card px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium shadow-pop flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span>{geoName || query} · {results.length} PGs</span>
          </div>

          <MapContainer center={center} zoom={14} className="w-full h-full min-h-[350px] flex-1">
            <MapRecenter center={center} />
            <MapInvalidator />
            <TileLayer
              key={theme}
              attribution={
                theme === 'dark'
                  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              }
              url={
                theme === 'dark'
                  ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />
            {indiaGeoJson && (
              <GeoJSON 
                data={indiaGeoJson} 
                style={{ color: '#475569', weight: 1.5, fillOpacity: 0, dashArray: '3' }}
                interactive={false}
              />
            )}
            <Marker position={center} icon={customIcon('#16a34a')}>
              <Popup><div className="text-sm"><strong>{query}</strong></div><div className="text-xs text-slate-500 mt-1">{geoName}</div></Popup>
            </Marker>
            <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.08, weight: 2 }} />
            {results.map((pg) => {
              const [lng, lat] = pg.location.coordinates;
              const color = pg.genderPreference === 'male' ? '#0284c7' : pg.genderPreference === 'female' ? '#db2777' : '#64748b';
              return (
                <Marker key={pg._id} position={[lat, lng]} icon={customIcon(color)} eventHandlers={{ click: () => setSelectedId(pg._id) }}>
                  <Popup>
                    <div className="w-52 sm:w-56 p-1">
                      <div className="font-semibold text-sm">{pg.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{pg.address}</div>
                      <div className="mt-1.5 flex items-center gap-1">
                        <RatingStars rating={pg.averageRating} />
                        <span className="text-xs text-slate-500">({pg.reviewCount || 0})</span>
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <span className="text-base font-bold text-indigo-600">₹{pg.pricePerMonth.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-500">/mo</span>
                        </div>
                        <button onClick={() => nav(`/pg/${pg._id}`)} className="btn-primary !py-1 !px-2.5 text-xs min-h-[32px]">View</button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating Selected PG Card for mobile/desktop */}
          {selected && (
            <div className="absolute bottom-3 left-3 right-3 card shadow-2xl p-3 sm:p-4 z-[400] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs border dark:border-slate-700 animate-in slide-in-from-bottom duration-150">
              <div className="flex gap-3 items-center">
                <img
                  src={selected.primaryImage || ''}
                  alt=""
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-slate-100 dark:bg-slate-700 shrink-0"
                  onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{selected.name}</h3>
                    <button onClick={() => setSelectedId(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[32px] min-h-[32px] flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{selected.address}, {selected.city}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{selected.pricePerMonth.toLocaleString()}</span>
                    <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]">{selected.availableRooms}/{selected.totalRooms} rooms</span>
                    {selected.distanceMeters != null && (
                      <span className="badge bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[11px]">{Math.round(selected.distanceMeters)} m</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <button onClick={() => nav(`/pg/${selected._id}`)} className="btn-primary text-xs py-1 px-3 min-h-[34px] flex items-center gap-1">
                      <span>View details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
