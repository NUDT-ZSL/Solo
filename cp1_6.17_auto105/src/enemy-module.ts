import type { RoomData } from './room-module';
import type { SkillHitData, SkillId } from './skill-module';

export type EnemyType = 'normal' | 'small' | 'elite';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  size: number;
  color: string;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  currentSpeed: number;
  slowed: boolean;
  slowTimer: number;
  shootCooldown: number;
  shootTimer: number;
  hitFlash: number;
}

export interface EnemyProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
}

export type EnemyEventName =
  | 'enemy:update'
  | 'enemy:killed'
  | 'enemy:projectile'
  | 'enemy:all-cleared';

export interface EnemyEvents {
  'enemy:update': (enemies: Enemy[], projectiles: EnemyProjectile[]) => void;
  'enemy:killed': (enemy: Enemy) => void;
  'enemy:projectile': (projectile: EnemyProjectile) => void;
  'enemy:all-cleared': () => void;
}

export class EnemyModule {
  private listeners: Map<EnemyEventName, Set<Function>> = new Map();
  private enemies: Enemy[] = [];
  private projectiles: EnemyProjectile[] = [];
  private enemyIdCounter: number = 0;
  private projectileIdCounter: number = 0;
  private killedCount: number = 0;
  private totalKilledForElite: number = 0;
  private currentRoom: RoomData | null = null;
  private allCleared: boolean = false;

  constructor() {
    for (const name of [
      'enemy:update',
      'enemy:killed',
      'enemy:projectile',
      'enemy:all-cleared'
    ] as EnemyEventName[]) {
      this.listeners.set(name, new Set());
    }
  }

  on<K extends EnemyEventName>(event: K, callback: EnemyEvents[K]): void {
    this.listeners.get(event)?.add(callback as Function);
  }

  off<K extends EnemyEventName>(event: K, callback: EnemyEvents[K]): void {
    this.listeners.get(event)?.delete(callback as Function);
  }

  private emit<K extends EnemyEventName>(event: K, ...args: Parameters<EnemyEvents[K]>): void {
    this.listeners.get(event)?.forEach(cb => (cb as Function)(...args));
  }

  initRoom(room: RoomData): void {
    this.currentRoom = room;
    this.enemies = [];
    this.projectiles = [];
    this.killedCount = 0;
    this.allCleared = false;

    const spawnPoints = [...room.spawnPoints].sort(() => Math.random() - 0.5);
    const count = Math.min(8, spawnPoints.length);
    for (let i = 0; i < count; i++) {
      const sp = spawnPoints[i];
      this.enemies.push(this.createEnemy('normal', sp.x, sp.y));
    }
    this.emitUpdate();
  }

  private createEnemy(type: EnemyType, x: number, y: number): Enemy {
    const id = ++this.enemyIdCounter;
    switch (type) {
      case 'small':
        return {
          id,
          type: 'small',
          x,
          y,
          size: 10,
          color: '#E74C3C',
          hp: 15,
          maxHp: 15,
          baseSpeed: 60,
          currentSpeed: 60,
          slowed: false,
          slowTimer: 0,
          shootCooldown: 0,
          shootTimer: 0,
          hitFlash: 0
        };
      case 'elite':
        return {
          id,
          type: 'elite',
          x,
          y,
          size: 25,
          color: '#8B0000',
          hp: 80,
          maxHp: 80,
          baseSpeed: 55,
          currentSpeed: 55,
          slowed: false,
          slowTimer: 0,
          shootCooldown: 2000,
          shootTimer: 2000,
          hitFlash: 0
        };
      default:
        return {
          id,
          type: 'normal',
          x,
          y,
          size: 15,
          color: '#E74C3C',
          hp: 30,
          maxHp: 30,
          baseSpeed: 40,
          currentSpeed: 40,
          slowed: false,
          slowTimer: 0,
          shootCooldown: 0,
          shootTimer: 0,
          hitFlash: 0
        };
    }
  }

  handleSkillHit(data: SkillHitData): void {
    const { skillId, enemyIds, damage, slowFactor, slowDuration } = data;

    for (const id of enemyIds) {
      const enemy = this.enemies.find(e => e.id === id);
      if (!enemy) continue;

      enemy.hp -= damage;
      enemy.hitFlash = 0.15;

      if (skillId === 'frost' && slowFactor !== undefined && slowDuration !== undefined) {
        enemy.slowed = true;
        enemy.slowTimer = slowDuration;
        enemy.currentSpeed = enemy.baseSpeed * slowFactor;
        enemy.color = '#87CEEB';
      }

      if (enemy.hp <= 0) {
        this.killEnemy(enemy, skillId);
      }
    }
    this.emitUpdate();
  }

