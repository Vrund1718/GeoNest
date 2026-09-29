import React, { useState } from 'react';
import { PGListing } from '../types';
import { X, Check, ArrowRight, Scale } from 'lucide-react';
import { RatingStars } from './shared';
import { useNavigate } from 'react-router-dom';

interface CompareDrawerProps {
  comparedPGs: PGListing[];
  onRemove: (pgId: string) => void;
  onClear: () => void;
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({ comparedPGs, onRemove, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const nav = useNavigate();

  if (comparedPGs.length === 0) return null;

  const allAmenities = Array.from(
    new Set(
      comparedPGs.flatMap((pg) =>
        (pg.amenities || []).map((a) => (typeof a === 'string' ? a : a.name))
      )
    )
  );

  return (
    <>
      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white dark:bg-slate-800/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 max-w-lg w-[92vw] sm:w-auto animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-semibold whitespace-nowrap">
            {comparedPGs.length} / 3 Selected
          </span>
        </div>

        {/* Selected PG Thumbnails */}
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
          {comparedPGs.map((pg) => (
            <div key={pg._id} className="relative group shrink-0">
              <div className="w-9 h-9 rounded-lg bg-slate-700 overflow-hidden border border-slate-600">
                {pg.primaryImage ? (
                  <img src={pg.primaryImage} alt={pg.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">🏠</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(pg._id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] grid place-items-center opacity-80 hover:opacity-100"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="btn-primary py-1.5 px-3.5 text-xs h-9 min-h-[36px] flex items-center gap-1"
          >
            <span>Compare Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Clear comparison"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comparison Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs">
          <div className="card w-full max-w-5xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-2xl rounded-3xl max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-ink/10 dark:border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg sm:text-xl font-bold text-ink-700 dark:text-slate-100">
                  Compare PG Accommodations
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-ink/60 dark:text-slate-400 rounded-full hover:bg-sand-100 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Grid (Side by side on desktop, stacked on mobile) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {comparedPGs.map((pg) => (
                  <div
                    key={pg._id}
                    className="card p-4 border dark:border-slate-700 flex flex-col justify-between bg-sand-50/50 dark:bg-slate-900/50"
                  >
                    <div>
                      <div className="aspect-[16/9] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 mb-3">
                        {pg.primaryImage ? (
                          <img src={pg.primaryImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🏠</div>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 line-clamp-1">{pg.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{pg.address}, {pg.city}</p>

                      <div className="my-3 space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-ink/10 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400">Monthly Rent:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{pg.pricePerMonth.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-ink/10 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400">Gender:</span>
                          <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{pg.genderPreference}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-ink/10 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400">Rating:</span>
                          <RatingStars rating={pg.averageRating} />
                        </div>
                        <div className="flex justify-between py-1 border-b border-ink/10 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400">Availability:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{pg.availableRooms} / {pg.totalRooms} rooms</span>
                        </div>
                        {pg.distanceMeters != null && (
                          <div className="flex justify-between py-1 border-b border-ink/10 dark:border-slate-800">
                            <span className="text-slate-500 dark:text-slate-400">Distance:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {pg.distanceMeters < 1000 ? `${Math.round(pg.distanceMeters)} m` : `${(pg.distanceMeters / 1000).toFixed(1)} km`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Amenities Check List */}
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Amenities</h4>
                        <div className="space-y-1 text-xs">
                          {allAmenities.map((amenity) => {
                            const hasAmenity = (pg.amenities || []).some((a) =>
                              (typeof a === 'string' ? a : a.name) === amenity
                            );
                            return (
                              <div key={amenity} className="flex items-center justify-between py-0.5">
                                <span className={hasAmenity ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-600 line-through'}>
                                  {amenity}
                                </span>
                                {hasAmenity ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        nav(`/pg/${pg._id}`);
                      }}
                      className="btn-primary w-full mt-4 text-xs min-h-[38px]"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
