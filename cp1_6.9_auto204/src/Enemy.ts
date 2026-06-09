import Phaser from 'phaser';
import { GAME_CONFIG } from './main';

export type EnemyType = 'shadow' | 'splitter' | 'shield';

export interface EnemyStats {
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  size: number;
  color: number;
  shieldHp?: number;
  splitCount?: number;
}

export const ENEMY_CONFIG: Record<EnemyType, EnemyStats> = {
  shadow: { hp: 80, speed: 0.9, damage: 10, reward: 15, size: 16, color: 0x6b2f8a },
  splitter: { hp: 120, speed: 0.65, damage: 12, reward: 25, size: 20, color: 0x8a2f5c, splitCount: 2 },
  shield: { hp: 150, speed: 0.5, damage: 20, reward: 40, size: 22, color: 0x3d2f8a, shieldHp: 80 }
};

export default class Enemy extends Phaser.GameObjects.Container {
  public type: EnemyType;
  public stats: EnemyStats;
  public maxHp: number;
  public hp: number;
  public shieldHp: number = 0;
  public maxShieldHp: number = 0;
  public hasShield: boolean = false;
  public isDead: boolean = false;
  public damage: number;
  public reward: number;

  private orbitAngle: number = 0;
  private radius: number;
  private speed: number;
  private slowFactor: number = 1;
  private slowTimer: number = 0;
  private pullX: number = 0;
  private pullY: number = 0;

  private bodyShape!: Phaser.GameObjects.Graphics;
  private shieldShape!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter | null;
  private hitFlashTween: Phaser.Tweens.Tween | null = null;
  private audioCtx: AudioContext | null = null;
  public isMini: boolean = false;

  constructor(scene: Phaser.Scene, type: EnemyType, isMini: boolean = false) {
    const { ORBIT, CENTER } = GAME_CONFIG;
    const startAngle = Math.random() * Math.PI * 2;
    const startRadius = ORBIT.outerRadius + 40;
    const startX = CENTER.x + Math.cos(startAngle) * startRadius;
    const startY = CENTER.y + Math.sin(startAngle) * startRadius;

    super(scene, startX, startY);
    this.type = type;
    this.isMini = isMini;

    const baseStats = ENEMY_CONFIG[type];
    if (isMini) {
      this.stats = { ...baseStats, hp: baseStats.hp * 0.4, size: baseStats.size * 0.6, reward: Math.floor(baseStats.reward * 0.3) };
    } else {
      this.stats = { ...baseStats };
    }

    this.maxHp = this.stats.hp;
    this.hp = this.stats.hp;
    this.damage = this.stats.damage;
    this.reward = this.stats.reward;
    this.speed = this.stats.speed;

    if (this.stats.shieldHp) {
      this.maxShieldHp = this.stats.shieldHp;
      this.shieldHp = this.stats.shieldHp;
      this.hasShield = true;
    }

    this.orbitAngle = startAngle;
    this.radius = startRadius;

    scene.add.existing(this);
    this.setSize(this.stats.size * 2, this.stats.size * 2);

    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {}

    this.createGraphics();
    this.createParticles();
  }

  private createGraphics(): void {
    const { size, color } = this.stats;

    this.bodyShape = this.scene.add.graphics();
    this.drawBody(color, size);

    if (this.hasShield) {
      this.shieldShape = this.scene.add.graphics();
      this.drawShield(size);
      this.add(this.shieldShape);
    }

    this.hpBar = this.scene.add.graphics();
    this.drawHpBar(size);

    this.add(this.bodyShape);
    this.add(this.hpBar);
  }

