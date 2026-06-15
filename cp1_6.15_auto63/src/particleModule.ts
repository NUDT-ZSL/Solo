import * as THREE from 'three';
import { store, type EmitterConfig } from './store';

const MIN_PARTICLES = 2000;
const MAX_PARTICLES = 10000;
const PARTICLES_PER_EMITTER = 800;
const PARTICLE_LIFETIME = 6;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  radius: number;
  emitterId: string;
  alive: boolean;
}

class ParticleModule {
  private particles: Particle[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private geometry: THREE.BufferGeometry;
  private points: THREE.Points;
  private material: THREE.PointsMaterial;
  private targetWind = new THREE.Vector3();
  private currentWind = new THREE.Vector3();
  private windTransitionTime = 0;

  constructor(scene: THREE.Scene) {
    const count = MIN_PARTICLES;
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.geometry.setDrawRange(0, count);

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.initParticles(count);
    this.bindStore();
  }

  private bindStore(): void {
    store.on('wind:change', () => {
      const wind = store.getWind();
      const rad = (wind.direction * Math.PI) / 180;
      this.targetWind.set(
        Math.cos(rad) * wind.strength,
        0,
        Math.sin(rad) * wind.strength
      );
      this.windTransitionTime = 0.5;
    });

    store.on('emitters:change', () => {
      this.adjustParticleCount();
    });

    const initialWind = store.getWind();
    const rad = (initialWind.direction * Math.PI) / 180;
    this.targetWind.set(
      Math.cos(rad) * initialWind.strength,
      0,
      Math.sin(rad) * initialWind.strength
    );
    this.currentWind.copy(this.targetWind);
  }

  private initParticles(count: number): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createDeadParticle());
    }
  }

  private createDeadParticle(): Particle {
    return {
      position: new THREE.Vector3(0, -100, 0),
      velocity: new THREE.Vector3(),
      age: 0,
      maxAge: PARTICLE_LIFETIME,
      radius: 0.05 + Math.random() * 0.1,
      emitterId: '',
      alive: false,
    };
  }

  private adjustParticleCount(): void {
    const emitterCount = store.getEmitterCount();
    const targetCount = Math.min(
      MAX_PARTICLES,
      Math.max(MIN_PARTICLES, emitterCount * PARTICLES_PER_EMITTER)
    );

    while (this.particles.length < targetCount) {
      this.particles.push(this.createDeadParticle());
    }

    this.geometry.setDrawRange(0, this.particles.length);
    store.setParticleCount(this.getActiveCount());
  }

  private emitParticle(emitter: EmitterConfig): void {
    const deadIdx = this.particles.findIndex((p) => !p.alive);
    if (deadIdx === -1) return;

    const p = this.particles[deadIdx];
    p.alive = true;
    p.age = 0;
    p.maxAge = PARTICLE_LIFETIME * (0.7 + Math.random() * 0.6);
    p.emitterId = emitter.id;
    p.radius = 0.05 + Math.random() * 0.1;

    const spread = emitter.spread || 0.5;
    p.position.set(
      emitter.position.x + (Math.random() - 0.5) * spread,
      emitter.position.y + 0.05,
      emitter.position.z + (Math.random() - 0.5) * spread
    );

    const intensity = emitter.intensity || 1;
    p.velocity.set(
      (Math.random() - 0.5) * 0.3 * intensity,
      1.0 + Math.random() * 0.8 * intensity,
      (Math.random() - 0.5) * 0.3 * intensity
    );
  }

  private getActiveCount(): number {
    let c = 0;
    for (const p of this.particles) if (p.alive) c++;
    return c;
  }

  update(dt: number): void {
    if (this.windTransitionTime > 0) {
      const factor = Math.min(1, dt / this.windTransitionTime);
      this.currentWind.lerp(this.targetWind, factor);
      this.windTransitionTime = Math.max(0, this.windTransitionTime - dt);
    }

    const emitters = store.getAllEmitters();
    const turbulence = store.getWind().turbulence;
    const time = performance.now() * 0.001;

    for (const emitter of emitters) {
      const emitRate = Math.floor((emitter.intensity || 1) * 12 * dt);
      for (let i = 0; i < emitRate; i++) {
        this.emitParticle(emitter);
      }
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (!p.alive) {
        posAttr.setXYZ(i, 0, -100, 0);
        sizeAttr.setX(i, 0);
        continue;
      }

      p.age += dt;
      if (p.age >= p.maxAge) {
        p.alive = false;
        posAttr.setXYZ(i, 0, -100, 0);
        sizeAttr.setX(i, 0);
        continue;
      }

      const noiseX = Math.sin(time * 1.3 + p.position.y * 2.0) * turbulence * 0.15;
      const noiseZ = Math.cos(time * 1.7 + p.position.y * 1.5) * turbulence * 0.15;

      p.velocity.x += (this.currentWind.x * 0.05 + noiseX) * dt;
      p.velocity.y -= 0.02 * dt;
      p.velocity.z += (this.currentWind.z * 0.05 + noiseZ) * dt;

      p.velocity.multiplyScalar(1 - 0.3 * dt);

      p.position.addScaledVector(p.velocity, dt);

      if (p.position.y < 0) {
        p.position.y = 0;
        p.velocity.y *= -0.1;
      }

      const lifeRatio = p.age / p.maxAge;
      let size: number;
      if (lifeRatio < 0.2) {
        size = p.radius * (lifeRatio / 0.2) * 3;
      } else {
        size = p.radius * 3 * (1 - (lifeRatio - 0.2) / 0.8);
      }
      size = Math.max(0.01, size);

      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      sizeAttr.setX(i, size * 10);

      const density = 1 - lifeRatio;
      const white = 0.9;
      const grey = 0.4;
      const c = grey + (white - grey) * density;
      colAttr.setXYZ(i, c, c, c);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    store.setParticleCount(this.getActiveCount());
  }

  getPositions(): Float32Array {
    const count = this.particles.length;
    const snapshot = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      snapshot[i * 3] = p.position.x;
      snapshot[i * 3 + 1] = p.position.y;
      snapshot[i * 3 + 2] = p.position.z;
    }
    return snapshot;
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export { ParticleModule };
