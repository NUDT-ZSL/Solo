import * as THREE from 'three';
import { FlowSimulator } from './FlowSimulator';

const MAX_PARTICLES = 5000;
const INK_PER_DROP = 60;

interface ParticleData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  life: number;
  maxLife: number;
  size: number;
  active: boolean;
}

const vertexShader = `
  attribute float aLife;
  attribute float aSize;
  varying float vLife;
  varying vec3 vColor;

  void main() {
    vLife = aLife;
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float lifeScale = smoothstep(0.0, 0.15, aLife) * (1.0 - smoothstep(0.7, 1.0, aLife));
    gl_PointSize = aSize * lifeScale * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vLife;
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= alpha;
    float lifeAlpha = smoothstep(0.0, 0.1, vLife) * (1.0 - smoothstep(0.6, 1.0, vLife));

    float glow = exp(-dist * 4.0) * 0.5;

    vec3 finalColor = vColor + vColor * glow;
    gl_FragColor = vec4(finalColor, alpha * lifeAlpha * 0.65);
  }
`;

export class InkParticleSystem {
  private particles: ParticleData[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private flowSimulator: FlowSimulator;

  private positions: Float32Array;
  private colors: Float32Array;
  private lives: Float32Array;
  private sizes: Float32Array;

  private freeIndices: number[] = [];

  constructor(scene: THREE.Scene, flowSimulator: FlowSimulator) {
    this.flowSimulator = flowSimulator;

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.lives = new Float32Array(MAX_PARTICLES);
    this.sizes = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0,
        r: 0, g: 0, b: 0,
        life: 1, maxLife: 1,
        size: 0,
        active: false,
      });
      this.freeIndices.push(i);
      this.positions[i * 3 + 2] = -1;
      this.lives[i] = 1;
      this.sizes[i] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(this.lives, 1));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  addInkDrop(worldX: number, worldY: number, color: THREE.Color): void {
    const count = Math.min(INK_PER_DROP, this.freeIndices.length);
    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const idx = this.freeIndices.pop()!;
      const p = this.particles[idx];

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.8;
      p.x = worldX + Math.cos(angle) * radius;
      p.y = worldY + Math.sin(angle) * radius;
      p.z = 0;

      const speed = Math.random() * 0.3 + 0.1;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;

      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      const variation = (Math.random() - 0.5) * 0.08;
      const c = new THREE.Color().setHSL(
        hsl.h + variation,
        Math.min(1, hsl.s + (Math.random() - 0.5) * 0.1),
        Math.min(1, hsl.l + (Math.random() - 0.5) * 0.15)
      );
      p.r = c.r;
      p.g = c.g;
      p.b = c.b;

      p.maxLife = 8 + Math.random() * 12;
      p.life = 0;
      p.size = 3 + Math.random() * 6;
      p.active = true;

      this.positions[idx * 3] = p.x;
      this.positions[idx * 3 + 1] = p.y;
      this.positions[idx * 3 + 2] = p.z;
      this.colors[idx * 3] = p.r;
      this.colors[idx * 3 + 1] = p.g;
      this.colors[idx * 3 + 2] = p.b;
      this.lives[idx] = 0;
      this.sizes[idx] = p.size;
    }
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt / p.maxLife;
      if (p.life >= 1) {
        p.active = false;
        this.freeIndices.push(i);
        this.positions[i * 3 + 2] = -100;
        this.lives[i] = 1;
        this.sizes[i] = 0;
        continue;
      }

      const flow = this.flowSimulator.getFlowAt(p.x, p.y);
      const flowStrength = 1.5;
      p.vx += flow.vx * flowStrength * dt;
      p.vy += flow.vy * flowStrength * dt;

      const spreadDecay = 1 - p.life * 0.6;
      p.vx *= 0.98;
      p.vy *= 0.98;

      p.vx += (Math.random() - 0.5) * 0.08 * spreadDecay;
      p.vy += (Math.random() - 0.5) * 0.08 * spreadDecay;

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.lives[i] = p.life;

      const lifeFade = 1 - p.life * 0.3;
      this.colors[i * 3] = p.r * lifeFade;
      this.colors[i * 3 + 1] = p.g * lifeFade;
      this.colors[i * 3 + 2] = p.b * lifeFade;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.aLife.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.active = false;
        this.freeIndices.push(i);
        this.positions[i * 3 + 2] = -100;
        this.lives[i] = 1;
        this.sizes[i] = 0;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aLife.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  getActiveCount(): number {
    return MAX_PARTICLES - this.freeIndices.length;
  }
}
