import Phaser from 'phaser';
import { CONFIG } from '../config/GameConfig';

export class PlayerShip {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private shipBody: Phaser.GameObjects.Graphics;
  private haloGraphics: Phaser.GameObjects.Graphics;
  private worldX: number = 0;
  private worldY: number = 0;
  private targetOffsetX: number = 0;
  private trailAngle: number = 0;
  private comboLevel: number = 0;
  private isSlowed: boolean = false;
  private slowTimer: number = 0;
  private warningGraphics: Phaser.GameObjects.Text | null = null;
  private haloTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.worldX = x;
    this.worldY = y;
    this.slowTimer = 0;

    this.container = scene.add.container(x, y).setDepth(20);

    this.shipBody = scene.add.graphics();
    this.haloGraphics = scene.add.graphics();
    this.renderShip();
    this.renderHalo();

    this.container.add([this.haloGraphics, this.shipBody]);
  }

  private renderShip(): void {
    const w = CONFIG.PLAYER.BASE_WIDTH;
    const h = CONFIG.PLAYER.BASE_HEIGHT;

    this.shipBody.clear();

    this.shipBody.fillGradientStyle(0x00ffff, 0x0088ff, 0x00ffff, 0x0088ff, 0.8, 0.6, 0.8, 0.6);
    this.shipBody.beginPath();
    this.shipBody.moveTo(w / 2, 0);
    this.shipBody.lineTo(-w / 2, -h / 2);
    this.shipBody.lineTo(-w / 3, 0);
    this.shipBody.lineTo(-w / 2, h / 2);
    this.shipBody.closePath();
    this.shipBody.fillPath();

    this.shipBody.lineStyle(2, 0xffffff, 0.9);
    this.shipBody.strokePath();

    this.shipBody.fillStyle(0xffffff, 0.9);
    this.shipBody.fillCircle(w / 6, 0, 4);

    this.shipBody.fillStyle(0x88ffff, 0.6);
    this.shipBody.fillCircle(w / 6, 0, 2);

    this.shipBody.fillStyle(0xffff00, 0.8);
    for (let i = 0; i < 3; i++) {
      const px = -w / 2 - 8 - i * 4;
      const size = 5 - i;
      this.shipBody.fillCircle(px, -h / 6 * (i - 1), size);
    }
  }

  private renderHalo(): void {
    this.haloGraphics.clear();
    if (this.comboLevel < CONFIG.PLAYER.HALO_MIN_LEVEL) return;

    const maxLevel = (CONFIG.COMBO.MAX_MULTIPLIER - CONFIG.COMBO.BASE_MULTIPLIER) / CONFIG.COMBO.INCREASE_PER_LEVEL;
    const progress = Math.min(this.comboLevel, maxLevel) / maxLevel;

    const baseR = CONFIG.PLAYER.BASE_WIDTH * 0.9;
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(0, 255, 255),
      new Phaser.Display.Color(255, 215, 0),
      255,
      progress
    );

    this.haloGraphics.lineStyle(3, Phaser.Display.Color.GetColor(color.r, color.g, color.b), 0.7);
    this.haloGraphics.beginPath();
    this.haloGraphics.arc(0, 0, baseR, 0, Math.PI * 2);
    this.haloGraphics.strokePath();

    this.haloGraphics.lineStyle(1, Phaser.Display.Color.GetColor(color.r, color.g, color.b), 0.3);
    this.haloGraphics.beginPath();
    this.haloGraphics.arc(0, 0, baseR + 5, 0, Math.PI * 2);
    this.haloGraphics.strokePath();
  }

  setPosition(x: number, y: number): void {
    this.worldX = x;
    this.worldY = y;
    this.container.setPosition(x, y);
  }

  setAngle(angle: number): void {
    this.trailAngle = angle;
    this.container.setRotation(angle);
  }

  getX(): number {
    return this.worldX;
  }

  getY(): number {
    return this.worldY;
  }

  getCollisionRadius(): number {
    return CONFIG.PLAYER.BASE_WIDTH * 0.4;
  }

  setTargetOffset(offsetX: number): void {
    const maxOffset = this.scene.scale.width * CONFIG.PLAYER.OFFSET_RATIO;
    this.targetOffsetX = Phaser.Math.Clamp(offsetX, -maxOffset, maxOffset);
  }

  getTargetOffset(): number {
    return this.targetOffsetX;
  }

  update(time: number, delta: number, trailY: number): void {
    if (this.isSlowed) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.isSlowed = false;
      }
    }

    const finalY = trailY + this.targetOffsetX;
    const speedFactor = 0.12;
    const newY = Phaser.Math.Linear(this.worldY, finalY, speedFactor);

    const dy = finalY - this.worldY;
    const rollAngle = Phaser.Math.Clamp(dy / 200, -0.3, 0.3);
    this.container.setRotation(this.trailAngle + rollAngle);

    this.worldY = newY;
    this.container.setY(newY);

    const bob = Math.sin(time / 300) * 1.5;
    this.shipBody.setY(bob);

    const throb = 1 + Math.sin(time / 200) * 0.05;
    this.shipBody.setScale(throb);
  }

  setComboLevel(level: number): void {
    if (level !== this.comboLevel) {
      this.comboLevel = level;
      this.renderHalo();

      if (level >= CONFIG.PLAYER.HALO_MIN_LEVEL) {
        this.haloTween?.stop();
        this.haloTween = this.scene.tweens.add({
          targets: this.haloGraphics,
          alpha: { from: 1.5, to: 1 },
          scale: { from: 1.3, to: 1 },
          duration: 400,
          ease: 'Back.easeOut'
        });
      }
    }
  }

  applySlow(): void {
    this.isSlowed = true;
    this.slowTimer = CONFIG.SPEED.SLOW_DURATION;
    this.container.setAlpha(0.7);
    this.scene.time.delayedCall(CONFIG.SPEED.SLOW_DURATION, () => {
      this.container.setAlpha(1);
    });
  }

  isCurrentlySlowed(): boolean {
    return this.isSlowed;
  }

  getSlowMultiplier(): number {
    return this.isSlowed ? CONFIG.SPEED.SLOW_MULTIPLIER : 1;
  }

  showWarning(): void {
    if (!this.warningGraphics) {
      this.warningGraphics = this.scene.add.text(
        this.worldX,
        this.worldY - 50,
        '⚠ 偏离航道!',
        {
          fontSize: '20px',
          color: '#ff4444',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3
        }
      ).setOrigin(0.5).setDepth(100).setScrollFactor(0);
    }
    this.warningGraphics.setVisible(true);
    this.scene.tweens.add({
      targets: this.warningGraphics,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.2, to: 1 },
      duration: 500,
      repeat: 2,
      onComplete: () => {
        this.warningGraphics?.setVisible(false);
      }
    });
  }

  forceReturn(trailY: number): void {
    this.scene.tweens.add({
      targets: this,
      targetOffsetX: 0,
      worldY: trailY,
      duration: 300,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        this.container.setY(this.worldY);
      }
    });
  }

  destroy(): void {
    this.shipBody.destroy();
    this.haloGraphics.destroy();
    this.warningGraphics?.destroy();
    this.container.destroy();
  }
}
