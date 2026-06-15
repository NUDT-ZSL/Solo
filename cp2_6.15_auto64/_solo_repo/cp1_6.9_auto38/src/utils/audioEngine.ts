import type { InstrumentType } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private userGains: Map<string, GainNode> = new Map();

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setUserVolume(userId: string, volume: number) {
    if (!this.ctx || !this.masterGain) return;
    let gain = this.userGains.get(userId);
    if (!gain) {
      gain = this.ctx.createGain();
      gain.connect(this.masterGain);
      this.userGains.set(userId, gain);
    }
    gain.gain.value = Math.max(0, Math.min(1, volume / 100));
  }

  private getUserGain(userId: string): GainNode | null {
    if (!this.ctx || !this.masterGain) return null;
    let gain = this.userGains.get(userId);
    if (!gain) {
      gain = this.ctx.createGain();
      gain.gain.value = 0.7;
      gain.connect(this.masterGain);
      this.userGains.set(userId, gain);
    }
    return gain;
  }

  playNote(
    userId: string,
    instrument: InstrumentType,
    frequency: number,
    volume: number
  ) {
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;

    const destination = this.getUserGain(userId);
    if (!destination) return;

    const noteVolume = Math.max(0, Math.min(1, volume));
    const now = this.ctx.currentTime;
    const duration = 1.5;

    if (instrument === 'piano') {
      this.playPiano(frequency, noteVolume, now, duration, destination);
    } else if (instrument === 'strings') {
      this.playStrings(frequency, noteVolume, now, duration, destination);
    } else {
      this.playSynth(frequency, noteVolume, now, duration, destination);
    }
  }

  private playPiano(
    freq: number,
    vol: number,
    start: number,
    dur: number,
    dest: AudioNode
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    const gain2 = this.ctx.createGain();
    gain2.gain.value = 0.3;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(vol * 0.6, start + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc.connect(gain);
    osc2.connect(gain2);
    gain2.connect(gain);
    gain.connect(dest);

    osc.start(start);
    osc2.start(start);
    osc.stop(start + dur);
    osc2.stop(start + dur);
  }

  private playStrings(
    freq: number,
    vol: number,
    start: number,
    dur: number,
    dest: AudioNode
  ) {
    if (!this.ctx) return;
    const oscs: OscillatorNode[] = [];
    const gain = this.ctx.createGain();

    const harmonics = [1, 2, 3, 4];
    const harmonicGains = [1, 0.5, 0.25, 0.125];

    harmonics.forEach((h, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq * h;
      const hg = this.ctx!.createGain();
      hg.gain.value = harmonicGains[i];
      osc.connect(hg);
      hg.connect(gain);
      oscs.push(osc);
    });

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    filter.Q.value = 1;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol * 0.5, start + 0.3);
    gain.gain.linearRampToValueAtTime(vol * 0.7, start + 0.5);
    gain.gain.linearRampToValueAtTime(0.001, start + dur);

    gain.connect(filter);
    filter.connect(dest);

    oscs.forEach(o => {
      o.start(start);
      o.stop(start + dur);
    });
  }

  private playSynth(
    freq: number,
    vol: number,
    start: number,
    dur: number,
    dest: AudioNode
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol * 0.4, start + 0.02);
    gain.gain.linearRampToValueAtTime(vol * 0.3, start + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(start);
    lfo.start(start);
    osc.stop(start + dur);
    lfo.stop(start + dur);
  }
}

export const audioEngine = new AudioEngine();
