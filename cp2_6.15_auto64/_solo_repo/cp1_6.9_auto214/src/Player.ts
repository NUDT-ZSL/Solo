import Phaser from 'phaser';
import { GameScene } from './main';

export class Player {
  private scene: GameScene;
  public sprite!: Phaser.Physics.Arcade.Image;
  private shipGraphics!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private trailPoints: { x: number; y: number; alpha: number }[] = [];

  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  public energy: number = 0;
  private maxEnergy: number = 100;

  private velocityX: number = 0;
  private velocityY: number = 0;
  private acceleration: number = 1800;
  private damping: number = 0.88;
  private maxSpeed: number = 480;

  private shootCooldown: number = 0;
  private shootInterval: number = 160;

  private slowdownMultiplier: number = 1;
  private slowdownTimer: number = 0;

  private trailTimer: number = 0;
  private engineGlow!: Phaser.GameObjects.Graphics;
  private enginePulse: number = 0;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.createShip();
    this.setupInput();
    this.setupTrail();
  }

  private createShip(): void {
    const scene = this.scene;
    const width = scene.scale.width;
    const height = scene.scale.height;

    this.sprite = scene.physics.add.image(width * 0.22, height / 2, '');
    this.sprite.setAlpha(0);
    this.sprite.setSize(50, 38);
    this.sprite.setDisplaySize(50, 38);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(50);
    this.sprite.body.setSize(36, 26);

    this.shipGraphics = scene.add.graphics();
    this.shipGraphics.setDepth(51);

    this.engineGlow = scene.add.graphics();
    this.engineGlow.setDepth(49);

    this.trailGraphics = scene.add.graphics();
    this.trailGraphics.setDepth(48);
  }

  private setupInput(): void {
    const keyObj = this.scene.input.keyboard;
    this.keys = {
      W: keyObj!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyObj!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyObj!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyObj!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.tryShoot();
      }
    });

    this.scene.input.on('pointermove', (_pointer: Phaser.Input.Pointer) => {
      /* pointer tracking handled in update for shooting direction */
    });
  }

  private setupTrail(): void {
    this.trailPoints = [];
  }

  private drawShip(): void {
    const g = this.shipGraphics;
    const x = this.sprite.x;
    const y = this.sprite.y;

    g.clear();

    this.enginePulse += 0.15;
    const pulseIntensity = 0.7 + Math.sin(this.enginePulse) * 0.3;

    this.engineGlow.clear();
    const glowX = x - 25;
    const glowY = y;
    this.engineGlow.fillStyle(0x66ccff, pulseIntensity * 0.5);
    this.engineGlow.fillEllipse(glowX, glowY, 55, 32);
    this.engineGlow.fillStyle(0x4499ff, pulseIntensity * 0.4);
    this.engineGlow.fillEllipse(glowX, glowY, 38, 22);
    this.engineGlow.fillStyle(0x88ddff, pulseIntensity * 0.35);
    this.engineGlow.fillEllipse(glowX + 8, glowY, 18, 10);

    g.fillStyle(0xffffff, 0.95);
    g.beginPath();
    g.moveTo(x + 30, y);
    g.lineTo(x - 18, y - 19);
    g.lineTo(x - 12, y);
    g.lineTo(x - 18, y + 19);
    g.closePath();
    g.fillPath();

    g.lineStyle(2.5, 0x66ccff, 0.95);
    g.beginPath();
    g.moveTo(x + 30, y);
    g.lineTo(x - 18, y - 19);
    g.lineTo(x - 12, y);
    g.lineTo(x - 18, y + 19);
    g.closePath();
    g.strokePath();

    g.fillStyle(0x3388ff, 0.9);
    g.beginPath();
    g.moveTo(x + 14, y);
    g.lineTo(x - 4, y - 8);
    g.lineTo(x - 4, y + 8);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xaaddff, 1);
    g.beginPath();
    g.arc(x + 4, y, 4, 0, Math.PI * 2);
    g.fillPath();

    const glowIntensity = 0.4 + Math.sin(this.enginePulse * 0.7) * 0.15;
    g.lineStyle(4, 0x66ccff, glowIntensity);
    g.beginPath();
    g.moveTo(x + 30, y);
    g.lineTo(x - 18, y - 19);
    g.lineTo(x - 12, y);
    g.lineTo(x - 18, y + 19);
    g.closePath();
    g.strokePath();
  }

  private drawTrail(): void {
    const g = this.trailGraphics;
    g.clear();

    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const point = this.trailPoints[i]!;
      point.alpha -= 0.025;

      if (point.alpha <= 0) {
        this.trailPoints.splice(i, 1);
        continue;
      }

      const size = i * 0.45 + 1;
      const alpha = point.alpha * 0.6;

      g.fillStyle(0x66ddff, alpha * 0.8);
      g.fillCircle(point.x, point.y, size);
      g.fillStyle(0xaaffff, alpha * 0.5);
      g.fillCircle(point.x, point.y, size * 0.55);
    }
  }

  public addEnergy(amount: number): void {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
    this.scene.uiManager.updateEnergy(this.energy);
  }

  private tryShoot(): void {
    if (this.scene.isPaused || this.scene.isGameOver) return;
    if (this.shootCooldown > 0) return;
    if (this.energy < 5) return;

    this.energy -= 5;
    this.scene.uiManager.updateEnergy(this.energy);
    this.shootCooldown = this.shootInterval;

    const isLowEnergy = this.energy < 20;
    const bulletColor = isLowEnergy ? 0xff4444 : 0x44aaff;
    const bulletGlow = isLowEnergy ? 0xff6666 : 0x66ddff;

    const bullet = this.scene.bullets.get() as Phaser.Physics.Arcade.Image;
    if (!bullet) return;

    bullet.enableBody(true, this.sprite.x + 35, this.sprite.y, true, true);
    bullet.setTexture('');
    bullet.setAlpha(0);
    bullet.setSize(24, 10);
    bullet.setVelocityX(950);
    bullet.setVelocityY(0);
    bullet.setDepth(55);
    bullet.body.setSize(20, 8);

    const bulletGraphics = this.scene.add.graphics();
    bulletGraphics.setDepth(56);
    bullet.setData('graphics', bulletGraphics);

    this.scene.tweens.add({
      targets: bullet,
      scale: { from: 0.6, to: 1 },
      duration: 80,
      ease: 'Cubic.easeOut'
    });

    const updateBulletGraphics = () => {
      if (!bullet.active) {
        bulletGraphics.destroy();
        return;
      }
      bulletGraphics.clear();

      const bx = bullet.x;
      const by = bullet.y;

      bulletGraphics.fillStyle(bulletColor, 0.95);
      bulletGraphics.fillEllipse(bx, by, 22, 8);

      bulletGraphics.fillStyle(bulletGlow, 0.55);
      bulletGraphics.fillEllipse(bx + 2, by, 12, 4.5);

      bulletGraphics.fillStyle(0xffffff, 0.45);
      bulletGraphics.fillEllipse(bx + 4, by, 6, 2.5);

      bulletGraphics.lineStyle(2, bulletGlow, 0.75);
      bulletGraphics.lineBetween(bx - 13, by, bx + 13, by);
    };

    bullet.setData('updateGraphics', updateBulletGraphics);
  }

  public applySlowdown(multiplier: number, duration: number): void {
    this.slowdownMultiplier = multiplier;
    this.slowdownTimer = duration;
  }

  public reset(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    this.sprite.setPosition(width * 0.22, height / 2);
    this.velocityX = 0;
    this.velocityY = 0;
    this.energy = 0;
    this.shootCooldown = 0;
    this.slowdownMultiplier = 1;
    this.slowdownTimer = 0;
    this.trailPoints = [];
  }

  update(delta: number): void {
    const dt = delta / 1000;

    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }

    if (this.slowdownTimer > 0) {
      this.slowdownTimer -= delta;
      if (this.slowdownTimer <= 0) {
        this.slowdownMultiplier = 1;
      }
    }

    this.handleMovement(dt);
    this.handleContinuousShooting();

    this.trailTimer += delta;
    if (this.trailTimer > 16) {
      this.trailTimer = 0;
      this.trailPoints.push({
        x: this.sprite.x - 18,
        y: this.sprite.y,
        alpha: 1
      });
      if (this.trailPoints.length > 30) {
        this.trailPoints.shift();
      }
    }

    this.drawTrail();
    this.drawShip();

    const bullets = this.scene.bullets.getChildren() as Phaser.Physics.Arcade.Image[];
    bullets.forEach((bullet) => {
      if (bullet.active) {
        const updateFn = bullet.getData('updateGraphics') as () => void;
        if (updateFn) updateFn();
      }
    });
  }

  private handleMovement(dt: number): void {
    const accel = this.acceleration * this.slowdownMultiplier;
    const maxSpd = this.maxSpeed * this.slowdownMultiplier;

    if (this.keys.W.isDown || this.keys.A.isDown || this.keys.S.isDown || this.keys.D.isDown) {
      if (this.keys.W.isDown) this.velocityY -= accel * dt;
      if (this.keys.S.isDown) this.velocityY += accel * dt;
      if (this.keys.A.isDown) this.velocityX -= accel * dt;
      if (this.keys.D.isDown) this.velocityX += accel * dt;
    }

    this.velocityX *= this.damping;
    this.velocityY *= this.damping;

    this.velocityX = Phaser.Math.Clamp(this.velocityX, -maxSpd, maxSpd);
    this.velocityY = Phaser.Math.Clamp(this.velocityY, -maxSpd, maxSpd);

    let newX = this.sprite.x + this.velocityX * dt;
    let newY = this.sprite.y + this.velocityY * dt;

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const tunnelTop = 85;
    const tunnelBottom = height - 85;
    const minX = width * 0.06;
    const maxX = width * 0.7;

    newX = Phaser.Math.Clamp(newX, minX, maxX);
    newY = Phaser.Math.Clamp(newY, tunnelTop, tunnelBottom);

    this.sprite.setPosition(newX, newY);

    const tiltAngle = Phaser.Math.Clamp(this.velocityY / maxSpd, -1, 1) * 0.25;
    this.shipGraphics.setRotation(tiltAngle);
    this.engineGlow.setRotation(tiltAngle);
  }

  private handleContinuousShooting(): void {
    if (this.scene.input.activePointer.leftButtonDown()) {
      this.tryShoot();
    }
  }
}
