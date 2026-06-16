import * as THREE from 'three';
import { SceneManager, SOIL_LAYERS, PIT_SIZE } from './scene';

export interface DigPoint {
  x: number;
  z: number;
  depth: number;
  radius: number;
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export class ExcavationManager {
  private sceneManager: SceneManager;
  private digPoints: DigPoint[] = [];
  private particles: Particle[] = [];
  private maxParticles: number = 500;
  private particlePool: THREE.Mesh[] = [];
  private totalDugDepth: Map<string, number> = new Map();
  private onArtifactExposedCallback: ((x: number, z: number, depth: number) => void) | null = null;
  private isDigging: boolean = false;
  private digCooldown: number = 0;
  private digCount: number = 0;
  private digStartTime: number = Date.now();

  private readonly DIG_RADIUS = 0.1;
  private readonly DIG_DEPTH = 0.05;
  private readonly ARTIFACT_THRESHOLD = 0.15;
  private readonly ARTIFACT_CHANCE = 0.15;
  private readonly DIG_COOLDOWN = 0.3;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.initParticlePool();
    this.setupEventListeners();
    this.sceneManager.addAnimationCallback(this.update.bind(this));
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const geometry = new THREE.SphereGeometry(1, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: SOIL_LAYERS[0].color,
        transparent: true,
        opacity: 0
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.sceneManager.scene.add(mesh);
      this.particlePool.push(mesh);
    }
  }

  private setupEventListeners(): void {
    const canvas = this.sceneManager.renderer.domElement;
    
    canvas.addEventListener('click', (e) => {
      if (this.digCooldown > 0) return;
      this.handleDig(e);
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDigging = true;
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDigging = false;
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDigging && this.digCooldown <= 0) {
        this.handleDig(e);
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDigging = false;
    });
  }

  private handleDig(event: MouseEvent): void {
    const point = this.sceneManager.getIntersectPoint(event, this.sceneManager.soilTopMesh);
    if (!point) return;

    const half = PIT_SIZE / 2;
    if (Math.abs(point.x) > half || Math.abs(point.z) > half) return;

    this.createDigHole(point.x, point.z);
    this.spawnDigParticles(point.x, point.z);
    this.digCooldown = this.DIG_COOLDOWN;
    this.digCount++;

    const key = `${point.x.toFixed(2)}_${point.z.toFixed(2)}`;
    const currentDepth = this.totalDugDepth.get(key) || 0;
    const newDepth = currentDepth + this.DIG_DEPTH;
    this.totalDugDepth.set(key, newDepth);

    if (newDepth >= this.ARTIFACT_THRESHOLD && Math.random() < this.ARTIFACT_CHANCE) {
      const gridKey = this.getGridKey(point.x, point.z);
      if (!this.hasArtifactNearby(point.x, point.z)) {
        this.exposeArtifact(point.x, point.z, newDepth);
      }
    }
  }

  private getGridKey(x: number, z: number): string {
    const gridX = Math.floor(x / 0.3);
    const gridZ = Math.floor(z / 0.3);
    return `${gridX}_${gridZ}`;
  }

  private hasArtifactNearby(x: number, z: number): boolean {
    for (const point of this.digPoints) {
      const dx = point.x - x;
      const dz = point.z - z;
      if (Math.sqrt(dx * dx + dz * dz) < 0.3) {
        return true;
      }
    }
    return false;
  }

  private createDigHole(x: number, z: number): void {
    const mesh = this.sceneManager.soilTopMesh;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position;
    const colors: number[] = [];

    const color = new THREE.Color();
    const R = this.DIG_RADIUS;
    const D = this.DIG_DEPTH;

    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i);
      const pz = positions.getZ(i);
      const py = positions.getY(i);

      const dx = px - x;
      const dz = pz - z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < R) {
        const normalizedR = dist / R;
        const hemisphereOffset = D * Math.sqrt(Math.max(0, 1 - normalizedR * normalizedR));
        const newY = py - hemisphereOffset;
        positions.setY(i, newY);

        const depth = Math.abs(newY);
        const layerIdx = Math.min(Math.floor(depth / 0.3), SOIL_LAYERS.length - 1);
        color.setHex(SOIL_LAYERS[layerIdx].color);
        
        colors.push(color.r, color.g, color.b);
      } else {
        const depth = Math.abs(py);
        const layerIdx = Math.min(Math.floor(depth / 0.3), SOIL_LAYERS.length - 1);
        color.setHex(SOIL_LAYERS[layerIdx].color);
        colors.push(color.r, color.g, color.b);
      }
    }

    if (!geometry.getAttribute('color')) {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      (mesh.material as THREE.MeshStandardMaterial).vertexColors = true;
    } else {
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        colorAttr.setXYZ(i, colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
      }
      colorAttr.needsUpdate = true;
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    this.digPoints.push({ x, z, depth: this.DIG_DEPTH, radius: this.DIG_RADIUS });
  }

  private spawnDigParticles(x: number, z: number): void {
    const count = 8 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const mesh = this.particlePool.find(p => !p.visible);
      if (!mesh) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;
      const vy = 0.03 + Math.random() * 0.04;

      const size = 0.002 + Math.random() * 0.002;
      mesh.scale.set(size, size, size);
      mesh.position.set(x, 0, z);
      mesh.visible = true;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;

      const layerIdx = Math.min(Math.floor(Math.random() * 2), SOIL_LAYERS.length - 1);
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(SOIL_LAYERS[layerIdx].color);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          vy,
          Math.sin(angle) * speed
        ),
        life: 0.3,
        maxLife: 0.3,
        size
      });
    }
  }

  private update(delta: number): void {
    if (this.digCooldown > 0) {
      this.digCooldown -= delta;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.velocity.y -= 0.002;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta * 60));
      
      const opacity = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.8;

      const scale = p.size * (0.5 + 0.5 * opacity);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life <= 0) {
        p.mesh.visible = false;
        this.particles.splice(i, 1);
      }
    }
  }

  private exposeArtifact(x: number, z: number, depth: number): void {
    if (this.onArtifactExposedCallback) {
      this.onArtifactExposedCallback(x, z, depth);
    }
  }

  public onArtifactExposed(callback: (x: number, z: number, depth: number) => void): void {
    this.onArtifactExposedCallback = callback;
  }

  public getDigCount(): number {
    return this.digCount;
  }

  public getDigRatePerMinute(): number {
    const minutes = (Date.now() - this.digStartTime) / 60000;
    return minutes > 0 ? Math.round(this.digCount / minutes) : 0;
  }

  public getSoilTopMesh(): THREE.Mesh {
    return this.sceneManager.soilTopMesh;
  }

  public getRaycaster(): THREE.Raycaster {
    return this.sceneManager.raycaster;
  }

  public getMouse(): THREE.Vector2 {
    return this.sceneManager.mouse;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.sceneManager.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.sceneManager.renderer;
  }

  public getScene(): THREE.Scene {
    return this.sceneManager.scene;
  }

  public getControls(): any {
    return this.sceneManager.controls;
  }

  public addAnimationCallback(callback: (delta: number) => void): void {
    this.sceneManager.addAnimationCallback(callback);
  }

  public removeAnimationCallback(callback: (delta: number) => void): void {
    this.sceneManager.removeAnimationCallback(callback);
  }
}
