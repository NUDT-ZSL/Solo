import { WeatherType } from './weatherSystem';
import type { HexCoord } from './gameMap';

export enum TowerType {
  Fire = 'fire',
  Ice = 'ice',
  Lightning = 'lightning',
  Arrow = 'arrow'
}

export interface TowerConfig {
  type: TowerType;
  name: string;
  icon: string;
  cost: number;
  baseDamage: number;
  baseRange: number;
  baseAttackSpeed: number;
  projectileColor: string;
  towerColor: string;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  [TowerType.Fire]: {
    type: TowerType.Fire,
    name: '火焰塔',
    icon: '🔥',
    cost: 50,
    baseDamage: 25,
    baseRange: 120,
    baseAttackSpeed: 1.2,
    projectileColor: '#ff6b35',
    towerColor: '#ff6b35'
  },
  [TowerType.Ice]: {
    type: TowerType.Ice,
    name: '寒冰塔',
    icon: '❄️',
    cost: 60,
    baseDamage: 15,
    baseRange: 100,
    baseAttackSpeed: 1.0,
    projectileColor: '#4cc9f0',
    towerColor: '#4cc9f0'
  },
  [TowerType.Lightning]: {
    type: TowerType.Lightning,
    name: '雷电塔',
    icon: '⚡',
    cost: 80,
    baseDamage: 40,
    baseRange: 140,
    baseAttackSpeed: 0.7,
    projectileColor: '#b388ff',
    towerColor: '#b388ff'
  },
  [TowerType.Arrow]: {
    type: TowerType.Arrow,
    name: '远程箭塔',
    icon: '🏹',
    cost: 40,
    baseDamage: 18,
    baseRange: 180,
    baseAttackSpeed: 1.5,
    projectileColor: '#00f5d4',
    towerColor: '#00f5d4'
  }
};

export interface WeatherModifier {
  damageMult: number;
  rangeMult: number;
  speedMult: number;
}

export function getWeatherModifier(towerType: TowerType, weather: WeatherType): WeatherModifier {
  const mod: WeatherModifier = { damageMult: 1, rangeMult: 1, speedMult: 1 };

  switch (weather) {
    case WeatherType.Sunny:
      if (towerType === TowerType.Arrow) {
        mod.rangeMult = 1.2;
      }
      if (towerType === TowerType.Fire) {
        mod.damageMult = 1.1;
      }
      break;
    case WeatherType.Rainy:
      if (towerType === TowerType.Fire) {
        mod.damageMult = 0.7;
      }
      if (towerType === TowerType.Lightning) {
        mod.damageMult = 1.1;
      }
      break;
    case WeatherType.Thunderstorm:
      if (towerType === TowerType.Lightning) {
        mod.damageMult = 1.5;
        mod.speedMult = 1.2;
      }
      if (towerType === TowerType.Fire) {
        mod.damageMult = 0.6;
      }
      if (towerType === TowerType.Arrow) {
        mod.rangeMult = 0.9;
      }
      break;
    case WeatherType.Cloudy:
    default:
      break;
  }

  return mod;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  isElite: boolean;
  flashTime: number;
  slowTime: number;
}

export interface Tower {
  id: number;
  type: TowerType;
  q: number;
  r: number;
  x: number;
  y: number;
  level: number;
  cooldown: number;
  target: Enemy | null;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  speed: number;
  color: string;
  type: TowerType;
}

export type TowerStatsChangeListener = () => void;

