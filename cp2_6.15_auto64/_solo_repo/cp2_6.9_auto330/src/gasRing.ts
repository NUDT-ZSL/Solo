import * as THREE from 'three';

const PARTICLE_COUNT = 8000;
const INNER_RADIUS = 150;
const OUTER_RADIUS = 240;
const DEFAULT_ROTATION_SPEED = 0.5;

const COLOR_INNER = new THREE.Color('#FF6B35');
const COLOR_MIDDLE = new THREE.Color('#FFD700');
const COLOR_OUTER = new THREE.Color('#87CEEB');

interface ParticleData {
  baseRadius: number;
  baseAngle: number;
  pulsationAmplitude: number;
  pulsationFrequency: number;
  pulsationPhase: number;
  alphaPhase: number;
  baseAlpha: number;
  tempSpeedBoost: number;
  tempColorMix: number;
  tempColor: THREE.Color;
}

export class GasRing {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private particleData: ParticleData[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private alphas: Float32Array;
  private baseColors: THREE.Color[] = [];

  public rotationSpeed: number = DEFAULT_ROTATION_SPEED;
  public targetRotationSpeed: number = DEFAULT_ROTATION_SPEED;
  public accumulatedAngle: number = 0;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.alphas = new Float32Array(PARTICLE_COUNT);

    this.initializeParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private initializeParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = Math.random();
      const radius = INNER_RADIUS + t * (OUTER_RADIUS - INNER_RADIUS);
      const angle = Math.random() * Math.PI * 2;

      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = (Math.random() - 0.5) * 8;

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      const color = this.getColorForRadius(radius);
      this.baseColors.push(color.clone());
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.alphas[i] = 0.3 + Math.random() * 0.6;

      this.particleData.push({
        baseRadius: radius,
        baseAngle: angle,
        pulsationAmplitude: 3 + Math.random() * 12,
        pulsationFrequency: 0.5 + Math.random() * 1.5,
        pulsationPhase: Math.random() * Math.PI * 2,
        alphaPhase: Math.random() * Math.PI * 2,
        baseAlpha: this.alphas[i],
        tempSpeedBoost: 0,
        tempColorMix: 0,
        tempColor: new THREE.Color('#00FFFF')
      });
    }
  }

  private getColorForRadius(radius: number): THREE.Color {
    const t = (radius - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS);
    if (t < 0.5) {
      return COLOR_INNER.clone().lerp(COLOR_MIDDLE, t * 2);
    } else {
      return COLOR_MIDDLE.clone().lerp(COLOR_OUTER, (t - 0.5) * 2);
    }
  }

  public getParticleCount(): number {
    return PARTICLE_COUNT;
  }

  public getAverageSpeed(): number {
    return this.rotationSpeed;
  }

  public getDominantColor(): THREE.Color {
    const innerCount = this.particleData.filter(p => p.baseRadius < (INNER_RADIUS + OUTER_RADIUS) / 3).length;
    const middleCount = this.particleData.filter(p => 
      p.baseRadius >= (INNER_RADIUS + OUTER_RADIUS) / 3 && 
      p.baseRadius < 2 * (INNER_RADIUS + OUTER_RADIUS) / 3
    ).length;
    const outerCount = PARTICLE_COUNT - innerCount - middleCount;

    if (innerCount >= middleCount && innerCount >= outerCount) {
      return COLOR_INNER.clone();
    } else if (middleCount >= innerCount && middleCount >= outerCount) {
      return COLOR_MIDDLE.clone();
    } else {
      return COLOR_OUTER.clone();
    }
  }

  public applyPerturbation(worldX: number, worldZ: number): void {
    const PERTURBATION_RADIUS = 80;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const px = this.positions[i * 3];
      const pz = this.positions[i * 3 + 2];
      const dx = px - worldX;
      const dz = pz - worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= PERTURBATION_RADIUS) {
        this.particleData[i].tempSpeedBoost = 0.5;
        this.particleData[i].tempColorMix = 1.0;
      }
    }
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.rotationSpeed += (this.targetRotationSpeed - this.rotationSpeed) * Math.min(deltaTime * 3, 1);
    this.accumulatedAngle += this.rotationSpeed * deltaTime * Math.PI * 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const data = this.particleData[i];

      if (data.tempSpeedBoost > 0) {
        data.tempSpeedBoost = Math.max(0, data.tempSpeedBoost - deltaTime / 3);
      }
      if (data.tempColorMix > 0) {
        data.tempColorMix = Math.max(0, data.tempColorMix - deltaTime / 3);
      }

      const effectiveSpeed = 1 + data.tempSpeedBoost;
      const angle = data.baseAngle + this.accumulatedAngle * effectiveSpeed * (1 / (1 + (data.baseRadius - INNER_RADIUS) * 0.002));
      
      const pulsation = Math.sin(elapsedTime * data.pulsationFrequency + data.pulsationPhase) * data.pulsationAmplitude;
      const radius = data.baseRadius + pulsation;

      this.positions[i * 3] = radius * Math.cos(angle);
      this.positions[i * 3 + 2] = radius * Math.sin(angle);

      const alphaPulse = Math.sin(elapsedTime * data.pulsationFrequency + data.alphaPhase);
      this.alphas[i] = data.baseAlpha + alphaPulse * 0.3;
      this.alphas[i] = Math.max(0.3, Math.min(0.9, this.alphas[i]));

      if (data.tempColorMix > 0) {
        const mixedColor = this.baseColors[i].clone().lerp(data.tempColor, data.tempColorMix);
        this.colors[i * 3] = mixedColor.r;
        this.colors[i * 3 + 1] = mixedColor.g;
        this.colors[i * 3 + 2] = mixedColor.b;
      } else {
        this.colors[i * 3] = this.baseColors[i].r;
        this.colors[i * 3 + 1] = this.baseColors[i].g;
        this.colors[i * 3 + 2] = this.baseColors[i].b;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
