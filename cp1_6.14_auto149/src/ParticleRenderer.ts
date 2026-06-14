import * as THREE from 'three';
import { EventBus } from './EventBus';
import { ParticleData } from './FlowFieldEngine';

export class ParticleRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private eventBus: EventBus;
  private points: THREE.Points | null = null;
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private particleTexture: THREE.Texture | null = null;
  private maxParticles: number = 4096;
  private width: number = 0;
  private height: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer,
    eventBus: EventBus,
    maxParticles: number = 4096
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.eventBus = eventBus;
    this.maxParticles = maxParticles;

    this.createParticleTexture();
    this.createParticleSystem();
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  private createParticleTexture(): void {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this.particleTexture = new THREE.CanvasTexture(canvas);
    this.particleTexture.minFilter = THREE.LinearFilter;
    this.particleTexture.magFilter = THREE.LinearFilter;
  }

  private createParticleSystem(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);

    for (let i = 0; i < this.maxParticles; i++) {
      this.positions[i * 3] = -10000;
      this.positions[i * 3 + 1] = -10000;
      this.positions[i * 3 + 2] = 0;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setDrawRange(0, 0);

    this.particleMaterial = new THREE.PointsMaterial({
      size: 3,
      sizeAttenuation: false,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.points.renderOrder = 1;
    this.scene.add(this.points);
  }

  update(particles: ParticleData[]): void {
    if (!this.positions || !this.colors || !this.particleGeometry) return;

    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;

    const count = Math.min(particles.length, this.maxParticles);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = 0;

      const a = Math.max(0, Math.min(1, p.a));
      this.colors[i * 3] = Math.max(0, Math.min(1, (p.r / 255) * a * 1.2));
      this.colors[i * 3 + 1] = Math.max(0, Math.min(1, (p.g / 255) * a * 1.2));
      this.colors[i * 3 + 2] = Math.max(0, Math.min(1, (p.b / 255) * a * 1.2));
    }

    for (let i = count; i < this.maxParticles; i++) {
      this.positions[i * 3] = -10000;
      this.positions[i * 3 + 1] = -10000;
      this.positions[i * 3 + 2] = 0;
      this.colors[i * 3] = 0;
      this.colors[i * 3 + 1] = 0;
      this.colors[i * 3 + 2] = 0;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, count);
  }

  clearTrails(): void {}

  dispose(): void {
    if (this.particleGeometry) this.particleGeometry.dispose();
    if (this.particleMaterial) this.particleMaterial.dispose();
    if (this.particleTexture) this.particleTexture.dispose();
    if (this.points) {
      this.scene.remove(this.points);
    }
  }
}
