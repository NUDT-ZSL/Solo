import Phaser from 'phaser';

const SEGMENT_WIDTH = 28;
const SEGMENT_HEIGHT = 8;
const MAX_TRAILS = 60;
const FADE_OUT_DURATION = 800;

interface TrailSegment {
  rect: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.StaticBody;
  age: number;
  maxLife: number;
  fadingOut: boolean;
}

export class LightTrail {
  private scene: Phaser.Scene;
  private segments: TrailSegment[] = [];
  private trailColor: number;
  private glowColor: number;
  private defaultDuration: number = 3000;
  private trailGroup!: Phaser.Physics.Arcade.StaticGroup;
  private spawnAccumulator: number = 0;
  private spawnInterval: number = 60;

  constructor(scene: Phaser.Scene, color: number, glowColor: number) {
    this.scene = scene;
    this.trailColor = color;
    this.glowColor = glowColor;
    this.trailGroup = scene.physics.add.staticGroup();
  }

  setDuration(durationMs: number): void {
    this.defaultDuration = Math.max(1000, Math.min(8000, durationMs));
  }

  getDuration(): number {
    return this.defaultDuration;
  }

  getGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.trailGroup;
  }

  spawnFromPosition(x: number, y: number): void {
    this.spawnAccumulator += this.spawnInterval;
    if (this.spawnAccumulator < this.spawnInterval * 0.5) return;
    this.spawnAccumulator = 0;

    if (this.segments.length >= MAX_TRAILS) {
      this.removeOldest();
    }

    const rect = this.scene.add.rectangle(
      x,
      y + 4,
      SEGMENT_WIDTH,
      SEGMENT_HEIGHT,
      this.trailColor,
      0.85
    );
    rect.setDepth(50);

    const glow = this.scene.add.rectangle(
      x,
      y + 4,
      SEGMENT_WIDTH + 8,
      SEGMENT_HEIGHT + 6,
      this.glowColor,
      0.2
    );
    glow.setDepth(49);

    const body = this.scene.physics.add.staticBody(
      x - SEGMENT_WIDTH / 2,
      y + 4 - SEGMENT_HEIGHT / 2,
      SEGMENT_WIDTH,
      SEGMENT_HEIGHT
    );
    body.setDepth(50);
    (body as any).isLightTrail = true;

    this.trailGroup.add(body);

    const segment: TrailSegment = {
      rect,
      glow,
      body,
      age: 0,
      maxLife: this.defaultDuration,
      fadingOut: false,
    };

    this.segments.push(segment);
  }

  update(delta: number): void {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      seg.age += delta;

      const lifeRatio = seg.age / seg.maxLife;

      if (lifeRatio >= 0.7 && !seg.fadingOut) {
        seg.fadingOut = true;
        this.scene.tweens.add({
          targets: [seg.rect, seg.glow],
          alpha: 0,
          duration: FADE_OUT_DURATION,
          ease: 'Power2',
          onUpdate: () => {
            if (seg.body) {
              seg.body.checkCollision.none = seg.rect.alpha < 0.3;
            }
          },
        });
      }

      if (seg.age >= seg.maxLife) {
        this.removeSegment(i);
      }
    }
  }

  private removeOldest(): void {
    if (this.segments.length > 0) {
      this.removeSegment(0);
    }
  }

  private removeSegment(index: number): void {
    const seg = this.segments[index];
    this.scene.tweens.killTweensOf(seg.rect);
    this.scene.tweens.killTweensOf(seg.glow);
    seg.rect.destroy();
    seg.glow.destroy();
    seg.body.destroy();
    this.segments.splice(index, 1);
  }

  clearAll(): void {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      this.removeSegment(i);
    }
  }

  isLightTrailBody(body: Phaser.Physics.Arcade.Body): boolean {
    return !!(body as any).isLightTrail;
  }

  destroy(): void {
    this.clearAll();
    this.trailGroup.destroy();
  }
}
