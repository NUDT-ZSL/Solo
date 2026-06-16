import * as THREE from 'three';

export interface NoiseParams {
  frequency: number;
  amplitude: number;
  octaves: number;
}

export interface TerrainStats {
  maxHeight: number;
  minHeight: number;
  vertexCount: number;
}

export type TerrainPreset = 'mountain' | 'plain' | 'hill' | 'basin';

export const TERRAIN_PRESETS: Record<TerrainPreset, NoiseParams> = {
  mountain: { frequency: 0.025, amplitude: 5.0, octaves: 6 },
  plain: { frequency: 0.015, amplitude: 1.2, octaves: 2 },
  hill: { frequency: 0.035, amplitude: 2.5, octaves: 4 },
  basin: { frequency: 0.020, amplitude: 3.5, octaves: 5 }
};

export const TRANSITION_DURATION = 500;
export const EXPAND_DURATION = 300;

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
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
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);
    const p = this.permutation;
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];
    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v
    );
  }
}

const COLOR_STOPS = [
  { t: 0.0, color: new THREE.Color('#2E8B57') },
  { t: 0.35, color: new THREE.Color('#556B2F') },
  { t: 0.55, color: new THREE.Color('#8B4513') },
  { t: 0.75, color: new THREE.Color('#A0522D') },
  { t: 0.92, color: new THREE.Color('#D2B48C') },
  { t: 1.0, color: new THREE.Color('#F5DEB3') }
];

function getGradientColor(t: number): THREE.Color {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    if (t <= COLOR_STOPS[i].t) {
      const prev = COLOR_STOPS[i - 1];
      const curr = COLOR_STOPS[i];
      const range = curr.t - prev.t;
      const localT = range === 0 ? 0 : (t - prev.t) / range;
      return prev.color.clone().lerp(curr.color, localT);
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].color.clone();
}

export class TerrainGenerator {
  private noise: PerlinNoise;
  private size: number;
  private segments: number;
  private mesh: THREE.Mesh | null = null;
  private baseHeights: Float32Array | null = null;
  private targetColors: Float32Array | null = null;
  private oldColors: Float32Array | null = null;
  private animationProgress: number = 1;
  private animationTarget: number = 1;
  private animationStartTime: number = 0;
  private transitionProgress: number = 1;
  private transitionTarget: number = 1;
  private transitionStartTime: number = 0;
  private oldHeights: Float32Array | null = null;
  private newHeights: Float32Array | null = null;
  private snowNoisePattern: Float32Array | null = null;
  private currentParams: NoiseParams;
  public stats: TerrainStats = { maxHeight: 0, minHeight: 0, vertexCount: 0 };
  public onTransitionComplete: (() => void) | null = null;
  public onTransitionStart: (() => void) | null = null;
  public onExpandComplete: (() => void) | null = null;

  constructor(size: number = 100, segments: number = 128, seed?: number) {
    this.size = size;
    this.segments = segments;
    this.noise = new PerlinNoise(seed);
    this.currentParams = { frequency: 0.03, amplitude: 3, octaves: 4 };
  }

  private fbm(x: number, y: number, params: NoiseParams): number {
    let value = 0;
    let amplitude = 1;
    let frequency = params.frequency;
    let maxValue = 0;
    for (let i = 0; i < params.octaves; i++) {
      value += this.noise.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }

  private generateHeightMap(params: NoiseParams, isBasin: boolean = false): Float32Array {
    const vertexCount = (this.segments + 1) * (this.segments + 1);
    const heights = new Float32Array(vertexCount);
    const half = this.segments / 2;
    let minH = Infinity;
    let maxH = -Infinity;

    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const idx = i * (this.segments + 1) + j;
        const nx = j - half;
        const nz = i - half;
        let h = this.fbm(nx, nz, params) * params.amplitude;

        if (isBasin) {
          const dist = Math.sqrt(nx * nx + nz * nz) / half;
          const basinFactor = Math.max(0, dist - 0.15);
          h = h - basinFactor * basinFactor * params.amplitude * 1.5;
        }

        heights[idx] = h;
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      }
    }

    const range = maxH - minH;
    for (let i = 0; i < heights.length; i++) {
      heights[i] = (heights[i] - minH) / (range || 1) * params.amplitude;
    }

