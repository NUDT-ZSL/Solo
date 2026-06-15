export class FPSMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;
  private callback: ((fps: number) => void) | null = null;
  private animationId: number | null = null;

  start(callback?: (fps: number) => void) {
    this.callback = callback || null;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.loop();
  }

  private loop() {
    this.frameCount++;
    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastTime = now;
      if (this.callback) {
        this.callback(this.fps);
      }
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  getFPS(): number {
    return this.fps;
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export const fpsMonitor = new FPSMonitor();
