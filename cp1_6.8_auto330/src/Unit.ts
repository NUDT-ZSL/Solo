import Phaser from 'phaser';

export enum UnitType {
  Worker = 'worker',
  Spike = 'spike',
  Shield = 'shield',
  Plague = 'plague',
  Enemy = 'enemy',
  EnemyAoe = 'enemy_aoe',
}

export interface UnitConfig {
  texture: string;
  maxHp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  unitType: UnitType;
  bodySize: { width: number; height: number };
}

const UNIT_CONFIGS: Record<string, UnitConfig> = {
  [UnitType.Worker]: {
    texture: 'worker_bug',
    maxHp: 30,
    speed: 80,
    attackDamage: 0,
    attackRange: 0,
    attackCooldown: 0,
    unitType: UnitType.Worker,
    bodySize: { width: 20, height: 16 },
  },
  [UnitType.Spike]: {
    texture: 'spike_bug',
    maxHp: 50,
    speed: 100,
    attackDamage: 18,
    attackRange: 200,
    attackCooldown: 1200,
    unitType: UnitType.Spike,
    bodySize: { width: 24, height: 18 },
  },
  [UnitType.Shield]: {
    texture: 'shield_bug',
    maxHp: 150,
    speed: 60,
    attackDamage: 12,
    attackRange: 40,
    attackCooldown: 800,
    unitType: UnitType.Shield,
    bodySize: { width: 28, height: 28 },
  },
  [UnitType.Plague]: {
    texture: 'plague_bug',
    maxHp: 60,
    speed: 75,
    attackDamage: 8,
    attackRange: 120,
    attackCooldown: 2000,
    unitType: UnitType.Plague,
    bodySize: { width: 24, height: 20 },
  },
  [UnitType.Enemy]: {
    texture: 'enemy_unit',
    maxHp: 60,
    speed: 70,
    attackDamage: 10,
    attackRange: 35,
    attackCooldown: 1000,
    unitType: UnitType.Enemy,
    bodySize: { width: 20, height: 16 },
  },
  [UnitType.EnemyAoe]: {
    texture: 'enemy_unit',
    maxHp: 80,
    speed: 55,
    attackDamage: 15,
    attackRange: 100,
    attackCooldown: 2500,
    unitType: UnitType.EnemyAoe,
    bodySize: { width: 22, height: 18 },
  },
};