    return heights;
  }

  private generateSnowPattern(): Float32Array {
    const count = (this.segments + 1) * (this.segments + 1);
    const pattern = new Float32Array(count);
    const half = this.segments / 2;
    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const idx = i * (this.segments + 1) + j;
        const nx = (j - half) * 0.08;
        const nz = (i - half) * 0.08;
        const n1 = this.noise.noise2D(nx, nz);
        const n2 = this.noise.noise2D(nx * 3.2 + 100, nz * 3.2 - 50);
        const n3 = this.noise.noise2D(nx * 7.7 - 30, nz * 7.7 + 90);
        pattern[idx] = (n1 * 0.55 + n2 * 0.3 + n3 * 0.15 + 1) * 0.5;
      }
    }
    return pattern;
  }

  private computeColorsForHeights(heights: Float32Array, amplitude: number): Float32Array {
    const count = heights.length;
    const colors = new Float32Array(count * 3);
    if (!this.snowNoisePattern || this.snowNoisePattern.length !== count) {
      this.snowNoisePattern = this.generateSnowPattern();
    }
    for (let i = 0; i < count; i++) {
      const y = heights[i];
      const t = amplitude === 0 ? 0 : y / amplitude;
      const color = getGradientColor(t);
      if (t > 0.78) {
        const elevationBand = (t - 0.78) / 0.22;
        const snowNoiseVal = this.snowNoisePattern[i];
        const threshold = 1.0 - elevationBand * 0.75;
        if (snowNoiseVal > threshold) {
          const coverage = Math.min(1, (snowNoiseVal - threshold) / (1 - threshold) * (0.4 + elevationBand * 0.6));
          const edgeSoftness = Math.min(1, elevationBand * 2);
          color.lerp(new THREE.Color('#FFFFFF'), Math.min(1, coverage * (0.7 + edgeSoftness * 0.3)));
        }
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return colors;
  }

  createMesh(params: NoiseParams, preset?: TerrainPreset): THREE.Mesh {
    this.currentParams = { ...params };
    const isBasin = preset === 'basin';
    this.newHeights = this.generateHeightMap(params, isBasin);
    this.baseHeights = this.newHeights.slice();
    this.targetColors = this.computeColorsForHeights(this.baseHeights, params.amplitude);

    const geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    this.stats.vertexCount = positions.count;

    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < positions.count; i++) {
      const y = this.baseHeights[i];
      positions.setY(i, 0);
      if (y < minH) minH = y;
      if (y > maxH) maxH = y;
      colors[i * 3] = 0.02;
      colors[i * 3 + 1] = 0.03;
      colors[i * 3 + 2] = 0.02;
    }
    this.stats.minHeight = 0;
    this.stats.maxHeight = 0;

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.mesh.name = 'terrain';

    this.startExpandAnimation();
    return this.mesh;
  }

  regenerate(params: NoiseParams, preset?: TerrainPreset, smooth: boolean = true): void {
    if (!this.mesh) return;
    const isBasin = preset === 'basin';
    this.oldHeights = this.baseHeights ? this.baseHeights.slice() : null;
    this.oldColors = this.targetColors ? this.targetColors.slice() : null;
    this.newHeights = this.generateHeightMap(params, isBasin);
    this.currentParams = { ...params };
    this.targetColors = this.computeColorsForHeights(this.newHeights, params.amplitude);

    if (smooth && this.oldHeights && this.oldColors) {
      this.transitionProgress = 0;
      this.transitionTarget = 1;
      this.transitionStartTime = performance.now();
      if (this.onTransitionStart) this.onTransitionStart();
    } else {
      this.baseHeights = this.newHeights.slice();
      this.applyHeights(this.baseHeights);
      this.applyColorsDirect(this.targetColors);
      this.startExpandAnimation();
    }
  }

  private applyHeights(heights: Float32Array): void {
    if (!this.mesh) return;
    const positions = this.mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, heights[i] * this.animationProgress);
    }
    positions.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.updateStats(heights);
  }

  private applyColorsDirect(colors: Float32Array): void {
    if (!this.mesh) return;
    const attr = this.mesh.geometry.attributes.color as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const prog = this.animationProgress;
    for (let i = 0; i < colors.length; i += 3) {
      arr[i] = 0.02 + (colors[i] - 0.02) * prog;
      arr[i + 1] = 0.03 + (colors[i + 1] - 0.03) * prog;
      arr[i + 2] = 0.02 + (colors[i + 2] - 0.02) * prog;
    }
    attr.needsUpdate = true;
  }

  private applyColorsWithProgress(target: Float32Array, expandT: number, transitionT: number = 1, oldTarget?: Float32Array | null): void {
    if (!this.mesh) return;
    const attr = this.mesh.geometry.attributes.color as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < target.length; i += 3) {
      let r = target[i];
      let g = target[i + 1];
      let b = target[i + 2];
      if (oldTarget && transitionT < 1 && oldTarget.length === target.length) {
        r = oldTarget[i] + (target[i] - oldTarget[i]) * transitionT;
        g = oldTarget[i + 1] + (target[i + 1] - oldTarget[i + 1]) * transitionT;
        b = oldTarget[i + 2] + (target[i + 2] - oldTarget[i + 2]) * transitionT;
      }
      arr[i] = 0.02 + (r - 0.02) * expandT;
      arr[i + 1] = 0.03 + (g - 0.03) * expandT;
      arr[i + 2] = 0.02 + (b - 0.02) * expandT;
    }
    attr.needsUpdate = true;
  }

  private updateStats(heights: Float32Array): void {
    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < heights.length; i++) {
      const h = heights[i] * this.animationProgress;
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
    this.stats.minHeight = minH;
    this.stats.maxHeight = maxH;
  }

  private startExpandAnimation(): void {
    this.animationProgress = 0;
    this.animationTarget = 1;
    this.animationStartTime = performance.now();
  }

  update(deltaTime: number): void {
    const now = performance.now();
    let expandChanged = false;
    let transitionChanged = false;

    if (this.animationProgress < this.animationTarget) {
      const elapsed = now - this.animationStartTime;
      const t = Math.min(1, elapsed / EXPAND_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      this.animationProgress = eased;
      expandChanged = true;
      if (t >= 1 && this.onExpandComplete) {
        this.onExpandComplete();
        this.onExpandComplete = null;
      }
    }

    if (this.transitionProgress < this.transitionTarget && this.oldHeights && this.newHeights && this.targetColors) {
      const elapsed = now - this.transitionStartTime;
      const t = Math.min(1, elapsed / TRANSITION_DURATION);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.transitionProgress = eased;
      const heights = new Float32Array(this.oldHeights.length);
      for (let i = 0; i < heights.length; i++) {
        heights[i] = this.oldHeights[i] + (this.newHeights[i] - this.oldHeights[i]) * this.transitionProgress;
      }
      this.baseHeights = heights;
      this.applyHeights(heights);
      this.applyColorsWithProgress(this.targetColors, 1, this.transitionProgress, this.oldColors);
      transitionChanged = true;
      if (this.transitionProgress >= 1) {
        this.baseHeights = this.newHeights.slice();
        this.oldHeights = null;
        this.newHeights = null;
        this.oldColors = null;
        if (this.onTransitionComplete) {
          const cb = this.onTransitionComplete;
          this.onTransitionComplete = null;
          cb();
        }
      }
    }

    if (expandChanged && !transitionChanged && this.baseHeights && this.targetColors) {
      this.applyHeights(this.baseHeights);
      this.applyColorsWithProgress(this.targetColors, this.animationProgress, 1, this.oldColors);
    }
  }

  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  getHeightAt(x: number, z: number): number | null {
    if (!this.mesh || !this.baseHeights) return null;
    const halfSize = this.size / 2;
    if (x < -halfSize || x > halfSize || z < -halfSize || z > halfSize) return null;
    const u = (x + halfSize) / this.size;
    const v = (z + halfSize) / this.size;
    const i = Math.floor(v * this.segments);
    const j = Math.floor(u * this.segments);
    const idx = i * (this.segments + 1) + j;
    return this.baseHeights[idx] * this.animationProgress;
  }

  isTransitioning(): boolean {
    return this.transitionProgress < this.transitionTarget;
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }
  }
}
