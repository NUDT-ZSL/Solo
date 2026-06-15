import * as THREE from 'three';

interface RingConfig {
  baseRadius: number;
  yBase: number;
  colorInner: THREE.Color;
  colorOuter: THREE.Color;
  rotationSpeed: number;
  currentAngle: number;
}

export class ParticleRingSystem {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private ringConfigs: RingConfig[] = [];
  private particleCount: number = 150;
  private ringCount: number = 5;
  private frequencyBands: number[] = [];
  private totalParticles: number = 0;
  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  setParticleCount(count: number): void {
    this.particleCount = count;
    this.rebuild();
  }

  setRingCount(count: number): void {
    this.ringCount = count;
    this.rebuild();
  }

  setFrequencyBands(bands: number[]): void {
    this.frequencyBands = bands;
  }

  private rebuild(): void {
    this.disposeGeometry();
    this.ringConfigs = [];
    this.totalParticles = this.particleCount * this.ringCount;

    for (let i = 0; i < this.ringCount; i++) {
      const t = i / Math.max(this.ringCount - 1, 1);
      const baseRadius = 30 + t * 70;
      const yBase = (i - (this.ringCount - 1) / 2) * 15;
      const colorInner = new THREE.Color();
      const colorOuter = new THREE.Color();

      if (t < 0.5) {
        const s = t * 2;
        colorInner.set('#00008B').lerp(new THREE.Color('#00BFFF'), s * 0.5);
        colorOuter.set('#00008B').lerp(new THREE.Color('#00BFFF'), s * 0.5 + 0.5);
      } else {
        const s = (t - 0.5) * 2;
        colorInner.set('#FF4500').lerp(new THREE.Color('#FFD700'), s * 0.5);
        colorOuter.set('#FF4500').lerp(new THREE.Color('#FFD700'), s * 0.5 + 0.3);
      }

      this.ringConfigs.push({
        baseRadius,
        yBase,
        colorInner,
        colorOuter,
        rotationSpeed: 0,
        currentAngle: (i * Math.PI * 2) / this.ringCount,
      });
    }

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.totalParticles * 3);
    const colors = new Float32Array(this.totalParticles * 3);
    const sizes = new Float32Array(this.totalParticles);

    for (let i = 0; i < this.totalParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      sizes[i] = 5;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
  }

  update(delta: number): void {
    if (!this.geometry || !this.points) return;
    this.time += delta;

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    for (let ringIdx = 0; ringIdx < this.ringCount; ringIdx++) {
      const config = this.ringConfigs[ringIdx];
      const amplitude = this.frequencyBands[ringIdx] ?? 0;

      const expandRange = 50 + amplitude * 150;
      const heightFactor = 10 + amplitude * 40;
      const angularSpeed = amplitude * 2;
      config.rotationSpeed = angularSpeed;
      config.currentAngle += angularSpeed * delta;

      const radius = config.baseRadius + amplitude * expandRange;
      const yOffset = amplitude * heightFactor;

      for (let p = 0; p < this.particleCount; p++) {
        const idx = ringIdx * this.particleCount + p;
        const angle = (p / this.particleCount) * Math.PI * 2 + config.currentAngle;

        const noiseOffset = Math.sin(this.time * 2 + p * 0.3 + ringIdx) * 3 * (0.2 + amplitude * 0.5);
        const rNoise = Math.cos(this.time * 1.5 + p * 0.5) * 2 * amplitude;

        const x = (radius + rNoise) * Math.cos(angle) + noiseOffset * 0.3;
        const z = (radius + rNoise) * Math.sin(angle) + noiseOffset * 0.3;
        const y = config.yBase + yOffset + noiseOffset;

        posAttr.setXYZ(idx, x, y, z);

        const colorT = p / this.particleCount;
        const color = new THREE.Color().copy(config.colorInner).lerp(config.colorOuter, colorT);
        colAttr.setXYZ(idx, color.r, color.g, color.b);

        const particleSize = 3 + amplitude * 9;
        const sizeVariation = 1 + Math.sin(this.time * 3 + p * 0.7) * 0.2 * amplitude;
        sizeAttr.setX(idx, particleSize * sizeVariation);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private disposeGeometry(): void {
    if (this.points) {
      this.group.remove(this.points);
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

  dispose(): void {
    this.disposeGeometry();
    this.scene.remove(this.group);
  }
}
