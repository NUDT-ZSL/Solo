import Phaser from 'phaser';
import { Unit, EnemyUnit, UnitType } from './Unit';
import { Player } from './Player';

export interface EnemyAIConfig {
  hiveX: number;
  hiveY: number;
  patrolInterval: number;
  moonCoreX: number;
  moonCoreY: number;
}

export class EnemyAI {
  public hive: Phaser.Physics.Arcade.Sprite;
  public hiveHp: number = 500;
  public hiveMaxHp: number = 500;
  public units: EnemyUnit[] = [];
  public moonCoreActive: boolean = false;
  public moonCoreAttackWave: boolean = false;

  private scene: Phaser.Scene;
  private player: Player;
  private config: EnemyAIConfig;
  private patrolTimer: number = 0;
  private moonCoreTimer: number = 0;
  private moonCoreCountdown: number = 0;
  private hivePulse: Phaser.GameObjects.Arc | null = null;

  constructor(scene: Phaser.Scene, player: Player, config: EnemyAIConfig) {
    this.scene = scene;
    this.player = player;
    this.config = config;

    this.hive = scene.physics.add.sprite(config.hiveX, config.hiveY, 'enemy_hive');
    this.hive.setDepth(10);
    this.hive.setImmovable(true);
    const body = this.hive.body as Phaser.Physics.Arcade.Body;
    body.setSize(56, 56);
    body.setOffset(4, 4);

    this.setupHiveGlow();
  }

  private setupHiveGlow(): void {
    const scene = this.scene;
    this.hivePulse = scene.add.circle(
      this.hive.x, this.hive.y,
      42, 0xef4444, 0.1
    );
    this.hivePulse.setDepth(9);
    scene.tweens.add({
      targets: this.hivePulse,
      scale: 1.2,
      alpha: 0.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  takeHiveDamage(amount: number): void {
    this.hiveHp -= amount;
    if (this.hivePulse) {
      this.scene.tweens.add({
        targets: this.hivePulse,
        alpha: 0.4,
        duration: 100,
        yoyo: true,
      });
    }
    if (this.hiveHp <= 0) {
      this.hiveHp = 0;
      this.destroyHive();
    }
  }

  private destroyHive(): void {
    if (this.hivePulse) {
      this.hivePulse.destroy();
      this.hivePulse = null;
    }
    this.scene.tweens.add({
      targets: this.hive,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      onComplete: () => {
        this.hive.destroy();
      },
    });
    try {
      if (this.scene.textures.exists('particle')) {
        const emitter = this.scene.add.particles(
          this.config.hiveX, this.config.hiveY, 'particle', {
            speed: { min: 40, max: 120 },
            lifespan: 600,
            quantity: 30,
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xef4444, 0xff6b6b, 0xfca5a5],
            blendMode: 'ADD',
          }
        );
        emitter.setDepth(20);
        this.scene.time.delayedCall(1000, () => {
          if (emitter && emitter.active) emitter.destroy();
        });
      }
    } catch { /* ignore */ }
  }

  spawnPatrol(): void {
    const count = Phaser.Math.Between(3, 5);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const spawnDist = 40;

    for (let i = 0; i < count; i++) {
      const ox = Phaser.Math.Between(-20, 20);
      const oy = Phaser.Math.Between(-20, 20);
      const sx = this.config.hiveX + Math.cos(angle) * spawnDist + ox;
      const sy = this.config.hiveY + Math.sin(angle) * spawnDist + oy;
      const isAoe = Phaser.Math.Between(1, 4) === 1;
      const enemy = new EnemyUnit(this.scene, sx, sy, isAoe);
      this.units.push(enemy);

      const targetX = this.player.ancientBug.x + Phaser.Math.Between(-200, 200);
      const targetY = this.player.ancientBug.y + Phaser.Math.Between(-200, 200);
      enemy.moveToward(new Phaser.Math.Vector2(targetX, targetY));
    }
  }

  spawnMoonCoreAssault(): void {
    this.moonCoreAttackWave = true;
    const count = Phaser.Math.Between(6, 10);
    for (let i = 0; i < count; i++) {
      const ox = Phaser.Math.Between(-30, 30);
      const oy = Phaser.Math.Between(-30, 30);
      const sx = this.config.hiveX + ox;
      const sy = this.config.hiveY + oy;
      const isAoe = Phaser.Math.Between(1, 3) === 1;
      const enemy = new EnemyUnit(this.scene, sx, sy, isAoe);
      this.units.push(enemy);
      enemy.moveToward(new Phaser.Math.Vector2(this.config.moonCoreX, this.config.moonCoreY));
    }
    this.moonCoreAttackWave = false;
  }

  private findTargetForEnemy(enemy: EnemyUnit): Unit | null {
    let closestDist = Infinity;
    let closestTarget: Unit | null = null;

    for (const playerUnit of this.player.units) {
      if (!playerUnit.active) continue;
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, playerUnit.x, playerUnit.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = playerUnit;
      }
    }

    const distToAncient = Phaser.Math.Distance.Between(
      enemy.x, enemy.y, this.player.ancientBug.x, this.player.ancientBug.y
    );
    if (distToAncient < closestDist && distToAncient < 250) {
      closestDist = distToAncient;
      closestTarget = null;
    }

    if (closestDist < enemy.attackRange * 1.5 && closestTarget) {
      return closestTarget;
    }

    return null;
  }

  update(time: number, delta: number): void {
    this.patrolTimer += delta;
    if (this.patrolTimer >= this.config.patrolInterval) {
      this.patrolTimer = 0;
      this.spawnPatrol();
    }

    if (this.moonCoreActive) {
      this.moonCoreTimer += delta;
      if (this.moonCoreTimer >= 20000) {
        this.moonCoreTimer = 0;
        this.spawnMoonCoreAssault();
      }
    }

    for (let i = this.units.length - 1; i >= 0; i--) {
      const enemy = this.units[i];
      if (!enemy.active) {
        this.units.splice(i, 1);
        continue;
      }

      if (!enemy.targetEnemy || !enemy.targetEnemy.active) {
        const target = this.findTargetForEnemy(enemy);
        if (target) {
          enemy.attackTarget(target);
        } else if (!enemy.targetPoint) {
          const patrolX = this.config.hiveX + Phaser.Math.Between(-300, 300);
          const patrolY = this.config.hiveY + Phaser.Math.Between(-300, 300);
          enemy.moveToward(new Phaser.Math.Vector2(patrolX, patrolY));
        }
      }

      const distToAncient = Phaser.Math.Distance.Between(
        enemy.x, enemy.y, this.player.ancientBug.x, this.player.ancientBug.y
      );
      if (distToAncient < 40 && this.player.ancientBug.active) {
        // Damage player ancient bug (handle in GameScene)
        enemy.setData('attackingAncient', true);
      } else {
        enemy.setData('attackingAncient', false);
      }

      enemy.update(time, delta);
    }

    if (this.hivePulse && this.hive.active) {
      this.hivePulse.setPosition(this.hive.x, this.hive.y);
    }
  }

  activateMoonCore(): void {
    this.moonCoreActive = true;
    this.moonCoreTimer = 0;
  }

  deactivateMoonCore(): void {
    this.moonCoreActive = false;
    this.moonCoreTimer = 0;
  }

  isHiveDestroyed(): boolean {
    return this.hiveHp <= 0;
  }

  getUnitCount(): number {
    return this.units.length;
  }
}
