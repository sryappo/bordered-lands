/**
 * app.js - Entry point. Initializes the map and controls, wires them together.
 */

(function () {
  'use strict';

  const START_YEAR = 2026;

  // Debounce helper: collapse rapid year changes into fewer map updates
  let pendingYear = null;
  let debounceTimer = null;
  const DEBOUNCE_MS = 60;

  function debouncedMapUpdate(year) {
    pendingYear = year;
    if (debounceTimer) return; // already scheduled

    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      if (pendingYear !== null) {
        WorldMap.setYear(pendingYear, true);
        pendingYear = null;
      }
    }, DEBOUNCE_MS);
  }

  async function main() {
    // Initialize the map
    WorldMap.init();

    // Initialize controls with year-change callback
    Controls.init({
      startYear: START_YEAR,
      onYearChange: function (year) {
        debouncedMapUpdate(year);
      }
    });

    // Load initial borders
    await WorldMap.setYear(START_YEAR, false);
  }

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
