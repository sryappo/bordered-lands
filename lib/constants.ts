export const WORLD_ATLAS_URL =
  'https://unpkg.com/world-atlas@2/countries-110m.json';

export const THENMAP_URL = 'https://api.thenmap.net/v2/world-2/geo/';

export const HIST_BASE_URL =
  'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/';

export const MIN_YEAR = -3000;
export const MAX_YEAR = 2026;

export const HISTORICAL_YEARS = [
  -3000, -2000, -1500, -1000, -700, -500, -400, -323, -300, -200, -100, -1,
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279, 1300,
  1400, 1492, 1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1880,
  1900, 1914, 1920, 1930, 1938, 1945, 1960, 1994, 2000, 2010,
];

// Timing
export const HOLD_DELAY = 300;
export const INITIAL_SPEED = 500;
export const MIN_SPEED = 80;
export const ACCELERATION_TIME = 8000;
export const DEBOUNCE_MS = 60;
export const MORPH_STEP_MS = 300;
export const MORPH_JUMP_MS = 800;
export const CONTROL_HIDE_DELAY = 3000;
export const CONTROL_FADE_MS = 300;

// Era color palettes — discrete per era bracket
// Ancient/Classical (< 0): warm ambers/ochres
export const PALETTE_WARM = [
  '#8b6914', '#9b7424', '#7a6b3a', '#a0854a', '#6b5b2a',
  '#b08a3a', '#8a7a4a', '#7b6b1a', '#9a8a3a', '#6a5a3a',
  '#a88b3a', '#7a7a2a', '#8b7b4a', '#6b6b3a', '#9b8b2a',
  '#8a6a4a', '#7b8a3a', '#9a7a2a', '#6a7b4a', '#b07a3a',
];

// Medieval (0-1500): muted greens/browns
export const PALETTE_MUTED = [
  '#4a6b3a', '#5a7a4a', '#3a5b4a', '#6a7b3a', '#4a5b3a',
  '#5a6b4a', '#3a6b5a', '#6a6b4a', '#4a7b5a', '#5a5b3a',
  '#3a7b3a', '#6a5b4a', '#4a6b4a', '#5a7b3a', '#3a5b3a',
  '#6a7b5a', '#4a5b4a', '#5a6b3a', '#3a6b3a', '#6a6b5a',
];

// Modern (1500+): cooler teals/blues
export const PALETTE_COOL = [
  '#3a6b5e', '#4a7a6e', '#5a8a7e', '#3a5a7a', '#4a6a8a',
  '#5a7a6a', '#6a8a5a', '#4a6a5a', '#3a7a7a', '#5a6a7a',
  '#6a7a5a', '#4a8a7a', '#5a7a5a', '#3a6a6a', '#6a6a7a',
  '#4a7a5a', '#5a6a6a', '#3a8a6a', '#7a7a5a', '#4a5a7a',
];
