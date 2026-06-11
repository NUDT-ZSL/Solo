import * as THREE from 'three';

const INNER_BASE_RADIUS = 40;
const OUTER_BASE_RADIUS = 130;
const INNER_EXPANSION = 50;
const OUTER_EXPANSION = 200;
const INNER_HEIGHT_FACTOR = 10;
const OUTER_HEIGHT_FACTOR = 50;
const INNER_PARTICLE_SIZE = 3;
const OUTER_PARTICLE_SIZE = 12;
const MIN_OPACITY = 0.6;
const MAX_OPACITY = 0.8;

const COLOR_INNER_START = new THREE.Color(0x00008b);
const COLOR_INNER_END = new THREE.Color(0x00bfff);
const COLOR_OUTER_START = new THREE.Color(0xff4500);
const COLOR_OUTER_END = new THREE.Color(0xffd700);

export class ParticleRingSystem {
  private scene: THREE.Scene;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private ringRotations: number[] = [];
  private currentAmplitudes: number[] = [];
  private particlesPerRing: number = 150;
  private ringCount: number = 5;
  private isRecording: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setRecordingState(recording: boolean): void {
    this.isRecording = recording;
  }

  build(particlesPerRing: number, ringCount: number, amplitudes: number[]): void {
    this.particlesPerRing = particlesPerRing;
    this.ringCount = ringCount;
    this.currentAmplitudes = amplitudes.length === ringCount ? amplitudes : new Array(ringCount).fill(0);

    this.dispose();

    const totalParticles = particlesPerRing * ringCount;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);

    this.ringRotations = [];
    for (let r = 0; r < ringCount; r++) {
      this.ringRotations.push(0);
    }

    this.initializeParticles(positions, colors, sizes);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 8,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: MAX_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    const t1 = performance.now();
    console.log(`[ParticleRing] 粒子系统构建完成: ${totalParticles}个粒子, ${ringCount}个环`);
  }

  private initializeParticles(positions: Float32Array, colors: Float32Array, sizes: Float32Array): void {
    for (let r = 0; r < this.ringCount; r++) {
      const ringT = this.ringCount > 1 ? r / (this.ringCount - 1) : 0;
      const baseRadius = INNER_BASE_RADIUS + (OUTER_BASE_RADIUS - INNER_BASE_RADIUS) * ringT;
      const amplitude = this.currentAmplitudes[r] || 0;
      const color = this.computeRingColor(r, ringT, amplitude);
      const baseSize = INNER_PARTICLE_SIZE + (OUTER_PARTICLE_SIZE - INNER_PARTICLE_SIZE) * ringT;
      const particleSize = baseSize + amplitude * (OUTER_PARTICLE_SIZE - baseSize) * 0.3;

      for (let p = 0; p < this.particlesPerRing; p++) {
        const idx = (r * this.particlesPerRing + p) * 3;
        const angle = (p / this.particlesPerRing) * Math.PI * 2;
        const radius = baseRadius + amplitude * (INNER_EXPANSION + (OUTER_EXPANSION - INNER_EXPANSION) * ringT);
        const heightOffset = amplitude * (INNER_HEIGHT_FACTOR + (OUTER_HEIGHT_FACTOR - INNER_HEIGHT_FACTOR) * ringT);

        positions[idx] = Math.cos(angle) * radius;
        positions[idx + 1] = heightOffset;
        positions[idx + 2] = Math.sin(angle) * radius;

        colors[idx] = color.r;
        colors[idx + 1] = color.g;
        colors[idx + 2] = color.b;

        sizes[r * this.particlesPerRing + p] = particleSize;
      }
    }
  }

  private computeRingColor(ringIndex: number, ringT: number, amplitude: number): THREE.Color {
    const color = new THREE.Color();

    if (ringT <= 0.5) {
      const localT = ringT * 2;
      color.copy(COLOR_INNER_START).lerp(COLOR_INNER_END, localT);
    } else {
      const localT = (ringT - 0.5) * 2;
      color.copy(COLOR_OUTER_START).lerp(COLOR_OUTER_END, localT);
    }

    const brightness = 0.6 + amplitude * 0.4;
    color.multiplyScalar(brightness);

    return color;
  }

  update(amplitudes: number[], deltaTime: number): void {
    if (!this.geometry || !this.points) return;

    if (this.isRecording) return;

    if (!amplitudes || amplitudes.length === 0) return;

    this.currentAmplitudes = amplitudes;

    const positions = this.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    const sizesAttr = this.geometry.attributes.size as THREE.BufferAttribute;

    const posArray = positions.array as Float32Array;
    const colorArray = colors.array as Float32Array;
    const sizeArray = sizesAttr.array as Float32Array;

    for (let r = 0; r < this.ringCount; r++) {
      const ringT = this.ringCount > 1 ? r / (this.ringCount - 1) : 0;
      const amplitude = amplitudes[r] ?? 0;

      const baseRadius = INNER_BASE_RADIUS + (OUTER_BASE_RADIUS - INNER_BASE_RADIUS) * ringT;
      const expansionAmplitude = INNER_EXPANSION + (OUTER_EXPANSION - INNER_EXPANSION) * ringT;
      const heightFactor = INNER_HEIGHT_FACTOR + (OUTER_HEIGHT_FACTOR - INNER_HEIGHT_FACTOR) * ringT;

      const currentRadius = baseRadius + amplitude * expansionAmplitude;
      const currentHeight = amplitude * heightFactor;

      this.ringRotations[r] += amplitude * 2 * deltaTime;

      const baseSize = INNER_PARTICLE_SIZE + (OUTER_PARTICLE_SIZE - INNER_PARTICLE_SIZE) * ringT;
      const particleSize = baseSize + amplitude * (OUTER_PARTICLE_SIZE - baseSize) * 0.5;
      const clampedSize = Math.max(3, Math.min(12, particleSize));

      const color = this.computeRingColor(r, ringT, amplitude);

      const rotation = this.ringRotations[r];

      for (let p = 0; p < this.particlesPerRing; p++) {
        const idx = (r * this.particlesPerRing + p) * 3;
        const angle = (p / this.particlesPerRing) * Math.PI * 2 + rotation;

        posArray[idx] = Math.cos(angle) * currentRadius;
        posArray[idx + 1] = currentHeight;
        posArray[idx + 2] = Math.sin(angle) * currentRadius;

        colorArray[idx] = color.r;
        colorArray[idx + 1] = color.g;
        colorArray[idx + 2] = color.b;

        sizeArray[r * this.particlesPerRing + p] = clampedSize;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizesAttr.needsUpdate = true;

    const avgAmplitude = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
    this.material!.opacity = MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * avgAmplitude;
  }

  updateParticlesPerRing(count: number): void {
    if (count === this.particlesPerRing) return;
    this.build(count, this.ringCount, this.currentAmplitudes);
  }

  updateRingCount(count: number): void {
    if (count === this.ringCount) return;
    const newAmplitudes = new Array(count).fill(0);
    for (let i = 0; i < Math.min(count, this.currentAmplitudes.length); i++) {
      newAmplitudes[i] = this.currentAmplitudes[i];
    }
    this.build(this.particlesPerRing, count, newAmplitudes);
  }

  dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }
}
