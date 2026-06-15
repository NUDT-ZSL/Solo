import Phaser from 'phaser';
import { TimeEffectType, TimeEffectZone } from '../utils/TimeManager';

export interface TimeStampConfig {
  x: number;
  y: number;
  type: TimeEffectType;
  radius: number;
  duration: number;
  strength: number;
}

const STAMP_COLORS: Record<TimeEffectType, number> = {
  accelerate: 0xffd700,
  decelerate: 0x4a90d9,
  reverse: 0x9b59b6,
};

const STAMP_LABELS: Record<TimeEffectType, string> = {
  accelerate: '▶▶',
  decelerate: '◀◀',
  reverse: '◀▶',
};

export class TimeStamp extends Phaser.GameObjects.Container {
  private stampType: TimeEffectType;
  private effectRadius: number;
  private effectDuration: number;
  private effectStrength: number;
  private zoneGraphic: Phaser.GameObjects.Graphics;
  private iconCircle: Phaser.GameObjects.Graphics;
  private iconText: Phaser.GameObjects.Text;
  private rippleGraphics: Phaser.GameObjects.Graphics;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private rippleTweens: Phaser.Tweens.Tween[] = [];
  private elapsed: number = 0;
  private isActive: boolean = true;
  private onExpire: ((stamp: TimeStamp) => void) | null = null;

  constructor(scene: Phaser.Scene, config: TimeStampConfig) {
    super(scene, config.x, config.y);

    this.stampType = config.type;
    this.effectRadius = config.radius;
    this.effectDuration = config.duration;
    this.effectStrength = config.strength;

    this.zoneGraphic = scene.add.graphics();
    this.iconCircle = scene.add.graphics();
    this.iconText = scene.add.text(0, 0, STAMP_LABELS[this.stampType], {
      fontSize: '18px',
      color: '#fff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.rippleGraphics = scene.add.graphics();

    this.add([this.zoneGraphic, this.iconCircle, this.iconText, this.rippleGraphics]);

    this.drawZone(0.3);
    this.drawIcon();
    this.startPulse();
    this.startRipple();

    scene.add.existing(this);
  }

  private drawZone(alpha: number): void {
    this.zoneGraphic.clear();
    this.zoneGraphic.fillStyle(STAMP_COLORS[this.stampType], alpha);
    this.zoneGraphic.fillCircle(0, 0, this.effectRadius);
    this.zoneGraphic.lineStyle(2, STAMP_COLORS[this.stampType], alpha + 0.2);
    this.zoneGraphic.strokeCircle(0, 0, this.effectRadius);

    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const innerR = this.effectRadius * 0.3;
      const outerR = this.effectRadius * 0.95;
      this.zoneGraphic.lineStyle(1, STAMP_COLORS[this.stampType], alpha * 0.5);
      this.zoneGraphic.beginPath();
      this.zoneGraphic.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      this.zoneGraphic.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      this.zoneGraphic.strokePath();
    }
  }

  private drawIcon(): void {
    const r = 22;
    this.iconCircle.clear();

    this.iconCircle.fillStyle(0x1a1008, 0.85);
    this.iconCircle.fillCircle(0, 0, r + 4);

    this.iconCircle.fillStyle(STAMP_COLORS[this.stampType], 0.9);
    this.iconCircle.fillCircle(0, 0, r);

    this.iconCircle.lineStyle(3, 0xd4a574, 1);
    this.iconCircle.strokeCircle(0, 0, r);

    this.iconCircle.lineStyle(1, 0xd4a574, 0.6);
    this.iconCircle.strokeCircle(0, 0, r * 0.6);

    const tickCount = 12;
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      this.iconCircle.lineStyle(1.5, 0xd4a574, 0.8);
      this.iconCircle.beginPath();
      this.iconCircle.moveTo(Math.cos(angle) * (r * 0.7), Math.sin(angle) * (r * 0.7));
      this.iconCircle.lineTo(Math.cos(angle) * (r * 0.9), Math.sin(angle) * (r * 0.9));
      this.iconCircle.strokePath();
    }

    this.iconCircle.fillStyle(0xd4a574, 1);
    this.iconCircle.fillCircle(0, 0, 3);
  }

  private startPulse(): void {
    this.pulseTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startRipple(): void {
    const spawnRipple = () => {
      if (!this.isActive) return;

      const ripple = { radius: 10, alpha: 0.6 };
      const tween = this.scene.tweens.add({
        targets: ripple,
        radius: this.effectRadius,
        alpha: 0,
        duration: 1500,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          this.rippleGraphics.clear();
          this.rippleGraphics.lineStyle(2, STAMP_COLORS[this.stampType], ripple.alpha);
          this.rippleGraphics.strokeCircle(0, 0, ripple.radius);
        },
        onComplete: () => {
          const idx = this.rippleTweens.indexOf(tween);
          if (idx >= 0) this.rippleTweens.splice(idx, 1);
        },
      });
      this.rippleTweens.push(tween);
    };

    spawnRipple();
    this.scene.time.addEvent({
      delay: 1800,
      callback: spawnRipple,
      loop: true,
    });
  }

  playPlacementAnimation(): void {
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        this.setScale(1);
      },
    });
  }

  getType(): TimeEffectType {
    return this.stampType;
  }

  getEffectRadius(): number {
    return this.effectRadius;
  }

  getRemainingRatio(): number {
    return 1 - this.elapsed / this.effectDuration;
  }

  updateStamp(delta: number): void {
    if (!this.isActive) return;

    this.elapsed += delta;

    const ratio = this.getRemainingRatio();
    this.drawZone(0.3 * ratio);

    if (this.elapsed >= this.effectDuration) {
      this.expire();
    }
  }

  toEffectZone(): TimeEffectZone {
    return {
      x: this.x,
      y: this.y,
      radius: this.effectRadius,
      type: this.stampType,
      strength: this.effectStrength,
      remaining: this.effectDuration - this.elapsed,
      maxDuration: this.effectDuration,
    };
  }

  setOnExpire(cb: (stamp: TimeStamp) => void): void {
    this.onExpire = cb;
  }

  private expire(): void {
    this.isActive = false;
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    this.rippleTweens.forEach(t => t.stop());
    this.rippleTweens = [];

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.destroy();
        this.onExpire?.(this);
      },
    });
  }

  destroy(fromScene?: boolean): void {
    this.zoneGraphic?.destroy();
    this.iconCircle?.destroy();
    this.iconText?.destroy();
    this.rippleGraphics?.destroy();
    super.destroy(fromScene);
  }
}
