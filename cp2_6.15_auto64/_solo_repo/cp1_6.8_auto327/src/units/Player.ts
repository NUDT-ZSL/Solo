import Phaser from 'phaser';
import { GameScene, UnitData, CreepNode, MAP_WIDTH } from '../GameScene';

const SUMMON_COSTS: Record<string, number> = {
  spike: 30,
  shield: 40,
  plague: 50,
};

const SUMMON_COOLDOWNS: Record<string, number> = {
  spike: 3,
  shield: 5,
  plague: 7,
};

const UNIT_STATS: Record<string, Partial<UnitData>> = {
  spike: {
    type: 'spike',
    hp: 40,
    maxHp: 40,
    speed: 120,
    attack: 12,
    attackRange: 150,
    attackCooldown: 800,
  },
  shield: {
    type: 'shield',
    hp: 100,
    maxHp: 100,
    speed: 70,
    attack: 8,
    attackRange: 30,
    attackCooldown: 1000,
  },
  plague: {
    type: 'plague',
    hp: 35,
    maxHp: 35,
    speed: 90,
    attack: 6,
    attackRange: 100,
    attackCooldown: 2000,
  },
  worker: {
    type: 'worker',
    hp: 20,
    maxHp: 20,
    speed: 80,
    attack: 0,
    attackRange: 0,
    attackCooldown: 0,
  },
};

const TEXTURE_MAP: Record<string, string> = {
  spike: 'spike_bug',
  shield: 'shield_bug',
  plague: 'plague_bug',
  worker: 'worker_bug',
};

export class Player {
  private scene: GameScene;
  private sprite: Phaser.GameObjects.Sprite;

  private summonCooldowns: Record<string, number> = {
    spike: 0,
    shield: 0,
    plague: 0,
  };

  constructor(scene: GameScene) {
    this.scene = scene;

    this.sprite = scene.add.sprite(250, MAP_WIDTH < 1000 ? 400 : 1200, 'ancient_worm')
      .setDepth(3)
      .setScale(1.5);

    this.addGlowEffect();
    this.addIdleAnimation();
  }

  private addGlowEffect(): void {
    const glow = this.scene.add.circle(
      this.sprite.x, this.sprite.y, 36, 0x9b30ff, 0.15,
    ).setDepth(2);

    this.scene.tweens.add({
      targets: glow,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        glow.setPosition(this.sprite.x, this.sprite.y);
      },
    });
  }

  private addIdleAnimation(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 4,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public summonUnit(type: 'spike' | 'shield' | 'plague'): void {
    const cost = SUMMON_COSTS[type];
    if (this.scene.energy < cost) return;
    if (this.summonCooldowns[type] > 0) return;

    this.scene.energy -= cost;
    this.summonCooldowns[type] = SUMMON_COOLDOWNS[type];

    const stats = UNIT_STATS[type]!;
    const offsetX = Phaser.Math.Between(-40, 40);
    const offsetY = Phaser.Math.Between(-40, 40);
    const spawnX = Phaser.Math.Clamp(this.sprite.x + offsetX, 20, 3180);
    const spawnY = Phaser.Math.Clamp(this.sprite.y + offsetY, 20, 2380);

    const unitSprite = this.scene.add.sprite(spawnX, spawnY, TEXTURE_MAP[type]!)
      .setDepth(3);
    unitSprite.setScale(0);
    this.scene.tweens.add({
      targets: unitSprite,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    const unit: UnitData = {
      sprite: unitSprite,
      type: stats.type as UnitData['type'],
      hp: stats.hp!,
      maxHp: stats.maxHp!,
      speed: stats.speed!,
      attack: stats.attack!,
      attackRange: stats.attackRange!,
      attackCooldown: stats.attackCooldown!,
      lastAttackTime: 0,
      target: null,
      moveTarget: null,
      isSelected: false,
      team: 'player',
      slowTimer: 0,
    };

    this.scene.addPlayerUnit(unit);
    this.spawnSummonEffect(spawnX, spawnY);
  }

  public deployWorker(node: CreepNode): void {
    if (this.scene.energy < 10) return;
    this.scene.energy -= 10;

    const stats = UNIT_STATS['worker']!;
    const spawnX = this.sprite.x + Phaser.Math.Between(-20, 20);
    const spawnY = this.sprite.y + Phaser.Math.Between(-20, 20);

    const unitSprite = this.scene.add.sprite(spawnX, spawnY, 'worker_bug')
      .setDepth(3);

    const unit: UnitData = {
      sprite: unitSprite,
      type: 'worker',
      hp: stats.hp!,
      maxHp: stats.maxHp!,
      speed: stats.speed!,
      attack: 0,
      attackRange: 0,
      attackCooldown: 0,
      lastAttackTime: 0,
      target: null,
      moveTarget: new Phaser.Math.Vector2(node.pos.x, node.pos.y),
      isSelected: false,
      team: 'player',
      slowTimer: 0,
    };

    this.scene.addPlayerUnit(unit);
    this.spawnSummonEffect(spawnX, spawnY);
  }

  private spawnSummonEffect(x: number, y: number): void {
    const ring = this.scene.add.circle(x, y, 5, 0x9b30ff, 0.4).setDepth(4);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
  }

  public updateCooldowns(dt: number): void {
    (Object.keys(this.summonCooldowns) as Array<'spike' | 'shield' | 'plague'>).forEach((key) => {
      if (this.summonCooldowns[key] > 0) {
        this.summonCooldowns[key] = Math.max(0, this.summonCooldowns[key] - dt);
      }
    });
  }

  public getCooldown(type: 'spike' | 'shield' | 'plague'): number {
    return this.summonCooldowns[type];
  }

  public getSummonCost(type: 'spike' | 'shield' | 'plague'): number {
    return SUMMON_COSTS[type];
  }

  public getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }
}
