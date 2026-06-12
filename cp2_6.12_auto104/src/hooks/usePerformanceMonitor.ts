import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  fps: number;
  avgResponseTime: number;
  operations: { name: string; duration: number }[];
}

export const usePerformanceMonitor = (
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void,
  enabled = true,
) => {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(60);
  const operationsRef = useRef<{ name: string; startTime: number }[]>([]);
  const responseTimesRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number>();

  const measureOperationStart = useCallback((name: string) => {
    if (!enabled) return;
    operationsRef.current.push({ name, startTime: performance.now() });
  }, [enabled]);

  const measureOperationEnd = useCallback((name: string) => {
    if (!enabled) return;
    const opIndex = operationsRef.current.findIndex((op) => op.name === name);
    if (opIndex !== -1) {
      const op = operationsRef.current[opIndex];
      const duration = performance.now() - op.startTime;
      responseTimesRef.current.push(duration);
      if (responseTimesRef.current.length > 50) {
        responseTimesRef.current.shift();
      }
      operationsRef.current.splice(opIndex, 1);
      if (duration > 200) {
        console.warn(`操作 ${name} 响应时间超过200ms: ${duration.toFixed(2)}ms`);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const measureFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        fpsRef.current = Math.round((frameCountRef.current * 1000) / delta);
        frameCountRef.current = 0;
        lastTimeRef.current = now;

        if (fpsRef.current < 50) {
          console.warn(`FPS 低于50: ${fpsRef.current}`);
        }

        const avgResponseTime =
          responseTimesRef.current.length > 0
            ? responseTimesRef.current.reduce((a, b) => a + b, 0) /
              responseTimesRef.current.length
            : 0;

        onMetricsUpdate?.({
          fps: fpsRef.current,
          avgResponseTime,
          operations: responseTimesRef.current.slice(-10).map((d, i) => ({
            name: `op_${i}`,
            duration: d,
          })),
        });
      }

      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    animationFrameRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, onMetricsUpdate]);

  return {
    measureOperationStart,
    measureOperationEnd,
    getCurrentFPS: () => fpsRef.current,
    getAvgResponseTime: () =>
      responseTimesRef.current.length > 0
        ? responseTimesRef.current.reduce((a, b) => a + b, 0) /
          responseTimesRef.current.length
        : 0,
  };
};
