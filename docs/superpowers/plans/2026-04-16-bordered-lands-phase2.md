# Bordered Lands Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the data foundation (CShapes 2.1, dynamic disputed zones, rich tooltips) and add two cinematic UI features (autoplay mode, historical event timeline) on top of the Phase 1 app.

**Architecture:** Phase 1's structure stays intact. `lib/border-data.ts` grows a CShapes path that replaces Thenmap for 1886–2019. `render-disputed.ts` gains a data-driven detection path. `MapApp.tsx` gains autoplay state and an event-jump handler. A new `EventTimeline` component renders markers on the slider.

**Spec:** `docs/superpowers/specs/2026-04-10-bordered-lands-redesign-design.md` — Phase 2 section

**Prerequisites:**
- Phase 1 is merged to main (it is)
- `data/cshapes-2.1-simplified.json` exists (3.4MB, 710 features, extracted from old version)
- `docs/old-version-extraction.md` contains reference algorithms

---

## File Structure Changes

```
data/
  cshapes-2.1-simplified.json   — [EXISTS] bundled CShapes dataset
  historical-events.ts           — [NEW] curated event list
lib/
  border-data.ts                — [MODIFY] CShapes loader, replace Thenmap tier
  cshapes-loader.ts              — [NEW] load + filter CShapes
  types.ts                      — [MODIFY] update source union, add disputed type
components/
  Map/
    render-disputed.ts          — [MODIFY] dynamic detection + pulse animation
  Controls/
    PlaybackButtons.tsx         — [MODIFY] add play button
    EventTimeline.tsx           — [NEW] event markers on slider
  MapApp.tsx                    — [MODIFY] autoplay state, event jump, disputed wiring
  InfoPanel/
    InfoPanel.tsx               — [MODIFY] show border configuration date range
lib/__tests__/
  cshapes-loader.test.ts        — [NEW] tests for CShapes filter + disputed detection
  historical-events.test.ts     — [NEW] tests for event list integrity
```

---

## Task 1: CShapes Data Loader

**Files:**
- Create: `lib/cshapes-loader.ts`
- Create: `lib/__tests__/cshapes-loader.test.ts`
- Modify: `lib/types.ts`

### Step 1: Update types

- [ ] Modify `lib/types.ts`:

```typescript
import type * as GeoJSON from 'geojson';

export interface BorderResult {
  geojson: GeoJSON.FeatureCollection;
  source: 'natural-earth' | 'cshapes' | 'historical-basemaps';
  actualYear: number;
}

export interface DisputedZone {
  name: string;
  parties: string;
}

export interface DisputedFeature {
  feature: GeoJSON.Feature;
  reason: 'ending' | 'starting';
  year: number;
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

export interface CShapesProperties {
  cntry_name: string;
  gwsyear: number;
  gweyear: number;
}
```

Note: `source: 'thenmap'` is removed; `'cshapes'` added.

### Step 2: Create CShapes loader

- [ ] Create `lib/cshapes-loader.ts`:

```typescript
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
```

### Step 3: Move CShapes JSON to public/ for fetch access

- [ ] Run:

```bash
mkdir -p public
mv data/cshapes-2.1-simplified.json public/cshapes-2.1-simplified.json
```

Then update `data/` handling: the doc reference `data/cshapes-2.1-simplified.json` in the extraction notes stays valid as a pointer, but runtime serves from `public/`.

### Step 4: Write tests

- [ ] Create `lib/__tests__/cshapes-loader.test.ts`:

```typescript
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
```

### Step 5: Verify

- [ ] Run `npm test` — all CShapes loader tests pass

---

## Task 2: Integrate CShapes into Border Data Layer

**Files:**
- Modify: `lib/border-data.ts`
- Modify: `lib/__tests__/border-data.test.ts`

### Step 1: Update border-data.ts to route 1886–2019 through CShapes

- [ ] Modify `lib/border-data.ts`:

Replace the Thenmap branch. The new routing:
- `year >= 2020` → Natural Earth
- `year >= CSHAPES_MIN_YEAR && year <= 2019` → CShapes
- `year < CSHAPES_MIN_YEAR` → historical-basemaps

Remove `loadThenmapBorders` and the `THENMAP_URL` constant. Update `BorderResult.source` usage.

Key changes in `loadBordersForYear`:

