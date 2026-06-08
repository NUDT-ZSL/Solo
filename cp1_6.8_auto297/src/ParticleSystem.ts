import * as THREE from 'three';
import {
  PARTICLE_COUNT,
  CLUSTER_RADIUS,
  COLOR_WARM,
  COLOR_MID,
  COLOR_COLD,
  PARTICLE_SIZE_MIN,
  PARTICLE_SIZE_MAX,
  DAMPING,
  BROWNIAN_STRENGTH,
  PULSE_SPEED,
  PULSE_AMPLITUDE,
  ENERGY_DECAY_RATE,
} from './constants';

const vertexShader = `
  attribute float aSize;
  attribute float aEnergy;
  varying float vEnergy;
  varying float vDistFromCenter;
  uniform float uTime;
  uniform float uPulseAmplitude;
  uniform float uPulseSpeed;

  void main() {
    vEnergy = aEnergy;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(position);
    vDistFromCenter = dist;
    float pulse = 1.0 + uPulseAmplitude * sin(uTime * uPulseSpeed + dist * 0.5);
    float baseSize = aSize * pulse;
    gl_PointSize = baseSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vEnergy;
  varying float vDistFromCenter;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    vec3 warm = vec3(${COLOR_WARM.r}, ${COLOR_WARM.g}, ${COLOR_WARM.b});
    vec3 mid = vec3(${COLOR_MID.r}, ${COLOR_MID.g}, ${COLOR_MID.b});
    vec3 cold = vec3(${COLOR_COLD.r}, ${COLOR_COLD.g}, ${COLOR_COLD.b});

    vec3 col;
    if (vEnergy > 0.5) {
      col = mix(mid, warm, (vEnergy - 0.5) * 2.0);
    } else {
      col = mix(cold, mid, vEnergy * 2.0);
    }

    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    float alpha = glow * 0.7 + core * 0.3;
    col += vec3(core * 0.4);

    gl_FragColor = vec4(col, alpha);
  }
`;

export class ParticleSystem {
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;
  public mesh: THREE.Points;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private energies: Float32Array;
  private velocities: Float32Array;
  private baseSizes: Float32Array;

  private diffusionRate: number = 0.5;

  constructor() {
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.energies = new Float32Array(PARTICLE_COUNT);
    this.velocities = new Float32Array(PARTICLE_COUNT * 3);
    this.baseSizes = new Float32Array(PARTICLE_COUNT);

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPulseAmplitude: { value: PULSE_AMPLITUDE },
        uPulseSpeed: { value: PULSE_SPEED },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.initParticles();
    this.setupGeometry();
    this.mesh = new THREE.Points(this.geometry, this.material);
  }

  private initParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * CLUSTER_RADIUS;

      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = r * Math.cos(phi);

      const dist = r / CLUSTER_RADIUS;
      this.energies[i] = 1.0 - dist * 0.6;

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      this.baseSizes[i] = PARTICLE_SIZE_MIN + Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
      this.sizes[i] = this.baseSizes[i];

      this.updateParticleColor(i);
    }
  }

  private updateParticleColor(i: number): void {
    const i3 = i * 3;
    const e = this.energies[i];

    if (e > 0.5) {
      const t = (e - 0.5) * 2;
      this.colors[i3] = COLOR_MID.r + (COLOR_WARM.r - COLOR_MID.r) * t;
      this.colors[i3 + 1] = COLOR_MID.g + (COLOR_WARM.g - COLOR_MID.g) * t;
      this.colors[i3 + 2] = COLOR_MID.b + (COLOR_WARM.b - COLOR_MID.b) * t;
    } else {
      const t = e * 2;
      this.colors[i3] = COLOR_COLD.r + (COLOR_MID.r - COLOR_COLD.r) * t;
      this.colors[i3 + 1] = COLOR_COLD.g + (COLOR_MID.g - COLOR_COLD.g) * t;
      this.colors[i3 + 2] = COLOR_COLD.b + (COLOR_MID.b - COLOR_COLD.b) * t;
    }
  }

  private setupGeometry(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aEnergy', new THREE.BufferAttribute(this.energies, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  update(dt: number, time: number): void {
    this.material.uniforms.uTime.value = time;

    const rate = this.diffusionRate * dt;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];
      const distFromCenter = Math.sqrt(px * px + py * py + pz * pz);

      if (distFromCenter > 0.001) {
        const outwardX = px / distFromCenter;
        const outwardY = py / distFromCenter;
        const outwardZ = pz / distFromCenter;
        const outwardForce = rate * 0.3 * this.energies[i];
        this.velocities[i3] += outwardX * outwardForce;
        this.velocities[i3 + 1] += outwardY * outwardForce;
        this.velocities[i3 + 2] += outwardZ * outwardForce;
      }

      this.velocities[i3] += (Math.random() - 0.5) * BROWNIAN_STRENGTH * rate;
      this.velocities[i3 + 1] += (Math.random() - 0.5) * BROWNIAN_STRENGTH * rate;
      this.velocities[i3 + 2] += (Math.random() - 0.5) * BROWNIAN_STRENGTH * rate;

      this.velocities[i3] *= DAMPING;
      this.velocities[i3 + 1] *= DAMPING;
      this.velocities[i3 + 2] *= DAMPING;

      this.positions[i3] += this.velocities[i3];
      this.positions[i3 + 1] += this.velocities[i3 + 1];
      this.positions[i3 + 2] += this.velocities[i3 + 2];

      this.energies[i] -= ENERGY_DECAY_RATE * dt * this.diffusionRate;
      if (this.energies[i] < 0) this.energies[i] = 0;

      this.sizes[i] = this.baseSizes[i] * (0.3 + this.energies[i] * 0.7);

      this.updateParticleColor(i);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aEnergy.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  injectEnergy(origin: THREE.Vector3, strength: number, radius: number): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const dx = this.positions[i3] - origin.x;
      const dy = this.positions[i3 + 1] - origin.y;
      const dz = this.positions[i3 + 2] - origin.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const rSq = radius * radius;

      if (distSq < rSq) {
        const falloff = 1.0 - Math.sqrt(distSq) / radius;
        const boost = strength * falloff * 0.8;
        this.energies[i] = Math.min(1.0, this.energies[i] + boost);

        const dist = Math.sqrt(distSq);
        if (dist > 0.01) {
          const pullStrength = strength * falloff * 0.15;
          this.velocities[i3] -= (dx / dist) * pullStrength;
          this.velocities[i3 + 1] -= (dy / dist) * pullStrength;
          this.velocities[i3 + 2] -= (dz / dist) * pullStrength;
        }
      }
    }
  }

  reset(): void {
    this.initParticles();
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aEnergy.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  setDiffusionRate(rate: number): void {
    this.diffusionRate = rate;
  }

  getPositionAt(index: number): THREE.Vector3 {
    const i3 = index * 3;
    return new THREE.Vector3(this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]);
  }

  getEnergyAt(index: number): number {
    return this.energies[index];
  }

  get particleCount(): number {
    return PARTICLE_COUNT;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
