import Phaser from 'phaser';

export class Star extends Phaser.GameObjects.Container {
  public energy: number = 100;
  public maxEnergy: number = 100;
  public energyRegenRate: number = 5;
  public gravityLineCost: number = 15;
  public maxLineLength: number = 300;
  public maxCurvature: number = 0.5;

  private starSprite: Phaser.GameObjects.Sprite;
  private glowSprite: Phaser.GameObjects.Sprite;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.starSprite = scene.add.sprite(0, 0, 'playerStar');
    this.add(this.starSprite);

    this.glowSprite = scene.add.sprite(0, 0, 'playerStar');
    this.glowSprite.setAlpha(0.3);
    this.glowSprite.setScale(1.5);
    this.add(this.glowSprite);

    scene.add.existing(this);

    this.startPulse();
  }

  private startPulse(): void {
    this.pulseTween = this.scene.tweens.add({
      targets: this.glowSprite,
      alpha: { from: 0.15, to: 0.4 },
      scaleX: { from: 1.4, to: 1.7 },
      scaleY: { from: 1.4, to: 1.7 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  canDrawLine(length: number): boolean {
    const costRatio = Math.min(length / this.maxLineLength, 1);
    const cost = this.gravityLineCost * costRatio;
    return this.energy >= cost;
  }

  consumeEnergyForLine(length: number): void {
    const costRatio = Math.min(length / this.maxLineLength, 1);
    const cost = this.gravityLineCost * costRatio;
    this.energy = Math.max(0, this.energy - cost);
  }

  regenerateEnergy(delta: number): void {
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * (delta / 1000));
    }
  }

  getEnergyPercent(): number {
    return this.energy / this.maxEnergy;
  }

  destroy(fromScene?: boolean): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    super.destroy(fromScene);
  }
}
