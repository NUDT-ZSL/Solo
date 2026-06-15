import * as Tone from 'tone';

export type InstrumentType = 'synth' | 'guitar' | 'drum' | 'flute' | 'piano';
export type TimbreType = 'warm' | 'bright' | 'soft' | 'sharp';

const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SCALE_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6', 'C7', 'D7', 'E7', 'F7'];

export interface NoteCell {
  note: string;
  row: number;
  col: number;
  timbre: TimbreType;
  instrument: InstrumentType;
}

export class SoundEngine {
  private synth: Tone.PolySynth | null = null;
  private guitar: Tone.PolySynth | null = null;
  private drum: Tone.MembraneSynth | null = null;
  private flute: Tone.PolySynth | null = null;
  private piano: Tone.Sampler | null = null;
  private reverb: Tone.Reverb | null = null;
  private gain: Tone.Gain | null = null;
  private isInitialized: boolean = false;
  private currentTimbre: TimbreType = 'warm';
  private recordedNotes: { note: string; time: number; duration: number; instrument: InstrumentType }[] = [];
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;

  constructor() {}

  public async init() {
    if (this.isInitialized) return;

    await Tone.start();

    this.reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
    this.gain = new Tone.Gain(0.6).connect(this.reverb);

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1 }
    }).connect(this.gain);

    this.guitar = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 }
    }).connect(this.gain);

    this.drum = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' }
    }).connect(this.gain);

    this.flute = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.5, sustain: 0.3, release: 1.5 },
      volume: -5
    }).connect(this.gain);

    this.isInitialized = true;
  }

  public setTimbre(timbre: TimbreType) {
    this.currentTimbre = timbre;
    if (!this.synth || !this.guitar || !this.flute) return;

    const settings: Record<TimbreType, any> = {
      warm: { oscillator: { type: 'sine' }, envelope: { attack: 0.05, decay: 0.4, sustain: 0.5, release: 1.2 } },
      bright: { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.6 } },
      soft: { oscillator: { type: 'triangle' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0.4, release: 2 } },
      sharp: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.4 } }
    };

    this.synth.set(settings[timbre]);
    this.guitar.set(settings[timbre]);
    this.flute.set(settings[timbre]);
  }

  public getTimbre(): TimbreType {
    return this.currentTimbre;
  }

  public getNoteAt(row: number, col: number, cols: number = 5): string {
    const index = row * cols + col;
    return SCALE_NOTES[index % SCALE_NOTES.length];
  }

  public getNoteName(note: string): string {
    return note;
  }

  public async playNote(row: number, col: number, instrument: InstrumentType, cols: number = 5, duration: string = '8n') {
    if (!this.isInitialized) await this.init();

    const note = this.getNoteAt(row, col, cols);
    const now = Tone.now();

    switch (instrument) {
      case 'drum':
        if (this.drum) this.drum.triggerAttackRelease(note, duration, now);
        break;
      case 'guitar':
        if (this.guitar) this.guitar.triggerAttackRelease(note, duration, now);
        break;
      case 'flute':
        if (this.flute) this.flute.triggerAttackRelease(note, duration, now);
        break;
      case 'piano':
        if (this.piano) this.piano.triggerAttackRelease(note, duration, now);
        else if (this.synth) this.synth.triggerAttackRelease(note, duration, now);
        break;
      default:
        if (this.synth) this.synth.triggerAttackRelease(note, duration, now);
    }

    if (this.isRecording) {
      this.recordedNotes.push({
        note,
        time: performance.now() - this.recordingStartTime,
        duration: Tone.Time(duration).toMilliseconds(),
        instrument
      });
    }
  }

  public async playSequence(notes: { row: number; col: number }[], instrument: InstrumentType, intervalMs: number = 200, cols: number = 5) {
    if (!this.isInitialized) await this.init();

    for (let i = 0; i < notes.length; i++) {
      setTimeout(async () => {
        await this.playNote(notes[i].row, notes[i].col, instrument, cols, '4n');
      }, i * intervalMs);
    }
  }

  public startRecording() {
    this.isRecording = true;
    this.recordingStartTime = performance.now();
    this.recordedNotes = [];
  }

  public stopRecording() {
    this.isRecording = false;
    return [...this.recordedNotes];
  }

  public async playRecording(notes: { note: string; time: number; duration: number; instrument: InstrumentType }[]) {
    if (!this.isInitialized) await this.init();

    for (const n of notes) {
      setTimeout(() => {
        const durationSec = n.duration / 1000;
        switch (n.instrument) {
          case 'drum':
            if (this.drum) this.drum.triggerAttackRelease(n.note, durationSec);
            break;
          case 'guitar':
            if (this.guitar) this.guitar.triggerAttackRelease(n.note, durationSec);
            break;
          case 'flute':
            if (this.flute) this.flute.triggerAttackRelease(n.note, durationSec);
            break;
          default:
            if (this.synth) this.synth.triggerAttackRelease(n.note, durationSec);
        }
      }, n.time);
    }
  }

  public clearRecording() {
    this.recordedNotes = [];
  }

  public getRecordedNotes() {
    return [...this.recordedNotes];
  }
}
