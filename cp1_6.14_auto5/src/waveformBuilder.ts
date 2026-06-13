import * as THREE from 'three';
import type { AudioData } from './audioAnalyzer';

export type WaveformStyle = 'mountain' | 'ocean' | 'nebula';

interface VertexStyleState {
  baseY: number;
  mountainX: number;
  mountainY: number;
  mountainZ: number;
  mountainR: number;
  mountainG: number;
  mountainB: number;
  oceanX: number;
  oceanY: number;
  oceanZ: number;
  oceanR: number;
  oceanG: number;
  oceanB: number;
  nebulaX: number;
  nebulaY: number;
  nebulaZ: number;
  nebulaR: number;
  nebulaG: number;
  nebulaB: number;
  seed: number;
}

const VERTEX_COUNT = 5000;
const GRID_COLS = 50;
const GRID_ROWS = 100;
const GRID_WIDTH = 25;
const GRID_DEPTH = 20;

const TRANSITION_DURATION = 1500;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function colorToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

const MOUNTAIN_COLOR_START = colorToRgb('#10b981');
const MOUNTAIN_COLOR_END = colorToRgb('#f59e0b');
const OCEAN_COLOR_START = colorToRgb('#0ea5e9');
const OCEAN_COLOR_END = colorToRgb('#38bdf8');
const NEBULA_COLOR_START = colorToRgb('#ec4899');
const NEBULA_COLOR_END = colorToRgb('#8b5cf6');

export class WaveformBuilder {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;

  private vertexStates: VertexStyleState[] = [];
  private currentStyle: WaveformStyle = 'mountain';
  private targetStyle: WaveformStyle = 'mountain';
  private transitionStart: number = 0;
  private isTransitioning: boolean = false;
  private elapsedTime: number = 0;

  private fromPositions: Float32Array = new Float32Array(VERTEX_COUNT * 3);
  private fromColors: Float32Array = new Float32Array(VERTEX_COUNT * 3);
  private toPositions: Float32Array = new Float32Array(VERTEX_COUNT * 3);
  private toColors: Float32Array = new Float32Array(VERTEX_COUNT * 3);

  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.initVertexStates();

    const positions = new Float32Array(VERTEX_COUNT * 3);
    const colors = new Float32Array(VERTEX_COUNT * 3);

    for (let i = 0; i < VERTEX_COUNT; i++) {
      this.writeStylePosition(i, this.currentStyle, positions, 0, 0, 0);
      this.writeStyleColor(i, this.currentStyle, colors, 0);
    }

    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  private initVertexStates(): void {
    this.vertexStates = [];

    for (let i = 0; i < VERTEX_COUNT; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = (col / (GRID_COLS - 1)) * GRID_WIDTH - GRID_WIDTH / 2;
      const z = (row / (GRID_ROWS - 1)) * GRID_DEPTH - GRID_DEPTH / 2;
      const seed = Math.random();
      const seed2 = Math.random();
      const seed3 = Math.random();

      const distFromCenter = Math.sqrt(x * x + z * z) / (GRID_WIDTH / 2);
      const baseY = Math.sin(distFromCenter * Math.PI * 2) * 0.3;

      const mountainColorT = (seed * 0.6 + seed2 * 0.4);
      const oceanColorT = (z / GRID_DEPTH + 0.5) * 0.7 + seed * 0.3;
      const nebulaColorT = (seed + seed2 * 0.5) % 1.0;

      this.vertexStates.push({
        baseY,
        mountainX: x,
        mountainY: baseY,
        mountainZ: z,
        mountainR: lerp(MOUNTAIN_COLOR_START[0], MOUNTAIN_COLOR_END[0], mountainColorT),
        mountainG: lerp(MOUNTAIN_COLOR_START[1], MOUNTAIN_COLOR_END[1], mountainColorT),
        mountainB: lerp(MOUNTAIN_COLOR_START[2], MOUNTAIN_COLOR_END[2], mountainColorT),
        oceanX: x,
        oceanY: baseY,
        oceanZ: z,
        oceanR: lerp(OCEAN_COLOR_START[0], OCEAN_COLOR_END[0], oceanColorT),
        oceanG: lerp(OCEAN_COLOR_START[1], OCEAN_COLOR_END[1], oceanColorT),
        oceanB: lerp(OCEAN_COLOR_START[2], OCEAN_COLOR_END[2], oceanColorT),
        nebulaX: x + (seed - 0.5) * 0.8,
        nebulaY: baseY + (seed2 - 0.5) * 0.5,
        nebulaZ: z + (seed3 - 0.5) * 0.8,
        nebulaR: lerp(NEBULA_COLOR_START[0], NEBULA_COLOR_END[0], nebulaColorT),
        nebulaG: lerp(NEBULA_COLOR_START[1], NEBULA_COLOR_END[1], nebulaColorT),
        nebulaB: lerp(NEBULA_COLOR_START[2], NEBULA_COLOR_END[2], nebulaColorT),
        seed,
      });
    }
  }

