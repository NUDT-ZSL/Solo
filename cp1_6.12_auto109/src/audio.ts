import { BPM, BEAT_INTERVAL } from './entities';

export type BeatCallback = (beatIndex: number, audioTime: number) => void;

interface ScheduledBeat {
  index: number;
  audioTime: number;
  fired: boolean;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private bgmStartTime: number = 0;
  private pauseElapsedTime: number = 0;
  private pauseStartAudioTime: number = 0;
  private manualBeatOffset: number = 0;

  private beatCallbacks: BeatCallback[] = [];
  private scheduledBeats: ScheduledBeat[] = [];
  private lastFiredBeatIndex: number = -1;
  private scheduleLookahead: number = 120;
  private scheduleIntervalMs: number = 25;
  private schedulerTimer: number | null = null;

  private bgmOscillators: OscillatorNode[] = [];
  private bgmGains: GainNode[] = [];
  private bgmDuration: number = 0;
  private bgmScheduledEndTime: number = 0;

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
    this.bgmGain.gain.value = 0.32;
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.masterGain);
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  registerBeatCallback(callback: BeatCallback): () => void {
    if (this.beatCallbacks.indexOf(callback) === -1) {
      this.beatCallbacks.push(callback);
    }
    return () => this.unregisterBeatCallback(callback);
  }

  unregisterBeatCallback(callback: BeatCallback): void {
    const idx = this.beatCallbacks.indexOf(callback);
    if (idx >= 0) this.beatCallbacks.splice(idx, 1);
  }

  private fireBeatCallbacks(beatIndex: number, audioTime: number): void {
    for (const cb of this.beatCallbacks) {
      try {
        cb(beatIndex, audioTime);
      } catch (e) {
        console.error('Beat callback error:', e);
      }
    }
  }

  startBGM(): void {
    if (!this.ctx || this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;
    this.bgmStartTime = this.ctx.currentTime;
    this.pauseElapsedTime = 0;
    this.lastFiredBeatIndex = -1;
    this.scheduledBeats = [];

    this.scheduleBGM();
    this.startBeatScheduler();
  }

  stopBGM(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseElapsedTime = 0;

    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    for (const osc of this.bgmOscillators) {
      try { osc.stop(); } catch (e) {}
    }
    this.bgmOscillators = [];
    this.bgmGains = [];
    this.scheduledBeats = [];
  }

  pauseBGM(): void {
    if (!this.ctx || !this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    this.pauseStartAudioTime = this.ctx.currentTime;
    this.pauseElapsedTime = this.getElapsedAudioSeconds();

    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    const suspendRemaining = this.bgmScheduledEndTime - this.ctx.currentTime;
    for (const osc of this.bgmOscillators) {
      try { osc.stop(); } catch (e) {}
    }
    this.bgmOscillators = [];
    this.bgmGains = [];
  }

  resumeBGM(): void {
    if (!this.ctx || !this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this.bgmStartTime = this.ctx.currentTime - this.pauseElapsedTime;

    this.scheduleBGM();
    this.startBeatScheduler();
  }

  setManualBeatOffset(offsetMs: number): void {
    this.manualBeatOffset = offsetMs;
  }

  getManualBeatOffset(): number {
    return this.manualBeatOffset;
  }

  private getElapsedAudioSeconds(): number {
    if (!this.ctx) return 0;
    if (this.isPaused) {
      return this.pauseElapsedTime;
    }
    return this.ctx.currentTime - this.bgmStartTime;
  }

  getElapsedMs(): number {
    return this.getElapsedAudioSeconds() * 1000 + this.manualBeatOffset;
  }

  getCurrentBeat(): number {
    const elapsed = this.getElapsedMs();
    if (elapsed < 0) return -1;
    return Math.floor(elapsed / BEAT_INTERVAL);
  }

  getBeatIndex(): number {
    return this.getCurrentBeat();
  }

  getBeatProgress(): number {
    const elapsed = this.getElapsedMs();
    if (elapsed < 0) return 0;
    return (elapsed % BEAT_INTERVAL) / BEAT_INTERVAL;
  }

  getTimeFromLastBeat(): number {
    const elapsed = this.getElapsedMs();
    if (elapsed < 0) return elapsed + BEAT_INTERVAL;
    return elapsed % BEAT_INTERVAL;
  }

  getTimeToNextBeat(): number {
    return BEAT_INTERVAL - this.getTimeFromLastBeat();
  }

  getAbsoluteTimeOfBeat(beatIndex: number): number {
    return beatIndex * BEAT_INTERVAL - this.manualBeatOffset;
  }

  isNearBeat(toleranceMs: number = 100): boolean {
    const offset = this.getTimeFromLastBeat();
    const fromNext = BEAT_INTERVAL - offset;
    return Math.min(offset, fromNext) <= toleranceMs;
  }

  getBeatOffsetMs(): number {
    const offset = this.getTimeFromLastBeat();
    const fromNext = BEAT_INTERVAL - offset;
    return Math.min(offset, fromNext) * (offset < BEAT_INTERVAL / 2 ? 1 : -1);
  }

  private startBeatScheduler(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
    }
    this.schedulerTimer = window.setInterval(() => {
      this.scheduleBeatsAhead();
      this.processDueBeats();
    }, this.scheduleIntervalMs);
  }

  private scheduleBeatsAhead(): void {
    if (!this.ctx || !this.isPlaying || this.isPaused) return;

    const nowMs = this.getElapsedMs();
    const horizonMs = nowMs + this.scheduleLookahead;

    while (true) {
      const nextIndex = this.scheduledBeats.length > 0
        ? this.scheduledBeats[this.scheduledBeats.length - 1].index + 1
        : this.lastFiredBeatIndex + 1;

      const nextBeatTimeMs = nextIndex * BEAT_INTERVAL - this.manualBeatOffset;

      if (nextBeatTimeMs > horizonMs) break;

      this.scheduledBeats.push({
        index: nextIndex,
        audioTime: nextBeatTimeMs,
        fired: false
      });
    }
  }

  private processDueBeats(): void {
    if (!this.isPlaying || this.isPaused) return;

    const nowMs = this.getElapsedMs();

    for (const beat of this.scheduledBeats) {
      if (!beat.fired && nowMs >= beat.audioTime) {
        beat.fired = true;
        if (beat.index > this.lastFiredBeatIndex) {
          this.lastFiredBeatIndex = beat.index;
        }
        this.fireBeatCallbacks(beat.index, beat.audioTime);
      }
    }

    while (this.scheduledBeats.length > 0 &&
           this.scheduledBeats[0].fired &&
           nowMs - this.scheduledBeats[0].audioTime > 600) {
      this.scheduledBeats.shift();
    }
  }

  private scheduleBGM(): void {
    if (!this.ctx || !this.bgmGain) return;

    const beatDur = BEAT_INTERVAL / 1000;
    const barsPerLoop = 8;
    const beatsPerBar = 4;
    const totalBeats = barsPerLoop * beatsPerBar;
    this.bgmDuration = totalBeats * beatDur;

    const startOffset = this.pauseElapsedTime;
    const loopStartAudioTime = this.ctx.currentTime - startOffset;

    const melody = [
      523.25, 659.25, 783.99, 659.25,
      523.25, 659.25, 783.99, 1046.50,
      880.00, 783.99, 659.25, 523.25,
      587.33, 698.46, 880.00, 698.46,
      523.25, 659.25, 783.99, 659.25,
      523.25, 659.25, 783.99, 1046.50,
      880.00, 783.99, 659.25, 587.33,
      523.25, 0, 659.25, 0
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

    const totalLoopCount = 4;
    this.bgmScheduledEndTime = loopStartAudioTime + totalLoopCount * this.bgmDuration;

    for (let loop = 0; loop < totalLoopCount; loop++) {
      const loopStart = loopStartAudioTime + loop * this.bgmDuration;
      for (let i = 0; i < totalBeats; i++) {
        const t = loopStart + i * beatDur;
        if (t < this.ctx!.currentTime - 0.01) continue;

        if (melody[i] > 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(melody[i], t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.12, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.005, t + beatDur * 0.7);
          osc.connect(gain);
          gain.connect(this.bgmGain);
          osc.start(t);
          osc.stop(t + beatDur * 0.75);
          this.bgmOscillators.push(osc);
          this.bgmGains.push(gain);
        }

        if (bassline[i] > 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(bassline[i], t);
          bassGain.gain.setValueAtTime(0, t);
          bassGain.gain.linearRampToValueAtTime(0.18, t + 0.01);
          bassGain.gain.exponentialRampToValueAtTime(0.01, t + beatDur * 0.85);
          bassOsc.connect(bassGain);
          bassGain.connect(this.bgmGain);
          bassOsc.start(t);
          bassOsc.stop(t + beatDur * 0.9);
          this.bgmOscillators.push(bassOsc);
          this.bgmGains.push(bassGain);
        }

        if (i % 2 === 0) {
          const drum = this.createKick(t, beatDur);
          this.bgmOscillators.push(drum.osc);
          this.bgmGains.push(drum.gain);
        }

        if (i % 4 === 2) {
          const hat = this.createHiHat(t, beatDur);
          this.bgmOscillators.push(hat.osc);
          this.bgmGains.push(hat.gain);
        }
      }
    }
  }

  private createKick(startTime: number, beatDur: number): { osc: OscillatorNode; gain: GainNode } {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, startTime);
    osc.frequency.exponentialRampToValueAtTime(45, startTime + 0.12);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
    return { osc, gain };
  }

  private createHiHat(startTime: number, beatDur: number): { osc: OscillatorNode; gain: GainNode } {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'square';
    osc.frequency.value = 8000;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.08, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(startTime);
    osc.stop(startTime + 0.07);
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
    const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    for (let i = 0; i < scale.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(scale[i], t + i * 0.07);
      gain.gain.setValueAtTime(0, t + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.22, t + i * 0.07 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.22);
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
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 + i * 220, t + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(880 + i * 330, t + i * 0.08 + 0.2);
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.28);
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

  playMissSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  setVolume(master: number, bgm: number, sfx: number): void {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, master));
    if (this.bgmGain) this.bgmGain.gain.value = Math.max(0, Math.min(1, bgm));
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, sfx));
  }

  isBGMRunning(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  debugGetState(): {
    isPlaying: boolean;
    isPaused: boolean;
    elapsed: number;
    beat: number;
    progress: number;
    offset: number;
  } {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      elapsed: this.getElapsedMs(),
      beat: this.getCurrentBeat(),
      progress: this.getBeatProgress(),
      offset: this.manualBeatOffset
    };
  }
}
