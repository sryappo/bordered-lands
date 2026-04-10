# Bordered Lands Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Historical Border Map as a polished Next.js/React portfolio piece with smooth border morphing, cinematic dark design, auto-hiding overlay controls, and a slide-in country info panel.

**Architecture:** Next.js App Router with a client-side D3.js map. React owns state (year, selected country, UI visibility); D3 renders SVG via refs. Data layer ports the existing three-tier fetch strategy. Flubber handles polygon interpolation for smooth border morphing.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, D3.js v7, topojson-client, flubber, Tailwind CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-04-10-bordered-lands-redesign-design.md`

---

## File Structure

```
_legacy/                    — archived original files (js/, css/, index.html)
app/
  layout.tsx                — root layout, Geist font, metadata, globals.css import
  page.tsx                  — server component shell, dynamic import of MapApp
  globals.css               — Tailwind directives + dark theme base styles
components/
  MapApp.tsx                — top-level 'use client' orchestrator: state, data loading, wiring
  Map/
    MapCanvas.tsx            — SVG element, D3 projection, zoom/pan setup
    render-countries.ts      — D3 rendering function: country fills, hover, morph transitions
    render-disputed.ts       — D3 rendering function: disputed territory overlay
    render-graticule.ts      — D3 rendering function: lat/lon grid lines
  Controls/
    ControlOverlay.tsx       — auto-hiding wrapper, 3s inactivity fade
    YearDisplay.tsx          — large cinematic year number + era label
    PlaybackButtons.tsx      — rewind/forward with click/hold/accelerate + spacebar
    SpeedIndicator.tsx       — "2x", "4x" display during continuous playback
    YearSlider.tsx           — range slider with debounced updates
  InfoPanel/
    InfoPanel.tsx            — slide-in country details from right edge
lib/
  constants.ts              — year ranges, API URLs, timing config, era palettes
  country-metadata.ts       — ISO numeric → country name, era label, era palette
  border-data.ts            — three-tier data fetching, caching, year resolution
  geo-morph.ts              — flubber-based polygon interpolation for border morphing
  types.ts                  — shared TypeScript types
lib/__tests__/
  country-metadata.test.ts  — tests for name lookup, era labels, palette selection
  border-data.test.ts       — tests for URL building, year snapping
  geo-morph.test.ts         — tests for polygon interpolation
vitest.config.ts            — test runner configuration
next.config.ts              — Next.js configuration
tailwind.config.ts          — Tailwind configuration
tsconfig.json               — TypeScript configuration
```

---

## Task 1: Project Scaffold

**Files:**
- Move: `js/`, `css/`, `index.html` → `_legacy/`
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/types.ts`

- [ ] **Step 1: Archive legacy files**

```bash
mkdir -p _legacy
mv js css index.html _legacy/
```

- [ ] **Step 2: Create package.json and install dependencies**

```bash
cat > package.json << 'PKGJSON'
{
  "name": "bordered-lands",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
PKGJSON

npm install next@latest react@latest react-dom@latest d3@7 topojson-client@3 flubber
npm install -D typescript @types/react @types/react-dom @types/d3 @types/topojson-client @types/node vitest @tailwindcss/postcss tailwindcss postcss
```

Note: `flubber` has no `@types/flubber`. We'll add a type declaration in step 5.

- [ ] **Step 3: Create TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "_legacy"]
}
```

- [ ] **Step 4: Create Next.js and build tool configs**

Create `next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

Create `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: '#0d1b2a',
        'dark-bg': '#0a0e1a',
        'accent-blue': '#4a9eff',
        'accent-amber': '#ffa726',
        'text-secondary': '#8899aa',
        border: '#2a3a4a',
      },
    },
  },
  plugins: [],
};

export default config;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 5: Create type declarations**

Create `lib/types.ts`:

```ts
import type * as GeoJSON from 'geojson';

export interface BorderResult {
  geojson: GeoJSON.FeatureCollection;
  source: 'natural-earth' | 'thenmap' | 'historical-basemaps';
  actualYear: number;
}

export interface DisputedZone {
  name: string;
  parties: string;
}

export type EraId =
  | 'ancient'
  | 'classical'
  | 'late-antiquity'
  | 'medieval'
  | 'early-modern'
  | 'empires'
  | 'world-wars'
  | 'cold-war'
  | 'modern';
```

Create `flubber.d.ts` in the project root:

```ts
declare module 'flubber' {
  export function interpolate(
    fromShape: string,
    toShape: string,
    options?: { maxSegmentLength?: number; string?: boolean }
  ): (t: number) => string;

  export function toCircle(
    fromShape: string,
    x: number,
    y: number,
    r: number,
    options?: { maxSegmentLength?: number; string?: boolean }
  ): (t: number) => string;

  export function fromCircle(
    x: number,
    y: number,
    r: number,
    toShape: string,
    options?: { maxSegmentLength?: number; string?: boolean }
  ): (t: number) => string;
}
```

- [ ] **Step 6: Create app shell**

Create `app/globals.css`:

```css
@import 'tailwindcss';

html,
body {
  height: 100%;
  overflow: hidden;
  background: #0a0e1a;
  color: #e0e0e0;
}
```

Create `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

export const metadata: Metadata = {
  title: 'Bordered Lands — Historical Border Map',
  description: 'Watch 5,000 years of world borders morph in real time',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-[family-name:var(--font-geist)] antialiased">
        {children}
      </body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
import dynamic from 'next/dynamic';

const MapApp = dynamic(() => import('@/components/MapApp'), { ssr: false });

export default function Home() {
  return <MapApp />;
}
```

Create `components/MapApp.tsx` (placeholder):

```tsx
'use client';

export default function MapApp() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-dark-bg text-white">
      <p className="text-2xl font-light tracking-widest">Bordered Lands</p>
    </div>
  );
}
```

- [ ] **Step 7: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts on localhost:3000, page shows "Bordered Lands" centered text on dark background.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, D3, and flubber deps"
```

---

## Task 2: Constants and Country Metadata

**Files:**
- Create: `lib/constants.ts`, `lib/country-metadata.ts`, `lib/__tests__/country-metadata.test.ts`

- [ ] **Step 1: Create constants**

Create `lib/constants.ts`:

```ts
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
```

- [ ] **Step 2: Create country metadata module**

Create `lib/country-metadata.ts`:

