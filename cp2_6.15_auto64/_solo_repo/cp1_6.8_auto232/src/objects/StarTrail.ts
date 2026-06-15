import Phaser from 'phaser';
import { StarTrailConfig } from '../config';

export class StarTrail {
  private scene: Phaser.Scene;
  private config: StarTrailConfig;
  private graphics: Phaser.GameObjects.Graphics;
  private time: number = 0;
  private trailPoints: { x: number; y: number; alpha: number }[] = [];
  private flowOffset: number = 0;

  constructor(scene: Phaser.Scene, config: StarTrailConfig) {
    this.scene = scene;
    this.config = config;
    this.graphics = scene.add.graphics();

    for (let i = 0; i < this.config.pointCount; i++) {
      const angle = (i / this.config.pointCount) * Math.PI * 2;
      const pos = this.getEllipsePoint(angle);
      this.trailPoints.push({ x: pos.x, y: pos.y, alpha: 0 });
    }
  }

  private getEllipsePoint(angle: number): { x: number; y: number } {
    const cos = Math.cos(this.config.rotation);
    const sin = Math.sin(this.config.rotation);
    const ex = this.config.radiusX * Math.cos(angle);
    const ey = this.config.radiusY * Math.sin(angle);
    return {
      x: this.config.centerX + ex * cos - ey * sin,
      y: this.config.centerY + ex * sin + ey * cos,
    };
  }

  update(delta: number): void {
    this.time += delta;
    this.flowOffset += this.config.speed * delta;

    for (let i = 0; i < this.trailPoints.length; i++) {
      const baseAngle = (i / this.trailPoints.length) * Math.PI * 2;
      const angle = baseAngle + this.flowOffset;
      const pos = this.getEllipsePoint(angle);
      this.trailPoints[i].x = pos.x;
      this.trailPoints[i].y = pos.y;

      const flowPhase = (baseAngle + this.flowOffset * 3) % (Math.PI * 2);
      this.trailPoints[i].alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(flowPhase));
    }

    this.draw();
  }

  private draw(): void {
    this.graphics.clear();

    if (this.trailPoints.length < 2) return;

    const startColor = new Phaser.Display.Color.IntegerToColor(this.config.colorStart);
    const endColor = new Phaser.Display.Color.IntegerToColor(this.config.colorEnd);

    this.graphics.setBlendMode(Phaser.BlendModes.ADD);

    for (let pass = 0; pass < 3; pass++) {
      const lineWidth = pass === 0 ? 4 : pass === 1 ? 2 : 1;
      const alphaScale = pass === 0 ? 0.3 : pass === 1 ? 0.6 : 1.0;

      for (let i = 0; i < this.trailPoints.length; i++) {
        const next = (i + 1) % this.trailPoints.length;
        const p1 = this.trailPoints[i];
        const p2 = this.trailPoints[next];
        const t = i / this.trailPoints.length;

        const r = Math.floor(Phaser.Math.Linear(startColor.red, endColor.red, t));
        const g = Math.floor(Phaser.Math.Linear(startColor.green, endColor.green, t));
        const b = Math.floor(Phaser.Math.Linear(startColor.blue, endColor.blue, t));
        const alpha = p1.alpha * alphaScale;

        this.graphics.lineStyle(lineWidth, (r << 16) | (g << 8) | b, alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(p1.x, p1.y);
        this.graphics.lineTo(p2.x, p2.y);
        this.graphics.strokePath();
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
