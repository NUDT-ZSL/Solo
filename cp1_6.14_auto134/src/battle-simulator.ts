import { eventBus } from './event-bus';
import { BeatEvent, TowerType } from './audio-engine';

export interface Point {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  type: 'normal' | 'fast' | 'tank';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  color: string;
  reward: number;
  slowMultiplier: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
  attackSpeed: number;
  lastAttackBeat: number;
  isAttacking: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface LeaderboardEntry {
  timestamp: number;
  score: number;
  wave: number;
}

interface EnemyStats {
  hp: number;
  speed: number;
  color: string;
  reward: number;
}

const ENEMY_STATS: Record<string, EnemyStats> = {
  normal: { hp: 100, speed: 1, color: '#ff6b6b', reward: 10 },
  fast: { hp: 50, speed: 2.5, color: '#feca57', reward: 15 },
  tank: { hp: 500, speed: 0.6, color: '#48dbfb', reward: 30 },
};

const TOWER_STATS: Record<TowerType, { damage: number; range: number; attackSpeed: number; cost: number }> = {
  machinegun: { damage: 15, range: 120, attackSpeed: 1, cost: 50 },
  laser: { damage: 40, range: 180, attackSpeed: 2, cost: 100 },
  sonic: { damage: 25, range: 140, attackSpeed: 1, cost: 75 },
  heal: { damage: 0, range: 100, attackSpeed: 4, cost: 120 },
};

export class BattleSimulator {
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private particles: Particle[] = [];
  private path: Point[] = [];
  private wave: number = 0;
  private score: number = 0;
  private lives: number = 20;
  private currentBeat: number = 0;
  private lastSpawnBeat: number = 0;
  private isRunning: boolean = false;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private enemyIdCounter: number = 0;
  private particleIdCounter: number = 0;
  private towerIdCounter: number = 0;
  private waveEnemyCount: number = 0;
  private waveEnemiesSpawned: number = 0;
  private difficultyMultiplier: number = 1;
  private gameOver: boolean = false;

  constructor() {
    this.setupPath();
    this.setupEventListeners();
  }

  private setupPath(): void {
    this.path = [
      { x: 0, y: 300 },
      { x: 150, y: 300 },
      { x: 150, y: 150 },
      { x: 350, y: 150 },
      { x: 350, y: 450 },
      { x: 550, y: 450 },
      { x: 550, y: 250 },
      { x: 800, y: 250 },
    ];
  }

  private setupEventListeners(): void {
    eventBus.on('beat_tick', this.onBeatTick.bind(this));
  }

  private onBeatTick(event: BeatEvent): void {
    if (!this.isRunning || this.gameOver) return;

    this.currentBeat = event.beatIndex;

    this.towers.forEach((tower) => {
      if (event.beatIndex - tower.lastAttackBeat >= tower.attackSpeed) {
        this.towerAttack(tower, event);
      }
    });

    if (this.waveEnemiesSpawned < this.waveEnemyCount) {
      if (event.beatIndex - this.lastSpawnBeat >= 2) {
        this.spawnEnemy();
        this.lastSpawnBeat = event.beatIndex;
      }
    } else if (this.enemies.length === 0 && this.waveEnemyCount > 0) {
      this.startNextWave();
    }
  }

  private towerAttack(tower: Tower, beatEvent: BeatEvent): void {
    if (tower.type === 'heal') {
      tower.isAttacking = true;
      tower.lastAttackBeat = beatEvent.beatIndex;
      eventBus.emit('tower_attack', { towerId: tower.id });
      setTimeout(() => { tower.isAttacking = false; }, 200);
      return;
    }

    const target = this.findTarget(tower);
    if (target) {
      tower.isAttacking = true;
      tower.lastAttackBeat = beatEvent.beatIndex;

      eventBus.emit('tower_attack', { towerId: tower.id, targetId: target.id });

      let damage = tower.damage;
      if (tower.type === 'sonic') {
        this.enemies.forEach((e) => {
          const dist = Math.hypot(e.x - tower.x, e.y - tower.y);
          if (dist <= tower.range) {
            e.slowMultiplier = 0.5;
            setTimeout(() => { e.slowMultiplier = 1; }, 2000);
          }
        });
      }

      if (tower.level >= 3 && tower.type === 'machinegun') {
        this.enemies.forEach((e) => {
          const dist = Math.hypot(e.x - target.x, e.y - target.y);
          if (dist <= 50) {
            this.damageEnemy(e, Math.floor(damage * 0.5));
          }
        });
      }

      this.damageEnemy(target, damage);

      setTimeout(() => { tower.isAttacking = false; }, 200);
    }
  }

