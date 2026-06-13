import * as THREE from 'three';
import type { AudioData } from './audioAnalyzer';

export type WaveformStyle = 'mountain' | 'ocean' | 'nebula';

interface StaticVertexPose {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
}

interface VertexState {
  baseX: number;
  baseY: number;
  baseZ: number;
  mountainColor: [number, number, number];
  oceanColor: [number, number, number];
  nebulaColor: [number, number, number];
  seed: number;
  seed2: number;
  seed3: number;
}

const VERTEX_COUNT = 5000;
const GRID_COLS = 50;
const GRID_ROWS = 100;
const GRID_WIDTH = 25;
const GRID_DEPTH = 20;

const TRANSITION_DURATION = 1500;

function cubicBezierEaseInOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const p0 = 0, p1 = 0, p2 = 1, p3 = 1;
  const u = 1 - t;
  return (
    p0 * u * u * u +
    3 * p1 * t * u * u +
    3 * p2 * t * t * u +
    p3 * t * t * t
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function colorHexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function mixColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

const MOUNTAIN_COLOR_START = colorHexToRgb('#10b981');
const MOUNTAIN_COLOR_END = colorHexToRgb('#f59e0b');
const OCEAN_COLOR_START = colorHexToRgb('#0ea5e9');
const OCEAN_COLOR_END = colorHexToRgb('#38bdf8');
const NEBULA_COLOR_START = colorHexToRgb('#ec4899');
const NEBULA_COLOR_END = colorHexToRgb('#8b5cf6');

export class WaveformBuilder {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;

  private vertexStates: VertexState[] = [];
  private currentStyle: WaveformStyle = 'mountain';
  private targetStyle: WaveformStyle = 'mountain';
  private transitionStartTime: number = 0;
  private isInTransition: boolean = false;
  private elapsedTime: number = 0;

  private fromPose: StaticVertexPose[] = [];
  private toPose: StaticVertexPose[] = [];

  private positionAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.initStates();

    const positions = new Float32Array(VERTEX_COUNT * 3);
    const colors = new Float32Array(VERTEX_COUNT * 3);

    for (let i = 0; i < VERTEX_COUNT; i++) {
      const pose = this.computeStaticPose(i, this.currentStyle, 0, 0, 0);
      positions[i * 3] = pose.x;
      positions[i * 3 + 1] = pose.y;
      positions[i * 3 + 2] = pose.z;
      colors[i * 3] = pose.r;
      colors[i * 3 + 1] = pose.g;
      colors[i * 3 + 2] = pose.b;
    }

    this.positionAttr = new THREE.BufferAttribute(positions, 3);
    this.colorAttr = new THREE.BufferAttribute(colors, 3);
    this.positionAttr.setUsage(THREE.DynamicDrawUsage);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('color', this.colorAttr);

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

  private initStates(): void {
    this.vertexStates = [];
    for (let i = 0; i < VERTEX_COUNT; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = (col / (GRID_COLS - 1)) * GRID_WIDTH - GRID_WIDTH / 2;
      const z = (row / (GRID_ROWS - 1)) * GRID_DEPTH - GRID_DEPTH / 2;
      const seed = Math.random();
      const seed2 = Math.random();
      const seed3 = Math.random();

      const distNorm = Math.sqrt(x * x + z * z) / (GRID_WIDTH / 2);
      const baseY = Math.sin(distNorm * Math.PI * 2) * 0.3;

      const mountainColorT = seed * 0.55 + seed2 * 0.45;
      const oceanColorT = (z / GRID_DEPTH + 0.5) * 0.65 + seed * 0.35;
      const nebulaColorT = (seed + seed2 * 0.5) % 1.0;

      this.vertexStates.push({
        baseX: x,
        baseY,
        baseZ: z,
        mountainColor: mixColor(MOUNTAIN_COLOR_START, MOUNTAIN_COLOR_END, mountainColorT),
        oceanColor: mixColor(OCEAN_COLOR_START, OCEAN_COLOR_END, oceanColorT),
        nebulaColor: mixColor(NEBULA_COLOR_START, NEBULA_COLOR_END, nebulaColorT),
        seed,
        seed2,
        seed3,
      });
    }
  }

  private getStyleColor(style: WaveformStyle, state: VertexState): [number, number, number] {
    switch (style) {
      case 'mountain': return state.mountainColor;
      case 'ocean': return state.oceanColor;
      case 'nebula': return state.nebulaColor;
    }
  }

  private computeStaticPose(
    index: number,
    style: WaveformStyle,
    lowFreq: number,
    highFreq: number,
    time: number,
  ): StaticVertexPose {
    const s = this.vertexStates[index];
    const audioBoost = lowFreq * 6 + highFreq * 3;
    let x = s.baseX, y = s.baseY, z = s.baseZ;
    let color: [number, number, number] = this.getStyleColor(style, s);
    let flicker = 1;

    switch (style) {
      case 'mountain': {
        const ridge = Math.sin(time * Math.PI * 2 * 1 + s.seed * Math.PI * 2) * 0.3;
        z = s.baseZ + ridge;
        y = s.baseY + audioBoost + ridge * (0.5 + s.seed * 0.5);
        x = s.baseX;
        break;
      }
      case 'ocean': {
        const waveX = Math.sin(time * Math.PI * 2 * 0.5 + s.seed * Math.PI * 4) * 0.5;
        const waveY = Math.sin(time * Math.PI * 2 * 0.8 + s.baseX * 0.3 + s.seed * Math.PI * 2) * 0.8;
        x = s.baseX + waveX;
        y = s.baseY + audioBoost * 0.8 + waveY;
        z = s.baseZ;
        break;
      }
      case 'nebula': {
        const pulse = Math.sin(time * Math.PI * 2 * 0.6 + s.seed * Math.PI * 6) * 0.4;
        x = s.baseX + (s.seed - 0.5) * 0.8 + pulse;
        y = s.baseY + (s.seed2 - 0.5) * 0.5 + audioBoost * 1.2 + pulse * 0.5;
        z = s.baseZ + (s.seed3 - 0.5) * 0.8 + pulse * (s.seed - 0.5);
        flicker = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time * Math.PI * 2 * (1 / 0.3) + s.seed * Math.PI * 4));
        break;
      }
    }

    return {
      x,
      y,
      z,
      r: color[0] * flicker,
      g: color[1] * flicker,
      b: color[2] * flicker,
    };
  }

  setStyle(style: WaveformStyle): void {
    if (style === this.currentStyle && !this.isInTransition) return;

    const now = this.elapsedTime * 1000;

    this.fromPose = [];
    this.toPose = [];

    const posArr = this.positionAttr.array as Float32Array;
    const colArr = this.colorAttr.array as Float32Array;

    for (let i = 0; i < VERTEX_COUNT; i++) {
      this.fromPose.push({
        x: posArr[i * 3],
        y: posArr[i * 3 + 1],
        z: posArr[i * 3 + 2],
        r: colArr[i * 3],
        g: colArr[i * 3 + 1],
        b: colArr[i * 3 + 2],
      });
      this.toPose.push({
        x: 0,
        y: 0,
        z: 0,
        r: 0,
        g: 0,
        b: 0,
      });
    }

    this.targetStyle = style;
    this.isInTransition = true;
    this.transitionStartTime = now;
  }

  getCurrentStyle(): WaveformStyle {
    return this.currentStyle;
  }

  getStylePrimaryColor(style: WaveformStyle = this.currentStyle): [number, number, number] {
    switch (style) {
      case 'mountain': return MOUNTAIN_COLOR_START;
      case 'ocean': return OCEAN_COLOR_END;
      case 'nebula': return NEBULA_COLOR_START;
    }
  }

  update(audioData: AudioData, deltaTime: number): void {
    this.elapsedTime += deltaTime;
    const nowMs = this.elapsedTime * 1000;
    const { lowFrequency, highFrequency } = audioData;

    const posArr = this.positionAttr.array as Float32Array;
    const colArr = this.colorAttr.array as Float32Array;

    if (this.isInTransition) {
      const rawT = Math.min(1, (nowMs - this.transitionStartTime) / TRANSITION_DURATION);
      const easedT = cubicBezierEaseInOut(rawT);

      for (let i = 0; i < VERTEX_COUNT; i++) {
        const tPose = this.computeStaticPose(i, this.targetStyle, lowFrequency, highFrequency, this.elapsedTime);
        this.toPose[i] = tPose;

        const f = this.fromPose[i];
        const t = this.toPose[i];
        const i3 = i * 3;

        posArr[i3] = lerp(f.x, t.x, easedT);
        posArr[i3 + 1] = lerp(f.y, t.y, easedT);
        posArr[i3 + 2] = lerp(f.z, t.z, easedT);

        colArr[i3] = lerp(f.r, t.r, easedT);
        colArr[i3 + 1] = lerp(f.g, t.g, easedT);
        colArr[i3 + 2] = lerp(f.b, t.b, easedT);
      }

      if (rawT >= 1) {
        this.isInTransition = false;
        this.currentStyle = this.targetStyle;
      }
    } else {
      for (let i = 0; i < VERTEX_COUNT; i++) {
        const pose = this.computeStaticPose(i, this.currentStyle, lowFrequency, highFrequency, this.elapsedTime);
        const i3 = i * 3;
        posArr[i3] = pose.x;
        posArr[i3 + 1] = pose.y;
        posArr[i3 + 2] = pose.z;
        colArr[i3] = pose.r;
        colArr[i3 + 1] = pose.g;
        colArr[i3 + 2] = pose.b;
      }
    }

    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }

  getSampleHeights(count: number): number[] {
    const heights: number[] = [];
    const positions = this.positionAttr.array as Float32Array;
    const step = Math.floor(VERTEX_COUNT / count);

    for (let i = 0; i < count; i++) {
      const idx = Math.min(i * step, VERTEX_COUNT - 1);
      heights.push(positions[idx * 3 + 1]);
    }

    return heights;
  }

  getVertexPositions(): Float32Array {
    return this.positionAttr.array as Float32Array;
  }

  getVertexCount(): number {
    return VERTEX_COUNT;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
