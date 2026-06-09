export enum VisualizerMode {
  BARS = 'bars',
  PARTICLES = 'particles',
  WAVE = 'wave'
}

export enum ColorTheme {
  AURORA = 'aurora',
  LAVA = 'lava',
  DEEP_SEA = 'deepsea',
  NEON = 'neon'
}

export enum WaveType {
  SINE = 'sine',
  SQUARE = 'square',
  SAWTOOTH = 'sawtooth',
  TRIANGLE = 'triangle'
}

export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  averageFrequency: number;
  lowFrequency: number;
  highFrequency: number;
  volume: number;
}

export interface ThemeColors {
  start: string;
  end: string;
  accent: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  life: number;
}

export interface TransformState {
  offsetX: number;
  offsetY: number;
  targetOffsetX: number;
  targetOffsetY: number;
  scale: number;
}

export const THEME_PALETTES: Record<ColorTheme, ThemeColors> = {
  [ColorTheme.AURORA]: { start: '#00FFC6', end: '#6366F1', accent: '#22D3EE' },
  [ColorTheme.LAVA]: { start: '#FF4500', end: '#FFD700', accent: '#FF6347' },
  [ColorTheme.DEEP_SEA]: { start: '#1E3A8A', end: '#7C3AED', accent: '#3B82F6' },
  [ColorTheme.NEON]: { start: '#06B6D4', end: '#EC4899', accent: '#F472B6' }
};
