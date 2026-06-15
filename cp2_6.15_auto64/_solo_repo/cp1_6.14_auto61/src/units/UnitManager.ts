import { eventBus, GameEvent } from '../engine/EventBus';
import {
  PlantUnit,
  EnemyUnit,
  Bullet,
  Particle,
  PlantType,
  EnemyType,
  Position,
  HexCell,
  PLANT_CONFIGS,
  ENEMY_CONFIGS,
  HEX_CONFIG,
} from '../types/gameTypes';

let idCounter = 0;
const generateId = (): string => {
  idCounter++;
  return `id_${idCounter}_${Date.now()}`;
};

const MAX_PLANTS = 32;
const MAX_ENEMIES = 30;
const MAX_BULLETS = 50;
const MAX_PARTICLES = 100;

export class UnitManager {
  private plants: Map<string, PlantUnit> = new Map();
  private enemies: Map<string, EnemyUnit> = new Map();
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private hexGrid: HexCell[][] = [];
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;
  private lowQuality: boolean = false;

  constructor() {
    this.initHexGrid();
    this.setupEventListeners();
  }

  private initHexGrid(): void {
    this.hexGrid = [];
    for (let r = 0; r < HEX_CONFIG.rows; r++) {
      const row: HexCell[] = [];
      for (let q = 0; q < HEX_CONFIG.cols; q++) {
        const pos = this.hexToPixel(q, r);
        row.push({
          q,
          r,
          x: pos.x,
          y: pos.y,
          occupied: false,
        });
      }
      this.hexGrid.push(row);
    }
  }

  private hexToPixel(q: number, r: number): Position {
    const x = q * HEX_CONFIG.horizontalSpacing + (r % 2 === 1 ? HEX_CONFIG.rowOffset : 0);
    const y = r * HEX_CONFIG.verticalSpacing;
    return { x, y };
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.calculateGridOffset();
  }

