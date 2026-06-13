import { MaterialType } from './PhysicsEngine';

interface StepConfig {
  filterType: 'lowpass' | 'highpass';
  frequency: number;
  gain: number;
  oscillatorFreq: number;
  oscillatorType: OscillatorType;
}

const STEP_CONFIGS: Record<MaterialType, StepConfig> = {
  grass: { filterType: 'lowpass', frequency: 500, gain: 0.3, oscillatorFreq: 200, oscillatorType: 'sawtooth' },
  sand: { filterType: 'lowpass', frequency: 300, gain: 0.4, oscillatorFreq: 120, oscillatorType: 'triangle' },
  stone: { filterType: 'highpass', frequency: 2000, gain: 0.5, oscillatorFreq: 800, oscillatorType: 'square' },
  metal: { filterType: 'lowpass', frequency: 8000, gain: 0.6, oscillatorFreq: 1200, oscillatorType: 'square' },
  wood: { filterType: 'lowpass', frequency: 400, gain: 0.45, oscillatorFreq: 150, oscillatorType: 'triangle' }
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private stepInterval: number | null = null;
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

    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(cfg.gain * 0.3, ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);

    if (type === 'metal' && this.ctx) {
      this.playReverb(ctx, cfg.gain * 0.15);
    }

    this.scheduleNextStep(type, speed);
  }

  private playReverb(ctx: AudioContext, volume: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 2400;
    gain.gain.value = 0;
    gain.gain.setValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + 0.01);
    osc.stop(ctx.currentTime + 0.2);
  }

  private scheduleNextStep(type: MaterialType, speed: number): void {
    this.stopStepLoop();
    this.currentStepType = type;
    this.isPlaying = true;

    const interval = Math.max(100, 400 - speed * 0.7);
    this.stepInterval = window.setTimeout(() => {
      if (this.isPlaying && this.currentStepType === type) {
        this.playStep(type, speed);
      }
    }, interval);
  }

  stopStepLoop(): void {
    if (this.stepInterval !== null) {
      clearTimeout(this.stepInterval);
      this.stepInterval = null;
    }
    this.isPlaying = false;
    this.currentStepType = null;
  }

  playLand(type: MaterialType): void {
    const ctx = this.ensureContext();
    const volume = 0.7;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 80;
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

    gain.gain.value = 0;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    const cfg = STEP_CONFIGS[type];
    const matOsc = ctx.createOscillator();
    const matFilter = ctx.createBiquadFilter();
    const matGain = ctx.createGain();

    matOsc.type = cfg.oscillatorType;
    matOsc.frequency.value = cfg.oscillatorFreq * 0.5;

    matFilter.type = cfg.filterType;
    matFilter.frequency.value = cfg.frequency;
    matFilter.Q.value = 2;

    matGain.gain.value = 0;
    matGain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
    matGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    matOsc.connect(matFilter);
    matFilter.connect(matGain);
    matGain.connect(ctx.destination);
    matOsc.start(ctx.currentTime);
    matOsc.stop(ctx.currentTime + 0.12);

    if (type === 'metal') {
      this.playReverb(ctx, volume * 0.3);
    }
  }
}