```ts
import type { EraId } from './types';
import {
  PALETTE_WARM,
  PALETTE_MUTED,
  PALETTE_COOL,
} from './constants';

// ISO 3166-1 numeric → country name (ported from _legacy/js/data.js)
const COUNTRY_NAMES: Record<string, string> = {
  '004': 'Afghanistan', '008': 'Albania', '012': 'Algeria',
  '016': 'American Samoa', '020': 'Andorra', '024': 'Angola',
  '028': 'Antigua and Barbuda', '032': 'Argentina', '036': 'Australia',
  '040': 'Austria', '044': 'Bahamas', '048': 'Bahrain',
  '050': 'Bangladesh', '051': 'Armenia', '052': 'Barbados',
  '056': 'Belgium', '060': 'Bermuda', '064': 'Bhutan',
  '068': 'Bolivia', '070': 'Bosnia and Herzegovina', '072': 'Botswana',
  '076': 'Brazil', '084': 'Belize', '090': 'Solomon Islands',
  '096': 'Brunei', '100': 'Bulgaria', '104': 'Myanmar',
  '108': 'Burundi', '112': 'Belarus', '116': 'Cambodia',
  '120': 'Cameroon', '124': 'Canada', '140': 'Central African Rep.',
  '144': 'Sri Lanka', '148': 'Chad', '152': 'Chile', '156': 'China',
  '158': 'Taiwan', '170': 'Colombia', '174': 'Comoros',
  '178': 'Congo', '180': 'Dem. Rep. Congo', '188': 'Costa Rica',
  '191': 'Croatia', '192': 'Cuba', '196': 'Cyprus', '203': 'Czechia',
  '204': 'Benin', '208': 'Denmark', '212': 'Dominica',
  '214': 'Dominican Rep.', '218': 'Ecuador', '222': 'El Salvador',
  '226': 'Equatorial Guinea', '231': 'Ethiopia', '232': 'Eritrea',
  '233': 'Estonia', '238': 'Falkland Islands', '242': 'Fiji',
  '246': 'Finland', '250': 'France', '262': 'Djibouti',
  '266': 'Gabon', '268': 'Georgia', '270': 'Gambia',
  '275': 'Palestine', '276': 'Germany', '288': 'Ghana',
  '296': 'Kiribati', '300': 'Greece', '304': 'Greenland',
  '308': 'Grenada', '320': 'Guatemala', '324': 'Guinea',
  '328': 'Guyana', '332': 'Haiti', '340': 'Honduras',
  '344': 'Hong Kong', '348': 'Hungary', '352': 'Iceland',
  '356': 'India', '360': 'Indonesia', '364': 'Iran', '368': 'Iraq',
  '372': 'Ireland', '376': 'Israel', '380': 'Italy',
  '384': 'Ivory Coast', '388': 'Jamaica', '392': 'Japan',
  '398': 'Kazakhstan', '400': 'Jordan', '404': 'Kenya',
  '408': 'North Korea', '410': 'South Korea', '414': 'Kuwait',
  '417': 'Kyrgyzstan', '418': 'Laos', '422': 'Lebanon',
  '426': 'Lesotho', '428': 'Latvia', '430': 'Liberia',
  '434': 'Libya', '438': 'Liechtenstein', '440': 'Lithuania',
  '442': 'Luxembourg', '446': 'Macau', '450': 'Madagascar',
  '454': 'Malawi', '458': 'Malaysia', '462': 'Maldives',
  '466': 'Mali', '470': 'Malta', '478': 'Mauritania',
  '480': 'Mauritius', '484': 'Mexico', '492': 'Monaco',
  '496': 'Mongolia', '498': 'Moldova', '499': 'Montenegro',
  '504': 'Morocco', '508': 'Mozambique', '512': 'Oman',
  '516': 'Namibia', '520': 'Nauru', '524': 'Nepal',
  '528': 'Netherlands', '540': 'New Caledonia', '548': 'Vanuatu',
  '554': 'New Zealand', '558': 'Nicaragua', '562': 'Niger',
  '566': 'Nigeria', '578': 'Norway', '586': 'Pakistan',
  '591': 'Panama', '598': 'Papua New Guinea', '600': 'Paraguay',
  '604': 'Peru', '608': 'Philippines', '616': 'Poland',
  '620': 'Portugal', '624': 'Guinea-Bissau', '626': 'Timor-Leste',
  '630': 'Puerto Rico', '634': 'Qatar', '642': 'Romania',
  '643': 'Russia', '646': 'Rwanda', '659': 'Saint Kitts and Nevis',
  '662': 'Saint Lucia', '670': 'Saint Vincent and Grenadines',
  '674': 'San Marino', '678': 'Sao Tome and Principe',
  '682': 'Saudi Arabia', '686': 'Senegal', '688': 'Serbia',
  '690': 'Seychelles', '694': 'Sierra Leone', '702': 'Singapore',
  '703': 'Slovakia', '704': 'Vietnam', '705': 'Slovenia',
  '706': 'Somalia', '710': 'South Africa', '716': 'Zimbabwe',
  '724': 'Spain', '728': 'South Sudan', '729': 'Sudan',
  '732': 'Western Sahara', '740': 'Suriname', '748': 'Eswatini',
  '752': 'Sweden', '756': 'Switzerland', '760': 'Syria',
  '762': 'Tajikistan', '764': 'Thailand', '768': 'Togo',
  '776': 'Tonga', '780': 'Trinidad and Tobago',
  '784': 'United Arab Emirates', '788': 'Tunisia', '792': 'Turkey',
  '795': 'Turkmenistan', '800': 'Uganda', '804': 'Ukraine',
  '807': 'North Macedonia', '818': 'Egypt', '826': 'United Kingdom',
  '834': 'Tanzania', '840': 'United States', '854': 'Burkina Faso',
  '858': 'Uruguay', '860': 'Uzbekistan', '862': 'Venezuela',
  '882': 'Samoa', '887': 'Yemen', '894': 'Zambia',
  '010': 'Antarctica', '900': 'Kosovo', '-99': 'N. Cyprus',
};

export function getCountryName(id: string | number): string {
  const key = String(id).padStart(3, '0');
  return COUNTRY_NAMES[key] ?? COUNTRY_NAMES[String(id)] ?? `Country ${id}`;
}

export function getFeatureName(feature: GeoJSON.Feature): string {
  const p = feature.properties;
  if (!p) return 'Unknown';
  return (
    p.name ?? p.NAME ?? p.ADMIN ?? p.GEOUNIT ?? p.SOVEREIGNT ??
    (feature.id ? getCountryName(String(feature.id)) : 'Unknown')
  );
}

export function getEraId(year: number): EraId {
  if (year < -1000) return 'ancient';
  if (year < 0) return 'classical';
  if (year < 500) return 'late-antiquity';
  if (year < 1500) return 'medieval';
  if (year < 1800) return 'early-modern';
  if (year < 1914) return 'empires';
  if (year < 1945) return 'world-wars';
  if (year < 1991) return 'cold-war';
  return 'modern';
}

export function getEraLabel(year: number): string {
  const labels: Record<EraId, string> = {
    'ancient': 'Ancient World',
    'classical': 'Classical Antiquity',
    'late-antiquity': 'Late Antiquity',
    'medieval': 'Medieval Period',
    'early-modern': 'Early Modern Period',
    'empires': 'Age of Empires',
    'world-wars': 'World Wars Era',
    'cold-war': 'Cold War Era',
    'modern': 'Modern Era',
  };
  return labels[getEraId(year)];
}

export function getEraPalette(year: number): string[] {
  if (year < 0) return PALETTE_WARM;
  if (year < 1500) return PALETTE_MUTED;
  return PALETTE_COOL;
}

export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}
```

- [ ] **Step 3: Write tests for country metadata**

Create `lib/__tests__/country-metadata.test.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/country-metadata.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts lib/country-metadata.ts lib/__tests__/country-metadata.test.ts
git commit -m "feat: add constants and country metadata with era palettes"
```

---

## Task 3: Border Data Layer

