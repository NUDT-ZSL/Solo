import Phaser from 'phaser';

export interface BezierPath {
  startX: number;
  startY: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
  endX: number;
  endY: number;
}

export class Monster {
  scene: Phaser.Scene;
  x: number;
  y: number;
  maxHealth: number;
  health: number;
  baseSpeed: number;
  speed: number;
  color: number;
  isElite: boolean;
  active: boolean;
  progress: number;
  path: BezierPath;
  slowEndTime: number;
  slowFactor: number;
  reachedEnd: boolean;

  body!: Phaser.GameObjects.Graphics;
  healthBar!: Phaser.GameObjects.Graphics;
  eliteGlow!: Phaser.GameObjects.Arc;

  constructor(
    scene: Phaser.Scene,
    path: BezierPath,
    health: number,
    speed: number,
    isElite: boolean = false
  ) {
    this.scene = scene;
    this.path = path;
    this.isElite = isElite;
    this.maxHealth = isElite ? health * 3 : health;
    this.health = this.maxHealth;
    this.baseSpeed = isElite ? speed * 0.7 : speed;
    this.speed = this.baseSpeed;
    this.color = isElite ? 0x660066 : 0x4a0080;
    this.active = true;
    this.progress = 0;
    this.slowEndTime = 0;
    this.slowFactor = 1;
    this.reachedEnd = false;

    const start = this.getPointOnPath(0);
    this.x = start.x;
    this.y = start.y;

    this.createVisuals();
  }

  createVisuals(): void {
    this.body = this.scene.add.graphics();
    this.healthBar = this.scene.add.graphics();

    const size = this.isElite ? 15 : 10;
    this.body.fillStyle(this.color, 1);
    this.body.fillCircle(0, 0, size);

    this.body.fillStyle(0x000000, 0.5);
    this.body.fillCircle(-3, -2, 2);
    this.body.fillCircle(3, -2, 2);

    this.body.fillStyle(0xff0000, 0.9);
    this.body.fillCircle(-3, -2, 1);
    this.body.fillCircle(3, -2, 1);

    if (this.isElite) {
      this.eliteGlow = this.scene.add.circle(0, 0, size + 6, 0xcc0000, 0.25);
      this.eliteGlow.setStrokeStyle(2, 0xff3333, 0.6);
      this.scene.tweens.add({
        targets: this.eliteGlow,
        scale: { from: 1, to: 1.2 },
        alpha: { from: 0.6, to: 0.3 },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
    }

    this.updateVisuals();
    this.updateHealthBar();
  }

  updateVisuals(): void {
    this.body.setPosition(this.x, this.y);
    this.healthBar.setPosition(this.x, this.y - (this.isElite ? 22 : 16));
    if (this.eliteGlow) {
      this.eliteGlow.setPosition(this.x, this.y);
    }
  }

  updateHealthBar(): void {
    this.healthBar.clear();
    const barWidth = this.isElite ? 30 : 22;
    const barHeight = this.isElite ? 5 : 3;
    const healthPct = Math.max(0, this.health / this.maxHealth);

    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(-barWidth / 2 - 1, -barHeight / 2 - 1, barWidth + 2, barHeight + 2);

    const bgColor = this.isElite ? 0x440000 : 0x330033;
    this.healthBar.fillStyle(bgColor, 1);
    this.healthBar.fillRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight);

    const fillColor = healthPct > 0.5 ? 0x00ff00 : healthPct > 0.25 ? 0xffff00 : 0xff0000;
    this.healthBar.fillStyle(fillColor, 1);
    this.healthBar.fillRect(-barWidth / 2, -barHeight / 2, barWidth * healthPct, barHeight);
  }

  getPointOnPath(t: number): { x: number; y: number } {
    const { startX, startY, controlX1, controlY1, controlX2, controlY2, endX, endY } = this.path;
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * startX + 3 * uu * t * controlX1 + 3 * u * tt * controlX2 + ttt * endX;
    const y = uuu * startY + 3 * uu * t * controlY1 + 3 * u * tt * controlY2 + ttt * endY;

    return { x, y };
  }

  update(delta: number, lighthouseX: number, lighthouseY: number): void {
    if (!this.active) return;

    const now = this.scene.time.now;
    if (now < this.slowEndTime) {
      this.speed = this.baseSpeed * this.slowFactor;
    } else {
      this.speed = this.baseSpeed;
      this.slowFactor = 1;
    }

    const totalPathLength = 1000;
    const progressDelta = (this.speed * delta) / totalPathLength / 1000;
    this.progress += progressDelta;

    if (this.progress >= 1) {
      this.progress = 1;
      this.reachedEnd = true;
      this.deactivate(false);
      return;
    }

    const pos = this.getPointOnPath(this.progress);
    this.x = pos.x;
    this.y = pos.y;

    this.updateVisuals();
  }

  applySlow(factor: number, duration: number): void {
    const newSlowFactor = 1 - factor;
    if (newSlowFactor < this.slowFactor || this.scene.time.now >= this.slowEndTime) {
      this.slowFactor = newSlowFactor;
    }
    this.slowEndTime = Math.max(this.slowEndTime, this.scene.time.now + duration);
  }

  takeDamage(amount: number): void {
    if (!this.active) return;
    this.health -= amount;
    this.updateHealthBar();

    this.scene.tweens.add({
      targets: this.body,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 50,
      yoyo: true
    });

    if (this.health <= 0) {
      this.deactivate(true);
    }
  }

  deactivate(killed: boolean): void {
    if (!this.active) return;
    this.active = false;

    if (killed) {
      this.createDeathParticles();
    }

    this.scene.time.delayedCall(50, () => {
      this.destroy();
    });
  }

  private createDeathParticles(): void {
    const particleCount = this.isElite ? 12 : 6 + Math.floor(Math.random() * 3);
    const baseColor = this.isElite ? 0xcc0000 : 0x8800aa;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = this.isElite
        ? 2 + Math.random() * 4
        : 2 + Math.random() * 2;

      const particle = this.scene.add.circle(this.x, this.y, size, baseColor, 0.8);

      if (this.isElite && Math.random() < 0.4) {
        particle.setFillStyle(0xff6600, 0.8);
      }

      this.scene.tweens.add({
        targets: particle,
        x: this.x + vx * 0.5,
        y: this.y + vy * 0.5,
        scale: { from: 1, to: 0.2 },
        alpha: { from: 0.8, to: 0 },
        duration: 500 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  destroy(): void {
    this.body.destroy();
    this.healthBar.destroy();
    if (this.eliteGlow) {
      this.scene.tweens.killTweensOf(this.eliteGlow);
      this.eliteGlow.destroy();
    }
  }
}
