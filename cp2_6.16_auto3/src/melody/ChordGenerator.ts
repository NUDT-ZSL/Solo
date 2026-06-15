import { Note, Chord, useMusicStore } from '../store';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const DIATONIC_CHORDS: Record<number, { name: string; quality: 'major' | 'minor' | 'diminished'; intervals: number[] }> = {
  0: { name: 'I', quality: 'major', intervals: [0, 4, 7] },
  1: { name: 'ii', quality: 'minor', intervals: [0, 3, 7] },
  2: { name: 'iii', quality: 'minor', intervals: [0, 3, 7] },
  3: { name: 'IV', quality: 'major', intervals: [0, 4, 7] },
  4: { name: 'V', quality: 'major', intervals: [0, 4, 7] },
  5: { name: 'vi', quality: 'minor', intervals: [0, 3, 7] },
  6: { name: 'vii°', quality: 'diminished', intervals: [0, 3, 6] },
};

const PRIMARY_DEGREES = [0, 3, 4];
const SECONDARY_DEGREES = [1, 2, 5];

function noteToScaleDegree(noteMidi: number): number {
  const pc = ((noteMidi % 12) + 12) % 12;
  return pc;
}

function isInMajorScale(noteMidi: number): boolean {
  const pc = noteToScaleDegree(noteMidi);
  return MAJOR_SCALE.includes(pc);
}

function findBestDegreeForNote(noteMidi: number, preferred: number[]): number {
  const pc = noteToScaleDegree(noteMidi);

  if (isInMajorScale(noteMidi)) {
    for (const deg of preferred) {
      const chordInfo = DIATONIC_CHORDS[deg];
      const chordPcs = chordInfo.intervals.map((i) => (MAJOR_SCALE[deg] + i) % 12);
      if (chordPcs.includes(pc)) {
        return deg;
      }
    }
    return preferred[0];
  } else {
    for (const deg of SECONDARY_DEGREES) {
      const chordInfo = DIATONIC_CHORDS[deg];
      const chordPcs = chordInfo.intervals.map((i) => (MAJOR_SCALE[deg] + i) % 12);
      const alteredPcs = chordPcs.map((p) => (p + 1) % 12).concat(chordPcs.map((p) => (p - 1 + 12) % 12));
      if (chordPcs.includes(pc) || alteredPcs.includes(pc)) {
        return deg;
      }
    }
    return SECONDARY_DEGREES[0];
  }
}

export function generateChords(notes: Note[], beatsPerChord: number = 4): Chord[] {
  if (notes.length === 0) return [];

  const chords: Chord[] = [];
  let beatAccumulator = 0;
  let currentNotes: Note[] = [];

  const pushChordForGroup = (group: Note[]) => {
    if (group.length === 0) return;

    const hasNonDiatonic = group.some((n) => !isInMajorScale(n.note));
    const preferred = hasNonDiatonic ? SECONDARY_DEGREES : PRIMARY_DEGREES;

    const noteCounts = new Map<number, number>();
    for (const n of group) {
      const pc = noteToScaleDegree(n.note);
      noteCounts.set(pc, (noteCounts.get(pc) || 0) + n.duration);
    }

    let bestDeg = preferred[0];
    let bestScore = -1;

    for (const deg of preferred) {
      const chordInfo = DIATONIC_CHORDS[deg];
      const chordPcs = chordInfo.intervals.map((i) => (MAJOR_SCALE[deg] + i) % 12);
      let score = 0;
      for (const [pc, weight] of noteCounts.entries()) {
        if (chordPcs.includes(pc)) score += weight;
      }
      if (score > bestScore) {
        bestScore = score;
        bestDeg = deg;
      }
    }

    if (bestScore === 0) {
      bestDeg = findBestDegreeForNote(group[0].note, preferred);
    }

    const chordInfo = DIATONIC_CHORDS[bestDeg];
    const rootMidi = 48 + MAJOR_SCALE[bestDeg];
    const chordNotes = chordInfo.intervals.map((i) => rootMidi + i);
    const totalDur = beatsPerChord;

    chords.push({
      chord: chordInfo.name,
      duration: totalDur,
      quality: chordInfo.quality,
      notes: chordNotes,
    });
  };

  for (const note of notes) {
    currentNotes.push(note);
    beatAccumulator += note.duration;

    if (beatAccumulator >= beatsPerChord) {
      pushChordForGroup(currentNotes);
      beatAccumulator = 0;
      currentNotes = [];
    }
  }

  if (currentNotes.length > 0) {
    pushChordForGroup(currentNotes);
  }

  return chords;
}

export function useChordGenerator() {
  const notes = useMusicStore((s) => s.notes);
  const setChords = useMusicStore((s) => s.setChords);

  return (customNotes?: Note[]) => {
    const n = customNotes ?? notes;
    const chords = generateChords(n);
    setChords(chords);
    return chords;
  };
}
