export interface PerfMetrics {
  fps: number;
  layoutDuration: number;
  reflowCount: number;
  timestamp: number;
}

export interface PerfSnapshot {
  fps: number;
  avgLayoutDuration: number;
  totalReflowCount: number;
  metrics: PerfMetrics[];
}

type Callback = (metrics: PerfMetrics) => void;
type FpsCallback = (fps: number) => void;

export class PerfMonitor {
  private isRunning = false;
  private callback: Callback | null = null;
  private fpsCallback: FpsCallback | null = null;
  private fpsFrames = 0;
  private fpsLastTime = performance.now();
  private currentFps = 0;
  private totalReflowCount = 0;
  private layoutDurations: number[] = [];
  private metricsHistory: PerfMetrics[] = [];
  private maxHistorySize = 720;
  private rafId: number | null = null;
  private observer: PerformanceObserver | null = null;
  private sampleInterval: number | null = null;
  private fpsSampleInterval: number | null = null;
  private lastSampleTime = 0;
  private sampleRateMs = 500;
  private fpsQueue: number[] = new Array(60).fill(0);
  private fpsQueueSize = 60;
  private fpsWriteIndex = 0;
  private fpsQueueCount = 0;
  private fpsSampleLastTime = performance.now();
  private fpsSampleFrames = 0;

  start(callback: Callback, fpsCallback?: FpsCallback): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.callback = callback;
    this.fpsCallback = fpsCallback || null;
    this.totalReflowCount = 0;
    this.layoutDurations = [];
    this.metricsHistory = [];
    this.fpsQueue = new Array(60).fill(0);
    this.fpsWriteIndex = 0;
    this.fpsQueueCount = 0;
    this.fpsFrames = 0;
    this.fpsLastTime = performance.now();
    this.fpsSampleLastTime = performance.now();
    this.fpsSampleFrames = 0;
    this.lastSampleTime = performance.now();

    this.startFpsCounter();
    this.startLayoutObserver();
    this.startSampling();
    this.startFpsSampling();
  }

  stop(): void {
    this.isRunning = false;
    this.callback = null;
    this.fpsCallback = null;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.sampleInterval !== null) {
      window.clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }

    if (this.fpsSampleInterval !== null) {
      window.clearInterval(this.fpsSampleInterval);
      this.fpsSampleInterval = null;
    }
  }

  recordSelectEvent(): void {
    this.totalReflowCount++;
  }

  getSnapshot(): PerfSnapshot {
    const recentMetrics = this.getRecentMetrics(5000);
    const avgLayoutDuration = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.layoutDuration, 0) / recentMetrics.length
      : 0;

    return {
      fps: this.currentFps,
      avgLayoutDuration,
      totalReflowCount: this.totalReflowCount,
      metrics: [...this.metricsHistory],
    };
  }

  getMetricsHistory(): PerfMetrics[] {
    return [...this.metricsHistory];
  }

  getFpsQueue(): number[] {
    if (this.fpsQueueCount === 0) return [];
    if (this.fpsQueueCount < this.fpsQueueSize) {
      return this.fpsQueue.slice(0, this.fpsQueueCount);
    }
    const result: number[] = [];
    for (let i = 0; i < this.fpsQueueSize; i++) {
      const idx = (this.fpsWriteIndex + i) % this.fpsQueueSize;
      result.push(this.fpsQueue[idx]);
    }
    return result;
  }

  getCurrentFps(): number {
    return this.currentFps;
  }

  getReflowCount(): number {
    return this.totalReflowCount;
  }

  getAvgLayoutDuration(windowMs: number = 5000): number {
    const recent = this.getRecentMetrics(windowMs);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, m) => sum + m.layoutDuration, 0) / recent.length;
  }

  private startFpsCounter(): void {
    const loop = () => {
      if (!this.isRunning) return;
      this.fpsFrames++;
      this.fpsSampleFrames++;
      const now = performance.now();
      const delta = now - this.fpsLastTime;

      if (delta >= 1000) {
        this.currentFps = Math.round((this.fpsFrames * 1000) / delta);
        this.fpsFrames = 0;
        this.fpsLastTime = now;
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private startFpsSampling(): void {
    this.fpsSampleInterval = window.setInterval(() => {
      if (!this.isRunning) return;

      const now = performance.now();
      const delta = now - this.fpsSampleLastTime;
      let fps: number;

      if (delta > 0) {
        fps = Math.round((this.fpsSampleFrames * 1000) / delta);
      } else {
        fps = this.currentFps;
      }

      this.fpsQueue[this.fpsWriteIndex] = fps;
      this.fpsWriteIndex = (this.fpsWriteIndex + 1) % this.fpsQueueSize;
      if (this.fpsQueueCount < this.fpsQueueSize) {
        this.fpsQueueCount++;
      }

      this.fpsSampleFrames = 0;
      this.fpsSampleLastTime = now;

      if (this.fpsCallback) {
        this.fpsCallback(fps);
      }
    }, 1000);
  }

  private startLayoutObserver(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            this.totalReflowCount++;
          }
          if (entry.entryType === 'longtask') {
            this.totalReflowCount++;
          }
          if ('duration' in entry && entry.duration > 0) {
            this.layoutDurations.push(entry.duration);
          }
        }
      });

      const entryTypes: string[] = ['layout-shift', 'measure', 'mark'];
      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        entryTypes.push('longtask');
      }

      this.observer.observe({ entryTypes });
    } catch (e) {
      console.warn('PerformanceObserver not supported for layout monitoring');
    }
  }

  private startSampling(): void {
    this.sampleInterval = window.setInterval(() => {
      if (!this.isRunning) return;

      const now = performance.now();
      const avgLayout = this.layoutDurations.length > 0
        ? this.layoutDurations.reduce((a, b) => a + b, 0) / this.layoutDurations.length
        : this.estimateLayoutDuration();

      const metrics: PerfMetrics = {
        fps: this.currentFps,
        layoutDuration: avgLayout,
        reflowCount: this.totalReflowCount,
        timestamp: now,
      };

      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      this.layoutDurations = [];

      if (this.callback) {
        this.callback(metrics);
      }
    }, this.sampleRateMs);
  }

  private estimateLayoutDuration(): number {
    const now = performance.now();
    const start = now - 50;
    const recent = this.metricsHistory.filter(m => m.timestamp > start);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, m) => sum + m.layoutDuration, 0) / recent.length;
  }

  private getRecentMetrics(windowMs: number): PerfMetrics[] {
    const now = performance.now();
    const cutoff = now - windowMs;
    return this.metricsHistory.filter(m => m.timestamp >= cutoff);
  }
}

export const perfMonitor = new PerfMonitor();
