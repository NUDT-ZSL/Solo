export type Duration = 'whole' | 'half' | 'quarter' | 'eighth';

export interface Note {
  pitch: number;
  octave: number;
  sharp: boolean;
  duration: Duration;
}

export interface Score {
  id: string;
  title: string;
  notes: (Note | null)[][];
  createdAt: number;
  updatedAt: number;
}

export const DURATION_MAP: Record<Duration, string> = {
  whole: '全音符',
  half: '二分音符',
  quarter: '四分音符',
  eighth: '八分音符',
};

export const DURATION_BEATS: Record<Duration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

export const PITCH_NAMES = ['1', '2', '3', '4', '5', '6', '7'] as const;

export const OCTAVE_LABELS = ['低音', '中音', '高音'] as const;

export const MAX_MEASURES = 16;
export const BEATS_PER_MEASURE = 4;

export function createEmptyNotes(): (Note | null)[][] {
  return Array.from({ length: MAX_MEASURES }, () =>
    Array.from({ length: BEATS_PER_MEASURE }, () => null)
  );
}

export function pitchToNoteName(pitch: number, octave: number, sharp: boolean): string {
  const baseNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  let name = baseNames[pitch - 1];
  if (sharp) name += '#';
  const octaveNum = octave + 3;
  return `${name}${octaveNum}`;
}
