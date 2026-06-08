export type PitchName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type RhythmType = 'whole' | 'half' | 'quarter' | 'eighth';

export interface NoteData {
  pitch: PitchName;
  octave: number;
  rhythm: RhythmType;
  frequency: number;
  beatDuration: number;
}

export interface AxialCoord {
  q: number;
  r: number;
}

export interface HexNode {
  coord: AxialCoord;
  pixel: { x: number; y: number };
  note: NoteData | null;
  active: boolean;
  pulseIntensity: number;
  hoverIntensity: number;
  scale: number;
}

export interface Connection {
  from: AxialCoord;
  to: AxialCoord;
  pulsePhase: number;
  intensity: number;
}

export const PITCH_FREQUENCIES: Record<PitchName, number> = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.00,
  A: 440.00,
  B: 493.88,
};

export const RHYTHM_BEATS: Record<RhythmType, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

export const RHYTHM_LABELS: Record<RhythmType, string> = {
  whole: '全音符',
  half: '二分',
  quarter: '四分',
  eighth: '八分',
};

export const ALL_PITCHES: PitchName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const ALL_RHYTHMS: RhythmType[] = ['whole', 'half', 'quarter', 'eighth'];
