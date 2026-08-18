import { Router } from 'express';
import mongoose from 'mongoose';
import { geocodeWithFallback } from '../services/geocoding';
import { computeDefaultScoreSort } from '../services/recommend';
import PGListing from '../models/PGListing';
import Amenity from '../models/Amenity';
import Review from '../models/Review';
import Image from '../models/Image';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    const result = await geocodeWithFallback(query);
    if (!result) {
      return res.status(404).json({ error: 'Could not geocode location' });
    }
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Geocode failed' });
  }
});

export default router;
