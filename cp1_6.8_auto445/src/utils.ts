import * as THREE from 'three';

export interface ColorTheme {
  name: string;
  label: string;
  particles: [THREE.Color, THREE.Color];
  bgTop: string;
  bgBottom: string;
  glowColor: string;
  filamentColor: string;
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  nebula: {
    name: 'nebula',
    label: '星云',
    particles: [new THREE.Color('#ff2d95'), new THREE.Color('#00e5ff')],
    bgTop: '#0a0a2e',
    bgBottom: '#1a0a2e',
    glowColor: '#aa44ff',
    filamentColor: '#8844cc',
  },
  aurora: {
    name: 'aurora',
    label: '极光',
    particles: [new THREE.Color('#00ff88'), new THREE.Color('#4488ff')],
    bgTop: '#020e1a',
    bgBottom: '#0a1a0a',
    glowColor: '#22ffaa',
    filamentColor: '#22cc88',
  },
  lava: {
    name: 'lava',
    label: '熔岩',
    particles: [new THREE.Color('#ff4400'), new THREE.Color('#ffcc00')],
    bgTop: '#1a0800',
    bgBottom: '#0a0400',
    glowColor: '#ff6600',
    filamentColor: '#cc4400',
  },
  ocean: {
    name: 'ocean',
    label: '深海',
    particles: [new THREE.Color('#0044ff'), new THREE.Color('#00ffcc')],
    bgTop: '#000a1a',
    bgBottom: '#001020',
    glowColor: '#0066ff',
    filamentColor: '#0044aa',
  },
};

export function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function createGradientTexture(topColor: string, bottomColor: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
