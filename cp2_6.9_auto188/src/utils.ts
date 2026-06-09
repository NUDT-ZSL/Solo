import * as THREE from 'three';

export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomColorHSL(): THREE.Color {
  const colors = [
    new THREE.Color('#FF69B4'),
    new THREE.Color('#8A2BE2'),
    new THREE.Color('#4169E1'),
    new THREE.Color('#00CED1')
  ];
  const t = Math.random();
  const idx = Math.floor(t * (colors.length - 1));
  const nextIdx = Math.min(idx + 1, colors.length - 1);
  const localT = (t * (colors.length - 1)) % 1;
  return colors[idx].clone().lerp(colors[nextIdx], localT);
}

export function computeAverageColor(colors: Float32Array): THREE.Color {
  let r = 0, g = 0, b = 0;
  const count = colors.length / 3;
  for (let i = 0; i < count; i++) {
    r += colors[i * 3];
    g += colors[i * 3 + 1];
    b += colors[i * 3 + 2];
  }
  return new THREE.Color(r / count, g / count, b / count);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

let lastTime = performance.now();
let frameCount = 0;
let fps = 60;

export function getFPS(): number {
  return fps;
}

export function updateFPS(): void {
  const now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = now;
  }
}
