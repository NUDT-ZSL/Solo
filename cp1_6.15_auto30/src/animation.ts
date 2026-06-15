export type EasingFunction = (t: number) => number;

export const Easing = {
  Linear: (t: number): number => t,
  SmoothStep: (t: number): number => t * t * (3 - 2 * t),
  EaseInQuad: (t: number): number => t * t,
  EaseOutQuad: (t: number): number => 1 - (1 - t) * (1 - t),
  EaseInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
};

export interface TweenOptions {
  duration: number;
  easing?: EasingFunction;
  onUpdate?: (progress: number, easedProgress: number) => void;
  onComplete?: () => void;
}

interface ActiveTween {
  startTime: number;
  duration: number;
  easing: EasingFunction;
  onUpdate?: (progress: number, easedProgress: number) => void;
  onComplete?: () => void;
  completed: boolean;
}

class TweenManager {
  private tweens: Set<ActiveTween> = new Set();
  private rafId: number | null = null;
  private lastTime: number = 0;

  start(options: TweenOptions): () => void {
    const tween: ActiveTween = {
      startTime: performance.now(),
      duration: options.duration,
      easing: options.easing || Easing.Linear,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      completed: false
    };

    this.tweens.add(tween);
    this.ensureRunning();

    return () => {
      this.tweens.delete(tween);
    };
  }

  private ensureRunning(): void {
    if (this.rafId !== null) return;

    this.lastTime = performance.now();
    const tick = (now: number) => {
      this.lastTime = now;

      for (const tween of this.tweens) {
        if (tween.completed) continue;

        const elapsed = now - tween.startTime;
        const progress = Math.min(elapsed / tween.duration, 1);
        const eased = tween.easing(progress);

        if (tween.onUpdate) {
          try {
            tween.onUpdate(progress, eased);
          } catch (e) {
            console.error('Tween onUpdate error:', e);
          }
        }

        if (progress >= 1) {
          tween.completed = true;
          this.tweens.delete(tween);
          if (tween.onComplete) {
            try {
              tween.onComplete();
            } catch (e) {
              console.error('Tween onComplete error:', e);
            }
          }
        }
      }

      if (this.tweens.size > 0) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  clearAll(): void {
    this.tweens.clear();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export const tweenManager = new TweenManager();

export interface FPSMonitor {
  getFPS: () => number;
  getMinFPS: () => number;
  getMaxFPS: () => number;
  reset: () => void;
  beginFrame: () => void;
  endFrame: () => void;
  onLowFPS: (callback: (fps: number) => void) => void;
}

export function createFPSMonitor(threshold: number = 45): FPSMonitor {
  let frames = 0;
  let lastUpdate = performance.now();
  let currentFPS = 60;
  let minFPS = Infinity;
  let maxFPS = 0;
  let lowFPSCallback: ((fps: number) => void) | null = null;

  return {
    beginFrame: () => {
    },
    endFrame: () => {
      frames++;
      const now = performance.now();
      if (now - lastUpdate >= 1000) {
        currentFPS = (frames * 1000) / (now - lastUpdate);
        if (currentFPS < minFPS) minFPS = currentFPS;
        if (currentFPS > maxFPS) maxFPS = currentFPS;
        if (lowFPSCallback && currentFPS < threshold) {
          lowFPSCallback(currentFPS);
        }
        frames = 0;
        lastUpdate = now;
      }
    },
    getFPS: () => currentFPS,
    getMinFPS: () => minFPS === Infinity ? 0 : minFPS,
    getMaxFPS: () => maxFPS,
    reset: () => {
      frames = 0;
      lastUpdate = performance.now();
      currentFPS = 60;
      minFPS = Infinity;
      maxFPS = 0;
    },
    onLowFPS: (cb) => {
      lowFPSCallback = cb;
    }
  };
}
