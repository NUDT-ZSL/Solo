export type InstrumentType = 'guitar' | 'piano' | 'violin';
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type ChordType = 'single' | 'major' | 'minor' | 'seventh';

export interface NoteRecord {
  note: string;
  frequency: number;
  timestamp: number;
  instrument: InstrumentType;
  duration: number;
}

export interface ChordData {
  name: string;
  notes: string[];
  frequencies: number[];
}

type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }
}

export const eventBus = new EventBus();

const NOTE_FREQUENCIES: Record<string, number> = {
  'C0': 16.35, 'C#0': 17.32, 'D0': 18.35, 'D#0': 19.45, 'E0': 20.60,
  'F0': 21.83, 'F#0': 23.12, 'G0': 24.50, 'G#0': 25.96, 'A0': 27.50,
  'A#0': 29.14, 'B0': 30.87,
  'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20,
  'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00,
  'A#1': 58.27, 'B1': 61.74,
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41,
  'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00,
  'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
  'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
  'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.26,
  'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00,
  'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'E6': 1318.51,
  'F6': 1396.91, 'F#6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22, 'A6': 1760.00,
  'A#6': 1864.66, 'B6': 1975.53,
  'C7': 2093.00, 'C#7': 2217.46, 'D7': 2349.32, 'D#7': 2489.02, 'E7': 2637.02,
  'F7': 2793.83, 'F#7': 2959.96, 'G7': 3135.96, 'G#7': 3322.44, 'A7': 3520.00,
  'A#7': 3729.31, 'B7': 3951.07,
  'C8': 4186.01
};

const GUITAR_STRINGS = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const VIOLIN_STRINGS = ['G3', 'D4', 'A4', 'E5'];

const SCALE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const INSTRUMENT_RANGES: Record<InstrumentType, { min: string; max: string }> = {
  guitar: { min: 'E2', max: 'E6' },
  piano: { min: 'A0', max: 'C8' },
  violin: { min: 'G3', max: 'E7' }
};

function getNoteFrequency(note: string): number {
  return NOTE_FREQUENCIES[note] || 440;
}

function getNoteIndex(note: string): number {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 0;
  const noteName = match[1];
  const octave = parseInt(match[2]);
  return SCALE_NOTES.indexOf(noteName) + octave * 12;
}

function getNoteFromIndex(index: number): string {
  const octave = Math.floor(index / 12);
  const noteIndex = index % 12;
  return `${SCALE_NOTES[noteIndex]}${octave}`;
}

export function getGuitarFretNote(stringIndex: number, fret: number): string {
  const openNote = GUITAR_STRINGS[stringIndex];
  const noteIndex = getNoteIndex(openNote) + fret;
  return getNoteFromIndex(noteIndex);
}

export function getViolinFretNote(stringIndex: number, fret: number): string {
  const openNote = VIOLIN_STRINGS[stringIndex];
  const noteIndex = getNoteIndex(openNote) + fret;
  return getNoteFromIndex(noteIndex);
}

export function getPianoKeyNote(keyIndex: number): string {
  return getNoteFromIndex(keyIndex + 3);
}

const CHORD_INTERVALS: Record<Exclude<ChordType, 'single'>, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  seventh: [0, 4, 7, 10]
};

function adjustNoteToRange(note: string, instrument: InstrumentType): string {
  const range = INSTRUMENT_RANGES[instrument];
  const minIndex = getNoteIndex(range.min);
  const maxIndex = getNoteIndex(range.max);
  let noteIndex = getNoteIndex(note);

  while (noteIndex < minIndex) {
    noteIndex += 12;
  }
  while (noteIndex > maxIndex) {
    noteIndex -= 12;
  }

  return getNoteFromIndex(noteIndex);
}

export function getChordNotes(rootNote: string, chordType: ChordType, instrument: InstrumentType = 'piano'): string[] {
  if (chordType === 'single') {
    return [rootNote];
  }
  const intervals = CHORD_INTERVALS[chordType];
  const rootIndex = getNoteIndex(rootNote);
  const rawNotes = intervals.map(interval => getNoteFromIndex(rootIndex + interval));
  return rawNotes.map(note => adjustNoteToRange(note, instrument));
}

