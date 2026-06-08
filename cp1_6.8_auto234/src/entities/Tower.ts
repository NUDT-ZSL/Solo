import Phaser from 'phaser';

export type TowerType = 'fire' | 'ice' | 'lightning';

interface TowerConfig {
  type: TowerType;
  damage: number;
  range: number;
  fireRate: number;
  color: number;
  textureKey: string;
  projKey: string;
  particleKey: string;
  slowFactor?: number;
  splashRadius?: number;
}

const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  fire: {
    type: 'fire',
    damage: 25,
    range: 200,
    fireRate: 800,
    color: 0xff6b35,
    textureKey: 'fire_tower',
    projKey: 'proj_fire',
    particleKey: 'particle_fire',
    splashRadius: 60,
  },
  ice: {
    type: 'ice',
    damage: 12,
    range: 180,
    fireRate: 600,
    color: 0x4fc3f7,
    textureKey: 'ice_tower',
    projKey: 'proj_ice',
    particleKey: 'particle_ice',
    slowFactor: 0.4,
  },
  lightning: {
    type: 'lightning',
    damage: 40,
    range: 250,
    fireRate: 1200,
    color: 0xbb86fc,
    textureKey: 'lightning_tower',
    projKey: 'proj_lightning',
    particleKey: 'particle_lightning',
  },
};

export class Tower extends Phaser.GameObjects.Container {
  public towerType: TowerType;
  public level: number = 1;
  public config: TowerConfig;
  public sprite!: Phaser.GameObjects.Image;
  private rangeCircle!: Phaser.GameObjects.Graphics;
  private lastFireTime: number = 0;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private target: Phaser.GameObjects.Arc | null = null;
  private showRange: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: TowerType) {
    super(scene, x, y);
    this.towerType = type;
    this.config = { ...TOWER_CONFIGS[type] };
    this.setupVisuals();
    this.setupParticleEffect();
    scene.add.existing(this);
  }

  private setupVisuals(): void {
    this.sprite = this.scene.add.image(0, 0, this.config.textureKey);
    this.add(this.sprite);

    this.rangeCircle = this.scene.add.graphics();
    this.rangeCircle.setVisible(false);
    this.add(this.rangeCircle);
    this.drawRange();

    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerover', () => {
      this.showRange = true;
      this.rangeCircle.setVisible(true);
    });
    this.sprite.on('pointerout', () => {
      this.showRange = false;
      this.rangeCircle.setVisible(false);
    });
  }

  private drawRange(): void {
    this.rangeCircle.clear();
    this.rangeCircle.lineStyle(1, this.config.color, 0.3);
    this.rangeCircle.fillStyle(this.config.color, 0.05);
    this.rangeCircle.fillCircle(0, 0, this.config.range);
    this.rangeCircle.strokeCircle(0, 0, this.config.range);
  }

  private setupParticleEffect(): void {
    if (this.scene.textures.exists(this.config.particleKey)) {
      this.emitter = this.scene.add.particles(0, -6, this.config.particleKey, {
        speed: { min: 10, max: 30 },
        scale: { start: 0.5, end: 0 },
        lifespan: { min: 200, max: 600 },
        quantity: 1,
        frequency: 200,
        blendMode: 'ADD',
        emitting: false,
      });
      this.add(this.emitter);
    }
  }

  private startEmitting(): void {
    if (this.emitter && !this.emitter.emitting) {
      this.emitter.emitting = true;
    }
  }

  private stopEmitting(): void {
    if (this.emitter && this.emitter.emitting) {
      this.emitter.emitting = false;
    }
  }

  public findTarget(enemies: Phaser.GameObjects.Arc[]): Phaser.GameObjects.Arc | null {
    let closest: Phaser.GameObjects.Arc | null = null;
    let closestDist = this.config.range;

    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }

    this.target = closest;
    if (closest) {
      this.startEmitting();
    } else {
      this.stopEmitting();
    }
    return closest;
  }

  public tryFire(time: number): Phaser.GameObjects.Arc | null {
    if (!this.target || !this.target.active) return null;
    if (time - this.lastFireTime < this.config.fireRate) return null;
    this.lastFireTime = time;
    return this.target;
  }

  public fireProjectile(target: Phaser.GameObjects.Arc): void {
    const proj = this.scene.add.image(this.x, this.y - 6, this.config.projKey);
    proj.setScale(0.8);
    proj.setDepth(10);

    const emitParticle = () => {
      if (this.scene.textures.exists(this.config.particleKey)) {
        const p = this.scene.add.particles(proj.x, proj.y, this.config.particleKey, {
          speed: { min: 5, max: 15 },
          scale: { start: 0.3, end: 0 },
          lifespan: 300,
          quantity: 1,
          blendMode: 'ADD',
        });
        this.scene.time.delayedCall(300, () => p.destroy());
      }
    };

    this.scene.tweens.add({
      targets: proj,
      x: target.x,
      y: target.y,
      duration: 200,
      ease: 'Linear',
      onUpdate: emitParticle,
      onComplete: () => {
        proj.destroy();
        this.onHit(target);
      },
    });
  }

  private onHit(target: Phaser.GameObjects.Arc): void {
    if (!target.active) return;

    const enemy = target.getData('enemyInstance');
    if (enemy) {
      enemy.takeDamage(this.config.damage);

      if (this.config.type === 'ice' && this.config.slowFactor) {
        enemy.applySlow(this.config.slowFactor, 2000);
      }

      if (this.config.type === 'fire' && this.config.splashRadius) {
        this.splashDamage(target.x, target.y, this.config.splashRadius);
      }
    }

    this.spawnHitEffect(target.x, target.y);
  }

  private splashDamage(x: number, y: number, radius: number): void {
    const scene = this.scene as Phaser.Scene;
    const enemies = scene.children.list.filter(
      (c) => c instanceof Phaser.GameObjects.Arc && c.active && c.getData('isEnemy')
    ) as Phaser.GameObjects.Arc[];

    for (const e of enemies) {
      const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (dist <= radius && dist > 0) {
        const enemy = e.getData('enemyInstance');
        if (enemy) {
          enemy.takeDamage(Math.floor(this.config.damage * 0.4));
        }
      }
    }
  }

  private spawnHitEffect(x: number, y: number): void {
    if (this.scene.textures.exists(this.config.particleKey)) {
      const effect = this.scene.add.particles(x, y, this.config.particleKey, {
        speed: { min: 30, max: 80 },
        scale: { start: 0.6, end: 0 },
        lifespan: 400,
        quantity: 8,
        blendMode: 'ADD',
      });
      this.scene.time.delayedCall(500, () => effect.destroy());
    }
  }

  public upgrade(): number {
    const cost = this.getUpgradeCost();
    this.level++;
    this.config.damage = Math.floor(this.config.damage * 1.5);
    this.config.range = Math.floor(this.config.range * 1.1);
    this.config.fireRate = Math.max(200, Math.floor(this.config.fireRate * 0.85));
    this.drawRange();
    this.playUpgradeEffect();
    return cost;
  }

  public getUpgradeCost(): number {
    return 50 * this.level;
  }

  private playUpgradeEffect(): void {
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, this.config.color, 1);
    ring.strokeCircle(this.x, this.y, 10);
    this.add(ring);

    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 500,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
  }

  public destroy(fromScene?: boolean): void {
    this.stopEmitting();
    super.destroy(fromScene);
  }
}
