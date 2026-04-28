'use client';

interface SpeedIndicatorProps {
  visible: boolean;
  speed: number; // ms per year (hold-to-rewind ramp speed)
  baseSpeed: number; // initial speed for calculating multiplier
  isAutoplay?: boolean;
  autoplaySpeed?: 1 | 2 | 4;
  onCycleSpeed?: () => void;
}

export default function SpeedIndicator({
  visible,
  speed,
  baseSpeed,
  isAutoplay = false,
  autoplaySpeed = 1,
  onCycleSpeed,
}: SpeedIndicatorProps) {
  // During autoplay, show the discrete autoplay speed as a clickable button.
  if (isAutoplay) {
    return (
      <button
        type="button"
        onClick={onCycleSpeed}
        aria-label={`Playback speed ${autoplaySpeed}x (click to cycle)`}
        className="btn-lift text-[13px] text-accent-amber min-w-[30px] text-center cursor-pointer rounded px-1 py-0.5 hover:bg-white/10 hover:text-white tabular-nums"
      >
        {autoplaySpeed}x
      </button>
    );
  }

  // Otherwise fall back to the rewind ramp multiplier (non-interactive).
  const multiplier = Math.round(baseSpeed / speed);
  return (
    <div
      className={`text-[13px] text-accent-amber min-w-[30px] text-center transition-opacity duration-200 tabular-nums ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {multiplier}x
    </div>
  );
}
