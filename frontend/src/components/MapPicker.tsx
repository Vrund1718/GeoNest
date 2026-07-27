import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin } from 'lucide-react';

interface LatLng {
  lat: number;
  lng: number;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface MapPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng | null) => void;
  className?: string;
}

const DEFAULT_CENTER: LatLng = { lat: 23.0225, lng: 72.5714 };

const defaultIcon = L.icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToController({ center }: { center: LatLng | null }) {
  const map = useMap();
  const didInitial = useRef(false);

  useEffect(() => {
    if (!center) {
      if (!didInitial.current) {
        didInitial.current = true;
        map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 5);
      }
      return;
    }
    map.flyTo([center.lat, center.lng], 16, {
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 0.8,
    });
  }, [center, map]);

  return null;
}

function MarkerBounceController({ trigger }: { trigger: number }) {
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const map = useMap();
  useEffect(() => {
    if (trigger === 0 || reduced) return;
    const markers = map.getPane('markerPane')?.querySelectorAll('.leaflet-marker-icon');
    markers?.forEach((m) => {
      m.classList.remove('marker-bounce');
      void (m as HTMLElement).offsetWidth;
      m.classList.add('marker-bounce');
    });
  }, [trigger, map, reduced]);
  return null;
}

function ClickHandler({
  onChange,
}: {
  onChange: (value: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export const MapPicker = ({ value, onChange, className = '' }: MapPickerProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bounceTrigger, setBounceTrigger] = useState(0);
  const lastFetch = useRef<number>(0);
  const debounceTimer = useRef<number | null>(null);

  const markerPosition: [number, number] | null = value
    ? [value.lat, value.lng]
    : null;

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const url =
        'https://nominatim.openstreetmap.org/search' +
        `?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });
      if (!res.ok) throw new Error('Search request failed');
      const data = (await res.json()) as NominatimResult[];
      if (Date.now() > lastFetch.current) {
        setResults(data);
      }
    } catch (e) {
      setError('Address search unavailable right now. You can still click the map to place a pin.');
    } finally {
      setSearching(false);
    }
  };

  const onQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceTimer.current != null) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      lastFetch.current = Date.now();
      void runSearch(v);
    }, 350);
  };

  const pickResult = (r: NominatimResult) => {
    const coords = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    onChange(coords);
    setResults([]);
    setQuery(r.display_name);
    setBounceTrigger((n) => n + 1);
  };

  return (
    <div className={`${className}`}>
      <div className="relative mb-3">
        <label htmlFor="map-address-search" className="sr-only">
          Search address
        </label>
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
          aria-hidden="true"
        />
        <input
          id="map-address-search"
          type="text"
          value={query}
          onChange={onQueryChange}
          placeholder="Search address, area, or landmark…"
          className="w-full pl-10 pr-4 py-2.5 border border-ink/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent transition-all duration-150 ease-out hover:border-indigo hover:shadow-sm motion-reduce:transition-none"
          autoComplete="off"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span
              className="inline-block h-4 w-4 border-2 border-indigo/30 border-t-indigo rounded-full animate-spin"
              aria-label="Searching…"
            />
          </div>
        )}
        {results.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1 bg-white border border-ink/10 rounded-lg shadow-lg overflow-hidden"
          >
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  role="option"
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo/5 focus:bg-indigo/10 focus:outline-none border-b border-ink/5 last:border-b-0 flex items-start gap-2"
                >
                  <MapPin size={16} className="mt-0.5 text-indigo flex-shrink-0" aria-hidden="true" />
                  <span className="line-clamp-2 text-ink">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-xs text-coral mb-2" role="alert">{error}</p>
      )}

      <div
        className="rounded-xl overflow-hidden border border-ink/10 shadow-sm"
        style={{ height: 360 }}
      >
        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={5}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToController center={value} />
          <MarkerBounceController trigger={bounceTrigger} />
          <ClickHandler
            onChange={(c) => {
              onChange(c);
              setBounceTrigger((n) => n + 1);
            }}
          />
          {markerPosition && (
            <Marker
              draggable
              position={markerPosition}
              icon={defaultIcon}
              eventHandlers={{
                dragend(e) {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  onChange({ lat: ll.lat, lng: ll.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-ink/50">
          Click anywhere on the map or drag the pin to fine-tune the exact location.
        </p>
        {value && (
          <code className="font-mono text-xs text-ink bg-sand px-2.5 py-1 rounded-md border border-ink/10" aria-label="Selected coordinates">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </code>
        )}
      </div>
    </div>
  );
};

export type { LatLng, NominatimResult };
