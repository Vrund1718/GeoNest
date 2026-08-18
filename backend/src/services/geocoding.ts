import axios from 'axios';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export const geocodeQuery = async (query: string): Promise<GeocodeResult | null> => {
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        addressdetails: 0,
      },
      headers: {
        'User-Agent': 'SmartPG-Recommendation-System/1.0',
      },
      timeout: 10000,
    });

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }
    return null;
  } catch (err) {
    console.warn('Nominatim geocode failed:', err);
    return null;
  }
};

export const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; displayName: string }> = {
  'nirma university': {
    lat: 23.1030,
    lng: 72.5957,
    displayName: 'Nirma University, SG Highway, Ahmedabad, Gujarat 382481',
  },
  ahmedabad: {
    lat: 23.0225,
    lng: 72.5714,
    displayName: 'Ahmedabad, Gujarat, India',
  },
  'iim ahmedabad': {
    lat: 23.0124,
    lng: 72.5385,
    displayName: 'IIM Ahmedabad, Vastrapur, Ahmedabad, Gujarat',
  },
  'ld engineering college': {
    lat: 23.0392,
    lng: 72.5504,
    displayName: 'LD Engineering College, Navrangpura, Ahmedabad, Gujarat',
  },
  'gj university': {
    lat: 23.0400,
    lng: 72.5450,
    displayName: 'Gujarat University, Navrangpura, Ahmedabad, Gujarat',
  },
};

export const geocodeWithFallback = async (query: string): Promise<GeocodeResult | null> => {
  const key = query.toLowerCase().trim();
  if (KNOWN_LOCATIONS[key]) {
    return KNOWN_LOCATIONS[key];
  }
  const online = await geocodeQuery(query);
  if (online) return online;
  for (const k of Object.keys(KNOWN_LOCATIONS)) {
    if (k.includes(key) || key.includes(k)) return KNOWN_LOCATIONS[k];
  }
  return { ...KNOWN_LOCATIONS.ahmedabad, displayName: `${query} (Ahmedabad default)` };
};
