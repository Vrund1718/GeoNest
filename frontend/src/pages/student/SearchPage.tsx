import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import api from '../../lib/api';
import { PGCard, EmptyState, RatingStars } from '../../components/shared';
import { PGListing, SearchFilters } from '../../types';
import { useNavigate } from 'react-router-dom';

const ALL_AMENITIES = ['Wi-Fi', 'Mess', 'Laundry', '24/7 Water', 'AC', 'Parking', 'Gym', 'CCTV', 'Security', 'Lift', 'Study Room'];

export const SearchPage: React.FC = () => {
  const nav = useNavigate();
  const [filters, setFilters] = useState<SearchFilters>({
    query: 'Nirma University',
    radiusKm: 5,
    minPrice: undefined,
    maxPrice: undefined,
    genderPreference: undefined,
    amenities: [],
    sortBy: 'recommended',
  });
  const [results, setResults] = useState<PGListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('Nirma University');
  const [err, setErr] = useState<string | null>(null);

  // Suggestion states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchInput.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setLoadingSuggestions(true);
      try {
        const { data } = await api.get('/pg/suggestions', {
          params: { q: searchInput },
          signal: abortControllerRef.current.signal,
        });
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
        setActiveIndex(-1);
      } catch (e: any) {
        if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
          console.error('Suggestions fetch failed', e);
        }
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => {
      clearTimeout(debounceTimer);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [searchInput]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params: Record<string, any> = {
        query: filters.query,
        radiusKm: filters.radiusKm,
        sortBy: filters.sortBy,
      };
      if (filters.minPrice != null) params.minPrice = filters.minPrice;
      if (filters.maxPrice != null) params.maxPrice = filters.maxPrice;
      if (filters.genderPreference) params.genderPreference = filters.genderPreference;
      if (filters.amenities.length > 0) params.amenities = filters.amenities.join(',');

      const { data } = await api.get('/pg/search', { params });
      setResults(data.results || []);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Search failed');
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { runSearch(); }, [runSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setFilters({ ...filters, query: searchInput.trim() || 'Ahmedabad' });
  };

  const onSuggestionClick = (s: any) => {
    setSearchInput(s.name);
    setShowSuggestions(false);
    nav(`/pg/${s._id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onSuggestionClick(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <strong key={i} className="text-indigo-600">{part}</strong> 
            : part
        )}
      </span>
    );
  };

  const toggleAmenity = (a: string) => setFilters((f) => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

  const priceRange = useMemo(() => {
    const prices = results.map((r) => r.pricePerMonth).filter(Boolean);
    return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 5000, max: 20000 };
  }, [results]);

  return (
    <div>
      <div className="card p-4 mb-6">
        <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative" ref={searchRef}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="input pl-10"
              placeholder="Search college or city, e.g. Nirma University"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => searchInput.trim() && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
            />
            
            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {loadingSuggestions ? (
                  <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    Finding suggestions...
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => onSuggestionClick(s)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${i === activeIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                          {s.primaryImage ? (
                            <img src={s.primaryImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">🏠</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 truncate">
                            {highlightMatch(s.name, searchInput)}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                            <span>📍</span>
                            {highlightMatch(s.city || s.address || '', searchInput)}
                            {s.collegeName && (
                              <>
                                <span className="mx-1">·</span>
                                {highlightMatch(s.collegeName, searchInput)}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-indigo-600">₹{s.pricePerMonth}</div>
                          {s.averageRating && (
                            <div className="text-[10px] text-amber-500 flex items-center justify-end gap-0.5">
                              <span>⭐</span>
                              {s.averageRating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                    <button
                      type="submit"
                      className="w-full p-2 text-center text-xs font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors border-t border-slate-100"
                    >
                      See all results for "{searchInput}"
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No PGs found for "{searchInput}"
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="w-full md:w-40">
            <select className="input" value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}>
              <option value="recommended">Recommended</option>
              <option value="distance">Distance</option>
              <option value="price">Price</option>
              <option value="rating">Rating</option>
              <option value="popularity">Popularity</option>
            </select>
          </div>
          <button type="submit" className="btn-primary px-6">Search</button>
          <button type="button" className="btn-secondary" onClick={() => nav('/student/map')}>🗺️ Map View</button>
        </form>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-3">
          <div className="card p-5 space-y-5 sticky top-24">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-ink-700">Filters</h3>
                <button onClick={() => setFilters({ query: filters.query, radiusKm: 5, amenities: [], sortBy: 'recommended' } as any)} className="text-xs text-indigo-600 hover:underline font-semibold">Clear all</button>
              </div>
            </div>

            <div>
              <label className="label">Search radius: <span className="font-normal text-ink/55">{filters.radiusKm} km</span></label>
              <input type="range" min={1} max={20} step={1} value={filters.radiusKm} className="range-slider" onChange={(e) => setFilters({ ...filters, radiusKm: parseInt(e.target.value) })} />
            </div>

            <div>
              <label className="label">Price (₹/month)</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="number" placeholder="Min" className="input" value={filters.minPrice ?? ''} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? parseInt(e.target.value) : undefined })} />
                <input type="number" placeholder="Max" className="input" value={filters.maxPrice ?? ''} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? parseInt(e.target.value) : undefined })} />
              </div>
              <input type="range" min={priceRange.min} max={priceRange.max} step={500} value={filters.maxPrice ?? priceRange.max} className="range-slider" onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })} />
            </div>

            <div>
              <label className="label">Gender preference</label>
              <div className="space-y-2">
                {[['', 'Any'], ['male', 'Boys'], ['female', 'Girls'], ['unisex', 'Unisex']].map(([v, l]) => (
                  <label key={v || 'any'} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                    <input type="radio" name="gender" className="accent-indigo-600" checked={filters.genderPreference === v} onChange={() => setFilters({ ...filters, genderPreference: v ? (v as any) : undefined })} />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Amenities</label>
              <div className="space-y-2">
                {ALL_AMENITIES.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                    <input type="checkbox" className="accent-indigo-600 rounded" checked={filters.amenities.includes(a)} onChange={() => toggleAmenity(a)} />
                    {a}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-9">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-ink/55">
              {loading ? 'Searching...' : `${results.length} PG${results.length === 1 ? '' : 's'} found ${filters.query ? `near "${filters.query}"` : ''}`}
            </div>
          </div>

          {err && <div className="card p-3 mb-4 text-coral text-sm ring-1 ring-coral/25 bg-coral/[0.07]">{err}</div>}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card aspect-[4/5] animate-pulse bg-sand-100" />)}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {results.map((pg) => <PGCard key={pg._id} pg={pg} />)}
            </div>
          ) : (
            <EmptyState title="No PGs match your filters" description="Try broadening the search radius, clearing filters, or searching another location." icon="🏚️" />
          )}
        </section>
      </div>
    </div>
  );
};
