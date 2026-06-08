import Phaser from 'phaser';
import { TrackZone } from './LightTrack';

export interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
}

interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  radius: number;
  color: number;
}

const ZONE_PLAYER_COLORS: Record<TrackZone, number> = {
  bluePurple: 0xaa77ff,
  cyanGreen: 0x55ffdd,
  warmYellow: 0xffdd66,
};

export class Player extends Phaser.GameObjects.Container {
  public speed: number = 3;
  public baseSpeed: number = 3;
  public currentZone: TrackZone | null = null;
  public isAlive: boolean = true;
  public hasReachedExit: boolean = false;

  private coreGraphic: Phaser.GameObjects.Graphics;
  private glowGraphic: Phaser.GameObjects.Graphics;
  private trailGraphic: Phaser.GameObjects.Graphics;
  private burstGraphic: Phaser.GameObjects.Graphics;

  private trailParticles: TrailParticle[] = [];
  private burstParticles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; radius: number; color: number }> = [];
  private isBursting: boolean = false;
  private pulsePhase: number = 0;
  private moveTarget: Phaser.Geom.Point | null = null;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  constructor(config: PlayerConfig) {
    super(config.scene, config.x, config.y);

    this.glowGraphic = new Phaser.GameObjects.Graphics(config.scene);
    this.trailGraphic = new Phaser.GameObjects.Graphics(config.scene);
    this.coreGraphic = new Phaser.GameObjects.Graphics(config.scene);
    this.burstGraphic = new Phaser.GameObjects.Graphics(config.scene);

    this.add([this.trailGraphic, this.glowGraphic, this.coreGraphic, this.burstGraphic]);
    this.scene.add.existing(this);

    if (config.scene.input.keyboard) {
      this.cursorKeys = config.scene.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: config.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: config.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: config.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: config.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  public setSpeedMultiplier(mult: number): void {
    this.speed = this.baseSpeed * mult;
  }

  public update(delta: number): void {
    if (!this.isAlive) return;
    if (this.hasReachedExit) {
      this.updateBurst(delta);
      return;
    }

    this.pulsePhase += delta * 0.005;
    this.handleInput(delta);
    this.updateTrail(delta);
    this.draw();
  }

  private handleInput(delta: number): void {
    this.velocityX = 0;
    this.velocityY = 0;

    const speed = this.speed * delta * 0.15;

    if (this.cursorKeys.left.isDown || this.wasdKeys.A.isDown) this.velocityX = -speed;
    else if (this.cursorKeys.right.isDown || this.wasdKeys.D.isDown) this.velocityX = speed;

    if (this.cursorKeys.up.isDown || this.wasdKeys.W.isDown) this.velocityY = -speed;
    else if (this.cursorKeys.down.isDown || this.wasdKeys.S.isDown) this.velocityY = speed;

    if (this.velocityX !== 0 && this.velocityY !== 0) {
      const factor = 0.7071;
      this.velocityX *= factor;
      this.velocityY *= factor;
    }

    this.x += this.velocityX;
    this.y += this.velocityY;

    this.x = Phaser.Math.Clamp(this.x, 20, 1260);
    this.y = Phaser.Math.Clamp(this.y, 20, 700);
  }

  private updateTrail(delta: number): void {
    if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) {
      const color = this.currentZone ? ZONE_PLAYER_COLORS[this.currentZone] : 0xffffff;
      this.trailParticles.push({
        x: this.x + Phaser.Math.FloatBetween(-2, 2),
        y: this.y + Phaser.Math.FloatBetween(-2, 2),
        alpha: 0.8,
        radius: Phaser.Math.FloatBetween(2, 4),
        color,
      });
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      this.trailParticles[i].alpha -= delta * 0.003;
      this.trailParticles[i].radius -= delta * 0.002;
      if (this.trailParticles[i].alpha <= 0 || this.trailParticles[i].radius <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }

    if (this.trailParticles.length > 100) {
      this.trailParticles.splice(0, this.trailParticles.length - 100);
    }
  }

  private draw(): void {
    this.coreGraphic.clear();
    this.glowGraphic.clear();
    this.trailGraphic.clear();

    for (const p of this.trailParticles) {
      this.trailGraphic.fillStyle(p.color, p.alpha);
      this.trailGraphic.fillCircle(p.x, p.y, p.radius);
    }

    const pulse = 0.8 + 0.2 * Math.sin(this.pulsePhase);
    const color = this.currentZone ? ZONE_PLAYER_COLORS[this.currentZone] : 0xffffff;

    this.glowGraphic.fillStyle(color, 0.15 * pulse);
    this.glowGraphic.fillCircle(0, 0, 18 * pulse);
    this.glowGraphic.fillStyle(color, 0.25 * pulse);
    this.glowGraphic.fillCircle(0, 0, 12 * pulse);

    this.coreGraphic.fillStyle(color, 0.9);
    this.coreGraphic.fillCircle(0, 0, 6);
    this.coreGraphic.fillStyle(0xffffff, 0.95);
    this.coreGraphic.fillCircle(0, 0, 3);
  }

  public triggerBurst(): void {
    this.hasReachedExit = true;
    this.isBursting = true;
    const color = this.currentZone ? ZONE_PLAYER_COLORS[this.currentZone] : 0xffffff;

    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + Phaser.Math.FloatBetween(-0.1, 0.1);
      const speed = Phaser.Math.FloatBetween(1, 5);
      this.burstParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        radius: Phaser.Math.FloatBetween(2, 6),
        color: Math.random() > 0.3 ? color : 0xffffff,
      });
    }
  }

  private updateBurst(delta: number): void {
    if (!this.isBursting) return;

    this.burstGraphic.clear();
    let allDead = true;

    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.x += p.vx * delta * 0.1;
      p.y += p.vy * delta * 0.1;
      p.alpha -= delta * 0.002;
      p.radius -= delta * 0.003;

      if (p.alpha <= 0 || p.radius <= 0) {
        this.burstParticles.splice(i, 1);
        continue;
      }

      allDead = false;
      this.burstGraphic.fillStyle(p.color, p.alpha);
      this.burstGraphic.fillCircle(p.x, p.y, p.radius);
    }

    this.coreGraphic.clear();
    this.glowGraphic.clear();
    const flicker = Math.random() > 0.5 ? 0.9 : 0.3;
    this.glowGraphic.fillStyle(0xffffff, 0.2 * flicker);
    this.glowGraphic.fillCircle(0, 0, 20);

    if (allDead) {
      this.isBursting = false;
    }
  }

  public die(): void {
    this.isAlive = false;
    this.coreGraphic.clear();
    this.glowGraphic.clear();
  }

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.isAlive = true;
    this.hasReachedExit = false;
    this.isBursting = false;
    this.currentZone = null;
    this.speed = this.baseSpeed;
    this.trailParticles = [];
    this.burstParticles = [];
    this.burstGraphic.clear();
    this.trailGraphic.clear();
    this.draw();
  }
}
