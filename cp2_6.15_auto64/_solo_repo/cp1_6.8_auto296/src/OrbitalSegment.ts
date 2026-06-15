import Phaser from 'phaser';
import { Polarity, SEGMENT_WIDTH, SEGMENT_HEIGHT, COLORS } from './config';

export enum SegmentType {
  Normal,
  Trap,
  Boost,
}

export class OrbitalSegment extends Phaser.GameObjects.Container {
  private bodyRect: Phaser.GameObjects.Rectangle;
  private glowRect: Phaser.GameObjects.Rectangle;
  private fieldLines: Phaser.GameObjects.Graphics;
  private polarity: Polarity;
  private segmentType: SegmentType;
  private fieldAngle: number = 0;
  private pulseAlpha: number = 0;
  private boostGlow: Phaser.GameObjects.Rectangle | null = null;
  private trapSpikes: Phaser.GameObjects.Graphics | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    polarity: Polarity,
    segmentType: SegmentType = SegmentType.Normal
  ) {
    super(scene, x, y);
    this.polarity = polarity;
    this.segmentType = segmentType;

    const color = this.getPrimaryColor();
    const glowColor = this.getGlowColor();

    this.glowRect = scene.add.rectangle(0, 0, SEGMENT_WIDTH + 8, SEGMENT_HEIGHT + 8, glowColor, 0.3);
    this.add(this.glowRect);

    this.bodyRect = scene.add.rectangle(0, 0, SEGMENT_WIDTH, SEGMENT_HEIGHT, color, 1);
    this.add(this.bodyRect);

    this.fieldLines = scene.add.graphics();
    this.add(this.fieldLines);

    if (this.segmentType === SegmentType.Boost) {
      this.boostGlow = scene.add.rectangle(0, 0, SEGMENT_WIDTH + 4, SEGMENT_HEIGHT + 4, COLORS.BOOST, 0.5);
      this.add(this.boostGlow);
    }

    if (this.segmentType === SegmentType.Trap) {
      this.trapSpikes = scene.add.graphics();
      this.drawTrapSpikes();
      this.add(this.trapSpikes);
    }

    scene.add.existing(this);

    scene.tweens.add({
      targets: this.glowRect,
      alpha: 0.6,
      duration: 600 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private getPrimaryColor(): number {
    if (this.segmentType === SegmentType.Boost) return COLORS.BOOST;
    if (this.segmentType === SegmentType.Trap) return COLORS.TRAP;
    return this.polarity === Polarity.Positive ? COLORS.POSITIVE_PRIMARY : COLORS.NEGATIVE_PRIMARY;
  }

  private getGlowColor(): number {
    return this.polarity === Polarity.Positive ? COLORS.POSITIVE_GLOW : COLORS.NEGATIVE_GLOW;
  }

  private drawTrapSpikes(): void {
    if (!this.trapSpikes) return;
    const g = this.trapSpikes;
    g.clear();
    g.fillStyle(COLORS.TRAP, 0.8);

    const count = 4;
    const spacing = SEGMENT_WIDTH / count;
    for (let i = 0; i < count; i++) {
      const sx = -SEGMENT_WIDTH / 2 + spacing * i + spacing / 2;
      g.fillTriangle(
        sx - 4, -SEGMENT_HEIGHT / 2,
        sx + 4, -SEGMENT_HEIGHT / 2,
        sx, -SEGMENT_HEIGHT / 2 - 14
      );
    }
  }

  updateFieldAnimation(delta: number): void {
    this.fieldAngle += delta * 0.003;
    this.pulseAlpha = 0.3 + Math.sin(this.fieldAngle) * 0.2;

    this.fieldLines.clear();
    this.fieldLines.lineStyle(1.5, this.getGlowColor(), this.pulseAlpha);

    const cx = 0;
    const cy = 0;
    const rx = SEGMENT_WIDTH / 2 - 4;
    const ry = SEGMENT_HEIGHT / 2 + 8;

    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * 6;
      this.fieldLines.lineBetween(cx - rx, cy + offset + Math.sin(this.fieldAngle + i) * 3, cx + rx, cy + offset + Math.cos(this.fieldAngle + i) * 3);
    }

    if (this.boostGlow) {
      this.boostGlow.setAlpha(0.3 + Math.sin(this.fieldAngle * 2) * 0.3);
    }
  }

  getPolarity(): Polarity {
    return this.polarity;
  }

  getType(): SegmentType {
    return this.segmentType;
  }

  getBodyRect(): Phaser.GameObjects.Rectangle {
    return this.bodyRect;
  }

  destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
  }
}
