import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Save,
  Info,
  Sparkles,
  MapPin,
  Check,
} from 'lucide-react';
import { WizardStepper } from '../../components/WizardStepper';
import { FormField, TextareaField } from '../../components/FormField';
import { MapPicker, LatLng } from '../../components/MapPicker';
import { AmenityPicker, DEFAULT_AMENITIES, Amenity } from '../../components/AmenityPicker';
import { ImageUploader, UploadHandler, UploadedImage } from '../../components/ImageUploader';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { ownerApi, ApiError, PgListing } from '../../services/api';

const STEP_LABELS = [
  'Basic Info',
  'Price & Capacity',
  'Location',
  'Amenities',
  'Photos',
  'Review',
];

const basicSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(80),
  description: z
    .string()
    .max(2000, 'Description is too long (max 2000 characters)')
    .optional(),
  address: z.string().min(5, 'Enter the full street address').max(500),
  city: z.string().min(2, 'City is required').max(80),
  collegeName: z.string().max(120).optional().or(z.literal('')),
});

const priceSchema = z.object({
  pricePerMonth: z.coerce
    .number({ invalid_type_error: 'Price must be a number' })
    .int()
    .min(500, 'Price must be at least ₹500')
    .max(500000, 'Price seems too high'),
  securityDeposit: z.coerce
    .number({ invalid_type_error: 'Deposit must be a number' })
    .int()
    .min(0, 'Deposit cannot be negative')
    .max(500000)
    .optional(),
  totalRooms: z.coerce
    .number({ invalid_type_error: 'Total rooms must be a number' })
    .int()
    .min(1, 'Must have at least 1 room')
    .max(500),
  availableRooms: z.coerce
    .number({ invalid_type_error: 'Available rooms must be a number' })
    .int()
    .min(0, 'Available rooms cannot be negative')
    .max(500),
  genderPreference: z.enum(['MALE', 'FEMALE', 'CO_ED'], {
    required_error: 'Select who this PG accommodates',
  }),
  foodIncluded: z.boolean().default(false),
});

type BasicValues = z.infer<typeof basicSchema>;
type PriceValues = z.infer<typeof priceSchema>;

const GENDER_OPTIONS: { key: PriceValues['genderPreference']; label: string }[] = [
  { key: 'MALE', label: 'Male' },
  { key: 'FEMALE', label: 'Female' },
  { key: 'CO_ED', label: 'Co-Ed' },
];

const initialBasic: BasicValues = {
  name: '',
  description: '',
  address: '',
  city: '',
  collegeName: '',
};

const initialPrice: PriceValues = {
  pricePerMonth: 0,
  securityDeposit: 0,
  totalRooms: 1,
  availableRooms: 1,
  genderPreference: 'CO_ED',
  foodIncluded: false,
};

type StepErrors = Partial<Record<keyof BasicValues | keyof PriceValues | 'location' | 'amenities' | 'images', string>>;

