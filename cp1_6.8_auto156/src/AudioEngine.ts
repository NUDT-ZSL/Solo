import { PITCH_FREQUENCIES, RHYTHM_BEATS, type PitchName, type RhythmType } from './types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private bpm: number = 120;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 4;
      this.compressor.connect(this.ctx.destination);
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.compressor);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playNote(frequency: number, duration: number): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.015);
    gain.gain.setValueAtTime(0.5, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency * 4, now);
    filter.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration);
    filter.Q.value = 1;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc2.connect(gain2);
    gain2.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration + 0.05);
    osc2.start(now);
    osc2.stop(now + duration + 0.05);
  }

  playNoteFromData(pitch: PitchName, rhythm: RhythmType): void {
    const freq = PITCH_FREQUENCIES[pitch];
    const beats = RHYTHM_BEATS[rhythm];
    const beatDuration = 60 / this.bpm;
    const duration = beats * beatDuration;
    this.playNote(freq, Math.max(0.1, duration));
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(60, Math.min(200, bpm));
  }

  getBpm(): number {
    return this.bpm;
  }

  getBeatDuration(): number {
    return 60 / this.bpm;
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  reset(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.compressor = null;
    }
  }
}
