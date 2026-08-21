import { Router, Request } from 'express';
import mongoose from 'mongoose';
import PGListing from '../models/PGListing';
import Image from '../models/Image';
import Review from '../models/Review';
import Booking from '../models/Booking';
import Wishlist from '../models/Wishlist';
import Complaint from '../models/Complaint';
import NearbyPlace from '../models/NearbyPlace';
import Amenity from '../models/Amenity';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { geocodeWithFallback } from '../services/geocoding';
import { computeDefaultScoreSort, getRecommendations } from '../services/recommend';
import { sendNotification } from '../utils/notifications';
import { bookingSchema, reviewSchema, complaintSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const {
      query,
      radiusKm = '5',
      minPrice,
      maxPrice,
      genderPreference,
      amenities,
      sortBy,
    } = req.query;

    let pipeline: any[] = [];

    const baseMatch: any = {
      status: 'active',
    };

    let centerLat = 23.0225;
    let centerLng = 72.5714;

    if (query && typeof query === 'string' && query.trim().length > 0) {
      const geo = await geocodeWithFallback(query.trim());
      if (geo) {
        centerLat = geo.lat;
        centerLng = geo.lng;
        pipeline.push({
          $geoNear: {
            near: { type: 'Point', coordinates: [centerLng, centerLat] },
            distanceField: 'distMeters',
            maxDistance: (parseFloat(radiusKm as string) || 5) * 1000,
            query: baseMatch,
            spherical: true,
          },
        });
      } else {
        pipeline.push({ $match: baseMatch });
      }
    } else {
      pipeline.push({ $match: baseMatch });
    }

    const filterMatch: any = {};
    if (minPrice) filterMatch.pricePerMonth = { ...(filterMatch.pricePerMonth || {}), $gte: parseFloat(minPrice as string) };
    if (maxPrice) filterMatch.pricePerMonth = { ...(filterMatch.pricePerMonth || {}), $lte: parseFloat(maxPrice as string) };
    if (genderPreference) filterMatch.genderPreference = genderPreference;
    if (amenities && typeof amenities === 'string' && amenities.trim().length > 0) {
      const amenityNames = amenities.split(',').map((a) => a.trim()).filter(Boolean);
      const foundAmenities = await Amenity.find({ name: { $in: amenityNames } });
      if (foundAmenities.length > 0) {
        filterMatch.amenities = { $in: foundAmenities.map((a) => a._id) };
      }
    }
    if (Object.keys(filterMatch).length > 0) {
      pipeline.push({ $match: filterMatch });
    }

    pipeline.push({ $lookup: { from: 'amenities', localField: 'amenities', foreignField: '_id', as: 'amenities' } });
    pipeline.push({ $lookup: { from: 'reviews', localField: '_id', foreignField: 'pgId', as: 'reviews' } });
    pipeline.push({
      $lookup: {
        from: 'images',
        localField: '_id',
        foreignField: 'pgId',
        as: 'allImages',
        pipeline: [{ $sort: { isPrimary: -1, createdAt: 1 } }],
      },
    });

    let results = await PGListing.aggregate(pipeline).allowDiskUse(true);

    const sortByVal = typeof sortBy === 'string' ? sortBy : 'recommended';
    if (sortByVal === 'distance' && results[0]?.distMeters != null) {
      results.sort((a, b) => a.distMeters - b.distMeters);
    } else if (sortByVal === 'price') {
      results.sort((a, b) => a.pricePerMonth - b.pricePerMonth);
    } else if (sortByVal === 'rating') {
      results.sort((a, b) => {
        const ar = a.reviews?.length ? a.reviews.reduce((s: number, r: any) => s + r.rating, 0) / a.reviews.length : 0;
        const br = b.reviews?.length ? b.reviews.reduce((s: number, r: any) => s + r.rating, 0) / b.reviews.length : 0;
        return br - ar;
      });
    } else if (sortByVal === 'popularity') {
      results.sort((a, b) => (b.reviews?.length || 0) - (a.reviews?.length || 0));
    } else {
      const scored = computeDefaultScoreSort(
        results,
        centerLat,
        centerLng,
        minPrice || maxPrice
          ? {
              min: minPrice ? parseFloat(minPrice as string) : undefined,
              max: maxPrice ? parseFloat(maxPrice as string) : undefined,
            }
          : undefined
      );
      scored.sort((a, b) => b.score - a.score);
      results = scored.map((s) => ({ ...s.pg, _score: s.score }));
    }

    const formatted = results.map((r) => {
      const reviews = r.reviews || [];
      const avgRating = reviews.length
        ? reviews.reduce((s: number, rev: any) => s + rev.rating, 0) / reviews.length
        : null;
      return {
        ...r,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: reviews.length,
        primaryImage: r.allImages?.[0]?.url || null,
        distanceMeters: r.distMeters ?? undefined,
        allImages: undefined,
        reviews: undefined,
      };
    });

    return res.json({ results: formatted });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Invalid PG ID' });
    }
    const pg = await PGListing.findById(id).populate('amenities');
    if (!pg || pg.status === 'deleted') {
      return res.status(404).json({ error: 'PG not found' });
    }
    const images = await Image.find({ pgId: id }).sort({ isPrimary: -1, createdAt: 1 });
    const reviews = await Review.find({ pgId: id })
      .populate('userId', 'name createdAt')
      .sort({ createdAt: -1 });
    const nearby = await NearbyPlace.find({ pgId: id }).sort({ placeType: 1, distanceMeters: 1 });
    const avgRating = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

    const nearbyGrouped: Record<string, any[]> = {};
    for (const np of nearby) {
      if (!nearbyGrouped[np.placeType]) nearbyGrouped[np.placeType] = [];
      nearbyGrouped[np.placeType].push(np);
    }

    return res.json({
      pg,
      images,
      reviews,
      averageRating: avgRating,
      reviewCount: reviews.length,
      nearbyPlaces: nearbyGrouped,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/:id/nearby-places', async (req, res) => {
  try {
    const places = await NearbyPlace.find({ pgId: req.params.id }).sort({ placeType: 1, distanceMeters: 1 });
    const grouped: Record<string, any[]> = {};
    for (const p of places) {
      if (!grouped[p.placeType]) grouped[p.placeType] = [];
      grouped[p.placeType].push(p);
    }
    return res.json({ grouped, places });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/book', requireAuth, validate(bookingSchema), async (req: AuthRequest, res) => {
  try {
    const pg = await PGListing.findById(req.params.id).populate<{ ownerId: any }>('ownerId');
    if (!pg || pg.status === 'deleted' || pg.availableRooms <= 0) {
      return res.status(400).json({ error: 'PG not available' });
    }
    const { startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return res.status(400).json({ error: 'End date must be after start' });

    const existing = await Booking.findOne({
      pgId: pg._id,
      userId: req.user!._id,
      status: { $in: ['requested', 'confirmed'] },
    });
    if (existing) return res.status(400).json({ error: 'You already have an active booking for this PG' });

    const booking = await Booking.create({
      pgId: pg._id,
      userId: req.user!._id,
      status: 'requested',
      startDate: start,
      endDate: end,
    });

    await sendNotification(
      req.user!._id,
      'booking_request',
      'Booking Request Sent',
      `Your booking for "${pg.name}" has been submitted.`
    );

    const ownerUserId = (pg.ownerId as any)?.userId;
    if (ownerUserId) {
      await sendNotification(
        ownerUserId,
        'booking_request',
        'New Booking Request',
        `${req.user!.name} has requested to book "${pg.name}".`
      );
    }

    return res.status(201).json({ booking });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Booking failed' });
  }
});

router.post('/:id/wishlist', requireAuth, async (req: AuthRequest, res) => {
  try {
    const pg = await PGListing.findById(req.params.id);
    if (!pg) return res.status(404).json({ error: 'PG not found' });
    const exists = await Wishlist.findOne({ userId: req.user!._id, pgId: pg._id });
    if (exists) {
      await Wishlist.deleteOne({ _id: exists._id });
      return res.json({ wishlisted: false });
    }
    await Wishlist.create({ userId: req.user!._id, pgId: pg._id });
    return res.status(201).json({ wishlisted: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/reviews', requireAuth, validate(reviewSchema), async (req: AuthRequest, res) => {
  try {
    const pg = await PGListing.findById(req.params.id);
    if (!pg) return res.status(404).json({ error: 'PG not found' });
    const existing = await Review.findOne({ pgId: pg._id, userId: req.user!._id });
    if (existing) return res.status(400).json({ error: 'You have already reviewed this PG' });
    const { rating, text } = req.body;
    const review = await Review.create({
      pgId: pg._id,
      userId: req.user!._id,
      rating,
      text,
      sentimentScore: null,
      isFlaggedFake: null,
    });
    await review.populate('userId', 'name createdAt');
    return res.status(201).json({ review });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed' });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ pgId: req.params.id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    const avg = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;
    return res.json({ reviews, averageRating: avg, reviewCount: reviews.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/complaints', requireAuth, validate(complaintSchema), async (req: AuthRequest, res) => {
  try {
    const pg = await PGListing.findById(req.params.id);
    if (!pg) return res.status(404).json({ error: 'PG not found' });
    const { type, description } = req.body;
    const complaint = await Complaint.create({
      userId: req.user!._id,
      pgId: pg._id,
      type,
      description,
      status: 'open',
    });
    return res.status(201).json({ complaint });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

export default router;
