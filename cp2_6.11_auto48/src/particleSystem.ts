import * as THREE from 'three';
import type { ParticleData, ClusterData, Vector3 } from './types';
import { getEmotionColor, analyzeTextEmotion } from './emotionAnalyzer';

const MAX_PARTICLES = 5000;
const PARTICLES_PER_WORD_MIN = 20;
const PARTICLES_PER_WORD_MAX = 50;

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
    const { words, emotions } = analyzeTextEmotion(text);
    
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

    const clusterRadius = 15;
    const spreadAngle = (Math.PI * 2) / words.length;
    const nebulaRadius = Math.min(words.length * 8, 80);

    words.forEach((word, index) => {
      const angle = spreadAngle * index + (Math.random() - 0.5) * 0.5;
      const heightVariation = (Math.random() - 0.5) * 40;
      const radiusVariation = nebulaRadius * (0.6 + Math.random() * 0.4);

      const clusterPos: Vector3 = {
        x: Math.cos(angle) * radiusVariation,
        y: heightVariation,
        z: Math.sin(angle) * radiusVariation
      };

      const cluster: ClusterData = {
        id: `cluster-${index}`,
        word,
        emotion: emotions[index],
        position: clusterPos,
        particleIds: [],
        createdAt: Date.now(),
        index
      };

      this.clusters.push(cluster);

      const particleCount = Math.min(actualParticlesPerWord, totalParticles - this.particles.length);
      
      for (let i = 0; i < particleCount; i++) {
        const offset = this.getRandomSpherePoint(clusterRadius * (0.3 + Math.random() * 0.7));
        const colorVariation = Math.random();
        const baseColor = getEmotionColor(emotions[index], colorVariation);
        
        const particle: ParticleData = {
          id: `p-${index}-${i}`,
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

      particle.velocity.x *= 0.98;
      particle.velocity.y *= 0.98;
      particle.velocity.z *= 0.98;

      particle.position.x += particle.velocity.x;
      particle.position.y += particle.velocity.y;
      particle.position.z += particle.velocity.z;

      if (particle.brightnessTransition > 0) {
        particle.brightness += (particle.targetBrightness - particle.brightness) * 0.1;
        particle.brightnessTransition -= deltaTime * 5;
        if (particle.brightnessTransition <= 0) {
          particle.brightness = particle.targetBrightness;
        }
      }
    }

    this.updateGeometry();
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
      const brightness = p.brightness;
      this.colors[i3] = (color.r / 255) * brightness;
      this.colors[i3 + 1] = (color.g / 255) * brightness;
      this.colors[i3 + 2] = (color.b / 255) * brightness;

      this.sizes[i] = p.size;
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

  public flashCluster(clusterId: string): void {
    let flashCount = 0;
    const flashDuration = 200;
    const flashInterval = 50;

    const flash = () => {
      const bright = flashCount % 2 === 0;
      this.highlightCluster(clusterId, bright);
      flashCount++;
      
      if (flashCount * flashInterval < flashDuration) {
        setTimeout(flash, flashInterval);
      } else {
        this.highlightCluster(clusterId, false);
      }
    };

    flash();
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
}
