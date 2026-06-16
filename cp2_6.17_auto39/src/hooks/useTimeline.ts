import { useEffect, useRef, useCallback } from 'react';
import { useGlobalStore, START_YEAR, END_YEAR } from '../store/useGlobalStore';

const TICK_INTERVAL_MS = 1000;

export function useTimeline() {
  const currentYear = useGlobalStore(s => s.currentYear);
  const isPlaying = useGlobalStore(s => s.isPlaying);
  const setIsPlaying = useGlobalStore(s => s.setIsPlaying);
  const setCurrentYear = useGlobalStore(s => s.setCurrentYear);
  const tickYear = useGlobalStore(s => s.tickYear);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        tickYear();
      }, TICK_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, tickYear]);

  const play = useCallback(() => setIsPlaying(true), [setIsPlaying]);
  const pause = useCallback(() => setIsPlaying(false), [setIsPlaying]);
  const toggle = useCallback(() => setIsPlaying(!isPlaying), [isPlaying, setIsPlaying]);
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentYear(START_YEAR);
  }, [setCurrentYear, setIsPlaying]);
  const goToYear = useCallback(
    (y: number) => setCurrentYear(Math.max(START_YEAR, Math.min(END_YEAR, y))),
    [setCurrentYear]
  );
  const stepForward = useCallback(() => {
    if (currentYear < END_YEAR) setCurrentYear(currentYear + 1);
  }, [currentYear, setCurrentYear]);
  const stepBackward = useCallback(() => {
    if (currentYear > START_YEAR) setCurrentYear(currentYear - 1);
  }, [currentYear, setCurrentYear]);

  return {
    currentYear,
    isPlaying,
    startYear: START_YEAR,
    endYear: END_YEAR,
    play,
    pause,
    toggle,
    reset,
    goToYear,
    stepForward,
    stepBackward
  };
}
