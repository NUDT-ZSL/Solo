import Phaser from 'phaser';
import { SpellType, Point } from './RuneDetector';

export interface SpellConfig {
  type: SpellType;
  speed: number;
  damage: number;
  color: number;
  glowColor: number;
  particleColor: number[];
}

export const SPELL_CONFIGS: Record<SpellType, SpellConfig> = {
  fireball: {
    type: 'fireball',
    speed: 300,
    damage: 15,
    color: 0xff6600,
    glowColor: 0xffaa00,
    particleColor: [0xff6600, 0xff8800, 0xffaa00, 0xffcc44]
  },
  iceShard: {
    type: 'iceShard',
    speed: 250,
    damage: 20,
    color: 0x66ddff,
    glowColor: 0xaaffff,
    particleColor: [0x66ddff, 0x88eeff, 0xaaffff, 0xccffff]
  },
  lightning: {
    type: 'lightning',
    speed: 400,
    damage: 30,
    color: 0xffffff,
    glowColor: 0xffffcc,
    particleColor: [0xffffff, 0xffffcc, 0xccffff, 0xffff88]
  }
};

let particleTextureCreated = false;

function ensureParticleTexture(scene: Phaser.Scene): string {
  if (!particleTextureCreated) {
    const gfx = scene.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('__particle_dot', 8, 8);
    gfx.destroy();
    particleTextureCreated = true;
  }
  return '__particle_dot';
}

export class Spell extends Phaser.Physics.Arcade.Sprite {
  public spellType: SpellType;
  public config: SpellConfig;
  public direction: Point;
  public trailParticles: Phaser.GameObjects.Particles.ParticleEmitter;
  public trailGraphics: Phaser.GameObjects.Graphics[];
  public lifetime: number;
  public isDead: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, type: SpellType, direction: Point) {
    super(scene, x, y, 'spell-' + type);
    this.spellType = type;
    this.config = SPELL_CONFIGS[type];
    this.direction = direction;
    this.trailGraphics = [];
    this.lifetime = 0;
    this.isDead = false;

    this.setData('spell', this);
  }

  public initialize(): void {
    this.scene.physics.add.existing(this);
    this.setBodySize(24, 24);
    this.setCollideWorldBounds(false);
    this.setVelocity(
      this.direction.x * this.config.speed,
      this.direction.y * this.config.speed
    );
    this.setRotation(Math.atan2(this.direction.y, this.direction.x));
    this.initVisuals();
    this.initTrail();
  }

  private initVisuals(): void {
    const gfx = this.scene.add.graphics();
    const size = 18;
    gfx.clear();

    switch (this.spellType) {
      case 'fireball':
        gfx.fillStyle(this.config.color, 1);
        gfx.fillCircle(size / 2, size / 2, size / 2);
        gfx.fillStyle(this.config.glowColor, 0.6);
        gfx.fillCircle(size / 2, size / 2, size / 3);
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillCircle(size / 2, size / 2, size / 5);
        break;
      case 'iceShard':
        gfx.fillStyle(this.config.color, 1);
        gfx.fillTriangle(
          0, size / 2,
          size, size / 4,
          size, size * 3 / 4
        );
        gfx.fillStyle(this.config.glowColor, 0.5);
        gfx.fillTriangle(
          size / 4, size / 2,
          size, size / 3,
          size, size * 2 / 3
        );
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillCircle(size - 4, size / 2, 2);
        break;
      case 'lightning':
        gfx.lineStyle(3, this.config.color, 1);
        gfx.beginPath();
        gfx.moveTo(0, size / 2);
        gfx.lineTo(size * 0.2, size / 4);
        gfx.lineTo(size * 0.35, size * 3 / 4);
        gfx.lineTo(size * 0.5, size / 3);
        gfx.lineTo(size * 0.65, size * 3 / 4);
        gfx.lineTo(size * 0.8, size / 4);
        gfx.lineTo(size, size / 2);
        gfx.strokePath();
        gfx.lineStyle(1, 0xffffff, 0.8);
        gfx.strokePath();
        break;
    }

    gfx.generateTexture('spell-' + this.spellType, size, size);
    gfx.destroy();
    this.setTexture('spell-' + this.spellType);

    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.8, to: 1 },
      duration: 100,
      yoyo: true,
      repeat: -1
    });
  }

  private initTrail(): void {
    const tex = ensureParticleTexture(this.scene);
    this.trailParticles = this.scene.add.particles(this.x, this.y, tex, {
      lifespan: 600,
      speed: { min: 10, max: 30 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: this.config.particleColor,
      blendMode: Phaser.BlendModes.ADD,
      emitting: true,
      frequency: 20,
      quantity: 2
    });
  }

  public updateSpell(delta: number): void {
    this.lifetime += delta;

    if (this.trailParticles) {
      this.trailParticles.emitParticleAt(this.x, this.y, 1);
    }

    if (this.x < -50 || this.x > this.scene.scale.width + 50 ||
        this.y < -50 || this.y > this.scene.scale.height + 50 ||
        this.lifetime > 4000) {
      this.destroySpell();
    }
  }

  public createExplosion(): void {
    const scene = this.scene;
    const cfg = this.config;
    const px = this.x;
    const py = this.y;
    const tex = ensureParticleTexture(scene);

    const particles = scene.add.particles(px, py, tex, {
      lifespan: 800,
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: cfg.particleColor,
      blendMode: Phaser.BlendModes.ADD,
      emitting: true,
      frequency: 10,
      quantity: 25,
      duration: 400
    });

    const explosionRing = scene.add.circle(px, py, 10, cfg.glowColor, 0.6);
    scene.tweens.add({
      targets: explosionRing,
      radius: 80,
      alpha: 0,
      duration: 400,
      ease: 'Power2.Out',
      onComplete: () => { explosionRing.destroy(); }
    });

    setTimeout(() => {
      particles.stop();
      scene.time.delayedCall(800, () => {
        if (particles.active) particles.destroy();
      });
    }, 400);
  }

  public destroySpell(): void {
    if (this.isDead) return;
    this.isDead = true;
    if (this.trailParticles) {
      this.trailParticles.stop();
      this.scene.time.delayedCall(600, () => {
        if (this.trailParticles && this.trailParticles.active) this.trailParticles.destroy();
      });
    }
    this.destroy();
  }
}

export class SpellManager {
  private scene: Phaser.Scene;
  public spells: Phaser.Physics.Arcade.Group;
  private readonly MAX_SPELLS = 15;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.spells = this.scene.physics.add.group({
      classType: Spell,
      maxSize: this.MAX_SPELLS,
      runChildUpdate: false,
      allowGravity: false,
      immovable: false
    });
  }

  public createSpell(x: number, y: number, type: SpellType, direction: Point): Spell | null {
    if (this.spells.getChildren().length >= this.MAX_SPELLS) {
      const oldest = this.spells.getChildren()[0] as Spell;
      if (oldest) oldest.destroySpell();
    }

    const spell: Spell = new Spell(this.scene, x, y, type, direction);
    this.scene.add.existing(spell);
    this.spells.add(spell);
    spell.initialize();
    return spell;
  }

  public update(delta: number): void {
    const children = this.spells.getChildren() as Spell[];
    for (const spell of children) {
      if (!spell.isDead) {
        spell.updateSpell(delta);
      }
    }
  }

  public onSpellHitGhost(spell: Spell): void {
    spell.createExplosion();
    spell.destroySpell();
  }

  public clearAll(): void {
    const children = this.spells.getChildren() as Spell[];
    for (const spell of children) {
      spell.destroySpell();
    }
    this.spells.clear(true, true);
  }
}
