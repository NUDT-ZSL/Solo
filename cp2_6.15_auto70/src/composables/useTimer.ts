import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerStatus } from '../types/recipe';

interface UseTimerOptions {
  initialDuration?: number;
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
}

interface UseTimerReturn {
  remainingTime: number;
  status: TimerStatus;
  progress: number;
  duration: number;
  start: () => void;
  pause: () => void;
  reset: (newDuration?: number) => void;
  setDuration: (duration: number) => void;
  formatTime: (seconds: number) => string;
}

export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const { initialDuration = 60, onComplete, onTick } = options;

  const [duration, setDurationState] = useState(initialDuration);
  const [remainingTime, setRemainingTime] = useState(initialDuration);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const start = useCallback(() => {
    if (status === 'running') return;
    if (remainingTime <= 0) {
      setRemainingTime(duration);
    }

    setStatus('running');
    startTimeRef.current = Date.now() - (duration - remainingTime) * 1000;

    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newRemaining = Math.max(0, duration - elapsed);

      setRemainingTime(newRemaining);
      setProgress(((duration - newRemaining) / duration) * 100);

      if (onTickRef.current) {
        onTickRef.current(newRemaining);
      }

      if (newRemaining <= 0) {
        clearTimer();
        setStatus('finished');
        setRemainingTime(0);
        setProgress(100);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    }, 100);
  }, [status, remainingTime, duration, clearTimer]);

  const pause = useCallback(() => {
    if (status !== 'running') return;

    clearTimer();
    setStatus('paused');
    pausedTimeRef.current = remainingTime;
  }, [status, remainingTime, clearTimer]);

  const reset = useCallback((newDuration?: number) => {
    clearTimer();
    const newDur = newDuration ?? duration;
    setDurationState(newDur);
    setRemainingTime(newDur);
    setStatus('idle');
    setProgress(0);
  }, [duration, clearTimer]);

  const setDuration = useCallback((newDuration: number) => {
    setDurationState(newDuration);
    if (status === 'idle' || status === 'finished') {
      setRemainingTime(newDuration);
    } else if (status === 'running') {
      const ratio = remainingTime / duration;
      setRemainingTime(newDuration * ratio);
      startTimeRef.current = Date.now() - (newDuration - newDuration * ratio) * 1000;
    }
  }, [status, remainingTime, duration]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    remainingTime,
    status,
    progress,
    duration,
    start,
    pause,
    reset,
    setDuration,
    formatTime,
  };
}