  private findTarget(tower: Tower): Enemy | null {
    let closest: Enemy | null = null;
    let closestDist = Infinity;

    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
      if (dist <= tower.range && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    }

    return closest;
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    enemy.hp -= damage;
    eventBus.emit('enemy_damage', { enemyId: enemy.id, damage, hp: enemy.hp, maxHp: enemy.maxHp });

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
      this.score += enemy.reward;
      this.spawnParticles(enemy.x, enemy.y, enemy.color);
      eventBus.emit('enemy_die', { enemyId: enemy.id, reward: enemy.reward, score: this.score });
    }
  }

  private spawnParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      const particle: Particle = {
        id: `p-${this.particleIdCounter++}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 2,
        life: 0.5,
        maxLife: 0.5,
      };
      this.particles.push(particle);
    }
  }

  private spawnEnemy(): void {
    const types: Array<'normal' | 'fast' | 'tank'> = ['normal', 'normal', 'fast', 'tank'];
    const type = types[Math.floor(Math.random() * types.length)];
    const stats = ENEMY_STATS[type];

    const enemy: Enemy = {
      id: `e-${this.enemyIdCounter++}`,
      type,
      x: this.path[0].x,
      y: this.path[0].y,
      hp: Math.floor(stats.hp * this.difficultyMultiplier),
      maxHp: Math.floor(stats.hp * this.difficultyMultiplier),
      speed: stats.speed * this.difficultyMultiplier,
      pathIndex: 0,
      color: stats.color,
      reward: stats.reward,
      slowMultiplier: 1,
    };

    this.enemies.push(enemy);
    this.waveEnemiesSpawned++;
    eventBus.emit('enemy_spawn', { enemy });
  }

  startNextWave(): void {
    this.wave++;
    this.waveEnemyCount = 5 + this.wave * 2;
    this.waveEnemiesSpawned = 0;

    if (this.wave % 5 === 1 && this.wave > 1) {
      this.difficultyMultiplier += 0.1;
    }

    eventBus.emit('wave_start', { wave: this.wave, enemyCount: this.waveEnemyCount });
  }

  placeTower(type: TowerType, gridX: number, gridY: number, cellSize: number): boolean {
    const cost = TOWER_STATS[type].cost;
    if (this.score < cost) return false;

    const towerX = gridX * cellSize + cellSize / 2;
    const towerY = gridY * cellSize + cellSize / 2;

    for (const point of this.path) {
      if (Math.hypot(point.x - towerX, point.y - towerY) < cellSize) {
        return false;
      }
    }

    const existing = this.towers.find((t) => t.gridX === gridX && t.gridY === gridY);
    if (existing) return false;

    const stats = TOWER_STATS[type];
    const tower: Tower = {
      id: `t-${this.towerIdCounter++}`,
      type,
      gridX,
      gridY,
      x: towerX,
      y: towerY,
      level: 1,
      damage: stats.damage,
      range: stats.range,
      attackSpeed: stats.attackSpeed,
      lastAttackBeat: -999,
      isAttacking: false,
    };

    this.towers.push(tower);
    this.score -= cost;
    eventBus.emit('tower_placed', { tower });
    return true;
  }

  upgradeTower(towerId: string): boolean {
    const tower = this.towers.find((t) => t.id === towerId);
    if (!tower || tower.level >= 5) return false;

    const upgradeCost = TOWER_STATS[tower.type].cost * tower.level;
    if (this.score < upgradeCost) return false;

    this.score -= upgradeCost;
    tower.level++;
    tower.damage = Math.floor(tower.damage * 1.3);
    tower.range = Math.floor(tower.range * 1.1);

    if (tower.level >= 3) {
      tower.damage = Math.floor(tower.damage * 1.2);
    }

    eventBus.emit('tower_upgraded', { tower, newLevel: tower.level });
    return true;
  }

  getTowerCost(type: TowerType): number {
    return TOWER_STATS[type].cost;
  }

  getUpgradeCost(tower: Tower): number {
    return TOWER_STATS[tower.type].cost * tower.level;
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaTime = this.lastFrameTime ? (timestamp - this.lastFrameTime) / 1000 : 0;
    this.lastFrameTime = timestamp;

    const frameRate = this.enemies.length > 100 ? 1 / 30 : 1 / 60;
    if (deltaTime < frameRate) {
      this.rafId = requestAnimationFrame(this.gameLoop);
      return;
    }

    this.updateEnemies(deltaTime);
    this.updateParticles(deltaTime);

    eventBus.emit('frame_update', {
      enemies: [...this.enemies],
      towers: [...this.towers],
      particles: [...this.particles],
      score: this.score,
      lives: this.lives,
      wave: this.wave,
    });

    if (this.lives <= 0 && !this.gameOver) {
      this.endGame();
    }

    this.rafId = requestAnimationFrame(this.gameLoop);
  };

  private updateEnemies(deltaTime: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const target = this.path[enemy.pathIndex + 1];

      if (!target) {
        this.enemies.splice(i, 1);
        this.lives--;
        eventBus.emit('enemy_reached_end', { lives: this.lives });
        continue;
      }

      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      const moveSpeed = enemy.speed * enemy.slowMultiplier * 50 * deltaTime;

      if (dist <= moveSpeed) {
        enemy.pathIndex++;
        enemy.x = target.x;
        enemy.y = target.y;
      } else {
        enemy.x += (dx / dist) * moveSpeed;
        enemy.y += (dy / dist) * moveSpeed;
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = 0;
    this.startNextWave();
    this.rafId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private endGame(): void {
    this.gameOver = true;
    this.stop();

    const entry: LeaderboardEntry = {
      timestamp: Date.now(),
      score: this.score,
      wave: this.wave,
    };

    this.saveToLeaderboard(entry);
    eventBus.emit('game_over', { score: this.score, wave: this.wave, leaderboard: this.getLeaderboard() });
  }

  private saveToLeaderboard(entry: LeaderboardEntry): void {
    const leaderboard = this.getLeaderboard();
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);
    const top10 = leaderboard.slice(0, 10);
    localStorage.setItem('beatbarrier_leaderboard', JSON.stringify(top10));
  }

  getLeaderboard(): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem('beatbarrier_leaderboard');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  clearLeaderboard(): void {
    localStorage.removeItem('beatbarrier_leaderboard');
    eventBus.emit('leaderboard_cleared');
  }

  reset(): void {
    this.stop();
    this.enemies = [];
    this.towers = [];
    this.particles = [];
    this.wave = 0;
    this.score = 100;
    this.lives = 20;
    this.currentBeat = 0;
    this.lastSpawnBeat = 0;
    this.waveEnemyCount = 0;
    this.waveEnemiesSpawned = 0;
    this.difficultyMultiplier = 1;
    this.gameOver = false;
    this.enemyIdCounter = 0;
    this.towerIdCounter = 0;
    this.particleIdCounter = 0;
  }

  getState() {
    return {
      enemies: [...this.enemies],
      towers: [...this.towers],
      particles: [...this.particles],
      score: this.score,
      lives: this.lives,
      wave: this.wave,
      path: [...this.path],
      gameOver: this.gameOver,
    };
  }

  destroy(): void {
    this.stop();
    eventBus.off('beat_tick', this.onBeatTick.bind(this));
  }
}

export const battleSimulator = new BattleSimulator();
export default battleSimulator;
