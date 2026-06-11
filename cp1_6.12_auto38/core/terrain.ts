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
  minHeight: number;
  maxHeight: number;
  vertexCount: number;
}

export const TERRAIN_SIZE = 20;
export const TERRAIN_RESOLUTION = 128;

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
  const halfSize = TERRAIN_SIZE / 2;

  const heightMap: number[][] = [];
  const rawHeights: number[] = [];

  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    heightMap[z] = [];
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

      heightMap[z][x] = height;
      rawHeights.push(height);
    }
  }

  rawHeights.sort((a, b) => a - b);
  const minHeight = rawHeights[0];
  const maxHeight = rawHeights[rawHeights.length - 1];
  const heightRange = maxHeight - minHeight || 1;

  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      heightMap[z][x] = (heightMap[z][x] - minHeight) / heightRange;
    }
  }

  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const uvs = geometry.attributes.uv;

  const bottomColor = new THREE.Color(0x2d5a27);
  const topColor = new THREE.Color(0x7ec850);
  const tmpColor = new THREE.Color();

  const scaledHeightMap: number[][] = [];

  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    scaledHeightMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      const idx = z * TERRAIN_RESOLUTION + x;
      const normalizedHeight = heightMap[z][x];
      const scaledHeight = normalizedHeight * 4;
      scaledHeightMap[z][x] = scaledHeight;

      positions.setY(idx, scaledHeight);

      tmpColor.copy(bottomColor).lerp(topColor, normalizedHeight);
      colors[idx * 3] = tmpColor.r;
      colors[idx * 3 + 1] = tmpColor.g;
      colors[idx * 3 + 2] = tmpColor.b;

      const u = x / (TERRAIN_RESOLUTION - 1);
      const v = z / (TERRAIN_RESOLUTION - 1);
      uvs.setXY(idx, u * 10, v * 10);
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return {
    geometry,
    heightMap: scaledHeightMap,
    minHeight: 0,
    maxHeight: 4,
    vertexCount: positions.count
  };
}

export function createGrassTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3a7a32';
  ctx.fillRect(0, 0, size, size);

  const grassColors = ['#4a8f3c', '#5ea04a', '#6bb558', '#3a7a32', '#2d6a25'];

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const grassHeight = 3 + Math.random() * 6;
    const grassWidth = 1 + Math.random() * 2;
    const color = grassColors[Math.floor(Math.random() * grassColors.length)];

    ctx.strokeStyle = color;
    ctx.lineWidth = grassWidth;
    ctx.lineCap = 'round';

    const angle = (Math.random() - 0.5) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(angle) * 2, y - grassHeight);
    ctx.stroke();
  }

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 1 + Math.random() * 2;
    ctx.fillStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.repeat.set(10, 10);
  texture.needsUpdate = true;

  return texture;
}