**Files:**
- Create: `lib/border-data.ts`, `lib/__tests__/border-data.test.ts`

- [ ] **Step 1: Write tests for pure functions**

Create `lib/__tests__/border-data.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/border-data.test.ts`
Expected: FAIL — `historicalUrl` and `findNearestHistoricalYear` not found.

- [ ] **Step 3: Implement border data layer**

Create `lib/border-data.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/border-data.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/border-data.ts lib/__tests__/border-data.test.ts
git commit -m "feat: port three-tier border data layer with caching"
```

---

## Task 4: Geo Morph Engine

**Files:**
- Create: `lib/geo-morph.ts`, `lib/__tests__/geo-morph.test.ts`

- [ ] **Step 1: Write tests for morph matching**

Create `lib/__tests__/geo-morph.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/geo-morph.test.ts`
Expected: FAIL — `matchFeatures` not found.

- [ ] **Step 3: Implement geo morph engine**

Create `lib/geo-morph.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/geo-morph.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/geo-morph.ts lib/__tests__/geo-morph.test.ts
git commit -m "feat: add geo-morph engine with flubber polygon interpolation"
```

---

## Task 5: Base Map Rendering (MapCanvas)

**Files:**
- Create: `components/Map/MapCanvas.tsx`, `components/Map/render-graticule.ts`

- [ ] **Step 1: Create graticule render function**

Create `components/Map/render-graticule.ts`:

```ts
import * as d3 from 'd3';

export function renderGraticule(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  pathGenerator: d3.GeoPath
): void {
  const graticule = d3.geoGraticule();

  g.selectAll('.graticule').remove();
  g.append('path')
    .datum(graticule())
    .attr('class', 'graticule')
    .attr('d', pathGenerator)
    .attr('fill', 'none')
    .attr('stroke', '#1a2535')
    .attr('stroke-width', 0.3)
    .attr('stroke-opacity', 0.5);
}

export function updateGraticuleVisibility(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  zoomScale: number
): void {
  const opacity = zoomScale > 4 ? 0 : 0.5;
  g.select('.graticule')
    .transition()
    .duration(200)
    .attr('stroke-opacity', opacity);
}
```

- [ ] **Step 2: Create MapCanvas component**

Create `components/Map/MapCanvas.tsx`:

```tsx
'use client';

import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { renderGraticule, updateGraticuleVisibility } from './render-graticule';

export interface MapCanvasHandle {
  getProjection(): d3.GeoProjection;
  getPathGenerator(): d3.GeoPath;
  getCountriesGroup(): d3.Selection<SVGGElement, unknown, null, undefined> | null;
  getDisputedGroup(): d3.Selection<SVGGElement, unknown, null, undefined> | null;
}

interface MapCanvasProps {
  onZoomChange?: (scale: number) => void;
}

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas({ onZoomChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const projectionRef = useRef<d3.GeoProjection | null>(null);
    const pathRef = useRef<d3.GeoPath | null>(null);

    useEffect(() => {
      if (!containerRef.current || !svgRef.current || !gRef.current) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const svg = d3.select(svgRef.current);
      const g = d3.select(gRef.current);

      // Projection
      const projection = d3.geoNaturalEarth1()
        .scale(width / 5.5)
        .translate([width / 2, height / 2]);
      projectionRef.current = projection;

      const pathGenerator = d3.geoPath().projection(projection);
      pathRef.current = pathGenerator;

      // Ocean background
      g.select('.ocean').remove();
      g.insert('path', ':first-child')
        .datum({ type: 'Sphere' } as d3.GeoPermissibleObjects)
        .attr('class', 'ocean')
        .attr('d', pathGenerator)
        .attr('fill', '#0d1b2a');

      // Radial gradient for ocean depth
      const defs = svg.select('defs').empty()
        ? svg.insert('defs', ':first-child')
        : svg.select('defs');
      defs.selectAll('#ocean-gradient').remove();
      const radial = defs.append('radialGradient')
        .attr('id', 'ocean-gradient')
        .attr('cx', '50%').attr('cy', '50%').attr('r', '60%');
      radial.append('stop').attr('offset', '0%').attr('stop-color', '#112233');
      radial.append('stop').attr('offset', '100%').attr('stop-color', '#0d1b2a');
      g.select('.ocean').attr('fill', 'url(#ocean-gradient)');

      // Graticule
      const gratGroup = g.select<SVGGElement>('.graticule-group');
      if (!gratGroup.empty()) {
        renderGraticule(gratGroup, pathGenerator);
      }

      // Zoom
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 12])
        .on('zoom', (event) => {
          g.attr('transform', event.transform.toString());
          const gratG = g.select<SVGGElement>('.graticule-group');
          if (!gratG.empty()) {
            updateGraticuleVisibility(gratG, event.transform.k);
          }
          onZoomChange?.(event.transform.k);
        });

      svg.call(zoom);

      // Resize handler
      const handleResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        svg.attr('width', w).attr('height', h);
        projection.scale(w / 5.5).translate([w / 2, h / 2]);
        const newPath = d3.geoPath().projection(projection);
        pathRef.current = newPath;

        g.select('.ocean').attr('d', newPath as any);
        const gratG = g.select<SVGGElement>('.graticule-group');
        if (!gratG.empty()) {
          renderGraticule(gratG, newPath);
        }
        g.selectAll<SVGPathElement, unknown>('.country').attr('d', newPath as any);
        g.selectAll<SVGPathElement, unknown>('.disputed-zone').attr('d', newPath as any);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [onZoomChange]);

    useImperativeHandle(ref, () => ({
      getProjection: () => projectionRef.current!,
      getPathGenerator: () => pathRef.current!,
      getCountriesGroup: () => {
        if (!gRef.current) return null;
        return d3.select(gRef.current).select<SVGGElement>('.countries-group');
      },
      getDisputedGroup: () => {
        if (!gRef.current) return null;
        return d3.select(gRef.current).select<SVGGElement>('.disputed-group');
      },
    }));

    return (
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <svg ref={svgRef} className="w-full h-full">
          <g ref={gRef}>
            {/* Ocean and graticule rendered by D3 in useEffect */}
            <g className="graticule-group" />
            <g className="countries-group" />
            <g className="borders-group" />
            <g className="disputed-group" />
          </g>
        </svg>
      </div>
    );
  }
);

export default MapCanvas;
```

- [ ] **Step 3: Update MapApp to render MapCanvas**

Update `components/MapApp.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import MapCanvas, { type MapCanvasHandle } from './Map/MapCanvas';

export default function MapApp() {
  const mapRef = useRef<MapCanvasHandle>(null);

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-bg">
      <MapCanvas ref={mapRef} />
    </div>
  );
}
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`
Open: `http://localhost:3000`
Expected: Full-screen dark ocean with graticule grid lines, zoomable and pannable.

- [ ] **Step 5: Commit**

```bash
git add components/Map/MapCanvas.tsx components/Map/render-graticule.ts components/MapApp.tsx
git commit -m "feat: add MapCanvas with D3 projection, zoom/pan, ocean, and graticule"
```

---

## Task 6: Country Layer with Morphing

**Files:**
- Create: `components/Map/render-countries.ts`

