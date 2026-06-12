export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let rafId: number | null = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    const now = performance.now();
    
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    } else {
      rafId = requestAnimationFrame(() => {
        lastTime = performance.now();
        fn.apply(this, args);
        rafId = null;
      });
    }
  };
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

export function rafThrottle<T extends (...args: any[]) => void>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs && lastThis !== null) {
          fn.apply(lastThis, lastArgs);
        }
        rafId = null;
        lastArgs = null;
        lastThis = null;
      });
    }
  };
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapAngle(angle: number, snapDegrees: number = 15): number {
  return Math.round(angle / snapDegrees) * snapDegrees;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
