'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import MapCanvas, { type MapCanvasHandle } from './Map/MapCanvas';
import YearDisplay from './Controls/YearDisplay';
import PlaybackButtons from './Controls/PlaybackButtons';
import YearSlider from './Controls/YearSlider';
import ControlOverlay from './Controls/ControlOverlay';
import InfoPanel from './InfoPanel/InfoPanel';
import { renderCountries } from './Map/render-countries';
import { renderDisputedZones, clearDisputedZones } from './Map/render-disputed';
import { loadBordersForYear, getDisputedForYear } from '@/lib/border-data';
import { getFeatureName } from '@/lib/country-metadata';
import { MAX_YEAR, MIN_YEAR, MORPH_STEP_MS, DEBOUNCE_MS } from '@/lib/constants';
import type { BorderResult } from '@/lib/types';

export default function MapApp() {
  const mapRef = useRef<MapCanvasHandle>(null);
  const [year, setYear] = useState(MAX_YEAR);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [disputedGeojson, setDisputedGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  const previousGeojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const currentResultRef = useRef<BorderResult | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRenderYearRef = useRef<number | null>(null);
  const isRewindingRef = useRef(false);
  const disputedGeojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);

  const updateMap = useCallback(
    async (targetYear: number, animate: boolean) => {
      const map = mapRef.current;
      if (!map) return;

      const pathGenerator = map.getPathGenerator();
      const countriesGroup = map.getCountriesGroup();
      const disputedGroup = map.getDisputedGroup();
      if (!pathGenerator || !countriesGroup || !disputedGroup) return;

      if (lastRenderYearRef.current === targetYear) return;

      setLoading(true);
      try {
        const result = await loadBordersForYear(targetYear);

        // Get borders group (sibling of countries group under the same parent <g>)
        const parentG = countriesGroup.node()?.parentElement;
        const bordersGroup = parentG
          ? d3.select(parentG).select<SVGGElement>('.borders-group')
          : countriesGroup;

        renderCountries(countriesGroup, bordersGroup, result.geojson, {
          year: targetYear,
          pathGenerator,
          animate: animate && previousGeojsonRef.current !== null,
          duration: MORPH_STEP_MS,
          previousGeojson: previousGeojsonRef.current,
          onHover: (feature, event) => {
            if (feature) {
              setHoveredName(getFeatureName(feature));
              setHoverPos({ x: event.offsetX, y: event.offsetY });
            } else {
              setHoveredName(null);
              setHoverPos(null);
            }
          },
          onClick: (feature) => {
            if (!isRewindingRef.current) {
              setSelectedFeature((prev) =>
                prev === feature ? null : feature
              );
            }
          },
          selectedFeatureKey: null,
        });

        const disputedData = disputedGeojsonRef.current;
        if (disputedData && disputedData.features.length > 0) {
          renderDisputedZones(disputedGroup, disputedData, pathGenerator, {
            pulse: false,
          });
        } else {
          clearDisputedZones(disputedGroup);
        }

        previousGeojsonRef.current = result.geojson;
        currentResultRef.current = result;
        lastRenderYearRef.current = targetYear;
      } catch (err) {
        console.error(`Failed to load borders for year ${targetYear}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [] // no deps — uses refs for isRewinding to avoid stale closures
  );

  // Initial load on mount
  useEffect(() => {
    updateMap(MAX_YEAR, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep isRewindingRef in sync with state
  useEffect(() => {
    isRewindingRef.current = isRewinding;
  }, [isRewinding]);

  // Load disputed zones when year changes. Uses a cancelled flag so that
  // rapid slider scrubbing only commits the latest result.
  useEffect(() => {
    let cancelled = false;
    getDisputedForYear(year)
      .then((data) => {
        if (cancelled) return;
        setDisputedGeojson(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Failed to load disputed zones for year ${year}:`, err);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  // Mirror disputed state to a ref and re-render the overlay when it changes.
  useEffect(() => {
    disputedGeojsonRef.current = disputedGeojson;
    const map = mapRef.current;
    if (!map) return;
    const pathGenerator = map.getPathGenerator();
    const disputedGroup = map.getDisputedGroup();
    if (!pathGenerator || !disputedGroup) return;
    if (disputedGeojson && disputedGeojson.features.length > 0) {
      renderDisputedZones(disputedGroup, disputedGeojson, pathGenerator, {
        pulse: false,
      });
    } else {
      clearDisputedZones(disputedGroup);
    }
  }, [disputedGeojson]);

  const handleYearChange = useCallback(
    (newYear: number, shouldAnimate = true) => {
      setYear(newYear);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        updateMap(newYear, shouldAnimate);
      }, DEBOUNCE_MS);
    },
    [updateMap]
  );

  const handleSliderChange = useCallback(
    (newYear: number) => {
      setYear(newYear);
      handleYearChange(newYear, false); // no morph when scrubbing
    },
    [handleYearChange]
  );

  const handleYearStep = useCallback(
    (direction: -1 | 1) => {
      setYear((prev) => {
        const next = prev + direction;
        if (next >= MIN_YEAR && next <= MAX_YEAR) {
          handleYearChange(next, true);
          return next;
        }
        return prev;
      });
    },
    [handleYearChange]
  );

  const handleCloseInfoPanel = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  const handleMapBackgroundClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target.tagName === 'svg' || target.classList.contains('ocean')) {
      setSelectedFeature(null);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-bg relative">
      <div className="contents" onClick={handleMapBackgroundClick}>
        <MapCanvas ref={mapRef} />
      </div>

      <ControlOverlay forceVisible={isRewinding}>
        <YearDisplay year={year} isRewinding={isRewinding} />
      </ControlOverlay>

      <ControlOverlay forceVisible={isRewinding}>
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-4 flex flex-col items-center gap-2.5 bg-gradient-to-t from-dark-bg/[0.92] to-transparent pt-12">
          <PlaybackButtons
            year={year}
            onYearStep={handleYearStep}
            onRewindingChange={setIsRewinding}
          />
          <YearSlider year={year} onYearChange={handleSliderChange} />
          {/* Legend */}
          <div className="flex gap-5 text-xs text-[#667]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-2.5 rounded-sm bg-[#5a8a6a] border border-[#3a4a5a]" />
              Country borders
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-2.5 rounded-sm bg-[rgba(255,167,38,0.3)] border border-dashed border-[#ff9800]" />
              Disputed zones
            </span>
          </div>
        </div>
      </ControlOverlay>

      {/* Tooltip */}
      {hoveredName && hoverPos && (
        <div
          className="absolute z-20 bg-[rgba(10,14,26,0.9)] border border-[#334] rounded px-2.5 py-1.5 text-[13px] text-white pointer-events-none whitespace-nowrap"
          style={{ left: hoverPos.x + 12, top: hoverPos.y - 28 }}
        >
          {hoveredName}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center bg-dark-bg/70 gap-3">
          <div className="w-8 h-8 border-[3px] border-[#1a2a3a] border-t-accent-blue rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">Loading borders...</span>
        </div>
      )}

      <InfoPanel
        feature={selectedFeature}
        year={year}
        borderResult={currentResultRef.current}
        onClose={handleCloseInfoPanel}
      />
    </div>
  );
}
