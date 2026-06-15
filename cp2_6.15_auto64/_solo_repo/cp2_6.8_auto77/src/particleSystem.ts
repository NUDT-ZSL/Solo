import * as THREE from 'three';

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  opacity: number;
  trail: THREE.Vector3[];
  trailActive: boolean;
}

export interface SimParams {
  gravityConstant: number;
  decayExponent: number;
  elasticity: number;
  particleRadius: number;
}

const PARTICLE_COUNT = 100;
const TRAIL_LENGTH = 30;
const TRAIL_SPEED_THRESHOLD = 0.5;
const BOUNDARY = 10;

export class ParticleSystem {
  public particles: ParticleData[] = [];
  public attractors: THREE.Vector3[] = [
    new THREE.Vector3(-3, 0, 0),
    new THREE.Vector3(3, 0, 0)
  ];

  private positions: Float32Array;
  private colors: Float32Array;
  private opacities: Float32Array;

  constructor() {
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.opacities = new Float32Array(PARTICLE_COUNT);
    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * BOUNDARY * 2,
        (Math.random() - 0.5) * BOUNDARY * 2,
        (Math.random() - 0.5) * BOUNDARY * 2
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      this.particles.push({
        position,
        velocity,
        color: new THREE.Color(),
        opacity: 1,
        trail: [],
        trailActive: false
      });
    }
  }

  public reset(): void {
    this.initParticles();
  }

  public update(params: SimParams): void {
    const { gravityConstant, decayExponent, elasticity, particleRadius } = params;
    const minDistance = 0.1;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const acceleration = new THREE.Vector3();

      for (const attractor of this.attractors) {
        const diff = new THREE.Vector3().subVectors(attractor, p.position);
        let dist = diff.length();
        if (dist < minDistance) dist = minDistance;
        const force = gravityConstant / Math.pow(dist, decayExponent);
        diff.normalize().multiplyScalar(force);
        acceleration.add(diff);
      }

      p.velocity.add(acceleration);
      p.position.add(p.velocity);

      if (p.position.x > BOUNDARY) { p.position.x = BOUNDARY; p.velocity.x *= -elasticity; }
      if (p.position.x < -BOUNDARY) { p.position.x = -BOUNDARY; p.velocity.x *= -elasticity; }
      if (p.position.y > BOUNDARY) { p.position.y = BOUNDARY; p.velocity.y *= -elasticity; }
      if (p.position.y < -BOUNDARY) { p.position.y = -BOUNDARY; p.velocity.y *= -elasticity; }
      if (p.position.z > BOUNDARY) { p.position.z = BOUNDARY; p.velocity.z *= -elasticity; }
      if (p.position.z < -BOUNDARY) { p.position.z = -BOUNDARY; p.velocity.z *= -elasticity; }

      const speed = p.velocity.length();
      const hue = THREE.MathUtils.clamp(240 - (speed - 0.5) * 240 / 1.5, 0, 240);
      p.color.setHSL(hue / 360, 0.8, 0.6);

      let minAttractorDist = Infinity;
      for (const attractor of this.attractors) {
        const d = p.position.distanceTo(attractor);
        if (d < minAttractorDist) minAttractorDist = d;
      }
      p.opacity = THREE.MathUtils.lerp(0.9, 0.3, THREE.MathUtils.clamp(minAttractorDist / 10, 0, 1));

      if (speed > TRAIL_SPEED_THRESHOLD) {
        p.trail.push(p.position.clone());
        if (p.trail.length > TRAIL_LENGTH) p.trail.shift();
        p.trailActive = true;
      } else {
        if (p.trail.length > 0) p.trail.shift();
        if (p.trail.length === 0) p.trailActive = false;
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const diff = new THREE.Vector3().subVectors(p2.position, p1.position);
        const dist = diff.length();
        const minDist = particleRadius * 2;
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const normal = diff.clone().normalize();
          p1.position.add(normal.clone().multiplyScalar(-overlap));
          p2.position.add(normal.clone().multiplyScalar(overlap));
          const vRel = new THREE.Vector3().subVectors(p2.velocity, p1.velocity);
          const vDotN = vRel.dot(normal);
          if (vDotN < 0) {
            const impulse = normal.clone().multiplyScalar(vDotN * (1 + elasticity) / 2);
            p1.velocity.add(impulse);
            p2.velocity.sub(impulse);
          }
        }
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;
      this.opacities[i] = p.opacity;
    }
  }

  public getPositions(): Float32Array {
    return this.positions;
  }

  public getColors(): Float32Array {
    return this.colors;
  }

  public getOpacities(): Float32Array {
    return this.opacities;
  }

  public getKineticEnergy(): number {
    let energy = 0;
    for (const p of this.particles) {
      const speed = p.velocity.length();
      energy += 0.5 * speed * speed;
    }
    return energy;
  }

  public getParticleCount(): number {
    return PARTICLE_COUNT;
  }

  public getTrailLength(): number {
    return TRAIL_LENGTH;
  }
}
