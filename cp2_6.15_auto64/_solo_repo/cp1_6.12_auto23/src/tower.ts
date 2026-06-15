import { Enemy } from './enemy';
import { TILE_SIZE } from './gameMap';

export const BUILD_ANIMATION_DURATION = 0.5;
export const BUILD_ANIMATION_MAX_SCALE = 1.2;
export const BUILD_ANIMATION_MIN_SCALE = 0;
export const SHOOT_ANIMATION_DURATION = 0.2;
export const SHOOT_SCALE_FACTOR = 1.15;
export const PROJECTILE_TRAIL_LENGTH = 8;

export const DEATH_PARTICLE_COUNT = 24;
export const DEATH_PARTICLE_MIN_SPEED = 80;
export const DEATH_PARTICLE_MAX_SPEED = 300;
export const DEATH_PARTICLE_MIN_LIFE = 0.6;
export const DEATH_PARTICLE_MAX_LIFE = 1.0;
export const DEATH_PARTICLE_GRAVITY = 450;
export const DEATH_PARTICLE_DRAG = 0.98;
export const DEATH_PARTICLE_COLORS = [
  '#ff6b6b', '#ff8787', '#ffa8a8', '#ffc9c9', '#ffd43b'
];

export const CANNON_SPLASH_FALLOFF = 0.5;
export const MAGIC_SLOW_DEFAULT_FACTOR = 0.55;
export const MAGIC_SLOW_DEFAULT_DURATION = 1.8;
export const MAX_UPGRADE_LEVEL = 3;
export const UPGRADE_FIRERATE_FACTOR = 0.9;
export const SELL_VALUE_RATIO = 0.6;

export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

export enum TowerType {
  ARROW = 'arrow',
  CANNON = 'cannon',
  MAGIC = 'magic'
}

export interface TowerConfig {
  name: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  color: string;
  secondaryColor: string;
  bulletSpeed: number;
  bulletColor: string;
  description: string;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  upgradeCost: number;
  upgradeDamageMultiplier: number;
  upgradeRangeMultiplier: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  [TowerType.ARROW]: {
    name: '箭塔',
    cost: 50,
    damage: 25,
    range: 130,
    fireRate: 0.45,
    color: '#51cf66',
    secondaryColor: '#2b8a3e',
    bulletSpeed: 600,
    bulletColor: '#a9e34b',
    description: '攻速快，单体伤害',
    upgradeCost: 40,
    upgradeDamageMultiplier: 1.6,
    upgradeRangeMultiplier: 1.15
  },
  [TowerType.CANNON]: {
    name: '炮塔',
    cost: 100,
    damage: 60,
    range: 110,
    fireRate: 1.2,
    color: '#ff922b',
    secondaryColor: '#d9480f',
    bulletSpeed: 350,
    bulletColor: '#ffe066',
    description: '范围爆炸伤害',
    splashRadius: 55,
    upgradeCost: 80,
    upgradeDamageMultiplier: 1.8,
    upgradeRangeMultiplier: 1.1
  },
  [TowerType.MAGIC]: {
    name: '魔法塔',
    cost: 75,
    damage: 18,
    range: 120,
    fireRate: 0.75,
    color: '#4dabf7',
    secondaryColor: '#1971c2',
    bulletSpeed: 450,
    bulletColor: '#74c0fc',
    description: '魔法减速效果',
    slowFactor: MAGIC_SLOW_DEFAULT_FACTOR,
    slowDuration: MAGIC_SLOW_DEFAULT_DURATION,
    upgradeCost: 60,
    upgradeDamageMultiplier: 1.5,
    upgradeRangeMultiplier: 1.15
  }
};

export interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetEnemy: Enemy | null;
  speed: number;
  damage: number;
  color: string;
  type: TowerType;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  dead: boolean;
  trail: { x: number; y: number }[];
}

export class Tower {
  private gridX: number;
  private gridY: number;
  private centerX: number;
  private centerY: number;
  private type: TowerType;
  private config: TowerConfig;
  private damage: number;
  private range: number;
  private fireRate: number;
  private fireTimer: number;
  private level: number;
  private buildProgress: number;
  private buildDuration: number;
  private shootProgress: number;
  private totalKills: number;

