import Phaser from 'phaser';

export type EnemyType = 'normal' | 'fast' | 'tank' | 'boss';

interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  reward: number;
  textureKey: string;
  color: number;
  scale: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: {
    type: 'normal',
    hp: 60,
    speed: 40,
    reward: 10,
    textureKey: 'enemy_normal',
    color: 0x8bc34a,
    scale: 1,
  },
  fast: {
    type: 'fast',
    hp: 30,
    speed: 80,
    reward: 15,
    textureKey: 'enemy_fast',
    color: 0xffeb3b,
    scale: 0.85,
  },
  tank: {
    type: 'tank',
    hp: 150,
    speed: 25,
    reward: 25,
    textureKey: 'enemy_tank',
    color: 0xff5252,
    scale: 1.2,
  },
  boss: {
    type: 'boss',
    hp: 500,
    speed: 20,
    reward: 100,
    textureKey: 'enemy_boss',
    color: 0xe040fb,
    scale: 1.5,
  },
};

export class Enemy {
  public scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Arc;
  public type: EnemyType;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public reward: number;
  public isAlive: boolean = true;
  public config: EnemyConfig;

  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private slowTimer: Phaser.Time.TimerEvent | null = null;
  private originalSpeed: number;
  private glowEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    this.scene = scene;
    this.type = type;
    this.config = { ...ENEMY_CONFIGS[type] };
    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.speed = this.config.speed;
    this.originalSpeed = this.speed;
    this.reward = this.config.reward;

    this.sprite = scene.add.circle(x, y, 12, this.config.color, 0.9);
    this.sprite.setScale(this.config.scale);
    this.sprite.setData('isEnemy', true);
    this.sprite.setData('enemyInstance', this);
    this.sprite.setDepth(5);

    this.setupHealthBar();
    this.setupGlowEffect();
  }

  private setupHealthBar(): void {
    this.hpBarBg = this.scene.add.graphics();
    this.hpBar = this.scene.add.graphics();
    this.hpBarBg.setDepth(6);
    this.hpBar.setDepth(6);
    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    const barW = 30 * this.config.scale;
    const barH = 4;
    const offsetY = -18 * this.config.scale;

    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x1a0a2e, 0.8);
    this.hpBarBg.fillRect(this.sprite.x - barW / 2, this.sprite.y + offsetY, barW, barH);

    this.hpBar.clear();
    const ratio = Math.max(0, this.hp / this.maxHp);
    const barColor = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffeb3b : 0xff5252;
    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(this.sprite.x - barW / 2, this.sprite.y + offsetY, barW * ratio, barH);
  }

  private setupGlowEffect(): void {
    if (this.scene.textures.exists('particle_death')) {
      this.glowEmitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle_death', {
        speed: { min: 5, max: 15 },
        scale: { start: 0.3, end: 0 },
        lifespan: 600,
        frequency: 300,
        quantity: 1,
        blendMode: 'ADD',
        alpha: { start: 0.4, end: 0 },
        follow: this.sprite,
      });
      this.glowEmitter.setDepth(4);
    }
  }

  public update(delta: number, castleX: number): boolean {
    if (!this.isAlive) return false;

    const moveSpeed = (this.speed * delta) / 1000;
    this.sprite.x -= moveSpeed;

    this.updateHealthBar();

    if (this.sprite.x <= castleX) {
      this.reachCastle();
      return true;
    }

    return false;
  }

  public takeDamage(amount: number): void {
    if (!this.isAlive) return;

    this.hp -= amount;
    this.flashHit();

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  private flashHit(): void {
    this.sprite.setFillStyle(0xffffff, 1);
    this.scene.time.delayedCall(80, () => {
      if (this.isAlive) {
        this.sprite.setFillStyle(this.config.color, 0.9);
      }
    });
  }

  public applySlow(factor: number, duration: number): void {
    this.speed = this.originalSpeed * factor;

    if (this.slowTimer) {
      this.slowTimer.remove();
    }

    this.slowTimer = this.scene.time.delayedCall(duration, () => {
      this.speed = this.originalSpeed;
      this.slowTimer = null;
    });
  }

  private die(): void {
    this.isAlive = false;
    this.spawnDeathEffect();
    this.cleanup();
  }

  private reachCastle(): void {
    this.isAlive = false;
    this.cleanup();
  }

  private spawnDeathEffect(): void {
    if (this.scene.textures.exists('particle_death')) {
      const effect = this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle_death', {
        speed: { min: 40, max: 100 },
        scale: { start: 0.8, end: 0 },
        lifespan: { min: 300, max: 600 },
        quantity: 12,
        blendMode: 'ADD',
      });
      this.scene.time.delayedCall(700, () => effect.destroy());
    }

    if (this.scene.textures.exists('particle_gold')) {
      const goldEffect = this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle_gold', {
        speed: { min: 20, max: 50 },
        scale: { start: 0.5, end: 0 },
        lifespan: 500,
        quantity: 5,
        blendMode: 'ADD',
      });
      this.scene.time.delayedCall(600, () => goldEffect.destroy());
    }
  }

  private cleanup(): void {
    this.hpBarBg.destroy();
    this.hpBar.destroy();
    if (this.glowEmitter) {
      this.glowEmitter.stop();
      this.scene.time.delayedCall(1000, () => {
        if (this.glowEmitter && this.glowEmitter.scene) {
          this.glowEmitter.destroy();
        }
      });
    }
    if (this.slowTimer) {
      this.slowTimer.remove();
    }
    this.sprite.destroy();
  }
}
