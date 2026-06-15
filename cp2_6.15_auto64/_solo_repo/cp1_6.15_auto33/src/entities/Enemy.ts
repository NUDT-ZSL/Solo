import Phaser from 'phaser';
import { EnemyType } from '../managers/WaveManager';
import { ResourceManager } from '../managers/ResourceManager';

export interface EnemyStats {
  hp: number;
  speed: number;
  armor: number;
  reward: number;
  lifeDamage: number;
  color: number;
  size: number;
}

export const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  [EnemyType.NORMAL]: {
    hp: 50,
    speed: 60,
    armor: 0,
    reward: 10,
    lifeDamage: 1,
    color: 0x4ade80,
    size: 14
  },
  [EnemyType.HEAVY]: {
    hp: 150,
    speed: 30,
    armor: 5,
    reward: 25,
    lifeDamage: 2,
    color: 0xef4444,
    size: 20
  },
  [EnemyType.FAST]: {
    hp: 30,
    speed: 110,
    armor: 0,
    reward: 15,
    lifeDamage: 1,
    color: 0x3b82f6,
    size: 11
  }
};

export class Enemy extends Phaser.GameObjects.Container {
  private _type: EnemyType;
  private _stats: EnemyStats;
  private _maxHp: number;
  private _currentHp: number;
  private _path: Phaser.Geom.Point[];
  private _pathIndex: number = 0;
  private _isAlive: boolean = true;
  private _reachedEnd: boolean = false;
  private _slowTimer: number = 0;
  private _slowFactor: number = 1;
  private _baseSpeed: number;

  private _body: Phaser.GameObjects.Arc;
  private _hpBarBg: Phaser.GameObjects.Rectangle;
  private _hpBar: Phaser.GameObjects.Rectangle;
  private _hitFlashTween: Phaser.Tweens.Tween | null = null;

  private _onDeath: ((enemy: Enemy) => void) | null = null;
  private _onReachEnd: ((enemy: Enemy) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType,
    path: Phaser.Geom.Point[]
  ) {
    super(scene, x, y);
    this._type = type;
    this._stats = { ...ENEMY_STATS[type] };
    this._maxHp = this._stats.hp;
    this._currentHp = this._maxHp;
    this._baseSpeed = this._stats.speed;
    this._path = path;

    this.setDepth(50);

    this._body = scene.add.circle(0, 0, this._stats.size, this._stats.color);
    this._body.setStrokeStyle(2, 0x1e1b4b, 1);

    this._hpBarBg = scene.add.rectangle(0, -this._stats.size - 10, this._stats.size * 2, 4, 0x1f2937);
    this._hpBarBg.setOrigin(0.5, 0.5);

    this._hpBar = scene.add.rectangle(-this._stats.size, -this._stats.size - 10, this._stats.size * 2, 4, 0x22c55e);
    this._hpBar.setOrigin(0, 0.5);

    this.add([this._body, this._hpBarBg, this._hpBar]);
    scene.add.existing(this);

    if (this._path.length > 0) {
      this.setPosition(this._path[0].x, this._path[0].y);
    }
  }

  public get enemyType(): EnemyType {
    return this._type;
  }

  public get isAlive(): boolean {
    return this._isAlive;
  }

  public get reachedEnd(): boolean {
    return this._reachedEnd;
  }

  public onDeath(callback: (enemy: Enemy) => void): void {
    this._onDeath = callback;
  }

  public onReachEnd(callback: (enemy: Enemy) => void): void {
    this._onReachEnd = callback;
  }

  public takeDamage(damage: number, slowAmount: number = 0, slowDuration: number = 0): void {
    if (!this._isAlive) return;

    const actualDamage = Math.max(1, damage - this._stats.armor);
    this._currentHp = Math.max(0, this._currentHp - actualDamage);

    this._updateHpBar();
    this._flashHit();

    if (slowAmount > 0 && slowDuration > 0) {
      this._applySlow(slowAmount, slowDuration);
    }

    if (this._currentHp <= 0) {
      this._die();
    }
  }

  private _updateHpBar(): void {
    const hpPercent = this._currentHp / this._maxHp;
    this._hpBar.width = this._stats.size * 2 * hpPercent;

    if (hpPercent > 0.5) {
      this._hpBar.setFillStyle(0x22c55e);
    } else if (hpPercent > 0.25) {
      this._hpBar.setFillStyle(0xeab308);
    } else {
      this._hpBar.setFillStyle(0xef4444);
    }
  }

  private _flashHit(): void {
    if (this._hitFlashTween) {
      this._hitFlashTween.remove();
    }

    this._body.setFillStyle(0xffffff);
    this._hitFlashTween = this.scene.tweens.add({
      targets: this._body,
      duration: 100,
      onComplete: () => {
        this._body.setFillStyle(this._stats.color);
        this._hitFlashTween = null;
      }
    });
  }

  private _applySlow(amount: number, duration: number): void {
    const newFactor = 1 - amount;
    if (newFactor < this._slowFactor) {
      this._slowFactor = newFactor;
    }
    this._slowTimer = Math.max(this._slowTimer, duration);
    this._body.setStrokeStyle(2, 0x60a5fa, 1);
  }

  private _die(): void {
    this._isAlive = false;

    ResourceManager.getInstance().addGold(this._stats.reward);
    ResourceManager.getInstance().addScore(this._stats.reward * 10);

    this._spawnDeathParticles();

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      onComplete: () => {
        if (this._onDeath) {
          this._onDeath(this);
        }
        this.destroy();
      }
    });
  }

  private _spawnDeathParticles(): void {
    const particles = this.scene.add.particles(this.x, this.y, undefined, {
      tint: this._stats.color,
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 400,
      quantity: 12,
      gravityY: 200
    });

    this.scene.time.delayedCall(500, () => {
      particles.destroy();
    });
  }

  public update(time: number, delta: number): void {
    if (!this._isAlive) return;

    if (this._slowTimer > 0) {
      this._slowTimer -= delta;
      if (this._slowTimer <= 0) {
        this._slowFactor = 1;
        this._slowTimer = 0;
        this._body.setStrokeStyle(2, 0x1e1b4b, 1);
      }
    }

    this._moveAlongPath(delta);
  }

  private _moveAlongPath(delta: number): void {
    if (this._pathIndex >= this._path.length - 1) {
      if (!this._reachedEnd) {
        this._reachedEnd = true;
        ResourceManager.getInstance().loseLives(this._stats.lifeDamage);
        if (this._onReachEnd) {
          this._onReachEnd(this);
        }
        this.destroy();
      }
      return;
    }

    const target = this._path[this._pathIndex + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const currentSpeed = this._baseSpeed * this._slowFactor;
    const moveDistance = currentSpeed * (delta / 1000);

    if (distance <= moveDistance) {
      this.setPosition(target.x, target.y);
      this._pathIndex++;
    } else {
      const ratio = moveDistance / distance;
      this.setPosition(this.x + dx * ratio, this.y + dy * ratio);
    }

    if (Math.abs(dx) > 0.01) {
      this._body.scaleX = dx > 0 ? 1 : -1;
    }
  }

  public destroy(fromScene?: boolean): void {
    if (this._hitFlashTween) {
      this._hitFlashTween.remove();
    }
    super.destroy(fromScene);
  }
}
