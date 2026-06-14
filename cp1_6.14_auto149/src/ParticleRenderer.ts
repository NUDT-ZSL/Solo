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
  private trailCanvas: HTMLCanvasElement;
  private trailCtx: CanvasRenderingContext2D;
  private trailTexture: THREE.Texture;
  private trailMesh: THREE.Mesh | null = null;
  private currentParticleData: ParticleData[] = [];

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

    this.trailCanvas = document.createElement('canvas');
    this.trailCanvas.width = 1024;
    this.trailCanvas.height = 1024;
    this.trailCtx = this.trailCanvas.getContext('2d')!;

    this.trailTexture = new THREE.CanvasTexture(this.trailCanvas);
    this.trailTexture.minFilter = THREE.LinearFilter;
    this.trailTexture.magFilter = THREE.LinearFilter;

    this.createParticleTexture();
    this.createParticleSystem();
    this.createTrailLayer();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.eventBus.on('particles:update', (data: ParticleData[]) => {
      this.currentParticleData = data;
    });
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.trailCanvas.width = Math.min(2048, Math.ceil(width));
    this.trailCanvas.height = Math.min(2048, Math.ceil(height));
    this.trailTexture.needsUpdate = true;

    if (this.trailMesh) {
      const scaleX = width;
      const scaleY = height;
      this.trailMesh.scale.set(scaleX, scaleY, 1);
      this.trailMesh.position.set(width / 2, height / 2, 0);
    }
  }

  private createParticleTexture(): void {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
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

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 4,
      sizeAttenuation: false,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.points.renderOrder = 2;
    this.scene.add(this.points);
  }

  private createTrailLayer(): void {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: this.trailTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.trailMesh = new THREE.Mesh(geometry, material);
    this.trailMesh.renderOrder = 1;
    this.scene.add(this.trailMesh);
  }

  update(particles: ParticleData[]): void {
    if (!this.positions || !this.colors || !this.particleGeometry) return;

    this.renderTrails(particles);

    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < particles.length) {
        const p = particles[i];
        this.positions[i * 3] = p.x;
        this.positions[i * 3 + 1] = this.height - p.y;
        this.positions[i * 3 + 2] = 0;

        const a = p.a;
        this.colors[i * 3] = (p.r / 255) * a;
        this.colors[i * 3 + 1] = (p.g / 255) * a;
        this.colors[i * 3 + 2] = (p.b / 255) * a;
      } else {
        this.positions[i * 3] = -1000;
        this.positions[i * 3 + 1] = -1000;
        this.positions[i * 3 + 2] = 0;
        this.colors[i * 3] = 0;
        this.colors[i * 3 + 1] = 0;
        this.colors[i * 3 + 2] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, Math.min(particles.length, this.maxParticles));
  }

  private renderTrails(particles: ParticleData[]): void {
    if (!this.trailCtx) return;

    this.trailCtx.fillStyle = 'rgba(10, 10, 26, 0.15)';
    this.trailCtx.fillRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);

    const scaleX = this.trailCanvas.width / (this.width || 1);
    const scaleY = this.trailCanvas.height / (this.height || 1);

    for (const p of particles) {
      if (p.trail.length < 2) continue;

      for (let i = 1; i < p.trail.length; i++) {
        const prev = p.trail[i - 1];
        const curr = p.trail[i];
        const trailAlpha = (i / p.trail.length) * 0.3 * p.a;

        this.trailCtx.beginPath();
        this.trailCtx.moveTo(prev.x * scaleX, prev.y * scaleY);
        this.trailCtx.lineTo(curr.x * scaleX, curr.y * scaleY);
        this.trailCtx.strokeStyle = `rgba(${Math.floor(p.r)}, ${Math.floor(p.g)}, ${Math.floor(p.b)}, ${trailAlpha})`;
        this.trailCtx.lineWidth = 2;
        this.trailCtx.lineCap = 'round';
        this.trailCtx.stroke();
      }
    }

    this.trailTexture.needsUpdate = true;
  }

  clearTrails(): void {
    if (!this.trailCtx) return;
    this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
    this.trailTexture.needsUpdate = true;
  }

  dispose(): void {
    if (this.particleGeometry) this.particleGeometry.dispose();
    if (this.particleMaterial) this.particleMaterial.dispose();
    if (this.particleTexture) this.particleTexture.dispose();
    if (this.trailTexture) this.trailTexture.dispose();
    if (this.trailMesh) {
      this.scene.remove(this.trailMesh);
      this.trailMesh.geometry.dispose();
      (this.trailMesh.material as THREE.Material).dispose();
    }
    if (this.points) {
      this.scene.remove(this.points);
    }
  }
}
