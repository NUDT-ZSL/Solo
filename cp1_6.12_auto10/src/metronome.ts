export type PatternType = 'standard' | 'swing' | 'syncopation' | 'dotted' | 'triplet';

export interface BeatEvent {
  time: number;
  index: number;
  isDownbeat: boolean;
}

type BeatCallback = (event: BeatEvent) => void;

interface PatternSubdivision {
  offset: number;
  accent: boolean;
}

const PATTERNS: Record<PatternType, PatternSubdivision[]> = {
  standard: [
    { offset: 0, accent: true },
    { offset: 0.5, accent: false },
    { offset: 1, accent: true },
    { offset: 1.5, accent: false },
    { offset: 2, accent: true },
    { offset: 2.5, accent: false },
    { offset: 3, accent: true },
    { offset: 3.5, accent: false },
  ],
  swing: [
    { offset: 0, accent: true },
    { offset: 0.667, accent: false },
    { offset: 1, accent: true },
    { offset: 1.667, accent: false },
    { offset: 2, accent: true },
    { offset: 2.667, accent: false },
    { offset: 3, accent: true },
    { offset: 3.667, accent: false },
  ],
  syncopation: [
    { offset: 0, accent: true },
    { offset: 0.75, accent: false },
    { offset: 1.5, accent: true },
    { offset: 2, accent: false },
    { offset: 2.75, accent: true },
    { offset: 3.25, accent: false },
    { offset: 3.75, accent: true },
  ],
  dotted: [
    { offset: 0, accent: true },
    { offset: 0.75, accent: false },
    { offset: 1.5, accent: true },
    { offset: 2.25, accent: false },
    { offset: 3, accent: true },
    { offset: 3.75, accent: false },
  ],
  triplet: [
    { offset: 0, accent: true },
    { offset: 0.333, accent: false },
    { offset: 0.667, accent: false },
    { offset: 1, accent: true },
    { offset: 1.333, accent: false },
    { offset: 1.667, accent: false },
    { offset: 2, accent: true },
    { offset: 2.333, accent: false },
    { offset: 2.667, accent: false },
    { offset: 3, accent: true },
    { offset: 3.333, accent: false },
    { offset: 3.667, accent: false },
  ],
};

export class Metronome {
  private audioCtx: AudioContext | null = null;
  private bpm: number = 120;
  private pattern: PatternType = 'standard';
  private running: boolean = false;
  private scheduledUntil: number = 0;
  private nextBeatIndex: number = 0;
  private schedulerTimer: number = 0;
  private startTime: number = 0;
  private duration: number = 30;
  private onBeat: BeatCallback | null = null;
  private onFinish: (() => void) | null = null;
  private lookAhead: number = 0.1;
  private scheduleInterval: number = 25;

  constructor() {}

  private ensureAudioCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(60, Math.min(180, bpm));
  }

  setPattern(pattern: PatternType): void {
    this.pattern = pattern;
  }

  setDuration(seconds: number): void {
    this.duration = seconds;
  }

  onBeatCallback(cb: BeatCallback): void {
    this.onBeat = cb;
  }

  onFinishCallback(cb: () => void): void {
    this.onFinish = cb;
  }

  start(): void {
    if (this.running) return;
    const ctx = this.ensureAudioCtx();
    this.running = true;
    this.nextBeatIndex = 0;
    this.startTime = ctx.currentTime + 0.05;
    this.scheduledUntil = this.startTime;
    this.scheduler();
  }

  stop(): void {
    this.running = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = 0;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private scheduler(): void {
    if (!this.running) return;
    const ctx = this.audioCtx!;
    while (this.scheduledUntil < ctx.currentTime + this.lookAhead) {
      this.scheduleBeat(this.nextBeatIndex);
      this.nextBeatIndex++;
    }
    this.schedulerTimer = window.setTimeout(() => this.scheduler(), this.scheduleInterval);
  }

  private scheduleBeat(index: number): void {
    const ctx = this.audioCtx!;
    const pattern = PATTERNS[this.pattern];
    const beatDuration = 60.0 / this.bpm;
    const measureDuration = beatDuration * 4;

    const measureIndex = Math.floor(index / pattern.length);
    const subIndex = index % pattern.length;
    const sub = pattern[subIndex];

    const beatTime = this.startTime + measureIndex * measureDuration + sub.offset * beatDuration;

    if (beatTime - this.startTime > this.duration) {
      this.running = false;
      if (this.schedulerTimer) {
        clearTimeout(this.schedulerTimer);
        this.schedulerTimer = 0;
      }
      if (this.onFinish) this.onFinish();
      return;
    }

    const isDownbeat = sub.accent;
    this.playClick(ctx, beatTime, isDownbeat);

    this.scheduledUntil = beatTime;

    if (this.onBeat) {
      this.onBeat({
        time: beatTime * 1000,
        index: index,
        isDownbeat: isDownbeat,
      });
    }
  }

  private playClick(ctx: AudioContext, time: number, accent: boolean): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = accent ? 1000 : 800;

    gain.gain.setValueAtTime(accent ? 0.5 : 0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  getAudioContextTime(): number {
    if (!this.audioCtx) return 0;
    return this.audioCtx.currentTime * 1000;
  }
}
