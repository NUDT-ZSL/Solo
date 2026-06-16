export interface Note {
  id: string;
  pitch: number;
  position: number;
  duration: Duration;
  sharp: boolean;
  flat: boolean;
  trackId: string;
}

export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface Track {
  id: string;
  name: string;
  color: string;
  solo: boolean;
  mute: boolean;
  visible: boolean;
}

export interface ScoreData {
  id: string;
  title: string;
  composer: string;
  tracks: Track[];
  notes: Note[];
}

export interface VersionRecord {
  version: number;
  timestamp: string;
  authorIp: string;
  data: ScoreData;
}

export const DURATION_MAP: Record<Duration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

export const PITCH_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const STAFF_LINES = 5;
export const LINE_SPACING = 8;
export const STAVES = 4;

export function pitchToName(pitch: number): string {
  const octave = Math.floor(pitch / 7) + 4;
  const name = PITCH_NAMES[((pitch % 7) + 7) % 7];
  return `${name}${octave}`;
}

export function pitchToY(pitch: number, staffIndex: number, staffTop: number): number {
  const staffOffset = staffIndex * (STAFF_LINES * LINE_SPACING * 2 + 60);
  const noteOffset = (pitch - 14) * (LINE_SPACING / 2);
  return staffTop + staffOffset + (STAFF_LINES - 1) * LINE_SPACING - noteOffset;
}

export function yToPitch(y: number, staffIndex: number, staffTop: number): number {
  const staffOffset = staffIndex * (STAFF_LINES * LINE_SPACING * 2 + 60);
  const baseY = staffTop + staffOffset + (STAFF_LINES - 1) * LINE_SPACING;
  const pitch = Math.round((baseY - y) / (LINE_SPACING / 2)) + 14;
  return Math.max(0, Math.min(28, pitch));
}

export function getStaffIndex(y: number, staffTop: number): number {
  const staffHeight = STAFF_LINES * LINE_SPACING * 2 + 60;
  const index = Math.floor((y - staffTop) / staffHeight);
  return Math.max(0, Math.min(STAVES - 1, index));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
