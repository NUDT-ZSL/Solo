import Phaser from 'phaser';
import type { ElementType } from '../config/elements';
import { ELEMENTS } from '../config/elements';
import { GUARDIAN_STATS, FUSION_ATTACK_SPEED_MULTIPLIER, FUSION_DAMAGE_MULTIPLIER } from '../config/gameConfig';
import type { ParticlePool } from '../utils/ParticlePool';

export interface Projectile {
  x: number;
  y: number;
  target: { x: number; y: number; alive: boolean; ref?: unknown };
  speed: number;
  damage: number;
  color: number;
  element: ElementType;
  trail: { x: number; y: number; alpha: number }[];
  alive: boolean;
  targetRef: unknown;
}

export class Guardian {
  scene: Phaser.Scene;
  element: ElementType;
  x: number;
  y: number;
  slotIndex: number;
  baseDamage: number;
  baseAttackSpeed: number;
  range: number;
  hp: number;
  maxHp: number;

  container!: Phaser.GameObjects.Container;
  sprite!: Phaser.GameObjects.Arc;
  halo!: Phaser.GameObjects.Arc;
  elementIcon!: Phaser.GameObjects.Text;
  rangeCircle!: Phaser.GameObjects.Arc;

  attackTimer: number = 0;
  fusedPartners: number[] = [];
  isFused: boolean = false;
  particlePool: ParticlePool;
  fusionLines: Map<number, { line: Phaser.GameObjects.Graphics; phase: number }> = new Map();

  constructor(
    scene: Phaser.Scene,
    element: ElementType,
    x: number,
    y: number,
    slotIndex: number,
    particlePool: ParticlePool
  ) {
    this.scene = scene;
    this.element = element;
    this.x = x;
    this.y = y;
    this.slotIndex = slotIndex;
    this.particlePool = particlePool;
    const stats = GUARDIAN_STATS[element];
    this.baseDamage = stats.baseDamage;
    this.baseAttackSpeed = stats.baseAttackSpeed;
    this.range = stats.range;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.createVisuals();
  }

