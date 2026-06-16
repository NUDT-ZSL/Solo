import { useRef, useEffect, useState, useCallback } from 'react';

export function useFPS(intervalMs = 500): number {
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      framesRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= intervalMs) {
        const fpsCalc = Math.round(
          (framesRef.current * 1000) / (now - lastTimeRef.current)
        );
        setFps(fpsCalc);
        framesRef.current = 0;
        lastTimeRef.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [intervalMs]);

  return fps;
}

export function useThrottle<T extends (...args: never[]) => void>(
  fn: T,
  limitMs: number
): T {
  const lastCallRef = useRef(0);
  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= limitMs) {
        lastCallRef.current = now;
        fn(...args);
      }
    },
    [fn, limitMs]
  ) as T;
}

export function useFrameCounter(): { count: number; tick: () => void } {
  const [count, setCount] = useState(0);
  const tick = useCallback(() => {
    setCount(c => c + 1);
  }, []);
  return { count, tick };
}
