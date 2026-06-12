export type AnimationCallback = (progress: number, timestamp: number) => void;

export interface AnimationPlayerOptions {
  duration: number;
  iterations?: number | 'infinite';
  onTick?: AnimationCallback;
  onComplete?: () => void;
}

export class AnimationPlayer {
  private rafId: number | null = null;
  private startTime: number = 0;
  private paused: boolean = false;
  private pauseTime: number = 0;
  private options: Required<Omit<AnimationPlayerOptions, 'onComplete'>> & {
    onComplete?: () => void;
  };
  private iteration: number = 0;

  constructor(options: AnimationPlayerOptions) {
    this.options = {
      duration: options.duration,
      iterations: options.iterations ?? 'infinite',
      onTick: options.onTick ?? (() => {}),
      onComplete: options.onComplete,
    };
  }

  start(): void {
    if (this.rafId !== null) return;
    this.startTime = performance.now();
    this.iteration = 0;
    this.paused = false;
    this.pauseTime = 0;
    this.loop();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pause(): void {
    if (this.paused || this.rafId === null) return;
    this.paused = true;
    this.pauseTime = performance.now();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (!this.paused) return;
    const pauseDuration = performance.now() - this.pauseTime;
    this.startTime += pauseDuration;
    this.paused = false;
    this.pauseTime = 0;
    this.loop();
  }

  restart(): void {
    this.stop();
    this.start();
  }

  private loop = (): void => {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const { duration, iterations, onTick, onComplete } = this.options;

    let iterationProgress = (elapsed % duration) / duration;
    const currentIteration = Math.floor(elapsed / duration);

    if (iterations !== 'infinite' && currentIteration >= iterations) {
      onTick(1, now);
      this.rafId = null;
      onComplete?.();
      return;
    }

    if (currentIteration !== this.iteration) {
      this.iteration = currentIteration;
    }

    onTick(iterationProgress, now);
    this.rafId = requestAnimationFrame(this.loop);
  };

  getProgress(): number {
    const elapsed = performance.now() - this.startTime;
    return (elapsed % this.options.duration) / this.options.duration;
  }

  isRunning(): boolean {
    return this.rafId !== null && !this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }
}

export function ease(progress: number, fn: string = 'ease'): number {
  switch (fn) {
    case 'linear':
      return progress;
    case 'ease-in':
      return progress * progress;
    case 'ease-out':
      return 1 - (1 - progress) * (1 - progress);
    case 'ease-in-out':
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    case 'ease':
    default:
      return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }
}
