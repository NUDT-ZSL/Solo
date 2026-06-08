import Phaser from 'phaser';

export class Gate extends Phaser.GameObjects.Container {
  public isActive: boolean = false;
  public orderIndex: number = 0;

  private sprite: Phaser.GameObjects.Sprite;
  private ring: Phaser.GameObjects.Sprite;
  private activateEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private idleTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, orderIndex: number) {
    super(scene, x, y);

    this.orderIndex = orderIndex;

    this.ring = scene.add.sprite(0, 0, 'gate');
    this.ring.setScale(1);
    this.add(this.ring);

    this.sprite = scene.add.sprite(0, 0, 'gate');
    this.add(this.sprite);

    scene.add.existing(this);

    this.startIdleAnimation();
  }

  private startIdleAnimation(): void {
    this.idleTween = this.scene.tweens.add({
      targets: this.ring,
      angle: 360,
      duration: 8000,
      repeat: -1,
      ease: 'Linear',
    });

    this.scene.tweens.add({
      targets: this,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.sprite.setTexture('gateActive');
    this.ring.setTexture('gateActive');

    this.createActivationBurst();

    this.scene.tweens.add({
      targets: this,
      scaleX: { from: 1, to: 1.3 },
      scaleY: { from: 1, to: 1.3 },
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private createActivationBurst(): void {
    this.activateEmitter = this.scene.add.particles(this.x, this.y, 'particle', {
      speed: { min: 50, max: 150 },
      lifespan: { min: 300, max: 800 },
      alpha: { start: 0.8, end: 0 },
      scale: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      quantity: 20,
      emitting: false,
    });
    this.activateEmitter.explode(20);
    this.scene.time.delayedCall(1000, () => {
      if (this.activateEmitter) {
        this.activateEmitter.destroy();
        this.activateEmitter = null;
      }
    });
  }

  checkCollision(asteroid: Phaser.GameObjects.GameObject): boolean {
    const asteroidObj = asteroid as Phaser.GameObjects.Container;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, asteroidObj.x, asteroidObj.y);
    return dist < 35;
  }

  destroy(fromScene?: boolean): void {
    if (this.idleTween) {
      this.idleTween.stop();
    }
    if (this.activateEmitter) {
      this.activateEmitter.destroy();
    }
    super.destroy(fromScene);
  }
}
