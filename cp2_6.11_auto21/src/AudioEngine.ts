export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private startTime: number = 0;

  constructor() {}

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
      this.startTime = this.audioContext.currentTime;
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    when: number = 0
  ): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const startAt = when > 0 ? when : this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.linearRampToValueAtTime(0, startAt + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);

    this.activeNodes.push(osc);
    osc.onended = () => {
      const idx = this.activeNodes.indexOf(osc);
      if (idx > -1) this.activeNodes.splice(idx, 1);
    };
  }

  public playDing(): void {
    this.playTone(800, 0.1, 'sine', 0.4);
  }

  public playTrack(
    trackIndex: number,
    pitchLevel: number,
    startTime: number,
    duration: number
  ): void {
    const baseFreq = 261.63;
    const frequency = baseFreq * Math.pow(2, pitchLevel / 12);
    const types: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];
    const type = types[trackIndex % types.length];
    this.scheduleToneWithBuffer(frequency, startTime, duration, type, 0.25);
  }

  private scheduleToneWithBuffer(
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    const attackTime = 0.02;
    const releaseTime = 0.05;
    const sustainTime = Math.max(0.05, duration - attackTime - releaseTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    gain.gain.linearRampToValueAtTime(volume * 0.9, startTime + attackTime + sustainTime);
    gain.gain.linearRampToValueAtTime(0, startTime + attackTime + sustainTime + releaseTime);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + attackTime + sustainTime + releaseTime + 0.02);

    this.activeNodes.push(osc);
    osc.onended = () => {
      const idx = this.activeNodes.indexOf(osc);
      if (idx > -1) this.activeNodes.splice(idx, 1);
    };
  }

  public playMelody(pitches: number[]): void {
    this.ensureContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const totalDuration = 3.0;
    const noteCount = pitches.length;
    const noteSpacing = totalDuration / noteCount;
    const noteDuration = noteSpacing * 0.9;

    const scheduleStart = ctx.currentTime + 0.05;

    const types: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];
    const baseFreq = 261.63;

    pitches.forEach((pitch, i) => {
      const frequency = baseFreq * Math.pow(2, pitch / 12);
      const type = types[i % types.length];
      const noteStart = scheduleStart + i * noteSpacing;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, noteStart);

      const attackTime = 0.015;
      const releaseTime = 0.04;
      const sustain = Math.max(0.05, noteDuration - attackTime - releaseTime);

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.25, noteStart + attackTime);
      gain.gain.linearRampToValueAtTime(0.22, noteStart + attackTime + sustain);
      gain.gain.linearRampToValueAtTime(0, noteStart + attackTime + sustain + releaseTime);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteStart);
      osc.stop(noteStart + attackTime + sustain + releaseTime + 0.02);

      this.activeNodes.push(osc);
      osc.onended = () => {
        const idx = this.activeNodes.indexOf(osc);
        if (idx > -1) this.activeNodes.splice(idx, 1);
      };
    });
  }

  public stopAll(): void {
    this.activeNodes.forEach(node => {
      try {
        node.stop();
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  public getCurrentTime(): number {
    this.ensureContext();
    return this.audioContext ? this.audioContext.currentTime - this.startTime : 0;
  }
}
