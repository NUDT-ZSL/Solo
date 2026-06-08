import * as THREE from 'three';

export const DEFAULT_PARTICLE_COUNT = 2000;
export const MIN_PARTICLE_COUNT = 500;
export const MAX_PARTICLE_COUNT = 5000;
export const DEFAULT_FLOW_SPEED = 0.8;
export const MIN_FLOW_SPEED = 0.1;
export const MAX_FLOW_SPEED = 2.0;
export const VEIN_CONNECT_DIST = 1.8;
export const BURST_FORCE = 6.0;
export const BURST_DURATION = 0.6;
export const CONVERGE_DURATION = 1.2;
export const SCENE_RADIUS = 12.0;

export interface ColorTheme {
  name: string;
  center: THREE.Color;
  edge: THREE.Color;
  burst: THREE.Color;
  line: THREE.Color;
  ambient: THREE.Color;
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  earthfire: {
    name: '地火',
    center: new THREE.Color(0xff7722),
    edge: new THREE.Color(0x3355ff),
    burst: new THREE.Color(0xff4400),
    line: new THREE.Color(0xff5500),
    ambient: new THREE.Color(0x331100),
  },
  iceabyss: {
    name: '冰渊',
    center: new THREE.Color(0x44ddff),
    edge: new THREE.Color(0x002266),
    burst: new THREE.Color(0x88eeff),
    line: new THREE.Color(0x2299cc),
    ambient: new THREE.Color(0x001122),
  },
  starmarrow: {
    name: '星髓',
    center: new THREE.Color(0xffdd44),
    edge: new THREE.Color(0x8844ff),
    burst: new THREE.Color(0xffee66),
    line: new THREE.Color(0xccaa33),
    ambient: new THREE.Color(0x221100),
  },
  darktide: {
    name: '暗潮',
    center: new THREE.Color(0x44ff88),
    edge: new THREE.Color(0x113322),
    burst: new THREE.Color(0x22ff66),
    line: new THREE.Color(0x118844),
    ambient: new THREE.Color(0x001108),
  },
};

export const THEME_KEYS = Object.keys(COLOR_THEMES);

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

export function randomInSphere(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2.0 * Math.PI * u;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = radius * Math.cbrt(Math.random());
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

export function randomOnSphere(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2.0 * Math.PI * u;
  const phi = Math.acos(2.0 * v - 1.0);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

export function createGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.4, 'rgba(255,220,180,0.4)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createBurstTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,200,100,1.0)');
  gradient.addColorStop(0.2, 'rgba(255,120,40,0.7)');
  gradient.addColorStop(0.5, 'rgba(255,60,10,0.3)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
