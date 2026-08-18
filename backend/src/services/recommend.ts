import mongoose from 'mongoose';
import PGListing from '../models/PGListing';
import Booking from '../models/Booking';
import Wishlist from '../models/Wishlist';
import Review from '../models/Review';
import RecommendationLog from '../models/RecommendationLog';

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

const normalize = (val: number, min: number, max: number) => {
  if (max - min === 0) return 0.5;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
};

const WEIGHTS = {
  distance: 0.2,
  price: 0.2,
  amenities: 0.2,
  rating: 0.2,
  popularity: 0.1,
  freshness: 0.1,
};

const ALGO_VERSION = 'v1-rule-based';

export const getRecommendations = async (userId: string | mongoose.Types.ObjectId, limit = 10) => {
  const userObjId = new mongoose.Types.ObjectId(userId as any);

  const pastBookings = await Booking.find({ userId: userObjId }).populate<{ pgId: any }>('pgId');
  const wishlistEntries = await Wishlist.find({ userId: userObjId }).populate<{ pgId: any }>('pgId');

  const preferencePgs: any[] = [
    ...pastBookings.map((b) => b.pgId),
    ...wishlistEntries.map((w) => w.pgId),
  ].filter(Boolean);

  let centerLat = 23.103;
  let centerLng = 72.5957;
  let minPrice = 5000;
  let maxPrice = 15000;
  const preferredAmenities = new Set<string>();

  if (preferencePgs.length > 0) {
    const lats = preferencePgs.map((p) => p.location?.coordinates?.[1] || 0).filter(Boolean);
    const lngs = preferencePgs.map((p) => p.location?.coordinates?.[0] || 0).filter(Boolean);
    if (lats.length) centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    if (lngs.length) centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    const prices = preferencePgs.map((p) => p.pricePerMonth).filter(Boolean);
    if (prices.length) {
      minPrice = Math.min(...prices) * 0.7;
      maxPrice = Math.max(...prices) * 1.3;
    }

    for (const p of preferencePgs) {
      if (Array.isArray(p.amenities)) {
        for (const a of p.amenities) {
          preferredAmenities.add(String(a));
        }
      }
    }
  }

  const candidates = await PGListing.find({
    status: 'active',
    isVerified: true,
    availableRooms: { $gt: 0 },
  }).populate('amenities');

  if (candidates.length === 0) return [];

  const allDistances = candidates.map((c) =>
    haversineMeters(centerLat, centerLng, c.location.coordinates[1], c.location.coordinates[0])
  );
  const allPrices = candidates.map((c) => c.pricePerMonth);
  const allAmenityCounts = candidates.map((c) => c.amenities.length);

  const maxDistance = Math.max(...allDistances, 1);
  const minPriceGlobal = Math.min(...allPrices);
  const maxPriceGlobal = Math.max(...allPrices);
  const maxAmenities = Math.max(...allAmenityCounts, 1);

  const popularityStats = await PGListing.aggregate([
    { $match: { _id: { $in: candidates.map((c) => c._id) } } },
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'pgId',
        as: 'bookings',
      },
    },
    {
      $project: {
        _id: 1,
        popularityCount: { $size: '$bookings' },
      },
    },
  ]);
  const popularityMap = new Map(popularityStats.map((s) => [s._id.toString(), s.popularityCount]));
  const maxPopularity = Math.max(...Array.from(popularityMap.values()), 1);

  const ratingStats = await Review.aggregate([
    { $match: { pgId: { $in: candidates.map((c) => c._id) } } },
    { $group: { _id: '$pgId', avgRating: { $avg: '$rating' } } },
  ]);
  const ratingMap = new Map(ratingStats.map((r) => [r._id.toString(), r.avgRating]));

  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000;

  const scored = candidates.map((pg, i) => {
    const distance = allDistances[i];
    const distanceScore = 1 - normalize(distance, 0, maxDistance);

    const price = pg.pricePerMonth;
    let priceScore = 0.5;
    if (price >= minPrice && price <= maxPrice) {
      priceScore = 1 - normalize(price, minPriceGlobal, maxPriceGlobal);
    } else {
      priceScore = 0.2 * (1 - normalize(Math.abs(price - (minPrice + maxPrice) / 2), 0, maxPriceGlobal - minPriceGlobal));
    }

    const amenityCount = pg.amenities.length;
    const preferredMatch = pg.amenities.filter((a: any) => preferredAmenities.has(String(a._id))).length;
    const amenitiesScore =
      0.5 * normalize(amenityCount, 0, maxAmenities) +
      0.5 * (preferredAmenities.size > 0 ? preferredMatch / preferredAmenities.size : 0.5);

    const rating = ratingMap.get(pg._id.toString()) || 0;
    const ratingScore = rating / 5;

    const popularity = popularityMap.get(pg._id.toString()) || 0;
    const popularityScore = normalize(popularity, 0, maxPopularity);

    const age = now - new Date(pg.createdAt).getTime();
    const freshnessScore = Math.max(0, 1 - age / maxAge);

    const score =
      WEIGHTS.distance * distanceScore +
      WEIGHTS.price * priceScore +
      WEIGHTS.amenities * amenitiesScore +
      WEIGHTS.rating * ratingScore +
      WEIGHTS.popularity * popularityScore +
      WEIGHTS.freshness * freshnessScore;

    return { pg, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  const logs = top.map((t) => ({
    userId: userObjId,
    pgId: t.pg._id,
    score: t.score,
    algorithmVersion: ALGO_VERSION,
  }));
  if (logs.length > 0) {
    await RecommendationLog.insertMany(logs).catch(() => {});
  }

  return top.map((t) => ({
    pg: t.pg,
    score: Math.round(t.score * 10000) / 10000,
    algorithmVersion: ALGO_VERSION,
  }));
};

export const computeDefaultScoreSort = (
  candidates: any[],
  centerLat: number,
  centerLng: number,
  priceRange?: { min?: number; max?: number }
) => {
  if (candidates.length === 0) return [];

  const allDistances = candidates.map((c) =>
    haversineMeters(centerLat, centerLng, c.location.coordinates[1], c.location.coordinates[0])
  );
  const allPrices = candidates.map((c) => c.pricePerMonth);
  const maxDistance = Math.max(...allDistances, 1);
  const minPriceGlobal = Math.min(...allPrices);
  const maxPriceGlobal = Math.max(...allPrices);

  const ratedMap = new Map<string, number>();
  for (const c of candidates) {
    const reviews = (c as any).reviews || [];
    if (reviews.length > 0) {
      ratedMap.set(String(c._id), reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length);
    }
  }

  return candidates.map((pg, i) => {
    const distance = (pg as any)._distanceMeters ?? allDistances[i];
    const distanceScore = 1 - normalize(distance, 0, maxDistance);

    const price = pg.pricePerMonth;
    let priceScore = 1 - normalize(price, minPriceGlobal, maxPriceGlobal);
    if (priceRange?.min != null && priceRange?.max != null) {
      if (price < priceRange.min || price > priceRange.max) priceScore *= 0.3;
    }

    const amenitiesCount = Array.isArray(pg.amenities) ? pg.amenities.length : 0;
    const amenitiesScore = Math.min(1, amenitiesCount / 8);

    const rating = ratedMap.get(String(pg._id)) || 0;
    const ratingScore = rating / 5;

    const age = Date.now() - new Date(pg.createdAt).getTime();
    const freshnessScore = Math.max(0, 1 - age / (60 * 24 * 60 * 60 * 1000));

    const score =
      WEIGHTS.distance * distanceScore +
      WEIGHTS.price * priceScore +
      WEIGHTS.amenities * amenitiesScore +
      WEIGHTS.rating * ratingScore +
      WEIGHTS.popularity * 0.5 +
      WEIGHTS.freshness * freshnessScore;

    return { pg, score };
  });
};
