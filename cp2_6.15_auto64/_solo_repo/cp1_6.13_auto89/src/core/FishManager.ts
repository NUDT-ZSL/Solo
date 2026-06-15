import * as THREE from 'three';

export interface FishStatus {
  detected: boolean;
  lastPingTime: number;
}

interface Fish {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetSpeed: number;
  detected: boolean;
  lastPingTime: number;
}

const FISH_COUNT = 20;
const SCENE_WIDTH = 800;
const SCENE_DEPTH = 800;
const SCENE_HEIGHT = 400;
const MAX_SPEED = 3;
const MIN_SPEED = 0;

const halfW = SCENE_WIDTH * 0.4;
const halfD = SCENE_DEPTH * 0.4;
const minH = -SCENE_HEIGHT * 0.35;
const maxH = SCENE_HEIGHT * 0.25;

export class FishManager {
  private fishes: Fish[] = [];
  private currentTime: number = 0;

  constructor() {
    this.initializeFishes();
  }

  private initializeFishes(): void {
    for (let i = 0; i < FISH_COUNT; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * SCENE_WIDTH * 0.7,
        minH + Math.random() * (maxH - minH),
        (Math.random() - 0.5) * SCENE_DEPTH * 0.7
      );

      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        (Math.random() - 0.5) * 0.3,
        Math.random() - 0.5
      ).normalize();

      const velocity = dir.multiplyScalar(speed);

      this.fishes.push({
        position,
        velocity,
        targetSpeed: speed,
        detected: false,
        lastPingTime: -1,
      });
    }
  }

  update(deltaTime: number): void {
    this.currentTime += deltaTime;

    for (const fish of this.fishes) {
      if (Math.random() < 0.01) {
        fish.targetSpeed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      }

      fish.velocity.x += (Math.random() - 0.5) * 1.5 * deltaTime;
      fish.velocity.y += (Math.random() - 0.5) * 0.6 * deltaTime;
      fish.velocity.z += (Math.random() - 0.5) * 1.5 * deltaTime;

      const toCenter = new THREE.Vector3(0, (minH + maxH) / 2, 0).sub(fish.position);
      const distFromCenter = toCenter.length();
      if (distFromCenter > 250) {
        toCenter.normalize().multiplyScalar(2.0 * deltaTime);
        fish.velocity.add(toCenter);
      }

      if (fish.position.x > halfW * 0.85) {
        fish.velocity.x -= 3.0 * deltaTime;
      } else if (fish.position.x < -halfW * 0.85) {
        fish.velocity.x += 3.0 * deltaTime;
      }

      if (fish.position.z > halfD * 0.85) {
        fish.velocity.z -= 3.0 * deltaTime;
      } else if (fish.position.z < -halfD * 0.85) {
        fish.velocity.z += 3.0 * deltaTime;
      }

      if (fish.position.y > maxH * 0.85) {
        fish.velocity.y -= 2.0 * deltaTime;
      } else if (fish.position.y < minH * 0.85 + (maxH - minH) * 0.15) {
        fish.velocity.y += 2.0 * deltaTime;
      }

      const currentSpeed = fish.velocity.length();
      if (currentSpeed > 0.001) {
        const speedDiff = fish.targetSpeed - currentSpeed;
        const speedAdjust = Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), 1.5 * deltaTime);
        fish.velocity.multiplyScalar((currentSpeed + speedAdjust) / currentSpeed);
      }

      const clampedSpeed = fish.velocity.length();
      if (clampedSpeed > MAX_SPEED) {
        fish.velocity.multiplyScalar(MAX_SPEED / clampedSpeed);
      } else if (clampedSpeed < MIN_SPEED && clampedSpeed > 0) {
        fish.velocity.multiplyScalar(MIN_SPEED / clampedSpeed);
      } else if (clampedSpeed === 0) {
        fish.velocity.set(
          (Math.random() - 0.5) * MAX_SPEED,
          (Math.random() - 0.5) * MAX_SPEED * 0.3,
          (Math.random() - 0.5) * MAX_SPEED
        );
      }

      fish.position.add(fish.velocity.clone().multiplyScalar(deltaTime));

      if (fish.position.x > halfW) {
        fish.position.x = halfW;
        fish.velocity.x = -Math.abs(fish.velocity.x) * 0.8;
      } else if (fish.position.x < -halfW) {
        fish.position.x = -halfW;
        fish.velocity.x = Math.abs(fish.velocity.x) * 0.8;
      }

      if (fish.position.z > halfD) {
        fish.position.z = halfD;
        fish.velocity.z = -Math.abs(fish.velocity.z) * 0.8;
      } else if (fish.position.z < -halfD) {
        fish.position.z = -halfD;
        fish.velocity.z = Math.abs(fish.velocity.z) * 0.8;
      }

      if (fish.position.y > maxH) {
        fish.position.y = maxH;
        fish.velocity.y = -Math.abs(fish.velocity.y) * 0.8;
      } else if (fish.position.y < minH) {
        fish.position.y = minH;
        fish.velocity.y = Math.abs(fish.velocity.y) * 0.8;
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

  getCurrentTime(): number {
    return this.currentTime;
  }
}
