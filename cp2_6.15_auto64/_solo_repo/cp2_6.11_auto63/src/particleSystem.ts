import * as THREE from 'three';
import type { EmotionType } from './emotionParser';
import { getEmotionColor } from './emotionParser';

interface ParticleData {
  vx: number; vy: number; vz: number;
  phase: number;
  phaseSpeed: number;
  sizeOffset: number;
}

export class ParticleSystem {
  readonly points: THREE.Points;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.PointsMaterial;
  readonly count: number;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private data: ParticleData[];
  private currentColor = new THREE.Color(0xffffff);
  private targetColor = new THREE.Color(0xffffff);
  private colorTransitionStart = 0;
  private colorTransitionDuration = 2.0;
  private transitioning = false;
  private baseRadius: number;

  constructor(count = 500, radius = 30) {
    this.count = count;
    this.baseRadius = radius;

    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.data = new Array(count);

    const baseColor = new THREE.Color(0xffffff);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = Math.cbrt(Math.random()) * radius * 0.92;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      this.positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = r * Math.cos(phi);

      const tint = 0.85 + Math.random() * 0.3;
      this.colors[i3]     = baseColor.r * tint;
      this.colors[i3 + 1] = baseColor.g * tint;
      this.colors[i3 + 2] = baseColor.b * tint;

      const size = (0.02 + Math.random() * 0.06);
      this.sizes[i] = size;

      const speed = 0.0006 + Math.random() * 0.0014;
      const dx = (Math.random() - 0.5);
      const dy = (Math.random() - 0.5);
      const dz = (Math.random() - 0.5);
      const len = Math.hypot(dx, dy, dz) || 1;
      this.data[i] = {
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        vz: (dz / len) * speed,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.005 + Math.random() * 0.012,
        sizeOffset: size
      };
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  setAverageEmotion(dominant: EmotionType, all: { emotion: EmotionType; weight: number }[]): void {
    let r = 0, g = 0, b = 0, w = 0;
    for (const entry of all) {
      const c = new THREE.Color(getEmotionColor(entry.emotion));
      r += c.r * entry.weight;
      g += c.g * entry.weight;
      b += c.b * entry.weight;
      w += entry.weight;
    }
    if (w === 0) {
      const dc = new THREE.Color(getEmotionColor(dominant));
      r = dc.r; g = dc.g; b = dc.b;
    } else {
      r /= w; g /= w; b /= w;
    }

    const mixR = r * 0.35 + 1.0 * 0.65;
    const mixG = g * 0.35 + 1.0 * 0.65;
    const mixB = b * 0.35 + 1.0 * 0.65;

    this.targetColor.setRGB(mixR, mixG, mixB);
    this.currentColor.copy(this.getAverageRenderColor());
    this.colorTransitionStart = performance.now() / 1000;
    this.transitioning = true;
  }

  private getAverageRenderColor(): THREE.Color {
    const col = new THREE.Color(0, 0, 0);
    for (let i = 0; i < this.count; i++) {
      col.r += this.colors[i * 3];
      col.g += this.colors[i * 3 + 1];
      col.b += this.colors[i * 3 + 2];
    }
    col.r /= this.count;
    col.g /= this.count;
    col.b /= this.count;
    return col;
  }

  update(elapsedSec: number): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;

    const R2 = this.baseRadius * this.baseRadius;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      let x = this.positions[i3];
      let y = this.positions[i3 + 1];
      let z = this.positions[i3 + 2];
      const d = this.data[i];

      x += d.vx;
      y += d.vy;
      z += d.vz;

      const dist2 = x * x + y * y + z * z;
      if (dist2 > R2) {
        const dist = Math.sqrt(dist2);
        const nx = x / dist;
        const ny = y / dist;
        const nz = z / dist;
        x = nx * this.baseRadius * 0.92;
        y = ny * this.baseRadius * 0.92;
        z = nz * this.baseRadius * 0.92;
        const sp = Math.hypot(d.vx, d.vy, d.vz);
        d.vx = -nx * sp * 0.8 + (Math.random() - 0.5) * sp * 0.4;
        d.vy = -ny * sp * 0.8 + (Math.random() - 0.5) * sp * 0.4;
        d.vz = -nz * sp * 0.8 + (Math.random() - 0.5) * sp * 0.4;
      }

      d.phase += d.phaseSpeed;
      const pulse = 1 + Math.sin(d.phase) * 0.18;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;
      this.sizes[i] = d.sizeOffset * pulse;
    }

    if (this.transitioning) {
      const t = (performance.now() / 1000 - this.colorTransitionStart) / this.colorTransitionDuration;
      if (t >= 1) {
        this.currentColor.copy(this.targetColor);
        this.transitioning = false;
      } else {
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        this.currentColor.r = this.currentColor.r + (this.targetColor.r - this.currentColor.r) * 0.035;
        this.currentColor.g = this.currentColor.g + (this.targetColor.g - this.currentColor.g) * 0.035;
        this.currentColor.b = this.currentColor.b + (this.targetColor.b - this.currentColor.b) * 0.035;
      }
    }

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const tint = 0.85 + Math.sin(this.data[i].phase) * 0.15;
      this.colors[i3]     = this.currentColor.r * tint;
      this.colors[i3 + 1] = this.currentColor.g * tint;
      this.colors[i3 + 2] = this.currentColor.b * tint;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
