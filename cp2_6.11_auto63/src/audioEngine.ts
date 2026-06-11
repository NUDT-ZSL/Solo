import type { EmotionType } from './emotionParser';

interface OscillatorConfig {
  type: OscillatorType;
  frequency: number;
  baseGain: number;
}

const EMOTION_AUDIO: Record<EmotionType, OscillatorConfig> = {
  joy:     { type: 'sine',     frequency: 523.25, baseGain: 0.22 },
  sadness: { type: 'sawtooth', frequency: 110.00, baseGain: 0.16 },
  anger:   { type: 'square',   frequency: 220.00, baseGain: 0.18 },
  calm:    { type: 'sine',     frequency: 261.63, baseGain: 0.18 },
  anxiety: { type: 'triangle', frequency: 329.63, baseGain: 0.16 }
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;
  private suspended = false;
  private activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  constructor() {
    this.tryResumeOnInteraction = this.tryResumeOnInteraction.bind(this);
  }

  private init(): void {
    if (this.initialized) return;
    try {
      const CtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new CtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;

      document.addEventListener('click', this.tryResumeOnInteraction, { once: false });
      document.addEventListener('touchstart', this.tryResumeOnInteraction, { once: false, passive: true });
      document.addEventListener('keydown', this.tryResumeOnInteraction, { once: false });
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  }

  private tryResumeOnInteraction(): void {
    if (!this.ctx) { this.init(); }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.suspended = false;
      }).catch(() => {});
    }
  }

  ensureInit(): void {
    if (!this.initialized) this.init();
  }

  playTone(emotions: { emotion: EmotionType; weight: number }[]): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => this.doPlay(emotions)).catch(() => {});
    } else {
      this.doPlay(emotions);
    }
  }

  private doPlay(emotions: { emotion: EmotionType; weight: number }[]): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const attack = 0.18;
    const sustain = 0.64;
    const release = 0.18;
    const total = attack + sustain + release;

    const totalWeight = emotions.reduce((s, e) => s + e.weight, 0) || 1;

    for (const entry of emotions) {
      const cfg = EMOTION_AUDIO[entry.emotion];
      const weightFactor = entry.weight / totalWeight;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = cfg.type;
        osc.frequency.value = cfg.frequency;

        if (entry.emotion === 'anger') {
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.frequency.value = 18;
          lfoGain.gain.value = cfg.frequency * 0.12;
          lfo.connect(lfoGain).connect(osc.frequency);
          lfo.start(now);
          lfo.stop(now + total);
        }
        if (entry.emotion === 'anxiety') {
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.frequency.value = 6;
          lfoGain.gain.value = cfg.frequency * 0.08;
          lfo.connect(lfoGain).connect(osc.frequency);
          lfo.start(now);
          lfo.stop(now + total);
        }

        const peak = cfg.baseGain * (0.5 + weightFactor * 0.8);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(peak, now + attack);
        gain.gain.setValueAtTime(peak, now + attack + sustain);
        gain.gain.linearRampToValueAtTime(0, now + total);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + total + 0.05);

        this.activeNodes.push({ osc, gain });
        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch (_) {}
          this.activeNodes = this.activeNodes.filter(n => n.osc !== osc);
        };
      } catch (e) {
        console.warn('Osc create fail:', e);
      }
    }
  }

  stopAll(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const { osc, gain } of this.activeNodes) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.stop(now + 0.15);
      } catch (_) {}
    }
    this.activeNodes = [];
  }

  get isSupported(): boolean {
    return typeof window.AudioContext !== 'undefined' ||
           typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined';
  }
}

export const audioEngine = new AudioEngine();
