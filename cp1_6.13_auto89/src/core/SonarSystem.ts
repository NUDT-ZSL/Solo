import * as THREE from 'three';
import { FishManager } from './FishManager';

const PULSE_INTERVAL = 2;
const PULSE_MAX_RADIUS = 400;
const PULSE_DURATION = 2;
const CONE_ANGLE = Math.PI / 4;
const FISH_ECHO_RADIUS = 30;
const FISH_ECHO_DURATION = 1;
const FISH_FLASH_DURATION = 0.5;

export interface EchoEvent {
  fishIndex: number;
  position: THREE.Vector3;
  startTime: number;
}

export class SonarSystem {
  private fishManager: FishManager;
  private pulseStartTime: number = -PULSE_INTERVAL;
  private currentTime: number = 0;
  private detectionEvents: number[] = [];
  private echoEvents: EchoEvent[] = [];
  private emitterPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(fishManager: FishManager) {
    this.fishManager = fishManager;
  }

  update(deltaTime: number): void {
    this.currentTime += deltaTime;

    if (this.currentTime - this.pulseStartTime >= PULSE_INTERVAL) {
      this.pulseStartTime = this.currentTime;
      this.detectionEvents = [];
    }

    const pulseRadius = this.getPulseRadius();
    if (pulseRadius > 0 && pulseRadius < PULSE_MAX_RADIUS) {
      this.checkCollisions(pulseRadius);
    }

    this.echoEvents = this.echoEvents.filter(
      e => this.currentTime - e.startTime < FISH_ECHO_DURATION
    );
  }

  private checkCollisions(pulseRadius: number): void {
    const positions = this.fishManager.getFishPositions();

    for (let i = 0; i < positions.length; i++) {
      const fishPos = positions[i];
      const distance = fishPos.distanceTo(this.emitterPosition);

      if (distance <= pulseRadius && distance > pulseRadius - 20) {
        const direction = fishPos.clone().sub(this.emitterPosition).normalize();
        const coneAxis = new THREE.Vector3(0, 0, -1);
        const angle = direction.angleTo(coneAxis);

        if (angle <= CONE_ANGLE) {
          if (!this.detectionEvents.includes(i)) {
            this.detectionEvents.push(i);
            this.fishManager.setDetected(i, this.currentTime);
            this.echoEvents.push({
              fishIndex: i,
              position: fishPos.clone(),
              startTime: this.currentTime,
            });
          }
        }
      }
    }
  }

  getPulseRadius(): number {
    const elapsed = this.currentTime - this.pulseStartTime;
    if (elapsed < 0 || elapsed >= PULSE_DURATION) {
      return 0;
    }
    return (elapsed / PULSE_DURATION) * PULSE_MAX_RADIUS;
  }

  getPulseOpacity(): number {
    const elapsed = this.currentTime - this.pulseStartTime;
    if (elapsed < 0 || elapsed >= PULSE_DURATION) {
      return 0;
    }
    return 0.6 * (1 - elapsed / PULSE_DURATION);
  }

  getDetectionEvents(): number[] {
    return [...this.detectionEvents];
  }

  getEchoEvents(): EchoEvent[] {
    return [...this.echoEvents];
  }

  getEchoProgress(fishIndex: number): number {
    const echo = this.echoEvents.find(e => e.fishIndex === fishIndex);
    if (!echo) return 0;
    const elapsed = this.currentTime - echo.startTime;
    return Math.min(1, elapsed / FISH_ECHO_DURATION);
  }

  isFishFlashing(fishIndex: number): boolean {
    const status = this.fishManager.getFishStatus(fishIndex);
    if (status.lastPingTime < 0) return false;
    return this.currentTime - status.lastPingTime < FISH_FLASH_DURATION;
  }

  getEmitterPosition(): THREE.Vector3 {
    return this.emitterPosition.clone();
  }

  getConeAngle(): number {
    return CONE_ANGLE;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }
}
