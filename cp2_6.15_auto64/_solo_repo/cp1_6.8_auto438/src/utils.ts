export interface GridNode {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  cut: boolean;
  cutTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Theme {
  name: string;
  startColor: string;
  endColor: string;
}

export interface Config {
  density: number;
  distortionStrength: number;
  theme: Theme;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export const THEMES: Record<string, Theme> = {
  aurora: { name: '极光', startColor: '#00ff88', endColor: '#8b5cf6' },
  lava: { name: '熔岩', startColor: '#ff4500', endColor: '#ffd700' },
  ocean: { name: '深海', startColor: '#006994', endColor: '#00ffff' },
  neon: { name: '霓虹', startColor: '#ff00ff', endColor: '#00ffff' },
};

export const DEFAULT_CONFIG: Config = {
  density: 10,
  distortionStrength: 0.5,
  theme: THEMES.aurora,
};

export const DENSITY_MIN = 5;
export const DENSITY_MAX = 20;
export const STRENGTH_MIN = 0.1;
export const STRENGTH_MAX = 1.0;
export const MAX_PARTICLES = 200;
export const SPRING_STIFFNESS = 0.03;
export const DAMPING = 0.9;
export const INFLUENCE_RADIUS = 150;
export const CUT_RECONNECT_DELAY = 3000;
export const GLOW_BLUR = 8;
export const LINE_ALPHA = 0.6;
export const TRAIL_ALPHA = 0.15;
export const FLOW_SPEED = 0.0008;

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function rgbToString(rgb: Rgb, alpha: number = 1): string {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

export function lerpColor(c1: Rgb, c2: Rgb, t: number): Rgb {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
