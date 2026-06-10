export type UpdateCallback = (dt: number, elapsed: number) => void;

export class AnimationLoop {
  private rafId: number | null = null;
  private lastTime: number = 0;
  private elapsed: number = 0;
  private running: boolean = false;
  private fpsAccumulator: number = 0;
  private fpsFrames: number = 0;
  private fpsValue: number = 0;
  private fpsUpdateInterval: number = 0.5;

  public onUpdate: UpdateCallback | null = null;
  public onFpsUpdate: ((fps: number) => void) | null = null;

  public get fps(): number {
    return this.fpsValue;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.1);
    this.lastTime = now;
    this.elapsed += dt;

    this.fpsAccumulator += dt;
    this.fpsFrames++;
    if (this.fpsAccumulator >= this.fpsUpdateInterval) {
      this.fpsValue = this.fpsFrames / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.fpsValue);
      }
    }

    if (this.onUpdate) {
      this.onUpdate(dt, this.elapsed);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  public dispose(): void {
    this.stop();
    this.onUpdate = null;
    this.onFpsUpdate = null;
  }
}
