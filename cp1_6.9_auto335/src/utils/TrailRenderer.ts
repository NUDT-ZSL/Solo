import Phaser from 'phaser';
import { TrailPoint } from '../types/GameTypes';

export class TrailRenderer {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private trail: TrailPoint[] = [];
  private maxTrailLength: number = 50;
  private trailDuration: number = 2000;
  private active: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(4);
  }

  start(): void {
    this.active = true;
    this.trail = [];
  }

  stop(): void {
    this.active = false;
    this.clear();
  }

  addPoint(x: number, y: number): void {
    if (!this.active) return;
    this.trail.push({ x, y, time: this.scene.time.now });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  update(): void {
    this.graphics.clear();
    if (!this.active) return;

    const now = this.scene.time.now;
    this.trail = this.trail.filter(p => now - p.time < this.trailDuration);

    if (this.trail.length < 2) return;

    this.graphics.lineStyle(2, 0x80deea, 0.2);
    this.graphics.beginPath();

    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const age = (now - point.time) / this.trailDuration;
      const alpha = 0.2 * (1 - age);
      const width = 2 * (1 - age);

      if (i === 0) {
        this.graphics.moveTo(point.x, point.y);
      } else {
        const prev = this.trail[i - 1];
        this.graphics.lineStyle(width, 0x80deea, alpha);
        this.graphics.lineBetween(prev.x, prev.y, point.x, point.y);
      }
    }
  }

  clear(): void {
    this.graphics.clear();
    this.trail = [];
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
