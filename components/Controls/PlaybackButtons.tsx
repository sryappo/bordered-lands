'use client';

import { useRef, useCallback, useEffect } from 'react';
import SpeedIndicator from './SpeedIndicator';
import {
  HOLD_DELAY,
  INITIAL_SPEED,
  MIN_SPEED,
  ACCELERATION_TIME,
  MIN_YEAR,
  MAX_YEAR,
} from '@/lib/constants';

interface PlaybackButtonsProps {
  year: number;
  onYearStep: (direction: -1 | 1) => void;
  onRewindingChange: (isRewinding: boolean) => void;
  isAutoplay: boolean;
  autoplaySpeed: 1 | 2 | 4;
  onTogglePlay: () => void;
  onCycleSpeed: () => void;
}

export default function PlaybackButtons({
  year,
  onYearStep,
  onRewindingChange,
  isAutoplay,
  autoplaySpeed,
  onTogglePlay,
  onCycleSpeed,
}: PlaybackButtonsProps) {
  const isRewindingRef = useRef(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const directionRef = useRef<-1 | 1>(-1);
  const currentSpeedRef = useRef(INITIAL_SPEED);
  const yearRef = useRef(year);
  yearRef.current = year;

  const getCurrentSpeed = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / ACCELERATION_TIME, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    return INITIAL_SPEED - eased * (INITIAL_SPEED - MIN_SPEED);
  }, []);

  const stopContinuous = useCallback(() => {
    isRewindingRef.current = false;
    if (intervalRef.current) clearTimeout(intervalRef.current);
    intervalRef.current = null;
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = null;
    onRewindingChange(false);
  }, [onRewindingChange]);

  const scheduleNext = useCallback(() => {
    if (!isRewindingRef.current) return;
    const speed = getCurrentSpeed();
    currentSpeedRef.current = speed;

    intervalRef.current = setTimeout(() => {
      const y = yearRef.current;
      if (
        isRewindingRef.current &&
        y > MIN_YEAR &&
        y < MAX_YEAR
      ) {
        onYearStep(directionRef.current);
        scheduleNext();
      } else {
        stopContinuous();
      }
    }, speed);
  }, [getCurrentSpeed, onYearStep, stopContinuous]);

  const startContinuous = useCallback(
    (direction: -1 | 1) => {
      if (isRewindingRef.current) return;
      isRewindingRef.current = true;
      directionRef.current = direction;
      startTimeRef.current = Date.now();
      onRewindingChange(true);
      scheduleNext();
    },
    [onRewindingChange, scheduleNext]
  );

  const handlePointerDown = useCallback(
    (direction: -1 | 1) => {
      if (isRewindingRef.current) return;
      directionRef.current = direction;
      onYearStep(direction);
      holdTimeoutRef.current = setTimeout(() => {
        startContinuous(direction);
      }, HOLD_DELAY);
    },
    [onYearStep, startContinuous]
  );

  const handlePointerUp = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    stopContinuous();
  }, [stopContinuous]);

  // Spacebar support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLButtonElement
      )
        return;
      e.preventDefault();
      if (e.repeat) {
        if (!isRewindingRef.current) startContinuous(-1);
        return;
      }
      onYearStep(-1);
      holdTimeoutRef.current = setTimeout(() => {
        startContinuous(-1);
      }, HOLD_DELAY);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      handlePointerUp();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [onYearStep, startContinuous, handlePointerUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-4">
      {/* Forward button */}
      <button
        className="btn-lift w-10 h-10 rounded-full bg-white/[0.08] border border-white/15 text-[#ccc] flex items-center justify-center cursor-pointer hover:bg-white/15 hover:text-white hover:border-white/30 active:bg-accent-amber/20 active:border-accent-amber active:text-accent-amber"
        onPointerDown={() => handlePointerDown(1)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        title="Forward one year"
      >
        <svg viewBox="0 0 24 24" width={20} height={20}>
          <polygon points="8,5 19,12 8,19" fill="currentColor" />
        </svg>
      </button>

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isAutoplay ? 'Pause' : 'Play'}
        title={isAutoplay ? 'Pause autoplay' : 'Play autoplay'}
        className={`btn-lift w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer ${
          isAutoplay
            ? 'bg-accent-amber/20 border-accent-amber text-accent-amber hover:bg-accent-amber/30'
            : 'bg-white/[0.08] border-white/15 text-[#ccc] hover:bg-white/15 hover:text-white hover:border-white/30'
        }`}
      >
        {isAutoplay ? (
          <svg viewBox="0 0 24 24" width={22} height={22}>
            <rect x={6} y={5} width={4} height={14} fill="currentColor" />
            <rect x={14} y={5} width={4} height={14} fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width={22} height={22}>
            <polygon points="7,5 19,12 7,19" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Rewind button (primary) */}
      <button
        className="btn-lift w-[52px] h-[52px] rounded-full bg-white/[0.08] border border-white/15 text-[#ccc] flex items-center justify-center cursor-pointer hover:bg-white/15 hover:text-white hover:border-white/30 active:bg-accent-amber/20 active:border-accent-amber active:text-accent-amber"
        onPointerDown={() => handlePointerDown(-1)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        title="Rewind one year (Space)"
      >
        <svg viewBox="0 0 24 24" width={28} height={28}>
          <polygon points="16,5 5,12 16,19" fill="currentColor" />
          <rect x={2} y={5} width={3} height={14} fill="currentColor" />
        </svg>
      </button>

      {/* Speed indicator (autoplay: clickable cycle; otherwise rewind ramp) */}
      <SpeedIndicator
        visible={isRewindingRef.current || isAutoplay}
        speed={currentSpeedRef.current}
        baseSpeed={INITIAL_SPEED}
        isAutoplay={isAutoplay}
        autoplaySpeed={autoplaySpeed}
        onCycleSpeed={onCycleSpeed}
      />
    </div>
  );
}
