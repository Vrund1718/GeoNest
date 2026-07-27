import {
  Wifi,
  Bath,
  Zap,
  Shirt,
  Droplets,
  Camera,
  Sparkles,
  UtensilsCrossed,
  Snowflake,
  CarFront,
  Shield,
  Lock,
  Fan,
  BedDouble,
  Sofa,
  WashingMachine,
  Refrigerator,
  Microwave,
  Coffee,
  Dumbbell,
  Library,
  Bike,
  LucideIcon,
} from 'lucide-react';

export type AmenityCategory =
  | 'SAFETY'
  | 'CONNECTIVITY'
  | 'FOOD'
  | 'LIFESTYLE'
  | 'LAUNDRY'
  | 'OTHER';

export interface Amenity {
  id: string;
  key: string;
  name: string;
  iconKey: string;
  category: AmenityCategory;
}

interface AmenityPickerProps {
  amenities: Amenity[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  wifi: Wifi,
  bath: Bath,
  power: Zap,
  laundry: Shirt,
  water: Droplets,
  cctv: Camera,
  housekeeping: Sparkles,
  food: UtensilsCrossed,
  ac: Snowflake,
  parking: CarFront,
  safety: Shield,
  lock: Lock,
  fan: Fan,
  bed: BedDouble,
  sofa: Sofa,
  washing: WashingMachine,
  fridge: Refrigerator,
  microwave: Microwave,
  coffee: Coffee,
  gym: Dumbbell,
  study: Library,
  bike: Bike,
};

const categoryLabel: Record<AmenityCategory, string> = {
  SAFETY: 'Safety & Security',
  CONNECTIVITY: 'Connectivity',
  FOOD: 'Food & Kitchen',
  LIFESTYLE: 'Lifestyle & Comfort',
  LAUNDRY: 'Laundry & Cleaning',
  OTHER: 'Other Amenities',
};

export const AmenityPicker = ({
  amenities,
  selectedIds,
  onChange,
  className = '',
}: AmenityPickerProps) => {
  const grouped = amenities.reduce<Record<AmenityCategory, Amenity[]>>(
    (acc, a) => {
      if (!acc[a.category]) acc[a.category] = [];
      acc[a.category].push(a);
      return acc;
    },
    {
      SAFETY: [],
      CONNECTIVITY: [],
      FOOD: [],
      LIFESTYLE: [],
      LAUNDRY: [],
      OTHER: [],
    }
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {(Object.keys(grouped) as AmenityCategory[]).map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink/50 mb-3">
              {categoryLabel[cat]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {items.map((a) => {
                const Icon = iconMap[a.iconKey] || Sparkles;
                const isSelected = selectedIds.includes(a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ease-out motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo ${
                      isSelected
                        ? 'bg-indigo text-sand border-indigo shadow-sm'
                        : 'bg-transparent text-ink border-indigo/30 hover:border-indigo hover:bg-indigo/5'
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{a.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const DEFAULT_AMENITIES: Amenity[] = [
  { id: 'wifi', key: 'wifi', name: 'Wi-Fi', iconKey: 'wifi', category: 'CONNECTIVITY' },
  { id: 'power', key: 'power', name: '24/7 Power Backup', iconKey: 'power', category: 'CONNECTIVITY' },
  { id: 'water', key: 'water', name: '24/7 Water Supply', iconKey: 'water', category: 'CONNECTIVITY' },
  { id: 'cctv', key: 'cctv', name: 'CCTV Surveillance', iconKey: 'cctv', category: 'SAFETY' },
  { id: 'safety', key: 'safety', name: 'Security Guard', iconKey: 'safety', category: 'SAFETY' },
  { id: 'lock', key: 'lock', name: 'Private Lockers', iconKey: 'lock', category: 'SAFETY' },
  { id: 'food', key: 'food', name: 'Mess / Tiffin', iconKey: 'food', category: 'FOOD' },
  { id: 'fridge', key: 'fridge', name: 'Refrigerator', iconKey: 'fridge', category: 'FOOD' },
  { id: 'microwave', key: 'microwave', name: 'Microwave', iconKey: 'microwave', category: 'FOOD' },
  { id: 'coffee', key: 'coffee', name: 'Tea/Coffee Maker', iconKey: 'coffee', category: 'FOOD' },
  { id: 'ac', key: 'ac', name: 'Air Conditioning', iconKey: 'ac', category: 'LIFESTYLE' },
  { id: 'fan', key: 'fan', name: 'Ceiling Fans', iconKey: 'fan', category: 'LIFESTYLE' },
  { id: 'bed', key: 'bed', name: 'Furnished Beds', iconKey: 'bed', category: 'LIFESTYLE' },
  { id: 'sofa', key: 'sofa', name: 'Common Lounge', iconKey: 'sofa', category: 'LIFESTYLE' },
  { id: 'gym', key: 'gym', name: 'Gym Access', iconKey: 'gym', category: 'LIFESTYLE' },
  { id: 'study', key: 'study', name: 'Study Room', iconKey: 'study', category: 'LIFESTYLE' },
  { id: 'bath', key: 'bath', name: 'Attached Bathrooms', iconKey: 'bath', category: 'LIFESTYLE' },
  { id: 'housekeeping', key: 'housekeeping', name: 'Housekeeping', iconKey: 'housekeeping', category: 'LAUNDRY' },
  { id: 'laundry', key: 'laundry', name: 'Laundry Service', iconKey: 'laundry', category: 'LAUNDRY' },
  { id: 'washing', key: 'washing', name: 'Washing Machine', iconKey: 'washing', category: 'LAUNDRY' },
  { id: 'parking', key: 'parking', name: 'Vehicle Parking', iconKey: 'parking', category: 'OTHER' },
  { id: 'bike', key: 'bike', name: 'Bike Stand', iconKey: 'bike', category: 'OTHER' },
];
