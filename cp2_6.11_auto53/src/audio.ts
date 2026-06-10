export type ToneLevel = 'low' | 'mid' | 'high';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_FREQUENCIES: Record<string, number> = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
  'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'B3': 246.94, 'A#3': 233.08, 'A3': 220.00, 'G#3': 207.65,
  'G3': 196.00, 'F#3': 185.00, 'F3': 174.61, 'E3': 164.81,
  'D#3': 155.56, 'D3': 146.83, 'C#3': 138.59, 'C3': 130.81,
};

export class AudioSynthesizer {
  private audioContext: AudioContext | null = null;
  private toneOffset: number = 0;
  private activeOscillators: Map<number, { osc: OscillatorNode; gain: GainNode }> = new Map();

  constructor() {}

  private init(): void {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  public setToneLevel(level: ToneLevel): void {
    switch (level) {
      case 'low':
        this.toneOffset = -3;
        break;
      case 'mid':
        this.toneOffset = 0;
        break;
      case 'high':
        this.toneOffset = 3;
        break;
    }
  }

  public getToneOffset(): number {
    return this.toneOffset;
  }

  private getFrequency(stringIndex: number, totalStrings: number): number {
    const baseNotes = this.generateScale(totalStrings);
    const noteIndex = Math.min(stringIndex, baseNotes.length - 1);
    const noteName = baseNotes[noteIndex];
    const baseFreq = NOTE_FREQUENCIES[noteName] || 440;
    const semitoneRatio = Math.pow(2, 1 / 12);
    return baseFreq * Math.pow(semitoneRatio, this.toneOffset);
  }

  private generateScale(count: number): string[] {
    const scale: string[] = [];
    const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26];
    const startNoteIndex = NOTE_NAMES.indexOf('C');
    const startOctave = 4;

    for (let i = 0; i < count; i++) {
      const interval = majorScaleIntervals[i % majorScaleIntervals.length];
      const octaveShift = Math.floor(i / majorScaleIntervals.length);
      const noteIndex = (startNoteIndex + interval) % 12;
      const octave = startOctave + octaveShift + Math.floor((startNoteIndex + interval) / 12);
      scale.push(`${NOTE_NAMES[noteIndex]}${octave}`);
    }
    return scale;
  }

  public getNoteName(stringIndex: number, totalStrings: number): string {
    const scale = this.generateScale(totalStrings);
    return scale[Math.min(stringIndex, scale.length - 1)];
  }

  public playNote(stringIndex: number, totalStrings: number): void {
    this.init();
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.stopNote(stringIndex);

    const freq = this.getFrequency(stringIndex, totalStrings);
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);

    const now = this.audioContext.currentTime;
    const attackTime = 0.01;
    const decayTime = 0.3;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + attackTime + decayTime + 0.05);

    this.activeOscillators.set(stringIndex, { osc: oscillator, gain: gainNode });

    oscillator.onended = () => {
      this.activeOscillators.delete(stringIndex);
    };
  }

  public stopNote(stringIndex: number): void {
    const active = this.activeOscillators.get(stringIndex);
    if (active && this.audioContext) {
      try {
        active.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
        active.gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
        active.osc.stop(this.audioContext.currentTime + 0.05);
      } catch (e) {
        // already stopped
      }
      this.activeOscillators.delete(stringIndex);
    }
  }

  public stopAll(): void {
    for (const [index] of this.activeOscillators) {
      this.stopNote(index);
    }
  }
}
