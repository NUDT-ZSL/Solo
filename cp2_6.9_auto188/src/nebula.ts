import * as THREE from 'three';
import { randomInRange, randomColorHSL } from './utils';

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  opacities: Float32Array;
  basePositions: Float32Array;
  phases: Float32Array;
  originalColors: Float32Array;
  displacedPositions: Float32Array;
  whiteFlashTime: Float32Array;
  pushOffset: Float32Array;
}

export class Nebula {
  public particleCount: number;
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;
  public data: ParticleData;
  public interactivePoint: THREE.Mesh | null = null;
  public interactivePointPos: THREE.Vector3 = new THREE.Vector3();
  public interactivePointTime: number = 0;
  public interactivePointVisible: boolean = false;
  public nextInteractivePointTime: number = 0;

  private readonly NEBULA_RADIUS = 8;
  private readonly ROTATION_SPEED = 0.003;
  private readonly TURBULENCE_AMPLITUDE = 0.1;
  private readonly TURBULENCE_FREQUENCY = 0.5;
  private readonly FLICKER_PERIOD = 1.2;
  private readonly PARTICLE_COUNT = 5000;

  constructor() {
    this.particleCount = this.PARTICLE_COUNT;
    this.data = this.createParticleData();
    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.scheduleNextInteractivePoint();
  }

  private createParticleData(): ParticleData {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const opacities = new Float32Array(this.particleCount);
    const basePositions = new Float32Array(this.particleCount * 3);
    const phases = new Float32Array(this.particleCount);
    const originalColors = new Float32Array(this.particleCount * 3);
    const displacedPositions = new Float32Array(this.particleCount * 3);
    const whiteFlashTime = new Float32Array(this.particleCount);
    const pushOffset = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.NEBULA_RADIUS * Math.pow(Math.random(), 1 / 3);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      displacedPositions[i * 3] = x;
      displacedPositions[i * 3 + 1] = y;
      displacedPositions[i * 3 + 2] = z;

      const color = randomColorHSL();
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      originalColors[i * 3] = color.r;
      originalColors[i * 3 + 1] = color.g;
      originalColors[i * 3 + 2] = color.b;

      sizes[i] = randomInRange(0.02, 0.08);
      opacities[i] = randomInRange(0.3, 0.8);
      phases[i] = Math.random() * Math.PI * 2;
      whiteFlashTime[i] = 0;
      pushOffset[i * 3] = 0;
      pushOffset[i * 3 + 1] = 0;
      pushOffset[i * 3 + 2] = 0;
    }

