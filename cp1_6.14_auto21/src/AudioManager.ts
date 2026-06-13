import { MaterialType } from './PhysicsEngine';

interface StepConfig {
  filterType: BiquadFilterType;
  frequency: number;
  gain: number;
  oscillatorFreq: number;
  oscillatorType: OscillatorType;
  duration: number;
}

const STEP_CONFIGS: Record<MaterialType, StepConfig> = {
  grass: {
    filterType: 'lowpass',
    frequency: 500,
    gain: 0.3,
    oscillatorFreq: 200,
    oscillatorType: 'sawtooth',
    duration: 0.08
  },
  sand: {
    filterType: 'lowpass',
    frequency: 300,
    gain: 0.4,
    oscillatorFreq: 120,
    oscillatorType: 'triangle',
    duration: 0.06
  },
  stone: {
    filterType: 'highpass',
    frequency: 2000,
    gain: 0.5,
    oscillatorFreq: 800,
    oscillatorType: 'square',
    duration: 0.04
  },
  metal: {
    filterType: 'lowpass',
    frequency: 6000,
    gain: 0.6,
    oscillatorFreq: 1200,
    oscillatorType: 'square',
    duration: 0.06
  },
  wood: {
    filterType: 'lowpass',
    frequency: 250,
    gain: 0.45,
    oscillatorFreq: 100,
    oscillatorType: 'triangle',
    duration: 0.07
  }
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private stepTimeout: number | null = null;
  private currentStepType: MaterialType | null = null;
  private isPlaying = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playStep(type: MaterialType, speed: number): void {
    const ctx = this.ensureContext();
    const cfg = STEP_CONFIGS[type];

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = cfg.oscillatorType;
    osc.frequency.value = cfg.oscillatorFreq;

    filter.type = cfg.filterType;
    filter.frequency.value = cfg.frequency;
    filter.Q.value = 1;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(cfg.gain * 0.25, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + cfg.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + cfg.duration + 0.01);

    if (type === 'metal') {
      this.createReverb(ctx, cfg.gain * 0.12);
    }

    if (type === 'wood') {
      this.createLowFreqBoost(ctx, cfg.gain * 0.1);
    }

    this.scheduleNextStep(type, speed);
  }

  private createReverb(ctx: AudioContext, volume: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 2400;
    gain.gain.setValueAtTime(volume, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + 0.005);
    osc.stop(ctx.currentTime + 0.18);
  }

  private createLowFreqBoost(ctx: AudioContext, volume: number): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 60;
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  private scheduleNextStep(type: MaterialType, speed: number): void {
    this.stopStepLoop();
    this.currentStepType = type;
    this.isPlaying = true;

    const interval = Math.max(100, 400 - speed * 0.7);
    this.stepTimeout = window.setTimeout(() => {
      if (this.isPlaying && this.currentStepType === type) {
        this.playStep(type, speed);
      }
    }, interval);
  }

  stopStepLoop(): void {
    if (this.stepTimeout !== null) {
      clearTimeout(this.stepTimeout);
      this.stepTimeout = null;
    }
    this.isPlaying = false;
    this.currentStepType = null;
  }

  playLand(type: MaterialType): void {
    const ctx = this.ensureContext();
    const volume = 0.7;

    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();

    impactOsc.type = 'sine';
    impactOsc.frequency.setValueAtTime(100, ctx.currentTime);
    impactOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);
    impactGain.gain.setValueAtTime(volume, ctx.currentTime);
    impactGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    impactOsc.connect(impactGain);
    impactGain.connect(ctx.destination);
    impactOsc.start(ctx.currentTime);
    impactOsc.stop(ctx.currentTime + 0.12);

    const cfg = STEP_CONFIGS[type];
    const matOsc = ctx.createOscillator();
    const matFilter = ctx.createBiquadFilter();
    const matGain = ctx.createGain();

    matOsc.type = cfg.oscillatorType;
    matOsc.frequency.value = cfg.oscillatorFreq * 0.5;
    matFilter.type = cfg.filterType;
    matFilter.frequency.value = cfg.frequency;
    matFilter.Q.value = 2;
    matGain.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
    matGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    matOsc.connect(matFilter);
    matFilter.connect(matGain);
    matGain.connect(ctx.destination);
    matOsc.start(ctx.currentTime);
    matOsc.stop(ctx.currentTime + 0.1);

    if (type === 'metal') {
      this.createReverb(ctx, volume * 0.25);
    }

    if (type === 'wood') {
      this.createLowFreqBoost(ctx, volume * 0.15);
    }
  }
}
