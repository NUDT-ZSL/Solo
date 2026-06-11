export type NoteColor = 'red' | 'blue' | 'green' | 'purple';

export interface NoteColorConfig {
  hex: string;
  rgb: { r: number; g: number; b: number };
  frequency: number;
  name: string;
}

export const NOTE_COLORS: Record<NoteColor, NoteColorConfig> = {
  red: {
    hex: '#FF3366',
    rgb: { r: 255, g: 51, b: 102 },
    frequency: 261.63,
    name: 'Do'
  },
  blue: {
    hex: '#00BFFF',
    rgb: { r: 0, g: 191, b: 255 },
    frequency: 293.66,
    name: 'Re'
  },
  green: {
    hex: '#39FF14',
    rgb: { r: 57, g: 255, b: 20 },
    frequency: 329.63,
    name: 'Mi'
  },
  purple: {
    hex: '#9932CC',
    rgb: { r: 153, g: 50, b: 204 },
    frequency: 349.23,
    name: 'Fa'
  }
};

export const PARTICLE = {
  BASE_COUNT: 50,
  BASE_SIZE: 4,
  BASE_LIFETIME: 0.8,
  BASE_SPEED: 120,
  MAX_PARTICLES: 1000
} as const;

export const PATH = {
  MIN_WIDTH: 2,
  MAX_WIDTH: 6,
  PULSE_SPEED: 2.5,
  GLOW_INTENSITY: 20
} as const;

export const NOTE = {
  RADIUS: 20,
  PULSE_DURATION: 0.2,
  PULSE_SCALE: 1.3,
  GLOW_INTENSITY: 25
} as const;

export const ANIMATION = {
  TARGET_FPS: 60,
  MIN_FPS: 30,
  BG_TRANSITION_DURATION: 0.5,
  FADE_DURATION: 0.3,
  PATH_DRAW_DURATION: 0.4
} as const;

export const AUDIO = {
  VOLUME: 0.25,
  ATTACK: 0.02,
  RELEASE: 0.1,
  BASE_NOTE_DURATION: 0.35,
  GAP_BETWEEN_NOTES: 0.1
} as const;

export const BACKGROUND = {
  COLOR_A: { r: 11, g: 11, b: 42 },
  COLOR_B: { r: 27, g: 11, b: 42 },
  CYCLE_SPEED: 0.15
} as const;

export const PLAYBACK = {
  MIN_SPEED: 0.5,
  MAX_SPEED: 3.0,
  DEFAULT_SPEED: 1.0
} as const;
