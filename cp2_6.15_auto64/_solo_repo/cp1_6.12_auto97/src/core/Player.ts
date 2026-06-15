import * as Phaser from 'phaser';
import {
  PLAYER_SIZE,
  PLAYER_SPEED,
  PLAYER_MAX_HEALTH,
  PLAYER_RUN_FRAME_DURATION,
  CHASE_RANGE,
  ATTACK_RANGE,
  ATTACK_ANGLE,
  ATTACK_DURATION,
  ATTACK_COOLDOWN,
  ATTACK_DAMAGE,
  TERRAIN,
  TERRAIN_SPEED_MODIFIER,
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
  MUD_SPLASH_DURATION,
  MUD_SPLASH_PARTICLES
} from '../config/Constants';
import { MapGenerator } from './MapGenerator';
import { Monster } from './Monster';

export interface PlayerEvents {
  onHealthChanged?: (health: number) => void;
  onAttackCooldownChanged?: (progress: number) => void;
  onKilled?: () => void;
}

export class Player extends Phaser.GameObjects.Container {
  private body: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Rectangle;
  private weapon: Phaser.GameObjects.Rectangle;
  private weaponArc: Phaser.GameObjects.Graphics;
  private targetPoint: Phaser.Math.Vector2;
  private isMoving: boolean;
  private health: number;
  private mapGen: MapGenerator;
  private runFrame: number;
  private runTimer: number;
  private lastAttackTime: number;
  private isAttacking: boolean;
  private attackStartTime: number;
  private facingAngle: number;
  private events: PlayerEvents;
  private isAlive: boolean;
  private lastSplashTime: number;
  private splashParticles: Phaser.GameObjects.Rectangle[];
  private chasingMonster: Monster | null;
  private hitMonstersThisAttack: Set<Monster>;

  constructor(scene: Phaser.Scene, x: number, y: number, mapGen: MapGenerator, events: PlayerEvents = {}) {
    super(scene, x, y);
    this.mapGen = mapGen;
    this.events = events;
    this.targetPoint = new Phaser.Math.Vector2(x, y);
    this.isMoving = false;
    this.health = PLAYER_MAX_HEALTH;
    this.runFrame = 0;
    this.runTimer = 0;
    this.lastAttackTime = -Infinity;
    this.isAttacking = false;
    this.attackStartTime = 0;
    this.facingAngle = 0;
    this.isAlive = true;
    this.lastSplashTime = 0;
    this.splashParticles = [];
    this.chasingMonster = null;
    this.hitMonstersThisAttack = new Set();

    this.body = this.scene.add.rectangle(0, 4, PLAYER_SIZE - 4, PLAYER_SIZE - 12, COLORS.PLAYER);
    this.body.setStrokeStyle(2, COLORS.PLAYER_OUTLINE);
    this.add(this.body);

    this.head = this.scene.add.rectangle(0, -10, PLAYER_SIZE - 10, 12, COLORS.PLAYER);
    this.head.setStrokeStyle(2, COLORS.PLAYER_OUTLINE);
    this.add(this.head);

    const eyeL = this.scene.add.rectangle(-3, -11, 2, 2, 0x000000);
    const eyeR = this.scene.add.rectangle(3, -11, 2, 2, 0x000000);
    this.add(eyeL);
    this.add(eyeR);

    this.weapon = this.scene.add.rectangle(PLAYER_SIZE / 2 + 2, 0, 12, 3, 0x999999);
    this.weapon.setStrokeStyle(1, 0x666666);
    this.weapon.setOrigin(0, 0.5);
    this.weapon.setRotation(-0.2);
    this.add(this.weapon);

    this.weaponArc = this.scene.add.graphics();
    this.weaponArc.setDepth(11);

    this.setSize(PLAYER_SIZE, PLAYER_SIZE);
    this.scene.add.existing(this);
    this.setDepth(20);
  }