export const OwnerPGFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const [basic, setBasic] = useState<BasicValues>(initialBasic);
  const [price, setPrice] = useState<PriceValues>(initialPrice);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [amenitiesList, setAmenitiesList] = useState<Amenity[]>(DEFAULT_AMENITIES);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [serverPgId, setServerPgId] = useState<string | null>(null);
  const lastSavedAt = useRef<number>(0);
  const savedRef = useRef<boolean>(false);

  useEffect(() => {
    let alive = true;
    ownerApi
      .listAmenities()
      .then((res) => {
        if (alive && res.data && res.data.length > 0) {
          setAmenitiesList(res.data);
        }
      })
      .catch(() => {
        // fall back to DEFAULT_AMENITIES already set
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    setLoadingEdit(true);
    ownerApi
      .getPg(editId)
      .then((res) => {
        if (!alive) return;
        const p: PgListing = res.data;
        setServerPgId(p.id);
        setBasic({
          name: p.name || '',
          description: p.description || '',
          address: p.address || '',
          city: p.city || '',
          collegeName: p.collegeName || '',
        });
        setPrice({
          pricePerMonth: p.pricePerMonth || 0,
          securityDeposit: p.securityDeposit || 0,
          totalRooms: p.totalRooms || 1,
          availableRooms: p.availableRooms ?? (p.totalRooms || 1),
          genderPreference: p.genderPreference || 'CO_ED',
          foodIncluded: !!p.foodIncluded,
        });
        if (p.latitude != null && p.longitude != null) {
          setLocation({ lat: p.latitude, lng: p.longitude });
        }
        if (p.amenities) {
          setAmenityIds(p.amenities.map((a) => a.id));
        }
        if (p.images) {
          setImages(
            p.images.map((im) => ({
              id: im.id,
              url: im.url,
              previewUrl: im.url,
              progress: 100,
              isPrimary: !!im.isPrimary,
            }))
          );
        }
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof ApiError ? e.message : 'Could not load this PG.';
        toast.show({ variant: 'error', title: 'Failed to load', message: msg });
      })
      .finally(() => {
        if (alive) setLoadingEdit(false);
      });
    return () => {
      alive = false;
    };
  }, [editId, toast]);

  const saveDraft = async (finalStatus?: 'PENDING') => {
    if (saving || submitting) return;
    setSaving(true);
    try {
      const payload: import('../../services/api').PgListingInput = {
        ...(serverPgId ? { id: serverPgId } : {}),
        ...basic,
        ...price,
        latitude: location?.lat,
        longitude: location?.lng,
        amenityIds,
        status: (finalStatus || 'DRAFT') as 'DRAFT' | 'PENDING',
      };
      let res: { data: PgListing };
      if (serverPgId) {
        res = await ownerApi.updatePg(serverPgId, payload);
      } else {
        res = await ownerApi.createPg(payload);
      }
      if (res.data?.id) setServerPgId(res.data.id);
      lastSavedAt.current = Date.now();
      savedRef.current = true;
    } catch (e: unknown) {
      // silently log — autosave should not block UX
      console.warn('[PGForm] autosave failed', e);
    } finally {
      setSaving(false);
    }
  };

  const ensureDraftId = async (): Promise<string> => {
    if (serverPgId) return serverPgId;
    await saveDraft();
    if (!serverPgId) {
      await new Promise((r) => setTimeout(r, 50));
      if (!serverPgId) throw new Error('Could not create draft to attach images — try saving manually first.');
    }
    return serverPgId;
  };

  const handleUpload: UploadHandler = async (files, progressCb) => {
    const pgId = await ensureDraftId();
    const tickers: number[] = [];
    files.forEach((_, idx) => {
      let p = 0;
      const stages = [15, 10, 20, 15, 10]; // sums to 70, remaining 30 on resolve
      let si = 0;
      const t = window.setInterval(() => {
        if (si < stages.length) {
          p += Math.round(stages[si] * (0.7 + Math.random() * 0.6));
          si++;
          progressCb(idx, Math.min(90, p));
        }
      }, 180);
      tickers.push(t);
    });
    try {
      const res = await ownerApi.uploadImages(pgId, files);
      const uploaded = res.data || [];
      files.forEach((_, idx) => {
        window.clearInterval(tickers[idx]);
        progressCb(idx, 100);
      });
      return uploaded.map((u) => ({ id: u.id, url: u.url, isPrimary: u.isPrimary }));
    } catch (e: unknown) {
      tickers.forEach((t) => window.clearInterval(t));
      if (e instanceof ApiError) {
        if (e.code === 'INVALID_FILE_TYPE') {
          throw new Error('Upload failed — only JPG, PNG, or WEBP images are allowed.');
        }
        if (e.code === 'FILE_TOO_BIG') {
          throw new Error('Upload failed — images must be under 5MB.');
        }
        if (e.code === 'TOO_MANY_FILES') {
          throw new Error('Upload failed — up to 8 images per listing.');
        }
        if (e.code === 'NO_FILES_UPLOADED') {
          throw new Error('Upload failed — no valid images were received.');
        }
      }
      throw new Error(e instanceof Error ? e.message : 'Upload failed — please try again.');
    }
  };

  const handleRemovePersisted = async (img: UploadedImage) => {
    if (!serverPgId) return;
    await ownerApi.deleteImage(serverPgId, img.id);
  };

  const handleSetPrimaryPersisted = async (img: UploadedImage) => {
    if (!serverPgId) return;
    await ownerApi.setPrimaryImage(serverPgId, img.id);
  };

  useEffect(() => {
    if (loadingEdit) return;
    // Autosave when step changes (moving between steps)
    if (savedRef.current) {
      savedRef.current = false;
      void saveDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const validateStep = (s: number): boolean => {
    const newErrors: StepErrors = {};
    if (s === 1) {
      const parsed = basicSchema.safeParse(basic);
      if (!parsed.success) {
        parsed.error.issues.forEach((i) => {
          const path = i.path[0] as keyof BasicValues;
          if (path) newErrors[path] = i.message;
        });
      }
    } else if (s === 2) {
      const parsed = priceSchema.safeParse(price);
      if (!parsed.success) {
        parsed.error.issues.forEach((i) => {
          const path = i.path[0] as keyof PriceValues;
          if (path) newErrors[path] = i.message;
        });
      }
      if (
        price.availableRooms != null &&
        price.totalRooms != null &&
        price.availableRooms > price.totalRooms
      ) {
        newErrors.availableRooms = 'Available rooms cannot exceed total rooms';
      }
    } else if (s === 3) {
      if (!location) newErrors.location = 'Click the map to pick the PG location.';
    } else if (s === 4) {
      if (amenityIds.length === 0) {
        newErrors.amenities = 'Choose at least one amenity so students can filter for you.';
      }
    } else if (s === 5) {
      if (images.length === 0) {
        newErrors.images = 'Add at least one photo of the PG.';
      } else if (!images.some((i) => i.isPrimary)) {
        newErrors.images = 'Star a photo to set it as the cover image.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      toast.show({
        variant: 'error',
        title: 'Please fix the errors above',
        message: 'Some fields need your attention before continuing.',
      });
      return;
    }
    savedRef.current = true; // will trigger autosave when step changes
    setDirection(1);
    setStep((n) => Math.min(6, n + 1));
  };

  const goPrev = () => {
    if (step === 1) {
      navigate('/dashboard/owner');
      return;
    }
    setDirection(-1);
    setStep((n) => Math.max(1, n - 1));
  };

  const submitForReview = async () => {
    // Validate all steps one by one — focus on first that fails
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        setDirection(s < step ? -1 : 1);
        setStep(s);
        toast.show({
          variant: 'error',
          title: `Section ${STEP_LABELS[s - 1]} needs review`,
          message: 'Please check for errors before submitting.',
        });
        return;
      }
    }
    setSubmitting(true);
    try {
      await saveDraft('PENDING');
      toast.show({
        variant: 'success',
        title: 'Submitted for review 🎉',
        message: 'Our admin team will verify the listing and you will hear back soon.',
      });
      navigate('/dashboard/owner');
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Please try again in a moment.';
      toast.show({ variant: 'error', title: 'Submission failed', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const primaryImage = images.find((i) => i.isPrimary) || images[0];
  const selectedAmenities = amenitiesList.filter((a) => amenityIds.includes(a.id));

  const stepPaneClasses = (s: number) => {
    const isActive = step === s;
    const offset = direction === 1 ? '-translate-x-6' : direction === -1 ? 'translate-x-6' : 'translate-x-0';
    return `w-full flex-shrink-0 ${
      isActive
        ? `opacity-100 translate-x-0 transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none`
        : `pointer-events-none absolute inset-0 opacity-0 ${offset} transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-0`
    }`;
  };

  if (loadingEdit) {
    return (
      <div className="rounded-2xl bg-white border border-ink/10 p-10 shadow-sm animate-pulse" aria-busy="true">
        <div className="h-8 w-1/3 rounded bg-ink/10 mb-6" />
        <div className="h-3 w-full rounded bg-ink/5 mb-3" />
        <div className="h-3 w-5/6 rounded bg-ink/5 mb-3" />
        <div className="h-3 w-4/6 rounded bg-ink/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              type="button"
              onClick={goPrev}
              className="p-2 -ml-2 rounded-lg text-ink/50 hover:text-ink hover:bg-sand transition-colors focus:outline-none focus:ring-2 focus:ring-indigo"
              aria-label={step === 1 ? 'Back to My PGs' : 'Previous step'}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-3xl font-bold text-ink leading-tight">
              {editId ? 'Edit PG Listing' : 'List a New PG'}
            </h1>
          </div>
          <p className="text-ink/60 text-sm ml-10 sm:ml-0">
            Step {step} of 6 — {STEP_LABELS[step - 1]}
            {saving && <span className="ml-3 text-xs text-indigo inline-flex items-center gap-1"><Save size={12} /> Saving draft…</span>}
          </p>
        </div>
        <StatusBadge variant={submitting ? 'in-progress' : 'draft'}>
          {submitting ? 'Submitting…' : 'Draft'}
        </StatusBadge>
      </div>

      <div className="px-2 sm:px-4 pb-6">
        <WizardStepper steps={6} currentStep={step} labels={STEP_LABELS} />
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-white border border-ink/10 p-5 sm:p-8 shadow-sm">
        <div className="relative">
          {/* Step 1 */}
          <div className={stepPaneClasses(1)} aria-hidden={step !== 1}>
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-start gap-3 mb-4 pb-3 border-b border-ink/10">
                <div className="w-10 h-10 rounded-xl bg-indigo/10 text-indigo flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    Basic information
                  </h2>
                  <p className="text-sm text-ink/60">
                    Students search by name, city, and nearby college — be specific.
                  </p>
                </div>
              </div>

              <FormField
                label="PG name"
                value={basic.name}
                onChange={(e) => setBasic({ ...basic, name: e.target.value })}
                placeholder="e.g. Shree Krishna Residency"
                error={errors.name}
                required
                maxLength={80}
              />
              <TextareaField
                label="Description"
                value={basic.description || ''}
                onChange={(e) => setBasic({ ...basic, description: e.target.value })}
                placeholder="A short description of the vibe, the neighbourhood, and what makes this PG a great stay."
                error={errors.description}
                rows={4}
                maxLength={2000}
              />
              <TextareaField
                label="Full street address"
                value={basic.address}
                onChange={(e) => setBasic({ ...basic, address: e.target.value })}
                placeholder="House/flat number, street name, area, landmarks"
                error={errors.address}
                rows={2}
                maxLength={500}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-4">
                <FormField
                  label="City"
                  value={basic.city}
                  onChange={(e) => setBasic({ ...basic, city: e.target.value })}
                  placeholder="Ahmedabad"
                  error={errors.city}
                  required
                  maxLength={80}
                />
                <FormField
                  label="Nearest college or landmark"
                  value={basic.collegeName || ''}
                  onChange={(e) => setBasic({ ...basic, collegeName: e.target.value })}
                  placeholder="Nirma University (optional)"
                  error={errors.collegeName}
                  maxLength={120}
                />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className={stepPaneClasses(2)} aria-hidden={step !== 2}>
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-start gap-3 mb-4 pb-3 border-b border-ink/10">
                <div className="w-10 h-10 rounded-xl bg-marigold/15 text-marigold flex items-center justify-center flex-shrink-0">
                  <span className="font-mono font-semibold text-lg">₹</span>
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    Price & Capacity
                  </h2>
                  <p className="text-sm text-ink/60">
                    Be transparent about pricing — the right tenants will appreciate it.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-4">
                <FormField
                  label="Price per month (₹)"
                  type="number"
                  min={0}
                  value={price.pricePerMonth === 0 ? '' : price.pricePerMonth}
                  onChange={(e) => setPrice({ ...price, pricePerMonth: parseInt(e.target.value || '0', 10) })}
                  placeholder="9000"
                  error={errors.pricePerMonth}
                  required
                />
                <FormField
                  label="Security deposit (₹)"
                  type="number"
                  min={0}
                  value={price.securityDeposit === 0 ? '' : price.securityDeposit}
                  onChange={(e) => setPrice({ ...price, securityDeposit: parseInt(e.target.value || '0', 10) })}
                  placeholder="18000"
                  error={errors.securityDeposit}
                />
                <FormField
                  label="Total rooms"
                  type="number"
                  min={1}
                  value={price.totalRooms}
                  onChange={(e) => setPrice({ ...price, totalRooms: parseInt(e.target.value || '1', 10) })}
                  error={errors.totalRooms}
                  required
                />
                <FormField
                  label="Available rooms"
                  type="number"
                  min={0}
                  value={price.availableRooms}
                  onChange={(e) => setPrice({ ...price, availableRooms: parseInt(e.target.value || '0', 10) })}
                  error={errors.availableRooms}
                  required
                />
              </div>

              <div className="pt-2">
                <p className="block text-sm font-medium text-ink mb-2">
                  Who can stay here?
                </p>
                <div
                  role="radiogroup"
                  aria-label="Gender preference"
                  className="grid grid-cols-3 gap-2 sm:gap-3"
                >
                  {GENDER_OPTIONS.map((opt) => {
                    const selected = price.genderPreference === opt.key;
                    return (
                      <button
                        key={opt.key}
                        role="radio"
                        aria-checked={selected}
                        type="button"
                        onClick={() => setPrice({ ...price, genderPreference: opt.key })}
                        className={`px-3 py-3 rounded-xl text-sm font-semibold border transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo ${
                          selected
                            ? 'bg-indigo text-sand border-indigo shadow-sm'
                            : 'bg-white text-ink border-ink/15 hover:border-indigo/40 hover:bg-sand/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {errors.genderPreference && (
                  <p className="text-coral text-xs mt-1" role="alert">{errors.genderPreference}</p>
                )}
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-sand/60 border border-ink/5">
                  <div>
                    <p className="text-sm font-medium text-ink">Mess / food included?</p>
                    <p className="text-xs text-ink/50">
                      Students can filter PGs that include meals.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={price.foodIncluded}
                    onClick={() => setPrice({ ...price, foodIncluded: !price.foodIncluded })}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo ${
                      price.foodIncluded ? 'bg-sage' : 'bg-ink/20'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                        price.foodIncluded ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className={stepPaneClasses(3)} aria-hidden={step !== 3}>
            <div className="space-y-4">
              <div className="flex items-start gap-3 mb-2 pb-3 border-b border-ink/10">
                <div className="w-10 h-10 rounded-xl bg-sage/15 text-sage flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    Pick the exact location
                  </h2>
                  <p className="text-sm text-ink/60">
                    Students will see this point on the map. Search an address, then drag the pin for precision.
                  </p>
                </div>
              </div>
              {errors.location && (
                <div className="rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm p-3 flex items-start gap-2" role="alert">
                  <Info size={18} className="flex-shrink-0 mt-0.5" />
                  {errors.location}
                </div>
              )}
              <MapPicker value={location} onChange={setLocation} />
            </div>
          </div>

          {/* Step 4 */}
          <div className={stepPaneClasses(4)} aria-hidden={step !== 4}>
            <div className="space-y-4">
              <div className="flex items-start gap-3 mb-2 pb-3 border-b border-ink/10">
                <div className="w-10 h-10 rounded-xl bg-indigo/10 text-indigo flex items-center justify-center flex-shrink-0">
                  <Check size={20} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    Amenities offered
                  </h2>
                  <p className="text-sm text-ink/60">
                    Tick everything that applies. Students filter heavily on Wi-Fi, food, and 24/7 essentials.
                  </p>
                </div>
              </div>
              {errors.amenities && (
                <div className="rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm p-3 flex items-start gap-2" role="alert">
                  <Info size={18} className="flex-shrink-0 mt-0.5" />
                  {errors.amenities}
                </div>
              )}
              <AmenityPicker amenities={amenitiesList} selectedIds={amenityIds} onChange={setAmenityIds} />
            </div>
          </div>

          {/* Step 5 */}
          <div className={stepPaneClasses(5)} aria-hidden={step !== 5}>
            <div className="space-y-4">
              <div className="flex items-start gap-3 mb-2 pb-3 border-b border-ink/10">
                <div className="w-10 h-10 rounded-xl bg-marigold/15 text-marigold flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    Photos of the property
                  </h2>
                  <p className="text-sm text-ink/60">
                    Upload the common areas first, then rooms, washrooms, and the view. Star one as the cover photo.
                  </p>
                </div>
              </div>
              {errors.images && (
                <div className="rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm p-3 flex items-start gap-2" role="alert">
                  <Info size={18} className="flex-shrink-0 mt-0.5" />
                  {errors.images}
                </div>
              )}
              <ImageUploader
                images={images}
                onChange={setImages}
                onUpload={handleUpload}
                onRemovePersisted={handleRemovePersisted}
                onPrimaryChangePersisted={handleSetPrimaryPersisted}
              />
            </div>
          </div>

          {/* Step 6 */}
          <div className={stepPaneClasses(6)} aria-hidden={step !== 6}>
            <div className="space-y-6">
              <div className="flex items-start gap-3 mb-2 pb-3 border-b border-ink/10">
                <div className="w-10 h-10 rounded-xl bg-sage/15 text-sage flex items-center justify-center flex-shrink-0">
                  <Check size={20} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    Review & submit
                  </h2>
                  <p className="text-sm text-ink/60">
                    A quick look before your listing goes to our verification team.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-xl overflow-hidden border border-ink/10 bg-sand aspect-[4/3]">
                    {primaryImage ? (
                      <img
                        src={primaryImage.previewUrl}
                        alt={`Cover photo of ${basic.name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink/30">
                        <MapPin size={48} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {images
                        .filter((i) => i.id !== primaryImage?.id)
                        .slice(0, 4)
                        .map((i) => (
                          <img
                            key={i.id}
                            src={i.previewUrl}
                            alt={`Gallery photo of ${basic.name}`}
                            className="aspect-square object-cover rounded-lg border border-ink/10"
                          />
                        ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-3 space-y-5">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-indigo leading-tight">
                      {basic.name || '(No name yet)'}
                    </h3>
                    <p className="text-sm text-ink/60 mt-1">
                      {[basic.city, basic.collegeName].filter(Boolean).join(' • ') || 'Add a city so students can find you.'}
                    </p>
                    <p className="text-2xl font-mono font-semibold text-ink mt-3">
                      ₹{price.pricePerMonth.toLocaleString('en-IN')}
                      <span className="text-sm font-sans font-normal text-ink/50"> / month</span>
                      {price.securityDeposit ? (
                        <span className="text-sm font-sans font-normal text-ink/50 ml-3">
                          + ₹{price.securityDeposit.toLocaleString('en-IN')} deposit
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-sand/60">
                      <p className="text-[11px] uppercase tracking-wider text-ink/40">Rooms</p>
                      <p className="font-semibold text-ink">
                        {price.availableRooms || 0} / {price.totalRooms || 0} available
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-sand/60">
                      <p className="text-[11px] uppercase tracking-wider text-ink/40">Accommodates</p>
                      <p className="font-semibold text-ink">
                        {price.genderPreference === 'CO_ED' ? 'Co-Ed' : price.genderPreference}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-sand/60">
                      <p className="text-[11px] uppercase tracking-wider text-ink/40">Food</p>
                      <p className="font-semibold text-ink">
                        {price.foodIncluded ? 'Included' : 'Not included'}
                      </p>
                    </div>
                  </div>

                  {basic.description && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-ink/40 mb-1">Description</p>
                      <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                        {basic.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-ink/40 mb-2">
                      Amenities ({selectedAmenities.length})
                    </p>
                    {selectedAmenities.length === 0 ? (
                      <p className="text-sm text-ink/50">No amenities chosen yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedAmenities.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo/10 text-indigo border border-indigo/20"
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-indigo/5 border border-indigo/10 p-4 text-sm text-ink/70 flex items-start gap-3">
                    <Info size={18} className="text-indigo flex-shrink-0 mt-0.5" />
                    <p>
                      Submitting will send this listing to the admin team for verification. You
                      can still edit it during review.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="secondary" onClick={goPrev} className="inline-flex items-center gap-2">
          <ArrowLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        {step < 6 ? (
          <Button onClick={goNext} className="inline-flex items-center gap-2">
            Save & continue <ArrowRight size={16} />
          </Button>
        ) : (
          <Button
            onClick={submitForReview}
            disabled={submitting}
            className="inline-flex items-center gap-2"
          >
            <Send size={16} /> {submitting ? 'Submitting…' : 'Submit for review'}
          </Button>
        )}
      </div>
    </div>
  );
};
