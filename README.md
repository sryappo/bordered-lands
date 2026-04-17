# Bordered Lands

An interactive historical world map. Scrub through 5,000 years of history and watch country borders morph smoothly in real time.

## Features

- **Smooth border morphing** — countries interpolate between year snapshots instead of snapping
- **Cinematic autoplay** — press play, auto-advance at 1x / 2x / 4x, disputed zones pulse as borders shift
- **Dynamic disputed zones** — computed from CShapes 2.1 temporal data; automatically flags borders about to change
- **Historical event timeline** — 25 curated markers on the year slider (Fall of Rome, WWI, Fall of USSR, etc.)
- **Rich tooltips** — country name plus border configuration date range on hover
- **Era-based palettes** — color shifts across ancient / classical / medieval / modern

## Data sources

| Year range | Source |
|---|---|
| 2020–2026 | Natural Earth (world-atlas) |
| 1886–2019 | CShapes 2.1 (bundled) |
| pre-1886 | historical-basemaps |

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · D3.js v7 · flubber (polygon morphing) · Tailwind CSS v4 · Vitest

## Dev

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # 41 tests
npm run build
```
