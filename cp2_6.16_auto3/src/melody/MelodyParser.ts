import { Note, useMusicStore } from '../store';

const NOTE_BASE = 60;

const SEMITONE_MAP: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

const TOKEN_REGEX = /([#b]?[1-7]-*)/g;

export function tokenizeMelody(input: string): string[] {
  const compact = input.replace(/\s+/g, '');
  if (!compact) return [];
  const matches = compact.match(TOKEN_REGEX);
  return matches || [];
}

export function parseMelody(input: string): Note[] {
  const tokens = tokenizeMelody(input);
  const notes: Note[] = [];

  for (const token of tokens) {
    const match = token.match(/^([#b]?)([1-7])(-*)$/);
    if (!match) continue;

    const [, accidental, numStr, dashes] = match;
    const num = parseInt(numStr, 10);

    let semitone = SEMITONE_MAP[num];
    if (accidental === '#') semitone += 1;
    if (accidental === 'b') semitone -= 1;

    const duration = 1 + dashes.length;
    notes.push({
      note: NOTE_BASE + semitone,
      duration,
    });
  }

  return notes;
}

export function useMelodyParser() {
  const setMelodyText = useMusicStore((s) => s.setMelodyText);
  const setNotes = useMusicStore((s) => s.setNotes);

  return (input: string) => {
    setMelodyText(input);
    const notes = parseMelody(input);
    setNotes(notes);
    return notes;
  };
}
