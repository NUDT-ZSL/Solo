import { MarbleType, SCALE_FREQUENCIES, NOTE_DURATION, clamp } from './constants';

type OscillatorType = OscillatorTypeEnum;

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
    decay: 0.08,
    sustain: 0.0,
    release: 0.05,
    volume: 0.25,
  },
  bass: {
    waveform: 'sawtooth',
    attack: 0.005,
    decay: 0.15,
    sustain: 0.4,
    release: 0.2,
    filterFreq: 800,
    filterQ: 3,
    volume: 0.22,
  },
  piano: {
    waveform: 'triangle',
    attack: 0.003,
    decay: 0.2,
    sustain: 0.3,
    release: 0.4,
    volume: 0.2,
  },
  synth: {
    waveform: 'sine',
    attack: 0.01,
    decay: 0.15,
    sustain: 0.5,
    release: 0.3,
    detune: 7,
    volume: 0.18,
  },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  constructor() {}

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
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(config.volume, now + config.attack);
    gain.gain.linearRampToValueAtTime(config.volume * config.sustain, now + config.attack + config.decay);
    gain.gain.linearRampToValueAtTime(0, now + totalDuration);

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
    }

    let lastNode: AudioNode = osc;

    if (config.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(config.filterFreq, now);
      if (config.filterQ) filter.Q.setValueAtTime(config.filterQ, now);
      lastNode.connect(filter);
      filter.connect(gain);
    } else {
      lastNode.connect(gain);
    }

    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + totalDuration + 0.05);
  }

  playHarmony(type: MarbleType, baseNoteIndex: number, intervals: number[]): void {
    intervals.forEach((interval) => {
      const note = baseNoteIndex + interval;
      if (note >= 0 && note < SCALE_FREQUENCIES.length) {
        this.playNote(type, note, NOTE_DURATION);
      }
    });
  }

  playThirdHarmony(type: MarbleType, noteIndex: number): void {
    this.playNote(type, noteIndex, NOTE_DURATION);
    const thirdNote = noteIndex + 2;
    if (thirdNote < SCALE_FREQUENCIES.length) {
      this.playNote(type, thirdNote, NOTE_DURATION);
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
