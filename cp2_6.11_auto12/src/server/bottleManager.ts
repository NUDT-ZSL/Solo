import { v4 as uuidv4 } from 'uuid';
import type { Bottle, CreateBottleDto } from '../shared/types';

const MAX_BOTTLES = 200;
const MIN_SPEED = 0.3;
const MAX_SPEED = 0.8;

export class BottleManager {
  private bottles: Map<string, Bottle> = new Map();
  private canvasWidth: number = 1200;
  private canvasHeight: number = 800;

  setCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  createBottle(dto: CreateBottleDto): Bottle {
    const id = uuidv4();
    const angle = Math.random() * Math.PI * 2;
    const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    const x = this.canvasWidth * 0.2 + Math.random() * this.canvasWidth * 0.6;
    const y = this.canvasHeight * 0.2 + Math.random() * this.canvasHeight * 0.6;

    const bottle: Bottle = {
      id,
      lat: dto.lat,
      lng: dto.lng,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      collected: false,
      createdAt: Date.now(),
      collectedCount: 0,
      audioData: dto.audioData,
      audioDuration: dto.audioDuration,
      lastInteractionAt: Date.now(),
      trajectory: [{ x, y }]
    };

    this.bottles.set(id, bottle);
    this.cleanupOldBottles();
    return bottle;
  }

  getAllBottles(): Bottle[] {
    return Array.from(this.bottles.values());
  }

  getBottle(id: string): Bottle | undefined {
    return this.bottles.get(id);
  }

  collectBottle(id: string): Bottle | undefined {
    const bottle = this.bottles.get(id);
    if (bottle) {
      bottle.collected = true;
      bottle.collectedCount++;
      bottle.lastInteractionAt = Date.now();
    }
    return bottle;
  }

  releaseBottle(id: string): Bottle | undefined {
    const bottle = this.bottles.get(id);
    if (bottle) {
      bottle.collected = false;
      bottle.lastInteractionAt = Date.now();
      const angle = Math.random() * Math.PI * 2;
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      bottle.vx = Math.cos(angle) * speed;
      bottle.vy = Math.sin(angle) * speed;
    }
    return bottle;
  }

  touchBottle(id: string): void {
    const bottle = this.bottles.get(id);
    if (bottle) {
      bottle.lastInteractionAt = Date.now();
    }
  }

  updatePositions(currentFieldVectors: { x: number; y: number }[][], gridCols: number, gridRows: number) {
    for (const bottle of this.bottles.values()) {
      if (bottle.collected) continue;

      const gx = Math.floor((bottle.x / this.canvasWidth) * gridCols);
      const gy = Math.floor((bottle.y / this.canvasHeight) * gridRows);
      const clampedGx = Math.max(0, Math.min(gridCols - 1, gx));
      const clampedGy = Math.max(0, Math.min(gridRows - 1, gy));

      const fieldVec = currentFieldVectors[clampedGy][clampedGx];
      const fieldInfluence = 0.3;

      bottle.vx = bottle.vx * (1 - fieldInfluence) + fieldVec.x * fieldInfluence;
      bottle.vy = bottle.vy * (1 - fieldInfluence) + fieldVec.y * fieldInfluence;

      const currentSpeed = Math.sqrt(bottle.vx * bottle.vx + bottle.vy * bottle.vy);
      if (currentSpeed > 0) {
        bottle.vx = (bottle.vx / currentSpeed) * bottle.speed;
        bottle.vy = (bottle.vy / currentSpeed) * bottle.speed;
      }

      bottle.x += bottle.vx;
      bottle.y += bottle.vy;

      if (bottle.x <= 4 || bottle.x >= this.canvasWidth - 4) {
        bottle.vx *= -1;
        bottle.x = Math.max(4, Math.min(this.canvasWidth - 4, bottle.x));
      }
      if (bottle.y <= 4 || bottle.y >= this.canvasHeight - 4) {
        bottle.vy *= -1;
        bottle.y = Math.max(4, Math.min(this.canvasHeight - 4, bottle.y));
      }

      bottle.trajectory.push({ x: bottle.x, y: bottle.y });
      if (bottle.trajectory.length > 10) {
        bottle.trajectory.shift();
      }
    }
  }

  private cleanupOldBottles() {
    if (this.bottles.size > MAX_BOTTLES) {
      const sorted = Array.from(this.bottles.values()).sort(
        (a, b) => a.lastInteractionAt - b.lastInteractionAt
      );
      const toRemove = sorted.slice(0, this.bottles.size - MAX_BOTTLES);
      for (const b of toRemove) {
        this.bottles.delete(b.id);
      }
    }
  }
}
