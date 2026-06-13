import * as THREE from 'three';
import * as d3 from 'd3';
import { dataLoader, WindData, WindSample } from './dataLoader';

export interface ParticleInfo {
  id: number;
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  windSpeed: number;
  height: number;
}

interface Particle {
  id: number;
  controlPoints: THREE.Vector3[];
  pathLength: number;
  progress: number;
  baseSpeed: number;
  trailPositions: THREE.Vector3[];
  currentPosition: THREE.Vector3;
  currentWindSpeed: number;
  currentColor: THREE.Color;
  currentSize: number;
  baseOffset: number;
}

const COLOR_LOW = new THREE.Color(0x1e3a8a);
const COLOR_HIGH = new THREE.Color(0xf97316);
const TRAIL_LENGTH = 20;
const CONTROL_POINT_COUNT = 80;
const PARTICLE_BASE_SIZE_LOW = 3.0;
const PARTICLE_BASE_SIZE_HIGH = 1.5;

class ParticleSystem {
  private particles: Particle[] = [];
  private windData: WindData | null = null;
  private speedMultiplier: number = 1.0;
  private targetParticleCount: number = 2000;
  private colorInterpolator: (t: number) => string;
  private bounds = { minX: -180, maxX: 180, minY: -180, maxY: 180, minZ: 0, maxZ: 100 };

  constructor() {
    this.colorInterpolator = d3.interpolateRgb(
      '#' + COLOR_LOW.getHexString(),
      '#' + COLOR_HIGH.getHexString()
    );
  }

  public async init(particleCount: number = 2000): Promise<void> {
    this.targetParticleCount = particleCount;
    this.windData = await dataLoader.loadWindData();
    this.bounds = this.windData.bounds;
    this.generateParticles(particleCount);
  }

  public receiveData(data: WindData): void {
    this.windData = data;
    this.bounds = data.bounds;
  }

