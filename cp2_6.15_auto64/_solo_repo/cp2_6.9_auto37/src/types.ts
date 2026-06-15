export type PatternMode = 'wave' | 'spiral' | 'fractal';

export interface ArtParameters {
  amplitude: number;
  frequency: number;
  phase: number;
  rotation: number;
  scale: number;
  opacity: number;
  fillColor: string;
  strokeColor: string;
  mode: PatternMode;
  randomRotation: boolean;
}

export const DEFAULT_PARAMETERS: ArtParameters = {
  amplitude: 50,
  frequency: 1.5,
  phase: 0,
  rotation: 0,
  scale: 1.0,
  opacity: 0.85,
  fillColor: '#7FB5B5',
  strokeColor: '#4A6C6F',
  mode: 'wave',
  randomRotation: false
};

export const GRID_SIZE = 8;
export const CELL_GAP = 2;
export const GAP_COLOR = '#2a2a2a';
export const BG_COLOR = '#faf8f0';
