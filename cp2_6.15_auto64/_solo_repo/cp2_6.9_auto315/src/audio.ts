export class AudioManager {
  private static _instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  public init(): void {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  public ensureStarted(): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private noteToFrequency(note: string): number {
    const noteMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    const match = note.match(/^([A-G]#?)(\d)$/);
    if (!match) return 440;
    const semitone = noteMap[match[1]];
    const octave = parseInt(match[2]);
    return 440 * Math.pow(2, ((octave - 4) * 12 + semitone - 9) / 12);
  }

  public playNote(note: string, volume: number = 0.5, duration: number = 0.8, delay: number = 0): void {
    if (!this.audioContext) return;
    this.ensureStarted();

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 4000;
    filter.Q.value = 0.7;

    osc.type = 'triangle';
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const freq = this.noteToFrequency(note);
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    const attackTime = 0.02;
    const decayTime = 0.1;
    const sustainLevel = volume * 0.6;

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + attackTime);
    gain.gain.linearRampToValueAtTime(sustainLevel, ctx.currentTime + delay + attackTime + decayTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.1);
  }

  public playArpeggio(note: string, volume: number = 0.25): void {
    const intervals = [0, 0.12, 0.24];
    const vol = volume;
    intervals.forEach((delay, i) => {
      this.playNote(note, vol * (1 - i * 0.2), 0.6, delay);
    });
  }

  public playChord(notes: string[], volume: number = 0.4, duration: number = 1.5): void {
    notes.forEach(note => {
      this.playNote(note, volume, duration, 0);
    });
  }
}
