export type InstrumentType = 'piano' | 'strings' | 'synth';

export interface UserInfo {
  id: string;
  name: string;
  instrument: InstrumentType;
  volume: number;
}

export interface NoteEvent {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  instrument: InstrumentType;
  pitch: string;
  frequency: number;
  volume: number;
}

export interface LightOrb {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  opacity: number;
  createdAt: number;
  userId: string;
  trail: { x: number; y: number; opacity: number; radius: number }[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
}

export interface RecordingNote {
  timestamp: number;
  relativeTime: number;
  userId: string;
  instrument: InstrumentType;
  pitch: string;
  frequency: number;
  volume: number;
}

export const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  piano: '#FFD700',
  strings: '#9B59B6',
  synth: '#00E5FF'
};

export const INSTRUMENT_NAMES: Record<InstrumentType, string> = {
  piano: '钢琴',
  strings: '弦乐',
  synth: '电子合成'
};

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function generateScale(startOctave: number, endOctave: number): { name: string; frequency: number; isBlack: boolean }[] {
  const notes: { name: string; frequency: number; isBlack: boolean }[] = [];
  const A4 = 440;
  const A4_INDEX = 9;

  for (let octave = startOctave; octave <= endOctave; octave++) {
    for (let i = 0; i < 12; i++) {
      const semitonesFromA4 = (octave - 4) * 12 + (i - A4_INDEX);
      const frequency = A4 * Math.pow(2, semitonesFromA4 / 12);
      const noteName = NOTE_NAMES[i];
      notes.push({
        name: `${noteName}${octave}`,
        frequency,
        isBlack: noteName.includes('#')
      });
    }
  }
  return notes;
}

export const SCALE_C4_B5 = generateScale(4, 5);
