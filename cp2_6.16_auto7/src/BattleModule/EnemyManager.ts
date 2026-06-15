import { eventBus } from '../shared/EventBus';
import { ObjectPool, IPoolable } from '../shared/ObjectPool';
import {
  IEnemy,
  IProjectile,
  IParticle,
  PARTICLE_CONSTANTS,
  ENEMY_CONSTANTS
} from '../WeaponModule/WeaponType';

class PoolableParticle implements IParticle, IPoolable {
  id = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  radius = 3;
  color = '#ffaa00';
  life = 0;
  maxLife = PARTICLE_CONSTANTS.LIFE_FRAMES;

  reset(): void {
    this.id = 0;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 3;
    this.color = '#ffaa00';
    this.life = 0;
    this.maxLife = PARTICLE_CONSTANTS.LIFE_FRAMES;
  }
}

class PoolableEnemy implements IEnemy, IPoolable {
  id = 0;
  x = 0;
  y = 0;
  width = ENEMY_CONSTANTS.WIDTH;
  height = ENEMY_CONSTANTS.HEIGHT;
  speed = 1;
  health = 1;
  maxHealth = 1;

  reset(): void {
    this.id = 0;
    this.x = 0;
    this.y = 0;
    this.width = ENEMY_CONSTANTS.WIDTH;
    this.height = ENEMY_CONSTANTS.HEIGHT;
    this.speed = 1;
    this.health = 1;
    this.maxHealth = 1;
  }
}

export class EnemyManager {
  private enemies: IEnemy[] = [];
  private enemyIdCounter = 0;
  private particleIdCounter = 0;
  private particles: IParticle[] = [];
  private spawnTimer = 0;
  private spawnInterval = 120;
  private mapWidth: number;
  private mapHeight: number;
  private mapTop: number;
  private readonly ENEMY_WIDTH = ENEMY_CONSTANTS.WIDTH;
  private readonly ENEMY_HEIGHT = ENEMY_CONSTANTS.HEIGHT;

  private particlePool: ObjectPool<PoolableParticle>;
  private enemyPool: ObjectPool<PoolableEnemy>;

  constructor(mapWidth: number, mapHeight: number, mapTop: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.mapTop = mapTop;

    this.particlePool = new ObjectPool<PoolableParticle>(
      () => new PoolableParticle(),
      64,
      256
    );
    this.enemyPool = new ObjectPool<PoolableEnemy>(
      () => new PoolableEnemy(),
      20,
      60
    );

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('enemy:hit', (data: unknown) => {
      const { enemyId, projectileId, splashRadius } = data as {
        enemyId: number;
        projectileId: number;
        splashRadius?: number;
      };
      this.handleEnemyHit(enemyId, projectileId, splashRadius);
    });
  }

