import * as THREE from 'three';
import { MaterialType, CollisionEvent } from './particles';

interface Raindrop {
  mesh: THREE.Mesh;
  velocity: number;
  active: boolean;
  spawnTime: number;
}

const MAX_RAINDROPS = 500;
const GROUND_Y = 0;
const SPAWN_HEIGHT = 4;
const GROUND_HALF = 2;

export class RaindropSystem {
  private scene: THREE.Scene;
  private raindrops: Raindrop[] = [];
  private sharedGeometry: THREE.SphereGeometry;
  private sharedMaterial: THREE.MeshBasicMaterial;
  private speedMultiplier: number = 1.0;
  private currentMaterial: MaterialType = 'water';
  private onCollision: (event: CollisionEvent) => void;
  private dropTimer: number = 0;
  private dropsPerSecond: number = 300;

  constructor(
    scene: THREE.Scene,
    onCollision: (event: CollisionEvent) => void
  ) {
    this.scene = scene;
    this.onCollision = onCollision;

    this.sharedGeometry = new THREE.SphereGeometry(1, 6, 6);
    this.sharedMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7
    });
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
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

    this.raindrops.push({
      mesh,
      velocity: isManual ? 2.5 : 1.8,
      active: true,
      spawnTime: performance.now()
    });
  }

  spawnRandomDrop(): void {
    const x = (Math.random() - 0.5) * GROUND_HALF * 1.8;
    const z = (Math.random() - 0.5) * GROUND_HALF * 1.8;
    this.spawnDrop(x, z, false);
  }

  private removeOldest(): void {
    const drop = this.raindrops.shift();
    if (drop) {
      this.scene.remove(drop.mesh);
    }
  }

  update(dt: number): void {
    this.dropTimer += dt;
    const interval = 1 / this.dropsPerSecond;
    while (this.dropTimer >= interval) {
      this.dropTimer -= interval;
      this.spawnRandomDrop();
    }

    const baseSpeed = 3.0 * this.speedMultiplier;

    for (let i = this.raindrops.length - 1; i >= 0; i--) {
      const drop = this.raindrops[i];
      if (!drop.active) continue;

      drop.mesh.position.y -= baseSpeed * drop.velocity * dt;

      if (drop.mesh.position.y <= GROUND_Y) {
        const intensity = drop.velocity >= 2.5 ? 1 : 0.5;

        this.onCollision({
          x: drop.mesh.position.x,
          z: drop.mesh.position.z,
          material: this.currentMaterial,
          intensity
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
