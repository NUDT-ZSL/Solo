export type SpellType = 'fireball' | 'icespike' | 'teleport';

export interface SpellLevel {
  fireball: number;
  icespike: number;
  teleport: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: SpellType;
  damage: number;
  alive: boolean;
  slowDuration: number;
  piercing: boolean;
  hitMonsters: Set<number>;
  lifetime: number;
  maxLifetime: number;
}

export interface SpellConfig {
  damage: number;
  cooldown: number;
  speed: number;
  slowDuration: number;
  piercing: boolean;
  radius: number;
  color: string;
  glowColor: string;
}

const BASE_CONFIGS: Record<SpellType, SpellConfig> = {
  fireball: {
    damage: 25,
    cooldown: 800,
    speed: 400,
    slowDuration: 0,
    piercing: false,
    radius: 8,
    color: '#ff6622',
    glowColor: '#ff440088',
  },
  icespike: {
    damage: 15,
    cooldown: 1200,
    speed: 300,
    slowDuration: 2,
    piercing: true,
    radius: 6,
    color: '#aaddff',
    glowColor: '#66bbff88',
  },
  teleport: {
    damage: 0,
    cooldown: 5000,
    speed: 0,
    slowDuration: 0,
    piercing: false,
    radius: 12,
    color: '#cc66ff',
    glowColor: '#9933ff88',
  },
};

const UPGRADE_EFFECTS: Record<SpellType, { stat: string; amount: number }[]> = {
  fireball: [
    { stat: 'damage', amount: 10 },
  ],
  icespike: [
    { stat: 'slowDuration', amount: 1 },
  ],
  teleport: [
    { stat: 'cooldown', amount: -2000 },
  ],
};

export class SpellSystem {
  levels: SpellLevel;
  cooldowns: Record<SpellType, number>;
  private projectilePool: Projectile[];
  private activeProjectiles: Projectile[];

  constructor() {
    this.levels = { fireball: 1, icespike: 1, teleport: 1 };
    this.cooldowns = { fireball: 0, icespike: 0, teleport: 0 };
    this.projectilePool = [];
    this.activeProjectiles = [];
    for (let i = 0; i < 30; i++) {
      this.projectilePool.push(this.createEmptyProjectile());
    }
  }

  private createEmptyProjectile(): Projectile {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      type: 'fireball', damage: 0,
      alive: false, slowDuration: 0,
      piercing: false, hitMonsters: new Set(),
      lifetime: 0, maxLifetime: 3,
    };
  }

  getConfig(type: SpellType): SpellConfig {
    const base = { ...BASE_CONFIGS[type] };
    const level = this.levels[type] - 1;
    const upgrades = UPGRADE_EFFECTS[type];
    for (const upg of upgrades) {
      if (upg.stat === 'damage') base.damage += upg.amount * level;
      if (upg.stat === 'slowDuration') base.slowDuration += upg.amount * level;
      if (upg.stat === 'cooldown') base.cooldown = Math.max(500, base.cooldown + upg.amount * level);
    }
    return base;
  }

  canCast(type: SpellType, now: number): boolean {
    return now >= this.cooldowns[type];
  }

  cast(
    type: SpellType,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    now: number
  ): Projectile | null {
    if (!this.canCast(type, now)) return null;

    const config = this.getConfig(type);
    this.cooldowns[type] = now + config.cooldown;

    let proj = this.projectilePool.find(p => !p.alive);
    if (!proj) {
      proj = this.createEmptyProjectile();
      this.projectilePool.push(proj);
    }

    proj.alive = true;
    proj.type = type;
    proj.damage = config.damage;
    proj.slowDuration = config.slowDuration;
    proj.piercing = config.piercing;
    proj.hitMonsters = new Set();
    proj.lifetime = 0;
    proj.maxLifetime = 3;

    if (type === 'teleport') {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const teleportDist = Math.min(dist, 200);
      const angle = Math.atan2(dy, dx);
      proj.x = fromX + Math.cos(angle) * teleportDist;
      proj.y = fromY + Math.sin(angle) * teleportDist;
      proj.vx = 0;
      proj.vy = 0;
      proj.maxLifetime = 0.01;
      return proj;
    }

    proj.x = fromX;
    proj.y = fromY;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    proj.vx = (dx / dist) * config.speed;
    proj.vy = (dy / dist) * config.speed;

    return proj;
  }

  upgrade(type: SpellType): boolean {
    if (this.levels[type] >= 5) return false;
    this.levels[type]++;
    return true;
  }

  getActiveProjectiles(): Projectile[] {
    return this.activeProjectiles;
  }

  addProjectile(proj: Projectile): void {
    this.activeProjectiles.push(proj);
  }

  update(dt: number): void {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      p.lifetime += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.lifetime >= p.maxLifetime) {
        p.alive = false;
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  removeProjectile(index: number): void {
    const p = this.activeProjectiles[index];
    if (p) {
      p.alive = false;
      this.activeProjectiles.splice(index, 1);
    }
  }

  getCooldownPercent(type: SpellType, now: number): number {
    const config = this.getConfig(type);
    const remaining = this.cooldowns[type] - now;
    if (remaining <= 0) return 1;
    return 1 - remaining / config.cooldown;
  }
}
