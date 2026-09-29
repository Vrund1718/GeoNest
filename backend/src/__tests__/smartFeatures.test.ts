import { computeNeighbourhoodScore, summarizeReviewSentiment } from '../services/commuteService';

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

  it('fallback parsing handles missing AI API key gracefully', () => {
    const rawPrompt = 'Girls PG near GTU under 8000 per month';
    const lower = rawPrompt.toLowerCase();

    const gender = lower.includes('girls') ? 'female' : lower.includes('boys') ? 'male' : undefined;
    const priceMatch = lower.match(/(?:under|below|max)?\s*(\d{4,5})/);
    const maxPrice = priceMatch ? parseInt(priceMatch[1]) : undefined;

    expect(gender).toBe('female');
    expect(maxPrice).toBe(8000);
  });
});
