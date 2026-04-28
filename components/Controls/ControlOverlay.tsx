'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CONTROL_HIDE_DELAY, CONTROL_FADE_MS } from '@/lib/constants';

interface ControlOverlayProps {
  forceVisible?: boolean;
  children: React.ReactNode;
}

export default function ControlOverlay({
  forceVisible = false,
  children,
}: ControlOverlayProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!forceVisible) {
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, CONTROL_HIDE_DELAY);
    }
  }, [forceVisible]);

  useEffect(() => {
    if (forceVisible) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    resetTimer();
  }, [forceVisible, resetTimer]);

  useEffect(() => {
    const handleActivity = () => resetTimer();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        // Drift the controls downward as they fade out so the disappearance
        // feels weighted, then settle back to neutral on fade-in.
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: `opacity ${CONTROL_FADE_MS}ms var(--ease-apple), transform ${CONTROL_FADE_MS}ms var(--ease-apple)`,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  );
}
