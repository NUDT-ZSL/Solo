import Phaser from 'phaser';
import { Enemy } from './Enemy';

export enum TowerType {
  ARROW = 'arrow',
  CANNON = 'cannon',
  MAGIC = 'magic',
  ICE = 'ice',
  ELECTRIC = 'electric'
}

export interface TowerLevelStats {
  damage: number;
  range: number;
  fireRate: number;
  upgradeCost: number;
  size: number;
  projectileSpeed: number;
  splashRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
  chainCount?: number;
  chainRange?: number;
}

export interface TowerConfig {
  name: string;
  cost: number;
  color: number;
  projectileColor: number;
  description: string;
  levels: TowerLevelStats[];
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  [TowerType.ARROW]: {
    name: '箭塔',
    cost: 50,
    color: 0x8b4513,
    projectileColor: 0xdeb887,
    description: '快速单体攻击',
    levels: [
      { damage: 15, range: 150, fireRate: 600, upgradeCost: 75, size: 16, projectileSpeed: 500 },
      { damage: 30, range: 170, fireRate: 500, upgradeCost: 150, size: 20, projectileSpeed: 550 },
      { damage: 55, range: 190, fireRate: 400, upgradeCost: 0, size: 24, projectileSpeed: 600 }
    ]
  },
  [TowerType.CANNON]: {
    name: '炮塔',
    cost: 100,
    color: 0x4a4a4a,
    projectileColor: 0xff6600,
    description: '范围溅射伤害',
    levels: [
      { damage: 35, range: 130, fireRate: 1200, upgradeCost: 150, size: 18, projectileSpeed: 350, splashRadius: 50 },
      { damage: 65, range: 150, fireRate: 1100, upgradeCost: 250, size: 22, projectileSpeed: 380, splashRadius: 65 },
      { damage: 110, range: 170, fireRate: 950, upgradeCost: 0, size: 26, projectileSpeed: 420, splashRadius: 80 }
    ]
  },
  [TowerType.MAGIC]: {
    name: '魔法塔',
    cost: 120,
    color: 0x9333ea,
    projectileColor: 0xc084fc,
    description: '高伤害魔法弹',
    levels: [
      { damage: 50, range: 160, fireRate: 900, upgradeCost: 180, size: 17, projectileSpeed: 400 },
      { damage: 90, range: 180, fireRate: 800, upgradeCost: 280, size: 21, projectileSpeed: 450 },
      { damage: 150, range: 200, fireRate: 700, upgradeCost: 0, size: 25, projectileSpeed: 500 }
    ]
  },
  [TowerType.ICE]: {
    name: '冰冻塔',
    cost: 90,
    color: 0x0ea5e9,
    projectileColor: 0x7dd3fc,
    description: '减速敌人',
    levels: [
      { damage: 10, range: 140, fireRate: 700, upgradeCost: 130, size: 16, projectileSpeed: 450, slowAmount: 0.3, slowDuration: 1500 },
      { damage: 20, range: 160, fireRate: 650, upgradeCost: 220, size: 20, projectileSpeed: 480, slowAmount: 0.45, slowDuration: 2000 },
      { damage: 35, range: 180, fireRate: 600, upgradeCost: 0, size: 24, projectileSpeed: 520, slowAmount: 0.6, slowDuration: 2500 }
    ]
  },
  [TowerType.ELECTRIC]: {
    name: '电塔',
    cost: 150,
    color: 0xeab308,
    projectileColor: 0xfde047,
    description: '链式闪电攻击',
    levels: [
      { damage: 25, range: 150, fireRate: 850, upgradeCost: 200, size: 17, projectileSpeed: 800, chainCount: 2, chainRange: 100 },
      { damage: 45, range: 170, fireRate: 750, upgradeCost: 320, size: 21, projectileSpeed: 900, chainCount: 3, chainRange: 120 },
      { damage: 75, range: 190, fireRate: 650, upgradeCost: 0, size: 25, projectileSpeed: 1000, chainCount: 5, chainRange: 140 }
    ]
  }
};

interface Projectile {
  sprite: Phaser.GameObjects.Arc;
  target: Enemy | null;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  type: TowerType;
  splashRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
  chainCount?: number;
  chainRange?: number;
  hitEnemies: Set<Enemy>;
}

export class Tower extends Phaser.GameObjects.Container {
  private _type: TowerType;
  private _config: TowerConfig;
  private _level: number = 0;
  private _gridX: number;
  private _gridY: number;
  private _lastFireTime: number = 0;
  private _enemies: Enemy[];
  private _target: Enemy | null = null;
  private _projectiles: Projectile[] = [];
  private _isSelected: boolean = false;

