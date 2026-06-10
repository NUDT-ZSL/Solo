import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountdownOptions {
  targetTime: number;
  onComplete?: () => void;
  syncServerTime?: () => Promise<number>;
  syncInterval?: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calcTimeLeft = (targetMs: number, nowMs: number): TimeLeft => {
  const total = Math.max(0, targetMs - nowMs);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { days, hours, minutes, seconds, total };
};

export const useCountdown = ({
  targetTime,
  onComplete,
  syncServerTime,
  syncInterval = 1000,
}: UseCountdownOptions) => {
  const targetMsRef = useRef<number>(targetTime);
  const serverOffsetRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete);
  const syncingRef = useRef<boolean>(false);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calcTimeLeft(targetTime, Date.now())
  );

  const syncTime = useCallback(async () => {
    if (!syncServerTime || syncingRef.current) return;
    syncingRef.current = true;
    try {
      const serverTime = await syncServerTime();
      const now = Date.now();
      serverOffsetRef.current = serverTime - now;
    } catch {
      // ignore sync errors
    } finally {
      syncingRef.current = false;
    }
  }, [syncServerTime]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    targetMsRef.current = targetTime;
    completedRef.current = false;
    setTimeLeft(calcTimeLeft(targetTime, Date.now() + serverOffsetRef.current));
  }, [targetTime]);

  useEffect(() => {
    if (syncServerTime) {
      void syncTime();
    }
  }, [syncServerTime, syncTime]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now() + serverOffsetRef.current;
      const next = calcTimeLeft(targetMsRef.current, now);
      setTimeLeft(next);

      if (next.total <= 0 && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);

    let syncTimer: ReturnType<typeof setInterval> | null = null;
    if (syncServerTime && syncInterval > 0) {
      syncTimer = setInterval(() => {
        void syncTime();
      }, syncInterval);
    }

    return () => {
      clearInterval(intervalId);
      if (syncTimer) clearInterval(syncTimer);
    };
  }, [syncServerTime, syncInterval, syncTime]);

  const isCompleted = timeLeft.total <= 0;

  return {
    ...timeLeft,
    isCompleted,
  };
};
