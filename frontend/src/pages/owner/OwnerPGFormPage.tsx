import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../lib/api';
import { PageHeader } from '../../components/shared';
import { ChevronLeft, ChevronRight, Save, Upload, Check, AlertCircle } from 'lucide-react';

const STEPS = ['Basic Info', 'Price & Capacity', 'Location', 'Amenities', 'Images'];
const ALL_AMENITIES = ['Wi-Fi', 'Mess', 'Laundry', '24/7 Water', 'AC', 'Non-AC Cooler', 'Parking', 'Gym', 'CCTV', 'Security', 'Lift', 'Study Room', 'Pool Table'];

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="background:#ff8a3d;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">📍</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

const MapInvalidator: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

export const OwnerPGFormPage: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const editMode = Boolean(id);
  const [step, setStep] = useState(() => (location.pathname.endsWith('/images') ? 4 : 0));

  useEffect(() => {
    if (location.pathname.endsWith('/images')) {
      setStep(4);
    }
  }, [location.pathname]);

  const [form, setForm] = useState<any>({
    name: '', address: '', city: 'Ahmedabad', collegeName: '',
    totalRooms: 10, availableRooms: 10,
    genderPreference: 'unisex', pricePerMonth: 10000, securityDeposit: 10000,
    lat: 23.103, lng: 72.5957, amenities: [] as string[],
  });
  const [markerPos, setMarkerPos] = useState<[number, number]>([23.103, 72.5957]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [indiaGeoJson, setIndiaGeoJson] = useState<any>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/AbhinavSwami28/india-official-geojson/main/india-states-simplified.geojson')
      .then(res => res.json())
      .then(data => setIndiaGeoJson(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editMode) return;
    (async () => {
      try {
        const { data } = await api.get(`/owners/pg/${id}`);
        const pg = data.pg;
        setForm({
          name: pg.name, address: pg.address, city: pg.city, collegeName: pg.collegeName || '',
          totalRooms: pg.totalRooms, availableRooms: pg.availableRooms,
          genderPreference: pg.genderPreference, pricePerMonth: pg.pricePerMonth, securityDeposit: pg.securityDeposit,
          lat: pg.location.coordinates[1], lng: pg.location.coordinates[0],
          amenities: (pg.amenities || []).map((a: any) => a.name),
        });
        setMarkerPos([pg.location.coordinates[1], pg.location.coordinates[0]]);
        setImages(data.images || []);
      } catch {}
    })();
  }, [id, editMode]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const saveBasic = async () => {
    const payload = {
      name: form.name,
      address: form.address,
      city: form.city,
      collegeName: form.collegeName || undefined,
      location: { type: 'Point' as const, coordinates: [form.lng, form.lat] },
      totalRooms: form.totalRooms,
      availableRooms: Math.min(form.availableRooms, form.totalRooms),
      genderPreference: form.genderPreference,
      pricePerMonth: form.pricePerMonth,
      securityDeposit: form.securityDeposit,
      amenities: form.amenities,
    };
    setSaving(true);
    try {
      let pgId = id;
      if (editMode) {
        await api.put(`/owners/pg/${id}`, payload);
        showToast('PG updated');
      } else {
        const { data } = await api.post('/owners/pg', payload);
        pgId = data.pg._id;
        showToast('PG created');
      }
      if (!editMode && pgId) {
        nav(`/owner/pg/${pgId}/edit?step=4`, { replace: true });
        return;
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const uploadImages = async (files: FileList) => {
    if (!id) { showToast('Please save the PG first'); return; }
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('images', f));
    setUploading(true);
    try {
      const { data } = await api.post(`/owners/pg/${id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImages((i) => [...i, ...(data.images || [])]);
      showToast(`Uploaded ${data.images?.length || 0} image(s)`);
    } catch (e: any) { showToast(e.response?.data?.error || 'Upload failed'); }
    setUploading(false);
  };

  const validateStep = (s: number) => {
    if (s === 0) {
      if (!form.name.trim() || !form.address.trim() || !form.city.trim()) { showToast('Fill in name, address, and city'); return false; }
    }
    if (s === 1) {
      if (form.totalRooms < 1 || form.pricePerMonth <= 0) { showToast('Provide at least 1 room and a positive monthly rent'); return false; }
    }
    return true;
  };

  const next = () => { if (!validateStep(step)) return; if (step < 3) setStep(step + 1); else saveBasic(); };
  const back = () => setStep(Math.max(0, step - 1));

  const stepIcon = ['📝', '💰', '📍', '✨', '🖼️'];

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={editMode ? 'Edit PG Listing' : 'Add New PG Listing'}
        subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
        actions={<button onClick={() => nav('/owner')} className="btn-secondary">Cancel</button>}
      />

      {/* Responsive Stepper Container */}
      <div className="card p-3 sm:p-4 mb-4 sm:mb-6">
        {/* Mobile Compact Progress Bar */}
        <div className="sm:hidden mb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-700 dark:text-slate-200 mb-1.5">
            <span>Step {step + 1}: {STEPS[step]}</span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="w-full bg-sand-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-400 h-full transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Stepper circles */}
        <div className="flex items-center justify-between overflow-x-auto py-1">
          {STEPS.map((lbl, i) => (
            <React.Fragment key={lbl}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className="flex items-center gap-2 flex-col sm:flex-row group shrink-0 min-w-[44px] min-h-[44px] justify-center"
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition ${
                  i === step
                    ? 'bg-indigo-600 text-white shadow-pop ring-2 ring-indigo-600/30'
                    : i < step
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-sand-100 dark:bg-slate-700 text-ink/55 dark:text-slate-400 group-hover:bg-sand-200 dark:group-hover:bg-slate-600'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : stepIcon[i]}
                </div>
                <div className="text-xs font-medium text-ink-700 dark:text-slate-200 hidden sm:block">{lbl}</div>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 min-w-[12px] mx-1 transition-colors ${i < step ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-sand-200 dark:bg-slate-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="card p-4 sm:p-7">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="pg-name" className="label">PG name *</label>
              <input
                id="pg-name"
                type="text"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Saffron Girls Hostel"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pg-city" className="label">City *</label>
                <input
                  id="pg-city"
                  type="text"
                  className="input"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label htmlFor="pg-college" className="label">Nearby college</label>
                <input
                  id="pg-college"
                  type="text"
                  className="input"
                  value={form.collegeName}
                  onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
                  placeholder="e.g. Nirma University"
                />
              </div>
            </div>
            <div>
              <label htmlFor="pg-address" className="label">Full address *</label>
              <textarea
                id="pg-address"
                className="input min-h-[90px] py-2.5"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, area, landmark..."
                autoComplete="street-address"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pg-total-rooms" className="label">Total rooms</label>
                <input
                  id="pg-total-rooms"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="input"
                  value={form.totalRooms}
                  onChange={(e) => setForm({ ...form, totalRooms: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label htmlFor="pg-avail-rooms" className="label">Available rooms</label>
                <input
                  id="pg-avail-rooms"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="input"
                  value={form.availableRooms}
                  onChange={(e) => setForm({ ...form, availableRooms: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pg-price" className="label">Rent (₹/month)</label>
                <input
                  id="pg-price"
                  type="number"
                  inputMode="numeric"
                  min={500}
                  className="input"
                  value={form.pricePerMonth}
                  onChange={(e) => setForm({ ...form, pricePerMonth: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label htmlFor="pg-deposit" className="label">Security deposit (₹)</label>
                <input
                  id="pg-deposit"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="input"
                  value={form.securityDeposit}
                  onChange={(e) => setForm({ ...form, securityDeposit: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="label">Gender preference</label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'unisex'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, genderPreference: g })}
                    className={`py-3 rounded-xl border text-xs sm:text-sm font-medium capitalize transition min-h-[44px] ${
                      form.genderPreference === g
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                        : 'border-ink/15 dark:border-slate-700 hover:bg-sand-50 dark:hover:bg-slate-700 text-ink-700 dark:text-slate-200'
                    }`}
                  >
                    {g === 'male' ? 'Boys' : g === 'female' ? 'Girls' : 'Unisex'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pg-lat" className="label">Latitude</label>
                <input
                  id="pg-lat"
                  type="number"
                  step="0.0001"
                  inputMode="decimal"
                  className="input"
                  value={form.lat}
                  onChange={(e) => { const lat = parseFloat(e.target.value); setForm({ ...form, lat }); setMarkerPos([lat, form.lng]); }}
                />
              </div>
              <div>
                <label htmlFor="pg-lng" className="label">Longitude</label>
                <input
                  id="pg-lng"
                  type="number"
                  step="0.0001"
                  inputMode="decimal"
                  className="input"
                  value={form.lng}
                  onChange={(e) => { const lng = parseFloat(e.target.value); setForm({ ...form, lng }); setMarkerPos([form.lat, lng]); }}
                />
              </div>
            </div>
            <p className="text-xs text-ink/55 dark:text-slate-400">Click on the map to set the exact coordinates of your PG.</p>
            <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-ink/15 dark:border-slate-700 shadow-xs relative">
              <MapContainer center={markerPos} zoom={13} scrollWheelZoom className="h-full w-full">
                <MapInvalidator />
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {indiaGeoJson && (
                  <GeoJSON 
                    data={indiaGeoJson} 
                    style={{ color: '#475569', weight: 1.5, fillOpacity: 0, dashArray: '3' }}
                    interactive={false}
                  />
                )}
                <LocationPicker onPick={(lat, lng) => { setMarkerPos([lat, lng]); setForm({ ...form, lat, lng }); }} />
                <Marker position={markerPos} icon={pinIcon} />
              </MapContainer>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="label mb-3">Amenities offered</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {ALL_AMENITIES.map(a => (
                <label
                  key={a}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition min-h-[44px] ${
                    form.amenities.includes(a)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'border-ink/15 dark:border-slate-700 hover:bg-sand-50 dark:hover:bg-slate-700 text-ink-700 dark:text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-indigo-600 rounded w-4 h-4"
                    checked={form.amenities.includes(a)}
                    onChange={() => setForm({ ...form, amenities: form.amenities.includes(a) ? form.amenities.filter((x: string) => x !== a) : [...form.amenities, a] })}
                  />
                  <span className="text-sm">{a}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {!id ? (
              <div className="card p-6 text-center border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30">
                <AlertCircle className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                <p className="font-medium text-ink-700 dark:text-slate-200">Save the PG details first before uploading images.</p>
                <button onClick={saveBasic} disabled={saving} className="btn-primary mt-4">
                  {saving ? 'Saving...' : 'Save PG & upload images'}
                </button>
              </div>
            ) : (
              <>
                <label className="block border-2 border-dashed border-ink/20 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-slate-700/50 transition cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadImages(e.target.files)} disabled={uploading} />
                  <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                  <p className="font-medium text-ink-700 dark:text-slate-200 text-sm sm:text-base">
                    {uploading ? 'Uploading images...' : 'Drop images or click to browse'}
                  </p>
                  <p className="text-xs text-ink/55 dark:text-slate-400 mt-1">JPG, PNG, WEBP · up to 5MB each</p>
                </label>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img) => (
                      <div key={img._id} className="relative aspect-square rounded-xl overflow-hidden group border border-ink/15 dark:border-slate-700">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        {img.isPrimary && <span className="absolute top-2 left-2 badge bg-indigo-600 text-white text-[10px]">Primary</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="separator" />
        <div className="flex justify-between gap-3">
          <button onClick={back} disabled={step === 0} className="btn-secondary">
            <ChevronLeft className="w-4 h-4" />
            <span>{step === 0 ? 'Cancel' : 'Back'}</span>
          </button>
          <div className="flex gap-2">
            {id && step < 4 && (
              <button onClick={() => saveBasic()} disabled={saving} className="btn-secondary">
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save draft'}</span>
              </button>
            )}
            {step < 4 ? (
              <button onClick={next} disabled={saving} className="btn-primary">
                <span>{saving ? 'Saving...' : step === 3 && !editMode ? 'Create PG' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => nav('/owner')} className="btn-primary">Finish</button>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] card shadow-pop px-5 py-3 bg-slate-900 text-white text-sm border-slate-900">{toast}</div>
      )}
    </div>
  );
};
