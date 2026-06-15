export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private vortexOscillator: OscillatorNode | null = null;
  private vortexGain: GainNode | null = null;
  private initialized = false;

  public init(): void {
    if (this.initialized) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public playCollision(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.2);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playVortexStart(): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.vortexOscillator) return;
    const t = this.ctx.currentTime;
    this.vortexOscillator = this.ctx.createOscillator();
    this.vortexGain = this.ctx.createGain();
    this.vortexOscillator.type = 'sawtooth';
    this.vortexOscillator.frequency.setValueAtTime(150, t);
    this.vortexGain.gain.setValueAtTime(0, t);
    this.vortexGain.gain.linearRampToValueAtTime(0.12, t + 0.15);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    this.vortexOscillator.connect(filter);
    filter.connect(this.vortexGain);
    this.vortexGain.connect(this.masterGain);
    this.vortexOscillator.start(t);
  }

  public playVortexStop(): void {
    if (!this.ctx || !this.vortexOscillator || !this.vortexGain || !this.masterGain) return;
    const t = this.ctx.currentTime;
    this.vortexGain.gain.cancelScheduledValues(t);
    this.vortexGain.gain.setValueAtTime(this.vortexGain.gain.value, t);
    this.vortexGain.gain.linearRampToValueAtTime(0, t + 0.2);
    const osc = this.vortexOscillator;
    osc.stop(t + 0.25);
    this.vortexOscillator = null;
    this.vortexGain = null;
  }

  public playScore(): void {
    if (!this.ctx || !this.masterGain) return;
    const t0 = this.ctx.currentTime;
    const notes = [
      { freq: 261.63, start: 0 },
      { freq: 293.66, start: 0.1 },
      { freq: 329.63, start: 0.2 },
    ];
    notes.forEach((n) => {
      const t = t0 + n.start;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playVictory(): void {
    if (!this.ctx || !this.masterGain) return;
    const t0 = this.ctx.currentTime;
    const melody = [
      { freq: 261.63, start: 0.0, dur: 0.15 },
      { freq: 329.63, start: 0.15, dur: 0.15 },
      { freq: 392.0, start: 0.3, dur: 0.15 },
      { freq: 523.25, start: 0.45, dur: 0.35 },
    ];
    melody.forEach((m) => {
      const t = t0 + m.start;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(m.freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + m.dur);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + m.dur + 0.05);
    });
  }

  public playLaunch(power: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 200 + power * 300;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, t + 0.15);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}
