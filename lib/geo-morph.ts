import * as d3 from 'd3';
import { interpolate as flubberInterpolate, fromCircle, toCircle } from 'flubber';
import { getFeatureName } from './country-metadata';

export interface MatchResult {
  persisted: {
    key: string;
    before: GeoJSON.Feature;
    after: GeoJSON.Feature;
  }[];
  appeared: { key: string; feature: GeoJSON.Feature }[];
  disappeared: { key: string; feature: GeoJSON.Feature }[];
}

function featureKey(f: GeoJSON.Feature): string {
  if (f.id != null && f.id !== '') return String(f.id);
  const name = f.properties?.name ?? f.properties?.NAME;
  if (name) return `name:${name}`;
  return '';
}

export function matchFeatures(
  before: GeoJSON.FeatureCollection,
  after: GeoJSON.FeatureCollection
): MatchResult {
  const beforeMap = new Map<string, GeoJSON.Feature>();
  for (const f of before.features) {
    const key = featureKey(f);
    if (key) beforeMap.set(key, f);
  }

  const persisted: MatchResult['persisted'] = [];
  const appeared: MatchResult['appeared'] = [];
  const matchedKeys = new Set<string>();

  for (const f of after.features) {
    const key = featureKey(f);
    if (!key) {
      appeared.push({ key: `anon:${appeared.length}`, feature: f });
      continue;
    }
    const beforeFeature = beforeMap.get(key);
    if (beforeFeature) {
      persisted.push({ key, before: beforeFeature, after: f });
      matchedKeys.add(key);
    } else {
      appeared.push({ key, feature: f });
    }
  }

  const disappeared: MatchResult['disappeared'] = [];
  for (const [key, f] of beforeMap) {
    if (!matchedKeys.has(key)) {
      disappeared.push({ key, feature: f });
    }
  }

  return { persisted, appeared, disappeared };
}

/**
 * Compute the centroid of a GeoJSON feature in projected (pixel) coordinates.
 */
function projectedCentroid(
  feature: GeoJSON.Feature,
  pathGenerator: d3.GeoPath
): [number, number] {
  const c = pathGenerator.centroid(feature);
  // centroid can return NaN for degenerate geometries
  if (isNaN(c[0]) || isNaN(c[1])) return [0, 0];
  return c;
}

export interface MorphAnimator {
  /** Call with t in [0, 1] to get interpolated path strings keyed by feature key */
  interpolateAt(t: number): Map<string, string>;
  /** All feature keys that will be present in the final state */
  finalKeys(): string[];
  /** Feature data for the final state, keyed by feature key */
  finalFeatures(): Map<string, GeoJSON.Feature>;
}

/**
 * Create a morph animator that interpolates between two border states.
 *
 * At t=0, renders `before`. At t=1, renders `after`.
 * In between, polygons morph smoothly via flubber.
 */
export function createMorphAnimator(
  before: GeoJSON.FeatureCollection,
  after: GeoJSON.FeatureCollection,
  pathGenerator: d3.GeoPath
): MorphAnimator {
  const match = matchFeatures(before, after);

  // Build interpolators for each transition type
  const interpolators = new Map<
    string,
    { fn: (t: number) => string; type: 'persist' | 'appear' | 'disappear' }
  >();

  for (const { key, before: bf, after: af } of match.persisted) {
    const pathBefore = pathGenerator(bf) ?? '';
    const pathAfter = pathGenerator(af) ?? '';
    if (pathBefore && pathAfter) {
      try {
        const fn = flubberInterpolate(pathBefore, pathAfter, {
          maxSegmentLength: 10,
        });
        interpolators.set(key, { fn, type: 'persist' });
      } catch {
        // Flubber can fail on complex multipolygons — fall back to snap
        interpolators.set(key, {
          fn: (t: number) => (t < 0.5 ? pathBefore : pathAfter),
          type: 'persist',
        });
      }
    }
  }

  for (const { key, feature } of match.appeared) {
    const pathAfter = pathGenerator(feature) ?? '';
    if (pathAfter) {
      const [cx, cy] = projectedCentroid(feature, pathGenerator);
      try {
        const fn = fromCircle(cx, cy, 2, pathAfter, {
          maxSegmentLength: 10,
        });
        interpolators.set(key, { fn, type: 'appear' });
      } catch {
        interpolators.set(key, {
          fn: (t: number) => (t > 0.5 ? pathAfter : ''),
          type: 'appear',
        });
      }
    }
  }

  for (const { key, feature } of match.disappeared) {
    const pathBefore = pathGenerator(feature) ?? '';
    if (pathBefore) {
      const [cx, cy] = projectedCentroid(feature, pathGenerator);
      try {
        const fn = toCircle(pathBefore, cx, cy, 2, {
          maxSegmentLength: 10,
        });
        interpolators.set(key, { fn, type: 'disappear' });
      } catch {
        interpolators.set(key, {
          fn: (t: number) => (t < 0.5 ? pathBefore : ''),
          type: 'disappear',
        });
      }
    }
  }

  // Build final features map
  const finals = new Map<string, GeoJSON.Feature>();
  for (const { key, after: af } of match.persisted) {
    finals.set(key, af);
  }
  for (const { key, feature } of match.appeared) {
    finals.set(key, feature);
  }

  return {
    interpolateAt(t: number): Map<string, string> {
      const result = new Map<string, string>();
      for (const [key, { fn }] of interpolators) {
        result.set(key, fn(t));
      }
      return result;
    },
    finalKeys(): string[] {
      return [...finals.keys()];
    },
    finalFeatures(): Map<string, GeoJSON.Feature> {
      return finals;
    },
  };
}
