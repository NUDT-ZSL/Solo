export type PatternType = 'standard' | 'swing' | 'syncopation' | 'dotted' | 'triplet';

export interface BeatEvent {
  scheduledTime: number;
  index: number;
  isDownbeat: boolean;
  pattern: PatternType;
  firedAt: number;
  schedulingLatency: number;
}

export interface PerformanceMetrics {
  maxSchedulingLatency: number;
  avgSchedulingLatency: number;
  totalBeats: number;
  exceeds16msCount: number;
}

export interface MetronomeCallbacks {
  onBeat: (event: BeatEvent) => void;
  onFinish: () => void;
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
}

interface PatternSubdivision {
  offset: number;
  accent: boolean;
}

export const PATTERNS: Record<PatternType, PatternSubdivision[]> = {
  standard: [
    { offset: 0.0, accent: true },
    { offset: 0.5, accent: false },
    { offset: 1.0, accent: true },
    { offset: 1.5, accent: false },
    { offset: 2.0, accent: true },
    { offset: 2.5, accent: false },
    { offset: 3.0, accent: true },
    { offset: 3.5, accent: false },
  ],
  swing: [
    { offset: 0.0, accent: true },
    { offset: 0.67, accent: false },
    { offset: 1.0, accent: true },
    { offset: 1.67, accent: false },
    { offset: 2.0, accent: true },
    { offset: 2.67, accent: false },
    { offset: 3.0, accent: true },
    { offset: 3.67, accent: false },
  ],
  syncopation: [
    { offset: 0.0, accent: true },
    { offset: 0.5, accent: false },
    { offset: 1.25, accent: true },
    { offset: 2.0, accent: false },
    { offset: 2.5, accent: true },
    { offset: 3.25, accent: true },
    { offset: 3.75, accent: false },
  ],
  dotted: [
    { offset: 0.0, accent: true },
    { offset: 0.75, accent: false },
    { offset: 1.5, accent: true },
    { offset: 2.25, accent: false },
    { offset: 3.0, accent: true },
    { offset: 3.75, accent: false },
  ],
  triplet: [
    { offset: 0.00, accent: true },
    { offset: 0.33, accent: false },
    { offset: 0.67, accent: false },
    { offset: 1.00, accent: true },
    { offset: 1.33, accent: false },
    { offset: 1.67, accent: false },
    { offset: 2.00, accent: true },
    { offset: 2.33, accent: false },
    { offset: 2.67, accent: false },
    { offset: 3.00, accent: true },
    { offset: 3.33, accent: false },
    { offset: 3.67, accent: false },
  ],
};

export class Metronome {
  private audioCtx: AudioContext | null = null;
  private bpm: number = 120;
  private pattern: PatternType = 'standard';
  private running: boolean = false;
  private schedulerTimer: number = 0;
  private startTime: number = 0;
  private durationSec: number = 30;
  private callbacks: MetronomeCallbacks | null = null;

  private absoluteIndex: number = 0;
  private nextMeasureStartBeatIndex: number = 0;
  private nextMeasureStartTime: number = 0;
  private measureDurationSec: number = 0;
  private patternBeatCount: number = 0;

  private pendingFires: Array<{ scheduledSec: number; event: BeatEvent; fired: boolean }> = [];
  private animationFrameId: number = 0;

  private lookAheadSec: number = 0.12;
  private scheduleIntervalMs: number = 20;

  private perfLatencies: number[] = [];

  constructor() {
    this.recalcPatternDims();
  }

  private recalcPatternDims(): void {
    const beatSec = 60.0 / this.bpm;
    this.measureDurationSec = beatSec * 4;
    this.patternBeatCount = PATTERNS[this.pattern].length;
  }

  private ensureAudioCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  setCallbacks(cbs: MetronomeCallbacks): void {
    this.callbacks = cbs;
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(60, Math.min(180, Math.round(bpm)));
    this.recalcPatternDims();
  }

  getBPM(): number {
    return this.bpm;
  }

  setPattern(pattern: PatternType): void {
    if (this.pattern === pattern) return;
    this.pattern = pattern;
    this.recalcPatternDims();
    if (this.running && this.audioCtx) {
      this.nextMeasureStartTime = Math.max(
        this.audioCtx.currentTime + 0.02,
        this.nextMeasureStartTime
      );
    }
  }

  getPattern(): PatternType {
    return this.pattern;
  }

  setDuration(seconds: number): void {
    this.durationSec = seconds;
  }

  getDuration(): number {
    return this.durationSec;
  }

  start(): void {
    if (this.running) return;
    const ctx = this.ensureAudioCtx();
    this.running = true;
    this.absoluteIndex = 0;
    this.nextMeasureStartBeatIndex = 0;
    this.startTime = ctx.currentTime + 0.08;
    this.nextMeasureStartTime = this.startTime;
    this.pendingFires = [];
    this.perfLatencies = [];

    this.scheduleLoop();
    this.checkFiresLoop();
  }

  stop(): void {
    this.running = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = 0;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    this.reportPerformance();
  }

  isRunning(): boolean {
    return this.running;
  }

