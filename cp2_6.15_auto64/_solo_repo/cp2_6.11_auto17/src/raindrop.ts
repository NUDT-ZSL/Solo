import * as THREE from 'three';
import { MaterialType, CollisionEvent, CollisionSource } from './particles';

interface Raindrop {
  mesh: THREE.Mesh;
  baseVelocityFactor: number;
  active: boolean;
  source: CollisionSource;
}

const MAX_RAINDROPS = 500;
const GROUND_Y = 0;
const SPAWN_HEIGHT = 4;
const GROUND_HALF = 2;
const BASE_FALL_SPEED = 3.0;

export class RaindropSystem {
  private scene: THREE.Scene;
  private buffer: (Raindrop | null)[];
  private writePtr: number = 0;
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
    this.buffer = new Array(MAX_RAINDROPS).fill(null);

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

  private disposeSlot(idx: number): void {
    const drop = this.buffer[idx];
    if (!drop) return;
    try {
      this.scene.remove(drop.mesh);
    } catch (_) { /* noop */ }
    this.buffer[idx] = null;
  }

  private allocSlot(): number {
    for (let i = 0; i < MAX_RAINDROPS; i++) {
      const idx = (this.writePtr + i) % MAX_RAINDROPS;
      const slot = this.buffer[idx];
      if (!slot || !slot.active) {
        this.disposeSlot(idx);
        this.writePtr = (idx + 1) % MAX_RAINDROPS;
        return idx;
      }
    }
    const idx = this.writePtr;
    this.disposeSlot(idx);
    this.writePtr = (idx + 1) % MAX_RAINDROPS;
    return idx;
  }

  spawnDrop(x: number, z: number, isManual: boolean = false): void {
    const mesh = new THREE.Mesh(this.sharedGeometry, this.sharedMaterial);
    mesh.scale.set(0.03, 0.15, 0.03);
    mesh.position.set(x, SPAWN_HEIGHT, z);
    this.scene.add(mesh);

    const source: CollisionSource = isManual ? 'manual' : 'auto';
    const idx = this.allocSlot();
    this.buffer[idx] = {
      mesh,
      baseVelocityFactor: isManual ? 2.5 : 1.8,
      active: true,
      source
    };
  }

  spawnRandomDrop(): void {
    const x = (Math.random() - 0.5) * GROUND_HALF * 1.8;
    const z = (Math.random() - 0.5) * GROUND_HALF * 1.8;
    this.spawnDrop(x, z, false);
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

    for (let i = 0; i < MAX_RAINDROPS; i++) {
      const drop = this.buffer[i];
      if (!drop || !drop.active) continue;

      const fallSpeedThisFrame = currentFallSpeed * drop.baseVelocityFactor;
      drop.mesh.position.y -= fallSpeedThisFrame * dt;

      if (drop.mesh.position.y <= GROUND_Y) {
        this.onCollision({
          x: drop.mesh.position.x,
          z: drop.mesh.position.z,
          material: this.currentMaterial,
          source: drop.source
        });
        drop.active = false;
        this.disposeSlot(i);
      }
    }
  }

  clearAll(): void {
    for (let i = 0; i < MAX_RAINDROPS; i++) {
      this.disposeSlot(i);
    }
    this.writePtr = 0;
    this.dropTimer = 0;
  }

  getCount(): number {
    let c = 0;
    for (let i = 0; i < MAX_RAINDROPS; i++) if (this.buffer[i]?.active) c++;
    return c;
  }
}
