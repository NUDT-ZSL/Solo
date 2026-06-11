import { MarbleType, SCALE_FREQUENCIES, NOTE_DURATION, clamp } from './constants';

interface VoiceConfig {
  waveform: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterFreq?: number;
  filterQ?: number;
  volume: number;
  detune?: number;
}

const VOICE_CONFIGS: Record<MarbleType, VoiceConfig> = {
  drum: {
    waveform: 'square',
    attack: 0.001,
    decay: 0.06,
    sustain: 0.0,
    release: 0.04,
    volume: 0.22,
  },
  bass: {
    waveform: 'sawtooth',
    attack: 0.005,
    decay: 0.12,
    sustain: 0.35,
    release: 0.15,
    filterFreq: 800,
    filterQ: 3,
    volume: 0.20,
  },
  piano: {
    waveform: 'triangle',
    attack: 0.003,
    decay: 0.18,
    sustain: 0.25,
    release: 0.35,
    volume: 0.18,
  },
  synth: {
    waveform: 'sine',
    attack: 0.008,
    decay: 0.12,
    sustain: 0.45,
    release: 0.25,
    detune: 7,
    volume: 0.16,
  },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.initialized) this.init();
    return this.ctx;
  }

  playNote(type: MarbleType, noteIndex: number, duration: number = NOTE_DURATION): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const freq = SCALE_FREQUENCIES[clamp(noteIndex, 0, SCALE_FREQUENCIES.length - 1)];
    this.playFrequency(type, freq, duration);
  }

  playFrequency(type: MarbleType, frequency: number, duration: number = NOTE_DURATION): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const config = VOICE_CONFIGS[type];
    const now = ctx.currentTime;
    const totalDuration = duration + config.attack + config.decay + config.release;

    const osc = ctx.createOscillator();
    osc.type = config.waveform;
    osc.frequency.setValueAtTime(frequency, now);

    if (config.detune) {
      osc.detune.setValueAtTime(config.detune, now);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(config.volume, now + config.attack);
    gain.gain.linearRampToValueAtTime(config.volume * config.sustain, now + config.attack + config.decay);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

    if (type === 'synth') {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(5, now);
      lfoGain.gain.setValueAtTime(4, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start(now);
      lfo.stop(now + totalDuration + 0.05);
      lfo.onended = () => { lfo.disconnect(); lfoGain.disconnect(); };
    }

    let filter: BiquadFilterNode | null = null;
    if (config.filterFreq) {
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(config.filterFreq, now);
      if (config.filterQ) filter.Q.setValueAtTime(config.filterQ, now);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + totalDuration + 0.05);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      if (filter) filter.disconnect();
    };
  }

  playThirdHarmony(type: MarbleType, noteIndex: number, secondType: MarbleType): void {
    this.playNote(type, noteIndex, NOTE_DURATION);
    const thirdNote = noteIndex + 2;
    if (thirdNote < SCALE_FREQUENCIES.length) {
      this.playNote(secondType, thirdNote, NOTE_DURATION);
    }
  }

  playRandomDecorator(baseType?: MarbleType): void {
    const types: MarbleType[] = ['drum', 'bass', 'piano', 'synth'];
    const type = baseType || types[Math.floor(Math.random() * types.length)];
    const noteIndex = Math.floor(Math.random() * SCALE_FREQUENCIES.length);
    const freq = SCALE_FREQUENCIES[noteIndex];
    this.playFrequency(type, freq * (Math.random() > 0.5 ? 1 : 2), NOTE_DURATION * 0.8);
  }

  get isReady(): boolean {
    return this.initialized && this.ctx !== null;
  }

  setMasterVolume(vol: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = clamp(vol, 0, 1);
    }
  }
}
