export function initFpsMonitor(onFpsUpdate?: (fps: number) => void) {
  let frames = 0;
  let lastTime = performance.now();
  let rafId: number;

  const measure = () => {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      const fps = Math.round((frames * 1000) / (now - lastTime));
      if (onFpsUpdate) onFpsUpdate(fps);
      if (fps < 40) {
        console.warn(`[perf] FPS dropped below 40: ${fps}`);
      }
      frames = 0;
      lastTime = now;
    }
    rafId = requestAnimationFrame(measure);
  };

  rafId = requestAnimationFrame(measure);

  return () => cancelAnimationFrame(rafId);
}

export function measureBlockTime(fn: () => void, label: string, threshold = 50) {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  if (duration > threshold) {
    console.warn(`[perf] ${label} blocked main thread for ${duration.toFixed(0)}ms (threshold: ${threshold}ms)`);
  }
  return duration;
}

export function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  }) as T;
}
