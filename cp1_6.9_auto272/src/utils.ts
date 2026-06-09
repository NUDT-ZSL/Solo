import * as THREE from 'three';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

export function hslToRgb(h: number, s: number, l: number): THREE.Color {
  const color = new THREE.Color();
  color.setHSL(h / 360, s / 100, l / 100);
  return color;
}

export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  const result = new THREE.Color();
  result.copy(color1);
  result.lerp(color2, t);
  return result;
}

export function distance2D(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distance3D(v1: THREE.Vector3, v2: THREE.Vector3): number {
  return v1.distanceTo(v2);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function createGradientTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createCircleTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, size / 2 - 4,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const COLORS = {
  START_WARM: hslToRgb(50, 90, 100),
  END_COOL: hslToRgb(210, 80, 90)
};

export const CONFIG = {
  PARTICLES_PER_BAND: 200,
  PARTICLE_MIN_SIZE: 2,
  PARTICLE_MAX_SIZE: 6,
  FLOAT_AMPLITUDE: 2,
  FLOAT_PERIOD_MIN: 1,
  FLOAT_PERIOD_MAX: 2,
  SPEED_THRESHOLD: 200,
  PARTICLE_SPACING_SLOW: 5,
  PARTICLE_SPACING_FAST: 10,
  TRAIL_LENGTH_SLOW: 10,
  TRAIL_LENGTH_FAST: 25,
  ROTATION_SPEED: 0.01,
  BREATH_SHRINK_DURATION: 0.5,
  BREATH_CYCLE: 2,
  BREATH_SCALE: 0.8,
  CROSS_THRESHOLD: 15,
  NODE_SIZE: 20,
  NODE_BRIGHTNESS_BOOST: 1.3,
  RIPPLE_START_RADIUS: 20,
  RIPPLE_END_RADIUS: 80,
  RIPPLE_DURATION: 0.6,
  RIPPLE_START_OPACITY: 0.6,
  LINK_DISTANCE: 50,
  LINE_WIDTH: 1,
  LINE_OPACITY: 0.4,
  MAX_PARTICLES: 2000,
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 2,
  ZOOM_SMOOTH: 0.3
};