```typescript
export async function loadBordersForYear(
  year: number
): Promise<BorderResult> {
  const cached = cache.get(year);
  if (cached) return cached;

  let result: BorderResult;

  if (year >= 2020) {
    const geojson = await loadModernBorders();
    result = { geojson, source: 'natural-earth', actualYear: year };
  } else if (year >= CSHAPES_MIN_YEAR) {
    const geojson = await loadCShapesForYear(year);
    result = { geojson, source: 'cshapes', actualYear: year };
  } else {
    const { data, actualYear } = await loadHistoricalBorders(year);
    result = { geojson: data, source: 'historical-basemaps', actualYear };
  }

  cache.set(year, result);
  return result;
}
```

Add import: `import { loadCShapesForYear, CSHAPES_MIN_YEAR } from './cshapes-loader';`

### Step 2: Remove Thenmap constant

- [ ] Modify `lib/constants.ts` — remove `THENMAP_URL`

### Step 3: Update existing border-data tests

- [ ] Modify `lib/__tests__/border-data.test.ts` — remove Thenmap assertions, add CShapes routing expectations (mock fetch for cshapes JSON if needed, or move to integration test)

### Step 4: Verify

- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run dev` — load the app, scrub to 1920, confirm map renders without Thenmap network call (check Network tab: only `cshapes-2.1-simplified.json` and world-atlas load)

---

## Task 3: Dynamic Disputed Zone Detection

**Files:**
- Modify: `lib/border-data.ts` — new `getDisputedForYear()` async function
- Modify: `components/Map/render-disputed.ts` — add pulse animation option
- Modify: `components/MapApp.tsx` — load disputed per year change

### Step 1: Add getDisputedForYear to border-data

- [ ] Add to `lib/border-data.ts`:

```typescript
import { loadCShapesDisputedForYear, CSHAPES_MIN_YEAR } from './cshapes-loader';

const MODERN_STATIC_DISPUTED: GeoJSON.FeatureCollection = { /* existing DISPUTED_ZONES */ };

export async function getDisputedForYear(
  year: number
): Promise<GeoJSON.FeatureCollection> {
  if (year >= 2020) {
    // Merge CShapes-detected (1886–2023 range covers 2020-2023) with static modern zones
    const cshapesDisputed = year <= 2023
      ? await loadCShapesDisputedForYear(year)
      : { type: 'FeatureCollection' as const, features: [] };
    return {
      type: 'FeatureCollection',
      features: [...cshapesDisputed.features, ...MODERN_STATIC_DISPUTED.features],
    };
  }
  if (year >= CSHAPES_MIN_YEAR) {
    return await loadCShapesDisputedForYear(year);
  }
  // Pre-1886: no disputed overlay (historical-basemaps lacks temporal metadata)
  return { type: 'FeatureCollection', features: [] };
}
```

Keep `getDisputedZones()` for backward compatibility but mark as returning the static fallback only.

### Step 2: Update render-disputed with optional pulse

- [ ] Modify `components/Map/render-disputed.ts`:

```typescript
import * as d3 from 'd3';
import type { GeoPath } from 'd3-geo';

export interface RenderDisputedOptions {
  pulse?: boolean;
}

export function renderDisputedZones(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  geojson: GeoJSON.FeatureCollection,
  pathGenerator: GeoPath,
  options: RenderDisputedOptions = {}
) {
  const paths = g
    .selectAll<SVGPathElement, GeoJSON.Feature>('path.disputed')
    .data(geojson.features, (f: any) =>
      String(f.id ?? f.properties?.name ?? f.properties?.cntry_name ?? Math.random())
    );

  paths.exit().remove();

  const enter = paths
    .enter()
    .append('path')
    .attr('class', 'disputed')
    .attr('fill', 'rgba(255, 167, 38, 0.08)')
    .attr('stroke', '#ffa726')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,3')
    .attr('pointer-events', 'none');

  enter.merge(paths).attr('d', (d: any) => pathGenerator(d));

  if (options.pulse) {
    g.selectAll<SVGPathElement, unknown>('path.disputed')
      .classed('disputed-pulse', true);
  } else {
    g.selectAll<SVGPathElement, unknown>('path.disputed')
      .classed('disputed-pulse', false);
  }
}

