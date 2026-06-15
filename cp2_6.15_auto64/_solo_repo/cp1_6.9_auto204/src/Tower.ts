import Phaser from 'phaser';
import { GAME_CONFIG } from './main';
import Enemy from './Enemy';

export type TowerType = 'laser' | 'scatter' | 'gravity';

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  cost: number;
  upgradeCost: number;
  sellValue: number;
  laserWidth?: number;
  scatterAngle?: number;
  scatterCount?: number;
  slowFactor?: number;
  pullForce?: number;
  dotDamage?: number;
}

export const TOWER_CONFIG: Record<TowerType, TowerStats[]> = {
  laser: [
    { damage: 35, range: 220, fireRate: 80, cost: 80, upgradeCost: 120, sellValue: 40, laserWidth: 3 },
    { damage: 65, range: 260, fireRate: 65, cost: 80, upgradeCost: 200, sellValue: 100, laserWidth: 5 },
    { damage: 120, range: 300, fireRate: 50, cost: 80, upgradeCost: 0, sellValue: 220, laserWidth: 8 }
  ],
  scatter: [
    { damage: 12, range: 160, fireRate: 120, cost: 60, upgradeCost: 100, sellValue: 30, scatterAngle: 60, scatterCount: 3, slowFactor: 0.7 },
    { damage: 22, range: 190, fireRate: 100, cost: 60, upgradeCost: 170, sellValue: 80, scatterAngle: 80, scatterCount: 5, slowFactor: 0.6 },
    { damage: 40, range: 230, fireRate: 80, cost: 60, upgradeCost: 0, sellValue: 170, scatterAngle: 100, scatterCount: 7, slowFactor: 0.45 }
  ],
  gravity: [
    { damage: 0, range: 140, fireRate: 60, cost: 100, upgradeCost: 150, sellValue: 50, pullForce: 0.8, dotDamage: 8 },
    { damage: 0, range: 170, fireRate: 50, cost: 100, upgradeCost: 250, sellValue: 125, pullForce: 1.5, dotDamage: 15 },
    { damage: 0, range: 210, fireRate: 40, cost: 100, upgradeCost: 0, sellValue: 275, pullForce: 2.5, dotDamage: 28 }
  ]
};

export const TOWER_COLORS: Record<TowerType, number[]> = {
  laser: [0xff3366, 0xff00aa, 0xff66cc],
  scatter: [0x66ffcc, 0x00ffcc, 0x66ffff],
  gravity: [0x9966ff, 0xcc66ff, 0xff99ff]
};

export default class Tower extends Phaser.GameObjects.Container {
  public type: TowerType;
  public level: number = 0;
  public stats: TowerStats;
  public slotIndex: number;
  public ringIndex: number;
  public worldX: number;
  public worldY: number;

  private towerBody!: Phaser.GameObjects.Graphics;
  private towerGlow!: Phaser.GameObjects.Graphics;
  private rangeCircle!: Phaser.GameObjects.Arc;
  private fireTimer: number = 0;
  private targetEnemy: Enemy | null = null;
  private attackGraphics!: Phaser.GameObjects.Graphics;
  private sceneRef: Phaser.Scene;
  private isSelected: boolean = false;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private enemiesRef: Enemy[] = [];
  private audioCtx: AudioContext | null = null;

  constructor(scene: Phaser.Scene, type: TowerType, ringIndex: number, slotIndex: number, enemies: Enemy[]) {
    const pos = Tower.getSlotPosition(ringIndex, slotIndex);
    super(scene, pos.x, pos.y);
    this.sceneRef = scene;
    this.type = type;
    this.ringIndex = ringIndex;
    this.slotIndex = slotIndex;
    this.worldX = pos.x;
    this.worldY = pos.y;
    this.stats = TOWER_CONFIG[type][0];
    this.enemiesRef = enemies;

    scene.add.existing(this);
    this.setSize(50, 50);
    this.setInteractive({ useHandCursor: true });

    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {}

    this.createGraphics();
    this.createAttackGraphics();
    this.createRangeIndicator();
  }

  public static getSlotPosition(ringIndex: number, slotIndex: number): { x: number; y: number } {
    const { ORBIT, CENTER } = GAME_CONFIG;
    const ringRadius = ORBIT.innerRadius + (ORBIT.outerRadius - ORBIT.innerRadius) * (ringIndex / (ORBIT.rings - 1));
    const slots = ORBIT.slotsPerRing[ringIndex];
    const angle = (slotIndex / slots) * Math.PI * 2 - Math.PI / 2;
    return {
      x: CENTER.x + Math.cos(angle) * ringRadius,
      y: CENTER.y + Math.sin(angle) * ringRadius
    };
  }

  private createGraphics(): void {
    this.towerGlow = this.sceneRef.add.graphics();
    this.towerBody = this.sceneRef.add.graphics();
    this.drawTower();

    this.add(this.towerGlow);
    this.add(this.towerBody);
  }

