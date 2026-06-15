export type ControlMode = 'novice' | 'advanced' | 'expert';

export interface Vec2 {
  x: number;
  y: number;
}

export interface CarState {
  position: Vec2;
  angle: number;
  speed: number;
  driftAngle: number;
  isDrifting: boolean;
  steeringAngle: number;
  angularVelocity: number;
}

export interface TrackPoint {
  timestamp: number;
  position: Vec2;
  angle: number;
  speed: number;
  driftAngle: number;
  score: number;
}

export interface LapRecord {
  id: string;
  lapTime: number;
  avgDriftAngle: number;
  totalScore: number;
  mode: ControlMode;
  trackData: TrackPoint[];
  createdAt: number;
}

export interface DriftState {
  isActive: boolean;
  startTime: number;
  duration: number;
  currentScore: number;
  totalScore: number;
  maxAngle: number;
}

export interface ScorePopup {
  id: string;
  value: number;
  position: Vec2;
  createdAt: number;
}

export interface TrailsPoint {
  position: Vec2;
  timestamp: number;
  alpha: number;
  width: number;
}

export interface KeyState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
}

export interface BezierCurve {
  controlPoints: Vec2[];
}

export interface TrackData {
  innerCurve: BezierCurve;
  outerCurve: BezierCurve;
  centerLine: Vec2[];
  width: number;
}

export interface ReplayState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentPoint: TrackPoint | null;
  trackData: TrackPoint[];
}

export const MODE_COLORS: Record<ControlMode, string> = {
  novice: '#4ade80',
  advanced: '#f97316',
  expert: '#ef4444'
};

export const MODE_NAMES: Record<ControlMode, string> = {
  novice: '新手模式',
  advanced: '进阶模式',
  expert: '高手模式'
};

export const MODE_MAX_SPEED: Record<ControlMode, number> = {
  novice: 60,
  advanced: 100,
  expert: 100
};

export const PHYSICS = {
  ACCELERATION: 50,
  BRAKE: 80,
  FRICTION: 0.98,
  DRIFT_FRICTION: 0.92,
  STEER_SPEED: 3,
  DRIFT_STEER_MULTIPLIER: 1.5,
  DRIFT_ANGLE_MAX: 0.8,
  DRIFT_THRESHOLD: 0.15,
  TIRE_WEAR_RATE: 0.05,
  TIRE_RECOVERY_RATE: 0.03,
  TIRE_RECOVERY_DELAY: 0.5,
  MINIMUM_SPEED: 0.1
} as const;

export const RECORDING_INTERVAL = 0.05;
export const MAX_HISTORY_RECORDS = 5;
export const STORAGE_KEY = 'drift_tracker_records';

export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
