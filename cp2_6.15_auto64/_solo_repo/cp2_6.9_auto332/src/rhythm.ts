export interface BeatEvent {
  beatNumber: number;
  time: number;
  isMeasureStart: boolean;
}

export type BeatCallback = (event: BeatEvent) => void;

export class RhythmEngine {
  private audioCtx: AudioContext | null = null;
  private bpm: number;
  private beatInterval: number;
  private nextBeatTime: number = 0;
  private beatNumber: number = 0;
  private currentSubBeat: number = 0;
  private isRunning: boolean = false;
  private callbacks: Set<BeatCallback> = new Set();
  private scheduleAheadTime: number = 0.1;
  private lookahead: number = 25;
  private timerId: number | null = null;

  constructor(bpm: number = 120) {
    this.bpm = bpm;
    this.beatInterval = 60 / bpm;
  }

  onBeat(callback: BeatCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  setBPM(bpm: number) {
    this.bpm = bpm;
    this.beatInterval = 60 / bpm;
  }

  getBPM(): number {
    return this.bpm;
  }

  getBeatProgress(): number {
    if (!this.audioCtx || !this.isRunning) return 0;
    const now = this.audioCtx.currentTime;
    const lastBeatTime = this.nextBeatTime - this.beatInterval;
    const progress = (now - lastBeatTime) / this.beatInterval;
    return Math.min(1, Math.max(0, progress));
  }

  getBeatInterval(): number {
    return this.beatInterval;
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return this.audioCtx;
  }

  async start() {
    const ctx = this.ensureAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (this.isRunning) return;
    this.isRunning = true;
    this.beatNumber = 0;
    this.currentSubBeat = 0;
    this.nextBeatTime = ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  reset() {
    this.stop();
    this.beatNumber = 0;
    this.currentSubBeat = 0;
  }

  private scheduler() {
    if (!this.isRunning || !this.audioCtx) return;
    while (this.nextBeatTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.nextBeatTime);
      this.advanceBeat();
    }
    this.timerId = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private advanceBeat() {
    this.nextBeatTime += this.beatInterval;
    this.beatNumber = (this.beatNumber % 4) + 1;
  }

  private scheduleBeat(time: number) {
    if (!this.audioCtx) return;
    this.playKick(time, this.beatNumber === 1);
    const event: BeatEvent = {
      beatNumber: this.beatNumber,
      time,
      isMeasureStart: this.beatNumber === 1
    };
    const delay = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
    window.setTimeout(() => {
      this.callbacks.forEach(cb => cb(event));
    }, delay);
  }

  private playKick(time: number, isDownBeat: boolean) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(isDownBeat ? 120 : 90, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  playVictorySound() {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}
