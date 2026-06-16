import { v4 as uuidv4 } from 'uuid';
import {
  TowerInstance,
  TowerType,
  createTower,
  upgradeTower,
  getTowerConfig,
  getUpgradeCost,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  isPathCell,
} from './tower';
import {
  EnemyInstance,
  EnemyType,
  createEnemy,
  generatePath,
  PathPoint,
} from './enemy';

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  color: string;
  towerType: TowerType;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface TowerPlacementAnimation {
  id: string;
  towerId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  duration: number;
  color: string;
  towerType: TowerType;
}

export interface GameState {
  towers: TowerInstance[];
  enemies: EnemyInstance[];
  projectiles: Projectile[];
  particles: Particle[];
  placementAnimations: TowerPlacementAnimation[];
  placingTowerIds: string[];
  gold: number;
  lives: number;
  score: number;
  waveIndex: number;
  totalWaves: number;
  isWaveActive: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
  countdown: number;
  selectedTowerId: string | null;
}

interface SpawnQueueItem {
  type: EnemyType;
  delay: number;
}

export class GameEngine {
  private state: GameState;
  private path: PathPoint[];
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private spawnQueue: SpawnQueueItem[] = [];
  private spawnTimer: number = 0;
  private listeners: Set<(state: GameState) => void> = new Set();
  private running: boolean = false;

  constructor(initialGold: number = 200, totalWaves: number = 4) {
    this.path = generatePath(GRID_COLS, GRID_ROWS, CELL_SIZE, [2, 3, 4]);
    this.state = {
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      placementAnimations: [],
      placingTowerIds: [],
      gold: initialGold,
      lives: 20,
      score: 0,
      waveIndex: 0,
      totalWaves,
      isWaveActive: false,
      isGameOver: false,
      isLevelComplete: false,
      countdown: 0,
      selectedTowerId: null,
    };
  }

  getState(): GameState {
    return { ...this.state, placingTowerIds: [...this.state.placingTowerIds] };
  }

  getPath(): PathPoint[] {
    return this.path;
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    this.update(deltaTime);
    this.notifyListeners();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.state.isGameOver || this.state.isLevelComplete) return;

    if (this.state.countdown > 0) {
      this.state.countdown = Math.max(0, this.state.countdown - dt);
    }

