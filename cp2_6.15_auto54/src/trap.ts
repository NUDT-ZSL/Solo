import { Vec2, GameMap } from './map';
import { Zombie } from './entities';

export type TrapType = 'spike' | 'mine' | 'slow' | 'fence';

export const TRAP_CONFIG: Record<TrapType, {
  cost: number;
  radius: number;
  color: string;
  label: string;
  icon: string;
}> = {
  spike: { cost: 10, radius: 14, color: '#bdbdbd', label: '尖刺', icon: '▲' },
  mine: { cost: 30, radius: 60, color: '#ff5722', label: '地雷', icon: '●' },
  slow: { cost: 20, radius: 70, color: '#2196f3', label: '泥沼', icon: '≈' },
  fence: { cost: 25, radius: 20, color: '#8d6e63', label: '栅栏', icon: '▦' },
};

export abstract class Trap {
  id: number;
  type: TrapType;
  x: number;
  y: number;
  cost: number;
  radius: number;
  color: string;
  active: boolean;
  triggered: boolean;
  createdAt: number;

  private static idCounter = 0;

  constructor(type: TrapType, x: number, y: number) {
    this.id = ++Trap.idCounter;
    this.type = type;
    this.x = x;
    this.y = y;
    const config = TRAP_CONFIG[type];
    this.cost = config.cost;
    this.radius = config.radius;
    this.color = config.color;
    this.active = true;
    this.triggered = false;
    this.createdAt = performance.now();
  }

  static canPlace(type: TrapType, x: number, y: number, map: GameMap, traps: Trap[]): boolean {
    if (x < 0 || x > map.width || y < 0 || y > map.height) {
      return false;
    }
    const config = TRAP_CONFIG[type];
    const obstaclePadding = Math.max(config.radius, 15);
    if (map.pointInObstacle(x, y, obstaclePadding)) {
      return false;
    }
    for (const trap of traps) {
      if (!trap.active) continue;
      const dist = Math.hypot(trap.x - x, trap.y - y);
      if (dist < trap.radius + config.radius + 10) {
        return false;
      }
    }
    return true;
  }

  abstract update(zombies: Zombie[], dt: number, now: number): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}

export class SpikeTrap extends Trap {
  damage: number = 50;
  slowDuration: number = 2000;
  slowFactor: number = 0.5;
  hitZombies: Set<number>;

  constructor(x: number, y: number) {
    super('spike', x, y);
    this.hitZombies = new Set();
  }

  update(zombies: Zombie[], dt: number, now: number): void {
    for (const zombie of zombies) {
      if (!this.active) break;
      if (this.hitZombies.has(zombie.id)) continue;
      const dist = Math.hypot(zombie.x - this.x, zombie.y - this.y);
      if (dist < this.radius + zombie.radius) {
        zombie.health -= this.damage;
        zombie.slowUntil = now + this.slowDuration;
        zombie.slowFactor = this.slowFactor;
        this.hitZombies.add(zombie.id);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const px = this.x + Math.cos(angle) * (this.radius * 0.5);
      const py = this.y + Math.sin(angle) * (this.radius * 0.5);
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px - 3, py + 3);
      ctx.lineTo(px + 3, py + 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

export class MineTrap extends Trap {
  explosionDamage: number = 150;
  explosionRadius: number = 60;

  constructor(x: number, y: number) {
    super('mine', x, y);
  }

  update(zombies: Zombie[], dt: number, now: number): void {
    if (!this.active || this.triggered) return;
    for (const zombie of zombies) {
      const dist = Math.hypot(zombie.x - this.x, zombie.y - this.y);
      if (dist < this.radius * 0.4 + zombie.radius) {
        this.triggered = true;
        for (const z of zombies) {
          const ed = Math.hypot(z.x - this.x, z.y - this.y);
          if (ed < this.explosionRadius + z.radius) {
            z.health -= this.explosionDamage;
          }
        }
        this.active = false;
        break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class SlowTrap extends Trap {
  duration: number = 5000;
  slowFactor: number = 0.3;
  activeUntil: number;

  constructor(x: number, y: number) {
    super('slow', x, y);
    this.activeUntil = performance.now() + this.duration;
  }

  update(zombies: Zombie[], dt: number, now: number): void {
    if (now > this.activeUntil) {
      this.active = false;
      return;
    }
    for (const zombie of zombies) {
      const dist = Math.hypot(zombie.x - this.x, zombie.y - this.y);
      if (dist < this.radius + zombie.radius) {
        zombie.slowUntil = Math.max(zombie.slowUntil, now + 200);
        zombie.slowFactor = Math.min(zombie.slowFactor, this.slowFactor);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = 'rgba(33, 150, 243, 0.25)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(33, 150, 243, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = this.color;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('≈', this.x, this.y);
    ctx.restore();
  }
}

export class FenceTrap extends Trap {
  health: number = 200;
  maxHealth: number = 200;
  lifetime: number = 10000;
  destroyAt: number;

  constructor(x: number, y: number) {
    super('fence', x, y);
    this.destroyAt = performance.now() + this.lifetime;
  }

  update(zombies: Zombie[], dt: number, now: number): void {
    if (now > this.destroyAt || this.health <= 0) {
      this.active = false;
      return;
    }
    for (const zombie of zombies) {
      const dist = Math.hypot(zombie.x - this.x, zombie.y - this.y);
      const minDist = this.radius + zombie.radius;
      if (dist < minDist && dist > 0) {
        const pushX = (zombie.x - this.x) / dist;
        const pushY = (zombie.y - this.y) / dist;
        zombie.x = this.x + pushX * minDist;
        zombie.y = this.y + pushY * minDist;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    ctx.save();
    const size = this.radius * 1.5;
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    const barCount = 5;
    const barSpacing = size / barCount;
    for (let i = 1; i < barCount; i++) {
      ctx.beginPath();
      ctx.moveTo(this.x - size / 2 + barSpacing * i, this.y - size / 2);
      ctx.lineTo(this.x - size / 2 + barSpacing * i, this.y + size / 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(this.x - size / 2, this.y);
    ctx.lineTo(this.x + size / 2, this.y);
    ctx.stroke();
    const hpPercent = this.health / this.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(this.x - size / 2, this.y - size / 2 - 8, size, 4);
    ctx.fillStyle = hpPercent > 0.5 ? '#4caf50' : hpPercent > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(this.x - size / 2, this.y - size / 2 - 8, size * hpPercent, 4);
    ctx.restore();
  }
}

export function createTrap(type: TrapType, x: number, y: number): Trap {
  switch (type) {
    case 'spike': return new SpikeTrap(x, y);
    case 'mine': return new MineTrap(x, y);
    case 'slow': return new SlowTrap(x, y);
    case 'fence': return new FenceTrap(x, y);
  }
}
