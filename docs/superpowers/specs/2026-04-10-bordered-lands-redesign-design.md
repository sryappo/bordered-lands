# Bordered Lands — Redesign Spec

## Overview

A full redesign of the Historical Border Map web app, transforming it from a vanilla HTML/JS prototype into a polished Next.js/React portfolio piece. The core experience: scrub through 5,000 years of world history and watch country borders morph smoothly in real time on a cinematic dark map.

**Goal:** Portfolio-grade "wow factor" — impressive visuals, delightful interactions, clean code.

**Approach:** Phased rewrite. Phase 1 delivers the core experience. Phase 2 adds optional enhancements.

---

## Phase 1 — Core

### Tech Stack

- **Framework:** Next.js (App Router)
- **Rendering:** React + D3.js (D3 renders SVG via refs, React owns state)
- **Styling:** Tailwind CSS (decide during setup; CSS Modules is the fallback if Tailwind adds friction)
- **Fonts:** Inter or Geist via `next/font`
- **No backend:** All data fetched client-side from CDNs/APIs (same as current)
- **No SSR for the map:** The page shell is a Server Component; the map and all interactive pieces are a single `'use client'` tree

### Project Structure

```
app/
  layout.tsx          — root layout, fonts, metadata
  page.tsx            — server component shell, loads MapApp
components/
  MapApp.tsx          — top-level client component, orchestrates everything
  Map/
    MapCanvas.tsx     — D3 SVG rendering, projection, zoom/pan
    CountryLayer.tsx  — country fills + morph transitions
    DisputedLayer.tsx — disputed territory overlay (post-1990)
    Graticule.tsx     — lat/lon grid lines
  Controls/
    ControlOverlay.tsx — auto-hiding wrapper for all controls
    YearDisplay.tsx    — large cinematic year number + era label
    YearSlider.tsx     — scrub slider
    PlaybackButtons.tsx — rewind, forward (play added in Phase 2)
    SpeedIndicator.tsx — "2x", "4x" during continuous rewind
  InfoPanel/
    InfoPanel.tsx      — slide-in country details panel
lib/
  border-data.ts      — data fetching, caching, year resolution
  geo-morph.ts        — GeoJSON polygon interpolation for smooth transitions
  country-metadata.ts — ISO numeric → country name mapping
  constants.ts        — year ranges, API URLs, timing config
```

### Data Layer

Direct port of the existing three-tier strategy:

| Year Range | Source | Format |
|---|---|---|
| 2020–2026 | Natural Earth (world-atlas CDN) | TopoJSON → GeoJSON |
| 1945–2019 | Thenmap API, fallback to historical-basemaps | GeoJSON |
| pre-1945 | historical-basemaps GitHub repo | GeoJSON |

- In-memory cache (`Map`) keyed by year, same as current
- `findNearestHistoricalYear()` logic preserved for snapping to available historical data points
- Disputed territories: same curated GeoJSON (Kashmir, Crimea, Western Sahara, etc.), shown only post-1990

### D3 + React Integration

- `MapCanvas` renders an `<svg>` element via `useRef`
- D3 operates on the ref directly — no React DOM diffing for SVG paths
- React state drives: current year, selected country, UI visibility, playback state
- State changes trigger D3 updates via `useEffect`
- D3 zoom behavior attached to the SVG, transform applied to a `<g>` group

### Border Morphing (Core Feature)

The main "wow factor." When the year changes, country borders smoothly interpolate between shapes instead of fading in/out.

**Implementation (`geo-morph.ts`):**
- Use `flubber` library for polygon interpolation between GeoJSON geometries
- Match countries across year snapshots by feature ID or name
- Three morph scenarios:
  - **Country persists:** interpolate polygon coordinates over ~300ms
  - **Country appears:** grow animation from centroid point to full shape
  - **Country disappears:** shrink from full shape to centroid point
- Easing: ease-out for natural feel

**Performance considerations:**
- When stepping 1 year: full 300ms morph animation
- When scrubbing slider quickly: debounce at ~60ms, skip morphing, use instant swap (morphing at speed would be janky and waste CPU)
- When jumping to distant year (Phase 2 timeline events): longer ~800ms morph with easing

### Visual Design

**Color Palette:**
- Background: `#0a0e1a` (deep navy-black)
- Ocean: `#0d1b2a` with subtle radial gradient (lighter toward center for depth)
- Countries: saturated earth tones with discrete palette per era bracket (ancient/classical = warmer ambers/ochres, medieval = muted greens/browns, modern = cooler teals/blues). Palette switches at the same era boundaries used by the era label.
- Borders: `#2a3a4a` at rest, white glow on hover
- Accent blue: `#4a9eff` (UI elements, slider thumb, selected states)
- Accent amber: `#ffa726` (active/rewinding states)
- Text primary: `#ffffff`
- Text secondary: `#8899aa`

