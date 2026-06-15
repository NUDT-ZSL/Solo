import Phaser from 'phaser';
import { GameScene, UnitData, MAP_WIDTH, MAP_HEIGHT } from '../GameScene';

const ENEMY_TYPES = ['melee', 'ranged', 'heavy'] as const;
type EnemyType = typeof ENEMY_TYPES[number];

const ENEMY_STATS: Record<EnemyType, Partial<UnitData>> = {
  melee: {
    type: 'enemy',
    hp: 50,
    maxHp: 50,
    speed: 90,
    attack: 10,
    attackRange: 30,
    attackCooldown: 900,
  },
  ranged: {
    type: 'enemy',
    hp: 30,
    maxHp: 30,
    speed: 70,
    attack: 14,
    attackRange: 160,
    attackCooldown: 1200,
  },
  heavy: {
    type: 'enemy',
    hp: 120,
    maxHp: 120,
    speed: 50,
    attack: 15,
    attackRange: 35,
    attackCooldown: 1500,
  },
};

export class EnemyAI {
  private scene: GameScene;
  private assaultMode = false;
  private waveTimer = 0;
  private waveCount = 0;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  public update(dt: number): void {
    this.scene.player.updateCooldowns(dt);
    this.waveTimer += dt;

    if (this.assaultMode && this.waveTimer >= 20) {
      this.waveTimer = 0;
      this.waveCount++;
      this.spawnAssaultWave();
    }

    this.updateEnemyBehavior();
  }

  public spawnPatrol(): void {
    const count = Phaser.Math.Between(2, 4);
    for (let i = 0; i < count; i++) {
      const type = ENEMY_TYPES[Phaser.Math.Between(0, 1)] as EnemyType;
      this.spawnEnemy(type);
    }
  }

  public startAssault(): void {
    this.assaultMode = true;
    this.waveTimer = 0;
    this.spawnAssaultWave();
  }

  private spawnAssaultWave(): void {
    const baseCount = 4 + Math.min(this.waveCount, 6);
    for (let i = 0; i < baseCount; i++) {
      const typeIdx = i < baseCount / 3
        ? 2
        : i < (baseCount * 2) / 3
          ? 0
          : 1;
      this.spawnEnemy(ENEMY_TYPES[typeIdx] as EnemyType);
    }
  }

  private spawnEnemy(type: EnemyType): void {
    const stats = ENEMY_STATS[type];
    const nestX = this.scene.enemyNestSprite.x;
    const nestY = this.scene.enemyNestSprite.y;
    const spawnX = nestX + Phaser.Math.Between(-50, 50);
    const spawnY = nestY + Phaser.Math.Between(-50, 50);

    const sprite = this.scene.add.sprite(spawnX, spawnY, 'enemy_bug').setDepth(3);
    sprite.setScale(0);
    this.scene.tweens.add({
      targets: sprite,
      scaleX: type === 'heavy' ? 1.4 : 1,
      scaleY: type === 'heavy' ? 1.4 : 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    if (type === 'heavy') {
      sprite.setTint(0xff4040);
    } else if (type === 'ranged') {
      sprite.setTint(0xffaa20);
    }

    const unit: UnitData = {
      sprite,
      type: 'enemy',
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
      team: 'enemy',
      slowTimer: 0,
    };

    this.scene.addEnemyUnit(unit);
  }

  private updateEnemyBehavior(): void {
    this.scene.enemyUnits.forEach((enemy) => {
      if (enemy.hp <= 0) return;

      if (enemy.target && (!enemy.target.sprite.active || enemy.target.hp <= 0)) {
        enemy.target = null;
      }

      if (!enemy.target) {
        enemy.target = this.findNearestPlayerUnit(enemy);
      }

      if (!enemy.target && this.scene.moonCoreActive) {
        const distToCore = Phaser.Math.Distance.Between(
          enemy.sprite.x, enemy.sprite.y,
          this.scene.moonCoreSprite.x, this.scene.moonCoreSprite.y,
        );
        if (distToCore > 60) {
          enemy.moveTarget = new Phaser.Math.Vector2(
            this.scene.moonCoreSprite.x,
            this.scene.moonCoreSprite.y,
          );
        }
      }

      if (!enemy.target && !enemy.moveTarget) {
        this.assignPatrolTarget(enemy);
      }
    });
  }

  private findNearestPlayerUnit(enemy: UnitData): UnitData | null {
    let nearest: UnitData | null = null;
    let minDist = Infinity;

    this.scene.playerUnits.forEach((pu) => {
      if (pu.hp <= 0) return;
      const dist = Phaser.Math.Distance.Between(
        enemy.sprite.x, enemy.sprite.y,
        pu.sprite.x, pu.sprite.y,
      );
      if (dist < minDist && dist < 250) {
        minDist = dist;
        nearest = pu;
      }
    });

    return nearest;
  }

  private assignPatrolTarget(enemy: UnitData): void {
    const patrolPoints = [
      new Phaser.Math.Vector2(MAP_WIDTH * 0.5, MAP_HEIGHT * 0.3),
      new Phaser.Math.Vector2(MAP_WIDTH * 0.5, MAP_HEIGHT * 0.7),
      new Phaser.Math.Vector2(MAP_WIDTH * 0.3, MAP_HEIGHT * 0.5),
      new Phaser.Math.Vector2(MAP_WIDTH * 0.7, MAP_HEIGHT * 0.5),
      new Phaser.Math.Vector2(MAP_WIDTH * 0.4, MAP_HEIGHT * 0.4),
      new Phaser.Math.Vector2(MAP_WIDTH * 0.6, MAP_HEIGHT * 0.6),
    ];

    const target = patrolPoints[Phaser.Math.Between(0, patrolPoints.length - 1)];
    enemy.moveTarget = target;
  }
}