- [ ] **Step 1: Implement country rendering with morph support**

Create `components/Map/render-countries.ts`:

```ts
import * as d3 from 'd3';
import { getFeatureName, getEraPalette } from '@/lib/country-metadata';
import { createMorphAnimator } from '@/lib/geo-morph';

interface RenderOptions {
  year: number;
  pathGenerator: d3.GeoPath;
  animate: boolean;
  duration: number;
  previousGeojson: GeoJSON.FeatureCollection | null;
  onHover: (feature: GeoJSON.Feature | null, event: MouseEvent) => void;
  onClick: (feature: GeoJSON.Feature, event: MouseEvent) => void;
  selectedFeatureKey: string | null;
}

function featureKey(d: GeoJSON.Feature, i: number): string {
  if (d.id) return `id_${d.id}`;
  const name = d.properties?.name ?? d.properties?.NAME;
  if (name) return `name_${name}`;
  return `idx_${i}`;
}

function countryColor(i: number, palette: string[]): string {
  return palette[Math.abs(i) % palette.length];
}

export function renderCountries(
  countriesGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  bordersGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  geojson: GeoJSON.FeatureCollection,
  options: RenderOptions
): void {
  const {
    year,
    pathGenerator,
    animate,
    duration,
    previousGeojson,
    onHover,
    onClick,
    selectedFeatureKey,
  } = options;

  const palette = getEraPalette(year);
  const features = geojson.features;

  // --- Morph animation path ---
  if (animate && previousGeojson && duration > 0) {
    const animator = createMorphAnimator(
      previousGeojson,
      geojson,
      pathGenerator
    );

    // Remove all existing paths and draw morphed versions
    countriesGroup.selectAll('.country').remove();
    bordersGroup.selectAll('.country-border').remove();

    const finalFeatures = animator.finalFeatures();
    const allKeys = [...animator.finalKeys()];

    // Create paths for all features in final state
    const paths = countriesGroup
      .selectAll<SVGPathElement, string>('.country')
      .data(allKeys)
      .enter()
      .append('path')
      .attr('class', 'country')
      .style('fill', (_d, i) => countryColor(i, palette))
      .style('cursor', 'pointer')
      .on('mousemove', function (event: MouseEvent) {
        const key = d3.select(this).datum() as string;
        const feature = finalFeatures.get(key) ?? null;
        onHover(feature, event);
      })
      .on('mouseleave', function (event: MouseEvent) {
        onHover(null, event);
      })
      .on('click', function (event: MouseEvent) {
        const key = d3.select(this).datum() as string;
        const feature = finalFeatures.get(key);
        if (feature) onClick(feature, event);
      });

    // Animate morph
    const ease = d3.easeCubicOut;
    const timer = d3.timer((elapsed) => {
      const t = Math.min(elapsed / duration, 1);
      const eased = ease(t);
      const interpolated = animator.interpolateAt(eased);

      paths.attr('d', (key) => interpolated.get(key) ?? '');

      if (t >= 1) {
        timer.stop();
        // Set final paths from pathGenerator for precision
        paths.attr('d', (key) => {
          const f = finalFeatures.get(key);
          return f ? (pathGenerator(f) ?? '') : '';
        });
        // Render border lines
        renderBorderLines(bordersGroup, geojson, pathGenerator);
        // Apply selection highlight
        applySelection(countriesGroup, selectedFeatureKey);
      }
    });

    return;
  }

  // --- Instant render path (no morph) ---
  const countries = countriesGroup
    .selectAll<SVGPathElement, GeoJSON.Feature>('.country')
    .data(features, (d, i) => featureKey(d, i));

  countries.exit().remove();

  const enter = countries
    .enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', pathGenerator as any)
    .style('fill', (_d, i) => countryColor(i, palette))
    .style('cursor', 'pointer')
    .style('opacity', animate ? 0 : 1)
    .on('mousemove', function (event: MouseEvent, d) {
      onHover(d, event);
    })
    .on('mouseleave', function (event: MouseEvent) {
      onHover(null, event);
    })
    .on('click', function (event: MouseEvent, d) {
      onClick(d, event);
    });

  if (animate) {
    enter.transition().duration(duration).style('opacity', 1);
  }

  countries
    .attr('d', pathGenerator as any)
    .style('fill', (_d, i) => countryColor(i, palette));

  renderBorderLines(bordersGroup, geojson, pathGenerator);
  applySelection(countriesGroup, selectedFeatureKey);
}

function renderBorderLines(
  bordersGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  geojson: GeoJSON.FeatureCollection,
  pathGenerator: d3.GeoPath
): void {
  bordersGroup.selectAll('.country-border').remove();
  bordersGroup
    .selectAll('.country-border')
    .data(geojson.features)
    .enter()
    .append('path')
    .attr('class', 'country-border')
    .attr('d', pathGenerator as any)
    .attr('fill', 'none')
    .attr('stroke', '#3a4a5a')
    .attr('stroke-width', 0.7)
    .attr('stroke-linejoin', 'round');
}

function applySelection(
  countriesGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  selectedKey: string | null
): void {
  countriesGroup.selectAll<SVGPathElement, unknown>('.country')
    .attr('stroke', function () {
      const datum = d3.select(this).datum();
      const key = typeof datum === 'string' ? datum : null;
      return key === selectedKey ? '#ffffff' : '#2a3a4a';
    })
    .attr('stroke-width', function () {
      const datum = d3.select(this).datum();
      const key = typeof datum === 'string' ? datum : null;
      return key === selectedKey ? 1.5 : 0.5;
    });
}
```

- [ ] **Step 2: Add country hover styles to globals.css**

Append to `app/globals.css`:

```css
.country {
  stroke: #2a3a4a;
  stroke-width: 0.5px;
  transition: filter 0.15s;
}

.country:hover {
  stroke: #ffffff;
  stroke-width: 1px;
  filter: brightness(1.15);
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Map/render-countries.ts app/globals.css
git commit -m "feat: add country rendering with morph transitions and era palettes"
```

---

## Task 7: Disputed Territories

**Files:**
- Create: `components/Map/render-disputed.ts`

- [ ] **Step 1: Implement disputed zone rendering**

Create `components/Map/render-disputed.ts`:

```ts
import * as d3 from 'd3';

export function renderDisputedZones(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  geojson: GeoJSON.FeatureCollection,
  pathGenerator: d3.GeoPath
): void {
  const zones = g
    .selectAll<SVGPathElement, GeoJSON.Feature>('.disputed-zone')
    .data(geojson.features, (d) => d.properties?.name ?? '');

  zones.exit().remove();

  const enter = zones
    .enter()
    .append('path')
    .attr('class', 'disputed-zone')
    .attr('d', pathGenerator as any)
    .attr('fill', 'rgba(255, 167, 38, 0.12)')
    .attr('stroke', '#ff9800')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4 3')
    .style('pointer-events', 'none');

  enter
    .append('title')
    .text((d) => `${d.properties?.name} (${d.properties?.parties})`);

  zones.attr('d', pathGenerator as any);
}

export function clearDisputedZones(
  g: d3.Selection<SVGGElement, unknown, null, undefined>
): void {
  g.selectAll('.disputed-zone').remove();
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Map/render-disputed.ts
git commit -m "feat: add disputed territory overlay rendering"
```

