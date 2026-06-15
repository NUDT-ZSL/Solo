import { eventBus } from '../shared/EventBus';
import { IEnemy, IProjectile, IParticle } from '../WeaponModule/WeaponType';

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
  private readonly ENEMY_WIDTH = 40;
  private readonly ENEMY_HEIGHT = 40;
  private readonly PARTICLE_LIFE = 36;

  constructor(mapWidth: number, mapHeight: number, mapTop: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.mapTop = mapTop;
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
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      const t = Math.random();
      const r = Math.floor(255 * (1 - t) + 255 * t);
      const g = Math.floor(170 * (1 - t) + 51 * t);
      const b = Math.floor(0 * (1 - t) + 0 * t);
      const color = `rgb(${r},${g},${b})`;

      this.particles.push({
        id: ++this.particleIdCounter,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        color,
        life: this.PARTICLE_LIFE,
        maxLife: this.PARTICLE_LIFE
      });
    }
  }

  spawnEnemy(): void {
    const y = this.mapTop + 50 + Math.random() * (this.mapHeight - 100 - this.ENEMY_HEIGHT);
    const enemy: IEnemy = {
      id: ++this.enemyIdCounter,
      x: this.mapWidth - this.ENEMY_WIDTH,
      y,
      width: this.ENEMY_WIDTH,
      height: this.ENEMY_HEIGHT,
      speed: 1 + Math.random() * 0.5,
      health: 1,
      maxHealth: 1
    };
    this.enemies.push(enemy);
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

  checkCollisions(projectiles: IProjectile[], playerX: number, playerY: number, playerRadius: number): number[] {
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

    for (const enemy of this.enemies) {
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const dist = Math.sqrt((ex - playerX) ** 2 + (ey - playerY) ** 2);
      if (dist < playerRadius + enemy.width / 2) {
        eventBus.emit('player:damage', { damage: 1 });
        this.removeEnemy(enemy.id);
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
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  resize(mapWidth: number, mapHeight: number, mapTop: number): void {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.mapTop = mapTop;
  }

  reset(): void {
    this.enemies = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.enemyIdCounter = 0;
    this.particleIdCounter = 0;
  }
}
