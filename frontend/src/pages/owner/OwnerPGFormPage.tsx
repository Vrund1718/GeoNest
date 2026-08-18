import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../../lib/api';
import { PageHeader } from '../../components/shared';

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

export const OwnerPGFormPage: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const editMode = Boolean(id);
  const [step, setStep] = useState(0);
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
      if (!form.name.trim() || !form.address.trim() || !form.city.trim()) { showToast('Fill in name, address, city'); return false; }
    }
    if (s === 1) {
      if (form.totalRooms < 1 || form.pricePerMonth <= 0) { showToast('At least 1 room, positive price'); return false; }
    }
    return true;
  };

  const next = () => { if (!validateStep(step)) return; if (step < 3) setStep(step + 1); else saveBasic(); };
  const back = () => setStep(Math.max(0, step - 1));

  const stepIcon = ['📝', '💰', '📍', '✨', '🖼️'];

  return (
    <div className="max-w-4xl">
      <PageHeader title={editMode ? 'Edit PG Listing' : 'Add New PG Listing'} subtitle={`Step ${step + 1} of ${STEPS.length}`} actions={<button onClick={() => nav('/owner')} className="btn-secondary">Cancel</button>} />

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((lbl, i) => (
            <React.Fragment key={lbl}>
              <button onClick={() => setStep(i)} className="flex items-center gap-2 flex-col sm:flex-row group">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition ${i === step ? 'bg-indigo-600 text-white shadow-pop' : i < step ? 'bg-sage/15 text-sage' : 'bg-sand-100 text-ink/55 group-hover:bg-sand-200'}`}>{stepIcon[i]}</div>
                <div className="text-xs sm:text-sm font-medium text-ink-700 hidden sm:block">{lbl}</div>
              </button>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-marigold-500' : 'bg-sand-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="card p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="label">PG name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Saffron Girls Hostel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">City *</label>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="label">Nearby college</label>
                <input className="input" value={form.collegeName} onChange={(e) => setForm({ ...form, collegeName: e.target.value })} placeholder="e.g. Nirma University" />
              </div>
            </div>
            <div>
              <label className="label">Full address *</label>
              <textarea className="input min-h-[80px]" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, area, landmark..." />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Total rooms</label>
                <input type="number" min={1} className="input" value={form.totalRooms} onChange={(e) => setForm({ ...form, totalRooms: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Available rooms</label>
                <input type="number" min={0} className="input" value={form.availableRooms} onChange={(e) => setForm({ ...form, availableRooms: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Rent (₹/month)</label>
                <input type="number" min={500} className="input" value={form.pricePerMonth} onChange={(e) => setForm({ ...form, pricePerMonth: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Security deposit (₹)</label>
                <input type="number" min={0} className="input" value={form.securityDeposit} onChange={(e) => setForm({ ...form, securityDeposit: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="label">Gender preference</label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'unisex'] as const).map(g => (
                  <button key={g} type="button" onClick={() => setForm({ ...form, genderPreference: g })} className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition ${form.genderPreference === g ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-ink/15 hover:bg-sand-50'}`}>
                    {g === 'male' ? 'Boys' : g === 'female' ? 'Girls' : 'Unisex'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Latitude</label>
                <input type="number" step="0.0001" className="input" value={form.lat} onChange={(e) => { const lat = parseFloat(e.target.value); setForm({ ...form, lat }); setMarkerPos([lat, form.lng]); }} />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input type="number" step="0.0001" className="input" value={form.lng} onChange={(e) => { const lng = parseFloat(e.target.value); setForm({ ...form, lng }); setMarkerPos([form.lat, lng]); }} />
              </div>
            </div>
            <p className="text-xs text-ink/55">Click on the map to drop the pin at your PG location.</p>
            <div className="h-80 rounded-lg overflow-hidden border border-ink/15">
              <MapContainer center={markerPos} zoom={15} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker onPick={(lat, lng) => { setMarkerPos([lat, lng]); setForm({ ...form, lat, lng }); }} />
                <Marker position={markerPos} icon={pinIcon} />
              </MapContainer>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="label">Amenities offered</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_AMENITIES.map(a => (
                <label key={a} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${form.amenities.includes(a) ? 'border-indigo-500 bg-indigo-50' : 'border-ink/15 hover:bg-sand-50'}`}>
                  <input type="checkbox" className="accent-indigo-600" checked={form.amenities.includes(a)} onChange={() => setForm({ ...form, amenities: form.amenities.includes(a) ? form.amenities.filter((x: string) => x !== a) : [...form.amenities, a] })} />
                  <span className="text-sm font-medium">{a}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {!id ? (
              <div className="card p-6 text-center border-dashed border-indigo-200 bg-indigo-50/50">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="font-medium">Save the PG first before uploading images.</p>
                <button onClick={saveBasic} disabled={saving} className="btn-primary mt-4">{saving ? 'Saving...' : 'Save PG & upload images next'}</button>
              </div>
            ) : (
              <>
                <label className="block border-2 border-dashed border-ink/20 rounded-xl p-8 text-center hover:border-marigold-500/80 hover:bg-indigo-50/40 transition cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadImages(e.target.files)} disabled={uploading} />
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="font-medium text-ink-700">{uploading ? 'Uploading...' : 'Drop images or click to browse'}</p>
                  <p className="text-xs text-ink/55 mt-1">JPG, PNG, WEBP · up to 5MB each</p>
                </label>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {images.map((img) => (
                      <div key={img._id} className="relative aspect-square rounded-lg overflow-hidden group border border-ink/15">
                        <img src={img.url} className="w-full h-full object-cover" />
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
          <button onClick={back} disabled={step === 0} className="btn-secondary">{step === 0 ? 'Cancel' : '← Back'}</button>
          <div className="flex gap-2">
            {id && step < 4 && <button onClick={() => saveBasic()} disabled={saving} className="btn-secondary">{saving ? 'Saving...' : 'Save draft'}</button>}
            {step < 4 ? (
              <button onClick={next} disabled={saving} className="btn-primary">{saving ? 'Saving...' : step === 3 && !editMode ? 'Create PG →' : 'Next →'}</button>
            ) : (
              <button onClick={() => nav('/owner')} className="btn-primary">Finish</button>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] card shadow-pop px-5 py-3 bg-ink-700 text-white text-sm border-ink-700">{toast}</div>
      )}
    </div>
  );
};
