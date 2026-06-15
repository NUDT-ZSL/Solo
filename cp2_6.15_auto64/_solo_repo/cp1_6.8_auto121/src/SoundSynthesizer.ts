export type ParticleColorGroup = 'blue' | 'purple' | 'pink' | 'cyan' | 'orange';

const COLOR_BASE_FREQ: Record<ParticleColorGroup, number> = {
  blue: 261.63,
  purple: 349.23,
  pink: 493.88,
  cyan: 659.25,
  orange: 880.00,
};

const COLOR_SEMITONE_SPAN: Record<ParticleColorGroup, number> = {
  blue: 4,
  purple: 4,
  pink: 3,
  cyan: 3,
  orange: 3,
};

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.5;

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  playPulse(color: ParticleColorGroup, positionX: number): void {
    const ctx = this.ensureContext();
    const baseFreq = COLOR_BASE_FREQ[color];
    const semitoneSpan = COLOR_SEMITONE_SPAN[color];
    const semitoneOffset = Math.round(Math.max(0, Math.min(1, positionX)) * semitoneSpan);
    const freq = baseFreq * Math.pow(2, semitoneOffset / 12);

    const now = ctx.currentTime;

    const sineOsc = ctx.createOscillator();
    sineOsc.type = 'sine';
    sineOsc.frequency.value = freq;

    const triOsc = ctx.createOscillator();
    triOsc.type = 'triangle';
    triOsc.frequency.value = freq;

    const sineGain = ctx.createGain();
    sineGain.gain.value = 0.6;

    const triGain = ctx.createGain();
    triGain.gain.value = 0.4;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(1, now + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    sineOsc.connect(sineGain);
    triOsc.connect(triGain);
    sineGain.connect(envelope);
    triGain.connect(envelope);
    envelope.connect(this.masterGain!);

    const stopTime = now + 1.2;
    sineOsc.start(now);
    triOsc.start(now);
    sineOsc.stop(stopTime);
    triOsc.stop(stopTime);
  }
}
