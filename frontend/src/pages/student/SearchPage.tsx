import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { PGCard, EmptyState, SkeletonCard } from '../../components/shared';
import { CompareDrawer } from '../../components/CompareDrawer';
import { VoiceSearch } from '../../components/VoiceSearch';
import { PGListing, SearchFilters } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Filter, X, Search, Map, RotateCcw, SlidersHorizontal, Check, Bookmark, Trash2, BookmarkCheck } from 'lucide-react';

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

  // Saved Searches state
  const [savedSearches, setSavedSearches] = useState<{ id: string; name: string; filters: SearchFilters }[]>(() => {
    try {
      const raw = localStorage.getItem('geonest_saved_searches');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showSavedMenu, setShowSavedMenu] = useState(false);

  const saveCurrentSearch = () => {
    const name = (searchInput.trim() || 'Custom Search') + ` (${filters.radiusKm}km)`;
    const newSaved = [...savedSearches, { id: Date.now().toString(), name, filters: { ...filters } }];
    setSavedSearches(newSaved);
    localStorage.setItem('geonest_saved_searches', JSON.stringify(newSaved));
    toast.success('Search filters saved!');
  };

  const applySavedSearch = (saved: { name: string; filters: SearchFilters }) => {
    setFilters(saved.filters);
    setSearchInput(saved.filters.query || '');
    setShowSavedMenu(false);
    toast.success(`Applied saved search: "${saved.name}"`);
  };

  const deleteSavedSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('geonest_saved_searches', JSON.stringify(updated));
    toast.success('Saved search deleted.');
  };

  // PG Comparison state
  const [comparedPGs, setComparedPGs] = useState<PGListing[]>([]);

  const handleCompareToggle = (pg: PGListing) => {
    setComparedPGs((prev) => {
      const exists = prev.some((item) => item._id === pg._id);
      if (exists) {
        return prev.filter((item) => item._id !== pg._id);
      }
      if (prev.length >= 3) {
        toast.error('You can compare up to 3 PGs at a time.');
        return prev;
      }
      return [...prev, pg];
    });
  };

  // Mobile filter drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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
            ? <strong key={i} className="text-indigo-600 dark:text-indigo-400">{part}</strong> 
            : part
        )}
      </span>
    );
  };

  const toggleAmenity = (a: string) => setFilters((f) => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

  const clearFilters = () => {
    setFilters({ query: filters.query, radiusKm: 5, amenities: [], sortBy: 'recommended' } as any);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.radiusKm !== 5) count++;
    if (filters.minPrice != null || filters.maxPrice != null) count++;
    if (filters.genderPreference) count++;
    if (filters.amenities.length > 0) count += filters.amenities.length;
    return count;
  }, [filters]);

  const priceRange = useMemo(() => {
    const prices = results.map((r) => r.pricePerMonth).filter(Boolean);
    return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 5000, max: 20000 };
  }, [results]);

  const filterContent = (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-2 border-b border-ink/10 dark:border-slate-700">
        <h3 className="font-semibold text-ink-700 dark:text-slate-100 flex items-center gap-2 text-base">
          <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="badge bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              {activeFilterCount}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={clearFilters}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 min-h-[36px] px-2 rounded-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear all
        </button>
      </div>

      <div>
        <label className="label">Search radius: <span className="font-normal text-ink/55 dark:text-slate-400">{filters.radiusKm} km</span></label>
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
            <label key={v || 'any'} className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-slate-200 cursor-pointer min-h-[36px]">
              <input type="radio" name="gender" className="accent-indigo-600 w-4 h-4" checked={filters.genderPreference === v} onChange={() => setFilters({ ...filters, genderPreference: v ? (v as any) : undefined })} />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Amenities</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
          {ALL_AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-slate-200 cursor-pointer min-h-[36px]">
              <input type="checkbox" className="accent-indigo-600 rounded w-4 h-4" checked={filters.amenities.includes(a)} onChange={() => toggleAmenity(a)} />
              {a}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search Header Bar */}
      <div className="card p-3 sm:p-4 mb-4 sm:mb-6">
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 relative" ref={searchRef}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 dark:text-slate-500 pointer-events-none" />
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
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                {loadingSuggestions ? (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
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
                        className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${i === activeIndex ? 'bg-indigo-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 shrink-0 overflow-hidden">
                          {s.primaryImage ? (
                            <img src={s.primaryImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">🏠</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
                            {highlightMatch(s.name, searchInput)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
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
                          <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">₹{s.pricePerMonth}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    No PGs found for "{searchInput}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <VoiceSearch
              onRawText={(text) => setSearchInput(text)}
              onFiltersParsed={(parsedFilters) => {
                setFilters((f) => ({
                  ...f,
                  ...parsedFilters,
                  query: parsedFilters.query || f.query,
                }));
                if (parsedFilters.query) {
                  setSearchInput(parsedFilters.query);
                }
              }}
            />
            <div className="flex-1 sm:w-44">
              <select className="input" value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}>
                <option value="recommended">Recommended</option>
                <option value="distance">Distance</option>
                <option value="price">Price (Low-High)</option>
                <option value="rating">Rating</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>
            <button type="submit" className="btn-primary min-h-[44px]">
              <Search className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Search</span>
            </button>

            <button
              type="button"
              onClick={saveCurrentSearch}
              className="btn-secondary min-h-[44px] px-3 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
              title="Save current search criteria"
            >
              <Bookmark className="w-4 h-4" />
            </button>

            {savedSearches.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSavedMenu(!showSavedMenu)}
                  className="btn-secondary min-h-[44px] px-3 text-indigo-600 dark:text-indigo-400"
                  title="Saved Searches"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span className="hidden md:inline text-xs font-semibold ml-1">({savedSearches.length})</span>
                </button>

                {showSavedMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden p-2">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 py-1 uppercase tracking-wider">Saved Searches</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {savedSearches.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => applySavedSearch(s)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer text-xs transition"
                        >
                          <span className="truncate font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                          <button
                            onClick={(e) => deleteSavedSearch(s.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Mobile controls bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink/10 dark:border-slate-700 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="btn-secondary text-xs sm:text-sm py-1.5 px-3 min-h-[38px] flex items-center gap-1.5"
          >
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => nav('/student/map')}
            className="btn-secondary text-xs sm:text-sm py-1.5 px-3 min-h-[38px] flex items-center gap-1.5"
          >
            <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Map View</span>
          </button>
        </div>
      </div>

      {/* Mobile Filter Bottom Sheet / Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl p-5 shadow-2xl max-h-[85dvh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-ink/10 dark:border-slate-700">
              <h3 className="font-semibold text-lg text-ink-700 dark:text-slate-100">Filter Listings</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-2 text-ink/60 dark:text-slate-400 rounded-full hover:bg-sand-100 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-1 pb-4">
              {filterContent}
            </div>
            <div className="pt-3 border-t border-ink/10 dark:border-slate-700 flex gap-3">
              <button
                type="button"
                onClick={() => { clearFilters(); }}
                className="btn-secondary flex-1"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="card p-5 space-y-5 sticky top-20">
            {filterContent}
          </div>
        </aside>

        {/* Search Results Grid */}
        <section className="col-span-12 lg:col-span-9">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-ink/55 dark:text-slate-400 font-medium">
              {loading ? 'Searching accommodations...' : `${results.length} PG${results.length === 1 ? '' : 's'} found ${filters.query ? `near "${filters.query}"` : ''}`}
            </div>
            <button
              type="button"
              onClick={() => nav('/student/map')}
              className="hidden lg:flex btn-secondary text-xs py-1.5 px-3 min-h-[36px] items-center gap-1.5"
            >
              <Map className="w-3.5 h-3.5" />
              Open Map
            </button>
          </div>

          {err && <div className="card p-3 mb-4 text-coral text-sm ring-1 ring-coral/25 bg-coral/[0.07]">{err}</div>}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {results.map((pg) => (
                <PGCard
                  key={pg._id}
                  pg={pg}
                  isCompared={comparedPGs.some((item) => item._id === pg._id)}
                  onCompareToggle={handleCompareToggle}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No PGs match your filters"
              description="Try broadening the search radius, clearing filters, or searching another location."
              icon="🏚️"
              action={
                <button type="button" onClick={clearFilters} className="btn-primary text-xs py-2 px-4">
                  Clear Filters
                </button>
              }
            />
          )}
        </section>
      </div>

      <CompareDrawer
        comparedPGs={comparedPGs}
        onRemove={(id) => setComparedPGs((prev) => prev.filter((item) => item._id !== id))}
        onClear={() => setComparedPGs([])}
      />
    </div>
  );
};
