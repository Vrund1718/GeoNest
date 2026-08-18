import { Router } from 'express';
import { getRecommendations } from '../services/recommend';
import { AuthRequest, requireAuth } from '../middleware/auth';
import Image from '../models/Image';
import Review from '../models/Review';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    const recs = await getRecommendations(req.user!._id, limit);

    const pgIds = recs.map((r) => r.pg._id);
    const images = await Image.find({ pgId: { $in: pgIds } });
    const reviews = await Review.find({ pgId: { $in: pgIds } });

    const imageMap = new Map<string, string>();
    for (const img of images) {
      const pgId = img.pgId.toString();
      if (!imageMap.has(pgId)) imageMap.set(pgId, img.url);
    }

    const reviewMap = new Map<string, { sum: number; count: number }>();
    for (const rev of reviews) {
      const pgId = rev.pgId.toString();
      const curr = reviewMap.get(pgId) || { sum: 0, count: 0 };
      curr.sum += rev.rating;
      curr.count += 1;
      reviewMap.set(pgId, curr);
    }

    const result = recs.map((r) => {
      const pgId = r.pg._id.toString();
      const reviewsInfo = reviewMap.get(pgId);
      const avgRating = reviewsInfo?.count
        ? Math.round((reviewsInfo.sum / reviewsInfo.count) * 10) / 10
        : null;
      return {
        ...r,
        pg: {
          ...(r.pg as any).toObject(),
          primaryImage: imageMap.get(pgId) || null,
          averageRating: avgRating,
          reviewCount: reviewsInfo?.count || 0,
        },
      };
    });

    return res.json({ recommendations: result });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Recommendation failed' });
  }
});

export default router;
