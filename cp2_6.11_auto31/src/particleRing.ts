import * as THREE from 'three';

const INNER_BASE_RADIUS_MIN = 30;
const INNER_BASE_RADIUS_MAX = 50;
const OUTER_BASE_RADIUS_MIN = 100;
const OUTER_BASE_RADIUS_MAX = 150;
const INNER_EXPANSION_MIN = 50;
const INNER_EXPANSION_MAX = 80;
const OUTER_EXPANSION_MIN = 150;
const OUTER_EXPANSION_MAX = 200;
const INNER_HEIGHT_FACTOR = 10;
const OUTER_HEIGHT_FACTOR = 50;
const INNER_PARTICLE_SIZE = 3;
const OUTER_PARTICLE_SIZE = 12;
const MIN_OPACITY = 0.6;
const MAX_OPACITY = 0.8;

const COLOR_INNER_START = new THREE.Color('#00008B');
const COLOR_INNER_END = new THREE.Color('#00BFFF');
const COLOR_OUTER_START = new THREE.Color('#FF4500');
const COLOR_OUTER_END = new THREE.Color('#FFD700');

const particleVertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export class ParticleRingSystem {
  private scene: THREE.Scene;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
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

  private getRingBaseRadius(ringIndex: number, totalRings: number): number {
    const half = Math.ceil(totalRings / 2);
    if (ringIndex < half) {
      const innerT = half > 1 ? ringIndex / (half - 1) : 0;
      return INNER_BASE_RADIUS_MIN + (INNER_BASE_RADIUS_MAX - INNER_BASE_RADIUS_MIN) * innerT;
    } else {
      const outerT = totalRings - half > 1 ? (ringIndex - half) / (totalRings - half - 1) : 0;
      return OUTER_BASE_RADIUS_MIN + (OUTER_BASE_RADIUS_MAX - OUTER_BASE_RADIUS_MIN) * outerT;
    }
  }

  private getRingExpansion(ringIndex: number, totalRings: number): number {
    const globalT = totalRings > 1 ? ringIndex / (totalRings - 1) : 0;
    const half = Math.ceil(totalRings / 2);
    if (ringIndex < half) {
      const innerT = half > 1 ? ringIndex / (half - 1) : 0;
      const innerBase = INNER_EXPANSION_MIN + (INNER_EXPANSION_MAX - INNER_EXPANSION_MIN) * innerT;
      return innerBase + (OUTER_EXPANSION_MIN - INNER_EXPANSION_MAX) * globalT * 0.3;
    } else {
      const outerT = totalRings - half > 1 ? (ringIndex - half) / (totalRings - half - 1) : 0;
      return OUTER_EXPANSION_MIN + (OUTER_EXPANSION_MAX - OUTER_EXPANSION_MIN) * outerT;
    }
  }

  private getRingColor(ringIndex: number, totalRings: number, amplitude: number): THREE.Color {
    const color = new THREE.Color();
    const half = Math.ceil(totalRings / 2);

    if (ringIndex < half) {
      const localT = half > 1 ? ringIndex / (half - 1) : 0;
      color.copy(COLOR_INNER_START);
      color.lerp(COLOR_INNER_END, localT);
    } else {
      const localT = totalRings - half > 1 ? (ringIndex - half) / (totalRings - half - 1) : 0;
      color.copy(COLOR_OUTER_START);
      color.lerp(COLOR_OUTER_END, localT);
    }

    const brightness = 0.65 + amplitude * 0.35;
    color.r = Math.min(1, color.r * brightness);
    color.g = Math.min(1, color.g * brightness);
    color.b = Math.min(1, color.b * brightness);

    return color;
  }

  private getRingParticleSize(ringIndex: number, totalRings: number, amplitude: number): number {
    const globalT = totalRings > 1 ? ringIndex / (totalRings - 1) : 0;
    const baseSize = INNER_PARTICLE_SIZE + (OUTER_PARTICLE_SIZE - INNER_PARTICLE_SIZE) * globalT;
    const size = baseSize + amplitude * (OUTER_PARTICLE_SIZE - baseSize) * 0.5;
    return Math.max(INNER_PARTICLE_SIZE, Math.min(OUTER_PARTICLE_SIZE, size));
  }

  build(particlesPerRing: number, ringCount: number, amplitudes: number[]): void {
    const t0 = performance.now();
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

    this.material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      opacity: MAX_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    const t1 = performance.now();
    console.log(`[ParticleRing] 粒子系统构建完成: ${totalParticles}个粒子, ${ringCount}个环, 耗时${(t1 - t0).toFixed(1)}ms`);
  }

  private initializeParticles(positions: Float32Array, colors: Float32Array, sizes: Float32Array): void {
    for (let r = 0; r < this.ringCount; r++) {
      const baseRadius = this.getRingBaseRadius(r, this.ringCount);
      const expansion = this.getRingExpansion(r, this.ringCount);
      const amplitude = this.currentAmplitudes[r] || 0;
      const color = this.getRingColor(r, this.ringCount, amplitude);
      const particleSize = this.getRingParticleSize(r, this.ringCount, amplitude);
      const heightFactor = INNER_HEIGHT_FACTOR + (OUTER_HEIGHT_FACTOR - INNER_HEIGHT_FACTOR) *
        (this.ringCount > 1 ? r / (this.ringCount - 1) : 0);

      for (let p = 0; p < this.particlesPerRing; p++) {
        const idx = (r * this.particlesPerRing + p) * 3;
        const angle = (p / this.particlesPerRing) * Math.PI * 2;
        const radius = baseRadius + amplitude * expansion;
        const heightOffset = amplitude * heightFactor;

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

  update(amplitudes: number[], deltaTime: number): void {
    if (!this.geometry || !this.points) return;

    if (this.isRecording) {
      return;
    }

    if (!amplitudes || amplitudes.length === 0) {
      return;
    }

    this.currentAmplitudes = amplitudes;

    const positions = this.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    const sizesAttr = this.geometry.attributes.size as THREE.BufferAttribute;

    const posArray = positions.array as Float32Array;
    const colorArray = colors.array as Float32Array;
    const sizeArray = sizesAttr.array as Float32Array;

    for (let r = 0; r < this.ringCount; r++) {
      const amplitude = amplitudes[r] ?? 0;
      const baseRadius = this.getRingBaseRadius(r, this.ringCount);
      const expansion = this.getRingExpansion(r, this.ringCount);
      const heightFactor = INNER_HEIGHT_FACTOR + (OUTER_HEIGHT_FACTOR - INNER_HEIGHT_FACTOR) *
        (this.ringCount > 1 ? r / (this.ringCount - 1) : 0);

      const currentRadius = baseRadius + amplitude * expansion;
      const currentHeight = amplitude * heightFactor;

      this.ringRotations[r] += amplitude * 2 * deltaTime;

      const particleSize = this.getRingParticleSize(r, this.ringCount, amplitude);
      const color = this.getRingColor(r, this.ringCount, amplitude);
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

        sizeArray[r * this.particlesPerRing + p] = particleSize;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizesAttr.needsUpdate = true;

    const avgAmplitude = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
    if (this.material) {
      this.material.opacity = MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * avgAmplitude;
    }
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
