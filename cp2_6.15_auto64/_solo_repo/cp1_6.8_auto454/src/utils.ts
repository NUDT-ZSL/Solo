import * as THREE from 'three';

export const MIN_PARTICLES = 1000;
export const MAX_PARTICLES = 8000;
export const DEFAULT_PARTICLES = 4000;
export const MIN_WAVE_AMP = 0.1;
export const MAX_WAVE_AMP = 3.0;
export const DEFAULT_WAVE_AMP = 1.0;
export const FIELD_SIZE = 60;
export const PARTICLE_SIZE = 0.35;
export const CONNECTION_DIST = 2.8;
export const MAX_CONNECTIONS = 40000;
export const RIPPLE_MAX = 8;
export const RIPPLE_SPEED = 12.0;
export const RIPPLE_LIFETIME = 3.0;
export const RIPPLE_RADIUS = 18.0;

export type ThemeName = 'phantom' | 'aurora' | 'lava' | 'abyss';

export interface ColorTheme {
  name: ThemeName;
  label: string;
  colors: THREE.Color[];
  warmColor: THREE.Color;
  bgColor: [number, number];
}

export const THEMES: Record<ThemeName, ColorTheme> = {
  phantom: {
    name: 'phantom',
    label: '幻彩',
    colors: [
      new THREE.Color('#ff2d7b'),
      new THREE.Color('#b44dff'),
      new THREE.Color('#00e5ff'),
      new THREE.Color('#ffd700'),
    ],
    warmColor: new THREE.Color('#ff6b35'),
    bgColor: [0.039, 0.106],
  },
  aurora: {
    name: 'aurora',
    label: '极光',
    colors: [
      new THREE.Color('#00ff88'),
      new THREE.Color('#00ccff'),
      new THREE.Color('#8855ff'),
      new THREE.Color('#00ffcc'),
    ],
    warmColor: new THREE.Color('#ffaa00'),
    bgColor: [0.02, 0.08],
  },
  lava: {
    name: 'lava',
    label: '熔岩',
    colors: [
      new THREE.Color('#ff4400'),
      new THREE.Color('#ff8800'),
      new THREE.Color('#ffcc00'),
      new THREE.Color('#ff2200'),
    ],
    warmColor: new THREE.Color('#ffffff'),
    bgColor: [0.06, 0.04],
  },
  abyss: {
    name: 'abyss',
    label: '深海',
    colors: [
      new THREE.Color('#0044aa'),
      new THREE.Color('#0088cc'),
      new THREE.Color('#00ccdd'),
      new THREE.Color('#003388'),
    ],
    warmColor: new THREE.Color('#00ffcc'),
    bgColor: [0.01, 0.06],
  },
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function getThemeColor(
  theme: ColorTheme,
  t: number,
  seed: number
): THREE.Color {
  const idx = (seed * (theme.colors.length - 1)) | 0;
  const next = (idx + 1) % theme.colors.length;
  const localT = seed * (theme.colors.length - 1) - idx;
  const c = new THREE.Color();
  c.lerpColors(theme.colors[idx], theme.colors[next], localT);
  return c;
}
