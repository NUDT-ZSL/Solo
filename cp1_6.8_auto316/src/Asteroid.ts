import Phaser from 'phaser';

export class Asteroid extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body;
  public isLaunched: boolean = false;
  public isAbsorbed: boolean = false;
  public speed: number = 200;

  private sprite: Phaser.GameObjects.Sprite;
  private trailParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.sprite = scene.add.sprite(0, 0, 'asteroid');
    this.add(this.sprite);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCircle(18, 6, 6);
    this.body.setImmovable(false);
    this.body.setBounce(0.3, 0.3);
    this.body.setDrag(0, 0);
    this.body.setCollideWorldBounds(true);

    this.rotationSpeed = (Math.random() - 0.5) * 2;
  }

  private rotationSpeed: number = 1;

  launch(velocityX: number, velocityY: number): void {
    this.isLaunched = true;
    this.body.setVelocity(velocityX, velocityY);
    this.createTrail();
  }

  private createTrail(): void {
    if (this.trailParticles) return;
    this.trailParticles = this.scene.add.particles(this.x, this.y, 'particle', {
      speed: { min: 10, max: 30 },
      lifespan: { min: 200, max: 500 },
      alpha: { start: 0.6, end: 0 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      frequency: 30,
      quantity: 1,
      follow: this,
    });
  }

  applyInterference(offsetX: number, offsetY: number): void {
    if (!this.isLaunched || this.isAbsorbed) return;
    this.body.setVelocity(
      this.body.velocity.x + offsetX,
      this.body.velocity.y + offsetY
    );
  }

  absorb(): void {
    this.isAbsorbed = true;
    this.body.setVelocity(0, 0);
    this.body.setEnable(false);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.destroyTrail();
      },
    });
  }

  resetTo(x: number, y: number): void {
    this.isLaunched = false;
    this.isAbsorbed = false;
    this.body.setEnable(true);
    this.body.setVelocity(0, 0);
    this.setPosition(x, y);
    this.setAlpha(1);
    this.setScale(1);
    this.destroyTrail();
  }

  private destroyTrail(): void {
    if (this.trailParticles) {
      this.trailParticles.stop();
      this.trailParticles.destroy();
      this.trailParticles = null;
    }
  }

  update(delta: number): void {
    if (this.isLaunched && !this.isAbsorbed) {
      this.sprite.angle += this.rotationSpeed * (delta / 16);
    }
  }

  destroy(fromScene?: boolean): void {
    this.destroyTrail();
    super.destroy(fromScene);
  }
}
