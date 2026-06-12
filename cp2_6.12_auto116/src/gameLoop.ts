export type GameLoopCallback = (deltaTime: number, nowTime: number) => void;

export class GameLoop {
  private rafId: number | null = null;
  private lastTime: number = 0;
  private running: boolean = false;
  private callbacks: Set<GameLoopCallback> = new Set();
  private frameInterval: number;

  constructor(targetFps: number = 60) {
    this.frameInterval = 1000 / targetFps;
  }

  addCallback(cb: GameLoopCallback): void {
    this.callbacks.add(cb);
  }

  removeCallback(cb: GameLoopCallback): void {
    this.callbacks.delete(cb);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    let delta = now - this.lastTime;
    if (delta < this.frameInterval - 1) {
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }
    if (delta > 100) delta = 100;
    this.lastTime = now;
    for (const cb of this.callbacks) {
      try {
        cb(delta, now);
      } catch (e) {
        console.error('GameLoop callback error:', e);
      }
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  dispose(): void {
    this.stop();
    this.callbacks.clear();
  }
}
