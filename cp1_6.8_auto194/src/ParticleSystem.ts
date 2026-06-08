import * as THREE from 'three';
import { AudioFeatures } from './AudioAnalyzer';

interface ParticleParams {
  speed: number;
  haloIntensity: number;
  sensitivity: number;
}

const PARTICLE_COUNT = 6000;
const SPIRAL_ARMS = 5;
const SPIRAL_RADIUS = 6;
const SPIRAL_HEIGHT = 4;
const SPIRAL_TURNS = 3;
const BURST_PARTICLE_COUNT = 500;
const HALO_RING_SEGMENTS = 64;

const COLOR_LOW = new THREE.Color(0x9b30ff);
const COLOR_MID_LOW = new THREE.Color(0x6a5acd);
const COLOR_MID = new THREE.Color(0x00e5a0);
const COLOR_MID_HIGH = new THREE.Color(0x00bfff);
const COLOR_HIGH = new THREE.Color(0xffd700);

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles!: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private spiralParams: Float32Array;
  private burstParticles!: THREE.Points;
  private burstPositions!: Float32Array;
  private burstColors!: Float32Array;
  private burstSizes!: Float32Array;
  private burstVelocities!: Float32Array;
  private burstLifetimes!: Float32Array;
  private haloRings: THREE.Mesh[] = [];
  private params: ParticleParams = { speed: 1, haloIntensity: 1, sensitivity: 1 };
  private time = 0;
  private burstQueue = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.spiralParams = new Float32Array(PARTICLE_COUNT * 4);

    this.initSpiralParams();
    this.createParticles();
    this.createBurstParticles();
  }

  private initSpiralParams(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const arm = i % SPIRAL_ARMS;
      const t = (i / PARTICLE_COUNT) * SPIRAL_TURNS * Math.PI * 2;
      const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;
      const radiusFactor = 0.3 + Math.random() * 0.7;
      const heightOffset = (Math.random() - 0.5) * 1.5;

      this.spiralParams[i * 4 + 0] = t + armOffset;
      this.spiralParams[i * 4 + 1] = radiusFactor;
      this.spiralParams[i * 4 + 2] = heightOffset;
      this.spiralParams[i * 4 + 3] = Math.random() * 0.5 + 0.5;

      this.sizes[i] = 1.5 + Math.random() * 2.5;
    }
  }

  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createBurstParticles(): void {
    this.burstPositions = new Float32Array(BURST_PARTICLE_COUNT * 3);
    this.burstColors = new Float32Array(BURST_PARTICLE_COUNT * 3);
    this.burstSizes = new Float32Array(BURST_PARTICLE_COUNT);
    this.burstVelocities = new Float32Array(BURST_PARTICLE_COUNT * 3);
    this.burstLifetimes = new Float32Array(BURST_PARTICLE_COUNT);

    for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
      this.burstLifetimes[i] = 0;
      this.burstSizes[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.burstPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.burstColors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.burstSizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });

    this.burstParticles = new THREE.Points(geometry, material);
    this.scene.add(this.burstParticles);
  }

  update(features: AudioFeatures, delta: number): void {
    this.time += delta * this.params.speed;
    this.updateSpiralParticles(features);
    this.updateBurstParticles(delta);
    this.processBurstQueue(features);

    if (features.isBeat && this.params.haloIntensity > 0) {
      this.createHaloRing(features);
    }
    this.updateHaloRings(delta);
  }

  private updateSpiralParticles(features: AudioFeatures): void {
    const { bassLevel, midLevel, highLevel, rms } = features;
    const sens = this.params.sensitivity;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseAngle = this.spiralParams[i * 4 + 0];
      const radiusFactor = this.spiralParams[i * 4 + 1];
      const heightOffset = this.spiralParams[i * 4 + 2];
      const phaseSpeed = this.spiralParams[i * 4 + 3];

      const angle = baseAngle + this.time * phaseSpeed * 0.5;

      const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const spiralT = normalizedAngle / (Math.PI * 2);

      const freqMix = bassLevel * (1 - spiralT) + midLevel * Math.abs(spiralT - 0.5) * 2 + highLevel * spiralT;
      const energyRadius = 1 + freqMix * sens * 2;

      const radius = SPIRAL_RADIUS * radiusFactor * energyRadius;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = heightOffset + Math.sin(this.time * 0.3 + baseAngle * 0.5) * SPIRAL_HEIGHT * 0.5
        + rms * sens * 2 * Math.sin(angle * 2);

      this.positions[i * 3 + 0] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      const color = this.getFrequencyColor(spiralT, bassLevel * sens, midLevel * sens, highLevel * sens);
      this.colors[i * 3 + 0] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = (1.5 + rms * 8 * sens) * (0.5 + radiusFactor * 0.5);
    }

    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particles.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.particles.geometry.getAttribute('size') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private getFrequencyColor(t: number, bass: number, mid: number, high: number): THREE.Color {
    const color = new THREE.Color();
    if (t < 0.2) {
      color.copy(COLOR_LOW).lerp(COLOR_MID_LOW, t / 0.2);
    } else if (t < 0.4) {
      color.copy(COLOR_MID_LOW).lerp(COLOR_MID, (t - 0.2) / 0.2);
    } else if (t < 0.6) {
      color.copy(COLOR_MID).lerp(COLOR_MID_HIGH, (t - 0.4) / 0.2);
    } else {
      color.copy(COLOR_MID_HIGH).lerp(COLOR_HIGH, (t - 0.6) / 0.4);
    }

    const boost = new THREE.Color();
    if (bass > mid && bass > high) {
      boost.copy(COLOR_LOW);
    } else if (mid > bass && mid > high) {
      boost.copy(COLOR_MID);
    } else if (high > bass && high > mid) {
      boost.copy(COLOR_HIGH);
    }

    color.lerp(boost, 0.3);
    return color;
  }

  private processBurstQueue(features: AudioFeatures): void {
    if (!features.isBeat) return;
    this.burstQueue += 30;
  }

  private updateBurstParticles(delta: number): void {
    let spawned = 0;
    const maxSpawn = Math.min(this.burstQueue, BURST_PARTICLE_COUNT);

    for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
      if (this.burstLifetimes[i] <= 0 && spawned < maxSpawn) {
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.8;
        const speed = 2 + Math.random() * 5;

        this.burstPositions[i * 3 + 0] = (Math.random() - 0.5) * 2;
        this.burstPositions[i * 3 + 1] = (Math.random() - 0.5) * 2;
        this.burstPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;

        this.burstVelocities[i * 3 + 0] = Math.cos(angle) * Math.cos(elevation) * speed;
        this.burstVelocities[i * 3 + 1] = Math.sin(elevation) * speed;
        this.burstVelocities[i * 3 + 2] = Math.sin(angle) * Math.cos(elevation) * speed;

        const colorChoice = Math.random();
        if (colorChoice < 0.33) {
          this.burstColors[i * 3 + 0] = 0.61; this.burstColors[i * 3 + 1] = 0.19; this.burstColors[i * 3 + 2] = 1.0;
        } else if (colorChoice < 0.66) {
          this.burstColors[i * 3 + 0] = 0.0; this.burstColors[i * 3 + 1] = 0.9; this.burstColors[i * 3 + 2] = 0.63;
        } else {
          this.burstColors[i * 3 + 0] = 1.0; this.burstColors[i * 3 + 1] = 0.84; this.burstColors[i * 3 + 2] = 0.0;
        }

        this.burstLifetimes[i] = 1.0;
        this.burstSizes[i] = 2 + Math.random() * 3;
        spawned++;
      }

      if (this.burstLifetimes[i] > 0) {
        this.burstLifetimes[i] -= delta * 1.2;

        this.burstPositions[i * 3 + 0] += this.burstVelocities[i * 3 + 0] * delta;
        this.burstPositions[i * 3 + 1] += this.burstVelocities[i * 3 + 1] * delta;
        this.burstPositions[i * 3 + 2] += this.burstVelocities[i * 3 + 2] * delta;

        this.burstVelocities[i * 3 + 1] -= delta * 1.5;

        this.burstSizes[i] *= (1 - delta * 0.8);

        if (this.burstLifetimes[i] <= 0) {
          this.burstSizes[i] = 0;
        }
      }
    }

    this.burstQueue -= spawned;

    const posAttr = this.burstParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.burstParticles.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.burstParticles.geometry.getAttribute('size') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private createHaloRing(features: AudioFeatures): void {
    const ringGeometry = new THREE.RingGeometry(0.5, 0.7, HALO_RING_SEGMENTS);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.getFrequencyColor(0.5, features.bassLevel, features.midLevel, features.highLevel),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.6 * this.params.haloIntensity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;

    ring.userData = {
      lifetime: 1.5,
      maxLifetime: 1.5,
      expandSpeed: 3 + features.rms * 10,
      intensity: this.params.haloIntensity,
    };

    this.scene.add(ring);
    this.haloRings.push(ring);

    if (this.haloRings.length > 8) {
      const old = this.haloRings.shift()!;
      this.scene.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
    }
  }

  private updateHaloRings(delta: number): void {
    for (let i = this.haloRings.length - 1; i >= 0; i--) {
      const ring = this.haloRings[i];
      const data = ring.userData;

      data.lifetime -= delta;
      const progress = 1 - data.lifetime / data.maxLifetime;

      const scale = 1 + progress * data.expandSpeed;
      ring.scale.set(scale, scale, scale);

      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, (1 - progress * progress)) * 0.5 * data.intensity;

      if (data.lifetime <= 0) {
        this.scene.remove(ring);
        ring.geometry.dispose();
        material.dispose();
        this.haloRings.splice(i, 1);
      }
    }
  }

  setParams(params: Partial<ParticleParams>): void {
    Object.assign(this.params, params);
  }

  getObject(): THREE.Points {
    return this.particles;
  }

  dispose(): void {
    this.scene.remove(this.particles);
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();

    this.scene.remove(this.burstParticles);
    this.burstParticles.geometry.dispose();
    (this.burstParticles.material as THREE.Material).dispose();

    for (const ring of this.haloRings) {
      this.scene.remove(ring);
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    }
    this.haloRings = [];
  }
}
