import * as THREE from 'three';
import type { MaterialType } from './ui';
import type { ParticleSystem, CollisionEvent } from './particles';

export const RAINDROP_MAX = 500;
const SURFACE_Y = 0;
const DROP_LENGTH = 0.15;
const DROP_RADIUS_XZ = 0.025;

interface Raindrop {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  active: boolean;
  isManual: boolean;
}

export interface RaindropManagerParams {
  scene: THREE.Scene;
  particleSystem: ParticleSystem;
  surfaceBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  initialSpeed: number;
  initialCount: number;
  getCurrentMaterial: () => MaterialType;
}

export class RaindropManager {
  private scene: THREE.Scene;
  private particleSystem: ParticleSystem;
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  private dropGeometry: THREE.SphereGeometry;
  private dropMaterial: THREE.MeshBasicMaterial;

  private pool: Raindrop[] = [];
  private activeDrops: Raindrop[] = [];

  private currentSpeed: number;
  private spawnRate: number;
  private spawnTimer: number = 0;
  private spawnMinY: number = 4;
  private spawnMaxY: number = 6;

  private getMaterial: () => MaterialType;

  private onCollisionCallback: ((e: CollisionEvent) => void) | null = null;

  constructor(params: RaindropManagerParams) {
    this.scene = params.scene;
    this.particleSystem = params.particleSystem;
    this.bounds = params.surfaceBounds;
    this.currentSpeed = params.initialSpeed;
    this.spawnRate = params.initialCount;
    this.getMaterial = params.getCurrentMaterial;

    this.dropGeometry = new THREE.SphereGeometry(1, 8, 8);
    this.dropMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });

    this.prewarmPool();
  }

  private prewarmPool(): void {
    for (let i = 0; i < RAINDROP_MAX; i++) {
      this.pool.push(this.createInactiveDrop());
    }
  }

  private createInactiveDrop(): Raindrop {
    const mesh = new THREE.Mesh(this.dropGeometry, this.dropMaterial.clone());
    mesh.scale.set(DROP_RADIUS_XZ, DROP_LENGTH * 0.5, DROP_RADIUS_XZ);
    mesh.visible = false;
    this.scene.add(mesh);

    return {
      mesh,
      velocity: new THREE.Vector3(0, -this.currentSpeed, 0),
      active: false,
      isManual: false
    };
  }

  public setSpeed(speed: number): void {
    this.currentSpeed = speed;
    for (const drop of this.activeDrops) {
      drop.velocity.y = -speed;
    }
  }

  public setSpawnRate(count: number): void {
    this.spawnRate = count;
  }

  public onCollision(callback: (e: CollisionEvent) => void): void {
    this.onCollisionCallback = callback;
  }

  public spawnManual(x: number, z: number, startY?: number): void {
    const drop = this.acquireDrop();
    if (!drop) return;

    const clampedX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x));
    const clampedZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, z));

    drop.mesh.position.set(
      clampedX,
      startY ?? (this.spawnMinY + Math.random() * (this.spawnMaxY - this.spawnMinY)),
      clampedZ
    );
    drop.velocity.set(0, -this.currentSpeed, 0);
    drop.active = true;
    drop.isManual = true;

    const mat = drop.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.8;
    drop.mesh.scale.set(DROP_RADIUS_XZ * 1.2, DROP_LENGTH * 0.5 * 1.2, DROP_RADIUS_XZ * 1.2);
    drop.mesh.visible = true;

    this.activeDrops.push(drop);
  }

  private acquireDrop(): Raindrop | undefined {
    if (this.activeDrops.length >= RAINDROP_MAX) {
      const oldest = this.activeDrops.shift();
      if (oldest) {
        this.releaseDrop(oldest);
        this.pool.push(oldest);
      }
    }
    return this.pool.pop();
  }

  private releaseDrop(drop: Raindrop): void {
    drop.active = false;
    drop.mesh.visible = false;
    const mat = drop.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0;
    drop.isManual = false;
  }

  private autoSpawn(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = 1 / Math.max(1, this.spawnRate);

    while (this.spawnTimer >= spawnInterval) {
      this.spawnTimer -= spawnInterval;
      this.spawnAuto();
    }
  }

  private spawnAuto(): void {
    const drop = this.acquireDrop();
    if (!drop) return;

    const x = this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX);
    const z = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ);
    const y = this.spawnMinY + Math.random() * (this.spawnMaxY - this.spawnMinY);

    drop.mesh.position.set(x, y, z);
    drop.velocity.set(0, -this.currentSpeed, 0);
    drop.active = true;
    drop.isManual = false;

    const mat = drop.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.6;
    drop.mesh.scale.set(DROP_RADIUS_XZ, DROP_LENGTH * 0.5, DROP_RADIUS_XZ);
    drop.mesh.visible = true;

    this.activeDrops.push(drop);
  }

  public update(deltaTime: number): void {
    this.autoSpawn(deltaTime);
    this.updateDrops(deltaTime);
  }

  private updateDrops(dt: number): void {
    for (let i = this.activeDrops.length - 1; i >= 0; i--) {
      const drop = this.activeDrops[i];
      if (!drop.active) continue;

      drop.mesh.position.addScaledVector(drop.velocity, dt);

      const verticalAlign = new THREE.Vector3(0, -1, 0);
      if (drop.velocity.lengthSq() > 0.0001) {
        const dir = drop.velocity.clone().normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir
        );
        drop.mesh.quaternion.copy(quat);
      }

      if (drop.mesh.position.y <= SURFACE_Y + DROP_LENGTH * 0.4) {
        this.handleCollision(drop);
        this.releaseDrop(drop);
        this.pool.push(drop);
        this.activeDrops.splice(i, 1);
        continue;
      }

      if (drop.mesh.position.y < -2) {
        this.releaseDrop(drop);
        this.pool.push(drop);
        this.activeDrops.splice(i, 1);
      }
    }
  }

  private handleCollision(drop: Raindrop): void {
    const collisionX = drop.mesh.position.x;
    const collisionZ = drop.mesh.position.z;
    const material = this.getMaterial();

    const clampedX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, collisionX));
    const clampedZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, collisionZ));

    const event: CollisionEvent = {
      x: clampedX,
      z: clampedZ,
      isManual: drop.isManual,
      material
    };

    this.particleSystem.handleCollision(event);

    if (this.onCollisionCallback) {
      this.onCollisionCallback(event);
    }
  }

  public clearAll(): void {
    for (let i = this.activeDrops.length - 1; i >= 0; i--) {
      const drop = this.activeDrops[i];
      this.releaseDrop(drop);
      this.pool.push(drop);
    }
    this.activeDrops.length = 0;
    this.spawnTimer = 0;
  }

  public getActiveCount(): number {
    return this.activeDrops.length;
  }

  public getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  public getSpawnRate(): number {
    return this.spawnRate;
  }

  public dispose(): void {
    this.clearAll();

    for (const drop of this.pool) {
      this.scene.remove(drop.mesh);
      (drop.mesh.material as THREE.Material).dispose();
    }
    this.pool.length = 0;

    this.dropGeometry.dispose();
    this.dropMaterial.dispose();
  }
}