    this.updateSpawnQueue(dt);
    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updatePlacementAnimations(dt);
    this.checkWaveComplete();
  }

  private updateSpawnQueue(dt: number): void {
    if (this.spawnQueue.length === 0) return;

    this.spawnTimer += dt;

    while (this.spawnQueue.length > 0 && this.spawnTimer >= this.spawnQueue[0].delay) {
      const item = this.spawnQueue.shift()!;
      this.spawnTimer -= item.delay;
      const enemy = createEnemy(uuidv4(), item.type, this.path);
      this.state.enemies.push(enemy);
    }
  }

  private updateEnemies(dt: number): void {
    const toRemove: string[] = [];

    for (const enemy of this.state.enemies) {
      if (!enemy.alive) {
        toRemove.push(enemy.id);
        continue;
      }

      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        if (enemy.slowTimer <= 0) {
          enemy.speed = enemy.baseSpeed;
        }
      }

      const moveDistance = (enemy.speed * dt) / 1000;
      let remaining = moveDistance;

      while (remaining > 0 && enemy.pathIndex < this.path.length - 1) {
        const target = this.path[enemy.pathIndex + 1];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= remaining) {
          enemy.x = target.x;
          enemy.y = target.y;
          enemy.pathIndex++;
          remaining -= dist;
        } else {
          enemy.x += (dx / dist) * remaining;
          enemy.y += (dy / dist) * remaining;
          remaining = 0;
        }
      }

      if (enemy.pathIndex >= this.path.length - 1) {
        enemy.alive = false;
        this.state.lives = Math.max(0, this.state.lives - 1);
        if (this.state.lives <= 0) {
          this.state.isGameOver = true;
        }
      }
    }

    this.state.enemies = this.state.enemies.filter((e) => !toRemove.includes(e.id) && e.alive);
  }

  private updateTowers(dt: number): void {
    for (const tower of this.state.towers) {
      if (this.state.placingTowerIds.includes(tower.id)) continue;

      if (tower.cooldown > 0) {
        tower.cooldown -= dt;
      }

      const towerX = tower.gridX * CELL_SIZE + CELL_SIZE / 2;
      const towerY = tower.gridY * CELL_SIZE + CELL_SIZE / 2;

      let target: EnemyInstance | null = null;
      let maxProgress = -1;

      for (const enemy of this.state.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - towerX;
        const dy = enemy.y - towerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= tower.range && enemy.pathIndex > maxProgress) {
          maxProgress = enemy.pathIndex;
          target = enemy;
        }
      }

      tower.targetId = target ? target.id : null;

      if (target && tower.cooldown <= 0) {
        this.fireProjectile(tower, target);
        tower.cooldown = tower.attackInterval;
      }
    }
  }

  private fireProjectile(tower: TowerInstance, target: EnemyInstance): void {
    const towerX = tower.gridX * CELL_SIZE + CELL_SIZE / 2;
    const towerY = tower.gridY * CELL_SIZE + CELL_SIZE / 2;

    const projectile: Projectile = {
      id: uuidv4(),
      x: towerX,
      y: towerY,
      targetId: target.id,
      damage: tower.damage,
      speed: 400,
      color: tower.color,
      towerType: tower.type,
      splashRadius: tower.splashRadius,
      slowFactor: tower.slowFactor,
      slowDuration: tower.slowDuration,
    };

    this.state.projectiles.push(projectile);
  }

  private updateProjectiles(dt: number): void {
    const toRemove: string[] = [];

    for (const proj of this.state.projectiles) {
      const target = this.state.enemies.find((e) => e.id === proj.targetId);

      if (!target || !target.alive) {
        toRemove.push(proj.id);
        continue;
      }

      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDistance = (proj.speed * dt) / 1000;

      if (dist <= moveDistance) {
        this.hitEnemy(proj, target);
        toRemove.push(proj.id);
      } else {
        proj.x += (dx / dist) * moveDistance;
        proj.y += (dy / dist) * moveDistance;
      }
    }

    this.state.projectiles = this.state.projectiles.filter((p) => !toRemove.includes(p.id));
  }

  private hitEnemy(proj: Projectile, target: EnemyInstance): void {
    if (proj.splashRadius) {
      for (const enemy of this.state.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - target.x;
        const dy = enemy.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= proj.splashRadius) {
          this.damageEnemy(enemy, proj.damage);
        }
      }
    } else {
      this.damageEnemy(target, proj.damage);
    }

    if (proj.slowFactor && proj.slowDuration) {
      const radius = proj.splashRadius || 50;
      for (const enemy of this.state.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - target.x;
        const dy = enemy.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          enemy.speed = enemy.baseSpeed * proj.slowFactor;
          enemy.slowTimer = proj.slowDuration;
        }
      }
    }
  }

  private damageEnemy(enemy: EnemyInstance, damage: number): void {
    enemy.hp -= damage;
    if (enemy.hp <= 0 && enemy.alive) {
      enemy.alive = false;
      this.state.gold += enemy.reward;
      this.state.score += enemy.reward * 10;
      this.spawnDeathParticles(enemy);
    }
  }

  private spawnDeathParticles(enemy: EnemyInstance): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 60 + Math.random() * 60;
      this.state.particles.push({
        id: uuidv4(),
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500,
        maxLife: 500,
        color: enemy.color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private updateParticles(dt: number): void {
    const toRemove: string[] = [];

    for (const particle of this.state.particles) {
      particle.life -= dt;
      if (particle.life <= 0) {
        toRemove.push(particle.id);
        continue;
      }
      particle.x += (particle.vx * dt) / 1000;
      particle.y += (particle.vy * dt) / 1000;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    }

    this.state.particles = this.state.particles.filter((p) => !toRemove.includes(p.id));
  }

  private updatePlacementAnimations(dt: number): void {
    const completedIds: string[] = [];

    for (const anim of this.state.placementAnimations) {
      anim.progress += dt / anim.duration;
      if (anim.progress >= 1) {
        completedIds.push(anim.id);
        this.state.placingTowerIds = this.state.placingTowerIds.filter(
          (id) => id !== anim.towerId
        );
      }
    }

    this.state.placementAnimations = this.state.placementAnimations.filter(
      (a) => !completedIds.includes(a.id)
    );
  }

  private checkWaveComplete(): void {
    if (
      this.state.isWaveActive &&
      this.spawnQueue.length === 0 &&
      this.state.enemies.length === 0
    ) {
      this.state.isWaveActive = false;
      if (this.state.waveIndex >= this.state.totalWaves) {
        this.state.isLevelComplete = true;
      } else {
        this.state.countdown = 10000;
      }
    }
  }

  placeTower(type: TowerType, gridX: number, gridY: number, fromX: number, fromY: number): boolean {
    if (isPathCell(gridX, gridY)) return false;
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) return false;
    if (this.state.towers.some((t) => t.gridX === gridX && t.gridY === gridY)) return false;

    const config = getTowerConfig(type);
    if (this.state.gold < config.cost) return false;

    this.state.gold -= config.cost;
    const towerId = uuidv4();
    const tower = createTower(towerId, type, gridX, gridY);
    this.state.towers.push(tower);
    this.state.placingTowerIds.push(towerId);

    const toX = gridX * CELL_SIZE + CELL_SIZE / 2;
    const toY = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.state.placementAnimations.push({
      id: uuidv4(),
      towerId,
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      duration: 300,
      color: config.color,
      towerType: type,
    });

    return true;
  }

  upgradeTowerById(towerId: string): boolean {
    const towerIndex = this.state.towers.findIndex((t) => t.id === towerId);
    if (towerIndex === -1) return false;

    const tower = this.state.towers[towerIndex];
    if (tower.level >= 3) return false;

    const cost = getUpgradeCost(tower.type, tower.level);
    if (this.state.gold < cost) return false;

    this.state.gold -= cost;
    this.state.towers[towerIndex] = upgradeTower(tower);
    return true;
  }

  selectTower(towerId: string | null): void {
    this.state.selectedTowerId = towerId;
  }

  startWave(waveData: { enemies: { type: EnemyType; count: number; interval: number }[] }): void {
    if (this.state.isWaveActive) return;

    this.state.waveIndex++;
    this.state.isWaveActive = true;
    this.state.countdown = 0;

    this.spawnQueue = [];
    for (const group of waveData.enemies) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          type: group.type,
          delay: group.interval,
        });
      }
    }
    this.spawnTimer = 0;
  }

  setTotalWaves(count: number): void {
    this.state.totalWaves = count;
  }

  reset(levelId: string, initialGold: number, totalWaves: number): void {
    this.stop();
    this.path = generatePath(GRID_COLS, GRID_ROWS, CELL_SIZE, [2, 3, 4]);
    this.state = {
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      placementAnimations: [],
      placingTowerIds: [],
      gold: initialGold,
      lives: 20,
      score: 0,
      waveIndex: 0,
      totalWaves,
      isWaveActive: false,
      isGameOver: false,
      isLevelComplete: false,
      countdown: 0,
      selectedTowerId: null,
    };
    this.spawnQueue = [];
    this.spawnTimer = 0;
  }
}
