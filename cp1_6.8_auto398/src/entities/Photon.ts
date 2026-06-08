import Phaser from 'phaser';

export class Photon extends Phaser.GameObjects.Container {
  private diamond: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private pulseTween: Phaser.Tweens.Tween;
  private rotateTween: Phaser.Tweens.Tween;
  private collected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.glow = scene.add.graphics();
    this.glow.fillStyle(0xffdd00, 0.2);
    this.drawDiamond(this.glow, 18);
    this.add(this.glow);

    this.diamond = scene.add.graphics();
    this.diamond.fillStyle(0xffee44, 0.9);
    this.drawDiamond(this.diamond, 12);
    this.diamond.lineStyle(1.5, 0xffffff, 0.7);
    this.drawDiamond(this.diamond, 12, true);
    this.add(this.diamond);

    scene.add.existing(this);

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(-12, -12);
    body.setAllowGravity(false);
    body.setImmovable(true);

    this.pulseTween = scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.3, to: 0.8 },
      scaleX: { from: 0.9, to: 1.2 },
      scaleY: { from: 0.9, to: 1.2 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.rotateTween = scene.tweens.add({
      targets: this.diamond,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear',
    });
  }

  private drawDiamond(gfx: Phaser.GameObjects.Graphics, size: number, strokeOnly: boolean = false): void {
    const s = size / 2;
    gfx.beginPath();
    gfx.moveTo(0, -s);
    gfx.lineTo(s, 0);
    gfx.lineTo(0, s);
    gfx.lineTo(-s, 0);
    gfx.closePath();
    if (strokeOnly) gfx.strokePath();
    else gfx.fillPath();
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    this.spawnCollectEffect();
    this.destroy();
  }

  private spawnCollectEffect(): void {
    const ringGfx = this.scene.add.graphics();
    ringGfx.lineStyle(3, 0xffdd00, 0.8);
    ringGfx.strokeCircle(0, 0, 5);
    ringGfx.setPosition(this.x, this.y);
    this.scene.add.existing(ringGfx);

    this.scene.tweens.add({
      targets: ringGfx,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => ringGfx.destroy(),
    });

    const key = 'photonBurst';
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.add.graphics();
      g.fillStyle(0xffee44, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture(key, 6, 6);
      g.destroy();
    }

    const emitter = this.scene.add.particles(this.x, this.y, key, {
      speed: { min: 40, max: 120 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 200, max: 400 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      quantity: 10,
      tint: [0xffee44, 0xffffff, 0xffdd00],
    });

    this.scene.time.delayedCall(500, () => {
      emitter.stop();
      this.scene.time.delayedCall(500, () => emitter.destroy());
    });
  }

  isOffScreen(): boolean {
    return this.x < -50;
  }

  isCollected(): boolean {
    return this.collected;
  }

  destroy(): void {
    if (this.pulseTween) this.pulseTween.stop();
    if (this.rotateTween) this.rotateTween.stop();
    super.destroy();
  }
}
