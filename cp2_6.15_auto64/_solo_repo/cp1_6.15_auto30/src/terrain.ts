import * as THREE from 'three';

class PerlinNoise {
  private permutation: Uint8Array;

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): Uint8Array {
    const p = new Uint8Array(512);
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      base[i] = i;
    }

    let n: number;
    let q: number;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      n = seed % (i + 1);
      q = base[i];
      base[i] = base[n];
      base[n] = q;
    }

    for (let i = 0; i < 512; i++) {
      p[i] = base[i & 255];
    }

    return p;
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

export interface TerrainData {
  geometry: THREE.BufferGeometry;
  minHeight: number;
  maxHeight: number;
  heights: Float32Array;
  positions: Float32Array;
  colors: Float32Array;
}

const LOW_R = 0x2d / 255;
const LOW_G = 0x5a / 255;
const LOW_B = 0x27 / 255;
const MID_R = 0x8b / 255;
const MID_G = 0x5e / 255;
const MID_B = 0x34 / 255;
const HIGH_R = 1.0;
const HIGH_G = 1.0;
const HIGH_B = 1.0;

const LOW_COLOR = new THREE.Color('#2d5a27');
const MID_COLOR = new THREE.Color('#8b5e34');
const HIGH_COLOR = new THREE.Color('#ffffff');

const _tmpColor = new THREE.Color();

export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export function getTerrainColor(height: number, minHeight: number, maxHeight: number, blend: number, out?: THREE.Color): THREE.Color {
  const target = out || new THREE.Color();
  const normalizedHeight = (height - minHeight) / (maxHeight - minHeight);

  let t: number;
  let smoothT: number;
  if (normalizedHeight < 0.5) {
    t = normalizedHeight / 0.5;
    smoothT = blend > 0 ? t * t * (3 - 2 * t) : t;
    const finalT = smoothT * blend + t * (1 - blend);
    target.setRGB(
      LOW_R + (MID_R - LOW_R) * finalT,
      LOW_G + (MID_G - LOW_G) * finalT,
      LOW_B + (MID_B - LOW_B) * finalT
    );
  } else {
    t = (normalizedHeight - 0.5) / 0.5;
    smoothT = blend > 0 ? t * t * (3 - 2 * t) : t;
    const finalT = smoothT * blend + t * (1 - blend);
    target.setRGB(
      MID_R + (HIGH_R - MID_R) * finalT,
      MID_G + (HIGH_G - MID_G) * finalT,
      MID_B + (HIGH_B - MID_B) * finalT
    );
  }

  return target;
}

export function getWaterLevel(minHeight: number, maxHeight: number): number {
  return minHeight + (maxHeight - minHeight) * 0.2;
}

class TerrainBufferPool {
  private heightsMap: Map<number, Float32Array> = new Map();
  private positionsMap: Map<number, Float32Array> = new Map();
  private colorsMap: Map<number, Float32Array> = new Map();
  private indicesMap: Map<number, Uint32Array> = new Map();

  acquireHeights(resolution: number): Float32Array {
    const key = resolution;
    let buf = this.heightsMap.get(key);
    if (!buf) {
      buf = new Float32Array(resolution * resolution);
      this.heightsMap.set(key, buf);
    }
    return buf;
  }

  acquirePositions(resolution: number): Float32Array {
    const key = resolution;
    let buf = this.positionsMap.get(key);
    if (!buf) {
      buf = new Float32Array(resolution * resolution * 3);
      this.positionsMap.set(key, buf);
    }
    return buf;
  }

  acquireColors(resolution: number): Float32Array {
    const key = resolution;
    let buf = this.colorsMap.get(key);
    if (!buf) {
      buf = new Float32Array(resolution * resolution * 3);
      this.colorsMap.set(key, buf);
    }
    return buf;
  }

  acquireIndices(resolution: number): Uint32Array {
    const key = resolution;
    let buf = this.indicesMap.get(key);
    if (!buf) {
      const segments = resolution - 1;
      buf = new Uint32Array(segments * segments * 6);
      let idx = 0;
      for (let z = 0; z < segments; z++) {
        for (let x = 0; x < segments; x++) {
          const topLeft = z * resolution + x;
          const topRight = topLeft + 1;
          const bottomLeft = (z + 1) * resolution + x;
          const bottomRight = bottomLeft + 1;
          buf[idx++] = topLeft;
          buf[idx++] = bottomLeft;
          buf[idx++] = topRight;
          buf[idx++] = topRight;
          buf[idx++] = bottomLeft;
          buf[idx++] = bottomRight;
        }
      }
      this.indicesMap.set(key, buf);
    }
    return buf;
  }
}

const bufferPool = new TerrainBufferPool();
const noiseInstance = new PerlinNoise();

export function generateTerrainGeometry(params: TerrainParams): TerrainData {
  const { size, resolution, heightScale, frequency, colorBlend } = params;

  const heights = bufferPool.acquireHeights(resolution);
  const positions = bufferPool.acquirePositions(resolution);
  const colors = bufferPool.acquireColors(resolution);
  const indices = bufferPool.acquireIndices(resolution);

  const segments = resolution - 1;
  const step = size / segments;
  const halfSize = size / 2;

  let minHeight = Infinity;
  let maxHeight = -Infinity;

  let posIdx = 0;
  let heightIdx = 0;
  for (let z = 0; z < resolution; z++) {
    const pz = z * step - halfSize;
    for (let x = 0; x < resolution; x++) {
      const px = x * step - halfSize;
      const noiseValue = noiseInstance.fbm(px * frequency, pz * frequency, 6, 2, 0.5);
      const height = noiseValue * heightScale;

      heights[heightIdx++] = height;
      positions[posIdx++] = px;
      positions[posIdx++] = height;
      positions[posIdx++] = pz;

      if (height < minHeight) minHeight = height;
      if (height > maxHeight) maxHeight = height;
    }
  }

  let colorIdx = 0;
  for (let i = 0; i < heights.length; i++) {
    getTerrainColor(heights[i], minHeight, maxHeight, colorBlend, _tmpColor);
    colors[colorIdx++] = _tmpColor.r;
    colors[colorIdx++] = _tmpColor.g;
    colors[colorIdx++] = _tmpColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  return { geometry, minHeight, maxHeight, heights, positions, colors };
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

export function updateWaterLevel(water: THREE.Mesh, y: number): void {
  water.position.y = y;
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
