export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext({
        sampleRate: 44100
      });
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private applyEnvelope(
    gainNode: GainNode,
    startTime: number,
    attack: number = 0.05,
    decay: number = 0.3,
    sustain: number = 0.5,
    release: number = 0.35,
    duration: number = 1.2
  ) {
    const gain = gainNode.gain;
    gain.cancelScheduledValues(startTime);
    gain.setValueAtTime(0, startTime);
    gain.linearRampToValueAtTime(1.0, startTime + attack);
    gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    gain.setValueAtTime(sustain, startTime + duration - release);
    gain.linearRampToValueAtTime(0, startTime + duration);
  }

  public playNote(
    frequency: number,
    noteId: string,
    startTime?: number,
    duration: number = 1.2
  ): void {
    if (!this.audioContext || !this.masterGain) return;

    this.resume();
    const start = startTime ?? this.audioContext.currentTime;

    const fundamental = this.audioContext.createOscillator();
    const fundamentalGain = this.audioContext.createGain();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(frequency, start);
    fundamentalGain.gain.value = 0.5;

    const harmonic1 = this.audioContext.createOscillator();
    const harmonic1Gain = this.audioContext.createGain();
    harmonic1.type = 'sine';
    harmonic1.frequency.setValueAtTime(frequency * 2, start);
    harmonic1Gain.gain.value = 0.2;

    const harmonic2 = this.audioContext.createOscillator();
    const harmonic2Gain = this.audioContext.createGain();
    harmonic2.type = 'triangle';
    harmonic2.frequency.setValueAtTime(frequency * 3, start);
    harmonic2Gain.gain.value = 0.1;

    const harmonic3 = this.audioContext.createOscillator();
    const harmonic3Gain = this.audioContext.createGain();
    harmonic3.type = 'sine';
    harmonic3.frequency.setValueAtTime(frequency * 4, start);
    harmonic3Gain.gain.value = 0.05;

    const mainGain = this.audioContext.createGain();
    this.applyEnvelope(mainGain, start, 0.05, 0.3, 0.5, 0.35, duration);

    const lowPass = this.audioContext.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.setValueAtTime(frequency * 6, start);
    lowPass.Q.value = 0.8;

    fundamental.connect(fundamentalGain);
    harmonic1.connect(harmonic1Gain);
    harmonic2.connect(harmonic2Gain);
    harmonic3.connect(harmonic3Gain);

    fundamentalGain.connect(mainGain);
    harmonic1Gain.connect(mainGain);
    harmonic2Gain.connect(mainGain);
    harmonic3Gain.connect(mainGain);

    mainGain.connect(lowPass);
    lowPass.connect(this.masterGain);

    fundamental.start(start);
    harmonic1.start(start);
    harmonic2.start(start);
    harmonic3.start(start);

    fundamental.stop(start + duration);
    harmonic1.stop(start + duration);
    harmonic2.stop(start + duration);
    harmonic3.stop(start + duration);

    this.activeOscillators.set(noteId, { osc: fundamental, gain: mainGain });

    setTimeout(() => {
      this.activeOscillators.delete(noteId);
    }, duration * 1000 + 100);
  }

  public playSequence(frequencies: { id: string; freq: number }[], onNoteStart: (id: string) => void): void {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const noteDuration = 1.2;
    const gap = 0.05;
    const totalNoteSpacing = noteDuration + gap;
    let currentTime = this.audioContext.currentTime + 0.1;

    frequencies.forEach((note, index) => {
      const playTime = currentTime + index * totalNoteSpacing;
      this.playNote(note.freq, note.id, playTime, noteDuration);

      const delayMs = (playTime - this.audioContext.currentTime) * 1000;
      setTimeout(() => {
        onNoteStart(note.id);
      }, Math.max(0, delayMs));
    });
  }

  public stopAll(): void {
    if (!this.audioContext) return;
    this.activeOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(this.audioContext!.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, this.audioContext!.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + 0.05);
        osc.stop(this.audioContext!.currentTime + 0.05);
      } catch (e) {}
    });
    this.activeOscillators.clear();
  }

  public getContext(): AudioContext | null {
    return this.audioContext;
  }
}

export const audioEngine = new AudioEngine();
