import type { PerformanceMetrics } from '../types';

export class PerformanceMonitor {
  private frameCount = 0;
  private lastFpsUpdate = performance.now();
  private currentFps = 0;
  private frameTimeHistory: number[] = [];
  private particleTimeHistory: number[] = [];
  private heatmapTimeHistory: number[] = [];
  private uiTimeHistory: number[] = [];
  private readonly historySize = 10;
  private onUpdate: ((metrics: PerformanceMetrics) => void) | null = null;

  setOnUpdate(callback: (metrics: PerformanceMetrics) => void): void {
    this.onUpdate = callback;
  }

  private pushHistory(arr: number[], value: number): void {
    arr.push(value);
    if (arr.length > this.historySize) {
      arr.shift();
    }
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  recordFrameTime(
    totalFrameTime: number,
    particleTime: number,
    heatmapTime: number,
    uiTime: number
  ): void {
    this.frameCount++;
    this.pushHistory(this.frameTimeHistory, totalFrameTime);
    this.pushHistory(this.particleTimeHistory, particleTime);
    this.pushHistory(this.heatmapTimeHistory, heatmapTime);
    this.pushHistory(this.uiTimeHistory, uiTime);

    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      if (this.onUpdate) {
        this.onUpdate({
          fps: this.currentFps,
          frameTime: this.average(this.frameTimeHistory),
          particleUpdateTime: this.average(this.particleTimeHistory),
          heatmapUpdateTime: this.average(this.heatmapTimeHistory),
          uiUpdateTime: this.average(this.uiTimeHistory),
        });
      }
    }
  }

  getFps(): number {
    return this.currentFps;
  }

  shouldDegrade(): boolean {
    return this.currentFps > 0 && this.currentFps < 55;
  }
}
