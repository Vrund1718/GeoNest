import axios from 'axios';
import { config } from '../config';

interface CommuteResult {
  walkingTimeMinutes: number;
  drivingTimeMinutes: number;
  distanceMeters: number;
  isEstimate: boolean;
}

const cache = new Map<string, { data: CommuteResult; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

export const getCommuteInfo = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<CommuteResult> => {
  const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}-${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const distanceMeters = haversineMeters(originLat, originLng, destLat, destLng);

  // Fallback estimates based on average speeds (Walking: 4.5 km/h = 75 m/min, Driving: 30 km/h = 500 m/min)
  const fallbackResult: CommuteResult = {
    distanceMeters: Math.round(distanceMeters),
    walkingTimeMinutes: Math.max(1, Math.round(distanceMeters / 75)),
    drivingTimeMinutes: Math.max(1, Math.round(distanceMeters / 500)),
    isEstimate: true,
  };

  if (!config.orsApiKey) {
    return fallbackResult;
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${config.orsApiKey}&start=${originLng},${originLat}&end=${destLng},${destLat}`;
    const { data } = await axios.get(url, { timeout: 3000 });

    const summary = data?.features?.[0]?.properties?.summary;
    if (summary && summary.duration != null) {
      const walkingSec = summary.duration;
      const drivingSec = Math.round(walkingSec / 4); // Approx driving ratio

      const realResult: CommuteResult = {
        distanceMeters: Math.round(summary.distance || distanceMeters),
        walkingTimeMinutes: Math.max(1, Math.round(walkingSec / 60)),
        drivingTimeMinutes: Math.max(1, Math.round(drivingSec / 60)),
        isEstimate: false,
      };

      cache.set(cacheKey, { data: realResult, expiresAt: Date.now() + CACHE_TTL_MS });
      return realResult;
    }
  } catch (err) {
    console.warn('[OpenRouteService Fallback]', (err as any)?.message || err);
  }

  cache.set(cacheKey, { data: fallbackResult, expiresAt: Date.now() + CACHE_TTL_MS });
  return fallbackResult;
};

export const computeNeighbourhoodScore = (nearbyPlaces: Record<string, any[]>): { score: number; label: string; details: string[] } => {
  let pts = 0;
  const details: string[] = [];

  const types = Object.keys(nearbyPlaces || {});
  if (types.includes('hospital') || types.includes('medical_store')) {
    pts += 2.5;
    details.push('Healthcare & Pharmacy nearby');
  }
  if (types.includes('restaurant') || types.includes('food') || types.includes('cafe')) {
    pts += 2.5;
    details.push('Food joints & Mess options');
  }
  if (types.includes('atm') || types.includes('bank')) {
    pts += 2.0;
    details.push('ATMs & Banks');
  }
  if (types.includes('bus_stop') || types.includes('metro_station')) {
    pts += 2.0;
    details.push('Public Transport connectivity');
  }
  if (types.includes('gym') || types.includes('park')) {
    pts += 1.0;
    details.push('Fitness & Recreation');
  }

  const finalScore = Math.min(10, Math.max(1, Math.round(pts * 10) / 10));
  const label = finalScore >= 8 ? 'Excellent Livability' : finalScore >= 6 ? 'Good Neighborhood' : 'Moderate Access';

  return { score: finalScore, label, details };
};

export const summarizeReviewSentiment = (reviews: Array<{ text: string; rating: number }>) => {
  if (!reviews || reviews.length < 3) return null;

  const text = reviews.map((r) => r.text.toLowerCase()).join(' ');

  const posKeywords = ['clean', 'spacious', 'food', 'mess', 'safe', 'wifi', 'peaceful', 'friendly', 'good', 'great', 'owner', 'location'];
  const negKeywords = ['noisy', 'water', 'dirty', 'small', 'expensive', 'bad', 'slow', 'curfew', 'smell', 'mosquito'];

  const foundPos = posKeywords.filter((kw) => text.includes(kw));
  const foundNeg = negKeywords.filter((kw) => text.includes(kw));

  const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  const posPercent = Math.round((avgRating / 5) * 100);

  return {
    sentimentRatio: `${posPercent}% positive student rating`,
    studentsLike: foundPos.slice(0, 4).map((w) => w.charAt(0).toUpperCase() + w.slice(1)),
    studentsDislike: foundNeg.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)),
  };
};
