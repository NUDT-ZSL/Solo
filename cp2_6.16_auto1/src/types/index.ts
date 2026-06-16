export interface SoundSource {
  id: number;
  position: { x: number; y: number; z: number };
  frequency: number;
  amplitude: number;
  color: string;
}

export interface WaveformData {
  sourceId: number;
  samples: number[];
}

export interface InterferenceData {
  combined: number[];
  constructiveRegions: Array<{ start: number; end: number }>;
  destructiveRegions: Array<{ start: number; end: number }>;
}

export const DEFAULT_COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#a29bfe'];

export const DEFAULT_POSITIONS = [
  { x: -4, y: 0, z: 0 },
  { x: -1.33, y: 0, z: 0 },
  { x: 1.33, y: 0, z: 0 },
  { x: 4, y: 0, z: 0 },
];

export const DEFAULT_FREQUENCY = 220;
export const DEFAULT_AMPLITUDE = 0.5;
export const SAMPLE_RATE = 60;
export const SAMPLE_COUNT = 240;
