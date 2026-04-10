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
