import { v4 as uuidv4 } from 'uuid';
import type { Bottle, CreateBottleDto } from '../shared/types';

const MAX_BOTTLES = 200;
const MIN_SPEED = 0.3;
const MAX_SPEED = 0.8;
const GRID_COLS = 8;
const GRID_ROWS = 6;
const INTERACTION_DECAY_MS = 30000;

interface InteractionPoint {
  x: number;
  y: number;
  intensity: number;
  timestamp: number;
  direction: { x: number; y: number };
}

export class BottleManager {
  private bottles: Map<string, Bottle> = new Map();
  private interactions: InteractionPoint[] = [];
  private canvasWidth: number = 1200;
  private canvasHeight: number = 800;
  private baseVectors: { x: number; y: number }[][] = [];

  constructor() {
    this.initBaseVectors();
  }

  private initBaseVectors() {
    this.baseVectors = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: { x: number; y: number }[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const angle = (c / GRID_COLS) * Math.PI * 2 + (r / GRID_ROWS) * Math.PI;
        row.push({
          x: Math.cos(angle) * 0.4,
          y: Math.sin(angle) * 0.4
        });
      }
      this.baseVectors.push(row);
    }
  }

  setCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  getGridSize() {
    return { cols: GRID_COLS, rows: GRID_ROWS };
  }

  addInteraction(x: number, y: number, intensity: number = 1, direction?: { x: number; y: number }) {
    const dir = direction || {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    };
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    this.interactions.push({
      x,
      y,
      intensity,
      timestamp: Date.now(),
      direction: { x: dir.x / len, y: dir.y / len }
    });
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
    this.addInteraction(x, y, 0.5, { x: bottle.vx, y: bottle.vy });
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
      this.addInteraction(bottle.x, bottle.y, 2, { x: 0, y: -1 });
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
      bottle.speed = speed;
      this.addInteraction(bottle.x, bottle.y, 1.5, { x: bottle.vx, y: bottle.vy });
    }
    return bottle;
  }

  touchBottle(id: string): void {
    const bottle = this.bottles.get(id);
    if (bottle) {
      bottle.lastInteractionAt = Date.now();
      this.addInteraction(bottle.x, bottle.y, 0.8, { x: bottle.vx, y: bottle.vy });
    }
  }

  computeFieldVectors(): { x: number; y: number }[][] {
    const now = Date.now();
    this.interactions = this.interactions.filter(
      (i) => now - i.timestamp < INTERACTION_DECAY_MS
    );

    const field: { x: number; y: number }[][] = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      const row: { x: number; y: number }[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const gx = (c + 0.5) * (this.canvasWidth / GRID_COLS);
        const gy = (r + 0.5) * (this.canvasHeight / GRID_ROWS);

        let vx = this.baseVectors[r][c].x;
        let vy = this.baseVectors[r][c].y;
        let totalInfluence = 1;

        for (const inter of this.interactions) {
          const dx = inter.x - gx;
          const dy = inter.y - gy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.max(this.canvasWidth, this.canvasHeight) * 0.4;
          if (dist > maxDist) continue;

          const decay = 1 - (now - inter.timestamp) / INTERACTION_DECAY_MS;
          const influence = (1 - dist / maxDist) * decay * inter.intensity;

          vx += inter.direction.x * influence * 0.6;
          vy += inter.direction.y * influence * 0.6;
          totalInfluence += influence;
        }

        vx /= totalInfluence;
        vy /= totalInfluence;

        const len = Math.sqrt(vx * vx + vy * vy);
        if (len > 0) {
          vx = (vx / len) * 0.8;
          vy = (vy / len) * 0.8;
        }

        row.push({ x: vx, y: vy });
      }
      field.push(row);
    }

    return field;
  }

  updatePositions() {
    const fieldVectors = this.computeFieldVectors();
    const gridCols = GRID_COLS;
    const gridRows = GRID_ROWS;

    for (const bottle of this.bottles.values()) {
      if (bottle.collected) continue;

      const gx = Math.floor((bottle.x / this.canvasWidth) * gridCols);
      const gy = Math.floor((bottle.y / this.canvasHeight) * gridRows);
      const clampedGx = Math.max(0, Math.min(gridCols - 2, gx));
      const clampedGy = Math.max(0, Math.min(gridRows - 2, gy));

      const fx = (bottle.x / this.canvasWidth) * gridCols - clampedGx;
      const fy = (bottle.y / this.canvasHeight) * gridRows - clampedGy;

      const v00 = fieldVectors[clampedGy][clampedGx];
      const v10 = fieldVectors[clampedGy][clampedGx + 1];
      const v01 = fieldVectors[clampedGy + 1][clampedGx];
      const v11 = fieldVectors[clampedGy + 1][clampedGx + 1];

      const topX = v00.x * (1 - fx) + v10.x * fx;
      const topY = v00.y * (1 - fx) + v10.y * fx;
      const botX = v01.x * (1 - fx) + v11.x * fx;
      const botY = v01.y * (1 - fx) + v11.y * fx;

      const fieldVecX = topX * (1 - fy) + botX * fy;
      const fieldVecY = topY * (1 - fy) + botY * fy;

      const fieldInfluence = 0.4;

      bottle.vx = bottle.vx * (1 - fieldInfluence) + fieldVecX * bottle.speed * 2 * fieldInfluence;
      bottle.vy = bottle.vy * (1 - fieldInfluence) + fieldVecY * bottle.speed * 2 * fieldInfluence;

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
    if (this.bottles.size <= MAX_BOTTLES) return;

    const sorted = Array.from(this.bottles.values()).sort(
      (a, b) => a.lastInteractionAt - b.lastInteractionAt
    );
    const toRemove = sorted.slice(0, this.bottles.size - MAX_BOTTLES);
    for (const b of toRemove) {
      this.bottles.delete(b.id);
    }
  }
}