  private _base: Phaser.GameObjects.Rectangle;
  private _body: Phaser.GameObjects.Arc;
  private _accent: Phaser.GameObjects.Arc;
  private _rangeCircle: Phaser.GameObjects.Arc | null = null;
  private _levelIndicators: Phaser.GameObjects.Arc[] = [];
  private _fireFlashTween: Phaser.Tweens.Tween | null = null;
  private _effects: Phaser.GameObjects.Arc[] = [];

  public onUpgrade: ((tower: Tower) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    gridX: number,
    gridY: number,
    type: TowerType,
    enemies: Enemy[]
  ) {
    super(scene, x, y);
    this._type = type;
    this._config = TOWER_CONFIGS[type];
    this._gridX = gridX;
    this._gridY = gridY;
    this._enemies = enemies;

    this.setDepth(30);

    this._base = scene.add.rectangle(0, 4, 28, 10, 0x1e1b4b);
    this._base.setAlpha(0.8);

    this._body = scene.add.circle(0, 0, this._config.levels[0].size, this._config.color);
    this._body.setStrokeStyle(3, 0x0f172a, 1);

    this._accent = scene.add.circle(0, -2, this._config.levels[0].size * 0.45, 0xffffff);
    this._accent.setAlpha(0.25);

    this.add([this._base, this._body, this._accent]);

    this._playPlaceAnimation();

    scene.add.existing(this);
  }

  public get towerType(): TowerType {
    return this._type;
  }

  public get gridX(): number {
    return this._gridX;
  }

  public get gridY(): number {
    return this._gridY;
  }

  public get level(): number {
    return this._level;
  }

  public get currentStats(): TowerLevelStats {
    return this._config.levels[this._level];
  }

  public get config(): TowerConfig {
    return this._config;
  }

  public get isMaxLevel(): boolean {
    return this._level >= this._config.levels.length - 1;
  }

  public get upgradeCost(): number {
    if (this.isMaxLevel) return 0;
    return this._config.levels[this._level].upgradeCost;
  }

  public setSelected(selected: boolean): void {
    this._isSelected = selected;
    if (selected) {
      this._showRange();
    } else {
      this._hideRange();
    }
  }

  private _showRange(): void {
    if (this._rangeCircle) return;
    this._rangeCircle = this.scene.add.circle(this.x, this.y, this.currentStats.range, 0x60a5fa, 0.12);
    this._rangeCircle.setStrokeStyle(2, 0x60a5fa, 0.5);
    this._rangeCircle.setDepth(25);
  }

  private _hideRange(): void {
    if (this._rangeCircle) {
      this._rangeCircle.destroy();
      this._rangeCircle = null;
    }
  }

  public upgrade(): boolean {
    if (this.isMaxLevel) return false;

    this._level++;
    this._updateVisuals();
    this._playUpgradeAnimation();

    if (this._isSelected) {
      this._hideRange();
      this._showRange();
    }

    if (this.onUpgrade) {
      this.onUpgrade(this);
    }

    return true;
  }