  private killEnemy(enemy: Enemy, killedBy: SkillId): void {
    const idx = this.enemies.indexOf(enemy);
    if (idx >= 0) {
      this.enemies.splice(idx, 1);
    }
    this.killedCount++;
    this.totalKilledForElite++;
    this.emit('enemy:killed', enemy);

    if (killedBy === 'fireball' && enemy.type === 'normal') {
      if (Math.random() < 0.3) {
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          const offset = 15;
          const nx = enemy.x + Math.cos(angle) * offset;
          const ny = enemy.y + Math.sin(angle) * offset;
          if (this.currentRoom) {
            const { cellSize, gridSize } = this.currentRoom;
            const clampedX = Math.max(cellSize + 5, Math.min(cellSize * (gridSize - 1) - 5, nx));
            const clampedY = Math.max(cellSize + 5, Math.min(cellSize * (gridSize - 1) - 5, ny));
            this.enemies.push(this.createEnemy('small', clampedX, clampedY));
          }
        }
      }
    }

    if (this.totalKilledForElite >= 4 && this.currentRoom) {
      this.totalKilledForElite = 0;
      const sp = this.currentRoom.spawnPoints;
      if (sp.length > 0 && this.enemies.length < 20) {
        const chosen = sp[Math.floor(Math.random() * sp.length)];
        this.enemies.push(this.createEnemy('elite', chosen.x, chosen.y));
      }
    }

    if (this.enemies.length === 0 && !this.allCleared) {
      this.allCleared = true;
      this.emit('enemy:all-cleared');
    }
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    isWalkable: (x: number, y: number, r: number) => boolean,
    onPlayerHit: (damage: number) => void
  ): void {
    const dtMs = dt * 1000;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.slowed) {
        e.slowTimer -= dtMs;
        if (e.slowTimer <= 0) {
          e.slowed = false;
          e.currentSpeed = e.baseSpeed;
          e.color = e.type === 'elite' ? '#8B0000' : '#E74C3C';
        }
      }

      if (e.hitFlash > 0) {
        e.hitFlash = Math.max(0, e.hitFlash - dt);
      }

      const dx = playerX - e.x;
      const dy = playerY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.01) {
        const mv = e.currentSpeed * dt;
        const dirX = dx / dist;
        const dirY = dy / dist;
        const nx = e.x + dirX * mv;
        const ny = e.y + dirY * mv;
        const r = e.size / 2;
        if (isWalkable(nx, e.y, r)) e.x = nx;
        if (isWalkable(e.x, ny, r)) e.y = ny;
      }

      const pdx = e.x - playerX;
      const pdy = e.y - playerY;
      const half = e.size / 2;
      const playerR = 15;
      if (Math.abs(pdx) < half + playerR && Math.abs(pdy) < half + playerR) {
        if (pdx * pdx + pdy * pdy < (half + playerR) * (half + playerR)) {
          const dmg = e.type === 'elite' ? 15 : 10;
          onPlayerHit(dmg);
          const push = 20;
          const pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
          e.x += (pdx / pd) * push;
          e.y += (pdy / pd) * push;
        }
      }

      if (e.type === 'elite') {
        e.shootTimer -= dtMs;
        if (e.shootTimer <= 0) {
          e.shootTimer = e.shootCooldown;
          const sdx = playerX - e.x;
          const sdy = playerY - e.y;
          const sd = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
          const speed = 150;
          this.projectiles.push({
            id: ++this.projectileIdCounter,
            x: e.x,
            y: e.y,
            vx: (sdx / sd) * speed,
            vy: (sdy / sd) * speed,
            radius: 5,
            damage: 12
          });
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (!isWalkable(p.x, p.y, p.radius)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const pdx = p.x - playerX;
      const pdy = p.y - playerY;
      const playerR = 15;
      if (Math.abs(pdx) < playerR + p.radius && Math.abs(pdy) < playerR + p.radius) {
        if (pdx * pdx + pdy * pdy < (playerR + p.radius) * (playerR + p.radius)) {
          onPlayerHit(p.damage);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (this.currentRoom) {
        const min = this.currentRoom.cellSize;
        const max = this.currentRoom.cellSize * (this.currentRoom.gridSize - 1);
        if (p.x < min || p.x > max || p.y < min || p.y > max) {
          this.projectiles.splice(i, 1);
        }
      }
    }

    this.emitUpdate();
  }

  private emitUpdate(): void {
    this.emit('enemy:update', [...this.enemies], [...this.projectiles]);
  }

  getEnemies(): Enemy[] {
    return [...this.enemies];
  }

  getProjectiles(): EnemyProjectile[] {
    return [...this.projectiles];
  }

  getKilledCount(): number {
    return this.killedCount;
  }

  isAllCleared(): boolean {
    return this.allCleared;
  }
}
