import * as topojson from 'topojson-client';
import type { Topology, Objects } from 'topojson-specification';
import type { BorderResult } from './types';
import { getCountryName } from './country-metadata';
import {
  WORLD_ATLAS_URL,
  THENMAP_URL,
  HIST_BASE_URL,
  HISTORICAL_YEARS,
  MIN_YEAR,
  MAX_YEAR,
} from './constants';

const cache = new Map<number, BorderResult>();
let modernGeoData: GeoJSON.FeatureCollection | null = null;

export function historicalUrl(year: number): string {
  if (year < 0) {
    return `${HIST_BASE_URL}world_bc${Math.abs(year)}.geojson`;
  }
  return `${HIST_BASE_URL}world_${year}.geojson`;
}

export function findNearestHistoricalYear(year: number): number {
  let best = HISTORICAL_YEARS[0];
  for (const hy of HISTORICAL_YEARS) {
    if (hy <= year) best = hy;
    else break;
  }
  return best;
}

function attachCountryNames(
  geojson: GeoJSON.FeatureCollection
): GeoJSON.FeatureCollection {
  for (const f of geojson.features) {
    if (f.id) {
      if (!f.properties) f.properties = {};
      const name = getCountryName(String(f.id));
      if (!name.startsWith('Country ')) {
        f.properties.name = name;
      }
    }
  }
  return geojson;
}

async function loadModernBorders(): Promise<GeoJSON.FeatureCollection> {
  if (modernGeoData) return modernGeoData;
  const resp = await fetch(WORLD_ATLAS_URL);
  if (!resp.ok) throw new Error(`Failed to load world-atlas: ${resp.status}`);
  const topo = (await resp.json()) as Topology<Objects<GeoJSON.GeoJsonProperties>>;
  const geojson = topojson.feature(
    topo,
    topo.objects.countries
  ) as GeoJSON.FeatureCollection;
  attachCountryNames(geojson);
  modernGeoData = geojson;
  return geojson;
}

async function loadThenmapBorders(
  year: number
): Promise<GeoJSON.FeatureCollection> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(`${THENMAP_URL}${year}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error(`Thenmap API error: ${resp.status}`);
    return (await resp.json()) as GeoJSON.FeatureCollection;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function loadHistoricalBorders(
  year: number
): Promise<{ data: GeoJSON.FeatureCollection; actualYear: number }> {
  const nearest = findNearestHistoricalYear(year);
  const cacheKey = nearest + 100000; // offset to avoid collision with regular years
  const cached = cache.get(cacheKey);
  if (cached) return { data: cached.geojson, actualYear: nearest };

  const url = historicalUrl(nearest);
  const resp = await fetch(url);
  if (!resp.ok)
    throw new Error(`Historical data error for ${nearest}: ${resp.status}`);
  const geojson = (await resp.json()) as GeoJSON.FeatureCollection;
  cache.set(cacheKey, {
    geojson,
    source: 'historical-basemaps',
    actualYear: nearest,
  });
  return { data: geojson, actualYear: nearest };
}

export async function loadBordersForYear(
  year: number
): Promise<BorderResult> {
  const cached = cache.get(year);
  if (cached) return cached;

  let result: BorderResult;

  if (year >= 2020) {
    const geojson = await loadModernBorders();
    result = { geojson, source: 'natural-earth', actualYear: year };
  } else if (year >= 1945) {
    try {
      const geojson = await loadThenmapBorders(year);
      result = { geojson, source: 'thenmap', actualYear: year };
    } catch {
      const { data, actualYear } = await loadHistoricalBorders(year);
      result = {
        geojson: data,
        source: 'historical-basemaps',
        actualYear,
      };
    }
  } else {
    const { data, actualYear } = await loadHistoricalBorders(year);
    result = { geojson: data, source: 'historical-basemaps', actualYear };
  }

  cache.set(year, result);
  return result;
}

// Disputed territories — curated GeoJSON (ported from legacy)
const DISPUTED_ZONES: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Kashmir', parties: 'India / Pakistan / China' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [73.5, 32.5], [74.0, 33.5], [75.0, 34.5], [76.0, 35.5],
          [77.5, 36.0], [78.5, 35.5], [79.0, 34.5], [78.5, 33.0],
          [77.0, 32.0], [75.5, 32.0], [73.5, 32.5],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Crimea', parties: 'Ukraine / Russia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [33.0, 45.0], [33.5, 45.5], [34.5, 45.5], [35.5, 45.3],
          [36.5, 45.5], [36.7, 45.0], [36.2, 44.5], [35.0, 44.4],
          [33.8, 44.4], [33.0, 44.6], [33.0, 45.0],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Western Sahara', parties: 'Morocco / Sahrawi Republic' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-17.1, 21.4], [-17.0, 23.0], [-16.0, 24.0], [-15.0, 25.0],
          [-13.2, 26.1], [-13.0, 24.0], [-12.0, 23.0], [-13.0, 21.4],
          [-15.0, 21.4], [-17.1, 21.4],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Golan Heights', parties: 'Israel / Syria' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [35.7, 32.7], [35.8, 33.0], [35.9, 33.3], [36.0, 33.3],
          [36.0, 33.0], [35.9, 32.7], [35.7, 32.7],
        ]],
      },
    },
  ],
};

export function getDisputedZones(): GeoJSON.FeatureCollection {
  return DISPUTED_ZONES;
}

export function getMinYear(): number {
  return MIN_YEAR;
}

export function getMaxYear(): number {
  return MAX_YEAR;
}
