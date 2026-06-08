import * as THREE from 'three';

export interface DustParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
  clusterId: number;
}

export class DustParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
  clusterId: number;
  originalPosition: THREE.Vector3;
  phase: number;
  amplitude: number;

  constructor(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: THREE.Color,
    size: number,
    life: number,
    clusterId: number = -1
  ) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.color = color.clone();
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.alpha = 1.0;
    this.clusterId = clusterId;
    this.originalPosition = position.clone();
    this.phase = Math.random() * Math.PI * 2;
    this.amplitude = 0.3 + Math.random() * 0.7;
  }

  update(delta: number, flowSpeed: number, densityFactor: number): void {
    this.life -= delta;

    const lifeRatio = Math.max(0, this.life / this.maxLife);

    if (lifeRatio > 0.8) {
      this.alpha = (1.0 - lifeRatio) / 0.2;
    } else if (lifeRatio < 0.2) {
      this.alpha = lifeRatio / 0.2;
    } else {
      this.alpha = 1.0;
    }

    this.size = (0.3 + lifeRatio * 0.7) * (0.8 + 0.2 * densityFactor);

    const t = performance.now() * 0.001 * flowSpeed;
    this.velocity.x += Math.sin(this.phase + t * 0.5) * 0.002 * flowSpeed;
    this.velocity.y += Math.cos(this.phase + t * 0.3) * 0.001 * flowSpeed;
    this.velocity.z += Math.sin(this.phase + t * 0.4) * 0.0015 * flowSpeed;

    this.position.add(this.velocity.clone().multiplyScalar(delta * flowSpeed * densityFactor));

    this.velocity.multiplyScalar(0.998);

    const driftForce = this.originalPosition.clone().sub(this.position).multiplyScalar(0.001 * densityFactor);
    this.velocity.add(driftForce);
  }

  isDead(): boolean {
    return this.life <= 0;
  }

  reset(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: THREE.Color,
    size: number,
    life: number
  ): void {
    this.position.copy(position);
    this.velocity.copy(velocity);
    this.color.copy(color);
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.alpha = 1.0;
    this.originalPosition.copy(position);
    this.phase = Math.random() * Math.PI * 2;
    this.amplitude = 0.3 + Math.random() * 0.7;
  }

  toData(): DustParticleData {
    return {
      position: this.position.clone(),
      velocity: this.velocity.clone(),
      color: this.color.clone(),
      size: this.size,
      life: this.life,
      maxLife: this.maxLife,
      alpha: this.alpha,
      clusterId: this.clusterId,
    };
  }
}

export class BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
  flickerSpeed: number;

  constructor(origin: THREE.Vector3, baseColor: THREE.Color) {
    this.position = origin.clone();
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    const speed = 1.5 + Math.random() * 3.0;
    this.velocity = dir.multiplyScalar(speed);
    this.color = baseColor.clone().lerp(new THREE.Color(1, 1, 1), 0.3 + Math.random() * 0.4);
    this.size = 0.15 + Math.random() * 0.25;
    this.maxLife = 1.5;
    this.life = this.maxLife;
    this.alpha = 1.0;
    this.flickerSpeed = 5 + Math.random() * 10;
  }

  update(delta: number): void {
    this.life -= delta;
    const ratio = Math.max(0, this.life / this.maxLife);
    this.alpha = ratio * (0.5 + 0.5 * Math.sin(this.life * this.flickerSpeed));
    this.size = (0.15 + Math.random() * 0.05) * ratio;
    this.velocity.multiplyScalar(0.96);
    this.position.add(this.velocity.clone().multiplyScalar(delta));
  }

  isDead(): boolean {
    return this.life <= 0;
  }
}
