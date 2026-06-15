export const easeOutCubic = (t: number): number =>
  1 - Math.pow(1 - t, 3);

export const easeInCubic = (t: number): number =>
  t * t * t;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeOutBounce = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const easeOutQuad = (t: number): number =>
  1 - (1 - t) * (1 - t);

export const lerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

export const cubicBezier = (
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number => {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
};

export const cubicBezierDerivative = (
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number => {
  const u = 1 - t;
  return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2);
};

export const getAngleOnBezier = (
  t: number,
  x0: number, y0: number,
  cp1x: number, cp1y: number,
  cp2x: number, cp2y: number,
  x3: number, y3: number
): number => {
  const dx = cubicBezierDerivative(t, x0, cp1x, cp2x, x3);
  const dy = cubicBezierDerivative(t, y0, cp1y, cp2y, y3);
  return Math.atan2(dy, dx);
};

export const sineWave = (t: number, amplitude: number, period: number, phase: number = 0): number =>
  amplitude * Math.sin((t / period) * Math.PI * 2 + phase);

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const randomRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const animateNumber = (
  from: number,
  to: number,
  progress: number,
  easing: (t: number) => number = easeOutCubic
): number => {
  return from + (to - from) * easing(Math.min(1, Math.max(0, progress)));
};

export class FrameRateController {
  private lastTime: number = 0;
  private frameDuration: number;
  private accumulatedTime: number = 0;
  private onFrameCallback: ((deltaTime: number) => void) | null = null;
  private rafId: number | null = null;
  private running: boolean = false;

  constructor(targetFps: number = 60) {
    this.frameDuration = 1000 / targetFps;
  }

  setTargetFps(fps: number): void {
    this.frameDuration = 1000 / fps;
  }

  onFrame(callback: (deltaTime: number) => void): void {
    this.onFrameCallback = callback;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulatedTime = 0;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;
    this.accumulatedTime += deltaTime;
    if (this.accumulatedTime >= this.frameDuration) {
      const frameDelta = this.accumulatedTime;
      this.accumulatedTime = 0;
      if (this.onFrameCallback) {
        try {
          this.onFrameCallback(frameDelta);
        } catch (e) {
          console.error('Frame callback error:', e);
        }
      }
    }
  };
}
