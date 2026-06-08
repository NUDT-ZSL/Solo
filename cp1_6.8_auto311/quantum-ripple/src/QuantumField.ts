import * as THREE from 'three';
import { Particle, ParticleState } from './Particle';

const MAX_PARTICLES = 2000;
const BASE_SPAWN_RATE = 8;

export interface QuantumFieldOptions {
  spawnRate: number;
  pulseIntensity: number;
  showTrails: boolean;
}

export class QuantumField {
  particles: Particle[];
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  opacities: Float32Array;
  geometry: THREE.BufferGeometry;
  points: THREE.Points;
  origin: THREE.Vector3;
  baseRadius: number;

  private spawnAccumulator: number;
  private spawnRate: number;
  private pulseIntensity: number;
  private showTrails: boolean;
  private pulseTimer: number;
  private pulseActive: boolean;
  private currentSpawnMultiplier: number;
  trailGeometry: THREE.BufferGeometry;
  trailLines: THREE.LineSegments;
  trailPositions: Float32Array;
  trailColors: Float32Array;

  constructor(origin: THREE.Vector3, baseRadius: number) {
    this.origin = origin.clone();
    this.baseRadius = baseRadius;
    this.particles = [];
    this.spawnAccumulator = 0;
    this.spawnRate = BASE_SPAWN_RATE;
    this.pulseIntensity = 1;
    this.showTrails = false;
    this.pulseTimer = 0;
    this.pulseActive = false;
    this.currentSpawnMultiplier = 1;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push(new Particle());
    }

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.opacities = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = aColor;
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          vec3 finalColor = vColor * glow + vec3(1.0) * core * 0.5;
          float alpha = glow * vOpacity;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;

    const maxTrailVerts = MAX_PARTICLES * 20 * 2;
    this.trailPositions = new Float32Array(maxTrailVerts * 3);
    this.trailColors = new Float32Array(maxTrailVerts * 4);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 4));
    this.trailGeometry.setDrawRange(0, 0);

    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.trailLines = new THREE.LineSegments(this.trailGeometry, trailMaterial);
    this.trailLines.frustumCulled = false;
  }

  triggerPulse(): void {
    this.pulseActive = true;
    this.pulseTimer = 0;
    this.currentSpawnMultiplier = this.pulseIntensity * 5;
  }

  reset(): void {
    for (const p of this.particles) {
      p.state = ParticleState.DEAD;
      p.life = 0;
    }
    this.pulseActive = false;
    this.pulseTimer = 0;
    this.currentSpawnMultiplier = 1;
    this.spawnAccumulator = 0;
  }

  setSpawnRate(rate: number): void {
    this.spawnRate = rate;
  }

  setPulseIntensity(intensity: number): void {
    this.pulseIntensity = intensity;
  }

  setShowTrails(show: boolean): void {
    this.showTrails = show;
  }

  update(delta: number): void {
    if (this.pulseActive) {
      this.pulseTimer += delta;
      const pulseDuration = 2.0;
      const decayStart = 0.3;
      if (this.pulseTimer < decayStart) {
        this.currentSpawnMultiplier = this.pulseIntensity * 5;
      } else if (this.pulseTimer < pulseDuration) {
        const decayT = (this.pulseTimer - decayStart) / (pulseDuration - decayStart);
        this.currentSpawnMultiplier = THREE.MathUtils.lerp(
          this.pulseIntensity * 5,
          1,
          this.easeOutCubic(decayT),
        );
      } else {
        this.pulseActive = false;
        this.currentSpawnMultiplier = 1;
      }
    }

    this.spawnAccumulator += this.spawnRate * this.currentSpawnMultiplier * delta;

    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawnParticlePair();
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.isDead()) {
        p.update(delta, this.origin, this.showTrails);
      }
    }

    this.updateBuffers();
  }

  private spawnParticlePair(): void {
    const hue = 0.55 + Math.random() * 0.25;
    let spawned = 0;

    for (const p of this.particles) {
      if (p.isDead() && spawned < 2) {
        const inbound = spawned === 0;
        p.spawn(this.origin, inbound, this.baseRadius, hue);
        spawned++;
      }
      if (spawned >= 2) break;
    }
  }

  private updateBuffers(): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const opaAttr = this.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.isDead()) {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = 0;
        this.positions[i * 3 + 2] = 0;
        this.colors[i * 3] = 0;
        this.colors[i * 3 + 1] = 0;
        this.colors[i * 3 + 2] = 0;
        this.sizes[i] = 0;
        this.opacities[i] = 0;
      } else {
        this.positions[i * 3] = p.position.x;
        this.positions[i * 3 + 1] = p.position.y;
        this.positions[i * 3 + 2] = p.position.z;
        this.colors[i * 3] = p.color.r;
        this.colors[i * 3 + 1] = p.color.g;
        this.colors[i * 3 + 2] = p.color.b;
        this.sizes[i] = p.getSize() * 3;
        this.opacities[i] = p.getOpacity();
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    opaAttr.needsUpdate = true;

    this.updateTrailBuffers();
  }

  private updateTrailBuffers(): void {
    if (!this.showTrails) {
      this.trailGeometry.setDrawRange(0, 0);
      return;
    }

    let vertIdx = 0;

    for (const p of this.particles) {
      if (p.isDead() || p.trailPositions.length < 2) continue;

      for (let j = 0; j < p.trailPositions.length - 1; j++) {
        const start = p.trailPositions[j];
        const end = p.trailPositions[j + 1];
        const segT = j / (p.trailPositions.length - 1);
        const alpha = segT * p.getOpacity() * 0.4;

        const vi = vertIdx * 3;
        const ci = vertIdx * 4;

        this.trailPositions[vi] = start.x;
        this.trailPositions[vi + 1] = start.y;
        this.trailPositions[vi + 2] = start.z;
        this.trailColors[ci] = p.color.r;
        this.trailColors[ci + 1] = p.color.g;
        this.trailColors[ci + 2] = p.color.b;
        this.trailColors[ci + 3] = alpha;
        vertIdx++;

        this.trailPositions[vertIdx * 3] = end.x;
        this.trailPositions[vertIdx * 3 + 1] = end.y;
        this.trailPositions[vertIdx * 3 + 2] = end.z;
        this.trailColors[vertIdx * 4] = p.color.r;
        this.trailColors[vertIdx * 4 + 1] = p.color.g;
        this.trailColors[vertIdx * 4 + 2] = p.color.b;
        this.trailColors[vertIdx * 4 + 3] = alpha;
        vertIdx++;
      }
    }

    const posAttr = this.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.trailGeometry.getAttribute('color') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.trailGeometry.setDrawRange(0, vertIdx);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
