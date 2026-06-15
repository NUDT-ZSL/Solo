export type NoteColor = 'red' | 'blue' | 'green' | 'purple';

export interface NoteColorConfig {
  hex: string;
  rgb: string;
  frequency: number;
  name: string;
  bgTint: string;
}

export interface PlacedNote {
  color: NoteColor;
  x: number;
  y: number;
  id: number;
}

export interface NotePulseState extends PlacedNote {
  pulseTime: number;
}

export type NotePlayedCallback = (color: NoteColor, index: number) => void;
export type PlayCompleteCallback = () => void;

export interface DragPreview {
  color: NoteColor;
  x: number;
  y: number;
}

export const NOTE_COLORS: Record<NoteColor, NoteColorConfig> = {
  red: {
    hex: '#FF3366',
    rgb: '255, 51, 102',
    frequency: 261,
    name: 'Do',
    bgTint: '#2A0B0B',
  },
  blue: {
    hex: '#00BFFF',
    rgb: '0, 191, 255',
    frequency: 293,
    name: 'Re',
    bgTint: '#0B0B2A',
  },
  green: {
    hex: '#39FF14',
    rgb: '57, 255, 20',
    frequency: 329,
    name: 'Mi',
    bgTint: '#0B2A0B',
  },
  purple: {
    hex: '#9932CC',
    rgb: '153, 50, 204',
    frequency: 349,
    name: 'Fa',
    bgTint: '#1B0B2A',
  },
};

export const PARTICLE_BASE_COUNT = 50;
export const PARTICLE_MAX_TOTAL = 1000;
export const PARTICLE_LIFETIME = 0.8;
export const PARTICLE_INITIAL_SIZE = 4;
export const PARTICLE_SPEED_BASE = 120;

export const PATH_MIN_WIDTH = 2;
export const PATH_MAX_WIDTH = 6;
export const PATH_PULSE_SPEED = 2;

export const NOTE_RADIUS = 18;
export const NOTE_PULSE_DURATION = 0.2;
export const NOTE_PULSE_SCALE = 1.3;

export const BG_COLOR_START = '#0B0B2A';
export const BG_COLOR_END = '#1B0B2A';
export const BG_TRANSITION_DURATION = 0.5;
export const BG_ANIMATION_SPEED = 0.3;

export const UNDO_FADE_DURATION = 0.3;

export const BASE_NOTE_DURATION = 0.4;
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 3;

export const FPS_TARGET = 60;
