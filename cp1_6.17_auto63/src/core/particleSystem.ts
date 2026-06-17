import * as THREE from 'three';
import { StarStage } from './types';

const BACKGROUND_STAR_COUNT = 500;
const MAX_EXPLOSION_PARTICLES = 500;
const MAX_TOTAL_PARTICLES = 700;
const PARTICLE_LIFETIME = 3;
const EXPLOSION_START_COLOR = new THREE.Color('#FF4500');
const EXPLOSION_END_COLOR = new THREE.Color('#FFD700');

export class ParticleSystem {
  private scene: THREE.Scene;
  private backgroundStars: THREE.Points | null = null;
  private backgroundStarCount: number = BACKGROUND_STAR_COUNT;
  private explosionParticles: THREE.Points | null = null;
  private explosionVelocities: Float32Array | null = null;
  private explosionLifetimes: Float32Array | null = null;
  private explosionStartTime: number = 0;
  private isExplosionActive: boolean = false;
  private explosionRadius: number = 0;
  private explosionMaxCount: number = MAX_EXPLOSION_PARTICLES;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createBackgroundStars(count: number = BACKGROUND_STAR_COUNT): void {
    if (this.backgroundStars) {
      this.scene.remove(this.backgroundStars);
      this.backgroundStars.geometry.dispose();
      (this.backgroundStars.material as THREE.Material).dispose();
    }

    const maxBackground = MAX_TOTAL_PARTICLES - MAX_EXPLOSION_PARTICLES;
    const actualCount = Math.min(count, maxBackground);
    this.backgroundStarCount = actualCount;
    
    const positions = new Float32Array(actualCount * 3);
    const colors = new Float32Array(actualCount * 3);
    const sizes = new Float32Array(actualCount);

    for (let i = 0; i < actualCount; i++) {
      const radius = 50 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.7 + Math.random() * 0.3;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;

      sizes[i] = 0.1 + Math.random() * 0.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });

    this.backgroundStars = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundStars);
  }

  createExplosion(
    position: THREE.Vector3,
    type: StarStage.SUPERNOVA | StarStage.PLANETARY_NEBULA
  ): void {
    this.removeExplosion();

    const baseCount = type === StarStage.SUPERNOVA ? 500 : 350;
    const availableSlots = MAX_TOTAL_PARTICLES - this.backgroundStarCount;
    const count = Math.min(baseCount, availableSlots, MAX_EXPLOSION_PARTICLES);
    this.explosionMaxCount = count;
    
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 200 + Math.random() * 300;
      
      velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      velocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      velocities[i * 3 + 2] = speed * Math.cos(phi);

      const colorT = Math.random();
      const color = EXPLOSION_START_COLOR.clone().lerp(EXPLOSION_END_COLOR, colorT);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      lifetimes[i] = PARTICLE_LIFETIME;
      sizes[i] = 0.3 + Math.random() * 0.7;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.explosionParticles = new THREE.Points(geometry, material);
    this.scene.add(this.explosionParticles);

    this.explosionVelocities = velocities;
    this.explosionLifetimes = lifetimes;
    this.isExplosionActive = true;
    this.explosionStartTime = 0;
    this.explosionRadius = 0;
  }

  update(deltaTime: number): void {
    if (this.backgroundStars) {
      this.backgroundStars.rotation.y += deltaTime * 0.01;
    }

    if (this.explosionParticles && this.isExplosionActive) {
      this.explosionStartTime += deltaTime;

      const positions = this.explosionParticles.geometry.attributes.position.array as Float32Array;
      const colors = this.explosionParticles.geometry.attributes.color.array as Float32Array;
      let activeCount = 0;
      let maxRadius = 0;

      for (let i = 0; i < this.explosionMaxCount; i++) {
        if (this.explosionLifetimes![i] > 0) {
          this.explosionLifetimes![i] -= deltaTime;
          
          positions[i * 3] += this.explosionVelocities![i * 3] * deltaTime;
          positions[i * 3 + 1] += this.explosionVelocities![i * 3 + 1] * deltaTime;
          positions[i * 3 + 2] += this.explosionVelocities![i * 3 + 2] * deltaTime;

          const dist = Math.sqrt(
            positions[i * 3] ** 2 + 
            positions[i * 3 + 1] ** 2 + 
            positions[i * 3 + 2] ** 2
          );
          maxRadius = Math.max(maxRadius, dist);

          const lifeRatio = Math.max(0, this.explosionLifetimes![i] / PARTICLE_LIFETIME);
          
          const startColor = EXPLOSION_START_COLOR;
          const endColor = EXPLOSION_END_COLOR;
          const colorProgress = 1 - lifeRatio;
          
          colors[i * 3] = startColor.r + (endColor.r - startColor.r) * colorProgress * lifeRatio;
          colors[i * 3 + 1] = startColor.g + (endColor.g - startColor.g) * colorProgress * lifeRatio;
          colors[i * 3 + 2] = startColor.b + (endColor.b - startColor.b) * colorProgress * lifeRatio;

          this.explosionVelocities![i * 3] *= 0.98;
          this.explosionVelocities![i * 3 + 1] *= 0.98;
          this.explosionVelocities![i * 3 + 2] *= 0.98;

          activeCount++;
        } else {
          positions[i * 3] = 0;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = -9999;
        }
      }

      this.explosionRadius = maxRadius;
      this.explosionParticles.geometry.attributes.position.needsUpdate = true;
      this.explosionParticles.geometry.attributes.color.needsUpdate = true;

      const material = this.explosionParticles.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, 1 - this.explosionStartTime / PARTICLE_LIFETIME);

      if (activeCount === 0 || this.explosionStartTime > PARTICLE_LIFETIME * 1.2) {
        this.removeExplosion();
      }
    }
  }

  private removeExplosion(): void {
    if (this.explosionParticles) {
      this.scene.remove(this.explosionParticles);
      this.explosionParticles.geometry.dispose();
      (this.explosionParticles.material as THREE.Material).dispose();
      this.explosionParticles = null;
    }
    this.explosionVelocities = null;
    this.explosionLifetimes = null;
    this.isExplosionActive = false;
  }

  recycleParticles(): void {
    if (!this.isExplosionActive && this.explosionStartTime > PARTICLE_LIFETIME * 2) {
      this.removeExplosion();
    }
  }

  getExplosionRadius(): number {
    return this.explosionRadius;
  }

  getTotalParticleCount(): number {
    let count = this.backgroundStarCount;
    if (this.isExplosionActive && this.explosionParticles) {
      const positions = this.explosionParticles.geometry.attributes.position.array as Float32Array;
      let active = 0;
      for (let i = 0; i < this.explosionMaxCount; i++) {
        if (this.explosionLifetimes && this.explosionLifetimes[i] > 0) {
          active++;
        }
      }
      count += active;
    }
    return count;
  }

  getActiveExplosionParticleCount(): number {
    if (!this.isExplosionActive || !this.explosionLifetimes) return 0;
    let count = 0;
    for (let i = 0; i < this.explosionMaxCount; i++) {
      if (this.explosionLifetimes[i] > 0) count++;
    }
    return count;
  }

  dispose(): void {
    if (this.backgroundStars) {
      this.scene.remove(this.backgroundStars);
      this.backgroundStars.geometry.dispose();
      (this.backgroundStars.material as THREE.Material).dispose();
      this.backgroundStars = null;
    }
    this.removeExplosion();
  }
}
