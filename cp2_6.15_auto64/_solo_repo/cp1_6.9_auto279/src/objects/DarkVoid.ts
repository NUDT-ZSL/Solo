import Phaser from 'phaser';
import { CONFIG } from '../config/GameConfig';

export class DarkVoid {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private container: Phaser.GameObjects.Container;
  private body: Phaser.Physics.Arcade.Body;
  public worldX: number;
  public worldY: number;
  public hit: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.worldX = x;
    this.worldY = y;

    this.container = scene.add.container(x, y).setDepth(4);
    this.graphics = scene.add.graphics();
    this.render();
    this.container.add(this.graphics);

    scene.physics.add.existing(this.container);
    this.body = this.container.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(CONFIG.VOID.RADIUS * 0.85);
    this.body.setAllowGravity(false);
    this.body.immovable = true;
  }

  private render(): void {
    this.graphics.clear();
    const r = CONFIG.VOID.RADIUS;

    for (let i = 5; i >= 1; i--) {
      const gr = r * (1 + (5 - i) * 0.3);
      this.graphics.fillStyle(0x1a0033, 0.06 * i);
      this.graphics.fillCircle(0, 0, r + gr);
    }

    this.graphics.fillStyle(0x000000, 0.85);
    this.graphics.fillCircle(0, 0, r);

    this.graphics.fillStyle(0x220044, 0.4);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const dist = r * 0.6;
      this.graphics.fillCircle(Math.cos(angle) * dist, Math.sin(angle) * dist, r * 0.15);
    }

    this.graphics.lineStyle(2, 0x6600cc, 0.5);
    this.graphics.strokeCircle(0, 0, r * 0.9);
  }

  update(time: number, deltaScroll: number): void {
    this.worldX -= deltaScroll;
    this.container.setPosition(this.worldX, this.worldY);
    this.graphics.setRotation(time / 800);
  }

  getX(): number {
    return this.worldX;
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
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
