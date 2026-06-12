import * as THREE from 'three';

export const generatePlanetTexture = (
  baseColor: string,
  textureType: 'gas' | 'rock' | 'ice' | 'sun',
  width: number = 512,
  height: number = 256
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const baseRgb = hexToRgb(baseColor);

  switch (textureType) {
    case 'sun':
      generateSunTexture(ctx, width, height, baseRgb);
      break;
    case 'gas':
      generateGasTexture(ctx, width, height, baseRgb);
      break;
    case 'rock':
      generateRockTexture(ctx, width, height, baseRgb);
      break;
    case 'ice':
      generateIceTexture(ctx, width, height, baseRgb);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

const generateSunTexture = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseRgb: { r: number; g: number; b: number }
) => {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const noise = simplex2(x * 0.01, y * 0.01) * 0.3 + simplex2(x * 0.03, y * 0.03) * 0.2;
      const intensity = 0.7 + noise * 0.3;
      
      const latFactor = Math.sin((y / height) * Math.PI);
      const r = Math.min(255, Math.floor((baseRgb.r + 80) * intensity * latFactor));
      const g = Math.min(255, Math.floor((baseRgb.g + 40) * intensity * latFactor));
      const b = Math.min(255, Math.floor(baseRgb.b * intensity * latFactor * 0.5));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const generateGasTexture = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseRgb: { r: number; g: number; b: number }
) => {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    const stripeNoise = simplex2(0, y * 0.05) * 0.5 + simplex2(0, y * 0.15) * 0.3;
    const stripeFactor = 0.6 + stripeNoise * 0.4;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const detailNoise = simplex2(x * 0.05, y * 0.05) * 0.2;
      const horizontalNoise = simplex2(x * 0.02, y * 0.08) * 0.15;
      
      const totalNoise = detailNoise + horizontalNoise;
      const intensity = stripeFactor + totalNoise;
      
      const r = Math.min(255, Math.max(0, Math.floor(baseRgb.r * intensity + totalNoise * 50)));
      const g = Math.min(255, Math.max(0, Math.floor(baseRgb.g * intensity + totalNoise * 40)));
      const b = Math.min(255, Math.max(0, Math.floor(baseRgb.b * intensity + totalNoise * 30)));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const generateRockTexture = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseRgb: { r: number; g: number; b: number }
) => {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const largeNoise = simplex2(x * 0.01, y * 0.01) * 0.4;
      const mediumNoise = simplex2(x * 0.04, y * 0.04) * 0.3;
      const smallNoise = simplex2(x * 0.1, y * 0.1) * 0.2;
      const craterNoise = Math.abs(simplex2(x * 0.02, y * 0.02)) * 0.3;
      
      const totalNoise = largeNoise + mediumNoise + smallNoise - craterNoise * 0.5;
      const intensity = 0.6 + totalNoise * 0.6;
      
      const r = Math.min(255, Math.max(0, Math.floor(baseRgb.r * intensity)));
      const g = Math.min(255, Math.max(0, Math.floor(baseRgb.g * intensity)));
      const b = Math.min(255, Math.max(0, Math.floor(baseRgb.b * intensity)));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const generateIceTexture = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseRgb: { r: number; g: number; b: number }
) => {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const noise = simplex2(x * 0.02, y * 0.02) * 0.3 + simplex2(x * 0.06, y * 0.06) * 0.2;
      const cloudNoise = Math.abs(simplex2(x * 0.015, y * 0.015)) * 0.25;
      
      const intensity = 0.75 + noise * 0.35;
      const cloudFactor = 1 + cloudNoise * 0.3;
      
      const r = Math.min(255, Math.max(0, Math.floor(baseRgb.r * intensity * cloudFactor)));
      const g = Math.min(255, Math.max(0, Math.floor(baseRgb.g * intensity * cloudFactor)));
      const b = Math.min(255, Math.max(0, Math.floor(baseRgb.b * intensity * cloudFactor + cloudNoise * 30)));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
};

const perm = new Uint8Array(512);
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + t * (b - a);
const grad = (hash: number, x: number, y: number) => {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
};

const simplex2 = (x: number, y: number): number => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);
  const A = perm[X] + Y;
  const AA = perm[A];
  const AB = perm[A + 1];
  const B = perm[X + 1] + Y;
  const BA = perm[B];
  const BB = perm[B + 1];
  return lerp(
    lerp(grad(perm[AA], x, y), grad(perm[BA], x - 1, y), u),
    lerp(grad(perm[AB], x, y - 1), grad(perm[BB], x - 1, y - 1), u),
    v
  );
};
