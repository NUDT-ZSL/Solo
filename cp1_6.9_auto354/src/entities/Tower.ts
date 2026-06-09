import Phaser from 'phaser';
import { Monster } from './Monster';

export type TowerType = 'fire' | 'ice' | 'lightning';

export interface TowerConfig {
  type: TowerType;
  name: string;
  baseDamage: number;
  baseRange: number;
  baseAttackInterval: number;
  cost: number;
  color: number;
  projectileColor: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  fire: {
    type: 'fire',
    name: '火焰塔',
    baseDamage: 30,
    baseRange: 120,
    baseAttackInterval: 800,
    cost: 80,
    color: 0xff6600,
    projectileColor: 0xff8800
  },
  ice: {
    type: 'ice',
    name: '冰霜塔',
    baseDamage: 15,
    baseRange: 150,
    baseAttackInterval: 1000,
    cost: 60,
    color: 0x66ccff,
    projectileColor: 0xaaddff
  },
  lightning: {
    type: 'lightning',
    name: '闪电塔',
    baseDamage: 40,
    baseRange: 80,
    baseAttackInterval: 1200,
    cost: 120,
    color: 0x9966ff,
    projectileColor: 0x66aaff
  }
};

export class Tower {
  scene: Phaser.Scene;
  x: number;
  y: number;
  type: TowerType;
  level: number;
  damage: number;
  range: number;
  attackInterval: number;
  lastAttackTime: number;
  isFlooded: boolean;
  totalSpent: number;
  baseCost: number;

  towerBody!: Phaser.GameObjects.Graphics;
  rangeCircle!: Phaser.GameObjects.Arc;
  floodIndicator!: Phaser.GameObjects.Arc;

  private fireAnimTimer?: Phaser.Time.TimerEvent;
  private upgradeFlashTimer?: Phaser.Time.TimerEvent;
  private upgradeFlash?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = 1;
    this.isFlooded = false;
    this.totalSpent = 0;

    const config = TOWER_CONFIGS[type];
    this.baseCost = config.cost;
    this.totalSpent = config.cost;
    this.damage = config.baseDamage;
    this.range = config.baseRange;
    this.attackInterval = config.baseAttackInterval;
    this.lastAttackTime = 0;

