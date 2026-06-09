import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export interface PressureLayer {
  level: number;
  name: string;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  radius: number;
}

export const PRESSURE_LAYERS: PressureLayer[] = [
  {
    level: 1000,
    name: '1000hPa 近地面风场',
    colorStart: new THREE.Color(0xaaff00),
    colorEnd: new THREE.Color(0x00ff66),
    radius: 190
  },
  {
    level: 850,
    name: '850hPa 低空风场',
    colorStart: new THREE.Color(0xff8800),
    colorEnd: new THREE.Color(0xffcc00),
    radius: 195
  },
  {
    level: 500,
    name: '500hPa 高空风场',
    colorStart: new THREE.Color(0x0066ff),
    colorEnd: new THREE.Color(0x00ccff),
    radius: 200
  }
];

const PARTICLES_PER_LAYER = 3000;
const TRAIL_LENGTH = 5;
const NOISE_SCALE = 0.008;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  trail: THREE.Vector3[];
  size: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Map<number, Particle[]> = new Map();
  private points: Map<number, THREE.Points> = new Map();
  private trails: Map<number, THREE.LineSegments> = new Map();
  private noise3D = createNoise3D();
  private speedFactor = 0.5;
  private currentLayer = 2;
  private layerOpacity: Map<number, number> = new Map();
  private animating = false;
  private animationStart = 0;
  private previousLayer = -1;
  public maxSpeed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initLayers();
  }

  private initLayers(): void {
    for (let i = 0; i < PRESSURE_LAYERS.length; i++) {
      this.layerOpacity.set(i, i === this.currentLayer ? 1.0 : 0.0);
      this.createParticlesForLayer(i);
      this.createPointsForLayer(i);
      this.createTrailsForLayer(i);
      if (i !== this.currentLayer) {
        this.setVisibility(i, false);
      }
    }
  }

  private createParticlesForLayer(layerIndex: number): void {
    const layer = PRESSURE_LAYERS[layerIndex];
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLES_PER_LAYER; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = layer.radius + (Math.random() - 0.5) * 2;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const position = new THREE.Vector3(x, y, z);
      const trail: THREE.Vector3[] = [];
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        trail.push(position.clone());
      }

      particles.push({
        position,
        velocity: new THREE.Vector3(),
        trail,
        size: 1.5 + Math.random() * 2.5
      });
    }

    this.particles.set(layerIndex, particles);
  }

  private createPointsForLayer(layerIndex: number): void {
    const layer = PRESSURE_LAYERS[layerIndex];
    const particles = this.particles.get(layerIndex)!;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      const t = Math.random();
      const color = new THREE.Color().lerpColors(layer.colorStart, layer.colorEnd, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = p.size;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    this.points.set(layerIndex, points);
    this.scene.add(points);
  }

  private createTrailsForLayer(layerIndex: number): void {
    const layer = PRESSURE_LAYERS[layerIndex];
    const particles = this.particles.get(layerIndex)!;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * TRAIL_LENGTH * 2 * 3);
    const colors = new Float32Array(particles.length * TRAIL_LENGTH * 2 * 3);

    for (let i = 0; i < particles.length; i++) {
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const baseIdx = (i * TRAIL_LENGTH + t) * 2 * 3;
        positions[baseIdx] = particles[i].trail[t].x;
        positions[baseIdx + 1] = particles[i].trail[t].y;
        positions[baseIdx + 2] = particles[i].trail[t].z;
        positions[baseIdx + 3] = particles[i].trail[t].x;
        positions[baseIdx + 4] = particles[i].trail[t].y;
        positions[baseIdx + 5] = particles[i].trail[t].z;

        const alpha = 0.6 * (1 - t / TRAIL_LENGTH);
        const colorT = Math.random();
        const color = new THREE.Color().lerpColors(layer.colorStart, layer.colorEnd, colorT);
        colors[baseIdx] = color.r;
        colors[baseIdx + 1] = color.g;
        colors[baseIdx + 2] = color.b;
        colors[baseIdx + 3] = color.r * alpha;
        colors[baseIdx + 4] = color.g * alpha;
        colors[baseIdx + 5] = color.b * alpha;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const lines = new THREE.LineSegments(geometry, material);
    this.trails.set(layerIndex, lines);
    this.scene.add(lines);
  }

  private setVisibility(layerIndex: number, visible: boolean): void {
    const points = this.points.get(layerIndex);
    const trails = this.trails.get(layerIndex);
    if (points) points.visible = visible;
    if (trails) trails.visible = visible;
  }

  public setSpeedFactor(factor: number): void {
    this.speedFactor = Math.max(0.1, Math.min(2.0, factor));
  }

  public getSpeedFactor(): number {
    return this.speedFactor;
  }

  public switchLayer(layerIndex: number): void {
    if (layerIndex === this.currentLayer || layerIndex < 0 || layerIndex >= PRESSURE_LAYERS.length) return;
    if (this.animating) return;

    this.previousLayer = this.currentLayer;
    this.currentLayer = layerIndex;
    this.animating = true;
    this.animationStart = performance.now();
    this.setVisibility(layerIndex, true);
    this.setVisibility(this.previousLayer, true);
  }

  public getCurrentLayer(): number {
    return this.currentLayer;
  }

  public update(delta: number): void {
    if (this.animating) {
      const elapsed = (performance.now() - this.animationStart) / 500;
      if (elapsed >= 1) {
        this.animating = false;
        this.layerOpacity.set(this.currentLayer, 1.0);
        this.layerOpacity.set(this.previousLayer, 0.0);
        this.setVisibility(this.previousLayer, false);
      } else {
        this.layerOpacity.set(this.currentLayer, elapsed);
        this.layerOpacity.set(this.previousLayer, 1 - elapsed);
      }
    }

    this.maxSpeed = 0;
    const noiseScale = NOISE_SCALE;
    const time = performance.now() * 0.0001;

    for (let layerIdx = 0; layerIdx < PRESSURE_LAYERS.length; layerIdx++) {
      const opacity = this.layerOpacity.get(layerIdx)!;
      const points = this.points.get(layerIdx)!;
      const trails = this.trails.get(layerIdx)!;
      const layer = PRESSURE_LAYERS[layerIdx];

      (points.material as THREE.PointsMaterial).opacity = opacity;
      (trails.material as THREE.LineBasicMaterial).opacity = opacity * 0.6;

      if (opacity <= 0.001) continue;

      const particles = this.particles.get(layerIdx)!;
      const positionsAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = positionsAttr.array as Float32Array;
      const trailPositionsAttr = trails.geometry.getAttribute('position') as THREE.BufferAttribute;
      const trailPositions = trailPositionsAttr.array as Float32Array;
      const trailColorsAttr = trails.geometry.getAttribute('color') as THREE.BufferAttribute;
      const trailColors = trailColorsAttr.array as Float32Array;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const nx = this.noise3D(p.position.x * noiseScale + time, p.position.y * noiseScale, p.position.z * noiseScale);
        const ny = this.noise3D(p.position.x * noiseScale, p.position.y * noiseScale + time, p.position.z * noiseScale);
        const nz = this.noise3D(p.position.x * noiseScale, p.position.y * noiseScale, p.position.z * noiseScale + time);

        const tangent = new THREE.Vector3(nx, ny, nz);
        const posNorm = p.position.clone().normalize();
        tangent.sub(posNorm.clone().multiplyScalar(tangent.dot(posNorm)));

        const speed = tangent.length() * this.speedFactor * 0.8;
        if (speed > this.maxSpeed) this.maxSpeed = speed;

        tangent.normalize().multiplyScalar(speed);

        for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
          p.trail[t].copy(p.trail[t - 1]);
        }
        p.trail[0].copy(p.position);

        p.position.add(tangent);

        const dist = p.position.length();
        if (dist > layer.radius + 5 || dist < layer.radius - 5) {
          p.position.normalize().multiplyScalar(layer.radius + (Math.random() - 0.5) * 2);
        }

        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;

        for (let t = 0; t < TRAIL_LENGTH; t++) {
          const baseIdx = (i * TRAIL_LENGTH + t) * 2 * 3;
          if (t < TRAIL_LENGTH - 1) {
            trailPositions[baseIdx] = p.trail[t].x;
            trailPositions[baseIdx + 1] = p.trail[t].y;
            trailPositions[baseIdx + 2] = p.trail[t].z;
            trailPositions[baseIdx + 3] = p.trail[t + 1].x;
            trailPositions[baseIdx + 4] = p.trail[t + 1].y;
            trailPositions[baseIdx + 5] = p.trail[t + 1].z;
          } else {
            trailPositions[baseIdx] = p.trail[t].x;
            trailPositions[baseIdx + 1] = p.trail[t].y;
            trailPositions[baseIdx + 2] = p.trail[t].z;
            trailPositions[baseIdx + 3] = p.trail[t].x;
            trailPositions[baseIdx + 4] = p.trail[t].y;
            trailPositions[baseIdx + 5] = p.trail[t].z;
          }

          const alpha = 0.6 * (1 - t / TRAIL_LENGTH) * opacity;
          const colorT = (nx + 1) * 0.5;
          const color = new THREE.Color().lerpColors(layer.colorStart, layer.colorEnd, colorT);
          trailColors[baseIdx] = color.r * alpha;
          trailColors[baseIdx + 1] = color.g * alpha;
          trailColors[baseIdx + 2] = color.b * alpha;
          trailColors[baseIdx + 3] = color.r * alpha;
          trailColors[baseIdx + 4] = color.g * alpha;
          trailColors[baseIdx + 5] = color.b * alpha;
        }
      }

      positionsAttr.needsUpdate = true;
      trailPositionsAttr.needsUpdate = true;
      trailColorsAttr.needsUpdate = true;
    }
  }

  public dispose(): void {
    for (const [, points] of this.points) {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
      this.scene.remove(points);
    }
    for (const [, trails] of this.trails) {
      trails.geometry.dispose();
      (trails.material as THREE.Material).dispose();
      this.scene.remove(trails);
    }
    this.points.clear();
    this.trails.clear();
    this.particles.clear();
  }
}