export function clearDisputedZones(
  g: d3.Selection<SVGGElement, unknown, null, undefined>
) {
  g.selectAll('path.disputed').remove();
}
```

### Step 3: Add pulse animation to globals.css

- [ ] Add to `app/globals.css`:

```css
@keyframes disputed-pulse {
  0%, 100% {
    stroke-opacity: 1;
    fill-opacity: 0.08;
  }
  50% {
    stroke-opacity: 0.5;
    fill-opacity: 0.2;
  }
}

.disputed-pulse {
  animation: disputed-pulse 2s ease-in-out infinite;
}
```

### Step 4: Wire MapApp to async disputed loading

- [ ] Modify `components/MapApp.tsx`:

Replace the sync `getDisputedZones()` call with an async fetch triggered when year changes. Add a state `disputedGeojson` and effect:

```typescript
import { getDisputedForYear } from '@/lib/border-data';

// In MapApp component:
const [disputedGeojson, setDisputedGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

useEffect(() => {
  let cancelled = false;
  getDisputedForYear(year).then(data => {
    if (!cancelled) setDisputedGeojson(data);
  });
  return () => { cancelled = true; };
}, [year]);

// When calling renderDisputedZones, pass { pulse: isPlaying }
// Where isPlaying is the autoplay state from Task 5
```

During Task 3, wire it with `pulse: false` since autoplay doesn't exist yet. Task 5 will add the pulse trigger.

### Step 5: Verify

- [ ] Scrub to 1990 and confirm disputed overlay appears (USSR dissolution nearby)
- [ ] Scrub to 2020+ and confirm both dynamic + static zones appear (Crimea, Kashmir still visible)
- [ ] Scrub to pre-1886 and confirm no disputed overlay

---

## Task 4: Rich Tooltips with Date Ranges

**Files:**
- Modify: `components/Map/render-countries.ts` — tooltip content
- Modify: `components/InfoPanel/InfoPanel.tsx` — add date range line
- Modify: `components/MapApp.tsx` — pass source tier to tooltip

### Step 1: Update country hover handler to emit date range

- [ ] Modify `components/Map/render-countries.ts`:

The tooltip currently emits `{ name, x, y }`. Extend to include `dateRange`:

```typescript
export interface HoverInfo {
  name: string;
  dateRange: string | null; // e.g., "1958–present", or null for non-CShapes
  x: number;
  y: number;
}
```

In the hover handler, read `gwsyear`/`gweyear` from properties:

```typescript
function formatDateRange(props: any): string | null {
  const start = props?.gwsyear;
  const end = props?.gweyear;
  if (typeof start !== 'number' || start <= 0) return null;
  if (!end || end <= 0) return `${start}–present`;
  return `${start}–${end}`;
}

// In mouseenter handler:
const dateRange = formatDateRange(d.properties);
onHover?.({ name, dateRange, x: event.clientX, y: event.clientY });
```

### Step 2: Update MapApp tooltip rendering

- [ ] Modify `components/MapApp.tsx` tooltip JSX:

```tsx
{hoverPos && hoveredName && (
  <div className="pointer-events-none fixed z-50 ..." style={{ left: hoverPos.x + 12, top: hoverPos.y + 12 }}>
    <div>{hoveredName}</div>
    {hoverPos.dateRange && (
      <div className="text-[11px] text-text-secondary tabular-nums">
        ({hoverPos.dateRange})
      </div>
    )}
  </div>
)}
```

Extend `hoverPos` state type to include `dateRange`.

### Step 3: Update InfoPanel with configuration date range

- [ ] Modify `components/InfoPanel/InfoPanel.tsx`:

When selectedFeature.properties has `gwsyear`, render an additional line under the era context:

```tsx
{dateRange && (
  <p className="text-[13px] text-text-secondary mt-1">
    Border configuration: {dateRange}
  </p>
)}
```

Compute `dateRange` the same way as the tooltip.

### Step 4: Verify

- [ ] Hover over France in 1960 → tooltip shows "France" + "(1958–present)" or similar based on dataset
- [ ] Click a country in 2010 → info panel shows "Border configuration: YYYY–present"
- [ ] Hover over a pre-1886 country → tooltip shows name only (no date range)

---

## Task 5: Autoplay / Cinematic Mode

**Files:**
- Modify: `components/Controls/PlaybackButtons.tsx` — add play button
- Modify: `components/MapApp.tsx` — autoplay state, loop, disputed pulse trigger
- Modify: `components/Controls/SpeedIndicator.tsx` — click-to-cycle

### Step 1: Add play button and autoplay state to MapApp

- [ ] Modify `components/MapApp.tsx`:

Add state:
```typescript
const [isAutoplay, setIsAutoplay] = useState(false);
const [autoplaySpeed, setAutoplaySpeed] = useState<1 | 2 | 4>(1);
const autoplayTimerRef = useRef<number | null>(null);
```

Autoplay loop:
```typescript
useEffect(() => {
  if (!isAutoplay) {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    return;
  }

  const interval = Math.round(400 / autoplaySpeed); // 400ms/year at 1x → 100ms/year at 4x
  autoplayTimerRef.current = window.setInterval(() => {
    setYear(y => {
      if (y >= MAX_YEAR) {
        setIsAutoplay(false);
        return y;
      }
      return y + 1;
    });
  }, interval);

  return () => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  };
}, [isAutoplay, autoplaySpeed]);

