import Phaser from 'phaser';
import { CREATURE_STATS, PATH_POINTS, FLYING_PATH } from '../config/gameConfig';
import type { ParticlePool } from '../utils/ParticlePool';

export type CreatureType = 'normal' | 'elite' | 'flying';

export class ShadowCreature {
  scene: Phaser.Scene;
  type: CreatureType;
  hp: number;
  maxHp: number;
  speed: number;
  color: number;
  size: number;

  container!: Phaser.GameObjects.Container;
  body!: Phaser.GameObjects.Arc;
  shadowTrail: { x: number; y: number; alpha: number; scale: number }[] = [];
  hpBarBg!: Phaser.GameObjects.Rectangle;
  hpBar!: Phaser.GameObjects.Rectangle;

  pathIndex: number = 0;
  pathProgress: number = 0;
  isFlying: boolean;
  alive: boolean = true;
  reachedEnd: boolean = false;
  flashTimer: number = 0;
  particlePool: ParticlePool;
  ref: ShadowCreature;

  afterimages: { sprite: Phaser.GameObjects.Arc; life: number; maxLife: number }[] = [];

  constructor(
    scene: Phaser.Scene,
    type: CreatureType,
    startX: number,
    startY: number,
    particlePool: ParticlePool
  ) {
    this.scene = scene;
    this.type = type;
    const stats = CREATURE_STATS[type];
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.speed = stats.speed;
    this.color = stats.color;
    this.size = stats.size;
    this.isFlying = type === 'flying';
    this.particlePool = particlePool;
    this.ref = this;
    this.createVisuals(startX, startY);
  }

  private createVisuals(x: number, y: number): void {
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(this.isFlying ? 35 : 30);

    for (let i = 0; i < 5; i++) {
      const after = this.scene.add.circle(0, 0, this.size * 0.9, this.color, 0.15);
      after.setAlpha(0);
      this.afterimages.push({ sprite: after, life: 0, maxLife: 0.35 });
      this.container.add(after);
    }

    this.body = this.scene.add.circle(0, 0, this.size, this.color, 0.9);
    this.body.setStrokeStyle(2, 0x000000, 0.6);
    if (this.type === 'elite') {
      this.body.setStrokeStyle(3, 0xffaa00, 0.9);
    }
    if (this.type === 'flying') {
      this.body.setStrokeStyle(2, 0xaaddff, 0.9);
    }
    this.container.add(this.body);

    const eyeColor = this.type === 'elite' ? 0xff0000 : 0xffff00;
    const eye1 = this.scene.add.circle(-this.size * 0.35, -this.size * 0.15, this.size * 0.18, eyeColor, 1);
    const eye2 = this.scene.add.circle(this.size * 0.35, -this.size * 0.15, this.size * 0.18, eyeColor, 1);
    this.container.add(eye1);
    this.container.add(eye2);

    this.hpBarBg = this.scene.add.rectangle(0, -this.size - 10, this.size * 2.4, 4, 0x000000, 0.7);
    this.hpBarBg.setStrokeStyle(1, 0x666666, 0.8);
    this.hpBar = this.scene.add.rectangle(-this.size * 1.2, -this.size - 10, this.size * 2.4, 4, 0x00ff00, 0.95);
    this.hpBar.setOrigin(0, 0.5);
    this.container.add(this.hpBarBg);
    this.container.add(this.hpBar);

    if (this.isFlying) {
      this.scene.tweens.add({
        targets: this.container,
        y: y + 6,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }

    this.scene.tweens.add({
      targets: this.body,
      scale: { from: 1, to: 1.06 },
      duration: 400 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  takeDamage(dmg: number, elementColor: number): boolean {
    if (!this.alive) return false;
    this.hp -= dmg;
    this.flashTimer = 0.1;
    this.body.setFillStyle(0xffffff, 1);
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width = this.size * 2.4 * ratio;
    if (ratio > 0.6) {
      this.hpBar.setFillStyle(0x00ff00, 0.95);
    } else if (ratio > 0.3) {
      this.hpBar.setFillStyle(0xffff00, 0.95);
    } else {
      this.hpBar.setFillStyle(0xff0000, 0.95);
    }
    this.particlePool.emit(this.x, this.y, 5 + Math.floor(Math.random() * 4), elementColor, {
      life: 0.5,
      minSpeed: 50,
      maxSpeed: 160,
      minSize: 2,
      maxSize: 4
    });
    if (this.hp <= 0) {
      this.alive = false;
      this.onDeath();
      return true;
    }
    return false;
  }

  private onDeath(): void {
    this.particlePool.emit(this.x, this.y, 18 + Math.floor(Math.random() * 8), this.color, {
      life: 0.9,
      maxSpeed: 230,
      minSize: 3,
      maxSize: 6,
      gravity: 40
    });
    this.scene.tweens.add({
      targets: this.container,
      scale: 1.8,
      alpha: 0,
      duration: 380,
      ease: 'Back.In',
      onComplete: () => {
        this.container.destroy();
      }
    });
  }

  update(dt: number): { reachedEnd: boolean; dead: boolean } {
    if (!this.alive) {
      return { reachedEnd: false, dead: true };
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.body.setFillStyle(this.color, 0.9);
      }
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const after = this.afterimages[i];
      after.life -= dt;
      if (after.life > 0) {
        after.sprite.setAlpha(Math.max(0, after.life / after.maxLife) * 0.35);
      } else {
        after.sprite.setAlpha(0);
      }
    }
    for (const after of this.afterimages) {
      if (after.life <= 0) {
        after.life = after.maxLife;
        after.sprite.x = this.body.x;
        after.sprite.y = this.body.y;
        break;
      }
    }

    const path = this.isFlying ? FLYING_PATH : PATH_POINTS;
    if (this.pathIndex >= path.length - 1) {
      this.reachedEnd = true;
      this.alive = false;
      this.container.destroy();
      return { reachedEnd: true, dead: false };
    }
    const current = path[this.pathIndex];
    const next = path[this.pathIndex + 1];
    const segDx = next.x - current.x;
    const segDy = next.y - current.y;
    const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
    const moveAmount = this.speed * dt;
    this.pathProgress += moveAmount / segLen;
    while (this.pathProgress >= 1 && this.pathIndex < path.length - 1) {
      this.pathProgress -= 1;
      this.pathIndex++;
      if (this.pathIndex >= path.length - 1) {
        this.reachedEnd = true;
        this.alive = false;
        this.container.destroy();
        return { reachedEnd: true, dead: false };
      }
    }
    const cur = path[this.pathIndex];
    const nxt = path[this.pathIndex + 1];
    const newX = cur.x + (nxt.x - cur.x) * this.pathProgress;
    const newY = cur.y + (nxt.y - cur.y) * this.pathProgress;
    this.container.x = newX;
    if (!this.isFlying) {
      this.container.y = newY;
    } else {
      this.container.y = newY + Math.sin(performance.now() * 0.005 + this.pathIndex) * 5;
    }
    return { reachedEnd: false, dead: false };
  }
}
