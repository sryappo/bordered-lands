import { describe, it, expect } from 'vitest';
import { filterForYear, detectDisputedForYear } from '../cshapes-loader';
import type { Feature } from 'geojson';

function mkFeature(name: string, start: number, end: number): Feature {
  return {
    type: 'Feature',
    properties: { cntry_name: name, gwsyear: start, gweyear: end },
    geometry: { type: 'Point', coordinates: [0, 0] },
  };
}

describe('filterForYear', () => {
  const features = [
    mkFeature('A', 1900, 1950),
    mkFeature('B', 1945, 0), // ongoing
    mkFeature('C', 2000, 2020),
  ];

  it('returns features active at the given year', () => {
    expect(filterForYear(features, 1920).map(f => (f.properties as any).cntry_name)).toEqual(['A']);
  });

  it('treats gweyear=0 as ongoing', () => {
    expect(filterForYear(features, 2010).map(f => (f.properties as any).cntry_name)).toContain('B');
  });

  it('includes features active at boundary years', () => {
    expect(filterForYear(features, 1945).map(f => (f.properties as any).cntry_name).sort()).toEqual(['A', 'B']);
    expect(filterForYear(features, 1950).map(f => (f.properties as any).cntry_name)).toContain('A');
  });
});

describe('detectDisputedForYear', () => {
  const features = [
    mkFeature('A', 1900, 1950), // ends 1950 → disputed at 1950
    mkFeature('B', 1951, 2000), // starts 1951 → disputed at 1950
    mkFeature('C', 1945, 0),    // ongoing, not disputed
  ];

  it('flags features ending in the target year', () => {
    const names = detectDisputedForYear(features, 1950).map(f => (f.properties as any).cntry_name);
    expect(names).toContain('A');
  });

  it('flags features starting the next year', () => {
    const names = detectDisputedForYear(features, 1950).map(f => (f.properties as any).cntry_name);
    expect(names).toContain('B');
  });

  it('does not flag stable ongoing features', () => {
    const names = detectDisputedForYear(features, 1960).map(f => (f.properties as any).cntry_name);
    expect(names).not.toContain('C');
  });
});
