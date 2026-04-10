import { describe, it, expect } from 'vitest';
import {
  getCountryName,
  getFeatureName,
  getEraId,
  getEraLabel,
  getEraPalette,
  formatYear,
} from '../country-metadata';
import { PALETTE_WARM, PALETTE_MUTED, PALETTE_COOL } from '../constants';

describe('getCountryName', () => {
  it('returns name for known ISO numeric code', () => {
    expect(getCountryName('840')).toBe('United States');
    expect(getCountryName('643')).toBe('Russia');
  });

  it('pads short codes to 3 digits', () => {
    expect(getCountryName('76')).toBe('Brazil');
    expect(getCountryName(76)).toBe('Brazil');
  });

  it('returns fallback for unknown code', () => {
    expect(getCountryName('999')).toBe('Country 999');
  });
});

describe('getFeatureName', () => {
  it('prefers properties.name', () => {
    const f = { type: 'Feature' as const, properties: { name: 'France', NAME: 'FRANCE' }, geometry: { type: 'Point' as const, coordinates: [0, 0] } };
    expect(getFeatureName(f)).toBe('France');
  });

  it('falls back through property keys', () => {
    const f = { type: 'Feature' as const, properties: { ADMIN: 'Germany' }, geometry: { type: 'Point' as const, coordinates: [0, 0] } };
    expect(getFeatureName(f)).toBe('Germany');
  });

  it('uses ID lookup as last resort', () => {
    const f = { type: 'Feature' as const, id: '840', properties: {}, geometry: { type: 'Point' as const, coordinates: [0, 0] } };
    expect(getFeatureName(f)).toBe('United States');
  });
});

describe('getEraId', () => {
  it('returns correct era for boundary years', () => {
    expect(getEraId(-3000)).toBe('ancient');
    expect(getEraId(-1000)).toBe('classical');
    expect(getEraId(0)).toBe('late-antiquity');
    expect(getEraId(500)).toBe('medieval');
    expect(getEraId(1500)).toBe('early-modern');
    expect(getEraId(1800)).toBe('empires');
    expect(getEraId(1914)).toBe('world-wars');
    expect(getEraId(1945)).toBe('cold-war');
    expect(getEraId(1991)).toBe('modern');
  });
});

describe('getEraLabel', () => {
  it('returns human-readable label', () => {
    expect(getEraLabel(2026)).toBe('Modern Era');
    expect(getEraLabel(-500)).toBe('Classical Antiquity');
    expect(getEraLabel(1200)).toBe('Medieval Period');
  });
});

describe('getEraPalette', () => {
  it('returns warm palette for BCE years', () => {
    expect(getEraPalette(-500)).toBe(PALETTE_WARM);
  });

  it('returns muted palette for medieval years', () => {
    expect(getEraPalette(800)).toBe(PALETTE_MUTED);
  });

  it('returns cool palette for modern years', () => {
    expect(getEraPalette(2000)).toBe(PALETTE_COOL);
  });
});

describe('formatYear', () => {
  it('formats BCE years', () => {
    expect(formatYear(-3000)).toBe('3000 BCE');
    expect(formatYear(-1)).toBe('1 BCE');
  });

  it('formats CE years', () => {
    expect(formatYear(2026)).toBe('2026');
    expect(formatYear(100)).toBe('100');
  });
});
