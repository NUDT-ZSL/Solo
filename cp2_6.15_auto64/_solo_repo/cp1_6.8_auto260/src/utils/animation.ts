export type EasingFn = (t: number) => number;

export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutExpo: EasingFn = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

export const easeOutBack: EasingFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeOutElastic: EasingFn = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

export class Tween {
  private startTime: number;
  private duration: number;
  private from: number;
  private to: number;
  private easing: EasingFn;
  private onUpdate: (value: number) => void;
  private onComplete?: () => void;
  private _finished = false;

  constructor(opts: {
    from: number;
    to: number;
    duration: number;
    easing?: EasingFn;
    onUpdate: (value: number) => void;
    onComplete?: () => void;
  }) {
    this.from = opts.from;
    this.to = opts.to;
    this.duration = opts.duration;
    this.easing = opts.easing ?? easeInOutCubic;
    this.onUpdate = opts.onUpdate;
    this.onComplete = opts.onComplete;
    this.startTime = performance.now();
  }

  get finished() {
    return this._finished;
  }

  update(now: number) {
    if (this._finished) return;
    const elapsed = now - this.startTime;
    const raw = Math.min(elapsed / this.duration, 1);
    const t = this.easing(raw);
    const value = this.from + (this.to - this.from) * t;
    this.onUpdate(value);
    if (raw >= 1) {
      this._finished = true;
      this.onComplete?.();
    }
  }
}

export class TweenManager {
  private tweens: Tween[] = [];

  add(tween: Tween) {
    this.tweens.push(tween);
  }

  update(now: number) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      this.tweens[i].update(now);
      if (this.tweens[i].finished) {
        this.tweens.splice(i, 1);
      }
    }
  }

  clear() {
    this.tweens.length = 0;
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
