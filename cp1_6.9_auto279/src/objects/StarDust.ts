import Phaser from 'phaser';
import { CONFIG } from '../config/GameConfig';

export class StarDust {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private container: Phaser.GameObjects.Container;
  private body: Phaser.Physics.Arcade.Body;
  public worldX: number;
  public worldY: number;
  public collected: boolean = false;
  public compensation: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, compensation: boolean = false) {
    this.scene = scene;
    this.worldX = x;
    this.worldY = y;
    this.compensation = compensation;

    this.container = scene.add.container(x, y).setDepth(5);
    this.graphics = scene.add.graphics();
    this.render();
    this.container.add(this.graphics);

    scene.physics.add.existing(this.container);
    this.body = this.container.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(CONFIG.STAR.RADIUS);
    this.body.setAllowGravity(false);
    this.body.immovable = true;
  }

  private render(): void {
    this.graphics.clear();
    const r = CONFIG.STAR.RADIUS;
    const baseColor = this.compensation ? 0xffd700 : 0xffd700;

    for (let i = 4; i >= 1; i--) {
      const pr = r * (i / 4);
      this.graphics.fillStyle(0xffffaa, 0.15 * i);
      this.graphics.fillCircle(0, 0, pr);
    }

    this.graphics.fillStyle(baseColor, 0.9);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const outerX = Math.cos(angle) * r * 0.9;
      const outerY = Math.sin(angle) * r * 0.9;
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * r * 0.4;
      const innerY = Math.sin(innerAngle) * r * 0.4;
      this.graphics.beginPath();
      if (i === 0) this.graphics.moveTo(outerX, outerY);
      this.graphics.lineTo(innerX, innerY);
      const nextAngle = ((i + 1) / 5) * Math.PI * 2 - Math.PI / 2;
      const nextOuterX = Math.cos(nextAngle) * r * 0.9;
      const nextOuterY = Math.sin(nextAngle) * r * 0.9;
      this.graphics.lineTo(nextOuterX, nextOuterY);
      this.graphics.closePath();
      this.graphics.fillPath();
    }

    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(0, 0, r * 0.25);
  }

  update(time: number, deltaScroll: number): void {
    this.worldX -= deltaScroll;
    this.container.setPosition(this.worldX, this.worldY);

    const bob = Math.sin(time / 200 + this.worldX / 50) * 4;
    this.graphics.setY(bob);
    this.graphics.setRotation(time / 500);

    const pulse = 1 + Math.sin(time / 150) * 0.15;
    this.graphics.setScale(pulse);
  }

  getX(): number {
    return this.worldX;
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getScoreValue(): number {
    return this.compensation ? CONFIG.STAR.COMPENSATION_SCORE : CONFIG.STAR.BASE_SCORE;
  }

  destroy(): void {
    this.body.destroy();
    this.graphics.destroy();
    this.container.destroy();
  }

  isOffScreen(): boolean {
    return this.worldX < -100;
  }
}
