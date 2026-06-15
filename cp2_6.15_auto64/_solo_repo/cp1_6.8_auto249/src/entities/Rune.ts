import { Container, Graphics, BlurFilter } from 'pixi.js';

export enum RuneType {
  FIRE = 'fire',
  ICE = 'ice',
  LIGHTNING = 'lightning',
}

export enum RuneTeam {
  PLAYER = 'player',
  ENEMY = 'enemy',
}

export const RUNE_COLORS: Record<RuneType, number> = {
  [RuneType.FIRE]: 0xff5522,
  [RuneType.ICE]: 0x44ccff,
  [RuneType.LIGHTNING]: 0xbb55ff,
};

export const RUNE_GLOW_COLORS: Record<RuneType, number> = {
  [RuneType.FIRE]: 0xff8844,
  [RuneType.ICE]: 0x88ddff,
  [RuneType.LIGHTNING]: 0xdd88ff,
};

const TYPE_ADVANTAGE: Record<RuneType, RuneType> = {
  [RuneType.FIRE]: RuneType.ICE,
  [RuneType.ICE]: RuneType.LIGHTNING,
  [RuneType.LIGHTNING]: RuneType.FIRE,
};

interface Particle {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export function getDamageMultiplier(attacker: RuneType, defender: RuneType): number {
  if (TYPE_ADVANTAGE[attacker] === defender) return 2;
  if (TYPE_ADVANTAGE[defender] === attacker) return 0.5;
  return 1;
}

export class Rune extends Container {
  public runeType: RuneType;
  public team: RuneTeam;
  public hp: number;
  public maxHp: number;
  public attackPower: number;
  public gridX: number = 0;
  public gridY: number = 0;
  public isAlive: boolean = true;

  private symbolGfx: Graphics;
  private glowGfx: Graphics;
  private hpBar: Graphics;
  private particles: Particle[] = [];
  private particleContainer: Container;
  private auraTimer: number = 0;
  private cellSize: number = 60;

  constructor(type: RuneType, team: RuneTeam, cellSize: number) {
    super();
    this.runeType = type;
    this.team = team;
    this.cellSize = cellSize;
    this.maxHp = 100;
    this.hp = 100;
    this.attackPower = 25;

    this.particleContainer = new Container();
    this.addChild(this.particleContainer);

    this.glowGfx = new Graphics();
    this.addChild(this.glowGfx);

    this.symbolGfx = new Graphics();
    this.addChild(this.symbolGfx);

    this.hpBar = new Graphics();
    this.addChild(this.hpBar);

    this.drawSymbol();
    this.drawGlow();
    this.drawHpBar();
  }

  private drawSymbol(): void {
    const g = this.symbolGfx;
    g.clear();
    const color = RUNE_COLORS[this.runeType];
    const s = this.cellSize * 0.32;

    g.lineStyle(2.5, color, 1);

    if (this.runeType === RuneType.FIRE) {
      g.moveTo(0, -s);
      g.lineTo(s * 0.6, s * 0.3);
      g.lineTo(s * 0.2, s * 0.05);
      g.lineTo(s * 0.5, s);
      g.lineTo(0, s * 0.35);
      g.lineTo(-s * 0.5, s);
      g.lineTo(-s * 0.2, s * 0.05);
      g.lineTo(-s * 0.6, s * 0.3);
      g.closePath();
    } else if (this.runeType === RuneType.ICE) {
      g.moveTo(0, -s);
      g.lineTo(s * 0.35, 0);
      g.lineTo(0, s);
      g.lineTo(-s * 0.35, 0);
      g.closePath();
      g.moveTo(-s, 0);
      g.lineTo(0, -s * 0.35);
      g.lineTo(s, 0);
      g.lineTo(0, s * 0.35);
      g.closePath();
    } else {
      g.moveTo(-s * 0.3, -s);
      g.lineTo(s * 0.1, -s * 0.2);
      g.lineTo(-s * 0.15, s * 0.1);
      g.lineTo(s * 0.3, s);
      g.lineTo(-s * 0.1, s * 0.2);
      g.lineTo(s * 0.15, -s * 0.1);
      g.closePath();
    }

    g.beginFill(color, 0.15);
    g.closePath();
    g.endFill();
  }