  private writeStylePosition(
    index: number,
    style: WaveformStyle,
    out: Float32Array,
    lowFreq: number,
    highFreq: number,
    time: number,
  ): void {
    const s = this.vertexStates[index];
    const i3 = index * 3;
    const audioBoost = lowFreq * 6 + highFreq * 3;

    switch (style) {
      case 'mountain': {
        const ridgeWave = Math.sin(time * Math.PI * 2 * 1 + s.seed * Math.PI * 2) * 0.3;
        out[i3] = s.mountainX;
        out[i3 + 1] = s.mountainY + audioBoost + ridgeWave * (0.5 + s.seed * 0.5);
        out[i3 + 2] = s.mountainZ + ridgeWave;
        break;
      }
      case 'ocean': {
        const waveX = Math.sin(time * Math.PI * 2 * 0.5 + s.seed * Math.PI * 4) * 0.5;
        const waveY = Math.sin(time * Math.PI * 2 * 0.8 + s.mountainX * 0.3 + s.seed * Math.PI * 2) * 0.8;
        out[i3] = s.oceanX + waveX;
        out[i3 + 1] = s.oceanY + audioBoost * 0.8 + waveY;
        out[i3 + 2] = s.oceanZ;
        break;
      }
      case 'nebula': {
        const pulse = Math.sin(time * Math.PI * 2 * 0.6 + s.seed * Math.PI * 6) * 0.4;
        out[i3] = s.nebulaX + pulse;
        out[i3 + 1] = s.nebulaY + audioBoost * 1.2 + pulse * 0.5;
        out[i3 + 2] = s.nebulaZ + pulse * (s.seed - 0.5);
        break;
      }
    }
  }

  private writeStyleColor(
    index: number,
    style: WaveformStyle,
    out: Float32Array,
    time: number,
  ): void {
    const s = this.vertexStates[index];
    const i3 = index * 3;
    const flicker = style === 'nebula'
      ? 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time * Math.PI * 2 * (1 / 0.3) + s.seed * Math.PI * 4))
      : 1.0;

    let r: number, g: number, b: number;
    switch (style) {
      case 'mountain':
        r = s.mountainR;
        g = s.mountainG;
        b = s.mountainB;
        break;
      case 'ocean':
        r = s.oceanR;
        g = s.oceanG;
        b = s.oceanB;
        break;
      case 'nebula':
        r = s.nebulaR;
        g = s.nebulaG;
        b = s.nebulaB;
        break;
    }

    out[i3] = r * flicker;
    out[i3 + 1] = g * flicker;
    out[i3 + 2] = b * flicker;
  }

  setStyle(style: WaveformStyle): void {
    if (style === this.currentStyle && !this.isTransitioning) return;
    this.targetStyle = style;
    this.isTransitioning = true;
    this.transitionStart = this.elapsedTime * 1000;

    for (let i = 0; i < VERTEX_COUNT; i++) {
      const i3 = i * 3;
      this.fromPositions[i3] = this.positionAttribute.array[i3];
      this.fromPositions[i3 + 1] = this.positionAttribute.array[i3 + 1];
      this.fromPositions[i3 + 2] = this.positionAttribute.array[i3 + 2];
      this.fromColors[i3] = this.colorAttribute.array[i3];
      this.fromColors[i3 + 1] = this.colorAttribute.array[i3 + 1];
      this.fromColors[i3 + 2] = this.colorAttribute.array[i3 + 2];
    }
  }

  getCurrentStyle(): WaveformStyle {
    return this.currentStyle;
  }

  getStylePrimaryColor(style: WaveformStyle = this.currentStyle): [number, number, number] {
    switch (style) {
      case 'mountain':
        return MOUNTAIN_COLOR_START;
      case 'ocean':
        return OCEAN_COLOR_END;
      case 'nebula':
        return NEBULA_COLOR_START;
    }
  }

  update(audioData: AudioData, deltaTime: number): void {
    this.elapsedTime += deltaTime;
    const now = this.elapsedTime * 1000;
    const { lowFrequency, highFrequency } = audioData;

    if (this.isTransitioning) {
      const progress = Math.min(1, (now - this.transitionStart) / TRANSITION_DURATION);
      const easedT = easeInOutCubic(progress);

      for (let i = 0; i < VERTEX_COUNT; i++) {
        this.writeStylePosition(i, this.targetStyle, this.toPositions, lowFrequency, highFrequency, this.elapsedTime);
        this.writeStyleColor(i, this.targetStyle, this.toColors, this.elapsedTime);
      }

      const posArr = this.positionAttribute.array as Float32Array;
      const colArr = this.colorAttribute.array as Float32Array;
      for (let i = 0; i < VERTEX_COUNT * 3; i++) {
        posArr[i] = lerp(this.fromPositions[i], this.toPositions[i], easedT);
        colArr[i] = lerp(this.fromColors[i], this.toColors[i], easedT);
      }

      if (progress >= 1) {
        this.isTransitioning = false;
        this.currentStyle = this.targetStyle;
      }
    } else {
      for (let i = 0; i < VERTEX_COUNT; i++) {
        this.writeStylePosition(i, this.currentStyle, this.positionAttribute.array as Float32Array, lowFrequency, highFrequency, this.elapsedTime);
        this.writeStyleColor(i, this.currentStyle, this.colorAttribute.array as Float32Array, this.elapsedTime);
      }
    }

    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
  }

  getSampleHeights(count: number): number[] {
    const heights: number[] = [];
    const positions = this.positionAttribute.array as Float32Array;
    const step = Math.floor(VERTEX_COUNT / count);

    for (let i = 0; i < count; i++) {
      const idx = Math.min(i * step, VERTEX_COUNT - 1);
      heights.push(positions[idx * 3 + 1]);
    }

    return heights;
  }

  getVertexPositions(): Float32Array {
    return this.positionAttribute.array as Float32Array;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