---

## Task 8: MapApp Orchestrator — Wire Map + Data

**Files:**
- Modify: `components/MapApp.tsx`

- [ ] **Step 1: Implement full MapApp with data loading and year state**

Replace `components/MapApp.tsx`:

```tsx
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import MapCanvas, { type MapCanvasHandle } from './Map/MapCanvas';
import { renderCountries } from './Map/render-countries';
import { renderDisputedZones, clearDisputedZones } from './Map/render-disputed';
import { loadBordersForYear, getDisputedZones } from '@/lib/border-data';
import { getFeatureName } from '@/lib/country-metadata';
import { MAX_YEAR, MORPH_STEP_MS, DEBOUNCE_MS } from '@/lib/constants';
import type { BorderResult } from '@/lib/types';

export default function MapApp() {
  const mapRef = useRef<MapCanvasHandle>(null);
  const [year, setYear] = useState(MAX_YEAR);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<GeoJSON.Feature | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const previousGeojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const currentResultRef = useRef<BorderResult | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRenderYearRef = useRef<number | null>(null);

  const updateMap = useCallback(
    async (targetYear: number, animate: boolean) => {
      const map = mapRef.current;
      if (!map) return;

      const pathGenerator = map.getPathGenerator();
      const countriesGroup = map.getCountriesGroup();
      const disputedGroup = map.getDisputedGroup();
      if (!pathGenerator || !countriesGroup || !disputedGroup) return;

      // Skip if same year already rendered
      if (lastRenderYearRef.current === targetYear) return;

      setLoading(true);
      try {
        const result = await loadBordersForYear(targetYear);
        const bordersGroup = countriesGroup
          .node()
          ?.parentNode
          ? (countriesGroup.node()!.parentNode as SVGGElement)
          : null;

        const bordersG = bordersGroup
          ? d3Selection(bordersGroup).select<SVGGElement>('.borders-group')
          : null;

        // Use d3 to select the borders group from the parent g
        const parentG = countriesGroup.node()?.parentElement;
        const bGroup = parentG
          ? d3.select(parentG).select<SVGGElement>('.borders-group')
          : countriesGroup; // fallback

        renderCountries(countriesGroup, bGroup, result.geojson, {
          year: targetYear,
          pathGenerator,
          animate: animate && previousGeojsonRef.current !== null,
          duration: MORPH_STEP_MS,
          previousGeojson: previousGeojsonRef.current,
          onHover: (feature, event) => {
            setHoveredFeature(feature);
            if (feature) {
              setHoverPos({ x: event.offsetX, y: event.offsetY });
            } else {
              setHoverPos(null);
            }
          },
          onClick: (feature) => {
            if (!isPlaying) {
              setSelectedFeature((prev) =>
                prev === feature ? null : feature
              );
            }
          },
          selectedFeatureKey: null,
        });

        // Disputed zones only post-1990
        if (targetYear >= 1990) {
          renderDisputedZones(disputedGroup, getDisputedZones(), pathGenerator);
        } else {
          clearDisputedZones(disputedGroup);
        }

        previousGeojsonRef.current = result.geojson;
        currentResultRef.current = result;
        lastRenderYearRef.current = targetYear;
      } catch (err) {
        console.error(`Failed to load borders for year ${targetYear}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [isPlaying]
  );

  // Need d3 import at top level for the selection helper
  const d3 = require('d3');
  // Actually, let's move the import to the top — this is a 'use client' component

  // Initial load
  useEffect(() => {
    updateMap(year, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Year change handler (called by controls)
  const handleYearChange = useCallback(
    (newYear: number, shouldAnimate: boolean = true) => {
      setYear(newYear);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        updateMap(newYear, shouldAnimate);
      }, DEBOUNCE_MS);
    },
    [updateMap]
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-bg relative">
      <MapCanvas ref={mapRef} />

      {/* Tooltip */}
      {hoveredFeature && hoverPos && (
        <div
          className="absolute z-20 bg-dark-bg/90 border border-border rounded px-2.5 py-1.5 text-sm text-white pointer-events-none whitespace-nowrap"
          style={{
            left: hoverPos.x + 12,
            top: hoverPos.y - 28,
          }}
        >
          {getFeatureName(hoveredFeature)}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-15 flex flex-col items-center justify-center bg-dark-bg/70 gap-3">
          <div className="w-8 h-8 border-3 border-border border-t-accent-blue rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">Loading borders...</span>
        </div>
      )}
    </div>
  );
}
```

Wait — the `require('d3')` in the middle of the component is wrong. Let me fix this. The d3 import is already at the top of `render-countries.ts`. The MapApp doesn't need d3 directly. Let me clean up and fix the borders-group selection issue.

Actually, let me rewrite MapApp more cleanly:

Replace `components/MapApp.tsx`:

```tsx
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import MapCanvas, { type MapCanvasHandle } from './Map/MapCanvas';
import { renderCountries } from './Map/render-countries';
import { renderDisputedZones, clearDisputedZones } from './Map/render-disputed';
import { loadBordersForYear, getDisputedZones } from '@/lib/border-data';
import { getFeatureName } from '@/lib/country-metadata';
import { MAX_YEAR, MORPH_STEP_MS, DEBOUNCE_MS } from '@/lib/constants';