  private _updateVisuals(): void {
    const stats = this.currentStats;

    this._body.setRadius(stats.size);
    this._accent.setRadius(stats.size * 0.45);

    this._levelIndicators.forEach((ind) => ind.destroy());
    this._levelIndicators = [];

    for (let i = 0; i <= this._level; i++) {
      const indicator = this.scene.add.circle(
        -10 + i * 10,
        stats.size + 8,
        3,
        0xfbbf24
      );
      this.add(indicator);
      this._levelIndicators.push(indicator);
    }

    this._effects.forEach((e) => e.destroy());
    this._effects = [];

    if (this._level >= 1) {
      const ring = this.scene.add.circle(0, 0, stats.size + 5, undefined);
      ring.setStrokeStyle(2, this._config.color, 0.6);
      this.add(ring);
      this._effects.push(ring);
    }

    if (this._level >= 2) {
      const glow = this.scene.add.circle(0, 0, stats.size + 10, this._config.projectileColor, 0.15);
      this.add(glow);
      this._effects.push(glow);

      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.1, to: 0.3 },
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
    }
  }

  private _playPlaceAnimation(): void {
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  private _playUpgradeAnimation(): void {
    const stats = this.currentStats;
    const baseSize = stats.size;

    for (let i = 0; i < 4; i++) {
      const ring = this.scene.add.graphics();
      ring.setPosition(this.x, this.y);
      ring.setDepth(this.depth + 10 + i);
      ring.lineStyle(3, this._config.projectileColor, 0.8 - i * 0.15);
      ring.strokeCircle(0, 0, baseSize + 10);
      ring.setAlpha(0);

      this.scene.tweens.add({
        targets: ring,
        scaleX: { from: 0.4, to: 2.5 + i * 0.3 },
        scaleY: { from: 0.4, to: 2.5 + i * 0.3 },
        alpha: { from: 0.9, to: 0 },
        duration: 500 + i * 80,
        delay: i * 60,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });
    }

    const flash = this.scene.add.circle(this.x, this.y, baseSize + 8, 0xffffff, 0);
    flash.setDepth(this.depth + 15);

    this.scene.tweens.add({
      targets: flash,
      alpha: 1,
      scaleX: { from: 0.6, to: 1.8 },
      scaleY: { from: 0.6, to: 1.8 },
      duration: 125,
      ease: 'Cubic.easeOut',
      yoyo: true,
      hold: 0,
      onComplete: () => flash.destroy()
    });

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 120,
      ease: 'Back.easeIn'
    });

    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      delay: 120,
      ease: 'Elastic.easeOut',
      easeParams: [1, 0.5]
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      const particle = this.scene.add.circle(
        this.x + Math.cos(angle) * 15,
        this.y + Math.sin(angle) * 15,
        4 + Math.random() * 3,
        this._config.projectileColor
      );
      particle.setDepth(this.depth + 8);

      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist - 30,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1, to: 0 },
        scaleY: { from: 1, to: 0 },
        duration: 500 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    for (let i = 0; i < 6; i++) {
      const spark = this.scene.add.circle(
        this.x + (Math.random() - 0.5) * baseSize,
        this.y,
        3,
        0xffffff
      );
      spark.setDepth(this.depth + 12);

      this.scene.tweens.add({
        targets: spark,
        y: this.y - 60 - Math.random() * 40,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1, to: 0.5 },
        scaleY: { from: 1, to: 0.5 },
        duration: 600 + Math.random() * 200,
        delay: Math.random() * 100,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy()
      });
    }

    const glow = this.scene.add.circle(this.x, this.y, baseSize + 20, this._config.projectileColor, 0);
    glow.setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.4,
      scaleX: { from: 0.8, to: 1.5 },
      scaleY: { from: 0.8, to: 1.5 },
      duration: 300,
      ease: 'Cubic.easeOut',
      yoyo: true,
      hold: 0,
      onComplete: () => glow.destroy()
    });
  }

  public update(time: number, delta: number): void {
    if (!this.active) return;

    this._findTarget();
    this._fire(time);
    this._updateProjectiles(delta);
  }

  private _findTarget(): void {
    this._target = null;
    let minDistance = Infinity;
    const range = this.currentStats.range;

    for (const enemy of this._enemies) {
      if (!enemy.active || !enemy.isAlive) continue;

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range && dist < minDistance) {
        minDistance = dist;
        this._target = enemy;
      }
    }
  }

  private _fire(time: number): void {
    if (!this._target) return;

    const stats = this.currentStats;
    if (time - this._lastFireTime < stats.fireRate) return;

    this._lastFireTime = time;
    this._flashOnFire();
    this._createProjectile();
  }

  private _flashOnFire(): void {
    if (this._fireFlashTween) {
      this._fireFlashTween.remove();
    }

    this._body.setFillStyle(0xffffff);
    this._fireFlashTween = this.scene.tweens.add({
      targets: this._body,
      duration: 80,
      onComplete: () => {
        this._body.setFillStyle(this._config.color);
        this._fireFlashTween = null;
      }
    });
  }

  private _createProjectile(): void {
    if (!this._target) return;

    const stats = this.currentStats;

    const sprite = this.scene.add.circle(this.x, this.y, 5, this._config.projectileColor);
    sprite.setDepth(60);

    const projectile: Projectile = {
      sprite,
      target: this._target,
      targetX: this._target.x,
      targetY: this._target.y,
      speed: stats.projectileSpeed,
      damage: stats.damage,
      type: this._type,
      splashRadius: stats.splashRadius,
      slowAmount: stats.slowAmount,
      slowDuration: stats.slowDuration,
      chainCount: stats.chainCount,
      chainRange: stats.chainRange,
      hitEnemies: new Set()
    };

    if (this._target) {
      projectile.hitEnemies.add(this._target);
    }

    this._projectiles.push(projectile);
  }

  private _updateProjectiles(delta: number): void {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i];

      if (p.target && p.target.active && p.target.isAlive) {
        p.targetX = p.target.x;
        p.targetY = p.target.y;
      }

      const dx = p.targetX - p.sprite.x;
      const dy = p.targetY - p.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDist = p.speed * (delta / 1000);

      if (dist <= moveDist) {
        this._handleProjectileHit(p);
        p.sprite.destroy();
        this._projectiles.splice(i, 1);
      } else {
        const ratio = moveDist / dist;
        p.sprite.x += dx * ratio;
        p.sprite.y += dy * ratio;

        if (p.type === TowerType.ELECTRIC) {
          const trail = this.scene.add.circle(p.sprite.x, p.sprite.y, 3, p.type === TowerType.ELECTRIC ? 0xfde047 : 0x7dd3fc, 0.6);
          this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 150,
            onComplete: () => trail.destroy()
          });
        }
      }
    }
  }

  private _handleProjectileHit(p: Projectile): void {
    if (p.splashRadius && p.splashRadius > 0) {
      this._applySplashDamage(p);
    } else if (p.type === TowerType.ELECTRIC && p.chainCount && p.chainCount > 0) {
      this._applyChainLightning(p);
    } else {
      if (p.target && p.target.active && p.target.isAlive) {
        p.target.takeDamage(p.damage, p.slowAmount, p.slowDuration);
      }
    }
  }

  private _applySplashDamage(p: Projectile): void {
    const explosion = this.scene.add.circle(p.targetX, p.targetY, 5, 0xff6600, 0.8);
    explosion.setDepth(70);
    this.scene.tweens.add({
      targets: explosion,
      scaleX: (p.splashRadius || 50) / 5,
      scaleY: (p.splashRadius || 50) / 5,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => explosion.destroy()
    });

    const radius = p.splashRadius || 50;
    for (const enemy of this._enemies) {
      if (!enemy.active || !enemy.isAlive) continue;
      const dx = enemy.x - p.targetX;
      const dy = enemy.y - p.targetY;
      if (dx * dx + dy * dy <= radius * radius) {
        enemy.takeDamage(p.damage, p.slowAmount, p.slowDuration);
      }
    }
  }

  private _applyChainLightning(p: Projectile): void {
    if (p.target && p.target.active && p.target.isAlive) {
      p.target.takeDamage(p.damage, p.slowAmount, p.slowDuration);
    }

    let currentX = p.targetX;
    let currentY = p.targetY;
    let remainingChains = p.chainCount || 0;
    const hitEnemies = new Set<Enemy>(p.hitEnemies);
    const chainRange = p.chainRange || 100;

    const drawChain = (fromX: number, fromY: number, toX: number, toY: number) => {
      const graphics = this.scene.add.graphics();
      graphics.lineStyle(3, 0xfde047, 0.9);
      graphics.beginPath();
      graphics.moveTo(fromX, fromY);

      const segments = 5;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const x = Phaser.Math.Linear(fromX, toX, t) + (Math.random() - 0.5) * 10;
        const y = Phaser.Math.Linear(fromY, toY, t) + (Math.random() - 0.5) * 10;
        graphics.lineTo(x, y);
      }
      graphics.strokePath();
      graphics.setDepth(65);

      this.scene.tweens.add({
        targets: graphics,
        alpha: 0,
        duration: 200,
        onComplete: () => graphics.destroy()
      });
    };

    const findNextTarget = (x: number, y: number): Enemy | null => {
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;

      for (const enemy of this._enemies) {
        if (!enemy.active || !enemy.isAlive || hitEnemies.has(enemy)) continue;
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= chainRange && dist < nearestDist) {
          nearestDist = dist;
          nearest = enemy;
        }
      }
      return nearest;
    };

    const processChain = () => {
      if (remainingChains <= 0) return;

      const next = findNextTarget(currentX, currentY);
      if (!next) return;

      drawChain(currentX, currentY, next.x, next.y);
      next.takeDamage(p.damage * 0.7, p.slowAmount, p.slowDuration);
      hitEnemies.add(next);
      currentX = next.x;
      currentY = next.y;
      remainingChains--;

      this.scene.time.delayedCall(60, processChain);
    };

    processChain();
  }

  public destroy(fromScene?: boolean): void {
    this._hideRange();
    this._projectiles.forEach((p) => p.sprite.destroy());
    this._projectiles = [];
    this._effects.forEach((e) => e.destroy());
    this._effects = [];
    if (this._fireFlashTween) {
      this._fireFlashTween.remove();
    }
    super.destroy(fromScene);
  }
}
