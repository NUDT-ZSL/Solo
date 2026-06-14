import { eventBus } from './event-bus';

export interface BeatEvent {
  beatIndex: number;
  timestamp: number;
  bpm: number;
  isDrop: boolean;
}

export interface RhythmChart {
  beats: number[];
  drops: number[];
  duration: number;
  bpm: number;
}

export type TowerType = 'machinegun' | 'laser' | 'sonic' | 'heal';

const TOWER_FREQUENCIES: Record<TowerType, number> = {
  machinegun: 440,
  laser: 880,
  sonic: 220,
  heal: 660,
};

export class AudioEngine {
  private bpm: number = 120;
  private chart: RhythmChart | null = null;
  private audioContext: AudioContext | null = null;
  private currentBeat: number = 0;
  private startTime: number = 0;
  private rafId: number | null = null;
  private intervalId: number | null = null;
  private isRunning: boolean = false;
  private lastBeatTime: number = 0;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not available');
    }
  }

  generateRhythmChart(bpm: number = 120, totalBeats: number = 60): RhythmChart {
    const beatInterval = 60000 / bpm;
    const beats: number[] = [];
    const drops: number[] = [];

    for (let i = 0; i < totalBeats; i++) {
      beats.push(i * beatInterval);
      if (i % 4 === 0) {
        drops.push(i * beatInterval);
      }
    }

    this.chart = {
      beats,
      drops,
      duration: totalBeats * beatInterval,
      bpm,
    };

    return this.chart;
  }

  loadChart(chart: RhythmChart): void {
    this.chart = chart;
    this.bpm = chart.bpm;
    this.currentBeat = 0;
  }

  setBPM(bpm: number): void {
    const clamped = Math.max(60, Math.min(180, bpm));
    if (clamped === this.bpm) return;
    this.bpm = clamped;
    this.generateRhythmChart(this.bpm, 60);
  }

  getBPM(): number {
    return this.bpm;
  }

  playTowerSound(type: TowerType): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = TOWER_FREQUENCIES[type];

    osc.type = type === 'laser' ? 'sawtooth' : type === 'sonic' ? 'sine' : 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playBeatSound(isDrop: boolean): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isDrop ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isDrop ? 120 : 80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(isDrop ? 0.2 : 0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  start(): void {
    if (this.isRunning) return;
    if (!this.chart) {
      this.generateRhythmChart(this.bpm, 60);
    }

    this.isRunning = true;
    this.currentBeat = 0;
    this.startTime = performance.now();
    this.lastBeatTime = this.startTime;

    this.tickLoop();
  }

  private tickLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const beatInterval = 60000 / this.bpm;
    const elapsed = now - this.startTime;

    const expectedBeats = Math.floor(elapsed / beatInterval);

    while (this.currentBeat <= expectedBeats) {
      const isDrop = this.chart?.drops.includes(this.currentBeat * beatInterval) ?? this.currentBeat % 4 === 0;

      const beatEvent: BeatEvent = {
        beatIndex: this.currentBeat,
        timestamp: now,
        bpm: this.bpm,
        isDrop,
      };

      eventBus.emit('beat_tick', beatEvent);
      if (isDrop) {
        eventBus.emit('beat_drop', beatEvent);
      }
      this.playBeatSound(isDrop);

      this.currentBeat++;
    }

    this.rafId = requestAnimationFrame(this.tickLoop);
  };

  stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset(): void {
    this.stop();
    this.currentBeat = 0;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
