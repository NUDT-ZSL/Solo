import type { Position } from '../types';

interface Collidable {
  id: string;
  x: number;
  y: number;
  radius: number;
}

interface CollisionEvent {
  aId: string;
  bId: string;
  aType: string;
  bType: string;
}

export class CollisionSystem {
  private cellSize: number;
  private grid: Map<string, Collidable[]>;

  constructor(cellSize: number = 50) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  private getNearbyKeys(x: number, y: number): string[] {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const keys: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        keys.push(`${cellX + dx},${cellY + dy}`);
      }
    }
    return keys;
  }

  clear(): void {
    this.grid.clear();
  }

  insert(obj: Collidable): void {
    const key = this.getKey(obj.x, obj.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(obj);
  }

  private checkCircleCollision(a: Collidable, b: Collidable): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < a.radius + b.radius;
  }

  checkCollisions(
    playerBullets: Collidable[],
    enemies: Collidable[],
    enemyBullets: Collidable[],
    player: Collidable
  ): CollisionEvent[] {
    this.clear();
    const events: CollisionEvent[] = [];

    const enemyIds = new Set(enemies.map(e => e.id));
    const enemyBulletIds = new Set(enemyBullets.map(b => b.id));

    enemies.forEach(e => this.insert(e));
    enemyBullets.forEach(b => this.insert(b));

    playerBullets.forEach(bullet => {
      const keys = this.getNearbyKeys(bullet.x, bullet.y);
      keys.forEach(key => {
        const cell = this.grid.get(key);
        if (!cell) return;
        cell.forEach(obj => {
          if (enemyIds.has(obj.id) && this.checkCircleCollision(bullet, obj)) {
            events.push({ aId: bullet.id, bId: obj.id, aType: 'playerBullet', bType: 'enemy' });
          }
        });
      });
    });

    const playerKeys = this.getNearbyKeys(player.x, player.y);
    playerKeys.forEach(key => {
      const cell = this.grid.get(key);
      if (!cell) return;
      cell.forEach(obj => {
        if (enemyBulletIds.has(obj.id) && this.checkCircleCollision(player, obj)) {
          events.push({ aId: player.id, bId: obj.id, aType: 'player', bType: 'enemyBullet' });
        }
        if (enemyIds.has(obj.id) && this.checkCircleCollision(player, obj)) {
          events.push({ aId: player.id, bId: obj.id, aType: 'player', bType: 'enemy' });
        }
      });
    });

    return events;
  }
}
