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
  private masterGain: GainNode | null = null;
  private masterLevel: number = 1.0;
  private pendingFade: { from: number; to: number; startAt: number; endAt: number } | null = null;
  private lastFadeScheduleTime: number = 0;
  private destroyed: boolean = false;
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
  private patternFadeDurationSec: number = 0.22;
  private startFadeDurationSec: number = 0.08;
  private stopFadeDurationSec: number = 0.06;

  constructor() {
    this.recalcPatternDims();
  }

  private recalcPatternDims(): void {
    const beatSec = 60.0 / this.bpm;
    this.measureDurationSec = beatSec * 4;
    this.patternBeatCount = PATTERNS[this.pattern].length;
  }

  private ensureAudioCtx(): AudioContext {
    if (this.destroyed) {
      throw new Error('Metronome has been destroyed');
    }
    if (!this.audioCtx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        this.audioCtx = new Ctor();
      } catch (err) {
        console.error('[Metronome] Failed to create AudioContext:', err);
        throw err;
      }
      try {
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.0001;
        this.masterGain.connect(this.audioCtx.destination);
      } catch (err) {
        console.error('[Metronome] Failed to create master gain:', err);
        throw err;
      }
    }
    if (this.audioCtx.state === 'suspended') {
      try {
        void this.audioCtx.resume();
      } catch (err) {
        console.warn('[Metronome] AudioContext resume failed:', err);
      }
    }
    return this.audioCtx;
  }

  private scheduleFade(targetLevel: number, startAt: number, durationSec: number): void {
    const ctx = this.audioCtx;
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const t0 = Math.max(startAt, now + 0.001);
    const t1 = t0 + Math.max(0.005, durationSec);

    try {
      const g = this.masterGain.gain;
      g.cancelScheduledValues(t0);
      const fromLevel = Math.max(0.0001, g.value);
      g.setValueAtTime(fromLevel, t0);
      g.exponentialRampToValueAtTime(Math.max(0.0001, targetLevel), t1);
      this.masterLevel = Math.max(0.0001, targetLevel);
      this.pendingFade = { from: fromLevel, to: this.masterLevel, startAt: t0, endAt: t1 };
      this.lastFadeScheduleTime = now;
    } catch (err) {
      console.warn('[Metronome] scheduleFade failed:', err);
    }
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
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const fadeOutStart = now + 0.005;
      const fadeInStart = fadeOutStart + this.patternFadeDurationSec;

      this.scheduleFade(0.001, fadeOutStart, this.patternFadeDurationSec);
      this.scheduleFade(1.0, fadeInStart, this.patternFadeDurationSec);

      this.nextMeasureStartTime = Math.max(
        fadeInStart + 0.02,
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
    if (this.destroyed) return;
    const ctx = this.ensureAudioCtx();
    this.running = true;
    this.absoluteIndex = 0;
    this.nextMeasureStartBeatIndex = 0;
    this.startTime = ctx.currentTime + 0.08;
    this.nextMeasureStartTime = this.startTime;
    this.pendingFires = [];
    this.perfLatencies = [];

    this.scheduleFade(1.0, ctx.currentTime + 0.005, this.startFadeDurationSec);

    try {
      this.scheduleLoop();
    } catch (err) {
      console.error('[Metronome] scheduleLoop failed at start:', err);
    }
    this.checkFiresLoop();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.audioCtx && this.masterGain) {
      this.scheduleFade(0.0001, this.audioCtx.currentTime + 0.002, this.stopFadeDurationSec);
    }
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

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.running = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = 0;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch (e) { /* ignore */ }
      this.masterGain = null;
    }
    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== 'closed') {
          await this.audioCtx.close();
        }
      } catch (e) {
        console.warn('[Metronome] close AudioContext failed:', e);
      }
      this.audioCtx = null;
    }
    this.pendingFires = [];
    this.callbacks = null;
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
      if (!this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent ? 1000 : 800, time);

      const peak = accent ? 0.45 : 0.28;
      const safeStart = Math.max(time - 0.002, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, safeStart);
      gain.gain.exponentialRampToValueAtTime(peak, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

      osc.connect(gain).connect(this.masterGain);

      osc.start(safeStart);
      osc.stop(time + 0.06);
    } catch (e) {
      console.warn('[Metronome] synthClick failed:', e);
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
      try {
        this.callbacks.onPerformanceMetrics(m);
      } catch (e) {
        console.warn('[Metronome] onPerformanceMetrics callback error:', e);
      }
    }
    try {
      (window as unknown as { __rhythmMetrics?: PerformanceMetrics }).__rhythmMetrics = m;
    } catch (e) { /* ignore */ }
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug(
        '[Metronome:perf] beats=%d avg=%dms max=%dms >16ms count=%d',
        m.totalBeats,
        m.avgSchedulingLatency.toFixed(1),
        m.maxSchedulingLatency.toFixed(1),
        m.exceeds16msCount
      );
    }
  }
}