**Typography:**
- Year display: weight 200, ~80px, tabular nums, subtle blue `text-shadow`
- Era label: 13px, uppercase, `letter-spacing: 3px`, secondary color
- Info panel body: 15px, comfortable line-height
- All sans-serif (Inter or Geist)

**Map Treatment:**
- Graticule: very faint (opacity 0.3), fades out past ~4x zoom
- Country hover: border brightens to white, `brightness(1.15)` lift, 150ms transition
- Selected country: stays highlighted with brighter stroke while info panel is open
- Disputed zones: dashed amber stroke, subtle semi-transparent fill

### Controls — Minimal Overlay

**Layout:**
- Top center: Year display (large) + era label — floating over map
- Bottom center: Control bar (playback buttons + year slider) — floating over map
- No persistent header or footer — just floating elements with subtle gradient backdrops
- Full-bleed map behind everything

**Auto-hide behavior:**
- 3 seconds of mouse/touch inactivity → all controls fade to opacity 0 (300ms transition)
- Any mouse movement, touch, or keyboard input → controls fade back in
- During continuous rewind: controls stay visible

**Rewind/Forward (ported + refined):**
- Click: step one year
- Hold (300ms threshold): continuous rewind/forward with acceleration
- Speed ramp: 500ms/year → 80ms/year over 8 seconds (same curve as current)
- Spacebar: tap = step back, hold = continuous rewind
- Speed indicator appears during continuous playback

**Year Slider:**
- Full-width within the control bar (max 600px)
- Min/max labels at ends ("3000 BCE" / "2026")
- Blue thumb, dark track
- Dragging the slider debounces map updates at 60ms

**Zoom & Pan:**
- D3 zoom: scroll to zoom, drag to pan
- Scale extent: 0.5x to 12x
- Controls are fixed (not affected by zoom transform)
- Graticule fades out past ~4x zoom

### Info Panel — Slide-in Country Details

**Trigger:** Click a country while playback is stopped/paused.

**Panel specs:**
- Slides in from right edge, ~360px wide
- Background: `rgba(10, 14, 26, 0.92)` with left border accent in blue
- Close: X button top-right, Escape key, or clicking the map

**Content:**
- Country name: 24px, white
- Era context: small label, e.g. "Medieval Period (1200 CE)"
- Data source note: tiny footer showing which data tier and actual snapped year

**Behavior:**
- Click a country → highlight it, panel slides in (250ms ease-out, `translateX(100%)` → `0`)
- Click another country → panel content crossfades (150ms)
- Close → panel slides out (200ms ease-in), highlight clears
- During rewind/playback: country clicks disabled, cursor remains as grab

**Data scope:** Panel shows what the data sources actually provide — country name, era label, data source. No hardcoded encyclopedia. Richer metadata is an additive future change.

### Transitions & Motion

- All UI state changes: 200–300ms ease-out
- Year display during rewind: amber color with gentle pulse glow
- Control fade in/out: 300ms
- Info panel slide: 250ms in, 200ms out
- Border morph: 300ms (step), instant (scrub), 800ms (jump)

---

## Phase 2 — Enhancements

Phase 2 builds on Phase 1's infrastructure. It adds a data-quality upgrade, data-driven visuals, and two new UI features. Items A–C upgrade the underlying data and tooltips (foundation); items D–E add the new UI (autoplay + timeline). A–C should land first because the UI features benefit from the richer data.

### A. CShapes 2.1 Data Integration (Foundation)

**Source:** Bundled GeoJSON at `data/cshapes-2.1-simplified.json` (3.4MB, 710 features, 1886–2023, 252 unique countries). Derived from the Schvitz et al. CShapes 2.1 research dataset.

**Per-feature properties:**
- `cntry_name` — authoritative country name
- `gwsyear` — start year of this border configuration
- `gweyear` — end year (0 or missing = ongoing)

**New data tier structure:**

| Year Range | Source | Format |
|---|---|---|
| 2020–2026 | Natural Earth (world-atlas CDN) | TopoJSON → GeoJSON |
| **1886–2019** | **CShapes 2.1 (bundled)** | **GeoJSON, client-side filter** |
| pre-1886 | historical-basemaps GitHub repo | GeoJSON |

- Thenmap API is **removed** from the data tier. CShapes replaces it with offline, year-level accuracy.
- `loadBordersForYear(year)` for 1886–2019 returns a filtered view of the CShapes FeatureCollection (no network call).
- The in-memory cache still applies — cache the filtered result by year so repeated lookups are O(1).
- CShapes loads once on app startup (lazy on first request to any year in its range), then filtering is synchronous.
- `actualYear` in `BorderResult` equals the requested year exactly (CShapes supports every year 1886–2023), not a snap like historical-basemaps.

