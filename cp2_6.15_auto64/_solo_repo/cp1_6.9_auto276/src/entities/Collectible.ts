import Phaser from 'phaser';

export class Collectible extends Phaser.Physics.Arcade.Sprite {
  public isCollected: boolean = false;
  private readonly radius: number = 10;
  private rotationSpeed: number = 0.03;
  private graphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private currentRotation: number = 0;
  private startTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setCircle(this.radius + 2);
    this.body.reset(x, y);
    (this.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.glowGraphics = scene.add.graphics();
    this.graphics = scene.add.graphics();
    this.drawCollectible();
  }

  private drawCollectible(): void {
    this.graphics.clear();
    this.glowGraphics.clear();

    this.glowGraphics.save();
    this.glowGraphics.setAlpha(0.5);
    for (let i = 3; i >= 0; i--) {
      const r = this.radius + 4 + i * 3;
      const alpha = 0.15 + (3 - i) * 0.1;
      this.glowGraphics.fillStyle(0x88ddff, alpha);
      this.glowGraphics.fillCircle(0, 0, r);
    }
    this.glowGraphics.restore();

    this.graphics.save();
    this.graphics.rotate(this.currentRotation);

    this.graphics.fillGradientStyle(0xaaffff, 0x66bbff, 0x4499dd, 0x2277aa, 1, 1, 1, 1);
    this.graphics.fillCircle(0, 0, this.radius);

    this.graphics.fillStyle(0xffffff, 0.6);
    this.graphics.fillCircle(-3, -3, this.radius * 0.35);

    this.graphics.fillStyle(0xffffff, 0.3);
    this.graphics.fillCircle(2, 2, this.radius * 0.2);

    this.graphics.lineStyle(1.5, 0xaaffff, 0.8);
    this.graphics.strokeCircle(0, 0, this.radius);

    this.graphics.restore();
  }

  update(time: number): void {
    if (this.startTime === 0) {
      this.startTime = time;
    }

    this.currentRotation += this.rotationSpeed;

    const bobPhase = Math.sin((time - this.startTime) / 400);
    const bobY = this.y + bobPhase * 3;

    this.graphics.setPosition(this.x, bobY);
    this.glowGraphics.setPosition(this.x, bobY);

    if (Math.abs(bobPhase) < 0.01 || this.startTime === 0) {
      this.drawCollectible();
      if (this.startTime === 0) this.startTime = time;
    }

    if (this.body) {
      this.body.y = bobY - this.radius - 2;
      (this.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }
  }

  collect(onComplete?: () => void): void {
    if (this.isCollected) return;
    this.isCollected = true;

    const startScale = 1;
    const endScale = 5;
    const duration = 400;
    const startTime = this.scene.time.now;

    const ringGraphics = this.scene.add.graphics();
    ringGraphics.setPosition(this.x, this.y);

    const animate = () => {
      const elapsed = this.scene.time.now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);
      const currentScale = startScale + (endScale - startScale) * eased;
      const currentAlpha = 1 - progress;

      ringGraphics.clear();
      ringGraphics.lineStyle(2, 0x88ddff, currentAlpha);
      ringGraphics.strokeCircle(0, 0, this.radius * currentScale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ringGraphics.destroy();
        if (onComplete) onComplete();
      }
    };

    animate();

    this.graphics.setAlpha(0);
    this.glowGraphics.setAlpha(0);
    this.setActive(false).setVisible(false);
    if (this.body) {
      this.body.enable = false;
    }
  }

  resetCollectible(): void {
    this.isCollected = false;
    this.setActive(true).setVisible(true);
    this.graphics.setAlpha(1);
    this.glowGraphics.setAlpha(1);
    if (this.body) {
      this.body.enable = true;
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
    super.destroy();
  }
}
