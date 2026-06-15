import Phaser from 'phaser';

export enum ObstacleType {
  JUMP = 'jump',
  SLIDE = 'slide',
  WAVE = 'wave',
}

const OBSTACLE_COLORS: Record<ObstacleType, number> = {
  [ObstacleType.JUMP]: 0xff3333,
  [ObstacleType.SLIDE]: 0xff8833,
  [ObstacleType.WAVE]: 0xbb44ff,
};

const OBSTACLE_HINTS: Record<ObstacleType, string> = {
  [ObstacleType.JUMP]: '↑',
  [ObstacleType.SLIDE]: '↓',
  [ObstacleType.WAVE]: '空格',
};

export class Obstacle extends Phaser.GameObjects.Container {
  public obstacleType: ObstacleType;
  private shape: Phaser.GameObjects.Graphics;
  private glowShape: Phaser.GameObjects.Graphics;
  private hintText: Phaser.GameObjects.Text;
  private pulseTween: Phaser.Tweens.Tween;
  private isDestroyed: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: ObstacleType) {
    super(scene, x, y);
    this.obstacleType = type;

    const color = OBSTACLE_COLORS[type];
    const w = 30;
    const h = type === ObstacleType.SLIDE ? 25 : 50;

    this.glowShape = scene.add.graphics();
    this.glowShape.fillStyle(color, 0.2);
    this.drawShape(this.glowShape, w + 12, h + 12);
    this.add(this.glowShape);

    this.shape = scene.add.graphics();
    this.shape.fillStyle(color, 0.9);
    this.drawShape(this.shape, w, h);
    this.shape.lineStyle(2, color, 1);
    this.drawShape(this.shape, w, h, true);
    this.add(this.shape);

    this.hintText = scene.add.text(0, -h / 2 - 16, OBSTACLE_HINTS[type], {
      fontSize: '14px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.add(this.hintText);

    scene.add.existing(this);

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(w * 2, h * 2);
    body.setOffset(-w, -h);
    body.setAllowGravity(false);
    body.setImmovable(true);

    this.pulseTween = scene.tweens.add({
      targets: this.glowShape,
      alpha: { from: 0.3, to: 0.7 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawShape(gfx: Phaser.GameObjects.Graphics, w: number, h: number, strokeOnly: boolean = false): void {
    if (this.obstacleType === ObstacleType.JUMP) {
      if (strokeOnly) {
        gfx.beginPath();
        gfx.moveTo(-w / 2, h / 2);
        gfx.lineTo(0, -h / 2);
        gfx.lineTo(w / 2, h / 2);
        gfx.closePath();
        gfx.strokePath();
      } else {
        gfx.fillTriangle(-w / 2, h / 2, 0, -h / 2, w / 2, h / 2);
      }
    } else if (this.obstacleType === ObstacleType.SLIDE) {
      if (strokeOnly) {
        gfx.strokeRect(-w / 2, -h / 2, w, h);
      } else {
        gfx.fillRect(-w / 2, -h / 2, w, h);
      }
    } else {
      gfx.beginPath();
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
        const px = Math.cos(angle) * w / 2;
        const py = Math.sin(angle) * h / 2;
        if (i === 0) gfx.moveTo(px, py);
        else gfx.lineTo(px, py);
      }
      gfx.closePath();
      if (strokeOnly) gfx.strokePath();
      else gfx.fillPath();
    }
  }

  destroyByWave(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.spawnShatterEffect();
    this.destroy();
  }

  destroyByJump(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.spawnShatterEffect();
    this.destroy();
  }

  private spawnShatterEffect(): void {
    const color = OBSTACLE_COLORS[this.obstacleType];
    const key = `shatter_${this.obstacleType}`;
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.add.graphics();
      g.fillStyle(color, 1);
      g.fillRect(0, 0, 6, 6);
      g.generateTexture(key, 6, 6);
      g.destroy();
    }

    const emitter = this.scene.add.particles(this.x, this.y, key, {
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 1.0, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      quantity: 20,
      tint: [color, 0xffffff],
    });

    this.scene.time.delayedCall(700, () => {
      emitter.stop();
      this.scene.time.delayedCall(700, () => emitter.destroy());
    });
  }

  getHint(): string {
    return OBSTACLE_HINTS[this.obstacleType];
  }

  getColor(): number {
    return OBSTACLE_COLORS[this.obstacleType];
  }

  isOffScreen(): boolean {
    return this.x < -100;
  }

  destroy(): void {
    if (this.pulseTween) this.pulseTween.stop();
    super.destroy();
  }
}
