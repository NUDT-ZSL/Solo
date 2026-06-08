import * as THREE from 'three';

export interface DuneParams {
  windSpeed: number;
  sandDensity: number;
  erosionStrength: number;
}

const PARTICLE_COUNT = 50000;
const FIELD_SIZE = 60;
const FIELD_HALF = FIELD_SIZE / 2;

function duneHeight(x: number, z: number, time: number, windSpeed: number, erosion: number): number {
  const base =
    Math.sin(x * 0.15 + time * 0.1 * windSpeed) *
    Math.cos(z * 0.12 + time * 0.07 * windSpeed) * 2.5;
  const secondary =
    Math.sin(x * 0.3 + z * 0.2 + time * 0.15 * windSpeed) * 1.2;
  const ripple =
    Math.sin(x * 0.8 + time * 0.3 * windSpeed) *
    Math.cos(z * 0.6 + time * 0.2 * windSpeed) * 0.3 * (1 - erosion * 0.5);
  return base + secondary + ripple - 1.0;
}

export class DuneParticles {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private params: DuneParams;
  private time: number = 0;

  constructor(params: DuneParams) {
    this.params = params;
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.velocities = new Float32Array(PARTICLE_COUNT * 3);
    this.lifetimes = new Float32Array(PARTICLE_COUNT);

    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.resetParticle(i, true);
      const t = Math.random();
      colors[i * 3] = 0.76 + t * 0.14;
      colors[i * 3 + 1] = 0.60 + t * 0.15;
      colors[i * 3 + 2] = 0.30 + t * 0.10;
      sizes[i] = 0.08 + Math.random() * 0.12;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
  }

  private resetParticle(i: number, randomLife: boolean): void {
    const x = (Math.random() - 0.5) * FIELD_SIZE;
    const z = (Math.random() - 0.5) * FIELD_SIZE;
    const y = duneHeight(x, z, this.time, this.params.windSpeed, this.params.erosionStrength) + Math.random() * 0.3;
    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;
    this.velocities[i * 3] = 0;
    this.velocities[i * 3 + 1] = 0;
    this.velocities[i * 3 + 2] = 0;
    this.lifetimes[i] = randomLife ? Math.random() : 1.0;
  }

  updateParams(params: DuneParams): void {
    this.params = params;
  }

  triggerSandstorm(center: THREE.Vector3, radius: number): void {
    const cx = center.x, cz = center.z;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const px = this.positions[i * 3];
      const pz = this.positions[i * 3 + 2];
      const dx = px - cx;
      const dz = pz - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < radius) {
        const factor = (1 - dist / radius) * 3.0;
        this.velocities[i * 3] += dx * factor * 0.5;
        this.velocities[i * 3 + 1] += factor * 1.5;
        this.velocities[i * 3 + 2] += dz * factor * 0.5;
      }
    }
  }

  reset(): void {
    this.time = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.resetParticle(i, true);
    }
  }

  update(dt: number): void {
    this.time += dt;
    const { windSpeed, sandDensity, erosionStrength } = this.params;
    const windDirX = Math.cos(this.time * 0.2) * windSpeed;
    const windDirZ = Math.sin(this.time * 0.15) * windSpeed * 0.6;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const px = this.positions[i3];
      const pz = this.positions[i3 + 2];

      const h = duneHeight(px, pz, this.time, windSpeed, erosionStrength);
      const eps = 0.1;
      const hx = duneHeight(px + eps, pz, this.time, windSpeed, erosionStrength);
      const hz = duneHeight(px, pz + eps, this.time, windSpeed, erosionStrength);
      const gradX = (hx - h) / eps;
      const gradZ = (hz - h) / eps;

      const windForce = windSpeed * sandDensity * 0.8;
      this.velocities[i3] += (windDirX * windForce - gradX * erosionStrength * 2.0) * dt;
      this.velocities[i3 + 1] += (h - this.positions[i3 + 1]) * 3.0 * dt;
      this.velocities[i3 + 2] += (windDirZ * windForce - gradZ * erosionStrength * 2.0) * dt;

      this.velocities[i3] *= 0.95;
      this.velocities[i3 + 1] *= 0.95;
      this.velocities[i3 + 2] *= 0.95;

      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      this.lifetimes[i] -= dt * (0.1 + erosionStrength * 0.05);

      if (
        this.lifetimes[i] <= 0 ||
        Math.abs(this.positions[i3]) > FIELD_HALF ||
        Math.abs(this.positions[i3 + 2]) > FIELD_HALF
      ) {
        this.resetParticle(i, false);
      }
    }

    const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
