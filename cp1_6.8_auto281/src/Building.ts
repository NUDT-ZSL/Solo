import Phaser from 'phaser';
import { BuildingDef, COLORS } from './config';

export class Building extends Phaser.GameObjects.Container {
  private def: BuildingDef;
  private bodyRect: Phaser.GameObjects.Rectangle;
  private roofShape: Phaser.GameObjects.Triangle | Phaser.GameObjects.Rectangle;
  private glowCircle: Phaser.GameObjects.Ellipse;
  private dustEmitter: Phaser.Time.TimerEvent;
  private isBuilt: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BuildingDef) {
    super(scene, x, y);

    this.def = def;
    this.isBuilt = false;

    this.glowCircle = scene.add.ellipse(0, def.height * 0.1, def.width * 2.5, def.width * 1.2, def.glowColor, 0);
    this.glowCircle.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.glowCircle);

    this.bodyRect = scene.add.rectangle(0, 0, def.width, def.height, def.color);
    this.add(this.bodyRect);

    const strokeColor = COLORS.handDrawn;
    const strokeAlpha = 0.35;
    this.bodyRect.setStrokeStyle(1.5, strokeColor, strokeAlpha);

    if (def.key === 'treehouse') {
      this.roofShape = scene.add.triangle(0, -def.height / 2 - 12, -def.width * 0.7, 12, def.width * 0.7, 12, 0, -16, def.roofColor);
      this.add(this.roofShape);
      const windowRect = scene.add.rectangle(0, 4, 10, 12, 0xffe8a0, 0.7);
      this.add(windowRect);
    } else if (def.key === 'windmill') {
      this.roofShape = scene.add.triangle(0, -def.height / 2 - 10, -def.width * 0.6, 10, def.width * 0.6, 10, 0, -14, def.roofColor);
      this.add(this.roofShape);
      const blade1 = scene.add.rectangle(0, -def.height * 0.15, 4, 40, 0xc0b090, 0.8);
      blade1.setStrokeStyle(0.5, strokeColor, strokeAlpha);
      this.add(blade1);
      const blade2 = scene.add.rectangle(0, -def.height * 0.15, 40, 4, 0xc0b090, 0.8);
      blade2.setStrokeStyle(0.5, strokeColor, strokeAlpha);
      this.add(blade2);

      scene.tweens.add({
        targets: [blade1, blade2],
        angle: 360,
        duration: 3000,
        repeat: -1,
        ease: 'Linear',
      });
    } else if (def.key === 'lighthouse') {
      this.roofShape = scene.add.rectangle(0, -def.height / 2 - 4, def.width * 0.5, 8, def.roofColor);
      this.add(this.roofShape);
      const lightGlow = scene.add.ellipse(0, -def.height / 2 - 8, 16, 16, 0xffffaa, 0.8);
      lightGlow.setBlendMode(Phaser.BlendModes.ADD);
      this.add(lightGlow);

      scene.tweens.add({
        targets: lightGlow,
        alpha: 0.3,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });

      for (let s = 0; s < 3; s++) {
        const stripe = scene.add.rectangle(0, -def.height * 0.3 + s * 16, def.width * 0.85, 4, 0xcc3030, 0.6);
        this.add(stripe);
      }
    }

    this.setDepth(0.2);
    this.setScale(0);
    this.alpha = 0;

    this.dustEmitter = scene.time.addEvent({
      delay: 300 + Math.random() * 200,
      callback: this.emitDust,
      callbackScope: this,
      loop: true,
    });

    scene.add.existing(this);
  }

  playBuildAnimation(onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 600,
      ease: 'Back.Out',
      onComplete: () => {
        this.isBuilt = true;
        this.scene.tweens.add({
          targets: this.glowCircle,
          alpha: 0.2,
          duration: 800,
          ease: 'Sine.Out',
        });
        if (onComplete) onComplete();
      },
    });

    this.scene.tweens.add({
      targets: this.glowCircle,
      alpha: 0.6,
      duration: 300,
      yoyo: true,
      ease: 'Sine.InOut',
    });
  }

  private emitDust(): void {
    if (!this.isBuilt) return;

    const px = this.x + Phaser.Math.FloatBetween(-this.def.width, this.def.width);
    const py = this.y + Phaser.Math.FloatBetween(-this.def.height * 0.5, this.def.height * 0.3);
    const dust = this.scene.add.ellipse(px, py, 4, 4, COLORS.dustParticle, 0.6);
    dust.setBlendMode(Phaser.BlendModes.ADD);
    dust.setDepth(0.25);

    this.scene.tweens.add({
      targets: dust,
      x: px + Phaser.Math.FloatBetween(-30, 30),
      y: py - Phaser.Math.FloatBetween(20, 50),
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: Phaser.Math.Between(800, 1500),
      ease: 'Sine.Out',
      onComplete: () => dust.destroy(),
    });
  }

  getDef(): BuildingDef {
    return this.def;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  getBuilt(): boolean {
    return this.isBuilt;
  }

  destroy(): void {
    this.dustEmitter.remove();
    super.destroy();
  }
}