  private drawBody(color: number, size: number): void {
    this.bodyShape.clear();
    this.bodyShape.fillStyle(0x100020, 1);

    if (this.type === 'shadow') {
      this.bodyShape.fillTriangle(0, -size, size * 0.9, size * 0.7, -size * 0.9, size * 0.7);
      this.bodyShape.lineStyle(2, color, 1);
      this.bodyShape.strokeTriangle(0, -size, size * 0.9, size * 0.7, -size * 0.9, size * 0.7);
      this.bodyShape.fillStyle(color, 0.7);
      this.bodyShape.fillCircle(0, -size * 0.1, size * 0.25);
    } else if (this.type === 'splitter') {
      this.bodyShape.fillCircle(0, 0, size);
      this.bodyShape.lineStyle(2, color, 1);
      this.bodyShape.strokeCircle(0, 0, size);
      this.bodyShape.fillStyle(color, 0.6);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        this.bodyShape.fillCircle(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5, size * 0.22);
      }
    } else {
      const sides = 5;
      this.bodyShape.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * size;
        const py = Math.sin(a) * size;
        if (i === 0) this.bodyShape.moveTo(px, py);
        else this.bodyShape.lineTo(px, py);
      }
      this.bodyShape.closePath();
      this.bodyShape.fillPath();
      this.bodyShape.lineStyle(2, color, 1);
      this.bodyShape.strokePath();
      this.bodyShape.fillStyle(color, 0.5);
      this.bodyShape.fillCircle(0, 0, size * 0.35);
    }
  }

  private drawShield(size: number): void {
    this.shieldShape.clear();
    if (this.shieldHp <= 0) return;
    const alpha = this.shieldHp / this.maxShieldHp;
    this.shieldShape.lineStyle(3, 0x66ccff, 0.8 * alpha);
    this.shieldShape.strokeCircle(0, 0, size + 8);
    this.shieldShape.lineStyle(1, 0xaaeeff, 0.5 * alpha);
    this.shieldShape.strokeCircle(0, 0, size + 12);
  }

  private drawHpBar(size: number): void {
    this.hpBar.clear();
    const barWidth = size * 2.4;
    const barHeight = 4;
    const y = -size - 12;

    this.hpBar.fillStyle(0x220033, 0.8);
    this.hpBar.fillRect(-barWidth / 2, y, barWidth, barHeight);

    const hpRatio = Math.max(0, this.hp / this.maxHp);
    let hpColor = 0x66ff66;
    if (hpRatio < 0.6) hpColor = 0xffff66;
    if (hpRatio < 0.3) hpColor = 0xff6666;

    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRect(-barWidth / 2, y, barWidth * hpRatio, barHeight);

    this.hpBar.lineStyle(1, 0x660088, 0.8);
    this.hpBar.strokeRect(-barWidth / 2, y, barWidth, barHeight);
  }

  private createParticles(): void {
    try {
      const tex = this.scene.textures.get('enemy_particle');
      if (!tex || !tex.key) {
        const g = this.scene.add.graphics();
        g.fillStyle(this.stats.color, 1);
        g.fillCircle(3, 3, 3);
        g.generateTexture('enemy_particle', 6, 6);
        g.destroy();
      }
    } catch (e) {}

    this.particles = null;
  }

  public takeDamage(amount: number, ignoreShield: boolean): void {
    if (this.isDead) return;

    if (this.hasShield && this.shieldHp > 0 && !ignoreShield) {
      this.shieldHp = Math.max(0, this.shieldHp - amount);
      if (this.shieldHp <= 0) {
        this.hasShield = false;
        this.playSound(200, 0.2, 'square', 0.1);
      }
      this.drawShield(this.stats.size);
      this.flashHit(0x66ccff);
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.drawHpBar(this.stats.size);
    this.flashHit(0xffffff);

    if (this.hp <= 0) {
      this.die();
    }
  }

  private flashHit(color: number): void {
    if (this.hitFlashTween) this.hitFlashTween.remove();
    this.setAlpha(0.7);
    this.hitFlashTween = this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 60,
      yoyo: true,
      repeat: 1
    });
  }

  public applySlow(factor: number, duration: number): void {
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  public applyPull(dx: number, dy: number): void {
    this.pullX += dx;
    this.pullY += dy;
  }

  public update(time: number, delta: number): void {
    if (this.isDead) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    const { ORBIT, CENTER } = GAME_CONFIG;
    const targetRadius = ORBIT.innerRadius + 20;
    const dr = (targetRadius - this.radius);
    const spiralFactor = 0.008;

    this.orbitAngle += this.speed * this.slowFactor * 0.01;
    this.radius += dr * spiralFactor * this.slowFactor;

    const baseX = CENTER.x + Math.cos(this.orbitAngle) * this.radius;
    const baseY = CENTER.y + Math.sin(this.orbitAngle) * this.radius;

    this.setPosition(baseX + this.pullX, baseY + this.pullY);
    this.pullX *= 0.85;
    this.pullY *= 0.85;

    this.bodyShape.rotation += 0.02;
  }

  public reachedCenter(): boolean {
    const { ORBIT, CENTER } = GAME_CONFIG;
    const dx = this.x - CENTER.x;
    const dy = this.y - CENTER.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= ORBIT.innerRadius + 15;
  }

  public shouldSpawnSplits(): boolean {
    return this.type === 'splitter' && !this.isMini;
  }

  public getSplitPositions(): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const count = this.stats.splitCount || 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      positions.push({ x: this.x + Math.cos(a) * 15, y: this.y + Math.sin(a) * 15 });
    }
    return positions;
  }

  public setStartPosition(x: number, y: number): void {
    this.setPosition(x, y);
    const { CENTER } = GAME_CONFIG;
    this.orbitAngle = Math.atan2(y - CENTER.y, x - CENTER.x);
    const dx = x - CENTER.x;
    const dy = y - CENTER.y;
    this.radius = Math.sqrt(dx * dx + dy * dy);
  }

  private die(): void {
    this.isDead = true;
    this.spawnDeathParticles();
    this.screenShake();
    this.playSound(120, 0.15, 'sawtooth', 0.08);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 200,
      onComplete: () => {
        this.setVisible(false);
      }
    });
  }

  private spawnDeathParticles(): void {
    const color = this.stats.color;
    const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

    for (let burst = 0; burst < 2; burst++) {
      const emitter = this.scene.add.particles(0, 0, 'enemy_particle', {
        x: this.x,
        y: this.y,
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        lifespan: { min: 400, max: 800 },
        quantity: 12 + burst * 8,
        blendMode: 'ADD',
        tint: [color, 0xffaaff, 0xffffff, color],
        emitting: false
      });
      emitters.push(emitter);
      this.scene.time.delayedCall(burst * 60, () => emitter.explode());
    }

    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 0.6);
    flash.fillCircle(this.x, this.y, this.stats.size + 10);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 300,
      onComplete: () => flash.destroy()
    });

    this.scene.time.delayedCall(1200, () => {
      for (const e of emitters) e.destroy();
    });
  }

  private screenShake(): void {
    const cam = this.scene.cameras.main;
    cam.shake(120, 0.004);
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

  public cleanup(): void {
    if (this.hitFlashTween) this.hitFlashTween.remove();
    if (this.particles) this.particles.destroy();
  }
}
