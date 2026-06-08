export class AudioManager {
  private audioContext: AudioContext | null = null;

  private noteNames: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  private midiMin: number = 60;
  private midiMax: number = 71;

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  public midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public midiToNoteName(midi: number): string {
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${this.noteNames[noteIndex]}${octave}`;
  }

  public getRandomMidi(): number {
    return Math.floor(Math.random() * (this.midiMax - this.midiMin + 1)) + this.midiMin;
  }

  public playNote(midi: number, duration: number = 0.2): void {
    const ctx = this.ensureContext();
    const frequency = this.midiToFrequency(midi);
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(110, now);

    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 1.0);
  }

  public playWaveBurst(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      const baseFreq = 300 + i * 200;
      oscillator.frequency.setValueAtTime(baseFreq, now + i * 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + i * 0.1 + 0.3);

      gainNode.gain.setValueAtTime(0, now + i * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.25, now + i * 0.1 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now + i * 0.1);
      oscillator.stop(now + i * 0.1 + 0.3);
    }
  }

  public getPlatformColor(midi: number): string {
    const colors = ['#00FFB9', '#00D4FF', '#A78BFA', '#F472B6'];
    const index = Math.floor(((midi - this.midiMin) / (this.midiMax - this.midiMin)) * (colors.length - 1));
    return colors[Math.max(0, Math.min(colors.length - 1, index))];
  }
}
