import { useEffect, useRef } from 'react';

export function useGameLoop(
  isRunning: boolean,
  update: (deltaTime: number) => void,
  render: () => void
): void {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    const animate = (time: number): void => {
      if (previousTimeRef.current !== undefined && isRunningRef.current) {
        const deltaTime = Math.min((time - previousTimeRef.current) / 1000, 0.1);
        update(deltaTime);
        render();
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [update, render]);
}
