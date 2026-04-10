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
