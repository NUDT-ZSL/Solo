export interface Vector2 {
  x: number;
  y: number;
}

export interface MirrorData {
  x: number;
  y: number;
  angle: number;
  movable: boolean;
  width?: number;
  height?: number;
}

export interface PrismData {
  x: number;
  y: number;
  angle: number;
  movable: boolean;
  size?: number;
}

export type LightColor = 'yellow' | 'red' | 'green' | 'blue';

export interface SensorData {
  x: number;
  y: number;
  color: LightColor;
  radius?: number;
  gateId?: string;
}

export interface GateData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface MovingPlatformData {
  x: number;
  y: number;
  angle: number;
  path: Vector2[];
  speed: number;
  type: 'mirror' | 'prism';
}

export interface LevelData {
  id: number;
  name: string;
  emitter: {
    x: number;
    y: number;
    angle: number;
    color: LightColor;
  };
  receiver: {
    x: number;
    y: number;
    radius?: number;
  };
  mirrors: MirrorData[];
  prisms: PrismData[];
  sensors: SensorData[];
  gates: GateData[];
  movingPlatforms?: MovingPlatformData[];
}

export interface RaySegment {
  start: Vector2;
  end: Vector2;
  color: LightColor;
  alpha?: number;
}

export interface RayResult {
  segments: RaySegment[];
  hitSensors: { sensorId: number; color: LightColor }[];
  hitReceiver: boolean;
}

export interface DragState {
  isDragging: boolean;
  targetId: number;
  targetType: 'mirror' | 'prism';
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
}

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const MAX_REFLECTIONS = 15;
export const GRID_SIZE = 10;

export const COLORS = {
  yellow: 0xffd700,
  red: 0xff4444,
  green: 0x44ff44,
  blue: 0x4444ff,
  backgroundStart: 0x0a0e27,
  backgroundEnd: 0x1b0a3e,
  glass: 0x88ccff,
  glassBorder: 0xaaddff,
  sensorInactive: 0x555566,
  selectorRing: 0x66bbff,
};

export const COLOR_STRINGS: Record<LightColor, string> = {
  yellow: '#FFD700',
  red: '#FF4444',
  green: '#44FF44',
  blue: '#4444FF',
};
