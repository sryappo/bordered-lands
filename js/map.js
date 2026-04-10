/**
 * map.js - D3.js world map rendering with projection, zoom/pan, and transitions
 */

var WorldMap = (function () {
  // ---- State ----
  var svg, g, projection, pathGenerator, zoom;
  var currentYear = 2026;
  var tooltip;
  var graticuleEl;

  // Muted earth-tone palette for countries
  var COUNTRY_COLORS = [
    '#3a6b5e', '#4a7a6e', '#5a8a7e', '#3a5a7a', '#4a6a8a',
    '#5a7a6a', '#6a8a5a', '#4a6a5a', '#3a7a7a', '#5a6a7a',
    '#6a7a5a', '#4a8a7a', '#5a7a5a', '#3a6a6a', '#6a6a7a',
    '#4a7a5a', '#5a6a6a', '#3a8a6a', '#7a7a5a', '#4a5a7a'
  ];

  /**
   * Assign a deterministic color to a country based on its index.
   */
  function countryColor(d, i) {
    var hash = (i !== undefined) ? i : (d.id ? parseInt(d.id, 10) : 0);
    return COUNTRY_COLORS[Math.abs(hash) % COUNTRY_COLORS.length];
  }

  /**
   * Get the display name for a feature.
   */
  function getFeatureName(d) {
    if (!d.properties) return 'Unknown';
    return d.properties.name || d.properties.NAME || d.properties.ADMIN ||
           d.properties.GEOUNIT || d.properties.SOVEREIGNT ||
           ('Country ' + (d.id || ''));
  }

  /**
   * Build a stable key for a feature so D3 enter/update/exit works correctly.
   */
  function featureKey(d, i) {
    if (d.id) return 'id_' + d.id;
    var name = d.properties && (d.properties.name || d.properties.NAME);
    if (name) return 'name_' + name;
    return 'idx_' + i;
  }

  /**
   * Initialize the SVG map inside #map-container.
   */
  function init() {
    var container = document.getElementById('map-container');
    var width = container.clientWidth;
    var height = container.clientHeight;

    // Create SVG
    svg = d3.select('#map-container')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Projection
    projection = d3.geoNaturalEarth1()
      .scale(width / 5.5)
      .translate([width / 2, height / 2]);

    pathGenerator = d3.geoPath().projection(projection);

    // Zoom behavior
    zoom = d3.zoom()
      .scaleExtent([0.5, 12])
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Main group for all map elements
    g = svg.append('g');

    // Ocean background
    g.append('path')
      .datum({ type: 'Sphere' })
      .attr('class', 'ocean')
      .attr('d', pathGenerator);

    // Graticule (lat/lon grid)
    var graticule = d3.geoGraticule();
    graticuleEl = g.append('path')
      .datum(graticule())
      .attr('class', 'graticule')
      .attr('d', pathGenerator);

    // Group for country fills
    g.append('g').attr('id', 'countries-group');

    // Group for country borders (drawn on top)
    g.append('g').attr('id', 'borders-group');

    // Group for disputed zones (drawn on top of everything)
    g.append('g').attr('id', 'disputed-group');

    // Tooltip
    tooltip = d3.select('#map-container')
      .append('div')
      .attr('class', 'country-tooltip');

    // Handle window resize
    window.addEventListener('resize', handleResize);
  }

  /**
   * Handle window resize: update projection and redraw.
   */
  function handleResize() {
    var container = document.getElementById('map-container');
    var width = container.clientWidth;
    var height = container.clientHeight;

    svg.attr('width', width).attr('height', height);

    projection
      .scale(width / 5.5)
      .translate([width / 2, height / 2]);

    pathGenerator = d3.geoPath().projection(projection);

    // Redraw all paths
    g.select('.ocean').attr('d', pathGenerator);
    graticuleEl.attr('d', pathGenerator);
    g.selectAll('.country').attr('d', pathGenerator);
    g.selectAll('.country-borders').attr('d', pathGenerator);
    g.selectAll('.disputed-zone').attr('d', pathGenerator);
  }

  /**
   * Render country borders from a GeoJSON FeatureCollection.
   * Uses D3 enter/update/exit pattern with transitions.
   */
  function renderCountries(geojson, animate) {
    var countriesGroup = g.select('#countries-group');
    var bordersGroup = g.select('#borders-group');

    var features = geojson.features || [];
    var duration = animate ? 400 : 0;

    // ---- Country fills ----
    var countries = countriesGroup.selectAll('.country')
      .data(features, featureKey);

    // Exit
    countries.exit()
      .transition().duration(duration)
      .style('opacity', 0)
      .remove();

    // Enter
    var enter = countries.enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', pathGenerator)
      .style('fill', function (d, i) { return countryColor(d, i); })
      .style('opacity', 0)
      .on('mousemove', function (event, d) {
        var name = getFeatureName(d);
        tooltip
          .html(name)
          .classed('visible', true)
          .style('left', (event.offsetX + 12) + 'px')
          .style('top', (event.offsetY - 28) + 'px');
      })
      .on('mouseleave', function () {
        tooltip.classed('visible', false);
      });

    enter.transition().duration(duration)
      .style('opacity', 1);

    // Update existing
    countries
      .transition().duration(duration)
      .attr('d', pathGenerator)
      .style('fill', function (d, i) { return countryColor(d, i); });

    // ---- Country border lines ----
    bordersGroup.selectAll('.country-borders').remove();

    bordersGroup.selectAll('.country-borders')
      .data(features)
      .enter()
      .append('path')
      .attr('class', 'country-borders')
      .attr('d', pathGenerator)
      .style('opacity', 0)
      .transition().duration(duration)
      .style('opacity', 1);
  }

  /**
   * Render disputed territories overlay.
   */
  function renderDisputedZones(geojson) {
    var disputedGroup = g.select('#disputed-group');

    var zones = disputedGroup.selectAll('.disputed-zone')
      .data(geojson.features, function (d) { return d.properties.name; });

    zones.exit().remove();

    zones.enter()
      .append('path')
      .attr('class', 'disputed-zone')
      .attr('d', pathGenerator)
      .append('title')
      .text(function (d) {
        return d.properties.name + ' (' + d.properties.parties + ')';
      });

    zones.attr('d', pathGenerator);
  }

  /**
   * Update the map to show borders for a given year.
   */
  async function setYear(year, animate) {
    if (animate === undefined) animate = true;
    currentYear = year;

    var loading = document.getElementById('loading-overlay');
    loading.classList.remove('hidden');

    try {
      var result = await BorderData.loadBordersForYear(year);
      renderCountries(result.geojson, animate);

      // Show disputed zones only for modern era (post-1990)
      if (year >= 1990) {
        renderDisputedZones(BorderData.getDisputedZones());
      } else {
        g.select('#disputed-group').selectAll('*').remove();
      }
    } catch (err) {
      console.error('Failed to load borders for year ' + year + ':', err);
    } finally {
      loading.classList.add('hidden');
    }
  }

  /**
   * Get current year being displayed.
   */
  function getCurrentYear() {
    return currentYear;
  }

  return {
    init: init,
    setYear: setYear,
    getCurrentYear: getCurrentYear
  };
})();