// Stop autoplay on any manual interaction
const stopAutoplay = () => setIsAutoplay(false);
```

Wire `stopAutoplay` into: slider drag, rewind/forward click, country click, event jump.

### Step 2: Add play button to PlaybackButtons

- [ ] Modify `components/Controls/PlaybackButtons.tsx`:

Add a third button between rewind and forward:

```tsx
<button
  aria-label={isAutoplay ? 'Pause' : 'Play'}
  onClick={onTogglePlay}
  className="..."
>
  {isAutoplay ? '❚❚' : '▶'}
</button>
```

Add props `isAutoplay: boolean` and `onTogglePlay: () => void`.

### Step 3: Speed cycling via SpeedIndicator

- [ ] Modify `components/Controls/SpeedIndicator.tsx`:

Add click handler that cycles 1→2→4→1. Show current autoplay speed when `isAutoplay` is true:

```tsx
<button
  onClick={onCycleSpeed}
  className="text-sm tabular-nums text-accent-blue"
>
  {speed}x
</button>
```

### Step 4: Trigger disputed pulse during autoplay

- [ ] In `components/MapApp.tsx`, pass `pulse: isAutoplay` to `renderDisputedZones`.

### Step 5: Verify

- [ ] Click play → map auto-advances year by year
- [ ] Click speed indicator → cycles 1x → 2x → 4x → 1x
- [ ] Drag slider during autoplay → autoplay pauses
- [ ] Reach 2026 → autoplay stops at final year
- [ ] Disputed zones pulse during autoplay

---

## Task 6: Historical Event Timeline

**Files:**
- Create: `data/historical-events.ts`
- Create: `components/Controls/EventTimeline.tsx`
- Modify: `components/Controls/YearSlider.tsx` — accept overlay slot
- Modify: `components/MapApp.tsx` — event jump handler

### Step 1: Create curated event list

- [ ] Create `data/historical-events.ts`:

```typescript
export interface HistoricalEvent {
  year: number;
  name: string;
  summary?: string;
}

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  { year: -3000, name: 'Dawn of recorded history' },
  { year: -753, name: 'Founding of Rome' },
  { year: -221, name: 'Qin unifies China' },
  { year: 476, name: 'Fall of Western Rome' },
  { year: 800, name: 'Charlemagne crowned' },
  { year: 1066, name: 'Norman Conquest of England' },
  { year: 1206, name: 'Genghis Khan founds Mongol Empire' },
  { year: 1279, name: 'Mongol Empire reaches peak' },
  { year: 1453, name: 'Fall of Constantinople' },
  { year: 1492, name: 'Columbus reaches Americas' },
  { year: 1648, name: 'Peace of Westphalia' },
  { year: 1776, name: 'US Declaration of Independence' },
  { year: 1815, name: 'Congress of Vienna' },
  { year: 1871, name: 'German Unification' },
  { year: 1914, name: 'World War I begins' },
  { year: 1918, name: 'WWI ends; empires collapse' },
  { year: 1939, name: 'World War II begins' },
  { year: 1945, name: 'WWII ends; UN founded' },
  { year: 1947, name: 'Indian independence & partition' },
  { year: 1949, name: 'PRC founded' },
  { year: 1960, name: "Africa's Year of Independence" },
  { year: 1989, name: 'Fall of the Berlin Wall' },
  { year: 1991, name: 'Dissolution of the USSR' },
  { year: 1993, name: 'Czechoslovakia splits' },
  { year: 2011, name: 'South Sudan independence' },
];
```

### Step 2: Create EventTimeline component

- [ ] Create `components/Controls/EventTimeline.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { HISTORICAL_EVENTS, type HistoricalEvent } from '@/data/historical-events';
import { MIN_YEAR, MAX_YEAR } from '@/lib/constants';

