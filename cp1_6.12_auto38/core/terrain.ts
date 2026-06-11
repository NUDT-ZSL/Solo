import { createNoise2D } from 'simplex-noise';
import * as THREE from 'three';

export interface TerrainParams {
  noiseFrequency: number;
  flatness: number;
  seed: number;
}

export interface TerrainResult {
  geometry: THREE.BufferGeometry;
  heightMap: number[][];
  normalizedHeightMap: number[][];
  minHeight: number;
  maxHeight: number;
  vertexCount: number;
  treeVertexBudget: number;
}

export const TERRAIN_SIZE = 20;
export const TERRAIN_RESOLUTION = 128;
export const MAX_TOTAL_VERTICES = 50000;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function generateTerrain(params: TerrainParams): TerrainResult {
  const { noiseFrequency, flatness, seed } = params;
  const rand = seededRandom(seed);
  const noise2D = createNoise2D(rand);

  const segments = TERRAIN_RESOLUTION - 1;

  const rawHeightMap: number[][] = [];
  const rawHeights: number[] = [];

  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    rawHeightMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      const nx = x / TERRAIN_RESOLUTION;
      const nz = z / TERRAIN_RESOLUTION;

      let height = 0;
      let amplitude = 1;
      let frequency = noiseFrequency;
      let maxAmplitude = 0;

      for (let octave = 0; octave < 5; octave++) {
        height += noise2D(nx * frequency, nz * frequency) * amplitude;
        maxAmplitude += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
      }

      height = (height / maxAmplitude + 1) * 0.5;
      height = Math.pow(height, 1.0 / flatness);

      rawHeightMap[z][x] = height;
      rawHeights.push(height);
    }
  }

  rawHeights.sort((a, b) => a - b);
  const minRawHeight = rawHeights[0];
  const maxRawHeight = rawHeights[rawHeights.length - 1];
  const heightRange = maxRawHeight - minRawHeight || 1;

  const normalizedHeightMap: number[][] = [];
  const scaledHeightMap: number[][] = [];
  const actualMaxHeight = 4;

  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    normalizedHeightMap[z] = [];
    scaledHeightMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      const nh = (rawHeightMap[z][x] - minRawHeight) / heightRange;
      normalizedHeightMap[z][x] = nh;
      scaledHeightMap[z][x] = nh * actualMaxHeight;
    }
  }

  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const uvs = geometry.attributes.uv;

  const bottomColor = new THREE.Color(0x2d5a27);
  const midColor = new THREE.Color(0x4a8a3c);
  const topColor = new THREE.Color(0x7ec850);
  const tmpColor = new THREE.Color();

  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      const idx = z * TERRAIN_RESOLUTION + x;
      const nh = normalizedHeightMap[z][x];
      const scaledHeight = scaledHeightMap[z][x];

      positions.setY(idx, scaledHeight);

      const lowerT = smootherstep(0.0, 0.5, nh);
      const upperT = smootherstep(0.4, 1.0, nh);
      tmpColor.copy(bottomColor).lerp(midColor, lowerT);
      tmpColor.lerp(topColor, upperT);

      const colorBoost = 0.65;
      tmpColor.r = Math.min(1, tmpColor.r * (1 + colorBoost * 0.1));
      tmpColor.g = Math.min(1, tmpColor.g * (1 + colorBoost * 0.15));
      tmpColor.b = Math.min(1, tmpColor.b * (1 + colorBoost * 0.05));

      colors[idx * 3] = tmpColor.r;
      colors[idx * 3 + 1] = tmpColor.g;
      colors[idx * 3 + 2] = tmpColor.b;

      const u = x / (TERRAIN_RESOLUTION - 1);
      const v = z / (TERRAIN_RESOLUTION - 1);
      uvs.setXY(idx, u * 8, v * 8);
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const terrainVertexCount = positions.count;
  const treeVertexBudget = MAX_TOTAL_VERTICES - terrainVertexCount;

  return {
    geometry,
    heightMap: scaledHeightMap,
    normalizedHeightMap,
    minHeight: 0,
    maxHeight: actualMaxHeight,
    vertexCount: terrainVertexCount,
    treeVertexBudget
  };
}

export function createGrassTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseGradient = ctx.createLinearGradient(0, 0, 0, size);
  baseGradient.addColorStop(0, '#3d7a34');
  baseGradient.addColorStop(0.5, '#4a8f3c');
  baseGradient.addColorStop(1, '#356a2c');
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const n = ((Math.sin(x * 0.1) + Math.cos(y * 0.15)) * 0.5 + 0.5);
      const shade = Math.floor(30 + n * 30);
      ctx.fillStyle = `rgba(${40 + shade}, ${90 + shade}, ${40 + shade * 0.5}, 0.35)`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  const grassColors = [
    'rgba(74, 143, 60, 0.9)',
    'rgba(94, 160, 74, 0.9)',
    'rgba(107, 181, 88, 0.9)',
    'rgba(58, 122, 50, 0.85)',
    'rgba(45, 106, 37, 0.85)',
    'rgba(120, 190, 95, 0.7)',
    'rgba(65, 130, 52, 0.9)'
  ];

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const grassHeight = 2 + Math.random() * 8;
    const grassWidth = 0.8 + Math.random() * 2.2;
    const color = grassColors[Math.floor(Math.random() * grassColors.length)];

    ctx.strokeStyle = color;
    ctx.lineWidth = grassWidth;
    ctx.lineCap = 'round';

    const angle = (Math.random() - 0.5) * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(angle) * 2.5, y - grassHeight);
    ctx.stroke();
  }

  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 0.8 + Math.random() * 2.5;
    const color = grassColors[Math.floor(Math.random() * grassColors.length)];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(255, 255, 200, ${0.1 + Math.random() * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 8;
  texture.repeat.set(8, 8);
  texture.needsUpdate = true;

  return texture;
}
