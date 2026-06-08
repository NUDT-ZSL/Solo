import Phaser from 'phaser';
import { CELL_SIZE, COLOR, PIECE_CONFIG, PieceType, RuneType } from '../utils/constants';

export interface StatusEffect {
  type: RuneType;
  turnsRemaining: number;
  value: number;
}

export class ChessPiece extends Phaser.GameObjects.Container {
  public pieceType: PieceType;
  public player: 1 | 2;
  public hp: number;
  public maxHp: number;
  public attackPower: number;
  public range: number;
  public gridCol: number;
  public gridRow: number;
  public isAlive: boolean = true;
  public statusEffects: StatusEffect[] = [];
  public shield: number = 0;

  private bodyShape: Phaser.GameObjects.Graphics;
  private hpBarBg: Phaser.GameObjects.Graphics;
  private hpBarFill: Phaser.GameObjects.Graphics;
  private glowEffect: Phaser.GameObjects.Graphics;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    pieceType: PieceType,
    player: 1 | 2,
    gridCol: number,
    gridRow: number
  ) {
    super(scene, x, y);

    this.pieceType = pieceType;
    this.player = player;
    this.gridCol = gridCol;
    this.gridRow = gridRow;

    const config = PIECE_CONFIG[pieceType];
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.attackPower = config.attack;
    this.range = config.range;

    this.glowEffect = scene.add.graphics();
    this.bodyShape = scene.add.graphics();
    this.hpBarBg = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();

    this.add([this.glowEffect, this.bodyShape, this.hpBarBg, this.hpBarFill]);

    this.drawGlow();
    this.drawBody();
    this.drawHpBar();
    this.startIdleAnimation();

    scene.add.existing(this);
    this.setDepth(10);
  }

  private playerColor(): number {
    return this.player === 1 ? COLOR.PLAYER1 : COLOR.PLAYER2;
  }

  private playerDarkColor(): number {
    return this.player === 1 ? COLOR.PLAYER1_DARK : COLOR.PLAYER2_DARK;
  }

  private drawBody(): void {
    this.bodyShape.clear();
    const color = this.playerColor();
    const dark = this.playerDarkColor();

    switch (this.pieceType) {
      case 'knight':
        this.bodyShape.fillStyle(dark, 0.9);
        this.bodyShape.fillRoundedRect(-15, -15, 30, 30, 4);
        this.bodyShape.fillStyle(color, 0.9);
        this.bodyShape.fillRoundedRect(-12, -12, 24, 24, 3);
        this.bodyShape.lineStyle(2, 0xffffff, 0.9);
        this.bodyShape.lineBetween(0, -8, 0, 8);
        this.bodyShape.lineBetween(-6, -2, 6, -2);
        this.bodyShape.lineStyle(1, 0xffffff, 0.6);
        this.bodyShape.lineBetween(-3, 8, 0, 12);
        this.bodyShape.lineBetween(3, 8, 0, 12);
        break;
      case 'mage':
        this.bodyShape.fillStyle(dark, 0.9);
        this.bodyShape.fillCircle(0, 0, 17);
        this.bodyShape.fillStyle(color, 0.9);
        this.bodyShape.fillCircle(0, 0, 14);
        this.bodyShape.fillStyle(0xffffff, 0.85);
        this.drawStar(this.bodyShape, 0, 0, 5, 8, 4);
        this.bodyShape.lineStyle(1, color, 0.5);
        this.bodyShape.strokeCircle(0, 0, 20);
        break;
      case 'archer':
        this.bodyShape.fillStyle(dark, 0.9);
        this.bodyShape.fillTriangle(0, -17, -15, 13, 15, 13);
        this.bodyShape.fillStyle(color, 0.9);
        this.bodyShape.fillTriangle(0, -14, -12, 10, 12, 10);
        this.bodyShape.lineStyle(2, 0xffffff, 0.9);
        this.bodyShape.lineBetween(0, 10, 0, -12);
        this.bodyShape.lineBetween(0, -12, -4, -7);
        this.bodyShape.lineBetween(0, -12, 4, -7);
        break;
    }
  }

  private drawStar(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, points: number, outerR: number, innerR: number): void {
    const path: { x: number; y: number }[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      path.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    gfx.beginPath();
    gfx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      gfx.lineTo(path[i].x, path[i].y);
    }
    gfx.closePath();
    gfx.fillPath();
  }

  private drawHpBar(): void {
    const barWidth = 36;
    const barHeight = 4;
    const barY = -CELL_SIZE / 2 + 4;
    const hpRatio = Math.max(0, this.hp / this.maxHp);

    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(COLOR.HP_BAR_BG, 0.8);
    this.hpBarBg.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    this.hpBarFill.clear();
    const hpColor = this.player === 1 ? COLOR.HP_BAR_P1 : COLOR.HP_BAR_P2;
    this.hpBarFill.fillStyle(hpColor, 1);
    this.hpBarFill.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);
  }

  private drawGlow(): void {
    this.glowEffect.clear();
    const color = this.playerColor();
    this.glowEffect.fillStyle(color, 0.12);
    this.glowEffect.fillCircle(0, 0, CELL_SIZE / 2);
    this.glowEffect.fillStyle(color, 0.06);
    this.glowEffect.fillCircle(0, 0, CELL_SIZE / 2 + 6);
  }

  private startIdleAnimation(): void {
    this.pulseTween = this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: { from: 0.6, to: 1.0 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public takeDamage(amount: number): void {
    let actualDamage = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, actualDamage);
      this.shield -= absorbed;
      actualDamage -= absorbed;
    }
    this.hp = Math.max(0, this.hp - actualDamage);
    this.drawHpBar();
    this.flashEffect(0xff0000);

    if (this.hp <= 0) {
      this.die();
    }
  }

  public heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.drawHpBar();
    this.flashEffect(COLOR.HEAL);
  }

  public addShield(amount: number): void {
    this.shield += amount;
    this.flashEffect(COLOR.SHIELD);
  }

  private flashEffect(color: number): void {
    const flash = this.scene.add.graphics();
    flash.fillStyle(color, 0.5);
    flash.fillCircle(this.x, this.y, CELL_SIZE / 2);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  public addStatusEffect(effect: StatusEffect): void {
    const existing = this.statusEffects.find((e) => e.type === effect.type);
    if (existing) {
      existing.turnsRemaining = Math.max(existing.turnsRemaining, effect.turnsRemaining);
      existing.value = effect.value;
    } else {
      this.statusEffects.push({ ...effect });
    }
  }

  public getEffectiveAttack(): number {
    let atk = this.attackPower;
    const boost = this.statusEffects.find((e) => e.type === RuneType.DAMAGE_BOOST);
    if (boost) {
      atk = Math.round(atk * (1 + boost.value));
    }
    return atk;
  }

  public getEffectiveRange(): number {
    let r = this.range;
    const slow = this.statusEffects.find((e) => e.type === RuneType.SLOW);
    if (slow) {
      r = Math.max(1, r - (slow.value as number));
    }
    return r;
  }

  public tickStatusEffects(): void {
    this.statusEffects = this.statusEffects.filter((e) => {
      e.turnsRemaining--;
      return e.turnsRemaining > 0;
    });
  }

  private die(): void {
    this.isAlive = false;
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    this.createDeathParticles();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  private createDeathParticles(): void {
    const color = this.playerColor();
    for (let i = 0; i < 12; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(color, 0.9);
      particle.fillCircle(0, 0, 3);
      particle.setPosition(this.x, this.y);
      particle.setDepth(20);
      const angle = (i / 12) * Math.PI * 2;
      const dist = 30 + Math.random() * 30;
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  public playAttackAnimation(targetX: number, targetY: number, onComplete: () => void): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      onComplete();
      return;
    }
    const moveX = (dx / dist) * 12;
    const moveY = (dy / dist) * 12;
    const origX = this.x;
    const origY = this.y;

    this.scene.tweens.add({
      targets: this,
      x: origX + moveX,
      y: origY + moveY,
      duration: 120,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        this.setPosition(origX, origY);
        onComplete();
      },
    });
  }

  public createAttackTrail(targetX: number, targetY: number): void {
    const trail = this.scene.add.graphics();
    const color = this.playerColor();

    switch (this.pieceType) {
      case 'knight':
        trail.lineStyle(3, color, 0.7);
        trail.lineBetween(this.x, this.y, targetX, targetY);
        break;
      case 'mage':
        trail.lineStyle(2, 0xffffff, 0.5);
        trail.strokeCircle(targetX, targetY, 15);
        break;
      case 'archer':
        trail.lineStyle(1, 0xffffff, 0.6);
        trail.lineBetween(this.x, this.y, targetX, targetY);
        trail.fillStyle(color, 0.8);
        trail.fillCircle(targetX, targetY, 3);
        break;
    }

    trail.setDepth(15);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => trail.destroy(),
    });
  }

  public destroy(fromScene?: boolean): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    super.destroy(fromScene);
  }
}
