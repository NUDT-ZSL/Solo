import { useState, useEffect, useRef } from 'react';

export type AnimationPhase = 'idle' | 'leaving' | 'entering';

const LEAVE_DURATION = 300;
const ENTER_DURATION = 400;

export function useSlideAnimation<T>(value: T) {
  const [displayValue, setDisplayValue] = useState<T>(value);
  const [phase, setPhase] = useState<AnimationPhase>('idle');
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevValueRef = useRef<T>(value);

  useEffect(() => {
    if (prevValueRef.current === value) {
      return;
    }

    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
    }

    if (prevValueRef.current !== undefined && prevValueRef.current !== null) {
      setPhase('leaving');

      leaveTimerRef.current = setTimeout(() => {
        setDisplayValue(value);
        prevValueRef.current = value;
        setPhase('entering');

        enterTimerRef.current = setTimeout(() => {
          setPhase('idle');
        }, ENTER_DURATION);
      }, LEAVE_DURATION);
    } else {
      setDisplayValue(value);
      prevValueRef.current = value;
      setPhase('entering');

      enterTimerRef.current = setTimeout(() => {
        setPhase('idle');
      }, ENTER_DURATION);
    }

    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
      if (enterTimerRef.current) {
        clearTimeout(enterTimerRef.current);
      }
    };
  }, [value]);

  return {
    displayValue,
    phase,
    isAnimating: phase !== 'idle',
    leaveDuration: LEAVE_DURATION,
    enterDuration: ENTER_DURATION,
  };
}
