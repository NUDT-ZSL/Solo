import Phaser from 'phaser';

export interface PrismConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  size?: number;
  rotationSpeed?: number;
}

export class Prism extends Phaser.GameObjects.Container {
  public size: number;
  public rotationSpeed: number;
  public collisionRadius: number;

  private bodyGraphic: Phaser.GameObjects.Graphics;
  private edgeGlow: Phaser.GameObjects.Graphics;
  private currentAngle: number = 0;
  private pulsePhase: number = 0;

  constructor(config: PrismConfig) {
    super(config.scene, config.x, config.y);

    this.size = config.size ?? 30;
    this.rotationSpeed = config.rotationSpeed ?? Phaser.Math.FloatBetween(0.5, 2.0);
    this.collisionRadius = this.size * 0.8;

    this.bodyGraphic = new Phaser.GameObjects.Graphics(config.scene);
    this.edgeGlow = new Phaser.GameObjects.Graphics(config.scene);
    this.add([this.edgeGlow, this.bodyGraphic]);

    this.scene.add.existing(this);
    this.draw();
  }

  private draw(): void {
    this.bodyGraphic.clear();
    this.edgeGlow.clear();

    const s = this.size;
    const pulse = 0.85 + 0.15 * Math.sin(this.pulsePhase);
    const glowSize = s * pulse;

    this.edgeGlow.lineStyle(3, 0x9966cc, 0.5 + 0.3 * Math.sin(this.pulsePhase));
    this.edgeGlow.strokeTriangle(0, -glowSize, -glowSize * 0.866, glowSize * 0.5, glowSize * 0.866, glowSize * 0.5);

    this.edgeGlow.lineStyle(6, 0x7744aa, 0.2);
    this.edgeGlow.strokeTriangle(0, -glowSize * 1.1, -glowSize * 0.95, glowSize * 0.55, glowSize * 0.95, glowSize * 0.55);

    this.bodyGraphic.fillStyle(0x111111, 0.7);
    this.bodyGraphic.fillTriangle(0, -s, -s * 0.866, s * 0.5, s * 0.866, s * 0.5);

    this.bodyGraphic.lineStyle(1.5, 0x9966cc, 0.6);
    this.bodyGraphic.strokeTriangle(0, -s, -s * 0.866, s * 0.5, s * 0.866, s * 0.5);
  }

  public update(delta: number, gameSpeed: number): void {
    this.currentAngle += this.rotationSpeed * gameSpeed * delta * 0.001;
    this.pulsePhase += delta * 0.004;
    this.setRotation(this.currentAngle);
    this.draw();
  }

  public checkCollision(px: number, py: number, playerRadius: number = 8): boolean {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    return dist < this.collisionRadius + playerRadius;
  }

  public randomizeSpeed(): void {
    this.rotationSpeed = Phaser.Math.FloatBetween(0.5, 2.5);
    if (Math.random() > 0.5) {
      this.rotationSpeed = -this.rotationSpeed;
    }
  }
}