  private createVisuals(): void {
    const cfg = ELEMENTS[this.element];
    this.container = this.scene.add.container(this.x, this.y);
    this.container.setDepth(20);
    this.container.setAlpha(0);
    this.container.setScale(0);

    this.halo = this.scene.add.circle(0, 0, 34, cfg.color, 0.12);
    this.halo.setStrokeStyle(2, cfg.color, 0.6);
    this.container.add(this.halo);

    this.sprite = this.scene.add.circle(0, 0, 20, cfg.color, 0.85);
    this.sprite.setStrokeStyle(3, 0xffffff, 0.9);
    this.container.add(this.sprite);

    this.elementIcon = this.scene.add.text(0, -2, cfg.icon, {
      fontSize: '22px',
      fontFamily: 'sans-serif'
    });
    this.elementIcon.setOrigin(0.5);
    this.container.add(this.elementIcon);

    this.rangeCircle = this.scene.add.circle(0, 0, this.range, cfg.color, 0.05);
    this.rangeCircle.setStrokeStyle(1, cfg.color, 0.15);
    this.rangeCircle.setVisible(false);
    this.container.add(this.rangeCircle);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 350,
      ease: 'Back.Out'
    });

    this.scene.tweens.add({
      targets: this.halo,
      scale: { from: 0.85, to: 1.15 },
      alpha: { from: 0.1, to: 0.25 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  get currentAttackSpeed(): number {
    return this.baseAttackSpeed * (this.isFused ? FUSION_ATTACK_SPEED_MULTIPLIER : 1);
  }

  get currentDamage(): number {
    return this.baseDamage * (this.isFused ? FUSION_DAMAGE_MULTIPLIER : 1);
  }

  setFusion(partners: number[]): void {
    const wasFused = this.isFused;
    this.fusedPartners = partners;
    this.isFused = partners.length > 0;
    if (this.isFused && !wasFused) {
      this.scene.tweens.add({
        targets: [this.sprite, this.halo],
        scale: { from: 1, to: 1.25 },
        duration: 250,
        yoyo: true,
        ease: 'Back.InOut'
      });
    }
    if (this.halo) {
      this.halo.setAlpha(this.isFused ? 0.35 : 0.18);
    }
  }

  addFusionLine(partnerSlot: number, partnerX: number, partnerY: number, partnerElement: ElementType): void {
    if (this.fusionLines.has(partnerSlot)) return;
    const graphics = this.scene.add.graphics();
    graphics.setDepth(15);
    this.fusionLines.set(partnerSlot, { line: graphics, phase: Math.random() * 100 });
    this.updateFusionLine(partnerSlot, partnerX, partnerY, partnerElement);
    this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: 400,
      ease: 'Power2.Out',
      onUpdate: (tween) => {
        const val = tween.getValue();
        const entry = this.fusionLines.get(partnerSlot);
        if (entry) {
          entry.line.clear();
          const myColor = ELEMENTS[this.element].color;
          const theirColor = ELEMENTS[partnerElement].color;
          const dx = partnerX - this.x;
          const dy = partnerY - this.y;
          const nx = this.x + dx * val;
          const ny = this.y + dy * val;
          entry.line.lineStyle(3, myColor, 0.9 * val);
          entry.line.beginPath();
          entry.line.moveTo(this.x, this.y);
          const midX = (this.x + nx) / 2 + Math.sin(entry.phase) * 8;
          const midY = (this.y + ny) / 2 + Math.cos(entry.phase) * 8;
          entry.line.quadraticCurveTo(midX, midY, nx, ny);
          entry.line.strokePath();
          entry.line.lineStyle(5, theirColor, 0.15 * val);
          entry.line.strokePath();
        }
      }
    });
  }

  updateFusionLine(partnerSlot: number, partnerX: number, partnerY: number, partnerElement: ElementType): void {
    const entry = this.fusionLines.get(partnerSlot);
    if (!entry) return;
    entry.phase += 0.08;
    entry.line.clear();
    const myColor = ELEMENTS[this.element].color;
    const theirColor = ELEMENTS[partnerElement].color;
    const t = (Math.sin(entry.phase) + 1) / 2;
    const gradColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(myColor),
      Phaser.Display.Color.IntegerToColor(theirColor),
      1,
      t
    );
    const merged = Phaser.Display.Color.GetColor(gradColor.r, gradColor.g, gradColor.b);
    entry.line.lineStyle(4, merged, 0.95);
    entry.line.beginPath();
    entry.line.moveTo(this.x, this.y);
    const midX = (this.x + partnerX) / 2 + Math.sin(entry.phase * 1.3) * 10;
    const midY = (this.y + partnerY) / 2 + Math.cos(entry.phase * 1.3) * 10;
    entry.line.quadraticCurveTo(midX, midY, partnerX, partnerY);
    entry.line.strokePath();
    entry.line.lineStyle(7, merged, 0.2);
    entry.line.strokePath();
  }

  removeFusionLine(partnerSlot: number): void {
    const entry = this.fusionLines.get(partnerSlot);
    if (entry) {
      this.scene.tweens.add({
        targets: { a: 1 },
        a: 0,
        duration: 300,
        ease: 'Power2.In',
        onUpdate: (tween) => {
          entry.line.setAlpha(tween.getValue());
        },
        onComplete: () => {
          entry.line.destroy();
          this.fusionLines.delete(partnerSlot);
        }
      });
    }
  }

  removeAllFusionLines(): void {
    for (const key of Array.from(this.fusionLines.keys())) {
      this.removeFusionLine(key);
    }
  }

  update(dt: number, targets: { x: number; y: number; alive: boolean; ref: unknown }[]): Projectile | null {
    this.attackTimer -= dt;
    if (this.attackTimer > 0) return null;
    let nearest: { x: number; y: number; alive: boolean; ref: unknown } | null = null;
    let nearestDist = Infinity;
    for (const t of targets) {
      if (!t.alive) continue;
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= this.range * this.range && d2 < nearestDist) {
        nearest = t;
        nearestDist = d2;
      }
    }
    if (!nearest) return null;
    this.attackTimer = 1 / this.currentAttackSpeed;
    const cfg = ELEMENTS[this.element];
    const p: Projectile = {
      x: this.x,
      y: this.y,
      target: nearest,
      speed: 420,
      damage: this.currentDamage,
      color: cfg.projectileColor,
      element: this.element,
      trail: [],
      alive: true,
      targetRef: nearest.ref
    };
    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 1, to: 1.15 },
      duration: 80,
      yoyo: true,
      ease: 'Sine.Out'
    });
    return p;
  }

  takeDamage(dmg: number): void {
    this.hp -= dmg;
    this.particlePool.emit(this.x, this.y, 4, 0xff0000, { life: 0.3, maxSpeed: 60 });
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  destroy(): void {
    this.removeAllFusionLines();
    this.particlePool.emit(this.x, this.y, 12, ELEMENTS[this.element].color, {
      life: 0.8,
      maxSpeed: 180,
      minSize: 3,
      maxSize: 6
    });
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.3,
      duration: 300,
      ease: 'Back.In',
      onComplete: () => {
        this.container.destroy();
      }
    });
  }

  showRange(show: boolean): void {
    this.rangeCircle.setVisible(show);
  }
}
