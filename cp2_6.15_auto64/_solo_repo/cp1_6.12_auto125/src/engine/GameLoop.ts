export class GameLoop {
  private rafId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private updateCallback: (dt: number) => void;
  private renderCallback: () => void;
  private accumulator: number = 0;
  private readonly fixedDt: number = 1000 / 60;

  constructor(
    updateCallback: (dt: number) => void,
    renderCallback: () => void
  ) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private loop = (currentTime: number): void => {
    if (!this.running) return;

    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (deltaTime > 100) {
      deltaTime = 100;
    }

    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedDt) {
      this.updateCallback(this.fixedDt / 1000);
      this.accumulator -= this.fixedDt;
    }

    this.renderCallback();
    this.rafId = requestAnimationFrame(this.loop);
  };

  public isRunning(): boolean {
    return this.running;
  }
}
