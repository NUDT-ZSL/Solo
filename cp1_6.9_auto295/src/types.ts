export interface FragmentData {
  id: number;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  hue: number;
  targetX: number;
  targetY: number;
  targetRotation: number;
}

export interface PuzzleFragment extends FragmentData {
  collected: boolean;
  snapped: boolean;
  snapToId: number | null;
}

export interface GameLevel {
  level: number;
  fragmentCount: number;
  sceneWidth: number;
  sceneHeight: number;
  lightRadius: number;
}

export interface UnderflowZone {
  x: number;
  y: number;
  radius: number;
}

export const GAME_CONFIG = {
  BASE_SCENE_WIDTH: 1920,
  BASE_SCENE_HEIGHT: 1080,
  BASE_LIGHT_RADIUS: 150,
  BASE_FRAGMENT_COUNT: 8,
  FRAGMENT_WIDTH: 120,
  FRAGMENT_HEIGHT: 80,
  PLAYER_SPEED: 220,
  PLAYER_RADIUS: 16,
  PICKUP_DISTANCE: 30,
  TOTAL_LEVELS: 3,
  FRAGMENT_HUE_MIN: 35,
  FRAGMENT_HUE_MAX: 45,
  FRAGMENT_SATURATION: 60,
  FRAGMENT_ALPHA: 0.7,
  UNDERFLOW_RADIUS: 100,
  UNDERFLOW_DAMAGE_INTERVAL: 500,
  UNDERFLOW_LIGHT_DAMAGE: 10,
  MIN_LIGHT_RADIUS: 20,
  PORTAL_RADIUS: 60,
  PORTAL_JELLY_COUNT: 20,
  EASING: 'Quad.easeInOut' as const,
  SNAP_DISTANCE: 8,
  SNAP_ANGLE: 5,
  SNAP_HALO_WIDTH: 4,
  SNAP_HALO_ALPHA: 0.6,
  ROTATION_STEP: 15,
  PARTICLE_COUNT_LIMIT: 500,
  TARGET_FPS: 60
};

export function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return parseInt(`${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`, 16);
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function angleDiff(a: number, b: number): number {
  let diff = ((a - b) % 360 + 540) % 360 - 180;
  return Math.abs(diff);
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}
