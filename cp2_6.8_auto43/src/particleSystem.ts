import * as THREE from 'three';
import { WindField } from './windField';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  trail: THREE.Vector3[];
}

export interface ParticleSystemParams {
  particleLife: number;
  emissionRate: number;
  speedMultiplier: number;
}

const MAX_PARTICLES = 2000;
const MAX_TRAIL_POINTS = 20;

export class ParticleSystem {
  private particles: Particle[] = [];
  private windField: WindField;
  private scene: THREE.Scene;

  public params: ParticleSystemParams = {
    particleLife: 5,
    emissionRate: 30,
    speedMultiplier: 1.0
  };

  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particlePoints: THREE.Points;

  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.LineBasicMaterial;
  private trailLines: THREE.LineSegments;

  private emissionAccumulator: number = 0;
  private lastEmissionPoint: THREE.Vector3 | null = null;

  private positionArray: Float32Array;
  private colorArray: Float32Array;
  private sizeArray: Float32Array;

  private trailPositionArray: Float32Array;
  private trailColorArray: Float32Array;

  private opacity: number = 1;
  private fadeTarget: number = 1;

  constructor(scene: THREE.Scene, windField: WindField) {
    this.scene = scene;
    this.windField = windField;

    this.positionArray = new Float32Array(MAX_PARTICLES * 3);
    this.colorArray = new Float32Array(MAX_PARTICLES * 3);
    this.sizeArray = new Float32Array(MAX_PARTICLES);

    this.trailPositionArray = new Float32Array(MAX_PARTICLES * MAX_TRAIL_POINTS * 2 * 3);
    this.trailColorArray = new Float32Array(MAX_PARTICLES * MAX_TRAIL_POINTS * 2 * 3);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positionArray, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositionArray, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColorArray, 3));

    this.trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trailLines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.trailLines.frustumCulled = false;
    this.scene.add(this.trailLines);

    this.resetBufferGeometry();
  }

  public resetParticles(): void {
    this.particles = [];
    this.fadeTarget = 0;
    this.opacity = 0;
    setTimeout(() => {
      this.fadeTarget = 1;
    }, 50);
  }

  public setFadeIn(): void {
    this.fadeTarget = 1;
  }

  public setFadeOut(): void {
    this.fadeTarget = 0;
  }

  public setEmissionPoint(point: THREE.Vector3 | null): void {
    this.lastEmissionPoint = point;
  }

  public update(deltaTime: number): void {
    const fadeSpeed = 2.0;
    if (this.opacity < this.fadeTarget) {
      this.opacity = Math.min(this.fadeTarget, this.opacity + deltaTime * fadeSpeed);
    } else if (this.opacity > this.fadeTarget) {
      this.opacity = Math.max(this.fadeTarget, this.opacity - deltaTime * fadeSpeed);
    }

    this.particleMaterial.opacity = 0.9 * this.opacity;
    this.trailMaterial.opacity = 0.6 * this.opacity;

    this.emissionAccumulator += deltaTime * this.params.emissionRate;
    while (this.emissionAccumulator >= 1) {
      this.emissionAccumulator -= 1;
      if (this.particles.length < MAX_PARTICLES && this.lastEmissionPoint) {
        this.emitParticle(this.lastEmissionPoint);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.copy(this.windField.getVelocity(p.position)).multiplyScalar(this.params.speedMultiplier);

      p.position.addScaledVector(p.velocity, deltaTime);

      if (p.trail.length === 0 || p.trail[p.trail.length - 1].distanceTo(p.position) > 0.05) {
        p.trail.push(p.position.clone());
        if (p.trail.length > MAX_TRAIL_POINTS) {
          p.trail.shift();
        }
      }
    }

    this.updateBufferGeometry();
  }

  private emitParticle(position: THREE.Vector3): void {
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15
    );

    const pos = position.clone().add(jitter);
    const vel = this.windField.getVelocity(pos).multiplyScalar(this.params.speedMultiplier);

    this.particles.push({
      position: pos,
      velocity: vel,
      life: 0,
      maxLife: this.params.particleLife,
      trail: [pos.clone()]
    });
  }

  private getColorFromSpeed(speed: number, alpha: number): THREE.Color {
    const clampedSpeed = THREE.MathUtils.clamp(speed, 0, 3.0);
    const t = clampedSpeed / 3.0;

    const color = new THREE.Color();

    if (t < 0.17) {
      color.setRGB(0.0, 0.2, 1.0);
    } else if (t < 0.33) {
      const blend = (t - 0.17) / 0.16;
      color.setRGB(
        THREE.MathUtils.lerp(0.0, 0.0, blend),
        THREE.MathUtils.lerp(0.2, 0.8, blend),
        THREE.MathUtils.lerp(1.0, 1.0, blend)
      );
    } else if (t < 0.67) {
      const blend = (t - 0.33) / 0.34;
      color.setRGB(
        THREE.MathUtils.lerp(0.0, 1.0, blend),
        THREE.MathUtils.lerp(0.8, 1.0, blend),
        THREE.MathUtils.lerp(1.0, 0.0, blend)
      );
    } else {
      const blend = (t - 0.67) / 0.33;
      color.setRGB(
        THREE.MathUtils.lerp(1.0, 1.0, blend),
        THREE.MathUtils.lerp(1.0, 0.23, blend),
        THREE.MathUtils.lerp(0.0, 0.23, blend)
      );
    }

    color.multiplyScalar(alpha);
    return color;
  }

  private resetBufferGeometry(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.positionArray[i * 3] = 0;
      this.positionArray[i * 3 + 1] = -1000;
      this.positionArray[i * 3 + 2] = 0;
      this.colorArray[i * 3] = 0;
      this.colorArray[i * 3 + 1] = 0;
      this.colorArray[i * 3 + 2] = 0;
    }

    for (let i = 0; i < MAX_PARTICLES * MAX_TRAIL_POINTS * 2; i++) {
      this.trailPositionArray[i * 3] = 0;
      this.trailPositionArray[i * 3 + 1] = -1000;
      this.trailPositionArray[i * 3 + 2] = 0;
      this.trailColorArray[i * 3] = 0;
      this.trailColorArray[i * 3 + 1] = 0;
      this.trailColorArray[i * 3 + 2] = 0;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, 0);
    this.trailGeometry.setDrawRange(0, 0);
  }

  private updateBufferGeometry(): void {
    const particleCount = this.particles.length;
    let trailSegmentCount = 0;

    for (let i = 0; i < particleCount; i++) {
      const p = this.particles[i];
      this.positionArray[i * 3] = p.position.x;
      this.positionArray[i * 3 + 1] = p.position.y;
      this.positionArray[i * 3 + 2] = p.position.z;

      const speed = p.velocity.length();
      const lifeRatio = p.life / p.maxLife;
      const alpha = 1 - lifeRatio;

      const color = this.getColorFromSpeed(speed, alpha);
      this.colorArray[i * 3] = color.r;
      this.colorArray[i * 3 + 1] = color.g;
      this.colorArray[i * 3 + 2] = color.b;

      for (let t = 0; t < p.trail.length - 1; t++) {
        if (trailSegmentCount >= MAX_PARTICLES * MAX_TRAIL_POINTS) break;

        const segIdx = trailSegmentCount * 2 * 3;
        const p0 = p.trail[t];
        const p1 = p.trail[t + 1];

        this.trailPositionArray[segIdx] = p0.x;
        this.trailPositionArray[segIdx + 1] = p0.y;
        this.trailPositionArray[segIdx + 2] = p0.z;

        this.trailPositionArray[segIdx + 3] = p1.x;
        this.trailPositionArray[segIdx + 4] = p1.y;
        this.trailPositionArray[segIdx + 5] = p1.z;

        const trailRatio = t / MAX_TRAIL_POINTS;
        const trailAlpha = alpha * trailRatio * 0.7;
        const trailColor = this.getColorFromSpeed(speed, trailAlpha);

        this.trailColorArray[segIdx] = trailColor.r;
        this.trailColorArray[segIdx + 1] = trailColor.g;
        this.trailColorArray[segIdx + 2] = trailColor.b;

        const trailAlpha2 = alpha * ((t + 1) / MAX_TRAIL_POINTS) * 0.7;
        const trailColor2 = this.getColorFromSpeed(speed, trailAlpha2);

        this.trailColorArray[segIdx + 3] = trailColor2.r;
        this.trailColorArray[segIdx + 4] = trailColor2.g;
        this.trailColorArray[segIdx + 5] = trailColor2.b;

        trailSegmentCount++;
      }
    }

    for (let i = particleCount; i < MAX_PARTICLES; i++) {
      this.positionArray[i * 3 + 1] = -1000;
    }

    const trailTotalSegments = MAX_PARTICLES * MAX_TRAIL_POINTS;
    for (let i = trailSegmentCount; i < trailTotalSegments; i++) {
      this.trailPositionArray[i * 2 * 3 + 1] = -1000;
      this.trailPositionArray[i * 2 * 3 + 4] = -1000;
    }

    this.particleGeometry.setDrawRange(0, particleCount);
    this.trailGeometry.setDrawRange(0, trailSegmentCount * 2);

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.scene.remove(this.particlePoints);
    this.scene.remove(this.trailLines);
  }
}
