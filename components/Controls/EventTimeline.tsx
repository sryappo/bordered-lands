'use client';

import { useState } from 'react';
import {
  HISTORICAL_EVENTS,
  type HistoricalEvent,
} from '@/data/historical-events';
import { MIN_YEAR, MAX_YEAR } from '@/lib/constants';

interface EventTimelineProps {
  onJump: (year: number) => void;
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
}

export default function EventTimeline({ onJump }: EventTimelineProps) {
  const [hovered, setHovered] = useState<HistoricalEvent | null>(null);
  const span = MAX_YEAR - MIN_YEAR;

  return (
    <div className="pointer-events-none absolute inset-0">
      {HISTORICAL_EVENTS.map((ev) => {
        const pct = ((ev.year - MIN_YEAR) / span) * 100;
        return (
          <button
            key={`${ev.year}-${ev.name}`}
            type="button"
            onClick={() => onJump(ev.year)}
            onMouseEnter={() => setHovered(ev)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(ev)}
            onBlur={() => setHovered(null)}
            className="pointer-events-auto absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-accent-blue hover:bg-white focus:bg-white transition-colors outline-none"
            style={{ left: `${pct}%` }}
            aria-label={`Jump to ${formatYear(ev.year)}: ${ev.name}`}
            title={`${ev.name} (${formatYear(ev.year)})`}
          />
        );
      })}
      {hovered && (
        <div
          className="absolute bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[11px] text-white pointer-events-none"
          style={{
            left: `${((hovered.year - MIN_YEAR) / span) * 100}%`,
          }}
        >
          {hovered.name} ({formatYear(hovered.year)})
        </div>
      )}
    </div>
  );
}
