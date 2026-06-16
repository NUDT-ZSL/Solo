export const COLORS = {
  GROUND: 0x2C3E50,
  GRID: 0xBDC3C7,
  WATER: 0x3498DB,
  DRAINAGE: 0x27AE60,
  GAS: 0xE67E22,
  POWER: 0xE74C3C,
  GROUND_OPACITY: 0.6,
  MARKER_OPACITY: 0.4
} as const;

export const PIPE_CONFIG = {
  water: { color: COLORS.WATER, diameter: 2, label: '供水管道' },
  drainage: { color: COLORS.DRAINAGE, diameter: 3, label: '排水管道' },
  gas: { color: COLORS.GAS, diameter: 1.5, label: '燃气管道' },
  power: { color: COLORS.POWER, diameter: 1.2, label: '电力管道' }
} as const;

export type PipeType = keyof typeof PIPE_CONFIG;

export const SCENE_CONFIG = {
  GROUND_SIZE: 200,
  GRID_DIVISIONS: 40,
  MIN_DEPTH: 20,
  MAX_DEPTH: 40,
  MARKER_SPACING: 10,
  MARKER_RADIUS: 0.5,
  CURVE_SEGMENTS: 100,
  TUBULAR_SEGMENTS: 64
} as const;

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function generatePipeId(type: PipeType, index: number): string {
  const prefix = type.charAt(0).toUpperCase();
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

export function hexToString(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

export function depthToString(depth: number): string {
  return `${depth.toFixed(1)}m`;
}

export function diameterToString(diameter: number): string {
  return `${diameter.toFixed(1)}m`;
}
