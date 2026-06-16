import * as THREE from 'three';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  trail: THREE.Vector3[];
}

export interface DropletData {
  id: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  radius: number;
  targetRadius: number;
  color: THREE.Color;
  targetColor: THREE.Color;
  particles: Particle[];
  volume: number;
  merging: boolean;
  mergeTargetId: string | null;
  colorTransitionProgress: number;
  shakeOffset: number;
}

const PARTICLE_COUNT = 100;
const TRAIL_LENGTH = 50;

export class Droplet {
  data: DropletData;

  constructor(
    id: string,
    position: THREE.Vector3,
    radius: number,
    color: THREE.Color
  ) {
    this.data = {
      id,
      position: position.clone(),
      targetPosition: position.clone(),
      radius,
      targetRadius: radius,
      color: color.clone(),
      targetColor: color.clone(),
      particles: this.createParticles(position, radius),
      volume: (4 / 3) * Math.PI * Math.pow(radius, 3),
      merging: false,
      mergeTargetId: null,
      colorTransitionProgress: 1,
      shakeOffset: 0,
    };
  }

  private createParticles(center: THREE.Vector3, radius: number): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * radius * 0.9;

      const pos = new THREE.Vector3(
        center.x + r * Math.sin(phi) * Math.cos(theta),
        center.y + r * Math.sin(phi) * Math.sin(theta),
        center.z + r * Math.cos(phi)
      );

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      );

      particles.push({
        position: pos,
        velocity,
        trail: [pos.clone()],
      });
    }
    return particles;
  }

  update(deltaTime: number, temperature: number): void {
    const data = this.data;

    if (!data.position.equals(data.targetPosition)) {
      data.position.lerp(data.targetPosition, Math.min(1, deltaTime * 4));
    }

    const radiusDiff = Math.abs(data.targetRadius - data.radius);
    if (radiusDiff > 0.01) {
      data.radius += (data.targetRadius - data.radius) * Math.min(1, deltaTime * 3);
    }

    if (data.colorTransitionProgress < 1) {
      data.colorTransitionProgress = Math.min(
        1,
        data.colorTransitionProgress + deltaTime * 1.25
      );
      data.color.lerpColors(
        data.color.clone(),
        data.targetColor,
        deltaTime * 1.25
      );
    }

    data.shakeOffset += deltaTime * (0.5 + (temperature - 10) / 40 * 1.5);

    this.updateParticles(deltaTime, temperature);
  }

  private updateParticles(deltaTime: number, temperature: number): void {
    const data = this.data;
    const tempFactor = 0.5 + (temperature - 10) / 40;

    for (const particle of data.particles) {
      const displacement = (0.5 + Math.random() * 1.5) * tempFactor;
      particle.velocity.x += (Math.random() - 0.5) * displacement * deltaTime * 60;
      particle.velocity.y += (Math.random() - 0.5) * displacement * deltaTime * 60;
      particle.velocity.z += (Math.random() - 0.5) * displacement * deltaTime * 60;

      particle.velocity.multiplyScalar(0.95);

      const newPos = particle.position.clone().add(particle.velocity);

      const distFromCenter = newPos.distanceTo(data.position);
      if (distFromCenter > data.radius * 0.95) {
        const normal = newPos.clone().sub(data.position).normalize();
        particle.velocity.reflect(normal).multiplyScalar(0.6);

        const constrainedPos = data.position
          .clone()
          .add(normal.multiplyScalar(data.radius * 0.9));
        particle.position.copy(constrainedPos);
      } else {
        particle.position.copy(newPos);
      }

      particle.trail.push(particle.position.clone());
      if (particle.trail.length > TRAIL_LENGTH) {
        particle.trail.shift();
      }
    }
  }

  absorbParticles(otherParticles: Particle[]): void {
    const data = this.data;
    for (const p of otherParticles) {
      const dir = p.position.clone().sub(data.position).normalize();
      const dist = Math.random() * data.radius * 0.9;
      p.position.copy(data.position.clone().add(dir.multiplyScalar(dist)));
      p.trail = [p.position.clone()];
      data.particles.push(p);
    }
  }

  mergeWith(other: Droplet): void {
    const data = this.data;
    const otherData = other.data;

    const totalVolume = data.volume + otherData.volume;
    const thisRatio = data.volume / totalVolume;
    const otherRatio = otherData.volume / totalVolume;

    data.volume = totalVolume;
    data.targetRadius = Math.cbrt((3 * totalVolume) / (4 * Math.PI));

    const newPos = data.position
      .clone()
      .multiplyScalar(thisRatio)
      .add(otherData.position.clone().multiplyScalar(otherRatio));
    data.targetPosition.copy(newPos);

    const newColor = new THREE.Color()
      .setRGB(
        data.color.r * thisRatio + otherData.color.r * otherRatio,
        data.color.g * thisRatio + otherData.color.g * otherRatio,
        data.color.b * thisRatio + otherData.color.b * otherRatio
      );
    data.targetColor.copy(newColor);
    data.colorTransitionProgress = 0;

    this.absorbParticles(otherData.particles);
  }
}