export class Unit extends Phaser.Physics.Arcade.Sprite {
  public unitType: UnitType;
  public maxHp: number;
  public hp: number;
  public speed: number;
  public attackDamage: number;
  public attackRange: number;
  public attackCooldown: number;
  public lastAttackTime: number = 0;
  public isSelected: boolean = false;
  public targetPoint: Phaser.Math.Vector2 | null = null;
  public targetEnemy: Unit | null = null;
  public slowFactor: number = 1;
  public slowTimer: number = 0;
  public isOnHighland: boolean = false;
  public isPlayerUnit: boolean = true;
  public trailParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  protected selectionCircle: Phaser.GameObjects.Arc | null = null;
  protected hpBar: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, typeKey: string, isPlayer: boolean = true) {
    const config = UNIT_CONFIGS[typeKey];
    if (!config) throw new Error(`Unknown unit type: ${typeKey}`);

    super(scene, x, y, config.texture);

    this.unitType = config.unitType;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.speed = config.speed;
    this.attackDamage = config.attackDamage;
    this.attackRange = config.attackRange;
    this.attackCooldown = config.attackCooldown;
    this.isPlayerUnit = isPlayer;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(config.bodySize.width, config.bodySize.height);
    body.setOffset(
      (this.width - config.bodySize.width) / 2,
      (this.height - config.bodySize.height) / 2
    );
    body.setCollideWorldBounds(true);

    this.setDepth(10);
    this.setupTrail(scene);
  }

  private setupTrail(scene: Phaser.Scene): void {
    if (!scene.textures.exists('particle')) return;
    try {
      this.trailParticles = scene.add.particles(this.x, this.y, 'particle', {
        speed: { min: 5, max: 15 },
        lifespan: 300,
        quantity: 1,
        frequency: 80,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.6, end: 0 },
        blendMode: 'ADD',
        emitting: false,
      });
      this.trailParticles.setDepth(5);
    } catch {
      this.trailParticles = null;
    }
  }

  setSelected(selected: boolean): void {
    this.isSelected = selected;
    if (selected) {
      if (!this.selectionCircle) {
        this.selectionCircle = this.scene.add.circle(this.x, this.y, 18, 0xc084fc, 0.3);
        this.selectionCircle.setStrokeStyle(1.5, 0xc084fc, 0.8);
        this.selectionCircle.setDepth(9);
      }
    } else {
      if (this.selectionCircle) {
        this.selectionCircle.destroy();
        this.selectionCircle = null;
      }
    }
  }

  moveToward(target: Phaser.Math.Vector2): void {
    this.targetPoint = target;
    this.targetEnemy = null;
  }

  attackTarget(enemy: Unit): void {
    this.targetEnemy = enemy;
    this.targetPoint = null;
  }

  takeDamage(amount: number): void {
    if (this.isOnHighland) {
      amount = Math.floor(amount * 0.7);
    }
    this.hp -= amount;
    this.flashDamage();
    this.updateHpBar();
    if (this.hp <= 0) {
      this.die();
    }
  }

  applySlow(factor: number, duration: number): void {
    this.slowFactor = factor;
    this.slowTimer = duration;
  }

  update(time: number, delta: number): void {
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowFactor = 1;
        this.slowTimer = 0;
      }
    }

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.targetEnemy && this.targetEnemy.active) {
      const dist = Phaser.Math.Distance.Between(
        this.x, this.y, this.targetEnemy.x, this.targetEnemy.y
      );
      if (dist <= this.attackRange) {
        body.setVelocity(0, 0);
        this.tryAttack(time);
      } else {
        this.moveTowardPoint(this.targetEnemy.x, this.targetEnemy.y, body);
      }
    } else if (this.targetPoint) {
      const dist = Phaser.Math.Distance.Between(
        this.x, this.y, this.targetPoint.x, this.targetPoint.y
      );
      if (dist < 5) {
        body.setVelocity(0, 0);
        this.targetPoint = null;
      } else {
        this.moveTowardPoint(this.targetPoint.x, this.targetPoint.y, body);
      }
    } else {
      body.setVelocity(0, 0);
    }

    this.updateVisuals();
  }

  protected moveTowardPoint(tx: number, ty: number, body: Phaser.Physics.Arcade.Body): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    const effectiveSpeed = this.speed * this.slowFactor;
    body.setVelocity(
      Math.cos(angle) * effectiveSpeed,
      Math.sin(angle) * effectiveSpeed
    );
  }

  protected tryAttack(time: number): void {
    if (time - this.lastAttackTime < this.attackCooldown) return;
    if (!this.targetEnemy || !this.targetEnemy.active) return;
    this.lastAttackTime = time;
    this.performAttack();
  }

  protected performAttack(): void {
    if (!this.targetEnemy) return;
    this.targetEnemy.takeDamage(this.attackDamage);
    this.spawnAttackEffect();
  }

  protected spawnAttackEffect(): void {
    if (!this.targetEnemy) return;
    const scene = this.scene;
    const px = this.targetEnemy.x;
    const py = this.targetEnemy.y;
    try {
      if (scene.textures.exists('particle')) {
        const emitter = scene.add.particles(px, py, 'particle', {
          speed: { min: 20, max: 60 },
          lifespan: 250,
          quantity: 6,
          scale: { start: 0.6, end: 0 },
          alpha: { start: 0.9, end: 0 },
          blendMode: 'ADD',
        });
        scene.time.delayedCall(300, () => {
          if (emitter && emitter.active) emitter.destroy();
        });
      }
    } catch { /* ignore */ }
  }

  protected flashDamage(): void {
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });
  }

  protected updateHpBar(): void {
    if (!this.hpBar) {
      this.hpBar = this.scene.add.graphics();
      this.hpBar.setDepth(15);
    }
    this.hpBar.clear();
    const bw = 28;
    const bx = this.x - bw / 2;
    const by = this.y - this.height / 2 - 8;
    this.hpBar.fillStyle(0x1a0a2e, 0.7);
    this.hpBar.fillRect(bx, by, bw, 4);
    const ratio = Math.max(0, this.hp / this.maxHp);
    const hpColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
    this.hpBar.fillStyle(hpColor, 0.9);
    this.hpBar.fillRect(bx, by, bw * ratio, 4);
  }

  protected updateVisuals(): void {
    if (this.selectionCircle) {
      this.selectionCircle.setPosition(this.x, this.y);
    }
    if (this.hpBar && this.hp < this.maxHp) {
      this.updateHpBar();
    }
    if (this.trailParticles) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const isMoving = body.speed > 10;
      this.trailParticles.setPosition(this.x, this.y);
      this.trailParticles.emitting = isMoving;
    }
  }

  protected die(): void {
    this.hp = 0;
    this.setSelected(false);
    if (this.hpBar) {
      this.hpBar.destroy();
      this.hpBar = null;
    }
    if (this.trailParticles) {
      this.trailParticles.destroy();
      this.trailParticles = null;
    }
    if (this.selectionCircle) {
      this.selectionCircle.destroy();
      this.selectionCircle = null;
    }
    this.destroy();
  }
}