export default function MapApp() {
  const mapRef = useRef<MapCanvasHandle>(null);
  const [year, setYear] = useState(MAX_YEAR);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const previousGeojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRenderYearRef = useRef<number | null>(null);

  const updateMap = useCallback(
    async (targetYear: number, animate: boolean) => {
      const map = mapRef.current;
      if (!map) return;

      const pathGenerator = map.getPathGenerator();
      const countriesGroup = map.getCountriesGroup();
      const disputedGroup = map.getDisputedGroup();
      if (!pathGenerator || !countriesGroup || !disputedGroup) return;

      if (lastRenderYearRef.current === targetYear) return;

      setLoading(true);
      try {
        const result = await loadBordersForYear(targetYear);

        // Get borders group (sibling of countries group)
        const parentG = countriesGroup.node()?.parentElement;
        const bordersGroup = parentG
          ? d3.select(parentG).select<SVGGElement>('.borders-group')
          : countriesGroup;

        renderCountries(countriesGroup, bordersGroup, result.geojson, {
          year: targetYear,
          pathGenerator,
          animate: animate && previousGeojsonRef.current !== null,
          duration: MORPH_STEP_MS,
          previousGeojson: previousGeojsonRef.current,
          onHover: (feature, event) => {
            if (feature) {
              setHoveredName(getFeatureName(feature));
              setHoverPos({ x: event.offsetX, y: event.offsetY });
            } else {
              setHoveredName(null);
              setHoverPos(null);
            }
          },
          onClick: (feature) => {
            if (!isPlaying) {
              setSelectedFeature((prev) =>
                prev === feature ? null : feature
              );
            }
          },
          selectedFeatureKey: null,
        });

        if (targetYear >= 1990) {
          renderDisputedZones(disputedGroup, getDisputedZones(), pathGenerator);
        } else {
          clearDisputedZones(disputedGroup);
        }

        previousGeojsonRef.current = result.geojson;
        lastRenderYearRef.current = targetYear;
      } catch (err) {
        console.error(`Failed to load borders for year ${targetYear}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [isPlaying]
  );

  useEffect(() => {
    updateMap(year, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleYearChange = useCallback(
    (newYear: number, shouldAnimate = true) => {
      setYear(newYear);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        updateMap(newYear, shouldAnimate);
      }, DEBOUNCE_MS);
    },
    [updateMap]
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-bg relative">
      <MapCanvas ref={mapRef} />

      {/* Tooltip */}
      {hoveredName && hoverPos && (
        <div
          className="absolute z-20 bg-[rgba(10,14,26,0.9)] border border-[#334] rounded px-2.5 py-1.5 text-[13px] text-white pointer-events-none whitespace-nowrap"
          style={{ left: hoverPos.x + 12, top: hoverPos.y - 28 }}
        >
          {hoveredName}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center bg-dark-bg/70 gap-3">
          <div className="w-8 h-8 border-[3px] border-[#1a2a3a] border-t-accent-blue rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">Loading borders...</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Open: `http://localhost:3000`
Expected: Full-screen dark map showing current year (2026) country borders with earth-tone fills. Hovering shows country name tooltip. Zoom and pan work. Disputed zones visible as dashed amber overlays.

- [ ] **Step 3: Commit**

```bash
git add components/MapApp.tsx
git commit -m "feat: wire MapApp orchestrator with data loading and country rendering"
```

---

## Task 9: YearDisplay + EraLabel

**Files:**
- Create: `components/Controls/YearDisplay.tsx`

- [ ] **Step 1: Implement YearDisplay**

Create `components/Controls/YearDisplay.tsx`:

```tsx
'use client';

import { formatYear, getEraLabel } from '@/lib/country-metadata';

interface YearDisplayProps {
  year: number;
  isRewinding: boolean;
}

export default function YearDisplay({ year, isRewinding }: YearDisplayProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 text-center pt-[18px] pb-2 pointer-events-none bg-gradient-to-b from-dark-bg/85 to-transparent">
      <div
        className={`text-[72px] font-extralight tracking-[6px] leading-none transition-colors duration-300 tabular-nums ${
          isRewinding
            ? 'text-accent-amber [text-shadow:0_0_30px_rgba(255,167,38,0.5)]'
            : 'text-white [text-shadow:0_0_30px_rgba(100,160,255,0.4)]'
        }`}
      >
        {formatYear(year)}
      </div>
      <div className="text-[13px] text-text-secondary tracking-[2px] uppercase mt-1 min-h-[20px]">
        {getEraLabel(year)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add YearDisplay to MapApp**

In `components/MapApp.tsx`, add import and state:

```tsx
import YearDisplay from './Controls/YearDisplay';
```

Add `isRewinding` state:

```tsx
const [isRewinding, setIsRewinding] = useState(false);
```

Add `<YearDisplay>` inside the return, after `<MapCanvas>`:

```tsx
<YearDisplay year={year} isRewinding={isRewinding} />
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Expected: Large "2026" at the top center with "Modern Era" label beneath. Fades to transparent at the bottom edge of the header area.

- [ ] **Step 4: Commit**

```bash
git add components/Controls/YearDisplay.tsx components/MapApp.tsx
git commit -m "feat: add cinematic year display with era label"
```

---

## Task 10: Playback Buttons

**Files:**
- Create: `components/Controls/PlaybackButtons.tsx`, `components/Controls/SpeedIndicator.tsx`

- [ ] **Step 1: Implement SpeedIndicator**

Create `components/Controls/SpeedIndicator.tsx`:

```tsx
'use client';

interface SpeedIndicatorProps {
  visible: boolean;
  speed: number; // ms per year
  baseSpeed: number; // initial speed for calculating multiplier
}

export default function SpeedIndicator({
  visible,
  speed,
  baseSpeed,
}: SpeedIndicatorProps) {
  const multiplier = Math.round(baseSpeed / speed);

  return (
    <div
      className={`text-[13px] text-accent-amber min-w-[30px] text-center transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {multiplier}x
    </div>
  );
}
```

- [ ] **Step 2: Implement PlaybackButtons**

Create `components/Controls/PlaybackButtons.tsx`:

```tsx
'use client';

import { useRef, useCallback, useEffect } from 'react';
import SpeedIndicator from './SpeedIndicator';
import {
  HOLD_DELAY,
  INITIAL_SPEED,
  MIN_SPEED,
  ACCELERATION_TIME,
  MIN_YEAR,
  MAX_YEAR,
} from '@/lib/constants';

interface PlaybackButtonsProps {
  year: number;
  onYearStep: (direction: -1 | 1) => void;
  onRewindingChange: (isRewinding: boolean) => void;
}

export default function PlaybackButtons({
  year,
  onYearStep,
  onRewindingChange,
}: PlaybackButtonsProps) {
  const isRewindingRef = useRef(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const directionRef = useRef<-1 | 1>(-1);
  const currentSpeedRef = useRef(INITIAL_SPEED);
  const yearRef = useRef(year);
  yearRef.current = year;

  const getCurrentSpeed = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / ACCELERATION_TIME, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    return INITIAL_SPEED - eased * (INITIAL_SPEED - MIN_SPEED);
  }, []);

  const scheduleNext = useCallback(() => {
    if (!isRewindingRef.current) return;
    const speed = getCurrentSpeed();
    currentSpeedRef.current = speed;

    intervalRef.current = setTimeout(() => {
      const y = yearRef.current;
      if (
        isRewindingRef.current &&
        y > MIN_YEAR &&
        y < MAX_YEAR
      ) {
        onYearStep(directionRef.current);
        scheduleNext();
      } else {
        stopContinuous();
      }
    }, speed);
  }, [getCurrentSpeed, onYearStep]);

  const startContinuous = useCallback(
    (direction: -1 | 1) => {
      if (isRewindingRef.current) return;
      isRewindingRef.current = true;
      directionRef.current = direction;
      startTimeRef.current = Date.now();
      onRewindingChange(true);
      scheduleNext();
    },
    [onRewindingChange, scheduleNext]
  );

  const stopContinuous = useCallback(() => {
    isRewindingRef.current = false;
    if (intervalRef.current) clearTimeout(intervalRef.current);
    intervalRef.current = null;
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = null;
    onRewindingChange(false);
  }, [onRewindingChange]);

  const handlePointerDown = useCallback(
    (direction: -1 | 1) => {
      if (isRewindingRef.current) return;
      directionRef.current = direction;
      onYearStep(direction);
      holdTimeoutRef.current = setTimeout(() => {
        startContinuous(direction);
      }, HOLD_DELAY);
    },
    [onYearStep, startContinuous]
  );

  const handlePointerUp = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    stopContinuous();
  }, [stopContinuous]);

  // Spacebar support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLButtonElement
      )
        return;
      e.preventDefault();
      if (e.repeat) {
        if (!isRewindingRef.current) startContinuous(-1);
        return;
      }
      onYearStep(-1);
      holdTimeoutRef.current = setTimeout(() => {
        startContinuous(-1);
      }, HOLD_DELAY);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      handlePointerUp();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [onYearStep, startContinuous, handlePointerUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-4">
      {/* Forward button */}
      <button
        className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/15 text-[#ccc] flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white/15 hover:text-white hover:border-white/30 active:bg-accent-amber/20 active:border-accent-amber active:text-accent-amber"
        onPointerDown={() => handlePointerDown(1)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        title="Forward one year"
      >
        <svg viewBox="0 0 24 24" width={20} height={20}>
          <polygon points="8,5 19,12 8,19" fill="currentColor" />
        </svg>
      </button>

      {/* Rewind button (primary) */}
      <button
        className="w-[52px] h-[52px] rounded-full bg-white/[0.08] border border-white/15 text-[#ccc] flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white/15 hover:text-white hover:border-white/30 active:bg-accent-amber/20 active:border-accent-amber active:text-accent-amber"
        onPointerDown={() => handlePointerDown(-1)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        title="Rewind one year (Space)"
      >
        <svg viewBox="0 0 24 24" width={28} height={28}>
          <polygon points="16,5 5,12 16,19" fill="currentColor" />
          <rect x={2} y={5} width={3} height={14} fill="currentColor" />
        </svg>
      </button>

      {/* Speed indicator */}
      <SpeedIndicator
        visible={isRewindingRef.current}
        speed={currentSpeedRef.current}
        baseSpeed={INITIAL_SPEED}
      />
    </div>
  );
}
```

- [ ] **Step 3: Wire PlaybackButtons into MapApp**

In `components/MapApp.tsx`, add import:

```tsx
import PlaybackButtons from './Controls/PlaybackButtons';
```

Add year step handler:

```tsx
const handleYearStep = useCallback(
  (direction: -1 | 1) => {
    setYear((prev) => {
      const next = prev + direction;
      if (next >= MIN_YEAR && next <= MAX_YEAR) {
        handleYearChange(next, true);
        return next;
      }
      return prev;
    });
  },
  [handleYearChange]
);
```

Add import for MIN_YEAR:

```tsx
import { MAX_YEAR, MIN_YEAR, MORPH_STEP_MS, DEBOUNCE_MS } from '@/lib/constants';
```

Add PlaybackButtons to the return JSX, positioned at bottom center:

```tsx
{/* Controls - bottom center */}
<div className="absolute bottom-0 left-0 right-0 z-10 pb-4 flex flex-col items-center gap-2.5 bg-gradient-to-t from-dark-bg/[0.92] to-transparent pt-12">
  <PlaybackButtons
    year={year}
    onYearStep={handleYearStep}
    onRewindingChange={setIsRewinding}
  />
</div>
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`
Expected: Rewind and forward buttons at bottom center. Click steps one year. Hold accelerates. Spacebar works for rewind. Year display updates and turns amber during rewind.

- [ ] **Step 5: Commit**

```bash
git add components/Controls/PlaybackButtons.tsx components/Controls/SpeedIndicator.tsx components/MapApp.tsx
git commit -m "feat: add playback buttons with hold-to-accelerate and spacebar"
```

---

## Task 11: Year Slider

**Files:**
- Create: `components/Controls/YearSlider.tsx`

- [ ] **Step 1: Implement YearSlider**

Create `components/Controls/YearSlider.tsx`:

```tsx
'use client';

import { useCallback } from 'react';
import { MIN_YEAR, MAX_YEAR } from '@/lib/constants';

interface YearSliderProps {
  year: number;
  onYearChange: (year: number) => void;
}

export default function YearSlider({ year, onYearChange }: YearSliderProps) {
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onYearChange(parseInt(e.target.value, 10));
    },
    [onYearChange]
  );

  return (
    <div className="flex items-center gap-3 w-full max-w-[600px]">
      <span className="text-xs text-[#667] tabular-nums min-w-[58px]">
        3000 BCE
      </span>
      <input
        type="range"
        min={MIN_YEAR}
        max={MAX_YEAR}
        value={year}
        step={1}
        onChange={handleInput}
        className="flex-1 h-1 bg-[#1a2a3a] rounded-sm appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-dark-bg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-[#6ab4ff]
          [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent-blue [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-dark-bg [&::-moz-range-thumb]:cursor-pointer"
      />
      <span className="text-xs text-[#667] tabular-nums min-w-[30px]">
        2026
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Wire YearSlider into MapApp controls area**

In `components/MapApp.tsx`, add import:

```tsx
import YearSlider from './Controls/YearSlider';
```

Add slider change handler:

```tsx
const handleSliderChange = useCallback(
  (newYear: number) => {
    setYear(newYear);
    handleYearChange(newYear, false); // no morph when scrubbing
  },
  [handleYearChange]
);
```

Add `<YearSlider>` inside the bottom controls div, after `<PlaybackButtons>`:

```tsx
<YearSlider year={year} onYearChange={handleSliderChange} />
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Expected: Year slider beneath the playback buttons. Dragging changes the year and updates the map (debounced, no morph). Labels show "3000 BCE" and "2026" at the ends.

- [ ] **Step 4: Commit**

```bash
git add components/Controls/YearSlider.tsx components/MapApp.tsx
git commit -m "feat: add year slider with debounced map updates"
```

---

## Task 12: Control Overlay with Auto-Hide

**Files:**
- Create: `components/Controls/ControlOverlay.tsx`

- [ ] **Step 1: Implement ControlOverlay**

Create `components/Controls/ControlOverlay.tsx`:

```tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CONTROL_HIDE_DELAY, CONTROL_FADE_MS } from '@/lib/constants';

interface ControlOverlayProps {
  forceVisible?: boolean;
  children: React.ReactNode;
}

export default function ControlOverlay({
  forceVisible = false,
  children,
}: ControlOverlayProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!forceVisible) {
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, CONTROL_HIDE_DELAY);
    }
  }, [forceVisible]);

  useEffect(() => {
    if (forceVisible) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    resetTimer();
  }, [forceVisible, resetTimer]);

  useEffect(() => {
    const handleActivity = () => resetTimer();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return (
    <div
      className="transition-opacity"
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${CONTROL_FADE_MS}ms`,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Wrap controls in MapApp with ControlOverlay**

In `components/MapApp.tsx`, add import:

```tsx
import ControlOverlay from './Controls/ControlOverlay';
```

Wrap both the YearDisplay and the bottom controls div with ControlOverlay:

```tsx
<ControlOverlay forceVisible={isRewinding}>
  <YearDisplay year={year} isRewinding={isRewinding} />
</ControlOverlay>

<ControlOverlay forceVisible={isRewinding}>
  <div className="absolute bottom-0 left-0 right-0 z-10 pb-4 flex flex-col items-center gap-2.5 bg-gradient-to-t from-dark-bg/[0.92] to-transparent pt-12">
    <PlaybackButtons
      year={year}
      onYearStep={handleYearStep}
      onRewindingChange={setIsRewinding}
    />
    <YearSlider year={year} onYearChange={handleSliderChange} />
  </div>
</ControlOverlay>
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Expected: Controls visible on load. After 3 seconds of inactivity, controls fade out. Moving the mouse brings them back. During continuous rewind, controls stay visible.

- [ ] **Step 4: Commit**

```bash
git add components/Controls/ControlOverlay.tsx components/MapApp.tsx
git commit -m "feat: add auto-hiding control overlay with 3s inactivity fade"
```

---

## Task 13: Info Panel

**Files:**
- Create: `components/InfoPanel/InfoPanel.tsx`

- [ ] **Step 1: Implement InfoPanel**

Create `components/InfoPanel/InfoPanel.tsx`:

```tsx
'use client';

import { useEffect, useCallback } from 'react';
import { getFeatureName, getEraLabel, formatYear } from '@/lib/country-metadata';
import type { BorderResult } from '@/lib/types';

interface InfoPanelProps {
  feature: GeoJSON.Feature | null;
  year: number;
  borderResult: BorderResult | null;
  onClose: () => void;
}

export default function InfoPanel({
  feature,
  year,
  borderResult,
  onClose,
}: InfoPanelProps) {
  const isOpen = feature !== null;

  // Escape key closes the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const name = feature ? getFeatureName(feature) : '';
  const eraLabel = getEraLabel(year);
  const yearStr = formatYear(year);
  const source = borderResult?.source ?? 'unknown';
  const actualYear = borderResult?.actualYear ?? year;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[360px] z-30 bg-[rgba(10,14,26,0.92)] border-l-2 border-accent-blue flex flex-col transition-transform ${
        isOpen
          ? 'translate-x-0 duration-250 ease-out'
          : 'translate-x-full duration-200 ease-in'
      }`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.08] border border-white/15 text-[#ccc] flex items-center justify-center cursor-pointer hover:bg-white/15 hover:text-white transition-colors"
        aria-label="Close panel"
      >
        <svg viewBox="0 0 24 24" width={16} height={16}>
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Content */}
      <div className="p-6 pt-16 flex flex-col gap-4">
        {/* Country name */}
        <h2 className="text-2xl font-light text-white">{name}</h2>

        {/* Era context */}
        <div className="text-sm text-text-secondary uppercase tracking-wider">
          {eraLabel} ({yearStr})
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10" />

        {/* Data source */}
        <div className="text-xs text-text-secondary/60">
          <span className="uppercase tracking-wider">Source:</span>{' '}
          {source}
          {actualYear !== year && (
            <span> (nearest data: {formatYear(actualYear)})</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire InfoPanel into MapApp**

In `components/MapApp.tsx`, add import:

```tsx
import InfoPanel from './InfoPanel/InfoPanel';
```

Add a ref to track the current border result:

```tsx
const currentResultRef = useRef<BorderResult | null>(null);
```

Inside `updateMap`, after loading data, store the result:

```tsx
currentResultRef.current = result;
```

Add the close handler:

```tsx
const handleCloseInfoPanel = useCallback(() => {
  setSelectedFeature(null);
}, []);
```

Add `<InfoPanel>` to the return JSX, before the closing `</div>`:

```tsx
<InfoPanel
  feature={selectedFeature}
  year={year}
  borderResult={currentResultRef.current}
  onClose={handleCloseInfoPanel}
/>
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Expected: Click a country while not rewinding → panel slides in from the right showing country name, era, and data source. Click X, press Escape, or click outside to close. Clicking another country updates the panel content.

- [ ] **Step 4: Commit**

```bash
git add components/InfoPanel/InfoPanel.tsx components/MapApp.tsx
git commit -m "feat: add slide-in info panel for country details"
```

---

## Task 14: Final Integration and Visual Polish

**Files:**
- Modify: `app/globals.css`, `components/MapApp.tsx`

- [ ] **Step 1: Add legend to the controls area**

In `components/MapApp.tsx`, add a legend beneath the slider inside the bottom controls div:

```tsx
{/* Legend */}
<div className="flex gap-5 text-xs text-[#667]">
  <span className="flex items-center gap-1.5">
    <span className="inline-block w-4 h-2.5 rounded-sm bg-[#5a8a6a] border border-[#3a4a5a]" />
    Country borders
  </span>
  <span className="flex items-center gap-1.5">
    <span className="inline-block w-4 h-2.5 rounded-sm bg-[rgba(255,167,38,0.3)] border border-dashed border-[#ff9800]" />
    Disputed zones
  </span>
</div>
```

- [ ] **Step 2: Disable country clicks during rewind**

In `components/MapApp.tsx`, update the `onClick` handler inside `renderCountries` to use the latest `isPlaying` state via a ref:

Add a ref:

```tsx
const isRewindingRef = useRef(false);
```

Update when `isRewinding` changes:

```tsx
useEffect(() => {
  isRewindingRef.current = isRewinding;
}, [isRewinding]);
```

Use the ref in the onClick callback inside `updateMap`:

```tsx
onClick: (feature) => {
  if (!isRewindingRef.current) {
    setSelectedFeature((prev) =>
      prev === feature ? null : feature
    );
  }
},
```

Also add a click handler on the map container (in the `<div>` wrapping `<MapCanvas>`) to close the info panel when clicking empty ocean/background:

```tsx
const handleMapBackgroundClick = useCallback((e: React.MouseEvent) => {
  // Only close if the click target is the SVG or container itself, not a country
  if ((e.target as Element).tagName === 'svg' || (e.target as Element).classList.contains('ocean')) {
    setSelectedFeature(null);
  }
}, []);
```

Pass this as an `onClick` on the container `<div>` wrapping MapCanvas.

- [ ] **Step 3: Add global animation and transition styles**

Append to `app/globals.css`:

```css
/* Smooth scroll behavior for the whole app */
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Spinner animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Prevent text selection on controls */
.controls-area {
  user-select: none;
  -webkit-user-select: none;
}
```

- [ ] **Step 4: Final visual verification**

Run: `npm run dev`
Expected:
- Full-screen dark map with cinematic year display
- Smooth border morphing when stepping through years
- Auto-hiding controls (fade after 3 seconds of inactivity)
- Rewind/forward with hold acceleration, spacebar support
- Year slider for scrubbing
- Country hover tooltips
- Click country → slide-in info panel
- Disputed zone overlays for post-1990 years
- Era-based color palettes (warm for ancient, muted for medieval, cool for modern)
- Everything looks polished on a dark background

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (country-metadata, border-data, geo-morph).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 — legend, polish, final integration"
```

---

## Import Summary for `components/MapApp.tsx`

The final `MapApp.tsx` should have these imports:

```tsx
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import MapCanvas, { type MapCanvasHandle } from './Map/MapCanvas';
import { renderCountries } from './Map/render-countries';
import { renderDisputedZones, clearDisputedZones } from './Map/render-disputed';
import { loadBordersForYear, getDisputedZones } from '@/lib/border-data';
import { getFeatureName } from '@/lib/country-metadata';
import { MAX_YEAR, MIN_YEAR, MORPH_STEP_MS, DEBOUNCE_MS } from '@/lib/constants';
import type { BorderResult } from '@/lib/types';
import ControlOverlay from './Controls/ControlOverlay';
import YearDisplay from './Controls/YearDisplay';
import PlaybackButtons from './Controls/PlaybackButtons';
import YearSlider from './Controls/YearSlider';
import InfoPanel from './InfoPanel/InfoPanel';
```
