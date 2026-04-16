# Old Version Extraction — Reference for Phase 2+

Extracted from: `/Users/sergeyryappo/Desktop/Creative Project Portfolio/Bordered Lands Project/world_map_app/`

## 1. CShapes 2.1 Dataset

**Saved to:** `data/cshapes-2.1-simplified.json` (3.4MB)

A research-grade GeoJSON FeatureCollection of historical country boundaries (1886–2023).
- 710 features, 252 unique country names
- Each feature has temporal validity via `gwsyear` / `gweyear` properties
- Simplified geometry (reduced vertices) — suitable for web rendering
- Source: Schvitz et al., CShapes 2.1 project

### Properties per feature

```json
{
  "cntry_name": "United States of America",
  "gwsyear": 1886,
  "gweyear": 1959
}
```

- `cntry_name` — authoritative country name from the dataset
- `gwsyear` — start year of this border configuration
- `gweyear` — end year (0 or missing = ongoing/present)

### How to filter features for a given year

```typescript
function getFeaturesForYear(features: Feature[], year: number): Feature[] {
  return features.filter(f => {
    const start = Number(f.properties.gwsyear);
    let end = Number(f.properties.gweyear);
    if (!end || end <= 0) end = currentYear;
    return year >= start && year <= end;
  });
}
```

### Integration opportunity

CShapes covers 1886–2023 with year-level granularity. The current app uses:
- Natural Earth (2020+) — static modern borders
- Thenmap API (1945–2019) — network-dependent, can be slow/down
- historical-basemaps (pre-1945) — sparse snapshots only

CShapes could replace Thenmap for 1886–2019, providing:
- Offline/instant filtering (no network calls)
- Year-by-year accuracy instead of API dependency
- Fallback when Thenmap is unavailable

---

## 2. Dynamic Disputed Zone Detection

The old version computed "zones of ambiguity" from the data rather than hardcoding them.

### Algorithm

```typescript
// A feature is "disputed" if its borders change at/around the current year
function getDisputedFeatures(features: Feature[], year: number): Feature[] {
  return features.filter(f => {
    const start = Number(f.properties.gwsyear);
    const end = Number(f.properties.gweyear);
    return year === end || year + 1 === start;
  });
}
```

**Logic:** If a country's borders end this year (`year === end`) or a new configuration starts next year (`year + 1 === start`), that region is in flux. This automatically highlights:
- Countries about to dissolve or lose territory
- New states about to emerge
- Border reconfigurations about to take effect

This is more powerful than the current 4 hardcoded zones (Kashmir, Crimea, Western Sahara, Golan Heights) because it works for *any year* in the dataset.

### Integration opportunity

Can coexist with static disputed zones:
- CShapes dynamic detection for 1886–2023 (data-driven)
- Static hardcoded zones for modern geopolitical disputes (always-on overlay)
- Combined: show both layers simultaneously

---

## 3. Country Name + Date Range Tooltips

The old version showed richer tooltips on hover:

```
France
(1945–present)
```

### Old tooltip code

```typescript
const name = feature.properties.cntry_name || feature.properties.name;
const start = feature.properties.gwsyear;
const end = feature.properties.gweyear;
const tooltip = `${name} (${start}–${end > 0 ? end : 'present'})`;
```

### Integration opportunity

The current version shows only the country name on hover. For years covered by CShapes (1886–2023), we can show the temporal range — telling users *when* that political entity existed in that configuration. For historical-basemaps data (pre-1886), fall back to name only.

---

## 4. "Zones of Ambiguity" — Original Vision

From the project spec:

> "Upon opening, the app displays a world map with clearly defined country borders and 'zones of ambiguity' (dynamic and shifting areas where borders are contested)."

The current version partially implements this with static disputed zones. The original vision was for these to be **computed from the data** — showing which borders are actively in flux at any given year.

### Full implementation plan

1. For CShapes years (1886–2023): use the dynamic detection algorithm above
2. For modern years (2020+): keep the static hardcoded disputed zones
3. Visual treatment: dashed amber overlay (already implemented in `render-disputed.ts`)
4. Tooltip on disputed zones: show which countries are involved and what's changing
5. Optional: animate disputed zones with a subtle pulse to draw attention

---

## Original Project Spec (from .docx)

> Web app that performs the following tasks:
>
> Upon opening, the app displays a world map with clearly defined country borders and "zones of ambiguity" (dynamic and shifting areas where borders are contested).
>
> The map page includes a play button that can be clicked or activated by pressing the space bar.
>
> When activated, the play button initiates a "back" function, allowing users to navigate through time:
> - A single click takes the user back one year
> - If held, the map continuously "plays back," rewinding year by year
>
> This is the fundamental concept. Let's begin with this and expand upon it as we progress.
