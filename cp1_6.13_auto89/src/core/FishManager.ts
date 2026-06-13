import * as THREE from 'three';

export interface FishStatus {
  detected: boolean;
  lastPingTime: number;
}

interface Fish {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  detected: boolean;
  lastPingTime: number;
}

const FISH_COUNT = 20;
const SCENE_WIDTH = 800;
const SCENE_DEPTH = 800;
const SCENE_HEIGHT = 400;
const MAX_SPEED = 3;

export class FishManager {
  private fishes: Fish[] = [];

  constructor() {
    this.initializeFishes();
  }

  private initializeFishes(): void {
    for (let i = 0; i < FISH_COUNT; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * SCENE_WIDTH * 0.8,
        (Math.random() - 0.3) * SCENE_HEIGHT * 0.6,
        (Math.random() - 0.5) * SCENE_DEPTH * 0.8
      );

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * MAX_SPEED,
        (Math.random() - 0.5) * MAX_SPEED * 0.3,
        (Math.random() - 0.5) * MAX_SPEED
      );

      this.fishes.push({
        position,
        velocity,
        detected: false,
        lastPingTime: -1,
      });
    }
  }

  update(deltaTime: number): void {
    for (const fish of this.fishes) {
      fish.velocity.x += (Math.random() - 0.5) * MAX_SPEED * 0.5 * deltaTime;
      fish.velocity.y += (Math.random() - 0.5) * MAX_SPEED * 0.2 * deltaTime;
      fish.velocity.z += (Math.random() - 0.5) * MAX_SPEED * 0.5 * deltaTime;

      const speed = fish.velocity.length();
      if (speed > MAX_SPEED) {
        fish.velocity.multiplyScalar(MAX_SPEED / speed);
      }

      fish.position.add(fish.velocity.clone().multiplyScalar(deltaTime));

      const halfW = SCENE_WIDTH * 0.45;
      const halfD = SCENE_DEPTH * 0.45;
      const minH = -SCENE_HEIGHT * 0.4;
      const maxH = SCENE_HEIGHT * 0.3;

      if (fish.position.x > halfW) {
        fish.position.x = halfW;
        fish.velocity.x = -Math.abs(fish.velocity.x);
      } else if (fish.position.x < -halfW) {
        fish.position.x = -halfW;
        fish.velocity.x = Math.abs(fish.velocity.x);
      }

      if (fish.position.z > halfD) {
        fish.position.z = halfD;
        fish.velocity.z = -Math.abs(fish.velocity.z);
      } else if (fish.position.z < -halfD) {
        fish.position.z = -halfD;
        fish.velocity.z = Math.abs(fish.velocity.z);
      }

      if (fish.position.y > maxH) {
        fish.position.y = maxH;
        fish.velocity.y = -Math.abs(fish.velocity.y);
      } else if (fish.position.y < minH) {
        fish.position.y = minH;
        fish.velocity.y = Math.abs(fish.velocity.y);
      }
    }
  }

  getFishPositions(): THREE.Vector3[] {
    return this.fishes.map(f => f.position.clone());
  }

  getFishVelocity(index: number): THREE.Vector3 {
    return this.fishes[index].velocity.clone();
  }

  getFishStatus(fishIndex: number): FishStatus {
    const fish = this.fishes[fishIndex];
    return {
      detected: fish.detected,
      lastPingTime: fish.lastPingTime,
    };
  }

  setDetected(fishIndex: number, time: number): void {
    if (fishIndex >= 0 && fishIndex < this.fishes.length) {
      this.fishes[fishIndex].detected = true;
      this.fishes[fishIndex].lastPingTime = time;
    }
  }

  getFishCount(): number {
    return this.fishes.length;
  }
}
