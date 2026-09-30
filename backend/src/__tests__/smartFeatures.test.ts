import { computeNeighbourhoodScore, summarizeReviewSentiment } from '../services/commuteService';
import { isRetryableError } from '../services/aiService';

describe('GeoNest Smart Features & AI Services', () => {
  it('computes neighbourhood score accurately based on nearby place categories', () => {
    const mockNearbyPlaces = {
      bus_stop: [{ name: 'Bus Station', type: 'bus_stop', distanceMeters: 300 }],
      hospital: [{ name: 'City Hospital', type: 'hospital', distanceMeters: 800 }],
      food: [{ name: 'Mess & Cafe', type: 'food', distanceMeters: 500 }],
      atm: [{ name: 'ATM', type: 'atm', distanceMeters: 200 }],
      gym: [{ name: 'Gym', type: 'gym', distanceMeters: 400 }],
    };

    const scoreData = computeNeighbourhoodScore(mockNearbyPlaces);
    expect(scoreData.score).toBe(10);
    expect(scoreData.label).toBe('Excellent Livability');
    expect(scoreData.details.length).toBe(5);
  });

  it('summarizes review sentiment into positive student likes and dislikes', () => {
    const mockReviews = [
      { text: 'Great food quality, fast wifi, clean room, but noisy street outside', rating: 4 },
      { text: 'Awesome location near college, hygienic mess food', rating: 5 },
      { text: 'Noisy traffic at night, but staff is very helpful', rating: 3 },
    ];

    const sentiment = summarizeReviewSentiment(mockReviews);
    expect(sentiment).not.toBeNull();
    if (sentiment) {
      expect(sentiment.sentimentRatio).toContain('positive student rating');
      expect(sentiment.studentsLike.length).toBeGreaterThan(0);
      expect(sentiment.studentsDislike.length).toBeGreaterThan(0);
    }
  });

  it('correctly classifies retryable vs non-retryable errors for AI resilient requests', () => {
    // 503 UNAVAILABLE & 429 TOO MANY REQUESTS are retryable
    expect(isRetryableError({ status: 503, message: 'This model is currently experiencing high demand.' })).toBe(true);
    expect(isRetryableError({ status: 429, message: 'Rate limit exceeded' })).toBe(true);
    expect(isRetryableError({ message: 'UNAVAILABLE spikes in demand' })).toBe(true);

    // 401 UNAUTHORIZED & 400 BAD REQUEST must fail fast (never retried)
    expect(isRetryableError({ status: 401, message: 'API_KEY_INVALID' })).toBe(false);
    expect(isRetryableError({ status: 400, message: 'INVALID_ARGUMENT' })).toBe(false);
  });
});
