'use client';

import { formatYear, getEraLabel } from '@/lib/country-metadata';

interface YearDisplayProps {
  year: number;
  isRewinding: boolean;
}

export default function YearDisplay({ year, isRewinding }: YearDisplayProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 text-center pt-[18px] pb-2 pointer-events-none bg-gradient-to-b from-dark-bg/65 to-transparent [backdrop-filter:blur(20px)_saturate(180%)] [-webkit-backdrop-filter:blur(20px)_saturate(180%)] [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
      <div
        className={`text-[72px] font-extralight tracking-[6px] leading-none transition-colors duration-300 tabular-nums ${
          isRewinding
            ? 'text-accent-amber [text-shadow:0_0_30px_rgba(255,167,38,0.5)]'
            : 'text-white [text-shadow:0_0_30px_rgba(100,160,255,0.4)]'
        }`}
      >
        {/* Key remount triggers the cross-fade per year change. The era label
            below is intentionally NOT keyed so it stays static across years
            within an era. */}
        <span key={year} className="inline-block animate-year-tick tabular-nums">
          {formatYear(year)}
        </span>
      </div>
      <div className="text-[13px] text-text-secondary tracking-[2px] uppercase mt-1 min-h-[20px]">
        {getEraLabel(year)}
      </div>
    </div>
  );
}
