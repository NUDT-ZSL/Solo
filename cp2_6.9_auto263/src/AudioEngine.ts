export type Difficulty = 'easy' | 'normal' | 'hard';

export interface NoteInfo {
  name: string;
  frequency: number;
}

const NOTE_FREQUENCIES: Record<string, number> = {
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56,
  'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00,
  'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
  'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51,
  'E6': 1318.51, 'F6': 1396.91, 'F#6': 1479.98, 'G6': 1567.98,
  'G#6': 1661.22, 'A6': 1760.00, 'A#6': 1864.66, 'B6': 1975.53,
  'C7': 2093.00
};

export const DIFFICULTY_CONFIG: Record<Difficulty, { notes: string[]; cols: number; rows: number }> = {
  easy: {
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'],
    cols: 3,
    rows: 4
  },
  normal: {
    notes: ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'D5', 'E5', 'F5'],
    cols: 4,
    rows: 4
  },
  hard: {
    notes: [
      'C3', 'D3', 'E3', 'F3', 'G3',
      'C4', 'D4', 'E4', 'F4', 'G4',
      'C5', 'D5', 'E5', 'F5', 'G5',
      'C6', 'D6', 'E6', 'F6', 'G6'
    ],
    cols: 4,
    rows: 5
  }
};

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private noteBuffers: Map<string, AudioBuffer> = new Map();

  public async init(): Promise<void> {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    await this.audioContext.resume();
  }

  public ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  public generatePianoBuffer(frequency: number, duration: number = 0.8): AudioBuffer {
    const ctx = this.ensureContext();
    const sampleRate = ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, numSamples, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 2.5) * (1 - Math.exp(-t * 30));
        const harmonic1 = Math.sin(2 * Math.PI * frequency * t);
        const harmonic2 = 0.5 * Math.sin(2 * Math.PI * frequency * 2 * t);
        const harmonic3 = 0.25 * Math.sin(2 * Math.PI * frequency * 3 * t);
        const harmonic4 = 0.125 * Math.sin(2 * Math.PI * frequency * 4 * t);
        data[i] = envelope * (harmonic1 + harmonic2 + harmonic3 + harmonic4) * 0.35;
      }
    }

    return buffer;
  }

  public preloadNotes(noteNames: string[]): void {
    for (const name of noteNames) {
      if (!this.noteBuffers.has(name)) {
        const freq = NOTE_FREQUENCIES[name];
        if (freq !== undefined) {
          this.noteBuffers.set(name, this.generatePianoBuffer(freq));
        }
      }
    }
  }

  public playNote(noteName: string): void {
    this.ensureContext();
    const buffer = this.noteBuffers.get(noteName);
    if (!buffer) {
      const freq = NOTE_FREQUENCIES[noteName];
      if (freq === undefined) return;
      const newBuffer = this.generatePianoBuffer(freq);
      this.noteBuffers.set(noteName, newBuffer);
      this.playBuffer(newBuffer);
      return;
    }
    this.playBuffer(buffer);
  }

  private playBuffer(buffer: AudioBuffer): void {
    const ctx = this.ensureContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  }

  public async playSequence(noteArray: string[], intervalMs: number = 500): Promise<void> {
    for (let i = 0; i < noteArray.length; i++) {
      this.playNote(noteArray[i]);
      if (i < noteArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  public playErrorSound(): void {
    const ctx = this.ensureContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  public getNoteFrequency(noteName: string): number | undefined {
    return NOTE_FREQUENCIES[noteName];
  }
}
