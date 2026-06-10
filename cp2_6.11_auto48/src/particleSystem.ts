import * as THREE from 'three';
import type { ParticleData, ClusterData, Vector3 } from './types';
import { getEmotionColor, analyzeTextEmotion, getScoreLabel, type EmotionScore } from './emotionAnalyzer';

const MAX_PARTICLES = 5000;
const PARTICLES_PER_WORD_MIN = 20;
const PARTICLES_PER_WORD_MAX = 50;

interface ClickEffect {
  clusterId: string;
  startTime: number;
  duration: number;
  maxScale: number;
  maxBrightness: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: ParticleData[] = [];
  private clusters: ClusterData[] = [];
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private points!: THREE.Points;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private time = 0;

  private clickEffects: ClickEffect[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    this.geometry = new THREE.BufferGeometry();

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public createFromText(text: string): { clusters: ClusterData[]; particles: ParticleData[] } {
    const { words, emotions, scores, segments } = analyzeTextEmotion(text);

    if (words.length === 0) {
      this.clear();
      return { clusters: [], particles: [] };
    }

    const particlesPerWord = Math.min(
      Math.floor(MAX_PARTICLES / words.length),
      PARTICLES_PER_WORD_MAX
    );

    const actualParticlesPerWord = Math.max(particlesPerWord, PARTICLES_PER_WORD_MIN);
    const totalParticles = Math.min(words.length * actualParticlesPerWord, MAX_PARTICLES);

    this.particles = [];
    this.clusters = [];
    this.clickEffects = [];

    const clusterRadius = 12;
    const spreadAngle = (Math.PI * 2) / segments.length;
    const nebulaRadius = Math.min(words.length * 6, 80);

    let wordIndex = 0;

    segments.forEach((segmentWords, segIndex) => {
      const segAngle = spreadAngle * segIndex + (Math.random() - 0.5) * 0.3;
      const segHeight = (Math.random() - 0.5) * 30;
      const segRadius = nebulaRadius * (0.7 + Math.random() * 0.3);

      const segCenter: Vector3 = {
        x: Math.cos(segAngle) * segRadius,
        y: segHeight,
        z: Math.sin(segAngle) * segRadius
      };

      segmentWords.forEach((word, wordInSegIndex) => {
        const globalIndex = wordIndex;
        const angleOffset = (wordInSegIndex / segmentWords.length) * Math.PI * 0.6 - Math.PI * 0.3;
        const heightOffset = (Math.random() - 0.5) * 15;
        const localRadius = 8 + Math.random() * 6;

        const clusterPos: Vector3 = {
          x: segCenter.x + Math.cos(segAngle + angleOffset) * localRadius,
          y: segCenter.y + heightOffset,
          z: segCenter.z + Math.sin(segAngle + angleOffset) * localRadius
        };

        const emotionScore = scores[globalIndex];
        const emotion = emotions[globalIndex];

        const cluster: ClusterData = {
          id: `cluster-${globalIndex}`,
          word,
          emotion,
          emotionScore: emotionScore.score,
          position: clusterPos,
          particleIds: [],
          createdAt: Date.now(),
          index: globalIndex,
          segmentIndex: segIndex
        };

        this.clusters.push(cluster);

        const particleCount = Math.min(actualParticlesPerWord, totalParticles - this.particles.length);

        for (let i = 0; i < particleCount; i++) {
          const offset = this.getRandomSpherePoint(clusterRadius * (0.3 + Math.random() * 0.7));
          const colorVariation = Math.random();
          const baseColor = getEmotionColor(emotion, emotionScore.score, colorVariation);

          const particle: ParticleData = {
            id: `p-${globalIndex}-${i}`,
            position: {
              x: clusterPos.x + offset.x,
              y: clusterPos.y + offset.y,
              z: clusterPos.z + offset.z
            },
            velocity: {
              x: (Math.random() - 0.5) * 0.02,
              y: (Math.random() - 0.5) * 0.02,
              z: (Math.random() - 0.5) * 0.02
            },
            baseColor,
            size: 1 + Math.random() * 1.5,
            clusterId: cluster.id,
            brightness: 1,
            targetBrightness: 1,
            brightnessTransition: 0
          };

          this.particles.push(particle);
          cluster.particleIds.push(particle.id);
        }

        wordIndex++;
      });
    });

    this.updateGeometry();
    return { clusters: this.clusters, particles: this.particles };
  }

  private getRandomSpherePoint(radius: number): Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi)
    };
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.clickEffects = this.clickEffects.filter(effect => {
      const elapsed = this.time * 1000 - effect.startTime;
      return elapsed < effect.duration;
    });

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];

      const cluster = this.clusters.find(c => c.id === particle.clusterId);
      if (cluster) {
        const dx = cluster.position.x - particle.position.x;
        const dy = cluster.position.y - particle.position.y;
        const dz = cluster.position.z - particle.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > 0.1) {
          const force = 0.0005 * dist;
          particle.velocity.x += (dx / dist) * force;
          particle.velocity.y += (dy / dist) * force;
          particle.velocity.z += (dz / dist) * force;
        }
      }

      const floatForce = 0.001;
      particle.velocity.x += Math.sin(this.time + particle.position.y * 0.1) * floatForce;
      particle.velocity.y += Math.cos(this.time + particle.position.x * 0.1) * floatForce * 0.5;
      particle.velocity.z += Math.sin(this.time + particle.position.x * 0.15) * floatForce;

      particle.velocity.x *= 0.98;
      particle.velocity.y *= 0.98;
      particle.velocity.z *= 0.98;

      particle.position.x += particle.velocity.x;
      particle.position.y += particle.velocity.y;
      particle.position.z += particle.velocity.z;

      if (particle.brightnessTransition > 0) {
        particle.brightness += (particle.targetBrightness - particle.brightness) * 0.15;
        particle.brightnessTransition -= deltaTime * 5;
        if (particle.brightnessTransition <= 0) {
          particle.brightness = particle.targetBrightness;
        }
      }
    }

    this.updateGeometry();
  }

  private getClickScale(particle: ParticleData): number {
    let scale = 1;

    for (const effect of this.clickEffects) {
      if (particle.clusterId === effect.clusterId) {
        const elapsed = performance.now() - effect.startTime;
        const progress = Math.min(1, elapsed / effect.duration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const pulse = Math.sin(progress * Math.PI);
        scale += (effect.maxScale - 1) * pulse * easeOut;
      }
    }

    return scale;
  }

  private getClickBrightness(particle: ParticleData): number {
    let brightnessBoost = 0;

    for (const effect of this.clickEffects) {
      if (particle.clusterId === effect.clusterId) {
        const elapsed = performance.now() - effect.startTime;
        const progress = Math.min(1, elapsed / effect.duration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const pulse = Math.sin(progress * Math.PI);
        brightnessBoost += (effect.maxBrightness - 1) * pulse * easeOut;
      }
    }

    return brightnessBoost;
  }

  private updateGeometry(): void {
    const count = this.particles.length;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const i3 = i * 3;

      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;

      const color = this.hexToRgb(p.baseColor);
      const brightness = Math.min(3, p.brightness + this.getClickBrightness(p));
      this.colors[i3] = Math.min(1, (color.r / 255) * brightness);
      this.colors[i3 + 1] = Math.min(1, (color.g / 255) * brightness);
      this.colors[i3 + 2] = Math.min(1, (color.b / 255) * brightness);

      const scale = this.getClickScale(p);
      this.sizes[i] = p.size * scale;
    }

    this.geometry.setDrawRange(0, count);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 200, g: 200, b: 200 };
  }

  public highlightCluster(clusterId: string, bright: boolean): void {
    const brightness = bright ? 1.8 : 1;

    for (const particle of this.particles) {
      if (particle.clusterId === clusterId) {
        particle.targetBrightness = brightness;
        particle.brightnessTransition = 0.3;
      }
    }
  }

  public highlightAll(reset: boolean): void {
    const brightness = reset ? 1 : 0.4;
    for (const particle of this.particles) {
      particle.targetBrightness = brightness;
      particle.brightnessTransition = 0.3;
    }
  }

  public clickCluster(clusterId: string): void {
    this.clickEffects.push({
      clusterId,
      startTime: performance.now(),
      duration: 200,
      maxScale: 1.5,
      maxBrightness: 2.0
    });
  }

  public flashCluster(clusterId: string): void {
    this.clickCluster(clusterId);
  }

  public getClusterAtPosition(
    raycaster: THREE.Raycaster,
    _camera: THREE.Camera
  ): ClusterData | null {
    const intersects = raycaster.intersectObject(this.points);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined && index < this.particles.length) {
        const particle = this.particles[index];
        return this.clusters.find(c => c.id === particle.clusterId) || null;
      }
    }

    return null;
  }

  public getClusterById(clusterId: string): ClusterData | undefined {
    return this.clusters.find(c => c.id === clusterId);
  }

  public getClusters(): ClusterData[] {
    return this.clusters;
  }

  public getParticles(): ParticleData[] {
    return this.particles;
  }

  public moveCluster(clusterId: string, newPosition: Vector3): void {
    const cluster = this.clusters.find(c => c.id === clusterId);
    if (cluster) {
      cluster.position = { ...newPosition };
    }
  }

  public setClusters(clusters: ClusterData[]): void {
    this.clusters = clusters;
  }

  public setParticles(particles: ParticleData[]): void {
    this.particles = particles;
    this.updateGeometry();
  }

  public clear(): void {
    this.particles = [];
    this.clusters = [];
    this.clickEffects = [];
    this.geometry.setDrawRange(0, 0);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }

  public getPoints(): THREE.Points {
    return this.points;
  }

  public getEmotionScoreLabel(score: number): string {
    return getScoreLabel(score);
  }
}