  constructor(gridX: number, gridY: number, type: TowerType) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.centerX = gridX * TILE_SIZE + TILE_SIZE / 2;
    this.centerY = gridY * TILE_SIZE + TILE_SIZE / 2;
    this.type = type;
    this.config = TOWER_CONFIGS[type];
    this.damage = this.config.damage;
    this.range = this.config.range;
    this.fireRate = this.config.fireRate;
    this.fireTimer = 0;
    this.level = 1;
    this.buildProgress = 0;
    this.buildDuration = BUILD_ANIMATION_DURATION;
    this.shootProgress = 0;
    this.totalKills = 0;
  }

  update(deltaTime: number, enemies: Enemy[], projectiles: Projectile[]): void {
    if (this.buildProgress < 1) {
      this.buildProgress = Math.min(1, this.buildProgress + deltaTime / this.buildDuration);
    }

    if (this.fireTimer > 0) {
      this.fireTimer -= deltaTime;
    }

    if (this.shootProgress > 0) {
      this.shootProgress = Math.max(0, this.shootProgress - deltaTime / SHOOT_ANIMATION_DURATION);
    }

    if (this.fireTimer <= 0 && this.buildProgress >= 0.6) {
      const target = this.findTarget(enemies);
      if (target) {
        this.fire(target, projectiles);
        this.fireTimer = this.fireRate;
        this.shootProgress = 1;
      }
    }
  }

  private findTarget(enemies: Enemy[]): Enemy | null {
    let bestTarget: Enemy | null = null;
    let bestProgress = -1;

    const rangeSq = this.range * this.range;
    for (const enemy of enemies) {
      if (enemy.isDead() || enemy.hasReachedEnd()) continue;

      const dx = enemy.getX() - this.centerX;
      const dy = enemy.getY() - this.centerY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= rangeSq) {
        const progress = (enemy as unknown as { pathIndex?: number }).pathIndex ?? 0;
        if (progress > bestProgress) {
          bestProgress = progress;
          bestTarget = enemy;
        }
      }
    }

    return bestTarget;
  }

  private fire(target: Enemy, projectiles: Projectile[]): void {
    const projectile: Projectile = {
      x: this.centerX,
      y: this.centerY,
      targetX: target.getX(),
      targetY: target.getY(),
      targetEnemy: target,
      speed: this.config.bulletSpeed,
      damage: this.damage,
      color: this.config.bulletColor,
      type: this.type,
      splashRadius: this.config.splashRadius,
      slowFactor: this.config.slowFactor,
      slowDuration: this.config.slowDuration,
      dead: false,
      trail: []
    };
    projectiles.push(projectile);
  }

  upgrade(): boolean {
    if (this.level >= MAX_UPGRADE_LEVEL) return false;
    this.level++;
    this.damage = Math.floor(this.damage * this.config.upgradeDamageMultiplier);
    this.range = this.range * this.config.upgradeRangeMultiplier;
    this.fireRate = this.fireRate * UPGRADE_FIRERATE_FACTOR;
    return true;
  }

  canUpgrade(): boolean {
    return this.level < MAX_UPGRADE_LEVEL;
  }

  getUpgradeCost(): number {
    return this.config.upgradeCost * this.level;
  }

  getSellValue(): number {
    let totalCost = this.config.cost;
    for (let i = 1; i < this.level; i++) {
      totalCost += this.config.upgradeCost * i;
    }
    return Math.floor(totalCost * SELL_VALUE_RATIO);
  }

  render(ctx: CanvasRenderingContext2D, showRange: boolean = false): void {
    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    const scale = this.getBuildScale();
    const alpha = this.getBuildAlpha();
    ctx.globalAlpha = alpha;
    ctx.scale(scale, scale);

    if (showRange) {
      ctx.globalAlpha = alpha * 0.15;
      ctx.fillStyle = this.config.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.range / scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = this.config.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.range / scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }

    this.renderBase(ctx);
    this.renderTowerBody(ctx);
    this.renderTop(ctx);

    ctx.restore();

    if (this.level > 1) {
      ctx.globalAlpha = Math.min(1, this.buildProgress * 1.5);
      this.renderLevelIndicator(ctx);
      ctx.globalAlpha = 1;
    }
  }

  private getBuildScale(): number {
    if (this.buildProgress >= 1) {
      return 1;
    }
    const rawScale = easeOutBack(this.buildProgress);
    return Math.max(
      BUILD_ANIMATION_MIN_SCALE,
      Math.min(BUILD_ANIMATION_MAX_SCALE, rawScale)
    );
  }

  private getBuildAlpha(): number {
    if (this.buildProgress >= 1) return 1;
    return easeOutCubic(this.buildProgress);
  }

  private renderBase(ctx: CanvasRenderingContext2D): void {
    const baseSize = TILE_SIZE * 0.42;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(2, baseSize * 0.8 + 2, baseSize, baseSize * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const baseGradient = ctx.createRadialGradient(0, -baseSize * 0.2, 0, 0, baseSize * 0.4, baseSize);
    baseGradient.addColorStop(0, '#495057');
    baseGradient.addColorStop(1, '#212529');
    ctx.fillStyle = baseGradient;
    ctx.beginPath();
    ctx.ellipse(0, baseSize * 0.5, baseSize, baseSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderTowerBody(ctx: CanvasRenderingContext2D): void {
    const bodyHeight = TILE_SIZE * 0.35;
    const bodyWidth = TILE_SIZE * 0.28;

    const bodyGradient = ctx.createLinearGradient(-bodyWidth, -bodyHeight, bodyWidth, bodyHeight);
    bodyGradient.addColorStop(0, this.config.color);
    bodyGradient.addColorStop(0.5, lightenColor(this.config.color, 20));
    bodyGradient.addColorStop(1, this.config.secondaryColor);

    ctx.fillStyle = bodyGradient;

    if (this.type === TowerType.ARROW) {
      ctx.beginPath();
      ctx.moveTo(0, -bodyHeight - TILE_SIZE * 0.12);
      ctx.lineTo(-bodyWidth, TILE_SIZE * 0.45);
      ctx.lineTo(bodyWidth, TILE_SIZE * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = this.config.secondaryColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.type === TowerType.CANNON) {
      roundRect(ctx, -bodyWidth, -bodyHeight, bodyWidth * 2, bodyHeight * 1.6, 6);
      ctx.fill();
      ctx.strokeStyle = this.config.secondaryColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -bodyHeight - TILE_SIZE * 0.15);
      ctx.lineTo(bodyWidth, -bodyHeight * 0.3);
      ctx.lineTo(bodyWidth * 0.8, bodyHeight * 0.5);
      ctx.lineTo(-bodyWidth * 0.8, bodyHeight * 0.5);
      ctx.lineTo(-bodyWidth, -bodyHeight * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = this.config.secondaryColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private renderTop(ctx: CanvasRenderingContext2D): void {
    const topY = -TILE_SIZE * 0.45;
    const shootScale = 1 + easeOutCubic(1 - this.shootProgress) * (SHOOT_SCALE_FACTOR - 1);

    ctx.save();
    ctx.translate(0, topY);
    ctx.scale(shootScale, shootScale);

    if (this.type === TowerType.ARROW) {
      const topSize = TILE_SIZE * 0.18;
      ctx.fillStyle = this.config.secondaryColor;
      ctx.beginPath();
      ctx.moveTo(0, -topSize * 1.2);
      ctx.lineTo(-topSize, topSize * 0.6);
      ctx.lineTo(topSize, topSize * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = this.config.color;
      ctx.beginPath();
      ctx.arc(0, topSize * 0.2, topSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === TowerType.CANNON) {
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.arc(0, 0, TILE_SIZE * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = 2;
      ctx.stroke();

      const barrelLength = TILE_SIZE * 0.35;
      ctx.fillStyle = this.config.secondaryColor;
      roundRect(ctx, -TILE_SIZE * 0.08, -barrelLength, TILE_SIZE * 0.16, barrelLength, 3);
      ctx.fill();
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      const orbSize = TILE_SIZE * 0.2;
      const orbGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, orbSize * 2);
      orbGlow.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
      orbGlow.addColorStop(0.5, 'rgba(100, 200, 255, 0.3)');
      orbGlow.addColorStop(1, 'rgba(100, 200, 255, 0)');
      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(0, 0, orbSize * 2, 0, Math.PI * 2);
      ctx.fill();

      const orbGradient = ctx.createRadialGradient(-orbSize * 0.3, -orbSize * 0.3, 0, 0, 0, orbSize);
      orbGradient.addColorStop(0, '#ffffff');
      orbGradient.addColorStop(0.5, this.config.color);
      orbGradient.addColorStop(1, this.config.secondaryColor);
      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(0, 0, orbSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderLevelIndicator(ctx: CanvasRenderingContext2D): void {
    const indicatorY = this.centerY + TILE_SIZE * 0.4;
    const dotSpacing = 8;
    const totalWidth = (this.level - 1) * dotSpacing;
    const startX = this.centerX - totalWidth / 2;

    for (let i = 0; i < this.level; i++) {
      ctx.fillStyle = this.config.color;
      ctx.beginPath();
      ctx.arc(startX + i * dotSpacing, indicatorY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  getGridX(): number { return this.gridX; }
  getGridY(): number { return this.gridY; }
  getType(): TowerType { return this.type; }
  getConfig(): TowerConfig { return this.config; }
  getDamage(): number { return this.damage; }
  getRange(): number { return this.range; }
  getLevel(): number { return this.level; }
  getCenterX(): number { return this.centerX; }
  getCenterY(): number { return this.centerY; }
  getBuildProgress(): number { return this.buildProgress; }
  addKill(): void { this.totalKills++; }
  getTotalKills(): number { return this.totalKills; }
}

export function updateProjectiles(
  projectiles: Projectile[],
  enemies: Enemy[],
  deltaTime: number,
  particlesCallback?: (enemy: Enemy) => void
): void {
  for (const projectile of projectiles) {
    if (projectile.dead) continue;

    projectile.trail.push({ x: projectile.x, y: projectile.y });
    if (projectile.trail.length > PROJECTILE_TRAIL_LENGTH) {
      projectile.trail.shift();
    }

    if (projectile.targetEnemy && !projectile.targetEnemy.isDead()) {
      projectile.targetX = projectile.targetEnemy.getX();
      projectile.targetY = projectile.targetEnemy.getY();
    }

    const dx = projectile.targetX - projectile.x;
    const dy = projectile.targetY - projectile.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 8) {
      handleProjectileHit(projectile, enemies, particlesCallback);
      projectile.dead = true;
    } else {
      const moveDistance = projectile.speed * deltaTime;
      if (moveDistance >= distance) {
        projectile.x = projectile.targetX;
        projectile.y = projectile.targetY;
        handleProjectileHit(projectile, enemies, particlesCallback);
        projectile.dead = true;
      } else {
        projectile.x += (dx / distance) * moveDistance;
        projectile.y += (dy / distance) * moveDistance;
      }
    }
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
    if (projectiles[i].dead) {
      projectiles.splice(i, 1);
    }
  }
}

function handleProjectileHit(
  projectile: Projectile,
  enemies: Enemy[],
  particlesCallback?: (enemy: Enemy) => void
): void {
  if (projectile.splashRadius && projectile.splashRadius > 0) {
    for (const enemy of enemies) {
      if (enemy.isDead() || enemy.hasReachedEnd()) continue;
      const dx = enemy.getX() - projectile.x;
      const dy = enemy.getY() - projectile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= projectile.splashRadius) {
        const falloff = 1 - (dist / projectile.splashRadius) * CANNON_SPLASH_FALLOFF;
        enemy.takeDamage(projectile.damage * falloff);
        if (enemy.isDead() && particlesCallback) {
          particlesCallback(enemy);
        }
      }
    }
  } else {
    if (projectile.targetEnemy && !projectile.targetEnemy.isDead()) {
      projectile.targetEnemy.takeDamage(projectile.damage);
      if (projectile.slowFactor && projectile.slowDuration) {
        projectile.targetEnemy.applySlow(projectile.slowFactor, projectile.slowDuration);
      }
      if (projectile.targetEnemy.isDead() && particlesCallback) {
        particlesCallback(projectile.targetEnemy);
      }
    } else {
      for (const enemy of enemies) {
        if (enemy.isDead() || enemy.hasReachedEnd()) continue;
        const dx = enemy.getX() - projectile.x;
        const dy = enemy.getY() - projectile.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          enemy.takeDamage(projectile.damage);
          if (projectile.slowFactor && projectile.slowDuration) {
            enemy.applySlow(projectile.slowFactor, projectile.slowDuration);
          }
          if (enemy.isDead() && particlesCallback) {
            particlesCallback(enemy);
          }
          break;
        }
      }
    }
  }
}

export function renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
  for (const projectile of projectiles) {
    for (let i = 0; i < projectile.trail.length; i++) {
      const alpha = (i / projectile.trail.length) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(
        projectile.trail[i].x,
        projectile.trail[i].y,
        2 + (i / projectile.trail.length) * 2.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (projectile.type === TowerType.CANNON) {
      const size = 7;
      const gradient = ctx.createRadialGradient(
        projectile.x, projectile.y, 0,
        projectile.x, projectile.y, size
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, projectile.color);
      gradient.addColorStop(1, '#ff922b');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (projectile.type === TowerType.MAGIC) {
      const size = 6;
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(Date.now() * 0.01);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const r = i % 2 === 0 ? size : size * 0.5;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      const angle = Math.atan2(
        projectile.targetY - projectile.y,
        projectile.targetX - projectile.x
      );
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(angle);
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -3);
      ctx.lineTo(-6, 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
