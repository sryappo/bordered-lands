'use client';

interface SpeedIndicatorProps {
  visible: boolean;
  speed: number; // ms per year
  baseSpeed: number; // initial speed for calculating multiplier
}

export default function SpeedIndicator({
  visible,
  speed,
  baseSpeed,
}: SpeedIndicatorProps) {
  const multiplier = Math.round(baseSpeed / speed);

  return (
    <div
      className={`text-[13px] text-accent-amber min-w-[30px] text-center transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {multiplier}x
    </div>
  );
}
