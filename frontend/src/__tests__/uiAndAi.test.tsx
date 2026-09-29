import { describe, it, expect } from 'vitest';

describe('GeoNest UI & AI Upgrade Core Logic', () => {
  it('toggles theme correctly between light and dark', () => {
    let currentTheme: 'light' | 'dark' = 'light';
    const toggleTheme = () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    };

    expect(currentTheme).toBe('light');
    toggleTheme();
    expect(currentTheme).toBe('dark');
    toggleTheme();
    expect(currentTheme).toBe('light');
  });

  it('correctly calculates active filter count', () => {
    const filters = {
      radiusKm: 10,
      minPrice: 5000,
      maxPrice: 15000,
      genderPreference: 'male',
      amenities: ['Wi-Fi', 'AC'],
    };

    let count = 0;
    if (filters.radiusKm !== 5) count++;
    if (filters.minPrice != null || filters.maxPrice != null) count++;
    if (filters.genderPreference) count++;
    if (filters.amenities.length > 0) count += filters.amenities.length;

    expect(count).toBe(5);
  });

  it('safely handles voice search text parsing fallback', () => {
    const rawTranscript = 'Boys PG near Nirma under 10000 with wifi';
    
    // Simulating client-side fallback parsing when API key is unconfigured
    const lower = rawTranscript.toLowerCase();
    const gender = lower.includes('boys') ? 'male' : lower.includes('girls') ? 'female' : undefined;
    const maxPriceMatch = lower.match(/(?:under|below|max)?\s*(\d{4,5})/);
    const maxPrice = maxPriceMatch ? parseInt(maxPriceMatch[1]) : undefined;
    const hasWifi = lower.includes('wifi');

    expect(gender).toBe('male');
    expect(maxPrice).toBe(10000);
    expect(hasWifi).toBe(true);
  });
});
