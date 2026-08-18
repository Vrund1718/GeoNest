import axios from 'axios';
import NearbyPlace, { NearbyPlaceType, INearbyPlace } from '../models/NearbyPlace';
import mongoose from 'mongoose';

const PLACE_TAGS: Record<NearbyPlaceType, string> = {
  hospital: '"amenity"="hospital"',
  atm: '"amenity"="atm"',
  gym: '"leisure"="fitness_centre"',
  restaurant: '"amenity"="restaurant"',
  medical_store: '"amenity"="pharmacy"',
  bus_stop: '"highway"="bus_stop"',
  metro_station: '"public_transport"="station"',
  police: '"amenity"="police"',
};

const PLACE_TYPES: NearbyPlaceType[] = [
  'hospital', 'atm', 'gym', 'restaurant', 'medical_store', 'bus_stop', 'metro_station', 'police',
];

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const FALLBACK_PLACES: Record<NearbyPlaceType, { name: string; offset: [number, number] }[]> = {
  hospital: [
    { name: 'Shalby Hospital', offset: [0.006, 0.008] },
    { name: 'Zydus Hospital', offset: [-0.009, 0.005] },
  ],
  atm: [
    { name: 'HDFC Bank ATM', offset: [0.002, -0.003] },
    { name: 'ICICI ATM', offset: [-0.003, 0.006] },
  ],
  gym: [
    { name: 'Gold Gym', offset: [0.005, -0.007] },
    { name: 'FitZone Fitness', offset: [-0.006, -0.004] },
  ],
  restaurant: [
    { name: 'Vadilal Food Zone', offset: [0.003, 0.004] },
    { name: 'Honest Restaurant', offset: [-0.002, -0.005] },
  ],
  medical_store: [
    { name: 'Apollo Pharmacy', offset: [0.001, 0.003] },
    { name: 'MedPlus Pharmacy', offset: [-0.004, -0.002] },
  ],
  bus_stop: [
    { name: 'SG Highway Bus Stop', offset: [0.004, 0.001] },
    { name: 'Prahlad Nagar Bus Stop', offset: [-0.007, 0.003] },
  ],
  metro_station: [
    { name: 'Shyamal Metro Station', offset: [0.012, -0.008] },
    { name: 'Thaltej Metro Station', offset: [-0.011, 0.009] },
  ],
  police: [
    { name: 'Bodakdev Police Station', offset: [0.008, 0.006] },
    { name: 'Prahlad Nagar Police Booth', offset: [-0.005, -0.009] },
  ],
};

export const fetchAndStoreNearbyPlaces = async (
  pgId: string | mongoose.Types.ObjectId,
  lat: number,
  lng: number,
  radiusMeters = 1500
): Promise<INearbyPlace[]> => {
  const results: INearbyPlace[] = [];

  try {
    await NearbyPlace.deleteMany({ pgId });

    let overpassFailed = false;
    try {
      for (const pType of PLACE_TYPES) {
        const tag = PLACE_TAGS[pType];
        const query = `
          [out:json][timeout:15];
          node[${tag}](around:${radiusMeters},${lat},${lng});
          out body 10;
        `;
        const { data } = await axios.post('https://overpass-api.de/api/interpreter', query, {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 20000,
        });

        if (data?.elements?.length) {
          for (const el of data.elements.slice(0, 4)) {
            const distance = Math.round(haversine(lat, lng, el.lat, el.lon));
            const place = await NearbyPlace.create({
              pgId,
              placeType: pType,
              name: el.tags?.name || `${pType} nearby`,
              location: { type: 'Point', coordinates: [el.lon, el.lat] },
              distanceMeters: distance,
            });
            results.push(place);
          }
        }
      }
    } catch (err) {
      overpassFailed = true;
      console.warn('Overpass API failed, using fallback places');
    }

    if (overpassFailed || results.length === 0) {
      for (const pType of PLACE_TYPES) {
        const fallbacks = FALLBACK_PLACES[pType] || [];
        for (const f of fallbacks.slice(0, 2)) {
          const placeLat = lat + f.offset[0];
          const placeLng = lng + f.offset[1];
          const distance = Math.round(haversine(lat, lng, placeLat, placeLng));
          const place = await NearbyPlace.create({
            pgId,
            placeType: pType,
            name: f.name,
            location: { type: 'Point', coordinates: [placeLng, placeLat] },
            distanceMeters: distance,
          });
          results.push(place);
        }
      }
    }
  } catch (err) {
    console.error('fetchAndStoreNearbyPlaces error:', err);
  }

  return results;
};