  setTarget(worldX: number, worldY: number): void {
    if (!this.isAlive) return;
    this.targetPoint.set(
      Phaser.Math.Clamp(worldX, PLAYER_SIZE / 2, GAME_WIDTH - PLAYER_SIZE / 2),
      Phaser.Math.Clamp(worldY, PLAYER_SIZE / 2, GAME_HEIGHT - PLAYER_SIZE / 2)
    );
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.facingAngle = Math.atan2(dy, dx);
      this.isMoving = true;
    }
  }

  attack(): void {
    if (!this.isAlive) return;
    const now = this.scene.time.now;
    if (now - this.lastAttackTime < ATTACK_COOLDOWN) return;
    if (this.isAttacking) return;

    this.lastAttackTime = now;
    this.isAttacking = true;
    this.attackStartTime = now;
    this.hitMonstersThisAttack.clear();

    this.scene.tweens.add({
      targets: this.weapon,
      rotation: { from: -0.2, to: Math.PI / 2 },
      duration: ATTACK_DURATION,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.weapon.setRotation(-0.2);
        this.isAttacking = false;
      }
    });

    this.weaponArc.clear();
    this.weaponArc.lineStyle(2, 0xffffff, 0.8);
    const steps = 12;
    const halfAngle = ATTACK_ANGLE / 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = this.facingAngle - halfAngle + ATTACK_ANGLE * t;
      const r = ATTACK_RANGE * (0.9 + 0.1 * Math.sin(t * Math.PI));
      const px = this.x + Math.cos(angle) * r;
      const py = this.y + Math.sin(angle) * r;
      if (i === 0) this.weaponArc.moveTo(px, py);
      else this.weaponArc.lineTo(px, py);
    }
    this.weaponArc.strokePath();

    this.scene.time.delayedCall(ATTACK_DURATION, () => {
      this.weaponArc.clear();
    });

    if (this.events.onAttackCooldownChanged) {
      this.events.onAttackCooldownChanged(0);
    }
  }

  checkAttackHits(monsters: Monster[]): Monster[] {
    if (!this.isAttacking) return [];
    const hits: Monster[] = [];
    const halfAngle = ATTACK_ANGLE / 2;
    for (const monster of monsters) {
      if (!monster.getIsAlive()) continue;
      if (this.hitMonstersThisAttack.has(monster)) continue;
      const dx = monster.x - this.x;
      const dy = monster.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > ATTACK_RANGE) continue;
      const angleToMonster = Math.atan2(dy, dx);
      let angleDiff = angleToMonster - this.facingAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) <= halfAngle) {
        this.hitMonstersThisAttack.add(monster);
        hits.push(monster);
      }
    }
    return hits;
  }

  takeDamage(amount: number): void {
    if (!this.isAlive) return;
    this.health -= amount;
    if (this.events.onHealthChanged) this.events.onHealthChanged(this.health);

    this.scene.cameras.main.shake(120, 0.01);

    const flash = this.scene.add.rectangle(this.x, this.y, PLAYER_SIZE + 4, PLAYER_SIZE + 4, 0xff0000, 0.5);
    flash.setDepth(21);
    this.scene.time.delayedCall(100, () => flash.destroy());

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  private die(): void {
    this.isAlive = false;
    this.isMoving = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 90,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => {
        if (this.events.onKilled) this.events.onKilled();
      }
    });
  }

  update(delta: number, monsters: Monster[]): void {
    if (!this.isAlive) return;

    let nearestMonster: Monster | null = null;
    let nearestDist = Infinity;
    for (const m of monsters) {
      if (!m.getIsAlive()) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestMonster = m;
      }
    }
    this.chasingMonster = nearestMonster;

    if (nearestMonster && nearestDist < CHASE_RANGE && !this.isAttacking) {
      const dx = nearestMonster.x - this.x;
      const dy = nearestMonster.y - this.y;
      this.facingAngle = Math.atan2(dy, dx);
    }

    if (this.isMoving) {
      const terrain = this.mapGen.getTerrainAt(this.x, this.y);
      const speedMod = TERRAIN_SPEED_MODIFIER[terrain];
      const speed = PLAYER_SPEED * speedMod;
      const deltaSec = delta / 1000;
      const dx = this.targetPoint.x - this.x;
      const dy = this.targetPoint.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        this.isMoving = false;
      } else {
        const mvX = (dx / dist) * speed * deltaSec;
        const mvY = (dy / dist) * speed * deltaSec;
        const nextX = this.x + mvX;
        const nextY = this.y + mvY;

        let finalX = this.x;
        let finalY = this.y;

        if (this.mapGen.isWalkable(nextX, this.y) &&
            nextX > PLAYER_SIZE / 2 && nextX < GAME_WIDTH - PLAYER_SIZE / 2) {
          finalX = nextX;
        }
        if (this.mapGen.isWalkable(finalX, nextY) &&
            nextY > PLAYER_SIZE / 2 && nextY < GAME_HEIGHT - PLAYER_SIZE / 2) {
          finalY = nextY;
        }

        if (!this.mapGen.isWalkable(nextX, this.y) &&
            !this.mapGen.isWalkable(this.x, nextY)) {
          this.isMoving = false;
        }

        this.setPosition(finalX, finalY);

        if (terrain === TERRAIN.MUD) {
          this.createMudSplash();
        }

        this.runTimer += delta;
        if (this.runTimer >= PLAYER_RUN_FRAME_DURATION) {
          this.runTimer = 0;
          this.runFrame = 1 - this.runFrame;
          this.updateRunFrame();
        }
      }
    }

    if (!this.isMoving) {
      this.body.setY(4);
      this.head.setY(-10);
    }

    if (this.events.onAttackCooldownChanged) {
      const elapsed = this.scene.time.now - this.lastAttackTime;
      const progress = Math.min(1, elapsed / ATTACK_COOLDOWN);
      this.events.onAttackCooldownChanged(progress);
    }
  }

  private updateRunFrame(): void {
    if (this.runFrame === 0) {
      this.body.setY(4);
      this.head.setY(-10);
    } else {
      this.body.setY(2);
      this.head.setY(-12);
    }
  }

  private createMudSplash(): void {
    const now = this.scene.time.now;
    if (now - this.lastSplashTime < 200) return;
    this.lastSplashTime = now;

    for (let i = 0; i < MUD_SPLASH_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 8;
      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + 6 + Math.sin(angle) * dist;
      const particle = this.scene.add.rectangle(
        px, py,
        2 + Math.random() * 2,
        2 + Math.random() * 2,
        COLORS.SPLASH,
        0.9
      );
      particle.setDepth(5);
      this.splashParticles.push(particle);

      this.scene.tweens.add({
        targets: particle,
        y: py - 10 - Math.random() * 8,
        x: px + (Math.random() - 0.5) * 16,
        alpha: 0,
        scale: 0.5,
        duration: MUD_SPLASH_DURATION,
        ease: 'Cubic.Out',
        onComplete: () => {
          particle.destroy();
          const idx = this.splashParticles.indexOf(particle);
          if (idx !== -1) this.splashParticles.splice(idx, 1);
        }
      });
    }
  }

  getHealth(): number { return this.health; }
  getIsAlive(): boolean { return this.isAlive; }
  getIsChasing(): boolean { return this.chasingMonster !== null; }
  getFacingAngle(): number { return this.facingAngle; }
  getIsAttacking(): boolean { return this.isAttacking; }
}
