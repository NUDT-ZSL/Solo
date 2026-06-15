import * as THREE from 'three';
import { AudioAnalyzer } from './audioAnalyzer';

export type GalaxyPreset = 'spiral' | 'globular' | 'irregular';

interface ParticleData {
  basePosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  spiralPosition: THREE.Vector3;
  globularPosition: THREE.Vector3;
  irregularPosition: THREE.Vector3;
  size: number;
  baseColor: THREE.Color;
  angle: number;
  radius: number;
  height: number;
  seed: number;
}

export class Galaxy {
  public particleCount: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  public points: THREE.Points;
  private particles: ParticleData[];
  private time: number = 0;
  private audioAnalyzer: AudioAnalyzer;
  private currentPreset: GalaxyPreset = 'spiral';
  private targetPreset: GalaxyPreset = 'spiral';
  private morphProgress: number = 1;
  private morphDuration: number = 2;
  private isMorphing: boolean = false;

  constructor(audioAnalyzer: AudioAnalyzer, particleCount: number = 20000) {
    this.particleCount = particleCount;
    this.audioAnalyzer = audioAnalyzer;
    this.particles = [];

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.initParticles();
    this.updateGeometry();

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private initParticles(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const spiralPos = this.calculateSpiralPosition(i);
      const globularPos = this.calculateGlobularPosition(i);
      const irregularPos = this.calculateIrregularPosition(i);

      const basePos = spiralPos.clone();
      const radius = Math.sqrt(basePos.x * basePos.x + basePos.z * basePos.z);
      const maxRadius = 20;
      const t = Math.min(radius / maxRadius, 1);

      const color = new THREE.Color();
      const centerColor = new THREE.Color(0x00d4ff);
      const edgeColor = new THREE.Color(0x8a2be2);
      color.lerpColors(centerColor, edgeColor, t);

      const size = 0.02 + Math.random() * 0.13;
      const angle = Math.atan2(basePos.z, basePos.x);

      const particle: ParticleData = {
        basePosition: basePos,
        targetPosition: spiralPos.clone(),
        spiralPosition: spiralPos,
        globularPosition: globularPos,
        irregularPosition: irregularPos,
        size: size,
        baseColor: color,
        angle: angle,
        radius: radius,
        height: basePos.y,
        seed: Math.random() * Math.PI * 2
      };

      this.particles.push(particle);

      positions[i * 3] = basePos.x;
      positions[i * 3 + 1] = basePos.y;
      positions[i * 3 + 2] = basePos.z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = size;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  private calculateSpiralPosition(index: number): THREE.Vector3 {
    const t = index / this.particleCount;
    const arm = Math.floor(t * 4) % 4;
    const armAngle = (arm / 4) * Math.PI * 2;
    const radius = Math.pow(t, 0.5) * 20;
    const angle = armAngle + radius * 0.3 + (Math.random() - 0.5) * 0.5;
    const height = (Math.random() - 0.5) * 2 * (1 - t * 0.8);

    return new THREE.Vector3(
      Math.cos(angle) * radius + (Math.random() - 0.5) * 0.8,
      height + (Math.random() - 0.5) * 0.3,
      Math.sin(angle) * radius + (Math.random() - 0.5) * 0.8
    );
  }

  private calculateGlobularPosition(index: number): THREE.Vector3 {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = Math.pow(Math.random(), 0.33) * 15;

    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  private calculateIrregularPosition(index: number): THREE.Vector3 {
    const t = index / this.particleCount;
    const cluster = Math.floor(t * 5);
    const centers = [
      new THREE.Vector3(-5, 2, 3),
      new THREE.Vector3(8, -3, -5),
      new THREE.Vector3(2, 5, 8),
      new THREE.Vector3(-8, -2, -6),
      new THREE.Vector3(4, 4, -4)
    ];
    const center = centers[cluster % centers.length];
    const spread = 4 + Math.random() * 6;
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();

    return new THREE.Vector3(
      center.x + spread * Math.sin(phi) * Math.cos(theta),
      center.y + spread * Math.sin(phi) * Math.sin(theta),
      center.z + spread * Math.cos(phi)
    );
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public setPreset(preset: GalaxyPreset): void {
    if (this.currentPreset === preset || this.isMorphing) return;

    this.targetPreset = preset;
    this.isMorphing = true;
    this.morphProgress = 0;

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      particle.basePosition.set(
        (this.geometry.attributes.position as THREE.BufferAttribute).array[i * 3],
        (this.geometry.attributes.position as THREE.BufferAttribute).array[i * 3 + 1],
        (this.geometry.attributes.position as THREE.BufferAttribute).array[i * 3 + 2]
      );

      switch (preset) {
        case 'spiral':
          particle.targetPosition.copy(particle.spiralPosition);
          break;
        case 'globular':
          particle.targetPosition.copy(particle.globularPosition);
          break;
        case 'irregular':
          particle.targetPosition.copy(particle.irregularPosition);
          break;
      }
    }
  }

  public getCurrentPreset(): GalaxyPreset {
    return this.currentPreset;
  }

  private updateGeometry(): void {
    const positionAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;

    const audioActive = this.audioAnalyzer.getActive();
    let lowEnergy = 0, highEnergy = 0, totalEnergy = 0;

    if (audioActive) {
      lowEnergy = this.audioAnalyzer.getLowFrequencyEnergy();
      highEnergy = this.audioAnalyzer.getHighFrequencyEnergy();
      totalEnergy = this.audioAnalyzer.getTotalEnergy();
    }

    const morphEase = this.easeInOutCubic(Math.min(this.morphProgress, 1));

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      const i3 = i * 3;

      let x: number, y: number, z: number;

      if (this.isMorphing) {
        x = particle.basePosition.x + (particle.targetPosition.x - particle.basePosition.x) * morphEase;
        y = particle.basePosition.y + (particle.targetPosition.y - particle.basePosition.y) * morphEase;
        z = particle.basePosition.z + (particle.targetPosition.z - particle.basePosition.z) * morphEase;
      } else {
        switch (this.currentPreset) {
          case 'spiral':
            x = particle.spiralPosition.x;
            y = particle.spiralPosition.y;
            z = particle.spiralPosition.z;
            break;
          case 'globular':
            x = particle.globularPosition.x;
            y = particle.globularPosition.y;
            z = particle.globularPosition.z;
            break;
          case 'irregular':
            x = particle.irregularPosition.x;
            y = particle.irregularPosition.y;
            z = particle.irregularPosition.z;
            break;
        }
      }

      const distFromCenter = Math.sqrt(x * x + y * y + z * z);
      const rotationSpeed = 0.0003 * (1 + 5 / (distFromCenter + 1));
      const currentAngle = particle.angle + this.time * rotationSpeed;

      const wobbleX = Math.sin(this.time * 0.5 + particle.seed) * 0.03;
      const wobbleY = Math.cos(this.time * 0.7 + particle.seed * 1.3) * 0.03;
      const wobbleZ = Math.sin(this.time * 0.6 + particle.seed * 0.7) * 0.03;

      let finalX = x * Math.cos(currentAngle) - z * Math.sin(currentAngle) + wobbleX;
      let finalY = y + wobbleY;
      let finalZ = x * Math.sin(currentAngle) + z * Math.cos(currentAngle) + wobbleZ;

      if (audioActive) {
        const dir = new THREE.Vector3(finalX, finalY, finalZ).normalize();
        const expand = lowEnergy * 2.5;
        const contract = highEnergy * 1.5;
        const displacement = expand - contract;

        finalX += dir.x * displacement;
        finalY += dir.y * displacement;
        finalZ += dir.z * displacement;
      }

      positions[i3] = finalX;
      positions[i3 + 1] = finalY;
      positions[i3 + 2] = finalZ;

      let colorBrightness = 1;
      if (audioActive) {
        colorBrightness = 0.7 + totalEnergy * 0.8;
      }

      colors[i3] = particle.baseColor.r * colorBrightness;
      colors[i3 + 1] = particle.baseColor.g * colorBrightness;
      colors[i3 + 2] = particle.baseColor.b * colorBrightness;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    if (this.isMorphing) {
      this.morphProgress += deltaTime / this.morphDuration;
      if (this.morphProgress >= 1) {
        this.morphProgress = 1;
        this.isMorphing = false;
        this.currentPreset = this.targetPreset;
      }
    }

    this.updateGeometry();
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
