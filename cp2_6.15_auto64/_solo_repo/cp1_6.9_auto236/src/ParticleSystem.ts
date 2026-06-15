import * as THREE from 'three';
import { PrismArray } from './PrizmArray';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  brightness: number;
  life: number;
  maxLife: number;
  active: boolean;
  trail: THREE.Vector3[];
  trailColors: THREE.Color[];
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private prismArray: PrismArray;
  private particles: Particle[] = [];
  private particlesMesh!: THREE.Points;
  private trailMesh!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private trailGeometry!: THREE.BufferGeometry;
  private baseCount: number;
  private totalCount: number;
  private doubledUntil = 0;
  private readonly maxRadius = 20;
  private readonly trailLength = 8;
  private elapsedTime = 0;

  constructor(
    scene: THREE.Scene,
    prismArray: PrismArray,
    isMobile: boolean = false
  ) {
    this.scene = scene;
    this.prismArray = prismArray;
    this.baseCount = isMobile ? 350 : 500;
    this.totalCount = this.baseCount * 2;

    this.particles = this.createInitialParticles();

    this.particleGeometry = new THREE.BufferGeometry();
    this.trailGeometry = new THREE.BufferGeometry();

    this.initParticleMesh();
    this.initTrailMesh();
  }

  private createInitialParticles(): Particle[] {
    const arr: Particle[] = [];
    for (let i = 0; i < this.totalCount; i++) {
      const particle = this.createSingleParticle();
      particle.active = false;
      arr.push(particle);
    }
    return arr;
  }

  private createSingleParticle(): Particle {
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 2
    ).normalize();

    const speed = 2 + Math.random() * 4;
    const hue = Math.random();

    return {
      position: new THREE.Vector3(0, 0, 0),
      velocity: direction.multiplyScalar(speed),
      color: new THREE.Color().setHSL(hue, 1, 0.6),
      brightness: 1,
      life: 0,
      maxLife: 8 + Math.random() * 8,
      active: true,
      trail: [],
      trailColors: []
    };
  }

  private resetParticle(p: Particle, fromCenter: boolean = true): void {
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 2
    ).normalize();
    const speed = 2 + Math.random() * 4;
    const hue = Math.random();

    if (fromCenter) {
      p.position.set(0, 0, 0);
    }
    p.velocity = direction.multiplyScalar(speed);
    p.color.setHSL(hue, 1, 0.6);
    p.brightness = 1;
    p.life = 0;
    p.maxLife = 8 + Math.random() * 8;
    p.active = true;
    p.trail = [];
    p.trailColors = [];
  }

  private initParticleMesh(): void {
    const maxParticles = this.totalCount;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );
    this.particleGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(sizes, 1)
    );

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particlesMesh = new THREE.Points(this.particleGeometry, material);
    this.scene.add(this.particlesMesh);
  }

  private initTrailMesh(): void {
    const maxTrailPoints = this.totalCount * this.trailLength;
    const positions = new Float32Array(maxTrailPoints * 3);
    const colors = new Float32Array(maxTrailPoints * 3);
    const alphas = new Float32Array(maxTrailPoints);

    this.trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.trailGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );
    this.trailGeometry.setAttribute(
      'alpha',
      new THREE.BufferAttribute(alphas, 1)
    );

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.trailMesh = new THREE.Points(this.trailGeometry, material);
    this.scene.add(this.trailMesh);
  }

  public triggerPulse(): void {
    this.doubledUntil = this.elapsedTime + 2;

    for (let i = 0; i < this.baseCount; i++) {
      if (!this.particles[i + this.baseCount].active) {
        this.resetParticle(this.particles[i + this.baseCount]);
      }
    }
  }

  public getActiveCount(): number {
    let count = 0;
    for (const p of this.particles) {
      if (p.active) count++;
    }
    return count;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.elapsedTime = elapsedTime;
    const effectiveCount = elapsedTime < this.doubledUntil ? this.totalCount : this.baseCount;

    for (let i = 0; i < this.totalCount; i++) {
      const p = this.particles[i];

      if (i < effectiveCount) {
        if (!p.active) {
          this.resetParticle(p);
          continue;
        }
      } else {
        p.active = false;
        continue;
      }

      p.trail.unshift(p.position.clone());
      p.trailColors.unshift(p.color.clone());
      if (p.trail.length > this.trailLength) {
        p.trail.pop();
        p.trailColors.pop();
      }

      const collision = this.prismArray.checkCollision(
        p.position,
        p.velocity,
        deltaTime
      );

      if (collision.collided) {
        p.velocity = collision.newVelocity;
        const newHue = collision.hue;
        p.color.setHSL(newHue, 1, 0.6);
        p.brightness = Math.min(p.brightness * 1.2, 2.5);
      }

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));

      const distFromCenter = p.position.length();
      if (distFromCenter > this.maxRadius) {
        const fadeStart = this.maxRadius - 2;
        if (distFromCenter > fadeStart) {
          const fadeAmount = (distFromCenter - fadeStart) / 2;
          p.brightness = Math.max(0.1, p.brightness * (1 - fadeAmount * 0.1));
        }
        if (distFromCenter > this.maxRadius + 0.5) {
          this.resetParticle(p);
        }
      }

      p.life += deltaTime;
      if (p.life > p.maxLife) {
        this.resetParticle(p);
      }

      p.brightness = Math.max(1, p.brightness - deltaTime * 0.5);
    }

    this.updateGeometry();
  }

  private updateGeometry(): void {
    const particlePosAttr = this.particleGeometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const particleColorAttr = this.particleGeometry.getAttribute(
      'color'
    ) as THREE.BufferAttribute;
    const particleSizeAttr = this.particleGeometry.getAttribute(
      'size'
    ) as THREE.BufferAttribute;

    const trailPosAttr = this.trailGeometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const trailColorAttr = this.trailGeometry.getAttribute(
      'color'
    ) as THREE.BufferAttribute;

    let particleIndex = 0;
    let trailIndex = 0;

    for (let i = 0; i < this.totalCount; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      particlePosAttr.setXYZ(
        particleIndex,
        p.position.x,
        p.position.y,
        p.position.z
      );

      const brightCol = p.color.clone().multiplyScalar(p.brightness);
      particleColorAttr.setXYZ(
        particleIndex,
        Math.min(brightCol.r, 1),
        Math.min(brightCol.g, 1),
        Math.min(brightCol.b, 1)
      );
      (particleSizeAttr.array as Float32Array)[particleIndex] = 0.06 + 0.04 * p.brightness;

      particleIndex++;

      for (let t = 0; t < p.trail.length; t++) {
        const tp = p.trail[t];
        const tc = p.trailColors[t];
        const alpha = 1 - t / p.trail.length;

        trailPosAttr.setXYZ(trailIndex, tp.x, tp.y, tp.z);
        trailColorAttr.setXYZ(
          trailIndex,
          Math.min(tc.r * alpha * 0.8, 1),
          Math.min(tc.g * alpha * 0.8, 1),
          Math.min(tc.b * alpha * 0.8, 1)
        );

        trailIndex++;
      }
    }

    for (let i = particleIndex; i < this.totalCount; i++) {
      particlePosAttr.setXYZ(i, 0, -1000, 0);
      particleColorAttr.setXYZ(i, 0, 0, 0);
    }

    const maxTrailPoints = this.totalCount * this.trailLength;
    for (let i = trailIndex; i < maxTrailPoints; i++) {
      trailPosAttr.setXYZ(i, 0, -1000, 0);
      trailColorAttr.setXYZ(i, 0, 0, 0);
    }

    particlePosAttr.needsUpdate = true;
    particleColorAttr.needsUpdate = true;
    particleSizeAttr.needsUpdate = true;
    trailPosAttr.needsUpdate = true;
    trailColorAttr.needsUpdate = true;

    (this.particlesMesh.material as THREE.PointsMaterial).needsUpdate = true;
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.trailGeometry.dispose();
    (this.particlesMesh.material as THREE.Material).dispose();
    (this.trailMesh.material as THREE.Material).dispose();
    this.scene.remove(this.particlesMesh);
    this.scene.remove(this.trailMesh);
  }
}