  private calculateGridOffset(): void {
    const gridWidth = (HEX_CONFIG.cols - 1) * HEX_CONFIG.horizontalSpacing + HEX_CONFIG.rowOffset + HEX_CONFIG.size * 2;
    const gridHeight = (HEX_CONFIG.rows - 1) * HEX_CONFIG.verticalSpacing + HEX_CONFIG.size * 2;
    this.gridOffsetX = (this.canvasWidth - gridWidth) / 2 + HEX_CONFIG.size;
    this.gridOffsetY = (this.canvasHeight - gridHeight) / 2 + HEX_CONFIG.size;

    for (let r = 0; r < HEX_CONFIG.rows; r++) {
      for (let q = 0; q < HEX_CONFIG.cols; q++) {
        const cell = this.hexGrid[r][q];
        const pos = this.hexToPixel(q, r);
        cell.x = pos.x + this.gridOffsetX;
        cell.y = pos.y + this.gridOffsetY;
      }
    }
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvent.TICK, (deltaTime) => this.update(deltaTime as number));
    eventBus.on(GameEvent.GAME_RESTART, () => this.reset());
    eventBus.on(GameEvent.SPAWN_ENEMY, (data) => {
      const { type, row } = data as { type: EnemyType; row: number };
      this.spawnEnemy(type, row);
    });
    eventBus.on('quality_change', (data) => {
      const { lowQuality } = data as { lowQuality: boolean };
      this.lowQuality = lowQuality;
    });
  }

  getCellAtPosition(x: number, y: number): HexCell | null {
    let closestCell: HexCell | null = null;
    let closestDist = Infinity;

    for (let r = 0; r < HEX_CONFIG.rows; r++) {
      for (let q = 0; q < HEX_CONFIG.cols; q++) {
        const cell = this.hexGrid[r][q];
        const dist = Math.sqrt((x - cell.x) ** 2 + (y - cell.y) ** 2);
        if (dist < HEX_CONFIG.size && dist < closestDist) {
          closestDist = dist;
          closestCell = cell;
        }
      }
    }

    return closestCell;
  }

  placePlant(q: number, r: number, type: PlantType): boolean {
    const cell = this.hexGrid[r]?.[q];
    if (!cell || cell.occupied) return false;

    if (this.plants.size >= MAX_PLANTS) return false;

    const config = PLANT_CONFIGS[type];
    const id = generateId();

    const plant: PlantUnit = {
      id,
      type,
      cellQ: q,
      cellR: r,
      x: cell.x,
      y: cell.y,
      health: config.health,
      maxHealth: config.health,
      cooldown: 0,
      maxCooldown: config.attackSpeed,
      attackTimer: config.attackSpeed,
      scale: 1.2,
      spawnTime: performance.now(),
    };

    this.plants.set(id, plant);
    cell.occupied = true;
    cell.plantId = id;

    eventBus.emit(GameEvent.PLANT_PLACED, { plant, cost: config.cost });
    return true;
  }

  spawnEnemy(type: EnemyType, row: number): boolean {
    if (this.enemies.size >= MAX_ENEMIES) return false;

    const config = ENEMY_CONFIGS[type];
    const id = generateId();

    const path = this.generatePath(row);

    const enemy: EnemyUnit = {
      id,
      type,
      x: path[0].x,
      y: path[0].y,
      health: config.health,
      maxHealth: config.health,
      speed: config.speed,
      pathIndex: 0,
      path,
      attackTimer: 0,
      dodgeChance: config.dodgeChance || 0,
    };

    this.enemies.set(id, enemy);
    return true;
  }

  private generatePath(row: number): Position[] {
    const path: Position[] = [];
    const startX = this.canvasWidth + 50;
    const endX = -50;

    const yPositions: number[] = [];
    for (let q = HEX_CONFIG.cols - 1; q >= 0; q--) {
      const cell = this.hexGrid[row]?.[q];
      if (cell) {
        yPositions.push(cell.y);
      }
    }

    const avgY = yPositions.length > 0
      ? yPositions.reduce((a, b) => a + b, 0) / yPositions.length
      : this.canvasHeight / 2;

    path.push({ x: startX, y: avgY });

    for (let q = HEX_CONFIG.cols - 1; q >= 0; q--) {
      const cell = this.hexGrid[row]?.[q];
      if (cell) {
        path.push({ x: cell.x, y: cell.y });
      }
    }

    path.push({ x: endX, y: avgY });

    return path;
  }

  private update(deltaTime: number): void {
    this.updatePlants(deltaTime);
    this.updateEnemies(deltaTime);
    this.updateBullets(deltaTime);
    this.updateParticles(deltaTime);
    this.checkCollisions();
  }

  private updatePlants(deltaTime: number): void {
    const now = performance.now();

    this.plants.forEach((plant) => {
      const elapsed = (now - plant.spawnTime) / 1000;
      if (elapsed < 0.3) {
        const t = elapsed / 0.3;
        plant.scale = 1.2 - 0.2 * (1 - Math.pow(1 - t, 3));
      } else {
        plant.scale = 1;
      }

      if (plant.attackTimer > 0) {
        plant.attackTimer -= deltaTime;
      }

      if (plant.type === 'sunflower' && plant.attackTimer <= 0) {
        this.generateSun(plant);
        plant.attackTimer = plant.maxCooldown;
      }

      if (plant.type === 'peashooter' && plant.attackTimer <= 0) {
        const target = this.findNearestEnemy(plant);
        if (target) {
          this.fireBullet(plant, target);
          plant.attackTimer = plant.maxCooldown;
        }
      }
    });
  }

  private generateSun(plant: PlantUnit): void {
    eventBus.emit(GameEvent.SUN_GENERATED, { plantId: plant.id, amount: 5 });
  }

  private findNearestEnemy(plant: PlantUnit): EnemyUnit | null {
    const config = PLANT_CONFIGS[plant.type];
    let nearest: EnemyUnit | null = null;
    let nearestDist = config.range;

    this.enemies.forEach((enemy) => {
      const dist = Math.sqrt((enemy.x - plant.x) ** 2 + (enemy.y - plant.y) ** 2);
      if (dist < nearestDist && enemy.x > plant.x) {
        nearestDist = dist;
        nearest = enemy;
      }
    });

    return nearest;
  }

  private fireBullet(plant: PlantUnit, target: EnemyUnit): void {
    if (this.bullets.length >= MAX_BULLETS) return;

    const config = PLANT_CONFIGS[plant.type];
    const dx = target.x - plant.x;
    const dy = target.y - plant.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 300;

    const bullet: Bullet = {
      id: generateId(),
      x: plant.x,
      y: plant.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      damage: config.damage,
      targetId: target.id,
      color: '#8BC34A',
      trail: [],
    };

    this.bullets.push(bullet);
    eventBus.emit(GameEvent.BULLET_FIRE, { bullet });
  }

  private updateEnemies(deltaTime: number): void {
    const enemiesToRemove: string[] = [];

    this.enemies.forEach((enemy) => {
      if (enemy.pathIndex >= enemy.path.length - 1) {
        enemiesToRemove.push(enemy.id);
        eventBus.emit(GameEvent.ENEMY_REACHED_END, { enemy });
        return;
      }

      const target = enemy.path[enemy.pathIndex + 1];
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        enemy.pathIndex++;
      } else {
        const blockingPlant = this.getBlockingPlant(enemy);
        if (blockingPlant && enemy.type !== 'butterfly') {
          enemy.attackTimer -= deltaTime;
          if (enemy.attackTimer <= 0) {
            this.damagePlant(blockingPlant, ENEMY_CONFIGS[enemy.type].damage);
            enemy.attackTimer = 1;
          }
        } else {
          const moveX = (dx / dist) * enemy.speed * deltaTime;
          const moveY = (dy / dist) * enemy.speed * deltaTime;
          enemy.x += moveX;
          enemy.y += moveY;
        }
      }
    });

    enemiesToRemove.forEach((id) => this.enemies.delete(id));
  }

  private getBlockingPlant(enemy: EnemyUnit): PlantUnit | null {
    let blocking: PlantUnit | null = null;
    let minDist = 50;

    this.plants.forEach((plant) => {
      const dist = Math.sqrt((enemy.x - plant.x) ** 2 + (enemy.y - plant.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        blocking = plant;
      }
    });

    return blocking;
  }

  private damagePlant(plant: PlantUnit, damage: number): void {
    plant.health -= damage;
    if (plant.health <= 0) {
      this.removePlant(plant.id);
    }
  }

  private removePlant(plantId: string): void {
    const plant = this.plants.get(plantId);
    if (!plant) return;

    const cell = this.hexGrid[plant.cellR]?.[plant.cellQ];
    if (cell) {
      cell.occupied = false;
      cell.plantId = undefined;
    }

    this.plants.delete(plantId);
    eventBus.emit(GameEvent.PLANT_DEATH, { plant });
  }

  private updateBullets(deltaTime: number): void {
    const bulletsToRemove: number[] = [];
    const maxTrailLength = this.lowQuality ? 3 : 8;

    this.bullets.forEach((bullet, index) => {
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;

      if (!this.lowQuality) {
        const trailCount = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < trailCount; i++) {
          bullet.trail.push({
            x: bullet.x + (Math.random() - 0.5) * 4,
            y: bullet.y + (Math.random() - 0.5) * 4,
            alpha: 1,
            radius: Math.random() * 2 + 3,
          });
        }
      }

      bullet.trail = bullet.trail.filter((t) => {
        t.alpha -= 0.05;
        return t.alpha > 0;
      });

      if (bullet.trail.length > maxTrailLength) {
        bullet.trail = bullet.trail.slice(-maxTrailLength);
      }

      if (
        bullet.x < -50 ||
        bullet.x > this.canvasWidth + 50 ||
        bullet.y < -50 ||
        bullet.y > this.canvasHeight + 50
      ) {
        bulletsToRemove.push(index);
      }
    });

    for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
      this.bullets.splice(bulletsToRemove[i], 1);
    }
  }

  private updateParticles(deltaTime: number): void {
    if (this.particles.length > MAX_PARTICLES) {
      this.particles = this.particles.slice(-MAX_PARTICLES);
    }

    this.particles = this.particles.filter((p) => {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.alpha -= p.decay * deltaTime * 60;
      p.life -= deltaTime;
      return p.alpha > 0 && p.life > 0;
    });
  }

  private checkCollisions(): void {
    const bulletsToRemove: Set<number> = new Set();
    const enemyList = this.getEnemies();

    this.bullets.forEach((bullet, bulletIndex) => {
      for (const enemy of enemyList) {
        if (bulletsToRemove.has(bulletIndex)) break;

        const config = ENEMY_CONFIGS[enemy.type];
        const dist = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);

        if (dist < config.size + 5) {
          if (enemy.dodgeChance > 0 && Math.random() < enemy.dodgeChance) {
            continue;
          }

          bulletsToRemove.add(bulletIndex);
          this.damageEnemy(enemy, bullet.damage);
          eventBus.emit(GameEvent.BULLET_HIT, { bullet, enemy });
          break;
        }
      }
    });

    const sortedIndices = Array.from(bulletsToRemove).sort((a, b) => b - a);
    sortedIndices.forEach((index) => {
      this.bullets.splice(index, 1);
    });
  }

  private damageEnemy(enemy: EnemyUnit, damage: number): void {
    enemy.health -= damage;
    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyUnit): void {
    const config = ENEMY_CONFIGS[enemy.type];
    if (!this.lowQuality) {
      this.createExplosion(enemy.x, enemy.y);
    }
    this.enemies.delete(enemy.id);
    eventBus.emit(GameEvent.ENEMY_DEATH, { enemy, score: config.score });
  }

  private createExplosion(x: number, y: number): void {
    if (this.particles.length >= MAX_PARTICLES) return;

    const colors = ['#FF5722', '#FF9800', '#FFEB3B', '#FFC107', '#FF5252', '#FFD740'];
    const baseCount = Math.floor(Math.random() * 5) + 8;
    const particleCount = this.lowQuality ? Math.floor(baseCount / 2) : baseCount;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = Math.random() * 100 + 50;

      this.particles.push({
        id: generateId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.random() * 4 + 3,
        alpha: 1,
        decay: 0.03,
        life: 0.3,
        maxLife: 0.3,
      });
    }

    eventBus.emit(GameEvent.EXPLOSION, { x, y });
  }

  reset(): void {
    this.plants.clear();
    this.enemies.clear();
    this.bullets = [];
    this.particles = [];
    this.initHexGrid();
    this.calculateGridOffset();
  }

  getPlants(): PlantUnit[] {
    return Array.from(this.plants.values());
  }

  getEnemies(): EnemyUnit[] {
    return Array.from(this.enemies.values());
  }

  getBullets(): Bullet[] {
    return this.bullets;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getHexGrid(): HexCell[][] {
    return this.hexGrid;
  }

  getGridOffset(): { x: number; y: number } {
    return { x: this.gridOffsetX, y: this.gridOffsetY };
  }

  getStats(): { plants: number; enemies: number; bullets: number; particles: number } {
    return {
      plants: this.plants.size,
      enemies: this.enemies.size,
      bullets: this.bullets.length,
      particles: this.particles.length,
    };
  }
}

export const unitManager = new UnitManager();
export default unitManager;