  private drawGlow(): void {
    const g = this.glowGfx;
    g.clear();
    const glowColor = RUNE_GLOW_COLORS[this.runeType];
    const r = this.cellSize * 0.38;
    g.beginFill(glowColor, 0.08);
    g.drawCircle(0, 0, r);
    g.endFill();
    g.beginFill(glowColor, 0.04);
    g.drawCircle(0, 0, r * 1.4);
    g.endFill();
  }

  drawHpBar(): void {
    const g = this.hpBar;
    g.clear();
    if (!this.isAlive) return;
    const w = this.cellSize * 0.5;
    const h = 3;
    const yOff = -this.cellSize * 0.38;
    const pct = Math.max(0, this.hp / this.maxHp);

    g.beginFill(0x333333, 0.6);
    g.drawRect(-w / 2, yOff, w, h);
    g.endFill();

    const barColor = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff3333;
    g.beginFill(barColor, 0.9);
    g.drawRect(-w / 2, yOff, w * pct, h);
    g.endFill();
  }

  spawnIdleParticle(): void {
    const color = RUNE_COLORS[this.runeType];
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.cellSize * 0.3;
    const gfx = new Graphics();
    const size = 1 + Math.random() * 2;
    gfx.beginFill(color, 0.6);
    gfx.drawCircle(0, 0, size);
    gfx.endFill();
    gfx.x = Math.cos(angle) * dist;
    gfx.y = Math.sin(angle) * dist;

    const p: Particle = {
      gfx,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.2 - Math.random() * 0.5,
      life: 0,
      maxLife: 30 + Math.random() * 30,
      size,
    };
    this.particles.push(p);
    this.particleContainer.addChild(gfx);
  }

  spawnTrailParticle(fromX: number, fromY: number): void {
    const color = RUNE_COLORS[this.runeType];
    const gfx = new Graphics();
    const size = 1.5 + Math.random() * 2;
    gfx.beginFill(color, 0.5);
    gfx.drawCircle(0, 0, size);
    gfx.endFill();
    gfx.x = fromX;
    gfx.y = fromY;

    const p: Particle = {
      gfx,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 0,
      maxLife: 15 + Math.random() * 10,
      size,
    };
    this.particles.push(p);
    this.particleContainer.addChild(gfx);
  }

  spawnAttackBurst(color: number, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const gfx = new Graphics();
      const size = 2 + Math.random() * 3;
      gfx.beginFill(color, 0.8);
      gfx.drawCircle(0, 0, size);
      gfx.endFill();

      const p: Particle = {
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.random() * 20,
        size,
      };
      this.particles.push(p);
      this.particleContainer.addChild(gfx);
    }
  }

  spawnDestroyBurst(): void {
    const color = RUNE_COLORS[this.runeType];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const gfx = new Graphics();
      const size = 2 + Math.random() * 4;
      gfx.beginFill(color, 0.9);
      gfx.drawCircle(0, 0, size);
      gfx.endFill();

      const p: Particle = {
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 30 + Math.random() * 40,
        size,
      };
      this.particles.push(p);
      this.particleContainer.addChild(gfx);
    }
  }

  update(delta: number): void {
    this.auraTimer += delta;
    if (this.isAlive && this.auraTimer > 3) {
      this.auraTimer = 0;
      this.spawnIdleParticle();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      p.gfx.x += p.vx * delta;
      p.gfx.y += p.vy * delta;
      const pct = 1 - p.life / p.maxLife;
      p.gfx.alpha = Math.max(0, pct);
      p.gfx.scale.set(Math.max(0.01, pct));

      if (p.life >= p.maxLife) {
        this.particleContainer.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  takeDamage(amount: number): void {
    if (!this.isAlive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.drawHpBar();
    if (this.hp <= 0) {
      this.isAlive = false;
      this.symbolGfx.visible = false;
      this.glowGfx.visible = false;
      this.hpBar.visible = false;
      this.spawnDestroyBurst();
    }
  }

  setCellSize(size: number): void {
    this.cellSize = size;
    this.symbolGfx.clear();
    this.glowGfx.clear();
    this.hpBar.clear();
    this.drawSymbol();
    this.drawGlow();
    this.drawHpBar();
  }

  override destroy(options?: any): void {
    for (const p of this.particles) {
      this.particleContainer.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.particles = [];
    super.destroy(options);
  }
}
