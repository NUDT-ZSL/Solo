export type FrameCallback = (dt: number, timestamp: number) => void;

export class AnimationLoop {
  private callbacks: FrameCallback[] = [];
  private rafId: number | null = null;
  private lastTime: number = 0;
  private running: boolean = false;

  public addCallback(cb: FrameCallback): void {
    if (!this.callbacks.includes(cb)) {
      this.callbacks.push(cb);
    }
  }

  public removeCallback(cb: FrameCallback): void {
    const idx = this.callbacks.indexOf(cb);
    if (idx > -1) {
      this.callbacks.splice(idx, 1);
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;
    for (const cb of this.callbacks) {
      cb(dt, timestamp);
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  public isRunning(): boolean {
    return this.running;
  }
}
