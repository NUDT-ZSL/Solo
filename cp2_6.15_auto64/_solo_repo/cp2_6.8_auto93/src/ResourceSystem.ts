import * as THREE from 'three';
import type { TreeData } from './TreeSystem';

export type ParticleType = 'water' | 'sunlight';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  type: ParticleType;
  strength: number;
  life: number;
  maxLife: number;
  absorbed: boolean;
}

export interface ResourceStats {
  totalSunlight: number;
  totalWater: number;
  distribution: Map<number, { sunlight: number; water: number }>;
}

const GROUND_SIZE = 20;
const MIN_PARTICLES = 200;
const MAX_PARTICLES = 500;
const PARTICLE_SIZE = 0.06;

export class ResourceSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private particleMesh!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.PointsMaterial;
  private trees: TreeData[] = [];

  private lightIntensity: number = 1.25;
  private soilMoisture: number = 50;

  private sunlightEmitTimer: number = 0;
  private waterEmitTimer: number = 0;

  private stats: ResourceStats = {
    totalSunlight: 0,
    totalWater: 0,
    distribution: new Map()
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initParticleSystem();
  }

  private initParticleSystem(): void {
    const maxParticles = MAX_PARTICLES;
    this.particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;
      sizes[i] = 0;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleMaterial = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
  }

  setTrees(trees: TreeData[]): void {
    this.trees = trees;
    this.stats.distribution.clear();
    for (const tree of trees) {
      this.stats.distribution.set(tree.id, { sunlight: 0, water: 0 });
    }
  }

  setLightIntensity(intensity: number): void {
    this.lightIntensity = intensity;
  }

  setSoilMoisture(moisture: number): void {
    this.soilMoisture = moisture;
  }

  update(deltaTime: number, isPlaying: boolean): void {
    if (!isPlaying) return;

    const targetCount = Math.floor(
      MIN_PARTICLES + (MAX_PARTICLES - MIN_PARTICLES) *
      ((this.lightIntensity / 2 + this.soilMoisture / 100) / 2)
    );

    this.sunlightEmitTimer += deltaTime;
    this.waterEmitTimer += deltaTime;

    const sunlightEmitInterval = 0.02 / this.lightIntensity;
    const waterEmitInterval = 0.02 / (this.soilMoisture / 50 + 0.1);

    while (this.sunlightEmitTimer > sunlightEmitInterval && this.particles.length < targetCount) {
      this.emitSunlightParticle();
      this.sunlightEmitTimer -= sunlightEmitInterval;
    }

    while (this.waterEmitTimer > waterEmitInterval && this.particles.length < targetCount) {
      this.emitWaterParticle();
      this.waterEmitTimer -= waterEmitInterval;
    }

    this.updateParticles(deltaTime);
    this.syncGeometry();
  }

  private emitSunlightParticle(): void {
    const x = (Math.random() - 0.5) * GROUND_SIZE;
    const z = (Math.random() - 0.5) * GROUND_SIZE;
    const y = 8 + Math.random() * 2;

    const particle: Particle = {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        -1.5 - Math.random() * 0.8,
        (Math.random() - 0.5) * 0.3
      ),
      type: 'sunlight',
      strength: 0.6 + Math.random() * 0.4,
      life: 0,
      maxLife: 8,
      absorbed: false
    };

    this.particles.push(particle);
    this.stats.totalSunlight++;
  }

  private emitWaterParticle(): void {
    const x = (Math.random() - 0.5) * GROUND_SIZE;
    const z = (Math.random() - 0.5) * GROUND_SIZE;
    const y = 0.02 + Math.random() * 0.1;

    const particle: Particle = {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        1.2 + Math.random() * 0.8,
        (Math.random() - 0.5) * 0.5
      ),
      type: 'water',
      strength: 0.6 + Math.random() * 0.4,
      life: 0,
      maxLife: 8,
      absorbed: false
    };

    this.particles.push(particle);
    this.stats.totalWater++;
  }

  private updateParticles(deltaTime: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife || p.absorbed) {
        toRemove.push(i);
        continue;
      }

      p.position.addScaledVector(p.velocity, deltaTime);

      if (p.type === 'sunlight') {
        if (p.position.y <= 0.1) {
          p.absorbed = true;
          continue;
        }
        this.checkSunlightCollision(p);
      } else {
        if (p.position.y >= 6) {
          toRemove.push(i);
          continue;
        }
        this.checkWaterCollision(p);
      }

      if (Math.abs(p.position.x) > GROUND_SIZE / 2 + 1 ||
          Math.abs(p.position.z) > GROUND_SIZE / 2 + 1) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  private checkSunlightCollision(particle: Particle): void {
    for (const tree of this.trees) {
      const crownBottom = tree.height * 0.3;
      const crownTop = tree.height * 0.85;
      const particleCrownY = particle.position.y - tree.position.y;

      if (particleCrownY >= crownBottom && particleCrownY <= crownTop) {
        const dx = particle.position.x - tree.position.x;
        const dz = particle.position.z - tree.position.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

        const t = (particleCrownY - crownBottom) / (crownTop - crownBottom);
        const currentCrownRadius = tree.crownRadius * (1 - t * 0.3);

        if (horizontalDist < currentCrownRadius) {
          particle.absorbed = true;
          const dist = this.stats.distribution.get(tree.id);
          if (dist) {
            dist.sunlight += particle.strength * this.lightIntensity;
          }
          return;
        }
      }
    }
  }

  private checkWaterCollision(particle: Particle): void {
    for (const tree of this.trees) {
      const dx = particle.position.x - tree.position.x;
      const dz = particle.position.z - tree.position.z;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      if (horizontalDist < tree.rootRadius && particle.position.y < tree.height * 0.25) {
        particle.absorbed = true;
        const dist = this.stats.distribution.get(tree.id);
        if (dist) {
          dist.water += particle.strength * (this.soilMoisture / 50);
        }
        return;
      }
    }
  }

  private syncGeometry(): void {
    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.getAttribute('size') as THREE.BufferAttribute;

    const maxParticles = MAX_PARTICLES;

    for (let i = 0; i < maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];

        posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);

        const color = this.getParticleColor(p);
        colorAttr.setXYZ(i, color.r, color.g, color.b);

        const alpha = Math.min(p.life * 4, 1) * Math.max(1 - p.life / p.maxLife, 0.3);
        sizeAttr.setX(i, PARTICLE_SIZE * (0.6 + p.strength * 0.6) * alpha);
      } else {
        posAttr.setXYZ(i, 0, -100, 0);
        colorAttr.setXYZ(i, 0, 0, 0);
        sizeAttr.setX(i, 0);
      }
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, Math.min(this.particles.length, maxParticles));
  }

  private getParticleColor(particle: Particle): THREE.Color {
    const color = new THREE.Color();

    if (particle.type === 'sunlight') {
      const t = Math.min(particle.strength, 1);
      color.setHSL(0.12, 0.7, 0.35 + t * 0.35);
    } else {
      const t = Math.min(particle.strength, 1);
      color.setHSL(0.55, 0.75, 0.35 + t * 0.35);
    }

    const healthT = Math.min(particle.strength, 1);
    const warmColor = new THREE.Color(0xFF5522);
    color.lerp(warmColor, (1 - healthT) * 0.4);

    return color;
  }

  getActiveParticleCount(): number {
    return this.particles.length;
  }

  getStats(): ResourceStats {
    return this.stats;
  }

  getResourceDistribution(): Map<number, { sunlight: number; water: number }> {
    return this.stats.distribution;
  }

  resetStats(): void {
    this.stats.totalSunlight = 0;
    this.stats.totalWater = 0;
    this.stats.distribution.forEach((value) => {
      value.sunlight = 0;
      value.water = 0;
    });
  }

  dispose(): void {
    this.scene.remove(this.particleMesh);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.particles = [];
  }
}
