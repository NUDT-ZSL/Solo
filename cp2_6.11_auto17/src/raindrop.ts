import * as THREE from 'three';
import { MaterialType, CollisionEvent, CollisionSource } from './particles';

interface Raindrop {
  mesh: THREE.Mesh;
  baseVelocityFactor: number;
  active: boolean;
  createdAt: number;
  source: CollisionSource;
}

const MAX_RAINDROPS = 500;
const GROUND_Y = 0;
const SPAWN_HEIGHT = 4;
const GROUND_HALF = 2;
const BASE_FALL_SPEED = 3.0;

export class RaindropSystem {
  private scene: THREE.Scene;
  private raindrops: Raindrop[] = [];
  private sharedGeometry: THREE.SphereGeometry;
  private sharedMaterial: THREE.MeshBasicMaterial;
  private speedMultiplierRef: { value: number };
  private currentMaterial: MaterialType = 'water';
  private onCollision: (event: CollisionEvent) => void;
  private dropTimer: number = 0;
  private dropsPerSecond: number = 300;

  constructor(
    scene: THREE.Scene,
    onCollision: (event: CollisionEvent) => void,
    speedRef?: { value: number }
  ) {
    this.scene = scene;
    this.onCollision = onCollision;
    this.speedMultiplierRef = speedRef ?? { value: 1.0 };

    this.sharedGeometry = new THREE.SphereGeometry(1, 6, 6);
    this.sharedMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7
    });
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplierRef.value = multiplier;
  }

  setRate(perSecond: number): void {
    this.dropsPerSecond = perSecond;
  }

  setMaterial(material: MaterialType): void {
    this.currentMaterial = material;
  }

  spawnDrop(x: number, z: number, isManual: boolean = false): void {
    if (this.raindrops.length >= MAX_RAINDROPS) {
      this.removeOldest();
    }

    const mesh = new THREE.Mesh(this.sharedGeometry, this.sharedMaterial);
    mesh.scale.set(0.03, 0.15, 0.03);
    mesh.position.set(x, SPAWN_HEIGHT, z);
    this.scene.add(mesh);

    const source: CollisionSource = isManual ? 'manual' : 'auto';
    this.raindrops.push({
      mesh,
      baseVelocityFactor: isManual ? 2.5 : 1.8,
      active: true,
      createdAt: performance.now(),
      source
    });
  }

  spawnRandomDrop(): void {
    const x = (Math.random() - 0.5) * GROUND_HALF * 1.8;
    const z = (Math.random() - 0.5) * GROUND_HALF * 1.8;
    this.spawnDrop(x, z, false);
  }

  private removeOldest(): void {
    if (this.raindrops.length === 0) return;
    let oldestIdx = 0;
    let oldestTime = this.raindrops[0].createdAt;
    for (let i = 1; i < this.raindrops.length; i++) {
      if (this.raindrops[i].createdAt < oldestTime) {
        oldestTime = this.raindrops[i].createdAt;
        oldestIdx = i;
      }
    }
    const drop = this.raindrops.splice(oldestIdx, 1)[0];
    this.scene.remove(drop.mesh);
  }

  update(dt: number): void {
    this.dropTimer += dt;
    const interval = 1 / this.dropsPerSecond;
    while (this.dropTimer >= interval) {
      this.dropTimer -= interval;
      this.spawnRandomDrop();
    }

    const currentSpeedMul = this.speedMultiplierRef.value;
    const currentFallSpeed = BASE_FALL_SPEED * currentSpeedMul;

    for (let i = this.raindrops.length - 1; i >= 0; i--) {
      const drop = this.raindrops[i];
      if (!drop.active) continue;

      const fallSpeedThisFrame = currentFallSpeed * drop.baseVelocityFactor;
      drop.mesh.position.y -= fallSpeedThisFrame * dt;

      if (drop.mesh.position.y <= GROUND_Y) {
        this.onCollision({
          x: drop.mesh.position.x,
          z: drop.mesh.position.z,
          material: this.currentMaterial,
          source: drop.source
        });

        this.scene.remove(drop.mesh);
        this.raindrops.splice(i, 1);
      }
    }
  }

  clearAll(): void {
    while (this.raindrops.length > 0) {
      this.removeOldest();
    }
    this.dropTimer = 0;
  }

  getCount(): number {
    return this.raindrops.length;
  }
}
