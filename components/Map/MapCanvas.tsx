'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (defs as any).selectAll('#ocean-gradient').remove();
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
