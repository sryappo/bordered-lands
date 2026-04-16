import type * as GeoJSON from 'geojson';
import type { CShapesProperties } from './types';

const CSHAPES_DATASET_MAX_YEAR = 2023;
const CSHAPES_DATASET_MIN_YEAR = 1886;

let cshapesData: GeoJSON.FeatureCollection | null = null;
let loadPromise: Promise<GeoJSON.FeatureCollection> | null = null;

export const CSHAPES_MIN_YEAR = CSHAPES_DATASET_MIN_YEAR;
export const CSHAPES_MAX_YEAR = CSHAPES_DATASET_MAX_YEAR;

export async function loadCShapes(): Promise<GeoJSON.FeatureCollection> {
  if (cshapesData) return cshapesData;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/cshapes-2.1-simplified.json')
    .then(r => {
      if (!r.ok) throw new Error(`CShapes load failed: ${r.status}`);
      return r.json();
    })
    .then((data: GeoJSON.FeatureCollection) => {
      // Attach stable IDs for morph matching (CShapes has no `id`).
      data.features.forEach((f, i) => {
        if (!f.id) {
          const props = f.properties as CShapesProperties;
          f.id = `cshapes-${props.cntry_name}-${props.gwsyear}-${i}`;
        }
        if (f.properties && !(f.properties as any).name) {
          (f.properties as any).name = (f.properties as CShapesProperties).cntry_name;
        }
      });
      cshapesData = data;
      return data;
    })
    .catch(err => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

export function filterForYear(
  features: GeoJSON.Feature[],
  year: number
): GeoJSON.Feature[] {
  return features.filter(f => {
    const props = f.properties as CShapesProperties;
    const start = Number(props.gwsyear);
    let end = Number(props.gweyear);
    if (!end || end <= 0) end = CSHAPES_DATASET_MAX_YEAR;
    return year >= start && year <= end;
  });
}

export function detectDisputedForYear(
  features: GeoJSON.Feature[],
  year: number
): GeoJSON.Feature[] {
  return features.filter(f => {
    const props = f.properties as CShapesProperties;
    const start = Number(props.gwsyear);
    const end = Number(props.gweyear);
    if (!end || end <= 0) return year + 1 === start;
    return year === end || year + 1 === start;
  });
}

export async function loadCShapesForYear(
  year: number
): Promise<GeoJSON.FeatureCollection> {
  const data = await loadCShapes();
  return {
    type: 'FeatureCollection',
    features: filterForYear(data.features, year),
  };
}

export async function loadCShapesDisputedForYear(
  year: number
): Promise<GeoJSON.FeatureCollection> {
  const data = await loadCShapes();
  return {
    type: 'FeatureCollection',
    features: detectDisputedForYear(data.features, year),
  };
}
