export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
  }

  public resume(): void {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playNote(params: {
    frequency: number;
    duration: number;
    type: 'sine' | 'sawtooth';
    volume: number;
    distortion: number;
  }): void {
    const { frequency, duration, type, volume, distortion } = params;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, frequency * 0.995),
      now + duration
    );

    const gainNode = this.ctx.createGain();
    const attack = 0.015;
    const release = Math.min(0.25, duration * 0.5);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.setValueAtTime(volume, now + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    if (type === 'sawtooth' && distortion > 0.01) {
      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this._makeDistortionCurve(distortion) as unknown as Float32Array<ArrayBuffer>;
      shaper.oversample = '4x';

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4000;

      osc.connect(shaper);
      shaper.connect(filter);
      filter.connect(gainNode);
    } else {
      osc.connect(gainNode);
    }

    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    window.setTimeout(() => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch (e) {}
    }, (duration + 0.1) * 1000);
  }

  public playResetSweep(): void {
    this.resume();
    const now = this.ctx.currentTime;
    const duration = 0.5;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + duration);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.03);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    window.setTimeout(() => {
      try {
        osc.disconnect();
        gainNode.disconnect();
        filter.disconnect();
      } catch (e) {}
    }, (duration + 0.1) * 1000);
  }

  private _makeDistortionCurve(amount: number): Float32Array {
    const k = amount * 150;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
