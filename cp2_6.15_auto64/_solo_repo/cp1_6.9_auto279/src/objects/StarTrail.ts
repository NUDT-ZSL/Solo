import Phaser from 'phaser';
import { CONFIG } from '../config/GameConfig';

export interface TrailNodeData {
  x: number;
  y: number;
  baseY: number;
}

export class StarTrail {
  private scene: Phaser.Scene;
  private nodes: TrailNodeData[] = [];
  private nodeGraphics: Phaser.GameObjects.Graphics[] = [];
  private segmentGraphics: Phaser.GameObjects.Graphics;
  private amplitude: number;
  private wavelength: number;
  private phase: number = 0;
  private centerY: number;

  constructor(scene: Phaser.Scene, startX: number, centerY: number) {
    this.scene = scene;
    this.centerY = centerY;
    this.amplitude = Phaser.Math.FloatBetween(
      CONFIG.STAR_TRAIL.MIN_AMPLITUDE,
      CONFIG.STAR_TRAIL.MAX_AMPLITUDE
    );
    this.wavelength = Phaser.Math.FloatBetween(
      CONFIG.STAR_TRAIL.MIN_WAVELENGTH,
      CONFIG.STAR_TRAIL.MAX_WAVELENGTH
    );
    this.segmentGraphics = scene.add.graphics().setDepth(2);
    this.generateInitialNodes(startX);
  }

  private generateInitialNodes(startX: number): void {
    const screenWidth = this.scene.scale.width;
    const totalWidth = screenWidth + 400;

    for (let x = startX; x < startX + totalWidth; x += CONFIG.STAR_TRAIL.NODE_SPACING) {
      this.addNodeAt(x);
    }
  }

  private addNodeAt(worldX: number): void {
    const y = this.centerY + Math.sin(worldX / this.wavelength + this.phase) * this.amplitude;
    this.nodes.push({
      x: worldX,
      y: y,
      baseY: y
    });
  }

  getNodeWorldX(localX: number): { x: number; y: number } {
    if (this.nodes.length < 2) {
      return { x: localX, y: this.centerY };
    }

    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      if (localX >= a.x && localX <= b.x) {
        const t = (localX - a.x) / (b.x - a.x);
        return {
          x: Phaser.Math.Linear(a.x, b.x, t),
          y: Phaser.Math.Linear(a.y, b.y, t)
        };
      }
    }

    const last = this.nodes[this.nodes.length - 1];
    return { x: last.x, y: last.y };
  }

  getTangentAngle(localX: number): number {
    const epsilon = 1;
    const p1 = this.getNodeWorldX(localX - epsilon);
    const p2 = this.getNodeWorldX(localX + epsilon);
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  update(deltaScroll: number, time: number): void {
    this.phase += deltaScroll / this.wavelength;

    for (const node of this.nodes) {
      node.x -= deltaScroll;
    }

    while (this.nodes.length > 0 && this.nodes[0].x < -100) {
      this.nodes.shift();
    }

    if (this.nodes.length > 0) {
      const screenRight = this.scene.scale.width + 200;
      while (this.nodes[this.nodes.length - 1].x < screenRight) {
        const last = this.nodes[this.nodes.length - 1];
        const newX = last.x + CONFIG.STAR_TRAIL.NODE_SPACING;
        const sinVal = Math.sin(newX / this.wavelength + this.phase) * this.amplitude;
        this.nodes.push({
          x: newX,
          y: this.centerY + sinVal,
          baseY: this.centerY + sinVal
        });
      }
    }

    this.render(time);
  }

  private render(time: number): void {
    this.segmentGraphics.clear();
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      const alpha = Phaser.Math.Clamp(
        0.8 - Math.abs(a.x - this.scene.scale.width / 2) / this.scene.scale.width,
        0.1,
        0.8
      );

      for (let s = 0; s < CONFIG.STAR_TRAIL.SEGMENT_COUNT; s++) {
        const trailAlpha = alpha * (1 - s / CONFIG.STAR_TRAIL.SEGMENT_COUNT);
        this.segmentGraphics.lineStyle(
          CONFIG.STAR_TRAIL.NODE_RADIUS / 2 - s,
          0x00ffff,
          trailAlpha * 0.4
        );
        this.segmentGraphics.beginPath();
        this.segmentGraphics.moveTo(a.x, a.y);
        this.segmentGraphics.lineTo(b.x, b.y);
        this.segmentGraphics.strokePath();
      }
    }

    const graphicsCount = Math.min(this.nodeGraphics.length, this.nodes.length);
    for (let i = 0; i < graphicsCount; i++) {
      const node = this.nodes[i];
      const pulse = 0.5 + 0.5 * Math.sin(time / CONFIG.STAR_TRAIL.PULSE_PERIOD * Math.PI * 2);
      const g = this.nodeGraphics[i];
      g.clear();
      g.setPosition(node.x, node.y);
      const radius = CONFIG.STAR_TRAIL.NODE_RADIUS * (0.85 + pulse * 0.15);

      for (let r = 3; r >= 1; r--) {
        g.fillStyle(0x00ffff, 0.15 * r / 3);
        g.fillCircle(0, 0, radius * (r / 3) * 2);
      }
      g.fillStyle(0xffffff, 0.6 + pulse * 0.4);
      g.fillCircle(0, 0, radius * 0.5);
    }

    for (let i = this.nodeGraphics.length; i < this.nodes.length; i++) {
      const g = this.scene.add.graphics().setDepth(3);
      this.nodeGraphics.push(g);
    }
    while (this.nodeGraphics.length > this.nodes.length + 10) {
      const extra = this.nodeGraphics.pop();
      if (extra) extra.destroy();
    }
  }

  updateCenterY(newY: number): void {
    const diff = newY - this.centerY;
    this.centerY = newY;
    for (const node of this.nodes) {
      node.baseY += diff;
      node.y = node.baseY;
    }
  }

  destroy(): void {
    this.segmentGraphics.destroy();
    this.nodeGraphics.forEach(g => g.destroy());
    this.nodeGraphics = [];
    this.nodes = [];
  }
}
