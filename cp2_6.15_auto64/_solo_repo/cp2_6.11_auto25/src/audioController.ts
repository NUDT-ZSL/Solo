import type { ToneStyle, AudioData } from './types';

type AudioNodes = {
  ctx: AudioContext;
  masterGain: GainNode;
  analyser: AnalyserNode;
  beatGain: GainNode;
  bassGain: GainNode;
  padGain: GainNode;
  bassOsc: OscillatorNode | null;
  padOscs: OscillatorNode[];
  beatTimer: number | null;
  startTime: number;
};

type ToneConfig = {
  beatFreq: number;
  bassFreq: number;
  padFreqs: number[];
  masterVolume: number;
  beatVolume: number;
  bassVolume: number;
  padVolume: number;
  padWave: OscillatorType;
  beatWave: OscillatorType;
  bassWave: OscillatorType;
  reverbAmount: number;
};

const TONE_CONFIGS: Record<ToneStyle, ToneConfig> = {
  soft: {
    beatFreq: 1200,
    bassFreq: 55,
    padFreqs: [220, 329.63, 440, 523.25],
    masterVolume: 0.18,
    beatVolume: 0.2,
    bassVolume: 0.25,
    padVolume: 0.35,
    padWave: 'sine',
    beatWave: 'sine',
    bassWave: 'sine',
    reverbAmount: 0.6
  },
  bright: {
    beatFreq: 2000,
    bassFreq: 65.41,
    padFreqs: [261.63, 392, 523.25, 659.25],
    masterVolume: 0.22,
    beatVolume: 0.3,
    bassVolume: 0.22,
    padVolume: 0.4,
    padWave: 'triangle',
    beatWave: 'triangle',
    bassWave: 'square',
    reverbAmount: 0.4
  },
  dark: {
    beatFreq: 800,
    bassFreq: 41.2,
    padFreqs: [130.81, 196, 246.94, 311.13],
    masterVolume: 0.24,
    beatVolume: 0.35,
    bassVolume: 0.4,
    padVolume: 0.3,
    padWave: 'sawtooth',
    beatWave: 'square',
    bassWave: 'sawtooth',
    reverbAmount: 0.7
  }
};

const BPM_MIN = 60;
const BPM_MAX = 120;

export class AudioController {
  private nodes: AudioNodes | null = null;
  private bpm: number = 90;
  private toneStyle: ToneStyle = 'soft';
  private _isPlaying: boolean = false;
  private spectrumData: Float32Array;
  private beatPhase: number = 0;
  private beatIntervalMs: number = 666;
  private lastBeatTime: number = 0;
  private bassLfo: OscillatorNode | null = null;
  private bassLfoGain: GainNode | null = null;

  constructor() {
    this.spectrumData = new Float32Array(256);
    this.setRandomBpm();
  }

  setRandomBpm(): void {
    this.bpm = Math.floor(BPM_MIN + Math.random() * (BPM_MAX - BPM_MIN + 1));
    this.beatIntervalMs = 60000 / this.bpm;
  }

  getBpm(): number {
    return this.bpm;
  }

  setBpm(bpm: number): void {
    const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
    this.bpm = clamped;
    this.beatIntervalMs = 60000 / this.bpm;
    if (this._isPlaying && this.nodes?.beatTimer !== undefined) {
      this.restartBeatScheduler();
    }
  }

  setToneStyle(style: ToneStyle): void {
    this.toneStyle = style;
    if (this._isPlaying) {
      this.applyToneConfig();
    }
  }

  getToneStyle(): ToneStyle {
    return this.toneStyle;
  }

  private async ensureContext(): Promise<AudioContext> {
    if (!this.nodes) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;

      const masterGain = ctx.createGain();
      masterGain.gain.value = TONE_CONFIGS[this.toneStyle].masterVolume;

      const beatGain = ctx.createGain();
      beatGain.gain.value = 0;

      const bassGain = ctx.createGain();
      bassGain.gain.value = 0;

      const padGain = ctx.createGain();
      padGain.gain.value = 0;

      beatGain.connect(masterGain);
      bassGain.connect(masterGain);
      padGain.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      this.nodes = {
        ctx,
        masterGain,
        analyser,
        beatGain,
        bassGain,
        padGain,
        bassOsc: null,
        padOscs: [],
        beatTimer: null,
        startTime: 0
      };

      this.spectrumData = new Float32Array(analyser.frequencyBinCount);
    }

