import Phaser from 'phaser';
import { Polarity, PLAYER_RADIUS, COLORS, JUMP_VELOCITY, REPEL_BOUNCE_VELOCITY, ATTRACT_STICK_DURATION, POLARITY_SWITCH_COOLDOWN } from './config';

export class Player extends Phaser.GameObjects.Container {
  private ball: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;
  private innerGlow: Phaser.GameObjects.Arc;
  private polarity: Polarity = Polarity.Positive;
  private isGrounded: boolean = false;
  private isStuck: boolean = false;
  private stickTimer: number = 0;
  private lastSwitchTime: number = 0;
  private switchFlash: Phaser.GameObjects.Arc | null = null;
  private trailParticles: Phaser.GameObjects.Graphics;
  private trailPositions: { x: number; y: number; alpha: number }[] = [];
  private onPolaritySwitch?: (newPolarity: Polarity) => void;
  private attractParticleTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onSwitch?: (newPolarity: Polarity) => void
  ) {
    super(scene, x, y);
    this.onPolaritySwitch = onSwitch;

    this.glow = scene.add.circle(0, 0, PLAYER_RADIUS + 8, COLORS.PLAYER_GLOW, 0.15);
    this.add(this.glow);

    this.innerGlow = scene.add.circle(0, 0, PLAYER_RADIUS + 3, this.getPlayerColor(), 0.4);
    this.add(this.innerGlow);

    this.ball = scene.add.circle(0, 0, PLAYER_RADIUS, this.getPlayerColor(), 1);
    this.add(this.ball);

    this.trailParticles = scene.add.graphics();
    this.add(this.trailParticles);

    scene.add.existing(this);

    scene.tweens.add({
      targets: this.glow,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.25,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private getPlayerColor(): number {
    return this.polarity === Polarity.Positive ? COLORS.PLAYER_POSITIVE : COLORS.PLAYER_NEGATIVE;
  }

  getPolarity(): Polarity {
    return this.polarity;
  }

  switchPolarity(time: number): void {
    if (time - this.lastSwitchTime < POLARITY_SWITCH_COOLDOWN) return;
    this.lastSwitchTime = time;

    this.polarity = this.polarity === Polarity.Positive ? Polarity.Negative : Polarity.Positive;

    const newColor = this.getPlayerColor();
    this.ball.setFillStyle(newColor);
    this.innerGlow.setFillStyle(newColor, 0.4);

    this.playSwitchFlash();
    this.onPolaritySwitch?.(this.polarity);
  }

  private playSwitchFlash(): void {
    if (this.switchFlash) {
      this.switchFlash.destroy();
    }

    this.switchFlash = this.scene.add.circle(0, 0, PLAYER_RADIUS + 16, 0xffffff, 0.6);
    this.add(this.switchFlash);

    this.scene.tweens.add({
      targets: this.switchFlash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.switchFlash?.destroy();
        this.switchFlash = null;
      },
    });
  }

  jump(): void {
    if (!this.isGrounded && !this.isStuck) return;
    this.isStuck = false;
    this.isGrounded = false;
  }

  getJumpVelocity(): number {
    return JUMP_VELOCITY;
  }

  getRepelVelocity(): number {
    return REPEL_BOUNCE_VELOCITY;
  }

  setGrounded(value: boolean): void {
    this.isGrounded = value;
  }

  isPlayerGrounded(): boolean {
    return this.isGrounded;
  }

  stickToSegment(duration: number = ATTRACT_STICK_DURATION): void {
    this.isStuck = true;
    this.stickTimer = duration;
    this.playAttractEffect();
  }

  private playAttractEffect(): void {
    const burstCount = 6;
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 / burstCount) * i;
      const dist = PLAYER_RADIUS + 12;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;

      const particle = this.scene.add.circle(px, py, 3, this.getPlayerColor(), 0.8);
      this.add(particle);

      this.scene.tweens.add({
        targets: particle,
        x: px + Math.cos(angle) * 20,
        y: py + Math.sin(angle) * 20,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  updatePlayer(delta: number, scrollSpeed: number): void {
    if (this.isStuck) {
      this.stickTimer -= delta;
      if (this.stickTimer <= 0) {
        this.isStuck = false;
      }
      this.x -= scrollSpeed * (delta / 1000);
    }

    this.updateTrail(delta);
    this.attractParticleTimer += delta;
  }

  private updateTrail(delta: number): void {
    this.trailPositions.push({ x: this.x, y: this.y, alpha: 0.5 });
    if (this.trailPositions.length > 8) {
      this.trailPositions.shift();
    }

    this.trailParticles.clear();
    for (let i = 0; i < this.trailPositions.length; i++) {
      const pos = this.trailPositions[i];
      pos.alpha -= delta * 0.003;
      if (pos.alpha <= 0) {
        this.trailPositions.splice(i, 1);
        i--;
        continue;
      }
      this.trailParticles.fillStyle(this.getPlayerColor(), pos.alpha * 0.3);
      const worldX = pos.x - this.x;
      const worldY = pos.y - this.y;
      this.trailParticles.fillCircle(worldX, worldY, PLAYER_RADIUS * (0.3 + pos.alpha * 0.4));
    }
  }

  isPlayerStuck(): boolean {
    return this.isStuck;
  }

  getStickTimer(): number {
    return this.stickTimer;
  }

  destroy(fromScene?: boolean): void {
    this.trailPositions = [];
    super.destroy(fromScene);
  }
}