interface EventTimelineProps {
  onJump: (year: number) => void;
}

export function EventTimeline({ onJump }: EventTimelineProps) {
  const [hovered, setHovered] = useState<HistoricalEvent | null>(null);
  const span = MAX_YEAR - MIN_YEAR;

  return (
    <div className="pointer-events-none absolute inset-0">
      {HISTORICAL_EVENTS.map(ev => {
        const pct = ((ev.year - MIN_YEAR) / span) * 100;
        return (
          <button
            key={`${ev.year}-${ev.name}`}
            onClick={() => onJump(ev.year)}
            onMouseEnter={() => setHovered(ev)}
            onMouseLeave={() => setHovered(null)}
            className="pointer-events-auto absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-accent-blue hover:bg-white transition-colors"
            style={{ left: `${pct}%` }}
            aria-label={`Jump to ${ev.year}: ${ev.name}`}
          />
        );
      })}
      {hovered && (
        <div
          className="absolute bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[11px] text-white"
          style={{ left: `${((hovered.year - MIN_YEAR) / span) * 100}%` }}
        >
          {hovered.name} ({hovered.year < 0 ? `${Math.abs(hovered.year)} BCE` : hovered.year})
        </div>
      )}
    </div>
  );
}
```

### Step 3: Add event timeline as overlay to YearSlider

- [ ] Modify `components/Controls/YearSlider.tsx`:

Wrap the range input in a relative container and accept a `children` slot rendered absolutely over it:

```tsx
<div className="relative w-full">
  {children}
  <input type="range" ... />
</div>
```

Or simpler: render the EventTimeline as a sibling positioned absolutely by MapApp.

### Step 4: Wire event jump in MapApp

- [ ] Modify `components/MapApp.tsx`:

```typescript
const handleEventJump = (targetYear: number) => {
  stopAutoplay();
  setYear(targetYear);
  // The morph engine already detects distance and uses 800ms for jumps
};

// In JSX, render <EventTimeline onJump={handleEventJump} /> inside/over the slider
```

### Step 5: Verify

- [ ] Timeline markers appear on slider at correct positions
- [ ] Hover marker → tooltip shows event name and year
- [ ] Click marker → map jumps to that year with long morph
- [ ] Markers fade with controls (inside ControlOverlay, inherits auto-hide)
- [ ] Clicking marker during autoplay stops autoplay

### Step 6: Write test

- [ ] Create `lib/__tests__/historical-events.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { HISTORICAL_EVENTS } from '../../data/historical-events';
import { MIN_YEAR, MAX_YEAR } from '../constants';

describe('HISTORICAL_EVENTS', () => {
  it('has at least 20 events', () => {
    expect(HISTORICAL_EVENTS.length).toBeGreaterThanOrEqual(20);
  });

  it('all events are within the app year range', () => {
    HISTORICAL_EVENTS.forEach(ev => {
      expect(ev.year).toBeGreaterThanOrEqual(MIN_YEAR);
      expect(ev.year).toBeLessThanOrEqual(MAX_YEAR);
    });
  });

  it('all events have non-empty names', () => {
    HISTORICAL_EVENTS.forEach(ev => {
      expect(ev.name.trim().length).toBeGreaterThan(0);
    });
  });
});
```

---

## Final Verification

- [ ] `npm test` — all tests pass (Phase 1 tests + new CShapes + events tests)
- [ ] `npm run build` — production build succeeds with no TypeScript errors
- [ ] `npm run dev` — manual smoke test:
  - Scrub 1920 → CShapes renders with year-level accuracy (no Thenmap network call)
  - Scrub 1991 → disputed zones appear around USSR dissolution
  - Hover France in 1960 → tooltip shows date range
  - Click play → autoplay advances, disputed zones pulse
  - Click speed indicator → cycles 1x/2x/4x
  - Click "Fall of USSR (1991)" marker → jumps to 1991 with 800ms morph
- [ ] Commit each task separately with a clear message
- [ ] Open PR or merge to main (follow Phase 1 precedent: merge to main after verification)
