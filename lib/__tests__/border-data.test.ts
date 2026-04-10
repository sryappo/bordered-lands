import { describe, it, expect } from 'vitest';
import {
  historicalUrl,
  findNearestHistoricalYear,
} from '../border-data';

describe('historicalUrl', () => {
  it('builds BCE URL with bc prefix', () => {
    expect(historicalUrl(-3000)).toBe(
      'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_bc3000.geojson'
    );
    expect(historicalUrl(-500)).toBe(
      'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_bc500.geojson'
    );
  });

  it('builds CE URL without prefix', () => {
    expect(historicalUrl(1900)).toBe(
      'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1900.geojson'
    );
  });
});

describe('findNearestHistoricalYear', () => {
  it('returns exact match when available', () => {
    expect(findNearestHistoricalYear(-3000)).toBe(-3000);
    expect(findNearestHistoricalYear(1900)).toBe(1900);
  });

  it('snaps to nearest year <= target', () => {
    expect(findNearestHistoricalYear(-2500)).toBe(-3000);
    expect(findNearestHistoricalYear(1950)).toBe(1945);
    expect(findNearestHistoricalYear(1850)).toBe(1815);
  });

  it('returns first year for values before the range', () => {
    expect(findNearestHistoricalYear(-5000)).toBe(-3000);
  });
});
