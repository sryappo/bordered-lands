import { describe, it, expect } from 'vitest';
import { matchFeatures } from '../geo-morph';

function makeFeature(
  id: string,
  name: string
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: 'Feature',
    id,
    properties: { name },
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    },
  };
}

function makeCollection(
  features: GeoJSON.Feature[]
): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features };
}

describe('matchFeatures', () => {
  it('matches features by ID', () => {
    const before = makeCollection([makeFeature('840', 'United States')]);
    const after = makeCollection([makeFeature('840', 'United States')]);
    const result = matchFeatures(before, after);

    expect(result.persisted).toHaveLength(1);
    expect(result.persisted[0].key).toBe('840');
    expect(result.appeared).toHaveLength(0);
    expect(result.disappeared).toHaveLength(0);
  });

  it('detects appearing countries', () => {
    const before = makeCollection([]);
    const after = makeCollection([makeFeature('840', 'United States')]);
    const result = matchFeatures(before, after);

    expect(result.persisted).toHaveLength(0);
    expect(result.appeared).toHaveLength(1);
  });

  it('detects disappearing countries', () => {
    const before = makeCollection([makeFeature('840', 'United States')]);
    const after = makeCollection([]);
    const result = matchFeatures(before, after);

    expect(result.persisted).toHaveLength(0);
    expect(result.disappeared).toHaveLength(1);
  });

  it('falls back to name matching when IDs differ', () => {
    const before = makeCollection([
      { ...makeFeature('1', 'France'), id: undefined },
    ]);
    const after = makeCollection([
      { ...makeFeature('2', 'France'), id: undefined },
    ]);
    // Manually set properties since spread might not work as expected
    before.features[0].properties = { name: 'France' };
    after.features[0].properties = { name: 'France' };
    before.features[0].id = undefined;
    after.features[0].id = undefined;

    const result = matchFeatures(before, after);
    expect(result.persisted).toHaveLength(1);
    expect(result.persisted[0].key).toBe('name:France');
  });
});