**Filter algorithm:**
```typescript
function filterForYear(features: Feature[], year: number): Feature[] {
  return features.filter(f => {
    const start = Number(f.properties.gwsyear);
    let end = Number(f.properties.gweyear);
    if (!end || end <= 0) end = 2023; // dataset's open-ended sentinel
    return year >= start && year <= end;
  });
}
```

### B. Dynamic Disputed Zone Detection

**Replaces:** The static 4-polygon disputed zones list (Kashmir, Crimea, Western Sahara, Golan Heights) becomes a fallback only.

**New behavior:** For any year in 1886–2023 (CShapes range), disputed zones are computed from the data:

```typescript
function getDisputedForYear(features: Feature[], year: number): Feature[] {
  return features.filter(f => {
    const start = Number(f.properties.gwsyear);
    const end = Number(f.properties.gweyear);
    return year === end || year + 1 === start;
  });
}
```

**Logic:** A country's borders are "in flux" if they end this year (`year === end`) or if a new configuration starts next year (`year + 1 === start`). This surfaces automatically:
- Countries about to dissolve or split
- New states about to emerge
- Reconfigurations about to take effect

**Visual treatment:**
- Dashed amber overlay (existing `render-disputed.ts` visual)
- Subtle 2s pulse animation on disputed zones when autoplay is active (draws attention to imminent changes)
- Rendered beneath country interaction layer — hover still targets underlying country, not the disputed overlay

**Fallback hierarchy:**
- 1886–2023: dynamic detection from CShapes
- 2020+: dynamic detection from CShapes (up to 2023) merged with static hardcoded modern zones (Crimea post-2014, Kashmir, Western Sahara, Golan Heights) for current geopolitical disputes
- pre-1886: no disputed overlay (historical-basemaps lacks temporal metadata for detection)

### C. Rich Tooltips with Date Ranges

**Current:** Hover shows country name only.

**New:** For features sourced from CShapes, tooltip shows name + configuration date range:

```
France
(1958–present)
```

**Format:**
- Country name on line 1 (existing 14px style)
- Date range on line 2 (11px, secondary color, tabular nums)
- `end > 0` → `"(gwsyear–gweyear)"`, else `"(gwsyear–present)"`
- Fall back to name-only for pre-1886 features (historical-basemaps has no temporal properties)

**Info panel update:**
- When a country is selected via click, the info panel also shows the configuration date range under the era context line
- Example: `France` → `Modern Era (1958 CE)` → `Border configuration: 1958–present`

### D. Autoplay / Cinematic Mode

- Play button added to control bar (between rewind and forward)
- Press play → auto-advances through years at ~400ms/year with smooth morph transitions
- Speed adjustable by clicking speed indicator: cycles through 1x, 2x, 4x
- Pauses at year 2026; click play to restart from current position
- Any manual interaction (click country, drag slider, rewind/forward) pauses autoplay
- Disputed-zone pulse animation (item B) is active during autoplay to highlight imminent border changes

### E. Historical Event Timeline

- Small diamond/dot markers rendered on the year slider at key historical moments
- Curated list of ~20–30 events covering major moments:
  - Rise/fall of empires, major wars, treaties, decolonization waves
  - Examples: Fall of Rome (476), Mongol Empire peak (1279), Treaty of Westphalia (1648), WW1 (1914), WW2 (1939), Fall of USSR (1991)
- Hover a marker → tooltip with event name and year
- Click a marker → jump to that year with the long (800ms) morph animation
- Markers fade with controls (part of auto-hide behavior)
- Events within the CShapes range (1886–2023) benefit from year-level accuracy — clicking "Fall of USSR (1991)" shows the exact 1991 border configuration, not a snapped approximation

### Implementation Order

Items A–C should be implemented first (data foundation), then D–E (UI features):

1. **A** — CShapes integration into `border-data.ts` (swap out Thenmap, wire up client-side filtering)
2. **B** — Dynamic disputed zone detection in `render-disputed.ts` (new `getDisputedForYear` path, keep static as fallback)
3. **C** — Tooltip and info panel date-range display
4. **D** — Autoplay mode (play button, auto-advance loop, speed cycling)
5. **E** — Historical event timeline (marker list, slider rendering, click-to-jump)

Rationale: Items D and E both benefit from A–C. The event timeline in particular depends on year-level accuracy (A) to hit events precisely, and autoplay's cinematic quality is elevated by pulsing disputed zones (B).

---

## Out of Scope

- Server-side rendering of the map
- Backend API or database
- User accounts or saved states
- Mobile-specific redesign (responsive is fine, but not a separate mobile UX)
- Rich country metadata beyond what data sources provide (capitals, population, history blurbs)
- Globe/3D projection (staying with Natural Earth flat projection)
- Deployment pipeline (can be added later)
