import * as THREE from 'three';

interface NebulaParticle {
  baseAlpha: number;
  flickerPeriod: number;
  flickerOffset: number;
  size: number;
}

export class BackgroundNebula {
  public points: THREE.Points;
  private particles: NebulaParticle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private colors: Float32Array;
  private alphas: Float32Array;
  private sizes: Float32Array;
  
  private readonly PARTICLE_COUNT = 2000;
  private readonly MIN_SIZE = 0.005;
  private readonly MAX_SIZE = 0.02;
  private readonly MIN_ALPHA = 0.2;
  private readonly MAX_ALPHA = 0.6;
  private readonly MIN_PERIOD = 3;
  private readonly MAX_PERIOD = 7;
  private readonly COLOR_START = new THREE.Color(0x000033);
  private readonly COLOR_END = new THREE.Color(0x4B0082);
  private readonly SCENE_RADIUS = 8;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(this.PARTICLE_COUNT * 3);
    this.colors = new Float32Array(this.PARTICLE_COUNT * 3);
    this.alphas = new Float32Array(this.PARTICLE_COUNT);
    this.sizes = new Float32Array(this.PARTICLE_COUNT);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const idx = i * 3;
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.SCENE_RADIUS * (0.5 + Math.random() * 0.5);
      
      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = r * Math.cos(phi);

      const colorT = Math.random();
      const color = this.COLOR_START.clone().lerp(this.COLOR_END, colorT);
      this.colors[idx] = color.r;
      this.colors[idx + 1] = color.g;
      this.colors[idx + 2] = color.b;

      const sizeT = Math.random();
      const size = this.MIN_SIZE + sizeT * (this.MAX_SIZE - this.MIN_SIZE);
      this.sizes[i] = size;

      const baseAlpha = this.MIN_ALPHA + Math.random() * (this.MAX_ALPHA - this.MIN_ALPHA);
      this.alphas[i] = baseAlpha;

      this.particles.push({
        baseAlpha,
        flickerPeriod: this.MIN_PERIOD + Math.random() * (this.MAX_PERIOD - this.MIN_PERIOD),
        flickerOffset: Math.random() * Math.PI * 2,
        size,
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: this.MAX_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -1;
  }

  public update(elapsedTime: number): void {
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const particle = this.particles[i];
      const flickerPhase = (elapsedTime / particle.flickerPeriod) * Math.PI * 2 + particle.flickerOffset;
      const flickerValue = (Math.sin(flickerPhase) + 1) * 0.5;
      
      const alpha = particle.baseAlpha * (0.5 + flickerValue * 0.5);
      const idx = i * 3;
      this.colors[idx] = this.colors[idx] * alpha / particle.baseAlpha;
      this.colors[idx + 1] = this.colors[idx + 1] * alpha / particle.baseAlpha;
      this.colors[idx + 2] = this.colors[idx + 2] * alpha / particle.baseAlpha;
      this.sizes[i] = particle.size * (0.8 + flickerValue * 0.4);
    }

    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