    return {
      positions,
      colors,
      sizes,
      opacities,
      basePositions,
      phases,
      originalColors,
      displacedPositions,
      whiteFlashTime,
      pushOffset
    };
  }

  private createGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.data.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.data.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.data.sizes, 1));
    return geometry;
  }

  private createMaterial(): THREE.PointsMaterial {
    return new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }

  private scheduleNextInteractivePoint(): void {
    this.nextInteractivePointTime = performance.now() + randomInRange(3000, 5000);
  }

  private spawnInteractivePoint(): void {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = this.NEBULA_RADIUS * (0.7 + Math.random() * 0.3);

    this.interactivePointPos.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );

    this.interactivePointPos.applyQuaternion(this.points.quaternion);

    if (!this.interactivePoint) {
      const geometry = new THREE.SphereGeometry(0.15, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
      });
      this.interactivePoint = new THREE.Mesh(geometry, material);
      this.points.add(this.interactivePoint);
    }

    this.interactivePoint.position.copy(this.interactivePointPos);
    this.interactivePoint.visible = true;
    this.interactivePointVisible = true;
    this.interactivePointTime = performance.now();
    this.scheduleNextInteractivePoint();
  }

  public hideInteractivePoint(): void {
    if (this.interactivePoint) {
      this.interactivePoint.visible = false;
    }
    this.interactivePointVisible = false;
  }

  public applySupernovaPush(center: THREE.Vector3, radius: number, pushAmount: number): void {
    for (let i = 0; i < this.particleCount; i++) {
      const ix = this.data.positions[i * 3];
      const iy = this.data.positions[i * 3 + 1];
      const iz = this.data.positions[i * 3 + 2];

      const dx = ix - center.x;
      const dy = iy - center.y;
      const dz = iz - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < radius && dist > 0) {
        const factor = (1 - dist / radius) * pushAmount;
        this.data.pushOffset[i * 3] = (dx / dist) * factor;
        this.data.pushOffset[i * 3 + 1] = (dy / dist) * factor;
        this.data.pushOffset[i * 3 + 2] = (dz / dist) * factor;
        this.data.whiteFlashTime[i] = 0.5;
      }
    }
  }

  public update(time: number, deltaTime: number): void {
    this.points.rotation.y += this.ROTATION_SPEED;

    const t = time * 0.001;

    for (let i = 0; i < this.particleCount; i++) {
      const baseX = this.data.basePositions[i * 3];
      const baseY = this.data.basePositions[i * 3 + 1];
      const baseZ = this.data.basePositions[i * 3 + 2];

      const noiseX = Math.sin(t * this.TURBULENCE_FREQUENCY + baseX * 0.5) * this.TURBULENCE_AMPLITUDE;
      const noiseY = Math.cos(t * this.TURBULENCE_FREQUENCY + baseY * 0.5) * this.TURBULENCE_AMPLITUDE;
      const noiseZ = Math.sin(t * this.TURBULENCE_FREQUENCY + baseZ * 0.5 + 1.57) * this.TURBULENCE_AMPLITUDE;

      if (this.data.whiteFlashTime[i] > 0) {
        this.data.whiteFlashTime[i] -= deltaTime;
        const flashT = Math.max(0, this.data.whiteFlashTime[i] / 0.5);
        this.data.colors[i * 3] = this.data.originalColors[i * 3] + (1 - this.data.originalColors[i * 3]) * flashT;
        this.data.colors[i * 3 + 1] = this.data.originalColors[i * 3 + 1] + (1 - this.data.originalColors[i * 3 + 1]) * flashT;
        this.data.colors[i * 3 + 2] = this.data.originalColors[i * 3 + 2] + (1 - this.data.originalColors[i * 3 + 2]) * flashT;
      } else {
        this.data.colors[i * 3] = this.data.originalColors[i * 3];
        this.data.colors[i * 3 + 1] = this.data.originalColors[i * 3 + 1];
        this.data.colors[i * 3 + 2] = this.data.originalColors[i * 3 + 2];
      }

      if (this.data.whiteFlashTime[i] <= 0) {
        this.data.pushOffset[i * 3] *= 0.95;
        this.data.pushOffset[i * 3 + 1] *= 0.95;
        this.data.pushOffset[i * 3 + 2] *= 0.95;
      }

      this.data.positions[i * 3] = baseX + noiseX + this.data.pushOffset[i * 3];
      this.data.positions[i * 3 + 1] = baseY + noiseY + this.data.pushOffset[i * 3 + 1];
      this.data.positions[i * 3 + 2] = baseZ + noiseZ + this.data.pushOffset[i * 3 + 2];

      this.data.displacedPositions[i * 3] = this.data.positions[i * 3];
      this.data.displacedPositions[i * 3 + 1] = this.data.positions[i * 3 + 1];
      this.data.displacedPositions[i * 3 + 2] = this.data.positions[i * 3 + 2];

      const flicker = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / this.FLICKER_PERIOD + this.data.phases[i]);
      this.data.opacities[i] = 0.3 + 0.5 * flicker;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    if (!this.interactivePointVisible && performance.now() >= this.nextInteractivePointTime) {
      this.spawnInteractivePoint();
    }

    if (this.interactivePointVisible && this.interactivePoint) {
      const elapsed = (performance.now() - this.interactivePointTime) / 1000;
      const pulse = 1 + 0.3 * Math.sin(elapsed * 6);
      this.interactivePoint.scale.setScalar(pulse);
      (this.interactivePoint.material as THREE.MeshBasicMaterial).opacity = 0.7 + 0.3 * Math.sin(elapsed * 8);

      this.interactivePoint.position.copy(this.interactivePointPos);
      this.interactivePoint.position.applyQuaternion(this.points.quaternion);
    }
  }

  public applyParallax(cameraDistance: number): void {
    const nearDist = 5;
    const farDist = 25;
    const t = (cameraDistance - nearDist) / (farDist - nearDist);

    for (let i = 0; i < this.particleCount; i++) {
      const baseX = this.data.basePositions[i * 3];
      const baseY = this.data.basePositions[i * 3 + 1];
      const baseZ = this.data.basePositions[i * 3 + 2];
      const distFromCenter = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ);
      const depthFactor = distFromCenter / this.NEBULA_RADIUS;

      (this.geometry.attributes.size as THREE.BufferAttribute).array[i] =
        this.data.sizes[i] * (1.2 - 0.4 * t) * (0.6 + 0.4 * depthFactor);
    }
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    this.material.opacity = 0.6 + 0.2 * (1 - t);
  }
}