export class SpikeBug extends Unit {
  constructor(scene: Phaser.Scene, x: number, y: number, isPlayer: boolean = true) {
    super(scene, x, y, UnitType.Spike, isPlayer);
  }

  protected performAttack(): void {
    if (!this.targetEnemy) return;
    this.fireProjectile(this.targetEnemy);
  }

  private fireProjectile(target: Unit): void {
    const scene = this.scene;
    const proj = scene.physics.add.sprite(this.x, this.y, 'projectile');
    proj.setDepth(12);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const body = proj.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);

    scene.physics.add.overlap(proj, target, () => {
      if (target.active) target.takeDamage(this.attackDamage);
      proj.destroy();
    });

    scene.time.delayedCall(1500, () => {
      if (proj.active) proj.destroy();
    });
  }
}

export class ShieldBug extends Unit {
  constructor(scene: Phaser.Scene, x: number, y: number, isPlayer: boolean = true) {
    super(scene, x, y, UnitType.Shield, isPlayer);
  }

  takeDamage(amount: number): void {
    const reduced = Math.floor(amount * 0.75);
    super.takeDamage(reduced);
  }
}

export class PlagueBug extends Unit {
  private plagueRange: number = 80;

  constructor(scene: Phaser.Scene, x: number, y: number, isPlayer: boolean = true) {
    super(scene, x, y, UnitType.Plague, isPlayer);
  }

  protected performAttack(): void {
    if (!this.targetEnemy) return;
    this.targetEnemy.takeDamage(this.attackDamage);
    this.targetEnemy.applySlow(0.4, 3000);
    this.areaSlow();
    this.spawnPlagueEffect();
  }

  private areaSlow(): void {
    const scene = this.scene;
    const units = scene.physics.overlapCirc(this.targetEnemy!.x, this.targetEnemy!.y, this.plagueRange) as unknown;
    // Phaser's overlapCirc returns { body: ArcadeBody }[]
    // We'll use a simpler approach: iterate enemy units from GameScene
  }

  private spawnPlagueEffect(): void {
    if (!this.targetEnemy) return;
    const scene = this.scene;
    const ring = scene.add.circle(
      this.targetEnemy.x, this.targetEnemy.y,
      this.plagueRange,
      0x22c55e, 0.15
    );
    ring.setStrokeStyle(2, 0x84cc16, 0.4);
    ring.setDepth(8);
    scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      onComplete: () => ring.destroy(),
    });
  }
}

export class WorkerBug extends Unit {
  public targetNode: Phaser.GameObjects.Sprite | null = null;
  public isGathering: boolean = false;
  public carryAmount: number = 0;
  public maxCarry: number = 10;
  public gatherRate: number = 2;
  private gatherTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, UnitType.Worker, true);
  }

  setGatherTarget(node: Phaser.GameObjects.Sprite): void {
    this.targetNode = node;
    this.isGathering = false;
    this.carryAmount = 0;
    this.moveToward(new Phaser.Math.Vector2(node.x, node.y));
  }

  update(time: number, delta: number): void {
    if (this.targetNode && this.targetNode.active) {
      const dist = Phaser.Math.Distance.Between(
        this.x, this.y, this.targetNode.x, this.targetNode.y
      );
      if (dist < 30) {
        this.isGathering = true;
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        this.gatherTimer += delta;
        if (this.gatherTimer >= 1000) {
          this.gatherTimer = 0;
          this.carryAmount = Math.min(this.carryAmount + this.gatherRate, this.maxCarry);
        }
      }
    }
    super.update(time, delta);
  }
}

export class EnemyUnit extends Unit {
  constructor(scene: Phaser.Scene, x: number, y: number, isAoe: boolean = false) {
    super(scene, x, y, isAoe ? UnitType.EnemyAoe : UnitType.Enemy, false);
  }

  protected performAttack(): void {
    if (!this.targetEnemy) return;
    if (this.unitType === UnitType.EnemyAoe) {
      this.aoeAttack();
    } else {
      this.targetEnemy.takeDamage(this.attackDamage);
    }
    this.spawnAttackEffect();
  }

  private aoeAttack(): void {
    if (!this.targetEnemy) return;
    const scene = this.scene;
    const ring = scene.add.circle(
      this.targetEnemy.x, this.targetEnemy.y,
      this.attackRange,
      0xef4444, 0.15
    );
    ring.setStrokeStyle(2, 0xef4444, 0.4);
    ring.setDepth(8);
    scene.tweens.add({
      targets: ring,
      alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy(),
    });
    this.targetEnemy.takeDamage(this.attackDamage);
  }
}
