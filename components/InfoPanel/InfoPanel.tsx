'use client';

import { useEffect } from 'react';
import { getFeatureName, getEraLabel, formatYear } from '@/lib/country-metadata';
import type { BorderResult } from '@/lib/types';

interface InfoPanelProps {
  feature: GeoJSON.Feature | null;
  year: number;
  borderResult: BorderResult | null;
  onClose: () => void;
}

export default function InfoPanel({
  feature,
  year,
  borderResult,
  onClose,
}: InfoPanelProps) {
  const isOpen = feature !== null;

  // Escape key closes the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const name = feature ? getFeatureName(feature) : '';
  const eraLabel = getEraLabel(year);
  const yearStr = formatYear(year);
  const source = borderResult?.source ?? 'unknown';
  const actualYear = borderResult?.actualYear ?? year;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[360px] z-30 bg-[rgba(10,14,26,0.92)] border-l-2 border-accent-blue flex flex-col transition-transform ${
        isOpen
          ? 'translate-x-0 duration-[250ms] ease-out'
          : 'translate-x-full duration-[200ms] ease-in'
      }`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.08] border border-white/15 text-[#ccc] flex items-center justify-center cursor-pointer hover:bg-white/15 hover:text-white transition-colors"
        aria-label="Close panel"
      >
        <svg viewBox="0 0 24 24" width={16} height={16}>
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Content */}
      <div className="p-6 pt-16 flex flex-col gap-4">
        {/* Country name */}
        <h2 className="text-2xl font-light text-white">{name}</h2>

        {/* Era context */}
        <div className="text-sm text-text-secondary uppercase tracking-wider">
          {eraLabel} ({yearStr})
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10" />

        {/* Data source */}
        <div className="text-xs text-text-secondary/60">
          <span className="uppercase tracking-wider">Source:</span>{' '}
          {source}
          {actualYear !== year && (
            <span> (nearest data: {formatYear(actualYear)})</span>
          )}
        </div>
      </div>
    </div>
  );
}
