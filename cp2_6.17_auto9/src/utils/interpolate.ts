export type EasingFunction = (t: number) => number;

export const easeInOutCubic: EasingFunction = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic: EasingFunction = (t: number): number =>
  1 - Math.pow(1 - t, 3);

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function lerpColor(
  colorA: string,
  colorB: string,
  t: number,
): string {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface AnimationHandle {
  cancel: () => void;
}

export function animateValue(
  duration: number,
  onUpdate: (progress: number, easedProgress: number) => void,
  onComplete?: () => void,
  easing: EasingFunction = easeInOutCubic,
): AnimationHandle {
  const start = performance.now();
  let rafId: number | null = null;
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) return;
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easing(progress);
    onUpdate(progress, eased);
    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
  };

  rafId = requestAnimationFrame(step);

  return {
    cancel: () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    },
  };
}