  private drawTower(): void {
    const colors = TOWER_COLORS[this.type];
    const color = colors[this.level];
    const size = 14 + this.level * 4;

    this.towerGlow.clear();
    this.towerGlow.fillStyle(color, 0.25);
    this.towerGlow.fillCircle(0, 0, size + 10);
    this.towerGlow.lineStyle(2, color, 0.5);
    this.towerGlow.strokeCircle(0, 0, size + 8);

    this.towerBody.clear();

    if (this.type === 'laser') {
      this.towerBody.fillStyle(0x1a0020, 1);
      this.towerBody.fillTriangle(-size, size * 0.8, size, size * 0.8, 0, -size);
      this.towerBody.lineStyle(3, color, 1);
      this.towerBody.strokeTriangle(-size, size * 0.8, size, size * 0.8, 0, -size);
      this.towerBody.fillStyle(color, 1);
      this.towerBody.fillCircle(0, -size * 0.3, size * 0.35);
    } else if (this.type === 'scatter') {
      const sides = 6;
      this.towerBody.fillStyle(0x1a0020, 1);
      this.towerBody.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * size;
        const py = Math.sin(a) * size;
        if (i === 0) this.towerBody.moveTo(px, py);
        else this.towerBody.lineTo(px, py);
      }
      this.towerBody.closePath();
      this.towerBody.fillPath();
      this.towerBody.lineStyle(3, color, 1);
      this.towerBody.strokePath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        this.towerBody.fillStyle(color, 1);
        this.towerBody.fillCircle(Math.cos(a) * size * 0.45, Math.sin(a) * size * 0.45, size * 0.2);
      }
    } else {
      this.towerBody.fillStyle(0x1a0020, 1);
      this.towerBody.fillCircle(0, 0, size);
      this.towerBody.lineStyle(3, color, 1);
      this.towerBody.strokeCircle(0, 0, size);
      for (let r = size * 0.7; r > 0; r -= size * 0.2) {
        this.towerBody.lineStyle(1, color, 0.5 + (size - r) / size * 0.5);
        this.towerBody.strokeCircle(0, 0, r);
      }
      this.towerBody.fillStyle(color, 1);
      this.towerBody.fillCircle(0, 0, size * 0.18);
    }

    for (let i = 0; i < this.level; i++) {
      this.towerBody.fillStyle(0xffff00, 1);
      this.towerBody.fillCircle(-size * 0.6 + i * size * 0.6, size + 8, 3);
    }
  }

  private createAttackGraphics(): void {
    this.attackGraphics = this.sceneRef.add.graphics();
    this.attackGraphics.setDepth(999);
  }

  private createRangeIndicator(): void {
    this.rangeCircle = this.sceneRef.add.arc(this.worldX, this.worldY, this.stats.range);
    this.rangeCircle.setStrokeStyle(2, 0xffffff, 0.3);
    this.rangeCircle.setVisible(false);
  }

  public setSelected(val: boolean): void {
    this.isSelected = val;
    this.rangeCircle.setVisible(val);
    if (val) {
      this.rangeCircle.radius = this.stats.range;
      this.rangeCircle.setStrokeStyle(2, TOWER_COLORS[this.type][this.level], 0.6);
    }
  }

  public upgrade(): boolean {
    if (this.level >= 2) return false;
    this.level++;
    this.stats = TOWER_CONFIG[this.type][this.level];
    this.rangeCircle.radius = this.stats.range;
    this.drawTower();
    this.playUpgradeEffect();
    return true;
  }

  private playUpgradeEffect(): void {
    if (this.pulseTween) this.pulseTween.remove();
    this.setScale(0.6);
    this.pulseTween = this.sceneRef.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      repeat: 2
    });

    const colors = TOWER_COLORS[this.type];
    const color = colors[this.level];
    const flash = this.sceneRef.add.graphics();
    flash.fillStyle(color, 0.5);
    flash.fillCircle(this.worldX, this.worldY, 80);
    this.sceneRef.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 600,
      onComplete: () => flash.destroy()
    });

    this.playSound(880, 0.1, 'sine', 0.15);
    this.sceneRef.time.delayedCall(80, () => this.playSound(1320, 0.1, 'sine', 0.15));
  }

  public sell(): number {
    this.rangeCircle.destroy();
    this.attackGraphics.destroy();
    this.destroy();
    return this.stats.sellValue;
  }

  private findTarget(): Enemy | null {
    let closest: Enemy | null = null;
    let closestDist = Infinity;

    for (const enemy of this.enemiesRef) {
      if (!enemy.active || enemy.isDead) continue;
      if (this.type !== 'laser' && enemy.hasShield) continue;
      const dx = enemy.x - this.worldX;
      const dy = enemy.y - this.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.stats.range && dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  public update(time: number, delta: number): void {
    this.fireTimer -= delta;

    if (this.type === 'gravity') {
      this.applyGravityEffect();
    }

    if (this.fireTimer <= 0) {
      this.targetEnemy = this.findTarget();
      if (this.targetEnemy) {
        this.attack();
        this.fireTimer = this.stats.fireRate;
      }
    }

    if (this.type !== 'laser') {
      this.attackGraphics.clear();
    }

    if (this.type === 'laser' && this.targetEnemy && this.targetEnemy.active && !this.targetEnemy.isDead) {
      const dx = this.targetEnemy.x - this.worldX;
      const dy = this.targetEnemy.y - this.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > this.stats.range) {
        this.attackGraphics.clear();
        this.targetEnemy = null;
      }
    } else if (this.type === 'laser') {
      this.attackGraphics.clear();
    }
  }

  private applyGravityEffect(): void {
    const color = TOWER_COLORS.gravity[this.level];

    this.attackGraphics.clear();
    this.attackGraphics.lineStyle(1, color, 0.4);
    this.attackGraphics.strokeCircle(this.worldX, this.worldY, this.stats.range);
    for (let i = 0; i < 3; i++) {
      const r = this.stats.range * (0.3 + i * 0.25);
      this.attackGraphics.lineStyle(1, color, 0.25 + i * 0.1);
      this.attackGraphics.strokeCircle(this.worldX, this.worldY, r);
    }

    for (const enemy of this.enemiesRef) {
      if (!enemy.active || enemy.isDead) continue;
      const dx = this.worldX - enemy.x;
      const dy = this.worldY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.stats.range && dist > 10) {
        const force = this.stats.pullForce! * (1 - dist / this.stats.range);
        enemy.applyPull(dx / dist * force, dy / dist * force);
        enemy.takeDamage(this.stats.dotDamage! * 0.016, true);
      }
    }
  }

  private attack(): void {
    if (!this.targetEnemy) return;

    if (this.type === 'laser') {
      this.fireLaser();
    } else if (this.type === 'scatter') {
      this.fireScatter();
    }
  }

  private fireLaser(): void {
    const color = TOWER_COLORS.laser[this.level];
    const width = this.stats.laserWidth!;
    const target = this.targetEnemy!;

    this.attackGraphics.clear();
    this.attackGraphics.lineStyle(width + 6, color, 0.25);
    this.attackGraphics.lineBetween(this.worldX, this.worldY, target.x, target.y);
    this.attackGraphics.lineStyle(width + 3, color, 0.5);
    this.attackGraphics.lineBetween(this.worldX, this.worldY, target.x, target.y);
    this.attackGraphics.lineStyle(width, 0xffffff, 0.9);
    this.attackGraphics.lineBetween(this.worldX, this.worldY, target.x, target.y);

    target.takeDamage(this.stats.damage, false);
    this.playSound(720, 0.05, 'sawtooth', 0.08);
  }

  private fireScatter(): void {
    const color = TOWER_COLORS.scatter[this.level];
    const angleRad = Math.atan2(this.targetEnemy!.y - this.worldY, this.targetEnemy!.x - this.worldX);
    const spread = (this.stats.scatterAngle! * Math.PI) / 180;
    const count = this.stats.scatterCount!;

    this.attackGraphics.clear();
    this.attackGraphics.fillStyle(color, 0.15);
    this.attackGraphics.beginPath();
    this.attackGraphics.moveTo(this.worldX, this.worldY);
    this.attackGraphics.arc(this.worldX, this.worldY, this.stats.range, angleRad - spread / 2, angleRad + spread / 2, false);
    this.attackGraphics.closePath();
    this.attackGraphics.fillPath();

    for (let i = 0; i < count; i++) {
      const a = angleRad - spread / 2 + (spread * i) / (count - 1 || 1);
      const ex = this.worldX + Math.cos(a) * this.stats.range;
      const ey = this.worldY + Math.sin(a) * this.stats.range;
      this.attackGraphics.lineStyle(2, color, 0.7);
      this.attackGraphics.lineBetween(this.worldX, this.worldY, ex, ey);
    }

    for (const enemy of this.enemiesRef) {
      if (!enemy.active || enemy.isDead || enemy.hasShield) continue;
      const dx = enemy.x - this.worldX;
      const dy = enemy.y - this.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > this.stats.range) continue;
      const enemyAngle = Math.atan2(dy, dx);
      let diff = Math.abs(angleRad - enemyAngle);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff <= spread / 2) {
        enemy.takeDamage(this.stats.damage, false);
        enemy.applySlow(this.stats.slowFactor!, 1500);
      }
    }
    this.playSound(440, 0.08, 'square', 0.1);
  }

  private playSound(freq: number, duration: number, type: OscillatorType, vol: number): void {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  public destroy(fromScene?: boolean): void {
    if (this.pulseTween) this.pulseTween.remove();
    super.destroy(fromScene);
  }
}