    this.createVisuals();
    this.playBuildAnimation();
  }

  createVisuals(): void {
    const config = TOWER_CONFIGS[this.type];

    this.towerBody = this.scene.add.graphics();
    this.drawTower();

    this.rangeCircle = this.scene.add.circle(this.x, this.y, this.range, 0xffffff, 0);
    this.rangeCircle.setStrokeStyle(1, 0xffffff, 0.3);
    this.rangeCircle.setVisible(false);

    this.floodIndicator = this.scene.add.circle(this.x, this.y, 22, 0x0066cc, 0);
    this.floodIndicator.setStrokeStyle(2, 0x00aaff, 0.6);
    this.floodIndicator.setVisible(false);
  }

  drawTower(): void {
    const config = TOWER_CONFIGS[this.type];
    this.towerBody.clear();

    this.towerBody.fillStyle(0x5a5a5a, 1);
    this.towerBody.fillCircle(this.x, this.y + 2, 18);

    this.towerBody.fillStyle(0x7a7a7a, 1);
    this.towerBody.fillCircle(this.x, this.y, 16);

    this.towerBody.fillStyle(config.color, 1);
    this.towerBody.fillCircle(this.x, this.y, 12);

    this.towerBody.fillStyle(0xffffff, 0.3);
    this.towerBody.fillCircle(this.x - 3, this.y - 3, 4);

    if (this.level >= 2) {
      this.towerBody.fillStyle(0xffd700, 1);
      this.towerBody.fillCircle(this.x + 8, this.y - 10, 3);
    }
    if (this.level >= 3) {
      this.towerBody.fillStyle(0xffd700, 1);
      this.towerBody.fillCircle(this.x - 8, this.y - 10, 3);
      this.towerBody.fillCircle(this.x, this.y - 12, 3);
    }
  }

  playBuildAnimation(): void {
    this.towerBody.setScale(0.1);
    this.scene.tweens.add({
      targets: this.towerBody,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  showRange(visible: boolean): void {
    this.rangeCircle.setVisible(visible);
  }

  setFlooded(flooded: boolean): void {
    this.isFlooded = flooded;
    this.floodIndicator.setVisible(flooded);

    if (flooded) {
      this.scene.tweens.add({
        targets: this.floodIndicator,
        alpha: { from: 0.4, to: 0.8 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.scene.tweens.killTweensOf(this.floodIndicator);
      this.floodIndicator.setAlpha(0.6);
    }
  }

  getEffectiveAttackInterval(): number {
    return this.isFlooded ? this.attackInterval * 2 : this.attackInterval;
  }

  upgrade(): boolean {
    if (this.level >= 3) return false;

    const upgradeCost = this.level === 1 ? 100 : 200;
    const multiplier = this.level === 1 ? 1.5 : 2.5;
    const rangeBonus = this.level === 1 ? 20 : 40;

    this.damage = Math.round(TOWER_CONFIGS[this.type].baseDamage * multiplier);
    this.range = TOWER_CONFIGS[this.type].baseRange + rangeBonus;
    this.totalSpent += upgradeCost;
    this.level++;

    this.rangeCircle.setRadius(this.range);
    this.drawTower();

    this.upgradeFlash = this.scene.add.circle(this.x, this.y, 20, 0xffd700, 0.6);
    this.upgradeFlash.setStrokeStyle(3, 0xffff00, 0.8);
    this.upgradeFlash.setDepth(this.towerBody.depth + 1);
    this.scene.tweens.add({
      targets: this.upgradeFlash,
      alpha: { from: 0.8, to: 0 },
      scale: { from: 1, to: 1.5 },
      duration: 500,
      onComplete: () => {
        if (this.upgradeFlash) {
          this.upgradeFlash.destroy();
          this.upgradeFlash = undefined;
        }
      }
    });

    return true;
  }

  getUpgradeCost(): number {
    if (this.level >= 3) return 0;
    return this.level === 1 ? 100 : 200;
  }

  getSellValue(): number {
    const baseValue = this.baseCost * 0.5;
    const upgradesValue = (this.totalSpent - this.baseCost) * 0.3;
    return Math.floor(baseValue + upgradesValue);
  }

  attack(target: Monster, monsters: Monster[]): void {
    const now = this.scene.time.now;
    const effectiveInterval = this.getEffectiveAttackInterval();

    if (now - this.lastAttackTime < effectiveInterval) return;
    this.lastAttackTime = now;

    switch (this.type) {
      case 'fire':
        this.fireAttack(target);
        break;
      case 'ice':
        this.iceAttack(target);
        break;
      case 'lightning':
        this.lightningAttack(target, monsters);
        break;
    }
  }

  private fireAttack(target: Monster): void {
    const config = TOWER_CONFIGS.fire;
    const projectile = this.scene.add.circle(this.x, this.y - 5, 5, config.projectileColor);
    projectile.setStrokeStyle(1, 0xffff00, 0.8);

    const glow = this.scene.add.circle(this.x, this.y - 5, 8, 0xff4400, 0.3);

    const duration = 200;
    const startX = this.x;
    const startY = this.y - 5;

    this.scene.tweens.add({
      targets: [projectile, glow],
      x: target.x,
      y: target.y,
      duration: duration,
      onUpdate: (tween) => {
        const progress = tween.progress;
        const offset = Math.sin(progress * Math.PI) * 10;
        projectile.x = Phaser.Math.Linear(startX, target.x, progress) + offset * 0.3;
        projectile.y = Phaser.Math.Linear(startY, target.y, progress) + offset * 0.3;
        glow.x = projectile.x;
        glow.y = projectile.y;
        glow.setAlpha(0.3 + Math.sin(progress * Math.PI * 4) * 0.2);
      },
      onComplete: () => {
        projectile.destroy();
        glow.destroy();
        if (target.active) {
          target.takeDamage(this.damage);
          this.createFireEffect(target);
        }
      }
    });
  }

  private createFireEffect(target: Monster): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 8;
      const fx = target.x + Math.cos(angle) * dist;
      const fy = target.y + Math.sin(angle) * dist;

      const flame = this.scene.add.circle(fx, fy, 3, 0xff6600, 0.9);
      this.scene.tweens.add({
        targets: flame,
        x: target.x + Math.cos(angle) * 12,
        y: target.y + Math.sin(angle) * 12 - 5,
        scale: { from: 1, to: 0.2 },
        alpha: { from: 0.9, to: 0 },
        tint: { from: 0xffff00, to: 0xff2200 },
        duration: 300,
        onComplete: () => flame.destroy()
      });
    }
  }

  private iceAttack(target: Monster): void {
    const config = TOWER_CONFIGS.ice;
    const projectile = this.scene.add.circle(this.x, this.y - 5, 4, config.projectileColor);
    projectile.setStrokeStyle(1, 0xffffff, 0.6);

    this.scene.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      duration: 250,
      ease: 'Linear',
      onComplete: () => {
        projectile.destroy();
        if (target.active) {
          target.takeDamage(this.damage);
          target.applySlow(0.3, 2000);
          this.createIceEffect(target);
        }
      }
    });
  }

  private createIceEffect(target: Monster): void {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 8;
      const shard = this.scene.add.circle(
        target.x + Math.cos(angle) * dist,
        target.y + Math.sin(angle) * dist,
        2,
        0xaaddff,
        0.8
      );
      this.scene.tweens.add({
        targets: shard,
        x: target.x + Math.cos(angle) * 18,
        y: target.y + Math.sin(angle) * 18 - 3,
        alpha: { from: 0.8, to: 0 },
        scale: { from: 1, to: 0 },
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy()
      });
    }
  }

  private lightningAttack(target: Monster, monsters: Monster[]): void {
    this.createLightningBolt(this.x, this.y - 5, target.x, target.y, 3, 0x66aaff);

    if (target.active) {
      target.takeDamage(this.damage);
    }

    let currentTarget = target;
    let remainingDamage = this.damage;
    const hitTargets = new Set<Monster>([target]);

    for (let chain = 0; chain < 2; chain++) {
      const nearby = monsters.filter(m =>
        m.active && !hitTargets.has(m) &&
        Phaser.Math.Distance.Between(currentTarget.x, currentTarget.y, m.x, m.y) <= 80
      );

      if (nearby.length === 0) break;

      nearby.sort((a, b) =>
        Phaser.Math.Distance.Between(currentTarget.x, currentTarget.y, a.x, a.y) -
        Phaser.Math.Distance.Between(currentTarget.x, currentTarget.y, b.x, b.y)
      );

      const nextTarget = nearby[0];
      remainingDamage *= 0.5;

      this.createLightningBolt(currentTarget.x, currentTarget.y, nextTarget.x, nextTarget.y,
        2 - chain, 0xaaddff);

      if (nextTarget.active) {
        nextTarget.takeDamage(remainingDamage);
        this.createChainEffect(nextTarget);
      }

      hitTargets.add(nextTarget);
      currentTarget = nextTarget;
    }
  }

  private createLightningBolt(
    x1: number, y1: number, x2: number, y2: number, width: number, color: number
  ): void {
    const points: Phaser.Math.Vector2[] = [];
    const segments = 6;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = Phaser.Math.Linear(x1, x2, t);
      const py = Phaser.Math.Linear(y1, y2, t);

      if (i > 0 && i < segments) {
        const offset = (Math.random() - 0.5) * 12;
        const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
        points.push(new Phaser.Math.Vector2(
          px + Math.cos(angle) * offset,
          py + Math.sin(angle) * offset
        ));
      } else {
        points.push(new Phaser.Math.Vector2(px, py));
      }
    }

    const graphics = this.scene.add.graphics();
    graphics.lineStyle(width, color, 0.9);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.strokePath();

    graphics.lineStyle(width + 2, color, 0.3);
    graphics.strokePath();

    this.scene.tweens.add({
      targets: graphics,
      alpha: { from: 1, to: 0 },
      duration: 150,
      onComplete: () => graphics.destroy()
    });
  }

  private createChainEffect(target: Monster): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 10;
      const spark = this.scene.add.circle(
        target.x + Math.cos(angle) * dist,
        target.y + Math.sin(angle) * dist,
        1.5,
        0x88ccff,
        0.9
      );
      this.scene.tweens.add({
        targets: spark,
        x: target.x + Math.cos(angle) * 16,
        y: target.y + Math.sin(angle) * 16,
        alpha: { from: 0.9, to: 0 },
        duration: 200,
        onComplete: () => spark.destroy()
      });
    }
  }

  findTarget(monsters: Monster[]): Monster | null {
    let closest: Monster | null = null;
    let closestDist = this.range;

    for (const m of monsters) {
      if (!m.active) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      if (dist <= this.range && dist < closestDist) {
        closest = m;
        closestDist = dist;
      }
    }

    return closest;
  }

  destroy(): void {
    this.towerBody.destroy();
    this.rangeCircle.destroy();
    this.floodIndicator.destroy();
  }
}