  private lerpColor(t: number): string {
    const start = PARTICLE_CONSTANTS.START_COLOR;
    const end = PARTICLE_CONSTANTS.END_COLOR;
    const r = Math.round(start.r + (end.r - start.r) * t);
    const g = Math.round(start.g + (end.g - start.g) * t);
    const b = Math.round(start.b + (end.b - start.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  private handleEnemyHit(enemyId: number, _projectileId: number, splashRadius?: number): void {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (!enemy) return;

    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

    if (splashRadius && splashRadius > 0) {
      const centerX = enemy.x + enemy.width / 2;
      const centerY = enemy.y + enemy.height / 2;
      this.enemies.forEach((e) => {
        if (e.id !== enemyId) {
          const ex = e.x + e.width / 2;
          const ey = e.y + e.height / 2;
          const dist = Math.sqrt((ex - centerX) ** 2 + (ey - centerY) ** 2);
          if (dist <= splashRadius) {
            e.health -= 0.5;
            if (e.health <= 0) {
              this.createExplosion(ex, ey);
              this.removeEnemyInternal(e);
            }
          }
        }
      });
    }

    enemy.health -= 1;

    if (enemy.health <= 0) {
      this.removeEnemy(enemyId);
    }
  }

  private createExplosion(x: number, y: number): void {
    const count = PARTICLE_CONSTANTS.COUNT;
    for (let i = 0; i < count; i++) {
      const particle = this.particlePool.acquire();
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      const t = i / (count - 1);

      particle.id = ++this.particleIdCounter;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.radius = PARTICLE_CONSTANTS.MIN_RADIUS +
        Math.random() * (PARTICLE_CONSTANTS.MAX_RADIUS - PARTICLE_CONSTANTS.MIN_RADIUS);
      particle.color = this.lerpColor(t);
      particle.life = PARTICLE_CONSTANTS.LIFE_FRAMES;
      particle.maxLife = PARTICLE_CONSTANTS.LIFE_FRAMES;

      this.particles.push(particle);
    }
  }

  spawnEnemy(): void {
    const enemy = this.enemyPool.acquire();
    const y = this.mapTop + 50 + Math.random() * (this.mapHeight - 100 - this.ENEMY_HEIGHT);

    enemy.id = ++this.enemyIdCounter;
    enemy.x = this.mapWidth - this.ENEMY_WIDTH;
    enemy.y = y;
    enemy.width = this.ENEMY_WIDTH;
    enemy.height = this.ENEMY_HEIGHT;
    enemy.speed = 1 + Math.random() * 0.5;
    enemy.health = 1;
    enemy.maxHealth = 1;

    this.enemies.push(enemy);
  }

  private removeEnemyInternal(enemy: IEnemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      eventBus.emit('enemy:death', {
        enemyId: enemy.id,
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2
      });
      this.enemies.splice(index, 1);
      this.enemyPool.release(enemy as PoolableEnemy);
    }
  }

  removeEnemy(id: number): void {
    const index = this.enemies.findIndex((e) => e.id === id);
    if (index !== -1) {
      const enemy = this.enemies[index];
      eventBus.emit('enemy:death', {
        enemyId: id,
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2
      });
      this.enemies.splice(index, 1);
      this.enemyPool.release(enemy as PoolableEnemy);
    }
  }

  getEnemies(): IEnemy[] {
    return this.enemies;
  }

  getParticles(): IParticle[] {
    return this.particles;
  }

  getEnemyAtPoint(x: number, y: number): IEnemy | null {
    for (const enemy of this.enemies) {
      if (
        x >= enemy.x &&
        x <= enemy.x + enemy.width &&
        y >= enemy.y &&
        y <= enemy.y + enemy.height
      ) {
        return enemy;
      }
    }
    return null;
  }

  checkCollisions(
    projectiles: IProjectile[],
    playerX: number,
    playerY: number,
    playerRadius: number
  ): number[] {
    const hitProjectileIds: number[] = [];

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      for (const enemy of this.enemies) {
        if (
          proj.x >= enemy.x &&
          proj.x <= enemy.x + enemy.width &&
          proj.y >= enemy.y &&
          proj.y <= enemy.y + enemy.height
        ) {
          eventBus.emit('enemy:hit', {
            enemyId: enemy.id,
            projectileId: proj.id,
            splashRadius: proj.weapon.splashRadius
          });
          hitProjectileIds.push(proj.id);
          break;
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const dist = Math.sqrt((ex - playerX) ** 2 + (ey - playerY) ** 2);
      if (dist < playerRadius + enemy.width / 2) {
        eventBus.emit('player:damage', { damage: 1 });
        this.createExplosion(ex, ey);
        const removedEnemy = this.enemies.splice(i, 1)[0];
        this.enemyPool.release(removedEnemy as PoolableEnemy);
      }
    }

    return hitProjectileIds;
  }

  update(): void {
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.x -= enemy.speed;
      if (enemy.x + enemy.width < 0) {
        eventBus.emit('player:damage', { damage: 1 });
        const removedEnemy = this.enemies.splice(i, 1)[0];
        this.enemyPool.release(removedEnemy as PoolableEnemy);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life--;
      if (p.life <= 0) {
        const removedParticle = this.particles.splice(i, 1)[0];
        this.particlePool.release(removedParticle as PoolableParticle);
      }
    }
  }

  resize(mapWidth: number, mapHeight: number, mapTop: number): void {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.mapTop = mapTop;
  }

  reset(): void {
    for (const e of this.enemies) {
      this.enemyPool.release(e as PoolableEnemy);
    }
    for (const p of this.particles) {
      this.particlePool.release(p as PoolableParticle);
    }
    this.enemies = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.enemyIdCounter = 0;
    this.particleIdCounter = 0;
  }

  getPoolStats(): { enemies: number; particles: number } {
    return {
      enemies: this.enemyPool.size(),
      particles: this.particlePool.size()
    };
  }
}
