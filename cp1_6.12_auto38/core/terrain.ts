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
  const uvs = geometry.attributes.uv;

  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      const idx = z * TERRAIN_RESOLUTION + x;
      const scaledHeight = scaledHeightMap[z][x];

      positions.setY(idx, scaledHeight);

      const u = x / (TERRAIN_RESOLUTION - 1);
      const v = z / (TERRAIN_RESOLUTION - 1);
      uvs.setXY(idx, u * 8, v * 8);
    }
  }

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

  const gradient = ctx.createLinearGradient(0, size, 0, 0);
  gradient.addColorStop(0.00, '#2d5a27');
  gradient.addColorStop(0.15, '#356a2c');
  gradient.addColorStop(0.30, '#3d7a30');
  gradient.addColorStop(0.45, '#4a8a3a');
  gradient.addColorStop(0.60, '#5a9a44');
  gradient.addColorStop(0.75, '#6bab4e');
  gradient.addColorStop(0.90, '#7ec258');
  gradient.addColorStop(1.00, '#92d468');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const n = Math.random();
      const alpha = 0.15 + n * 0.2;
      const shade = Math.floor(40 + n * 40);
      ctx.fillStyle = `rgba(${shade + 10}, ${shade + 50}, ${shade}, ${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const grassBladeColors = [
    '#2d5a27',
    '#3d7a30',
    '#4a8a3a',
    '#5a9a44',
    '#6bab4e',
    '#7ec258',
    '#55a844',
    '#488838',
    '#72c060'
  ];

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const bladeHeight = 2 + Math.random() * 10;
    const bladeWidth = 0.5 + Math.random() * 2.0;
    const color = grassBladeColors[Math.floor(Math.random() * grassBladeColors.length)];

    ctx.strokeStyle = color;
    ctx.lineWidth = bladeWidth;
    ctx.lineCap = 'round';

    const angle = (Math.random() - 0.5) * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.sin(angle) * 2, y - bladeHeight * 0.5, x + Math.sin(angle) * 1.5, y - bladeHeight);
    ctx.stroke();
  }

  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 0.4 + Math.random() * 1.8;
    const color = grassBladeColors[Math.floor(Math.random() * grassBladeColors.length)];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 250; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(180, 220, 100, ${0.12 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.3 + Math.random() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 8;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}
