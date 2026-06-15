import * as THREE from 'three';

export type ColorTheme = 'A' | 'B';

const THEME_A_COLORS = [
  new THREE.Color(0x8B5CF6),
  new THREE.Color(0x3B82F6),
  new THREE.Color(0xEC4899),
  new THREE.Color(0x06B6D4)
];

const NEBULA_RADIUS = 200;
const TURBULENCE_AMPLITUDE = 0.2;
const TURBULENCE_FREQUENCY = 0.03;
const MIN_PARTICLES = 5000;
const MAX_PARTICLES = 40000;
const PARTICLE_STEP = 5000;

export class NebulaSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private particleCount: number;
  private basePositions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private phaseOffsets: Float32Array;
  private currentTheme: ColorTheme = 'A';
  public rotationSpeed: number = 0.002;
  public particleSize: number = 1.25;

  constructor(initialCount: number = 20000) {
    this.particleCount = initialCount;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: this.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.basePositions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.phaseOffsets = new Float32Array(this.particleCount * 3);

    this.generateParticles();

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private generateParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.6) * NEBULA_RADIUS;

      this.basePositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.basePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.basePositions[i3 + 2] = r * Math.cos(phi);

      this.phaseOffsets[i3] = Math.random() * Math.PI * 2;
      this.phaseOffsets[i3 + 1] = Math.random() * Math.PI * 2;
      this.phaseOffsets[i3 + 2] = Math.random() * Math.PI * 2;

      this.sizes[i] = 0.5 + Math.random() * 1.5;
    }

    this.applyColorTheme(this.currentTheme);

    const positions = new Float32Array(this.basePositions);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  private applyColorTheme(theme: ColorTheme): void {
    this.currentTheme = theme;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      let color: THREE.Color;

      if (theme === 'A') {
        color = THEME_A_COLORS[Math.floor(Math.random() * THEME_A_COLORS.length)].clone();
        const alpha = 0.6 + Math.random() * 0.4;
        color.multiplyScalar(alpha);
      } else {
        const hue = (i / this.particleCount) * (120 / 360);
        color = new THREE.Color().setHSL(hue, 0.9, 0.6);
        const alpha = 0.6 + Math.random() * 0.4;
        color.multiplyScalar(alpha);
      }

      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }

    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    if (colorAttr) {
      colorAttr.needsUpdate = true;
    }
  }

  public setColorTheme(theme: ColorTheme): void {
    this.applyColorTheme(theme);
  }

  public setParticleSize(size: number): void {
    this.particleSize = size;
    this.material.size = size;
    this.material.needsUpdate = true;
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public adjustParticleCount(delta: number): number {
    const newCount = Math.max(
      MIN_PARTICLES,
      Math.min(MAX_PARTICLES, this.particleCount + delta * PARTICLE_STEP)
    );

    if (newCount === this.particleCount) {
      return this.particleCount;
    }

    this.particleCount = newCount;
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.phaseOffsets = new Float32Array(this.particleCount * 3);

    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.generateParticles();
    this.points.geometry = this.geometry;

    return this.particleCount;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public update(time: number): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const turbulenceX = Math.sin(time * TURBULENCE_FREQUENCY + this.phaseOffsets[i3]) * TURBULENCE_AMPLITUDE;
      const turbulenceY = Math.cos(time * TURBULENCE_FREQUENCY * 0.8 + this.phaseOffsets[i3 + 1]) * TURBULENCE_AMPLITUDE;
      const turbulenceZ = Math.sin(time * TURBULENCE_FREQUENCY * 1.2 + this.phaseOffsets[i3 + 2]) * TURBULENCE_AMPLITUDE;

      posArray[i3] = this.basePositions[i3] + turbulenceX;
      posArray[i3 + 1] = this.basePositions[i3 + 1] + turbulenceY;
      posArray[i3 + 2] = this.basePositions[i3 + 2] + turbulenceZ;
    }

    positions.needsUpdate = true;
    this.points.rotation.y += this.rotationSpeed;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
