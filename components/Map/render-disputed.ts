import * as d3 from 'd3';

export interface RenderDisputedOptions {
  pulse?: boolean;
}

function featureKey(f: GeoJSON.Feature): string {
  if (f.id != null) return String(f.id);
  const props = (f.properties ?? {}) as Record<string, unknown>;
  if (typeof props.name === 'string') return props.name;
  if (typeof props.cntry_name === 'string') return props.cntry_name;
  return JSON.stringify(f.geometry);
}

export function renderDisputedZones(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  geojson: GeoJSON.FeatureCollection,
  pathGenerator: d3.GeoPath,
  options: RenderDisputedOptions = {}
): void {
  const paths = g
    .selectAll<SVGPathElement, GeoJSON.Feature>('path.disputed-zone')
    .data(geojson.features, (d) => featureKey(d));

  paths.exit().remove();

  const enter = paths
    .enter()
    .append('path')
    .attr('class', 'disputed-zone')
    .attr('fill', 'rgba(255, 167, 38, 0.08)')
    .attr('stroke', '#ffa726')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4 3')
    .attr('pointer-events', 'none');

  enter.append('title').text((d) => {
    const props = (d.properties ?? {}) as Record<string, unknown>;
    const name =
      (typeof props.name === 'string' && props.name) ||
      (typeof props.cntry_name === 'string' && props.cntry_name) ||
      'Disputed territory';
    const parties = typeof props.parties === 'string' ? props.parties : null;
    return parties ? `${name} (${parties})` : String(name);
  });

  enter.merge(paths).attr('d', pathGenerator as any);

  g.selectAll<SVGPathElement, unknown>('path.disputed-zone').classed(
    'disputed-pulse',
    Boolean(options.pulse)
  );
}

export function clearDisputedZones(
  g: d3.Selection<SVGGElement, unknown, null, undefined>
): void {
  g.selectAll('path.disputed-zone').remove();
}