    if (this.nodes.ctx.state === 'suspended') {
      await this.nodes.ctx.resume();
    }
    return this.nodes.ctx;
  }

  private buildSynth(): void {
    if (!this.nodes) return;
    const { ctx, bassGain, padGain } = this.nodes;
    const cfg = TONE_CONFIGS[this.toneStyle];

    this.stopSynth();

    const bassOsc = ctx.createOscillator();
    bassOsc.type = cfg.bassWave;
    bassOsc.frequency.value = cfg.bassFreq;
    this.bassLfo = ctx.createOscillator();
    this.bassLfo.frequency.value = this.bpm / 60 * 0.5;
    this.bassLfoGain = ctx.createGain();
    this.bassLfoGain.gain.value = cfg.bassFreq * 0.08;
    this.bassLfo.connect(this.bassLfoGain);
    this.bassLfoGain.connect(bassOsc.frequency);
    bassOsc.connect(bassGain);
    bassOsc.start();
    this.bassLfo.start();
    this.nodes.bassOsc = bassOsc;

    for (let i = 0; i < cfg.padFreqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = cfg.padWave;
      osc.frequency.value = cfg.padFreqs[i];
      const detune = (Math.random() - 0.5) * 6;
      osc.detune.value = detune;
      const singleGain = ctx.createGain();
      singleGain.gain.value = 1 / cfg.padFreqs.length;
      osc.connect(singleGain);
      singleGain.connect(padGain);
      osc.start();
      this.nodes.padOscs.push(osc);
    }
  }

  private stopSynth(): void {
    if (!this.nodes) return;
    if (this.nodes.bassOsc) {
      try { this.nodes.bassOsc.stop(); } catch { /* noop */ }
      this.nodes.bassOsc.disconnect();
      this.nodes.bassOsc = null;
    }
    if (this.bassLfo) {
      try { this.bassLfo.stop(); } catch { /* noop */ }
      this.bassLfo.disconnect();
      this.bassLfo = null;
    }
    if (this.bassLfoGain) {
      this.bassLfoGain.disconnect();
      this.bassLfoGain = null;
    }
    for (const osc of this.nodes.padOscs) {
      try { osc.stop(); } catch { /* noop */ }
      osc.disconnect();
    }
    this.nodes.padOscs = [];
  }

  private applyToneConfig(): void {
    if (!this.nodes) return;
    const cfg = TONE_CONFIGS[this.toneStyle];
    const { ctx, masterGain, bassOsc, padOscs } = this.nodes;

    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(cfg.masterVolume, ctx.currentTime + 0.3);

    this.buildSynth();

    if (bassOsc) {
      bassOsc.type = cfg.bassWave;
      bassOsc.frequency.cancelScheduledValues(ctx.currentTime);
      bassOsc.frequency.linearRampToValueAtTime(cfg.bassFreq, ctx.currentTime + 0.2);
    }

    if (this.bassLfo) {
      this.bassLfo.frequency.value = this.bpm / 60 * 0.5;
    }
    if (this.bassLfoGain) {
      this.bassLfoGain.gain.value = cfg.bassFreq * 0.08;
    }

    void padOscs;
  }

  private scheduleBeat(time: number, beatInBar: number): void {
    if (!this.nodes) return;
    const { ctx, beatGain, bassGain, padGain } = this.nodes;
    const cfg = TONE_CONFIGS[this.toneStyle];

    const isDownbeat = beatInBar === 0;
    const isBeat = beatInBar % 2 === 0;

    const beatEnv = ctx.createGain();
    beatEnv.gain.setValueAtTime(0, time);
    beatEnv.gain.linearRampToValueAtTime(cfg.beatVolume * (isDownbeat ? 1.2 : isBeat ? 1 : 0.6), time + 0.005);
    beatEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

    const beatOsc = ctx.createOscillator();
    beatOsc.type = cfg.beatWave;
    beatOsc.frequency.value = cfg.beatFreq * (isDownbeat ? 0.8 : isBeat ? 1 : 1.3);
    beatOsc.connect(beatEnv);
    beatEnv.connect(beatGain);
    beatOsc.start(time);
    beatOsc.stop(time + 0.2);

    const bassTarget = cfg.bassVolume * (isDownbeat ? 1 : 0.85);
    bassGain.gain.cancelScheduledValues(time);
    bassGain.gain.setValueAtTime(bassGain.gain.value, time);
    bassGain.gain.linearRampToValueAtTime(bassTarget, time + 0.02);
    bassGain.gain.linearRampToValueAtTime(cfg.bassVolume * 0.6, time + this.beatIntervalMs / 1000 * 0.7);

    const padTarget = cfg.padVolume * (0.85 + (isDownbeat ? 0.15 : 0));
    padGain.gain.cancelScheduledValues(time);
    padGain.gain.setValueAtTime(padGain.gain.value, time);
    padGain.gain.linearRampToValueAtTime(padTarget, time + 0.08);
    padGain.gain.linearRampToValueAtTime(cfg.padVolume * 0.8, time + this.beatIntervalMs / 1000 * 0.85);
  }

  private restartBeatScheduler(): void {
    if (!this.nodes) return;
    if (this.nodes.beatTimer !== null) {
      window.clearTimeout(this.nodes.beatTimer);
      this.nodes.beatTimer = null;
    }
    this.beatPhase = 0;
    this.lastBeatTime = performance.now();
    this.scheduleLoop();
  }

  private scheduleLoop(): void {
    if (!this.nodes || !this._isPlaying) return;
    const now = performance.now();
    const lookaheadMs = 100;
    const ctx = this.nodes.ctx;

    while (this.lastBeatTime + this.beatIntervalMs <= now + lookaheadMs) {
      this.lastBeatTime += this.beatIntervalMs;
      const when = ctx.currentTime + (this.lastBeatTime - now) / 1000;
      const beatInBar = this.beatPhase % 16;
      this.scheduleBeat(Math.max(when, ctx.currentTime + 0.02), beatInBar);
      this.beatPhase++;
    }

    this.nodes.beatTimer = window.setTimeout(() => this.scheduleLoop(), 25);
  }

  async start(): Promise<void> {
    await this.ensureContext();
    if (this._isPlaying || !this.nodes) return;

    this._isPlaying = true;
    const cfg = TONE_CONFIGS[this.toneStyle];
    const { ctx, bassGain, padGain } = this.nodes;

    bassGain.gain.cancelScheduledValues(ctx.currentTime);
    padGain.gain.cancelScheduledValues(ctx.currentTime);
    bassGain.gain.setValueAtTime(0, ctx.currentTime);
    padGain.gain.setValueAtTime(0, ctx.currentTime);

    this.buildSynth();

    bassGain.gain.linearRampToValueAtTime(cfg.bassVolume * 0.7, ctx.currentTime + 0.8);
    padGain.gain.linearRampToValueAtTime(cfg.padVolume, ctx.currentTime + 1.2);

    this.nodes.startTime = ctx.currentTime;
    this.restartBeatScheduler();
  }

  async toggle(): Promise<void> {
    if (this._isPlaying) {
      this.pause();
    } else {
      await this.start();
    }
  }

  pause(): void {
    if (!this._isPlaying || !this.nodes) return;
    this._isPlaying = false;
    const { ctx, masterGain, bassGain, padGain } = this.nodes;

    if (this.nodes.beatTimer !== null) {
      window.clearTimeout(this.nodes.beatTimer);
      this.nodes.beatTimer = null;
    }

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
    bassGain.gain.linearRampToValueAtTime(0, now + 0.4);
    padGain.gain.linearRampToValueAtTime(0, now + 0.4);

    window.setTimeout(() => {
      if (!this._isPlaying && this.nodes) {
        this.nodes.masterGain.gain.value = TONE_CONFIGS[this.toneStyle].masterVolume;
        this.stopSynth();
      }
    }, 450);
  }

  stop(): void {
    this.pause();
    this.beatPhase = 0;
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  getAudioData(): AudioData {
    const len = this.spectrumData.length;
    let bassSum = 0, midSum = 0, highSum = 0;

    if (this.nodes && this._isPlaying) {
      const buffer = new Uint8Array(len);
      this.nodes.analyser.getByteFrequencyData(buffer);
      for (let i = 0; i < len; i++) {
        this.spectrumData[i] = buffer[i];
      }

      const bassEnd = Math.floor(len * 0.12);
      const midStart = Math.floor(len * 0.12);
      const midEnd = Math.floor(len * 0.45);
      const highStart = Math.floor(len * 0.45);

      for (let i = 0; i < bassEnd; i++) bassSum += buffer[i];
      for (let i = midStart; i < midEnd; i++) midSum += buffer[i];
      for (let i = highStart; i < len; i++) highSum += buffer[i];

      const bassCount = Math.max(1, bassEnd);
      const midCount = Math.max(1, midEnd - midStart);
      const highCount = Math.max(1, len - highStart);

      const norm01 = (v: number) => Math.max(0, Math.min(1, v / 255));
      return {
        bpm: this.bpm,
        bassAmplitude: Math.pow(norm01(bassSum / bassCount), 1.4),
        midAmplitude: Math.pow(norm01(midSum / midCount), 1.6),
        highAmplitude: Math.pow(norm01(highSum / highCount), 1.8),
        spectrum: this.spectrumData,
        isPlaying: this._isPlaying
      };
    }

    this.spectrumData.fill(0);
    return {
      bpm: this.bpm,
      bassAmplitude: 0,
      midAmplitude: 0,
      highAmplitude: 0,
      spectrum: this.spectrumData,
      isPlaying: this._isPlaying
    };
  }

  dispose(): void {
    this.stop();
    if (this.nodes) {
      this.stopSynth();
      try {
        this.nodes.ctx.close();
      } catch { /* noop */ }
      this.nodes = null;
    }
  }
}