export function generateChords(key: string): ChordData[] {
  const keyIndex = SCALE_NOTES.indexOf(key);
  if (keyIndex === -1) return [];

  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  const chordPositions = [0, 3, 4, 5];
  const chordNames = ['I', 'vi', 'IV', 'V'];
  const chordSuffixes = ['', 'm', '', ''];

  return chordPositions.map((pos, idx) => {
    const rootIndex = keyIndex + majorScale[pos];
    const rootNote = SCALE_NOTES[rootIndex % 12];
    const thirdIndex = rootIndex + majorScale[(pos + 2) % 7] - majorScale[pos] + Math.floor((pos + 2) / 7) * 12;
    const fifthIndex = rootIndex + majorScale[(pos + 4) % 7] - majorScale[pos] + Math.floor((pos + 4) / 7) * 12;
    
    const notes = [
      `${rootNote}4`,
      `${SCALE_NOTES[thirdIndex % 12]}${4 + Math.floor(thirdIndex / 12)}`,
      `${SCALE_NOTES[fifthIndex % 12]}${4 + Math.floor(fifthIndex / 12)}`
    ];

    return {
      name: `${rootNote}${chordSuffixes[idx]} (${chordNames[idx]})`,
      notes,
      frequencies: notes.map(n => getNoteFrequency(n))
    };
  });
}

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private recording: NoteRecord[] = [];
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private activeOscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();
  private isPlaying: boolean = false;

  constructor() {
    eventBus.on('playNote', (note: string, instrument: InstrumentType) => {
      this.playNote(note, instrument);
    });

    eventBus.on('startRecording', () => {
      this.startRecording();
    });

    eventBus.on('stopRecording', () => {
      this.stopRecording();
    });

    eventBus.on('playRecording', () => {
      this.playRecording();
    });

    eventBus.on('clearRecording', () => {
      this.clearRecording();
    });
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private getWaveformForInstrument(instrument: InstrumentType): WaveformType {
    switch (instrument) {
      case 'guitar': return 'sawtooth';
      case 'piano': return 'triangle';
      case 'violin': return 'sine';
      default: return 'sine';
    }
  }

  playNote(note: string, instrument: InstrumentType, duration: number = 0.5, volume: number = 0.5, skipRecording: boolean = false): void {
    this.initAudioContext();
    if (!this.audioContext || !this.masterGain) return;

    const frequency = getNoteFrequency(note);
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.type = this.getWaveformForInstrument(instrument);
    osc.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);

    const oscId = `${note}-${Date.now()}-${Math.random()}`;
    this.activeOscillators.set(oscId, { osc, gain: gainNode });

    osc.onended = () => {
      this.activeOscillators.delete(oscId);
    };

    if (this.isRecording && !skipRecording) {
      this.recording.push({
        note,
        frequency,
        timestamp: Date.now() - this.recordingStartTime,
        instrument,
        duration
      });
    }

    eventBus.emit('notePlayed', { note, instrument });
  }

  playChord(rootNote: string, instrument: InstrumentType, chordType: ChordType, duration: number = 0.6): void {
    const notes = getChordNotes(rootNote, chordType, instrument);
    const recordingTimestamp = Date.now() - this.recordingStartTime;

    if (this.isRecording) {
      notes.forEach((note) => {
        const frequency = getNoteFrequency(note);
        this.recording.push({
          note,
          frequency,
          timestamp: recordingTimestamp,
          instrument,
          duration
        });
      });
    }

    const volume = 0.3 / Math.sqrt(notes.length);
    notes.forEach((note) => {
      this.playNote(note, instrument, duration, volume, true);
    });

    eventBus.emit('chordPlayed', { notes, instrument, chordType });
  }

  playChordNotes(notes: string[], instrument: InstrumentType): void {
    notes.forEach((note, index) => {
      setTimeout(() => {
        this.playNote(note, instrument, 0.8);
      }, index * 300);
    });
  }

  startRecording(): void {
    this.recording = [];
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    eventBus.emit('recordingStarted');
  }

  stopRecording(): void {
    this.isRecording = false;
    eventBus.emit('recordingStopped', this.recording);
  }

  getRecording(): NoteRecord[] {
    return [...this.recording];
  }

  setRecording(records: NoteRecord[]): void {
    this.recording = [...records];
  }

  clearRecording(): void {
    this.stopPlayback();
    this.recording = [];
    eventBus.emit('recordingCleared');
  }

  isRecordingActive(): boolean {
    return this.isRecording;
  }

  async playRecording(): Promise<void> {
    if (this.recording.length === 0 || this.isPlaying) return;

    this.initAudioContext();
    this.isPlaying = true;
    eventBus.emit('playbackStarted', this.recording);

    const groupedByTimestamp = this.recording.reduce((groups, record) => {
      const ts = record.timestamp;
      if (!groups.has(ts)) {
        groups.set(ts, []);
      }
      groups.get(ts)!.push(record);
      return groups;
    }, new Map<number, NoteRecord[]>());

    const sortedTimestamps = Array.from(groupedByTimestamp.keys()).sort((a, b) => a - b);
    const startTime = Date.now();

    for (const timestamp of sortedTimestamps) {
      if (!this.isPlaying) break;

      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, timestamp - elapsed);

      await new Promise<void>(resolve => {
        setTimeout(() => {
          if (this.isPlaying) {
            const notesToPlay = groupedByTimestamp.get(timestamp)!;
            notesToPlay.forEach(record => {
              this.playNote(record.note, record.instrument, record.duration);
            });
          }
          resolve();
        }, delay);
      });
    }

    if (this.isPlaying) {
      setTimeout(() => {
        this.isPlaying = false;
        eventBus.emit('playbackFinished');
      }, 500);
    }
  }

  stopPlayback(): void {
    this.isPlaying = false;
    this.activeOscillators.forEach(({ osc }) => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator may have already stopped
      }
    });
    this.activeOscillators.clear();
    eventBus.emit('playbackStopped');
  }

  isPlaybackActive(): boolean {
    return this.isPlaying;
  }
}

export const audioEngine = new AudioEngine();
