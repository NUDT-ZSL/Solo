import { useState, useEffect, useRef } from 'react';

interface UseCountdownOptions {
  targetTime: Date | string | number;
  serverTimeOffset?: number;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calcTimeLeft = (targetMs: number, offsetMs: number): TimeLeft => {
  const now = Date.now() + offsetMs;
  const total = Math.max(0, targetMs - now);

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);

  return { days, hours, minutes, seconds, total };
};

export const useCountdown = ({
  targetTime,
  serverTimeOffset = 0,
  onComplete,
}: UseCountdownOptions) => {
  const targetMsRef = useRef<number>(
    typeof targetTime === 'string' || typeof targetTime === 'number'
      ? new Date(targetTime).getTime()
      : targetTime.getTime()
  );
  const offsetRef = useRef<number>(serverTimeOffset);
  const completedRef = useRef<boolean>(false);
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calcTimeLeft(targetMsRef.current, offsetRef.current)
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (typeof targetTime === 'string' || typeof targetTime === 'number') {
      targetMsRef.current = new Date(targetTime).getTime();
    } else {
      targetMsRef.current = targetTime.getTime();
    }
    offsetRef.current = serverTimeOffset;
    completedRef.current = false;
    setTimeLeft(calcTimeLeft(targetMsRef.current, offsetRef.current));
  }, [targetTime, serverTimeOffset]);

  useEffect(() => {
    const tick = () => {
      const next = calcTimeLeft(targetMsRef.current, offsetRef.current);
      setTimeLeft(next);

      if (next.total <= 0 && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const isCompleted = timeLeft.total <= 0;

  return {
    ...timeLeft,
    isCompleted,
  };
};
