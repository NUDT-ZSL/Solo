import { BPM, BEAT_INTERVAL } from './entities';

export type BeatCallback = (beatIndex: number, time: number) => void;

interface AudioTrack {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  duration: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private scheduledBeats: Set<number> = new Set();
  private beatCallbacks: BeatCallback[] = [];
  private currentBeatIndex: number = 0;
  private bgmTimer: number | null = null;
  private bgmTrack: AudioTrack | null = null;
  private bgmLoopStart: number = 0;
  private bgmLoopDuration: number = 0;

  constructor() {}

  async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.35;
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.masterGain);
  }

  onBeat(callback: BeatCallback): void {
    this.beatCallbacks.push(callback);
  }

  offBeat(callback: BeatCallback): void {
    const idx = this.beatCallbacks.indexOf(callback);
    if (idx >= 0) this.beatCallbacks.splice(idx, 1);
  }

  private triggerBeatCallbacks(beatIndex: number, time: number): void {
    for (const cb of this.beatCallbacks) {
      try {
        cb(beatIndex, time);
      } catch (e) {
        console.error('Beat callback error:', e);
      }
    }
  }

  startBGM(): void {
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = this.ctx.currentTime;
    this.currentBeatIndex = 0;
    this.scheduledBeats.clear();

    this.generate8BitBGM();
    this.scheduleBeatLoop();
  }

  stopBGM(): void {
    this.isPlaying = false;
    if (this.bgmTimer !== null) {
      cancelAnimationFrame(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmTrack) {
      for (const osc of this.bgmTrack.oscillators) {
        try { osc.stop(); } catch (e) {}
      }
      this.bgmTrack = null;
    }
    this.scheduledBeats.clear();
  }

  getCurrentTime(): number {
    if (!this.ctx) return 0;
    return this.ctx.currentTime;
  }

  getElapsedTime(): number {
    if (!this.ctx) return 0;
    return (this.ctx.currentTime - this.startTime) * 1000;
  }

  getBeatProgress(): number {
    const elapsed = this.getElapsedTime();
    return (elapsed % BEAT_INTERVAL) / BEAT_INTERVAL;
  }

  getBeatIndex(): number {
    const elapsed = this.getElapsedTime();
    return Math.floor(elapsed / BEAT_INTERVAL);
  }

  getTimeToNextBeat(): number {
    const elapsed = this.getElapsedTime();
    return BEAT_INTERVAL - (elapsed % BEAT_INTERVAL);
  }

  getTimeFromLastBeat(): number {
    const elapsed = this.getElapsedTime();
    return elapsed % BEAT_INTERVAL;
  }

  private scheduleBeatLoop(): void {
    if (!this.ctx || !this.isPlaying) return;

    const checkAndSchedule = () => {
      if (!this.ctx || !this.isPlaying) return;

      const now = this.ctx.currentTime;
      const lookAhead = 0.1;
      const beatDuration = BEAT_INTERVAL / 1000;
      const elapsed = (now - this.startTime);
      const nextBeatIndex = Math.floor(elapsed / beatDuration) + 1;
      const nextBeatTime = this.startTime + nextBeatIndex * beatDuration;

      if (nextBeatTime - now <= lookAhead && !this.scheduledBeats.has(nextBeatIndex)) {
        this.scheduledBeats.add(nextBeatIndex);
        const delay = (nextBeatTime - now) * 1000;

        setTimeout(() => {
          if (!this.isPlaying) return;
          this.currentBeatIndex = nextBeatIndex;
          this.triggerBeatCallbacks(nextBeatIndex, nextBeatTime);
        }, Math.max(0, delay));
      }

      this.bgmTimer = requestAnimationFrame(checkAndSchedule);
    };

    this.bgmTimer = requestAnimationFrame(checkAndSchedule);
  }

  private generate8BitBGM(): void {
    if (!this.ctx || !this.bgmGain) return;

    const beatDur = BEAT_INTERVAL / 1000;
    const barsPerLoop = 8;
    const beatsPerBar = 4;
    const totalBeats = barsPerLoop * beatsPerBar;
    this.bgmLoopDuration = totalBeats * beatDur;
    this.bgmLoopStart = 0;

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    const melody = [
      523.25, 659.25, 783.99, 659.25,
      523.25, 659.25, 783.99, 1046.50,
      880.00, 783.99, 659.25, 523.25,
      587.33, 698.46, 880.00, 698.46,
      523.25, 659.25, 783.99, 659.25,
      523.25, 659.25, 783.99, 1046.50,
      880.00, 783.99, 659.25, 587.33,
      523.25, 0, 0, 0
    ];

    const bassline = [
      130.81, 0, 130.81, 0,
      130.81, 0, 130.81, 0,
      174.61, 0, 174.61, 0,
      146.83, 0, 146.83, 0,
      130.81, 0, 130.81, 0,
      130.81, 0, 130.81, 0,
      196.00, 0, 196.00, 0,
      164.81, 0, 164.81, 0
    ];

    const startT = this.startTime;

    for (let i = 0; i < totalBeats; i++) {
      const t = startT + i * beatDur;

      if (melody[i] > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(melody[i], t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, t + beatDur * 0.8);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(t);
        osc.stop(t + beatDur * 0.85);
        oscillators.push(osc);
        gains.push(gain);
      }

      if (bassline[i] > 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassline[i], t);
        bassGain.gain.setValueAtTime(0, t);
        bassGain.gain.linearRampToValueAtTime(0.2, t + 0.01);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + beatDur * 0.9);
        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);
        bassOsc.start(t);
        bassOsc.stop(t + beatDur * 0.95);
        oscillators.push(bassOsc);
        gains.push(bassGain);
      }

      if (i % 2 === 0) {
        const drum = this.createDrumSound(t, beatDur);
        oscillators.push(drum.osc);
        gains.push(drum.gain);
      }

      if (i % 4 === 2) {
        const hat = this.createHiHatSound(t, beatDur);
        oscillators.push(hat.osc);
        gains.push(hat.gain);
      }
    }

    this.bgmTrack = { oscillators, gains, duration: this.bgmLoopDuration };

    setTimeout(() => {
      if (this.isPlaying) {
        this.scheduledBeats.clear();
        this.startTime = this.ctx!.currentTime;
        this.currentBeatIndex = 0;
        this.generate8BitBGM();
      }
    }, this.bgmLoopDuration * 1000 - 50);
  }

  private createDrumSound(startTime: number, beatDur: number): { osc: OscillatorNode; gain: GainNode } {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(startTime);
    osc.stop(startTime + 0.16);
    return { osc, gain };
  }

  private createHiHatSound(startTime: number, beatDur: number): { osc: OscillatorNode; gain: GainNode } {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'square';
    const lfo = this.ctx!.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 8000;
    const lfoGain = this.ctx!.createGain();
    lfoGain.gain.value = 2000;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(startTime);
    lfo.stop(startTime + 0.05);

    osc.frequency.value = 6000;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.08, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(startTime);
    osc.stop(startTime + 0.06);
    return { osc, gain };
  }

  playAttackSound(onBeat: boolean): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = onBeat ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(onBeat ? 880 : 440, t);
    osc.frequency.exponentialRampToValueAtTime(onBeat ? 1320 : 220, t + 0.1);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(onBeat ? 0.3 : 0.15, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playHitSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  playPlayerHurtSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playPickupSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freqs[i], t + i * 0.06);
      gain.gain.setValueAtTime(0, t + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.18, t + i * 0.06 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.14);
    }
  }

  playLevelUpSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    for (let i = 0; i < scale.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(scale[i], t + i * 0.08);
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.22, t + i * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.22);
    }
  }

  playExplosionSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.46);
  }

  playPortalSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 + i * 220, t + i * 0.1);
      osc.frequency.exponentialRampToValueAtTime(880 + i * 440, t + i * 0.1 + 0.2);
      gain.gain.setValueAtTime(0, t + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.28);
    }
  }

  playShieldSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.15);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  setVolume(master: number, bgm: number, sfx: number): void {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, master));
    if (this.bgmGain) this.bgmGain.gain.value = Math.max(0, Math.min(1, bgm));
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, sfx));
  }
}
