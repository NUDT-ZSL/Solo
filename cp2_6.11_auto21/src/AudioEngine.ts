export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
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

  public playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);

    this.activeOscillators.push(osc);
    osc.onended = () => {
      const idx = this.activeOscillators.indexOf(osc);
      if (idx > -1) this.activeOscillators.splice(idx, 1);
    };
  }

  public playDing(): void {
    this.playTone(800, 0.1, 'sine', 0.4);
  }

  public playTrack(trackIndex: number, pitchLevel: number, startTime: number, duration: number): void {
    const baseFreq = 261.63;
    const frequency = baseFreq * Math.pow(2, pitchLevel / 12);
    const types: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];
    const type = types[trackIndex % types.length];
    this.scheduleTone(frequency, startTime, duration, type, 0.25);
  }

  private scheduleTone(frequency: number, startTime: number, duration: number, type: OscillatorType, volume: number): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.linearRampToValueAtTime(volume, startTime + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);

    this.activeOscillators.push(osc);
    osc.onended = () => {
      const idx = this.activeOscillators.indexOf(osc);
      if (idx > -1) this.activeOscillators.splice(idx, 1);
    };
  }

  public playMelody(pitches: number[]): void {
    this.ensureContext();
    if (!this.audioContext) return;

    const noteDuration = 3 / pitches.length;
    const start = this.audioContext.currentTime + 0.1;

    pitches.forEach((pitch, i) => {
      this.playTrack(i, pitch, start + i * noteDuration, noteDuration * 0.9);
    });
  }

  public stopAll(): void {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.activeOscillators = [];
  }

  public getCurrentTime(): number {
    this.ensureContext();
    return this.audioContext ? this.audioContext.currentTime - this.startTime : 0;
  }
}
