export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface Note {
  id: string;
  pitch: number; // MIDI pitch number, 60 = middle C
  duration: NoteDuration;
  x: number; // position in pixels along staff
  y: number; // staff position index (0 = bottom line, higher = up)
}

export interface Score {
  id: string;
  name: string;
  notes: Note[];
  createdAt: number;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  avatar: string;
  selectedNoteId: string | null;
  cursorX?: number;
  cursorY?: number;
}

export type ServerAction =
  | { type: 'note:add'; note: Note; userId: string }
  | { type: 'note:update'; noteId: string; changes: Partial<Note>; userId: string }
  | { type: 'note:delete'; noteId: string; userId: string }
  | { type: 'cursor:move'; userId: string; x: number; y: number; noteId: string | null };

export const DURATION_VALUES: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

export const DURATION_LABELS: Record<NoteDuration, string> = {
  whole: '全音符',
  half: '二分音符',
  quarter: '四分音符',
  eighth: '八分音符',
  sixteenth: '十六分音符',
};

export const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const pitchClass = midi % 12;
  return `${PITCH_NAMES[pitchClass]}${octave}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