export class TowerSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private nextTowerId = 1;
  private nextProjectileId = 1;
  private currentWeather: WeatherType = WeatherType.Cloudy;
  private statsChangeListeners: Set<TowerStatsChangeListener> = new Set();
  private hexSize: number = 48;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  setHexSize(size: number): void {
    this.hexSize = size;
  }

  setWeather(weather: WeatherType): void {
    const oldWeather = this.currentWeather;
    this.currentWeather = weather;
    if (oldWeather !== weather) {
      for (const listener of this.statsChangeListeners) {
        listener();
      }
    }
  }

  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  onStatsChange(listener: TowerStatsChangeListener): () => void {
    this.statsChangeListeners.add(listener);
    return () => this.statsChangeListeners.delete(listener);
  }

  getTowers(): Tower[] {
    return this.towers;
  }

  getTowerStats(type: TowerType): { damage: number; range: number; speed: number; modifier: WeatherModifier } {
    const config = TOWER_CONFIGS[type];
    const modifier = getWeatherModifier(type, this.currentWeather);
    return {
      damage: Math.round(config.baseDamage * modifier.damageMult),
      range: Math.round(config.baseRange * modifier.rangeMult),
      speed: +(config.baseAttackSpeed * modifier.speedMult).toFixed(2),
      modifier
    };
  }

  placeTower(coord: HexCoord, x: number, y: number, type: TowerType): Tower | null {
    const existing = this.towers.find(t => t.q === coord.q && t.r === coord.r);
    if (existing) return null;

    const tower: Tower = {
      id: this.nextTowerId++,
      type,
      q: coord.q,
      r: coord.r,
      x,
      y,
      level: 1,
      cooldown: 0,
      target: null
    };
    this.towers.push(tower);
    return tower;
  }

  removeTower(q: number, r: number): void {
    const idx = this.towers.findIndex(t => t.q === q && t.r === r);
    if (idx >= 0) {
      this.towers.splice(idx, 1);
    }
  }

  hasTowerAt(q: number, r: number): boolean {
    return this.towers.some(t => t.q === q && t.r === r);
  }

  getTowerAt(q: number, r: number): Tower | undefined {
    return this.towers.find(t => t.q === q && t.r === r);
  }

  update(dt: number, enemies: Enemy[]): { damageDealt: number; enemyId: number; slow: boolean }[] {
    const hits: { damageDealt: number; enemyId: number; slow: boolean }[] = [];

    for (const tower of this.towers) {
      this.updateTowerTargeting(tower, enemies);
      tower.cooldown -= dt;

      const stats = this.getTowerStats(tower.type);
      const attackInterval = 1 / stats.speed;

      if (tower.cooldown <= 0 && tower.target) {
        this.fireProjectile(tower, tower.target, stats.damage);
        tower.cooldown = attackInterval;
      }
    }

    this.updateProjectiles(dt, enemies, hits);
    return hits;
  }

  private updateTowerTargeting(tower: Tower, enemies: Enemy[]): void {
    const stats = this.getTowerStats(tower.type);

    if (tower.target) {
      const dx = tower.target.x - tower.x;
      const dy = tower.target.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > stats.range || tower.target.hp <= 0) {
        tower.target = null;
      }
    }

    if (!tower.target) {
      let closest: Enemy | null = null;
      let closestDist = Infinity;

      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        const dx = enemy.x - tower.x;
        const dy = enemy.y - tower.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= stats.range && dist < closestDist) {
          closest = enemy;
          closestDist = dist;
        }
      }

      tower.target = closest;
    }
  }

  private fireProjectile(tower: Tower, target: Enemy, damage: number): void {
    const config = TOWER_CONFIGS[tower.type];
    this.projectiles.push({
      id: this.nextProjectileId++,
      x: tower.x,
      y: tower.y,
      targetId: target.id,
      damage,
      speed: 600,
      color: config.projectileColor,
      type: tower.type
    });
  }

  private updateProjectiles(
    dt: number,
    enemies: Enemy[],
    hits: { damageDealt: number; enemyId: number; slow: boolean }[]
  ): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const target = enemies.find(e => e.id === p.targetId);

      if (!target || target.hp <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) {
        hits.push({
          damageDealt: p.damage,
          enemyId: target.id,
          slow: p.type === TowerType.Ice
        });
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * p.speed * dt;
        p.y += (dy / dist) * p.speed * dt;
      }
    }
  }

  render(selectedCoord: HexCoord | null): void {
    for (const tower of this.towers) {
      this.drawTower(tower);
    }

    for (const p of this.projectiles) {
      this.drawProjectile(p);
    }

    if (selectedCoord) {
      const tower = this.getTowerAt(selectedCoord.q, selectedCoord.r);
      if (tower) {
        const stats = this.getTowerStats(tower.type);
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 245, 212, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([6, 4]);
        this.ctx.beginPath();
        this.ctx.arc(tower.x, tower.y, stats.range, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }
  }

  private drawTower(tower: Tower): void {
    const config = TOWER_CONFIGS[tower.type];
    const size = this.hexSize * 0.55;

    this.ctx.save();

    const gradient = this.ctx.createRadialGradient(tower.x, tower.y, 0, tower.x, tower.y, size * 1.3);
    gradient.addColorStop(0, `${config.towerColor}44`);
    gradient.addColorStop(1, `${config.towerColor}00`);
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(tower.x, tower.y, size * 1.3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#2a2a3e';
    this.ctx.strokeStyle = config.towerColor;
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(tower.x, tower.y, size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.font = `${size * 1.1}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(config.icon, tower.x, tower.y);

    if (tower.target) {
      const stats = this.getTowerStats(tower.type);
      const angle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);
      this.ctx.strokeStyle = `${config.towerColor}66`;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(tower.x + Math.cos(angle) * size * 0.6, tower.y + Math.sin(angle) * size * 0.6);
      this.ctx.lineTo(tower.x + Math.cos(angle) * size * 1.1, tower.y + Math.sin(angle) * size * 1.1);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawProjectile(p: Projectile): void {
    this.ctx.save();

    if (p.type === TowerType.Lightning) {
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (p.type === TowerType.Fire) {
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (p.type === TowerType.Ice) {
      this.ctx.strokeStyle = p.color;
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      const s = 6;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x - s, p.y);
      this.ctx.lineTo(p.x + s, p.y);
      this.ctx.moveTo(p.x, p.y - s);
      this.ctx.lineTo(p.x, p.y + s);
      this.ctx.moveTo(p.x - s * 0.7, p.y - s * 0.7);
      this.ctx.lineTo(p.x + s * 0.7, p.y + s * 0.7);
      this.ctx.moveTo(p.x - s * 0.7, p.y + s * 0.7);
      this.ctx.lineTo(p.x + s * 0.7, p.y - s * 0.7);
      this.ctx.stroke();
    } else {
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  clear(): void {
    this.towers = [];
    this.projectiles = [];
  }

  destroy(): void {
    this.clear();
    this.statsChangeListeners.clear();
  }
}