  getElapsedSec(): number {
    if (!this.audioCtx || !this.running) return 0;
    return Math.max(0, this.audioCtx.currentTime - this.startTime);
  }

  getAudioContextNowMs(): number {
    if (!this.audioCtx) return performance.now();
    return this.audioCtx.currentTime * 1000;
  }

  private scheduleLoop(): void {
    if (!this.running || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const horizon = ctx.currentTime + this.lookAheadSec;

    while (this.nextMeasureStartTime < horizon) {
      const measureSec = this.measureDurationSec;
      const subs = PATTERNS[this.pattern];
      const beatSec = 60.0 / this.bpm;

      for (let s = 0; s < subs.length; s++) {
        const beatTimeSec =
          this.nextMeasureStartTime + subs[s].offset * beatSec;

        if (beatTimeSec - this.startTime > this.durationSec) continue;

        const idx = this.nextMeasureStartBeatIndex + s;
        const event: BeatEvent = {
          scheduledTime: beatTimeSec * 1000,
          index: idx,
          isDownbeat: subs[s].accent,
          pattern: this.pattern,
          firedAt: 0,
          schedulingLatency: 0,
        };

        this.pendingFires.push({
          scheduledSec: beatTimeSec,
          event,
          fired: false,
        });

        this.synthClick(ctx, beatTimeSec, subs[s].accent);
      }

      this.nextMeasureStartBeatIndex += subs.length;
      this.nextMeasureStartTime += measureSec;
      this.absoluteIndex = this.nextMeasureStartBeatIndex;

      if (this.nextMeasureStartTime - this.startTime > this.durationSec + 2) {
        break;
      }
    }

    this.schedulerTimer = window.setTimeout(
      () => this.scheduleLoop(),
      this.scheduleIntervalMs
    );
  }

  private checkFiresLoop = (): void => {
    if (!this.running || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const nowSec = ctx.currentTime;
    const nowPerf = performance.now();

    for (const pf of this.pendingFires) {
      if (!pf.fired && nowSec >= pf.scheduledSec - 0.001) {
        pf.fired = true;
        const actualPerfMs = nowPerf;
        const scheduledPerfMs =
          pf.scheduledSec * 1000 - (ctx.currentTime * 1000 - nowPerf);
        const latencyMs = actualPerfMs - pf.scheduledSec * 1000;
        pf.event.firedAt = actualPerfMs;
        pf.event.schedulingLatency = Math.abs(latencyMs);
        this.perfLatencies.push(pf.event.schedulingLatency);
        if (this.callbacks?.onBeat) {
          try {
            this.callbacks.onBeat(pf.event);
          } catch (e) {
            console.error('onBeat callback error:', e);
          }
        }
      }
    }

    const cutoff = nowSec - 1.0;
    this.pendingFires = this.pendingFires.filter(
      (pf) => pf.scheduledSec > cutoff
    );

    if (this.callbacks?.onPerformanceMetrics && this.perfLatencies.length > 0) {
      this.callbacks.onPerformanceMetrics(this.getMetricsSnapshot());
    }

    if (
      nowSec - this.startTime >= this.durationSec &&
      this.pendingFires.every((pf) => pf.fired)
    ) {
      this.running = false;
      this.reportPerformance();
      if (this.schedulerTimer) {
        clearTimeout(this.schedulerTimer);
        this.schedulerTimer = 0;
      }
      if (this.callbacks?.onFinish) {
        setTimeout(() => this.callbacks!.onFinish!(), 50);
      }
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.checkFiresLoop);
  };

  private synthClick(ctx: AudioContext, time: number, accent: boolean): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent ? 1000 : 800, time);

      const peak = accent ? 0.45 : 0.28;
      gain.gain.setValueAtTime(0.0001, time - 0.002);
      gain.gain.exponentialRampToValueAtTime(peak, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

      osc.connect(gain).connect(ctx.destination);

      osc.start(time - 0.002);
      osc.stop(time + 0.06);
    } catch (e) {
      /* ignore */
    }
  }

  private getMetricsSnapshot(): PerformanceMetrics {
    const lats = this.perfLatencies;
    const total = lats.length;
    if (total === 0) {
      return {
        maxSchedulingLatency: 0,
        avgSchedulingLatency: 0,
        totalBeats: 0,
        exceeds16msCount: 0,
      };
    }
    let max = 0;
    let sum = 0;
    let exceeds = 0;
    for (const l of lats) {
      if (l > max) max = l;
      sum += l;
      if (l > 16) exceeds++;
    }
    return {
      maxSchedulingLatency: max,
      avgSchedulingLatency: sum / total,
      totalBeats: total,
      exceeds16msCount: exceeds,
    };
  }

  private reportPerformance(): void {
    const m = this.getMetricsSnapshot();
    if (this.callbacks?.onPerformanceMetrics && m.totalBeats > 0) {
      this.callbacks.onPerformanceMetrics(m);
    }
    if (typeof (window as unknown as { __rhythmDebug?: unknown }).__rhythmDebug !== 'undefined') {
      (window as unknown as { __rhythmMetrics?: PerformanceMetrics }).__rhythmMetrics = m;
    }
  }
}
