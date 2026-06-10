export interface Beam {
  x: number;
  baseWidth: number;
  baseHeight: number;
  width: number;
  height: number;
  brightness: number;
  triggerTime: number;
  holdDuration: number;
  fadeDuration: number;
  soundFrequency: number;
  hoverSegments: number;
  color: string;
  index: number;
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

export const BEAM_COLORS: string[] = [
  '#4A9EFF', '#5A88FF', '#6A7AFF', '#7A7AFF',
  '#8A8AFF', '#9A9AFF', '#8ABBFF', '#7AC8FF',
  '#6AD5FF', '#5AE2FF', '#4AEEFF', '#AADDFF'
];

export interface BeamManagerLike {
  beamStartY: number;
  beamStartX: number;
  arrayHeight: number;
  arrayBaseWidth: number;
  baseBeamHeight: number;
  beams: Array<{
    x: number;
    width: number;
    soundFrequency: number;
    color: string;
    brightness: number;
  }>;
  findBeamIndexAt(x: number, y: number): number;
}
