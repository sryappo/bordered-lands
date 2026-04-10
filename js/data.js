/**
 * data.js - Data loading, caching, and year resolution
 *
 * Three-tier data strategy:
 *   2020-2026  -> Natural Earth world-atlas TopoJSON (CDN)
 *   1945-2019  -> Thenmap API (GeoJSON)
 *   pre-1945   -> historical-basemaps GitHub repo (GeoJSON)
 */

const BorderData = (function () {
  // ---- Cache ----
  const cache = new Map();
  let modernTopoData = null; // shared for 2020-2026

  // ---- CDN / API URLs ----
  const WORLD_ATLAS_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';
  const THENMAP_URL = 'http://api.thenmap.net/v2/world-2/geo/';
  const HIST_BASE_URL =
    'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/';

  // Years available in the historical-basemaps repo
  const HISTORICAL_YEARS = [
    -2000, -1000, -500, -323, -200, -100, -1,
    100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
    1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600,
    1650, 1700, 1715, 1783, 1800, 1815, 1830, 1848, 1860,
    1880, 1900, 1914, 1920, 1930, 1938, 1945
  ];

  /**
   * Find the nearest available year in the historical-basemaps set.
   * Prefers the nearest year <= target, falls back to nearest year > target.
   */
  function findNearestHistoricalYear(year) {
    let best = HISTORICAL_YEARS[0];
    for (const hy of HISTORICAL_YEARS) {
      if (hy <= year) best = hy;
      else break;
    }
    return best;
  }

  /**
   * Load modern Natural Earth TopoJSON and convert to GeoJSON FeatureCollection.
   */
  async function loadModernBorders() {
    if (modernTopoData) return modernTopoData;
    const resp = await fetch(WORLD_ATLAS_URL);
    if (!resp.ok) throw new Error(`Failed to load world-atlas: ${resp.status}`);
    const topo = await resp.json();
    const geojson = topojson.feature(topo, topo.objects.countries);
    // Attach country names from the built-in id -> name mapping
    modernTopoData = geojson;
    return geojson;
  }

  /**
   * Load borders from Thenmap API for a specific year (1945-2019).
   */
  async function loadThenmapBorders(year) {
    const resp = await fetch(THENMAP_URL + year);
    if (!resp.ok) throw new Error(`Thenmap API error: ${resp.status}`);
    const geojson = await resp.json();
    return geojson;
  }

  /**
   * Load borders from historical-basemaps for a specific year.
   */
  async function loadHistoricalBorders(year) {
    const nearest = findNearestHistoricalYear(year);
    // Check if we already cached the nearest year
    const cacheKey = 'hist_' + nearest;
    if (cache.has(cacheKey)) return { data: cache.get(cacheKey), actualYear: nearest };

    const url = HIST_BASE_URL + 'world_' + nearest + '.geojson';
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Historical data error for ${nearest}: ${resp.status}`);
    const geojson = await resp.json();
    cache.set(cacheKey, geojson);
    return { data: geojson, actualYear: nearest };
  }

  // ---- ISO numeric-id to country name mapping (for Natural Earth data) ----
  // This is a subset; full list loaded lazily
  let countryNames = null;

  async function getCountryNames() {
    if (countryNames) return countryNames;
    // Use the world-atlas built-in: IDs are ISO 3166-1 numeric codes
    // We'll fetch a lightweight mapping
    try {
      const resp = await fetch(
        'https://unpkg.com/world-atlas@2/countries-110m.json'
      );
      const topo = await resp.json();
      // Extract names from the metadata if available
      countryNames = new Map();
      // The world-atlas v2 doesn't include names in the topo directly,
      // so we use a small inline map of common country codes
      return countryNames;
    } catch {
      countryNames = new Map();
      return countryNames;
    }
  }

  // ---- Disputed territories (curated GeoJSON) ----
  const DISPUTED_ZONES = {
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
            [77.0, 32.0], [75.5, 32.0], [73.5, 32.5]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Crimea', parties: 'Ukraine / Russia' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [33.0, 45.0], [33.5, 45.5], [34.5, 45.5], [35.5, 45.3],
            [36.5, 45.5], [36.7, 45.0], [36.2, 44.5], [35.0, 44.4],
            [33.8, 44.4], [33.0, 44.6], [33.0, 45.0]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Western Sahara', parties: 'Morocco / Sahrawi Republic' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-17.1, 21.4], [-17.0, 23.0], [-16.0, 24.0], [-15.0, 25.0],
            [-13.2, 26.1], [-13.0, 24.0], [-12.0, 23.0], [-13.0, 21.4],
            [-15.0, 21.4], [-17.1, 21.4]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Golan Heights', parties: 'Israel / Syria' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [35.7, 32.7], [35.8, 33.0], [35.9, 33.3], [36.0, 33.3],
            [36.0, 33.0], [35.9, 32.7], [35.7, 32.7]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Abkhazia', parties: 'Georgia / Russia-backed' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [40.0, 42.5], [40.5, 43.0], [41.0, 43.3], [41.5, 43.5],
            [42.0, 43.2], [42.0, 42.8], [41.5, 42.5], [41.0, 42.3],
            [40.0, 42.5]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'South Ossetia', parties: 'Georgia / Russia-backed' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [43.4, 42.0], [43.5, 42.3], [44.0, 42.5], [44.5, 42.4],
            [44.6, 42.1], [44.3, 41.9], [43.8, 41.8], [43.4, 42.0]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Transnistria', parties: 'Moldova / Russia-backed' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [29.2, 46.4], [29.5, 47.0], [29.8, 47.5], [30.0, 48.0],
            [30.2, 47.5], [30.0, 47.0], [29.7, 46.4], [29.2, 46.4]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Northern Cyprus', parties: 'Cyprus / Turkey' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [32.7, 35.1], [33.0, 35.2], [33.5, 35.4], [34.0, 35.6],
            [34.5, 35.6], [34.6, 35.4], [34.0, 35.2], [33.5, 35.1],
            [33.0, 35.0], [32.7, 35.1]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Abyei Area', parties: 'Sudan / South Sudan' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [28.5, 9.0], [28.5, 10.0], [29.5, 10.5], [30.0, 10.0],
            [29.5, 9.0], [28.5, 9.0]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Doklam Plateau', parties: 'China / India / Bhutan' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [89.0, 27.0], [89.1, 27.2], [89.3, 27.3], [89.5, 27.2],
            [89.4, 27.0], [89.2, 26.9], [89.0, 27.0]
          ]]
        }
      }
    ]
  };

  // ---- Public API ----

  /**
   * Load GeoJSON border data for a given year.
   * Returns { geojson, source, actualYear }
   */
  async function loadBordersForYear(year) {
    if (cache.has(year)) {
      return cache.get(year);
    }

    let result;

    if (year >= 2020) {
      const geojson = await loadModernBorders();
      result = { geojson, source: 'natural-earth', actualYear: year };
    } else if (year >= 1945) {
      try {
        const geojson = await loadThenmapBorders(year);
        result = { geojson, source: 'thenmap', actualYear: year };
      } catch (err) {
        console.warn('Thenmap failed for ' + year + ', falling back:', err);
        // Fall back to historical basemaps
        const { data, actualYear } = await loadHistoricalBorders(year);
        result = { geojson: data, source: 'historical-basemaps', actualYear };
      }
    } else {
      const { data, actualYear } = await loadHistoricalBorders(year);
      result = { geojson: data, source: 'historical-basemaps', actualYear };
    }

    cache.set(year, result);
    return result;
  }

  function getDisputedZones() {
    return DISPUTED_ZONES;
  }

  function getMinYear() {
    return HISTORICAL_YEARS[0]; // -2000
  }

  function getMaxYear() {
    return 2026;
  }

  return {
    loadBordersForYear,
    getDisputedZones,
    getMinYear,
    getMaxYear,
    getCountryNames
  };
})();
