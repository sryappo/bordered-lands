'use client';

import { useCallback } from 'react';
import { MIN_YEAR, MAX_YEAR } from '@/lib/constants';

interface YearSliderProps {
  year: number;
  onYearChange: (year: number) => void;
}

export default function YearSlider({ year, onYearChange }: YearSliderProps) {
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onYearChange(parseInt(e.target.value, 10));
    },
    [onYearChange]
  );

  return (
    <div className="flex items-center gap-3 w-full max-w-[600px]">
      <span className="text-xs text-[#667] tabular-nums min-w-[58px]">
        3000 BCE
      </span>
      <input
        type="range"
        min={MIN_YEAR}
        max={MAX_YEAR}
        value={year}
        step={1}
        onChange={handleInput}
        className="flex-1 h-1 bg-[#1a2a3a] rounded-sm appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-blue [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-dark-bg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-[#6ab4ff]
          [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent-blue [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-dark-bg [&::-moz-range-thumb]:cursor-pointer"
      />
      <span className="text-xs text-[#667] tabular-nums min-w-[30px]">
        2026
      </span>
    </div>
  );
}
