import { Note, useMusicStore } from '../store';

const NOTE_BASE = 60;

export function parseMelody(input: string): Note[] {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const notes: Note[] = [];

  for (const token of tokens) {
    const match = token.match(/^([1-7])([#b]?)(-*)$/);
    if (!match) continue;

    const [, numStr, accidental, dashes] = match;
    let num = parseInt(numStr, 10);

    const semitoneMap: Record<number, number> = {
      1: 0,
      2: 2,
      3: 4,
      4: 5,
      5: 7,
      6: 9,
      7: 11,
    };

    let semitone = semitoneMap[num];

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
