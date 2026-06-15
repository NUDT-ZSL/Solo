export interface Point {
  x: number;
  y: number;
}

export interface TrackNode {
  id: string;
  position: Point;
  noteIndex: number;
  highlighted: boolean;
  highlightColor: string;
  highlightTime: number;
}

export interface Track {
  id: string;
  nodes: TrackNode[];
  startNote: number;
  color: string;
}

export type MarbleType = 'red' | 'blue' | 'green' | 'yellow';

export interface Marble {
  id: string;
  type: MarbleType;
  position: Point;
  velocity: Point;
  trackId: string | null;
  nodeIndex: number;
  progress: number;
  isMoving: boolean;
  lastTriggeredNodeId: string | null;
  radius: number;
}

export interface Particle {
  id: string;
  position: Point;
  velocity: Point;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface LaunchPad {
  type: MarbleType;
  position: Point;
  radius: number;
}

export const COLORS = {
  BACKGROUND_START: '#1A1A2E',
  BACKGROUND_END: '#16213E',
  TRACK: '#00D4FF',
  TRACK_GLOW: 'rgba(0, 212, 255, 0.6)',
  NODE_RING: 'rgba(255, 255, 255, 0.3)',
  NODE_RING_ACTIVE: 'rgba(255, 255, 255, 0.9)',
  TITLE_BAR_GLASS: 'rgba(255, 255, 255, 0.06)',

  MARBLE: {
    red: { start: '#FF3366', end: '#FF6633', glow: 'rgba(255, 51, 102, 0.7)', name: '鼓' },
    blue: { start: '#00BFFF', end: '#1E90FF', glow: 'rgba(0, 191, 255, 0.7)', name: '贝斯' },
    green: { start: '#33FF99', end: '#00CC66', glow: 'rgba(51, 255, 153, 0.7)', name: '钢琴' },
    yellow: { start: '#FFD700', end: '#FFAA00', glow: 'rgba(255, 215, 0, 0.7)', name: '合成器' }
  },

  BG_TINT: {
    red: 'rgba(255, 51, 102, 0.15)',
    blue: 'rgba(88, 0, 255, 0.15)',
    green: 'rgba(0, 255, 153, 0.12)',
    yellow: 'rgba(255, 215, 0, 0.12)'
  }
} as const;

export const NOTE_FREQUENCIES: Record<string, number> = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
  'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25,
  'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99
};

export const C_MAJOR_SCALE = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

export const THIRD_INTERVAL_OFFSETS = [2, 4];

export const CONFIG = {
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  TITLE_BAR_HEIGHT: 60,
  INFO_BAR_HEIGHT: 40,
  EDITOR_AREA_RATIO: 0.4,
  EDITOR_AREA_HEIGHT: 280,

  MAX_TRACKS: 4,
  MIN_NODES_PER_TRACK: 6,
  MAX_NODES_PER_TRACK: 8,
  DEFAULT_NODES_PER_TRACK: 7,

  NODE_RADIUS: 14,
  NODE_HIT_RADIUS: 22,
  NODE_HIGHLIGHT_DURATION: 200,

  MARBLE_RADIUS: 16,
  MAX_MARBLES: 4,
  MARBLE_SPEED: 180,

  DEFAULT_NOTE_INTERVAL: 0.5,
  MIN_NOTE_INTERVAL: 0.2,
  MAX_NOTE_INTERVAL: 1.5,
  NOTE_DURATION: 0.05,

  PARTICLE_COUNT_MIN: 5,
  PARTICLE_COUNT_MAX: 10,
  PARTICLE_LIFETIME: 0.1,
  PARTICLE_SPREAD_SPEED: 200,

  COLLISION_DISTANCE: 36,
  COLLISION_RESPONSE_FORCE: 8
} as const;

export const MARBLE_TYPES: MarbleType[] = ['red', 'blue', 'green', 'yellow'];

export const INSTRUMENT_NAMES: Record<MarbleType, string> = {
  red: 'drum',
  blue: 'bass',
  green: 'piano',
  yellow: 'synth'
};
