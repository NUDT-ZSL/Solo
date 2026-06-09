import * as THREE from 'three';

export type BehaviorMode = 'wander' | 'chase';

export type LayerType = 'shallow' | 'mid' | 'deep';

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  originalColor: THREE.Color;
  originalSize: number;
  phase: THREE.Vector3;
  amplitude: THREE.Vector3;
  frequency: THREE.Vector3;
  wanderSpeed: number;
  isChasing: boolean;
  targetIndex: number;
  escapePulseActive: boolean;
  escapePulseFrame: number;
}

export interface ParticleSystemConfig {
  count: number;
  layer: LayerType;
  yMin: number;
  yMax: number;
  behavior: BehaviorMode;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  boundsX?: number;
  boundsZ?: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  public particles: ParticleData[] = [];
  public config: ParticleSystemConfig;

  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private boundsX: number = 20;
  private boundsZ: number = 20;

  constructor(config: ParticleSystemConfig) {
    this.config = config;
    if (config.boundsX !== undefined) this.boundsX = config.boundsX;
    if (config.boundsZ !== undefined) this.boundsZ = config.boundsZ;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(config.count * 3);
    this.colors = new Float32Array(config.count * 3);
    this.sizes = new Float32Array(config.count);

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
      map: ParticleSystem.createCircleTexture(),
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;

    this.initParticles();
    this.updateBuffers();
  }

  private static createCircleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initParticles(): void {
    for (let i = 0; i < this.config.count; i++) {
      const t = Math.random();
      const depthColor = this.config.colorStart.clone().lerp(this.config.colorEnd, t);

      const particle: ParticleData = {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * this.boundsX * 2,
          this.config.yMax + Math.random() * (this.config.yMin - this.config.yMax),
          (Math.random() - 0.5) * this.boundsZ * 2
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        size: 2 + Math.random() * 3,
        color: depthColor.clone(),
        originalColor: depthColor.clone(),
        originalSize: 2 + Math.random() * 3,
        phase: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        amplitude: new THREE.Vector3(
          3 + Math.random() * 2,
          3 + Math.random() * 2,
          3 + Math.random() * 2
        ),
        frequency: new THREE.Vector3(
          (2 * Math.PI) / (60 + Math.random() * 60),
          (2 * Math.PI) / (60 + Math.random() * 60),
          (2 * Math.PI) / (60 + Math.random() * 60)
        ),
        wanderSpeed: 0.02 + Math.random() * 0.06,
        isChasing: false,
        targetIndex: -1,
        escapePulseActive: false,
        escapePulseFrame: 0,
      };

      this.particles.push(particle);
    }
  }

  public update(
    delta: number,
    speedMultiplier: number,
    frame: number,
    targetParticles?: ParticleData[]
  ): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (this.config.behavior === 'chase' && targetParticles && targetParticles.length > 0) {
        if (!p.isChasing || p.targetIndex < 0 || p.targetIndex >= targetParticles.length) {
          let nearestDist = Infinity;
          let nearestIdx = 0;
          for (let j = 0; j < targetParticles.length; j++) {
            const d = p.position.distanceTo(targetParticles[j].position);
            if (d < nearestDist) {
              nearestDist = d;
              nearestIdx = j;
            }
          }
          p.targetIndex = nearestIdx;
          p.isChasing = true;
        }

        const target = targetParticles[p.targetIndex];
        const dir = new THREE.Vector3().subVectors(target.position, p.position);
        const dist = dir.length();

        if (dist < 1.5) {
          target.position.set(
            (Math.random() - 0.5) * this.boundsX * 2,
            this.config.yMax - 10 + Math.random() * 10,
            (Math.random() - 0.5) * this.boundsZ * 2
          );
          target.escapePulseActive = true;
          target.escapePulseFrame = 0;
          p.isChasing = false;
          p.targetIndex = -1;
        } else {
          dir.normalize();
          const chaseSpeed = p.wanderSpeed * 1.2;
          p.velocity.lerp(dir.multiplyScalar(chaseSpeed), 0.05);
        }
      } else {
        p.velocity.x = Math.sin(frame * p.frequency.x + p.phase.x) * p.amplitude.x * 0.01 * p.wanderSpeed;
        p.velocity.y = Math.sin(frame * p.frequency.y + p.phase.y) * p.amplitude.y * 0.01 * p.wanderSpeed;
        p.velocity.z = Math.sin(frame * p.frequency.z + p.phase.z) * p.amplitude.z * 0.01 * p.wanderSpeed;
      }

      p.position.x += p.velocity.x * speedMultiplier;
      p.position.y += p.velocity.y * speedMultiplier;
      p.position.z += p.velocity.z * speedMultiplier;

      if (p.position.x > this.boundsX) p.position.x = -this.boundsX;
      if (p.position.x < -this.boundsX) p.position.x = this.boundsX;
      if (p.position.y > this.config.yMax) p.position.y = this.config.yMin;
      if (p.position.y < this.config.yMin) p.position.y = this.config.yMax;
      if (p.position.z > this.boundsZ) p.position.z = -this.boundsZ;
      if (p.position.z < -this.boundsZ) p.position.z = this.boundsZ;

      if (p.escapePulseActive) {
        p.escapePulseFrame++;
        if (p.escapePulseFrame > 10) {
          p.escapePulseActive = false;
          p.escapePulseFrame = 0;
        }
      }
    }

    this.updateBuffers();
  }

  private updateBuffers(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;

      this.sizes[i] = p.size;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.computeBoundingSphere();
  }

  public setVisible(visible: boolean): void {
    this.points.visible = visible;
  }

  public getVisible(): boolean {
    return this.points.visible;
  }

  public highlightParticle(index: number): void {
    if (index >= 0 && index < this.particles.length) {
      this.particles[index].color.set(0xffffff);
      this.particles[index].size = 8;
      this.updateBuffers();
    }
  }

  public resetParticle(index: number): void {
    if (index >= 0 && index < this.particles.length) {
      this.particles[index].color.copy(this.particles[index].originalColor);
      this.particles[index].size = this.particles[index].originalSize;
      this.updateBuffers();
    }
  }

  public getParticlePosition(index: number): THREE.Vector3 {
    if (index >= 0 && index < this.particles.length) {
      return this.particles[index].position.clone();
    }
    return new THREE.Vector3();
  }

  public getEscapePulses(): { position: THREE.Vector3; frame: number }[] {
    const pulses: { position: THREE.Vector3; frame: number }[] = [];
    for (const p of this.particles) {
      if (p.escapePulseActive) {
        pulses.push({ position: p.position.clone(), frame: p.escapePulseFrame });
      }
    }
    return pulses;
  }

  public dispose(): void {
    this.geometry.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
    this.material.dispose();
  }
}
