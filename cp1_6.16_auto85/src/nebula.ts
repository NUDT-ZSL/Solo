import * as THREE from 'three';
import type { ControlParams } from './controls';

const PARTICLE_COUNT = 2000;
const STAR_COUNT = 500;
const NEBULA_RADIUS = 8;
const MAX_BOUNDARY = NEBULA_RADIUS * 1.2;

export class NebulaSystem {
  public nebulaGroup: THREE.Group;
  public starsPoints: THREE.Points;

  private particlesGeometry!: THREE.BufferGeometry;
  private particlesMaterial!: THREE.PointsMaterial;
  private particlesPoints!: THREE.Points;

  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private distances!: Float32Array;
  private initialPositions!: Float32Array;

  private targetColorStart = new THREE.Color('#4A90D9');
  private targetColorEnd = new THREE.Color('#9B59B6');
  private currentColorStart = new THREE.Color('#4A90D9');
  private currentColorEnd = new THREE.Color('#9B59B6');
  private startColorStart = new THREE.Color('#4A90D9');
  private startColorEnd = new THREE.Color('#9B59B6');
  private colorTransitionProgress = 1;

  private currentSpeed = 0.001;

  private rotationSpeed = 0.0005;
  private targetRotationSpeed = 0.0005;
  private startRotationSpeed = 0.0005;
  private rotationTransitionProgress = 1;
  private readonly ROTATION_TRANSITION_DURATION = 0.3;

  private baseParticleSize = 0.05;

  private tempColor = new THREE.Color();

  constructor() {
    this.nebulaGroup = new THREE.Group();
    this.starsPoints = this.createBackgroundStars();
    this.createNebulaParticles();
    this.nebulaGroup.add(this.particlesPoints);
  }

  private createBackgroundStars(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      const radius = 15 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.01,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  private createNebulaParticles(): void {
    this.particlesGeometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.distances = new Float32Array(PARTICLE_COUNT);
    this.initialPositions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const armOffset = (i % 4) * (Math.PI / 2);
      const densityFactor = Math.pow(Math.random(), 1.5);
      const radius = densityFactor * NEBULA_RADIUS;
      const spiralAngle = armOffset + radius * 0.6 + (Math.random() - 0.5) * 0.4;

      const heightNoise = (Math.random() - 0.5) * 0.5;
      const heightFactor = Math.exp(-radius * radius / (NEBULA_RADIUS * NEBULA_RADIUS * 0.5));

      const x = radius * Math.cos(spiralAngle) + (Math.random() - 0.5) * 0.4 * (1 - densityFactor * 0.5);
      const y = heightNoise * heightFactor * 1.2;
      const z = radius * Math.sin(spiralAngle) + (Math.random() - 0.5) * 0.4 * (1 - densityFactor * 0.5);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.initialPositions[i3] = x;
      this.initialPositions[i3 + 1] = y;
      this.initialPositions[i3 + 2] = z;

      this.distances[i] = radius / NEBULA_RADIUS;
      this.sizes[i] = 0.02 + Math.random() * 0.06;
    }

    this.updateParticleColors();

    this.particlesGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particlesGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particlesGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.particlesMaterial = new THREE.PointsMaterial({
      size: this.baseParticleSize,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particlesPoints = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
  }

  private updateParticleColors(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const t = this.distances[i];

      this.tempColor.copy(this.currentColorStart).lerp(this.currentColorEnd, t);

      this.colors[i3] = this.tempColor.r;
      this.colors[i3 + 1] = this.tempColor.g;
      this.colors[i3 + 2] = this.tempColor.b;
    }
  }

  public setParticleSize(size: number): void {
    this.baseParticleSize = size;
    this.particlesMaterial.size = size;
  }

  public setSpeed(speed: number): void {
    this.currentSpeed = speed;
  }

  public setColors(colorStart: string, colorEnd: string): void {
    this.startColorStart.copy(this.currentColorStart);
    this.startColorEnd.copy(this.currentColorEnd);
    this.targetColorStart.set(colorStart);
    this.targetColorEnd.set(colorEnd);
    this.colorTransitionProgress = 0;
  }

  public setRotationMode(mode: ControlParams['rotationMode']): void {
    this.startRotationSpeed = this.rotationSpeed;
    switch (mode) {
      case 'none':
        this.targetRotationSpeed = 0;
        break;
      case 'slow':
        this.targetRotationSpeed = 0.0005;
        break;
      case 'fast':
        this.targetRotationSpeed = 0.002;
        break;
    }
    this.rotationTransitionProgress = 0;
  }

  public update(deltaTime: number): void {
    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + deltaTime / 0.5);
      const easeT = this.easeOutCubic(this.colorTransitionProgress);

      this.currentColorStart.lerpColors(this.startColorStart, this.targetColorStart, easeT);
      this.currentColorEnd.lerpColors(this.startColorEnd, this.targetColorEnd, easeT);

      this.updateParticleColors();
      (this.particlesGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }

    if (this.rotationTransitionProgress < 1) {
      this.rotationTransitionProgress = Math.min(1, this.rotationTransitionProgress + deltaTime / this.ROTATION_TRANSITION_DURATION);
      const easeT = this.easeOutCubic(this.rotationTransitionProgress);
      this.rotationSpeed = this.startRotationSpeed + (this.targetRotationSpeed - this.startRotationSpeed) * easeT;
    }

    this.nebulaGroup.rotation.y += this.rotationSpeed;

    const speed = this.currentSpeed;
    const positionAttr = this.particlesGeometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const x = this.positions[i3];
      const z = this.positions[i3 + 2];

      const dist = Math.sqrt(x * x + z * z);
      const normalizedDist = dist / NEBULA_RADIUS;

      if (dist > MAX_BOUNDARY) {
        const resetRadius = Math.random() * 0.5;
        const angle = Math.random() * Math.PI * 2;
        this.positions[i3] = resetRadius * Math.cos(angle);
        this.positions[i3 + 2] = resetRadius * Math.sin(angle);
      } else {
        const driftFactor = 0.5 + normalizedDist * 0.5;
        const driftSpeed = speed * driftFactor;

        if (dist > 0.001) {
          this.positions[i3] += (x / dist) * driftSpeed;
          this.positions[i3 + 2] += (z / dist) * driftSpeed;
        }

        const angularSpeed = 0.0003 * (1 - normalizedDist * 0.7);
        const cosA = Math.cos(angularSpeed);
        const sinA = Math.sin(angularSpeed);
        const newX = x * cosA - z * sinA;
        const newZ = x * sinA + z * cosA;
        this.positions[i3] = newX;
        this.positions[i3 + 2] = newZ;

        this.positions[i3 + 1] += Math.sin(Date.now() * 0.001 + i * 0.1) * 0.0001;
        this.positions[i3 + 1] = Math.max(-1.5, Math.min(1.5, this.positions[i3 + 1]));
      }
    }

    positionAttr.needsUpdate = true;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public dispose(): void {
    this.particlesGeometry.dispose();
    this.particlesMaterial.dispose();
    (this.starsPoints.geometry as THREE.BufferGeometry).dispose();
    (this.starsPoints.material as THREE.Material).dispose();
  }
}
