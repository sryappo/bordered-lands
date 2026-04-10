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
