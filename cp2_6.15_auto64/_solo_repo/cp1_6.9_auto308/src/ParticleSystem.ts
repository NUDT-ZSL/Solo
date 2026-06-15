import * as THREE from 'three';

export interface EjectedParticle {
  position: THREE.Vector3;
  color: THREE.Color;
  id: number;
}

interface ParticleData {
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  originalRadius: number;
  driftPhase: number;
  driftSpeed: number;
  color: THREE.Color;
  size: number;
  opacity: number;
  isEjected: boolean;
  tweenProgress: number;
  tweenTarget: THREE.Vector3 | null;
  flickerPhase: number;
  id: number;
}

export class ParticleSystem {
  public mesh: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private particles: ParticleData[] = [];
  private particleCount: number;
  private sphereRadius: number = 4.0;
  private ejectionRadius: number = 6.0;
  private repelRadius: number = 2.0;
  private maxRepelSpeed: number = 0.5;
  private repelSmoothTime: number = 0.3;
  private restoreSmoothTime: number = 0.5;
  private driftAmplitude: number = 0.1;
  private driftPeriod: number = 3.0;

  private mouseWorldPosition: THREE.Vector3 = new THREE.Vector3(0, 1000, 0);
  private isMouseActive: boolean = false;
  private elapsedTime: number = 0;
  private nextId: number = 0;
  private isMobile: boolean;

  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;
  private opacityAttribute: THREE.BufferAttribute;

  public onParticleEjected: ((ejected: EjectedParticle) => void) | null = null;

  constructor(scene: THREE.Scene, isMobile: boolean = false) {
    this.isMobile = isMobile;
    this.particleCount = isMobile ? 1000 : 2000;

    this.geometry = new THREE.BufferGeometry();
    this.initParticleData();

    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const opacities = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.currentPosition.x;
      positions[i * 3 + 1] = p.currentPosition.y;
      positions[i * 3 + 2] = p.currentPosition.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      sizes[i] = p.size;
      opacities[i] = p.opacity;
    }

    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    this.opacityAttribute = new THREE.BufferAttribute(opacities, 1);

    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('size', this.sizeAttribute);
    this.geometry.setAttribute('opacity', this.opacityAttribute);