  private generateParticles(count: number): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(i));
    }
  }

  private createParticle(id: number): Particle {
    const startX = this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX);
    const startY = this.bounds.minY + Math.random() * (this.bounds.maxY - this.bounds.minY);
    const startZ = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ);

    const controlPoints = this.generateBezierControlPoints(
      new THREE.Vector3(startX, startY, startZ),
      CONTROL_POINT_COUNT
    );

    const pathLength = this.calculatePathLength(controlPoints);
    const trailPositions: THREE.Vector3[] = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      trailPositions.push(new THREE.Vector3(startX, startY, startZ));
    }

    const sample = dataLoader.sampleAt(startX, startY, startZ);
    const heightRatio = (startZ - this.bounds.minZ) / (this.bounds.maxZ - this.bounds.minZ);
    const size = PARTICLE_BASE_SIZE_LOW - heightRatio * (PARTICLE_BASE_SIZE_LOW - PARTICLE_BASE_SIZE_HIGH);

    return {
      id,
      controlPoints,
      pathLength,
      progress: Math.random(),
      baseSpeed: 0.0015 + Math.random() * 0.001,
      trailPositions,
      currentPosition: new THREE.Vector3(startX, startY, startZ),
      currentWindSpeed: sample.speed,
      currentColor: this.getWindColor(sample.normalizedSpeed),
      currentSize: size,
      baseOffset: Math.random() * 0.1
    };
  }

  private generateBezierControlPoints(start: THREE.Vector3, count: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [start.clone()];
    let current = start.clone();
    const stepSize = 8;

    for (let i = 1; i < count; i++) {
      const sample = dataLoader.sampleAt(current.x, current.y, current.z);

      const dx = sample.u * stepSize * 0.15;
      const dy = sample.v * stepSize * 0.15;
      const dz = sample.w * stepSize * 0.15;

      const noiseX = (Math.random() - 0.5) * 6;
      const noiseY = (Math.random() - 0.5) * 6;
      const noiseZ = (Math.random() - 0.5) * 2;

      let nextX = current.x + dx + noiseX;
      let nextY = current.y + dy + noiseY;
      let nextZ = current.z + dz + noiseZ;

      nextX = Math.max(this.bounds.minX + 10, Math.min(this.bounds.maxX - 10, nextX));
      nextY = Math.max(this.bounds.minY + 10, Math.min(this.bounds.maxY - 10, nextY));
      nextZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, nextZ));

      points.push(new THREE.Vector3(nextX, nextY, nextZ));
      current.set(nextX, nextY, nextZ);
    }

    return points;
  }

  private calculatePathLength(points: THREE.Vector3[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += points[i].distanceTo(points[i - 1]);
    }
    return length || 1;
  }

  public getPositionOnPath(progress: number, controlPoints: THREE.Vector3[]): THREE.Vector3 {
    const clampedProgress = Math.max(0, Math.min(0.9999, progress));
    const segmentCount = controlPoints.length - 1;
    const segmentProgress = clampedProgress * segmentCount;
    const segmentIndex = Math.floor(segmentProgress);
    const localT = segmentProgress - segmentIndex;

    const nextIndex = Math.min(segmentIndex + 1, segmentCount);

    const p0 = controlPoints[Math.max(0, segmentIndex - 1)];
    const p1 = controlPoints[segmentIndex];
    const p2 = controlPoints[nextIndex];
    const p3 = controlPoints[Math.min(segmentCount, nextIndex + 1)];

    const t = localT;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    const result = new THREE.Vector3();
    result.x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    result.y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    result.z = 0.5 * (
      (2 * p1.z) +
      (-p0.z + p2.z) * t +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
    );

    return result;
  }

  private getWindColor(normalizedSpeed: number): THREE.Color {
    const clamped = Math.max(0, Math.min(1, normalizedSpeed));
    const colorStr = this.colorInterpolator(clamped);
    return new THREE.Color(colorStr);
  }

  public update(deltaTime: number, isPlaying: boolean): ParticleInfo[] {
    const dt = Math.min(deltaTime, 0.05);

    if (isPlaying) {
      for (const particle of this.particles) {
        const windFactor = 0.3 + particle.currentWindSpeed / 50 * 0.7;
        const speedDelta = particle.baseSpeed * windFactor * this.speedMultiplier * dt * 60;
        particle.progress += speedDelta;

        if (particle.progress >= 1.0) {
          particle.progress = 0;
          const startPos = particle.controlPoints[0];
          const newStart = new THREE.Vector3(
            this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX),
            this.bounds.minY + Math.random() * (this.bounds.maxY - this.bounds.minY),
            this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ)
          );
          particle.controlPoints = this.generateBezierControlPoints(newStart, CONTROL_POINT_COUNT);
          particle.pathLength = this.calculatePathLength(particle.controlPoints);
          startPos.copy(newStart);
        }

        const newPosition = this.getPositionOnPath(particle.progress, particle.controlPoints);
        particle.currentPosition.copy(newPosition);

        for (let i = particle.trailPositions.length - 1; i > 0; i--) {
          particle.trailPositions[i].copy(particle.trailPositions[i - 1]);
        }
        particle.trailPositions[0].copy(newPosition);

        const sample = dataLoader.sampleAt(
          newPosition.x,
          newPosition.y,
          newPosition.z
        );
        particle.currentWindSpeed = sample.speed;
        particle.currentColor = this.getWindColor(sample.normalizedSpeed);

        const heightRatio = (newPosition.z - this.bounds.minZ) / (this.bounds.maxZ - this.bounds.minZ);
        particle.currentSize = PARTICLE_BASE_SIZE_LOW -
          heightRatio * (PARTICLE_BASE_SIZE_LOW - PARTICLE_BASE_SIZE_HIGH);
      }
    }

    return this.particles.map(p => ({
      id: p.id,
      position: p.currentPosition,
      color: p.currentColor,
      size: p.currentSize,
      windSpeed: p.currentWindSpeed,
      height: p.currentPosition.z
    }));
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(2.0, multiplier));
  }

  public setParticleCount(count: number): void {
    const clampedCount = Math.max(500, Math.min(4000, Math.floor(count)));
    this.targetParticleCount = clampedCount;

    if (clampedCount > this.particles.length) {
      for (let i = this.particles.length; i < clampedCount; i++) {
        this.particles.push(this.createParticle(i));
      }
    } else if (clampedCount < this.particles.length) {
      this.particles.length = clampedCount;
    }
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public getAllTrailPositions(): { positions: Float32Array; colors: Float32Array } {
    const trailSegmentCount = TRAIL_LENGTH - 1;
    const totalSegments = this.particles.length * trailSegmentCount;
    const positions = new Float32Array(totalSegments * 2 * 3);
    const colors = new Float32Array(totalSegments * 2 * 3);

    let posIndex = 0;
    let colIndex = 0;

    for (const particle of this.particles) {
      const trail = particle.trailPositions;
      for (let i = 0; i < trailSegmentCount; i++) {
        const alpha1 = 1 - i / trailSegmentCount;
        const alpha2 = 1 - (i + 1) / trailSegmentCount;

        const p1 = trail[i];
        const p2 = trail[i + 1];
        positions[posIndex++] = p1.x;
        positions[posIndex++] = p1.y;
        positions[posIndex++] = p1.z;
        positions[posIndex++] = p2.x;
        positions[posIndex++] = p2.y;
        positions[posIndex++] = p2.z;

        const r = particle.currentColor.r;
        const g = particle.currentColor.g;
        const b = particle.currentColor.b;

        colors[colIndex++] = r * alpha1;
        colors[colIndex++] = g * alpha1;
        colors[colIndex++] = b * alpha1;
        colors[colIndex++] = r * alpha2;
        colors[colIndex++] = g * alpha2;
        colors[colIndex++] = b * alpha2;
      }
    }

    return { positions, colors };
  }

  public getParticleData(): ParticleInfo[] {
    return this.particles.map(p => ({
      id: p.id,
      position: p.currentPosition,
      color: p.currentColor,
      size: p.currentSize,
      windSpeed: p.currentWindSpeed,
      height: p.currentPosition.z
    }));
  }
}

export const particleSystem = new ParticleSystem();
