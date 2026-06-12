import * as Phaser from 'phaser';
import {
  MONSTER_SIZE,
  MONSTER_SPEED,
  MONSTER_DIRECTION_CHANGE_INTERVAL,
  MONSTER_STEALTH_INTERVAL,
  MONSTER_STEALTH_DURATION,
  MONSTER_STEALTH_FADE_DURATION,
  MONSTER_FOOTPRINT_INTERVAL,
  MONSTER_FOOTPRINT_DURATION,
  MONSTER_FLASH_INTERVAL,
  MONSTER_FLASH_DURATION,
  MONSTER_MAX_HEALTH,
  MONSTER_DAMAGE,
  MONSTER_ATTACK_COOLDOWN,
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT
} from '../config/Constants';
import { MapGenerator } from './MapGenerator';

export interface MonsterEvents {
  onKilled?: () => void;
  onDamaged?: (amount: number) => void;
}

export class Monster extends Phaser.GameObjects.Container {
  private body: Phaser.GameObjects.Rectangle;
  private eyes: Phaser.GameObjects.Rectangle[];
  private direction: Phaser.Math.Vector2;
  private targetPos: Phaser.Math.Vector2;
  private health: number;
  private isStealthed: boolean;
  private mapGen: MapGenerator;
  private footprints: Phaser.GameObjects.Rectangle[];
  private footprintsTimers: number[];
  private flashOverlay: Phaser.GameObjects.Rectangle;
  private directionTimer: Phaser.Time.TimerEvent | null;
  private stealthTimer: Phaser.Time.TimerEvent | null;
  private footprintTimer: Phaser.Time.TimerEvent | null;
  private flashTimer: Phaser.Time.TimerEvent | null;
  private lastAttackTime: number;
  private events: MonsterEvents;
  private isAlive: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, mapGen: MapGenerator, events: MonsterEvents = {}) {
    super(scene, x, y);
    this.scene = scene;
    this.mapGen = mapGen;
    this.events = events;
    this.health = MONSTER_MAX_HEALTH;
    this.isStealthed = false;
    this.direction = this.randomDirection();
    this.targetPos = new Phaser.Math.Vector2(x, y);
    this.footprints = [];
    this.footprintsTimers = [];
    this.lastAttackTime = 0;
    this.isAlive = true;

    this.body = this.scene.add.rectangle(0, 0, MONSTER_SIZE, MONSTER_SIZE, COLORS.MONSTER);
    this.body.setStrokeStyle(2, COLORS.MONSTER_OUTLINE);
    this.add(this.body);

    this.eyes = [
      this.scene.add.rectangle(-4, -3, 3, 4, 0xffffff),
      this.scene.add.rectangle(4, -3, 3, 4, 0xffffff)
    ];
    for (const eye of this.eyes) {
      this.add(eye);
      const pupil = this.scene.add.rectangle(eye.x, eye.y + 1, 2, 2, 0x000000);
      this.add(pupil);
    }

    this.flashOverlay = this.scene.add.rectangle(0, 0, MONSTER_SIZE, MONSTER_SIZE, 0xffffff, 0);
    this.add(this.flashOverlay);

    this.setSize(MONSTER_SIZE, MONSTER_SIZE);
    this.scene.add.existing(this);
    this.setDepth(10);

    this.startTimers();
  }

  private randomDirection(): Phaser.Math.Vector2 {
    const angle = Math.random() * Math.PI * 2;
    return new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
  }

  private startTimers(): void {
    this.directionTimer = this.scene.time.addEvent({
      delay: MONSTER_DIRECTION_CHANGE_INTERVAL,
      loop: true,
      callback: () => this.changeDirection()
    });

    this.stealthTimer = this.scene.time.addEvent({
      delay: MONSTER_STEALTH_INTERVAL,
      loop: true,
      callback: () => this.enterStealth()
    });

    this.footprintTimer = this.scene.time.addEvent({
      delay: MONSTER_FOOTPRINT_INTERVAL,
      loop: true,
      callback: () => this.dropFootprint()
    });

    this.flashTimer = this.scene.time.addEvent({
      delay: MONSTER_FLASH_INTERVAL,
      loop: true,
      callback: () => this.flash()
    });
  }

  private changeDirection(): void {
    this.direction = this.randomDirection();
    const targetX = this.x + this.direction.x * 80;
    const targetY = this.y + this.direction.y * 80;
    this.targetPos.set(
      Phaser.Math.Clamp(targetX, 20, GAME_WIDTH - 20),
      Phaser.Math.Clamp(targetY, 20, GAME_HEIGHT - 20)
    );
  }

  private enterStealth(): void {
    if (!this.isAlive) return;
    this.isStealthed = true;
    this.scene.tweens.add({
      targets: [this.body, ...this.eyes],
      alpha: 0.15,
      duration: MONSTER_STEALTH_FADE_DURATION,
      ease: 'Linear'
    });
    this.scene.time.delayedCall(MONSTER_STEALTH_DURATION, () => this.exitStealth());
  }

  private exitStealth(): void {
    if (!this.isAlive) return;
    this.isStealthed = false;
    this.scene.tweens.add({
      targets: [this.body, ...this.eyes],
      alpha: 1.0,
      duration: MONSTER_STEALTH_FADE_DURATION,
      ease: 'Linear'
    });
  }

  private dropFootprint(): void {
    if (!this.isAlive) return;
    const footprint = this.scene.add.rectangle(
      this.x + (Math.random() - 0.5) * 4,
      this.y + (Math.random() - 0.5) * 4,
      4, 3, COLORS.FOOTPRINT, 0.6
    );
    footprint.setDepth(2);
    this.footprints.push(footprint);

    const tween = this.scene.tweens.add({
      targets: footprint,
      alpha: 0,
      duration: MONSTER_FOOTPRINT_DURATION,
      ease: 'Linear',
      onComplete: () => {
        footprint.destroy();
        const idx = this.footprints.indexOf(footprint);
        if (idx !== -1) this.footprints.splice(idx, 1);
      }
    });
    this.footprintsTimers.push(tween.totalDuration);
  }

  private flash(): void {
    if (!this.isAlive || !this.isStealthed) return;
    this.flashOverlay.setAlpha(1);
    this.scene.time.delayedCall(MONSTER_FLASH_DURATION, () => {
      this.flashOverlay.setAlpha(0);
    });
  }

  update(time: number, delta: number, playerX: number, playerY: number): void {
    if (!this.isAlive) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    let moveDir: Phaser.Math.Vector2;
    if (distToPlayer < 150 && !this.isStealthed) {
      moveDir = new Phaser.Math.Vector2(playerX - this.x, playerY - this.y).normalize().scale(-1);
    } else {
      const dx = this.targetPos.x - this.x;
      const dy = this.targetPos.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        this.changeDirection();
      }
      moveDir = dist > 0 ? new Phaser.Math.Vector2(dx / dist, dy / dist) : this.direction.clone();
    }

    const deltaSec = delta / 1000;
    const nextX = this.x + moveDir.x * MONSTER_SPEED * deltaSec;
    const nextY = this.y + moveDir.y * MONSTER_SPEED * deltaSec;

    if (this.mapGen.isWalkable(nextX, this.y) && nextX > 15 && nextX < GAME_WIDTH - 15) {
      this.setX(nextX);
    } else {
      this.changeDirection();
    }
    if (this.mapGen.isWalkable(this.x, nextY) && nextY > 15 && nextY < GAME_HEIGHT - 15) {
      this.setY(nextY);
    } else {
      this.changeDirection();
    }

    if (distToPlayer < 25) {
      this.tryAttackPlayer(time);
    }
  }

  private tryAttackPlayer(time: number): void {
    if (time - this.lastAttackTime < MONSTER_ATTACK_COOLDOWN) return;
    this.lastAttackTime = time;
    this.scene.events.emit('monsterAttack', MONSTER_DAMAGE);
  }

  takeDamage(amount: number): boolean {
    if (!this.isAlive) return false;
    this.health -= amount;
    if (this.events.onDamaged) this.events.onDamaged(amount);

    this.scene.cameras.main.shake(80, 0.005);

    const flashTween = this.scene.tweens.add({
      targets: this.body,
      fillColor: 0xffffff,
      yoyo: true,
      duration: 100,
      onComplete: () => {
        this.body.setFillStyle(COLORS.MONSTER);
      }
    });

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    this.isAlive = false;
    this.stopTimers();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.clearFootprints();
        if (this.events.onKilled) this.events.onKilled();
        this.destroy();
      }
    });
  }

  private stopTimers(): void {
    if (this.directionTimer) this.directionTimer.remove(false);
    if (this.stealthTimer) this.stealthTimer.remove(false);
    if (this.footprintTimer) this.footprintTimer.remove(false);
    if (this.flashTimer) this.flashTimer.remove(false);
  }

  private clearFootprints(): void {
    for (const fp of this.footprints) {
      if (fp.active) fp.destroy();
    }
    this.footprints = [];
    this.footprintsTimers = [];
  }

  getHealth(): number { return this.health; }
  getIsAlive(): boolean { return this.isAlive; }
  getIsStealthed(): boolean { return this.isStealthed; }
}