    this.material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
      map: this.createSoftGlowTexture(),
      alphaTest: 0.01
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.position.set(0, 0, 0);
    scene.add(this.mesh);
  }

  private initParticleData(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = this.sphereRadius * (0.95 + Math.random() * 0.1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const basePos = new THREE.Vector3(x, y, z);
      const currentPos = basePos.clone();

      const hueT = Math.random();
      const hue = 260 + hueT * 50;
      const sat = 20 + Math.random() * 40;
      const light = 82 + Math.random() * 12;
      const color = new THREE.Color().setHSL(hue / 360, sat / 100, light / 100);

      this.particles.push({
        basePosition: basePos,
        currentPosition: currentPos,
        velocity: new THREE.Vector3(),
        originalRadius: r,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.8 + Math.random() * 0.4,
        color: color,
        size: 0.08 + Math.random() * 0.22,
        opacity: 0.9,
        isEjected: false,
        tweenProgress: 1.0,
        tweenTarget: null,
        flickerPhase: Math.random() * Math.PI * 2,
        id: this.nextId++
      });
    }
  }

  public setMouseWorldPosition(position: THREE.Vector3 | null): void {
    if (position) {
      this.mouseWorldPosition.copy(position);
      this.isMouseActive = true;
    } else {
      this.isMouseActive = false;
    }
  }

  public triggerExplosion(center: THREE.Vector3): void {
    for (const p of this.particles) {
      if (p.isEjected) continue;
      const dir = new THREE.Vector3().subVectors(p.currentPosition, center);
      const dist = dir.length();
      if (dist < this.repelRadius * 3.0) {
        dir.normalize();
        const force = Math.max(0, (this.repelRadius * 3.0 - dist) / (this.repelRadius * 3.0)) * this.maxRepelSpeed * 3;
        p.velocity.add(dir.multiplyScalar(force));
      }
    }
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (p.isEjected) continue;

      const driftOffset = Math.sin(this.elapsedTime * (Math.PI * 2 / this.driftPeriod) * p.driftSpeed + p.driftPhase) * this.driftAmplitude;
      const driftDir = p.basePosition.clone().normalize();
      const driftPos = p.basePosition.clone().add(driftDir.multiplyScalar(driftOffset));

      if (this.isMouseActive) {
        const toParticle = new THREE.Vector3().subVectors(p.currentPosition, this.mouseWorldPosition);
        const dist = toParticle.length();

        if (dist < this.repelRadius && dist > 0.001) {
          const forceFactor = (this.repelRadius - dist) / this.repelRadius;
          const repelForce = forceFactor * this.maxRepelSpeed;
          toParticle.normalize();
          p.velocity.add(toParticle.multiplyScalar(repelForce * deltaTime * 60));

          p.flickerPhase += deltaTime * 20;
          p.opacity = 0.6 + Math.sin(p.flickerPhase) * 0.4 * forceFactor;

          p.tweenProgress = 0;
          p.tweenTarget = null;
        } else {
          if (p.tweenTarget === null) {
            p.tweenTarget = driftPos.clone();
            p.tweenProgress = 0;
          }
        }
      } else {
        if (p.tweenTarget === null) {
          p.tweenTarget = driftPos.clone();
          p.tweenProgress = 0;
        }
      }

      const smoothFactor = p.velocity.lengthSq() > 0.0001 ? (deltaTime / this.repelSmoothTime) : (deltaTime / this.restoreSmoothTime);
      const damping = Math.pow(0.001, deltaTime);
      p.velocity.multiplyScalar(damping);

      p.currentPosition.add(p.velocity.clone().multiplyScalar(deltaTime * 60));

      if (p.tweenTarget && p.velocity.lengthSq() < 0.001) {
        p.tweenProgress = Math.min(1, p.tweenProgress + deltaTime / this.restoreSmoothTime);
        const t = this.easeOutCubic(p.tweenProgress);
        p.currentPosition.lerpVectors(p.currentPosition, p.tweenTarget, t * smoothFactor * 2);
      }

      if (p.velocity.lengthSq() < 0.0001 && !this.isMouseActive) {
        p.currentPosition.lerp(driftPos, Math.min(1, deltaTime * 2));
      }

      if (!this.isMouseActive || p.velocity.lengthSq() < 0.01) {
        p.opacity = p.opacity + (0.9 - p.opacity) * Math.min(1, deltaTime * 3);
      }

      const distFromCenter = p.currentPosition.length();
      if (distFromCenter > this.ejectionRadius) {
        if (this.onParticleEjected) {
          this.onParticleEjected({
            position: p.currentPosition.clone(),
            color: p.color.clone(),
            id: p.id
          });
        }
        p.isEjected = true;
        p.opacity = 0;
      }
    }

    this.updateBufferAttributes();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateBufferAttributes(): void {
    const posArr = this.positionAttribute.array as Float32Array;
    const colArr = this.colorAttribute.array as Float32Array;
    const sizeArr = this.sizeAttribute.array as Float32Array;
    const opArr = this.opacityAttribute.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      const idx3 = i * 3;
      posArr[idx3] = p.currentPosition.x;
      posArr[idx3 + 1] = p.currentPosition.y;
      posArr[idx3 + 2] = p.currentPosition.z;
      colArr[idx3] = p.color.r;
      colArr[idx3 + 1] = p.color.g;
      colArr[idx3 + 2] = p.color.b;
      sizeArr[i] = p.size;
      opArr[i] = p.opacity;
    }

    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public getSphereRadius(): number {
    return this.sphereRadius;
  }

  public resetEjectedParticles(count: number = 50): void {
    let resetCount = 0;
    for (const p of this.particles) {
      if (!p.isEjected) continue;
      if (resetCount >= count) break;

      p.isEjected = false;
      p.opacity = 0.9;
      p.velocity.set(0, 0, 0);
      p.currentPosition.copy(p.basePosition);
      p.tweenProgress = 1;
      p.tweenTarget = null;
      resetCount++;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    if (this.material.map) this.material.map.dispose();
    this.material.dispose();
  }

  private createSoftGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(230, 220, 255, 0.6)');
    gradient.addColorStop(0.6, 'rgba(200, 180, 255, 0.25)');
    gradient.addColorStop(0.8, 'rgba(180, 150, 255, 0.08)');
    gradient.addColorStop(1.0, 'rgba(150, 120, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}
