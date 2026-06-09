import Phaser from 'phaser';

export class Platform extends Phaser.Physics.Arcade.Sprite {
  private baseY: number;
  private amplitude: number;
  private period: number;
  private phase: number;
  private startTime: number = 0;
  private graphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private colorValue: number;
  private platformWidth: number;
  private platformHeight: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 80,
    height: number = 16,
    color: number = 0x88ccff,
    floatAmplitude: number = 30,
    floatPeriod: number = 2,
    phase: number = 0
  ) {
    super(scene, x, y, '');
    this.platformWidth = width;
    this.platformHeight = height;
    this.colorValue = color;
    this.baseY = y;
    this.amplitude = floatAmplitude;
    this.period = floatPeriod;
    this.phase = phase;

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setBodySize(width, height);
    this.body.reset(x, y);
    (this.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.glowGraphics = scene.add.graphics();
    this.graphics = scene.add.graphics();
    this.drawPlatform();
  }

  private drawPlatform(): void {
    this.graphics.clear();
    this.glowGraphics.clear();

    const halfW = this.platformWidth / 2;
    const halfH = this.platformHeight / 2;
    const radius = 4;

    this.glowGraphics.lineStyle(2, 0xaaddff, 0.3);
    this.glowGraphics.strokeRoundedRect(-halfW, -halfH, this.platformWidth, this.platformHeight, radius);

    this.graphics.fillStyle(this.colorValue, 0.9);
    this.graphics.fillRoundedRect(-halfW, -halfH, this.platformWidth, this.platformHeight, radius);

    const gradientTop = Phaser.Display.Color.IntegerToColor(this.colorValue);
    gradientTop.lighten(20);
    this.graphics.fillStyle(gradientTop.color, 0.4);
    this.graphics.fillRoundedRect(-halfW + 2, -halfH + 1, this.platformWidth - 4, this.platformHeight / 3, radius - 1);

    this.graphics.lineStyle(1, 0xaaddff, 0.3);
    this.graphics.strokeRoundedRect(-halfW, -halfH, this.platformWidth, this.platformHeight, radius);
  }

  update(time: number): void {
    if (this.startTime === 0) {
      this.startTime = time;
    }

    const elapsed = (time - this.startTime) / 1000;
    const newY = this.baseY + this.amplitude * Math.sin((2 * Math.PI * elapsed) / this.period + this.phase);

    this.y = newY;
    this.graphics.setPosition(this.x, this.y);
    this.glowGraphics.setPosition(this.x, this.y);

    if (this.body) {
      (this.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
    super.destroy();
  }
}
