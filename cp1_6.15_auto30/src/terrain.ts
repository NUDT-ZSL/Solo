import * as THREE from 'three';

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    let n: number;
    let q: number;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      n = seed % (i + 1);
      q = p[i];
      p[i] = p[n];
      p[n] = q;
    }

    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;

    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    );
  }

  fbm(x: number, y: number, octaves: number = 6, lacunarity: number = 2, gain: number = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }
}

export interface TerrainParams {
  size: number;
  resolution: number;
  heightScale: number;
  frequency: number;
  colorBlend: number;
}

const LOW_COLOR = new THREE.Color('#2d5a27');
const MID_COLOR = new THREE.Color('#8b5e34');
const HIGH_COLOR = new THREE.Color('#ffffff');

export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export function getTerrainColor(height: number, minHeight: number, maxHeight: number, blend: number): THREE.Color {
  const normalizedHeight = (height - minHeight) / (maxHeight - minHeight);

  if (normalizedHeight < 0.5) {
    const t = normalizedHeight / 0.5;
    const smoothT = blend > 0 ? t * t * (3 - 2 * t) : t;
    return lerpColor(LOW_COLOR, MID_COLOR, smoothT * blend + t * (1 - blend));
  } else {
    const t = (normalizedHeight - 0.5) / 0.5;
    const smoothT = blend > 0 ? t * t * (3 - 2 * t) : t;
    return lerpColor(MID_COLOR, HIGH_COLOR, smoothT * blend + t * (1 - blend));
  }
}

export function generateTerrainGeometry(params: TerrainParams): {
  geometry: THREE.BufferGeometry;
  minHeight: number;
  maxHeight: number;
  heights: number[];
} {
  const { size, resolution, heightScale, frequency, colorBlend } = params;
  const noise = new PerlinNoise();

  const segments = resolution - 1;
  const geometry = new THREE.BufferGeometry();

  const vertices: number[] = [];
  const colors: number[] = [];
  const heights: number[] = [];

  const step = size / segments;
  const halfSize = size / 2;

  let minHeight = Infinity;
  let maxHeight = -Infinity;

  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      const px = x * step - halfSize;
      const pz = z * step - halfSize;

      const noiseValue = noise.fbm(px * frequency, pz * frequency, 6, 2, 0.5);
      const height = noiseValue * heightScale;

      heights.push(height);
      vertices.push(px, height, pz);

      if (height < minHeight) minHeight = height;
      if (height > maxHeight) maxHeight = height;
    }
  }

  for (let i = 0; i < heights.length; i++) {
    const color = getTerrainColor(heights[i], minHeight, maxHeight, colorBlend);
    colors.push(color.r, color.g, color.b);
  }

  const indices: number[] = [];
  for (let z = 0; z < segments; z++) {
    for (let x = 0; x < segments; x++) {
      const topLeft = z * resolution + x;
      const topRight = topLeft + 1;
      const bottomLeft = (z + 1) * resolution + x;
      const bottomRight = bottomLeft + 1;

      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return { geometry, minHeight, maxHeight, heights };
}

export function createWater(size: number, y: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, 64, 64);
  const material = new THREE.MeshPhongMaterial({
    color: '#1a5276',
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    shininess: 100
  });

  const water = new THREE.Mesh(geometry, material);
  water.rotation.x = -Math.PI / 2;
  water.position.y = y;

  return water;
}

export function updateWater(water: THREE.Mesh, time: number): void {
  const positions = water.geometry.attributes.position;
  const arr = positions.array as Float32Array;
  const waveAmplitude = 0.05;
  const waveFrequency = Math.PI;

  for (let i = 0; i < positions.count; i++) {
    const x = arr[i * 3];
    const z = arr[i * 3 + 2];
    arr[i * 3 + 1] = Math.sin(x * 2 + time * waveFrequency) * waveAmplitude +
                     Math.cos(z * 2 + time * waveFrequency) * waveAmplitude * 0.5;
  }

  positions.needsUpdate = true;
  water.geometry.computeVertexNormals();
}
