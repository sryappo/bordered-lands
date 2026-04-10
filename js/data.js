/**
 * data.js - Data loading, caching, and year resolution
 *
 * Three-tier data strategy:
 *   2020-2026  -> Natural Earth world-atlas TopoJSON (CDN)
 *   1945-2019  -> Thenmap API (GeoJSON), fallback to historical-basemaps
 *   pre-1945   -> historical-basemaps GitHub repo (GeoJSON)
 */

const BorderData = (function () {
  // ---- Cache ----
  const cache = new Map();
  let modernGeoData = null;

  // ---- CDN / API URLs ----
  const WORLD_ATLAS_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';
  const THENMAP_URL = 'https://api.thenmap.net/v2/world-2/geo/';
  const HIST_BASE_URL =
    'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/';

  // Years available in the historical-basemaps repo (verified against actual files).
  // BCE years are stored as negative numbers internally.
  const HISTORICAL_YEARS = [
    -3000, -2000, -1500, -1000, -700, -500, -400, -323, -300, -200, -100, -1,
    100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
    1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600,
    1650, 1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914, 1920, 1930, 1938,
    1945, 1960, 1994, 2000, 2010
  ];

  /**
   * Build the GitHub raw URL for a historical-basemaps GeoJSON file.
   * BCE years use the pattern world_bcNNN.geojson; CE years use world_NNN.geojson.
   */
  function historicalUrl(year) {
    if (year < 0) {
      return HIST_BASE_URL + 'world_bc' + Math.abs(year) + '.geojson';
    }
    return HIST_BASE_URL + 'world_' + year + '.geojson';
  }

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

  // ---- ISO 3166-1 numeric -> country name mapping ----
  // Covers all UN-recognized states + commonly shown territories.
  const COUNTRY_NAMES = {
    '004':'Afghanistan','008':'Albania','012':'Algeria','016':'American Samoa',
    '020':'Andorra','024':'Angola','028':'Antigua and Barbuda','032':'Argentina',
    '036':'Australia','040':'Austria','044':'Bahamas','048':'Bahrain',
    '050':'Bangladesh','051':'Armenia','052':'Barbados','056':'Belgium',
    '060':'Bermuda','064':'Bhutan','068':'Bolivia','070':'Bosnia and Herzegovina',
    '072':'Botswana','076':'Brazil','084':'Belize','086':'British Indian Ocean Terr.',
    '090':'Solomon Islands','092':'British Virgin Islands','096':'Brunei',
    '100':'Bulgaria','104':'Myanmar','108':'Burundi','112':'Belarus',
    '116':'Cambodia','120':'Cameroon','124':'Canada','132':'Cape Verde',
    '136':'Cayman Islands','140':'Central African Rep.','144':'Sri Lanka',
    '148':'Chad','152':'Chile','156':'China','158':'Taiwan',
    '162':'Christmas Island','166':'Cocos Islands','170':'Colombia',
    '174':'Comoros','175':'Mayotte','178':'Congo','180':'Dem. Rep. Congo',
    '184':'Cook Islands','188':'Costa Rica','191':'Croatia','192':'Cuba',
    '196':'Cyprus','203':'Czechia','204':'Benin','208':'Denmark',
    '212':'Dominica','214':'Dominican Rep.','218':'Ecuador','222':'El Salvador',
    '226':'Equatorial Guinea','231':'Ethiopia','232':'Eritrea','233':'Estonia',
    '234':'Faroe Islands','238':'Falkland Islands','242':'Fiji','246':'Finland',
    '248':'Aland Islands','250':'France','254':'French Guiana',
    '258':'French Polynesia','260':'French Southern Terr.','262':'Djibouti',
    '266':'Gabon','268':'Georgia','270':'Gambia','275':'Palestine',
    '276':'Germany','288':'Ghana','292':'Gibraltar','296':'Kiribati',
    '300':'Greece','304':'Greenland','308':'Grenada','312':'Guadeloupe',
    '316':'Guam','320':'Guatemala','324':'Guinea','328':'Guyana',
    '332':'Haiti','336':'Vatican','340':'Honduras','344':'Hong Kong',
    '348':'Hungary','352':'Iceland','356':'India','360':'Indonesia',
    '364':'Iran','368':'Iraq','372':'Ireland','376':'Israel',
    '380':'Italy','384':'Ivory Coast','388':'Jamaica','392':'Japan',
    '398':'Kazakhstan','400':'Jordan','404':'Kenya',
    '408':'North Korea','410':'South Korea','414':'Kuwait',
    '417':'Kyrgyzstan','418':'Laos','422':'Lebanon','426':'Lesotho',
    '428':'Latvia','430':'Liberia','434':'Libya','438':'Liechtenstein',
    '440':'Lithuania','442':'Luxembourg','446':'Macau','450':'Madagascar',
    '454':'Malawi','458':'Malaysia','462':'Maldives','466':'Mali',
    '470':'Malta','474':'Martinique','478':'Mauritania','480':'Mauritius',
    '484':'Mexico','492':'Monaco','496':'Mongolia','498':'Moldova',
    '499':'Montenegro','500':'Montserrat','504':'Morocco','508':'Mozambique',
    '512':'Oman','516':'Namibia','520':'Nauru','524':'Nepal',
    '528':'Netherlands','531':'Curacao','533':'Aruba','540':'New Caledonia',
    '548':'Vanuatu','554':'New Zealand','558':'Nicaragua','562':'Niger',
    '566':'Nigeria','570':'Niue','578':'Norway','580':'N. Mariana Islands',
    '583':'Micronesia','584':'Marshall Islands','585':'Palau',
    '586':'Pakistan','591':'Panama','598':'Papua New Guinea','600':'Paraguay',
    '604':'Peru','608':'Philippines','612':'Pitcairn Islands','616':'Poland',
    '620':'Portugal','624':'Guinea-Bissau','626':'Timor-Leste',
    '630':'Puerto Rico','634':'Qatar','642':'Romania','643':'Russia',
    '646':'Rwanda','652':'Saint Barthelemy','654':'Saint Helena',
    '659':'Saint Kitts and Nevis','660':'Anguilla','662':'Saint Lucia',
    '663':'Saint Martin','666':'Saint Pierre and Miquelon',
    '670':'Saint Vincent and Grenadines','674':'San Marino',
    '678':'Sao Tome and Principe','682':'Saudi Arabia','686':'Senegal',
    '688':'Serbia','690':'Seychelles','694':'Sierra Leone','702':'Singapore',
    '703':'Slovakia','704':'Vietnam','705':'Slovenia','706':'Somalia',
    '710':'South Africa','716':'Zimbabwe','724':'Spain',
    '728':'South Sudan','729':'Sudan','732':'Western Sahara',
    '740':'Suriname','744':'Svalbard','748':'Eswatini','752':'Sweden',
    '756':'Switzerland','760':'Syria','762':'Tajikistan','764':'Thailand',
    '768':'Togo','772':'Tokelau','776':'Tonga',
    '780':'Trinidad and Tobago','784':'United Arab Emirates','788':'Tunisia',
    '792':'Turkey','795':'Turkmenistan','796':'Turks and Caicos',
    '798':'Tuvalu','800':'Uganda','804':'Ukraine',
    '807':'North Macedonia','818':'Egypt','826':'United Kingdom',
    '831':'Guernsey','832':'Jersey','833':'Isle of Man',
    '834':'Tanzania','840':'United States','850':'U.S. Virgin Islands',
    '854':'Burkina Faso','858':'Uruguay','860':'Uzbekistan',
    '862':'Venezuela','876':'Wallis and Futuna','882':'Samoa',
    '887':'Yemen','894':'Zambia',
    '010':'Antarctica','036':'Australia','260':'French Southern Terr.',
    '-99':'N. Cyprus','900':'Kosovo'
  };

  /**
   * Attach readable names to Natural Earth features using the ISO numeric id.
   */
  function attachCountryNames(geojson) {
    if (!geojson || !geojson.features) return geojson;
    for (const f of geojson.features) {
      if (f.id && COUNTRY_NAMES[f.id]) {
        if (!f.properties) f.properties = {};
        f.properties.name = COUNTRY_NAMES[f.id];
      }
    }
    return geojson;
  }

  /**
   * Load modern Natural Earth TopoJSON and convert to GeoJSON FeatureCollection.
   */
  async function loadModernBorders() {
    if (modernGeoData) return modernGeoData;
    const resp = await fetch(WORLD_ATLAS_URL);
    if (!resp.ok) throw new Error('Failed to load world-atlas: ' + resp.status);
    const topo = await resp.json();
    const geojson = topojson.feature(topo, topo.objects.countries);
    attachCountryNames(geojson);
    modernGeoData = geojson;
    return geojson;
  }

  /**
   * Load borders from Thenmap API for a specific year (1945-2019).
   */
  async function loadThenmapBorders(year) {
    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, 8000);
    try {
      const resp = await fetch(THENMAP_URL + year, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error('Thenmap API error: ' + resp.status);
      return await resp.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Load borders from historical-basemaps for the nearest available year.
   */
  async function loadHistoricalBorders(year) {
    const nearest = findNearestHistoricalYear(year);
    const cacheKey = 'hist_' + nearest;
    if (cache.has(cacheKey)) return { data: cache.get(cacheKey), actualYear: nearest };

    const url = historicalUrl(nearest);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Historical data error for ' + nearest + ': ' + resp.status);
    const geojson = await resp.json();
    cache.set(cacheKey, geojson);
    return { data: geojson, actualYear: nearest };
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
      result = { geojson: geojson, source: 'natural-earth', actualYear: year };
    } else if (year >= 1945) {
      try {
        const geojson = await loadThenmapBorders(year);
        result = { geojson: geojson, source: 'thenmap', actualYear: year };
      } catch (err) {
        console.warn('Thenmap failed for ' + year + ', falling back to historical-basemaps:', err.message);
        const { data, actualYear } = await loadHistoricalBorders(year);
        result = { geojson: data, source: 'historical-basemaps', actualYear: actualYear };
      }
    } else {
      const { data, actualYear } = await loadHistoricalBorders(year);
      result = { geojson: data, source: 'historical-basemaps', actualYear: actualYear };
    }

    cache.set(year, result);
    return result;
  }

  function getDisputedZones() {
    return DISPUTED_ZONES;
  }

  function getMinYear() {
    return HISTORICAL_YEARS[0]; // -3000
  }

  function getMaxYear() {
    return 2026;
  }

  return {
    loadBordersForYear: loadBordersForYear,
    getDisputedZones: getDisputedZones,
    getMinYear: getMinYear,
    getMaxYear: getMaxYear
  };
})();
