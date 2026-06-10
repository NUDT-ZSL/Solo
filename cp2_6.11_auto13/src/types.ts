export interface Beam {
  x: number;
  baseWidth: number;
  baseHeight: number;
  width: number;
  height: number;
  currentBrightness: number;
  targetBrightness: number;
  isTriggered: boolean;
  soundFrequency: number;
  triggerTime: number;
  hoverSegments: number;
}

export interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lifeTime: number;
  maxLife: number;
  color: string;
  size: number;
  startX: number;
  startY: number;
}

export interface Ribbon {
  points: Array<{ x: number; y: number }>;
  color: string;
  lifeTime: number;
  maxLife: number;
}

export interface RecordEntry {
  beamIndex: number;
  timestamp: number;
}

export interface Recording {
  code: string;
  entries: RecordEntry[];
  duration: number;
}

export interface AppState {
  scaleFactor: number;
  mode: 'single' | 'chord';
  isRecording: boolean;
  isPlaying: boolean;
  rippleTime: number;
  scaleTextTime: number;
}

export interface CursorState {
  isActive: boolean;
  x: number;
  y: number;
  isDown: boolean;
}

export const SCALE_FREQUENCIES: number[] = [
  261.63, 277.18, 293.66, 311.13,
  329.63, 349.23, 369.99, 392.00,
  415.30, 440.00, 466.16, 493.88
];

export const PARTICLE_COLORS: string[] = [
  '#4A9EFF', '#7A7AFF', '#AADDFF'
];
