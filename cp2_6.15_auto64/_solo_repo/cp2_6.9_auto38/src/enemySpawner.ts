import type { Enemy } from './towerSystem';

export type EnemySpawnedCallback = (enemy: Enemy) => void;
export type EnemyReachedEndCallback = (enemy: Enemy) => void;
export type EnemyDiedCallback = (enemy: Enemy) => void;
export type WaveChangedCallback = (wave: number) => void;

export class EnemySpawner {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enemies: Enemy[] = [];
  private nextEnemyId = 1;
  private path: { x: number; y: number }[] = [];
  private wave: number = 1;
  private waveTimer: number = 0;
  private spawnInterval: number = 15;
  private spawnTimer: number = 0;
  private enemiesToSpawn: number = 0;
  private spawnDelay: number = 0.8;
  private isSpawning: boolean = false;
  private waveDelay: number = 3;
  private betweenWaves: boolean = true;
  private hexSize: number = 48;

  private onEnemySpawned: EnemySpawnedCallback | null = null;
  private onEnemyReachedEnd: EnemyReachedEndCallback | null = null;
  private onEnemyDied: EnemyDiedCallback | null = null;
  private onWaveChanged: WaveChangedCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.enemiesToSpawn = this.getEnemiesPerWave(this.wave);
  }

  setHexSize(size: number): void {
    this.hexSize = size;
  }

  setPath(path: { x: number; y: number }[]): void {
    this.path = path;
  }

  setOnEnemySpawned(cb: EnemySpawnedCallback): void {
    this.onEnemySpawned = cb;
  }

  setOnEnemyReachedEnd(cb: EnemyReachedEndCallback): void {
    this.onEnemyReachedEnd = cb;
  }

  setOnEnemyDied(cb: EnemyDiedCallback): void {
    this.onEnemyDied = cb;
  }

  setOnWaveChanged(cb: WaveChangedCallback): void {
    this.onWaveChanged = cb;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getWave(): number {
    return this.wave;
  }

  getEnemiesPerWave(wave: number): number {
    const base = 3;
    const bonus = Math.floor((wave - 1) / 3);
    return Math.min(base + bonus, 10);
  }

  isEliteWave(wave: number): boolean {
    return wave % 5 === 0;
  }

  start(): void {
    this.wave = 1;
    this.enemies = [];
    this.waveTimer = this.waveDelay;
    this.betweenWaves = true;
    this.isSpawning = false;
    this.spawnTimer = 0;
    this.enemiesToSpawn = this.getEnemiesPerWave(this.wave);
  }

  damageEnemy(enemyId: number, damage: number, slow: boolean): boolean {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.hp <= 0) return false;

    enemy.hp -= damage;
    enemy.flashTime = 0.15;
    if (slow) {
      enemy.slowTime = Math.max(enemy.slowTime, 2.0);
    }

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      if (this.onEnemyDied) {
        this.onEnemyDied(enemy);
      }
      return true;
    }
    return false;
  }

  update(dt: number): void {
    if (this.betweenWaves) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.startWave();
      }
    } else if (this.isSpawning) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemiesToSpawn > 0) {
        this.spawnEnemy();
        this.spawnTimer = this.spawnDelay;
      }
      if (this.enemiesToSpawn <= 0 && this.enemies.length === 0) {
        this.nextWave();
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.flashTime > 0) {
        enemy.flashTime -= dt;
      }
      if (enemy.slowTime > 0) {
        enemy.slowTime -= dt;
      }

      if (enemy.hp <= 0) {
        this.enemies.splice(i, 1);
        continue;
      }

      this.moveEnemy(enemy, dt);

      if (enemy.pathIndex >= this.path.length - 1) {
        if (this.onEnemyReachedEnd) {
          this.onEnemyReachedEnd(enemy);
        }
        this.enemies.splice(i, 1);
        if (this.enemiesToSpawn <= 0 && this.enemies.length === 0) {
          this.nextWave();
        }
      }
    }
  }

  private startWave(): void {
    this.betweenWaves = false;
    this.isSpawning = true;
    this.enemiesToSpawn = this.getEnemiesPerWave(this.wave);
    this.spawnTimer = 0;
    if (this.onWaveChanged) {
      this.onWaveChanged(this.wave);
    }
  }

  private nextWave(): void {
    this.isSpawning = false;
    this.betweenWaves = true;
    this.wave++;
    this.waveTimer = this.waveDelay;
    this.enemiesToSpawn = this.getEnemiesPerWave(this.wave);
  }

  private spawnEnemy(): void {
    if (this.path.length === 0) return;

    const isElite = this.isEliteWave(this.wave) && this.enemiesToSpawn === 1;
    const baseHp = 50 + this.wave * 15;
    const baseSpeed = 50 + Math.min(this.wave * 2, 30);

    const enemy: Enemy = {
      id: this.nextEnemyId++,
      x: this.path[0].x,
      y: this.path[0].y,
      hp: isElite ? baseHp * 3 : baseHp,
      maxHp: isElite ? baseHp * 3 : baseHp,
      speed: isElite ? baseSpeed * 0.8 : baseSpeed,
      pathIndex: 0,
      isElite,
      flashTime: 0,
      slowTime: 0
    };

    this.enemies.push(enemy);
    this.enemiesToSpawn--;

    if (this.onEnemySpawned) {
      this.onEnemySpawned(enemy);
    }
  }

  private moveEnemy(enemy: Enemy, dt: number): void {
    if (enemy.pathIndex >= this.path.length - 1) return;

    const current = this.path[enemy.pathIndex];
    const next = this.path[enemy.pathIndex + 1];

    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const segLength = Math.sqrt(dx * dx + dy * dy);

    const slowMult = enemy.slowTime > 0 ? 0.5 : 1;
    const effectiveSpeed = enemy.speed * slowMult;

    const dxPos = next.x - enemy.x;
    const dyPos = next.y - enemy.y;
    const distToNext = Math.sqrt(dxPos * dxPos + dyPos * dyPos);

    const moveDist = effectiveSpeed * dt;

    if (moveDist >= distToNext) {
      enemy.x = next.x;
      enemy.y = next.y;
      enemy.pathIndex++;
    } else {
      enemy.x += (dxPos / distToNext) * moveDist;
      enemy.y += (dyPos / distToNext) * moveDist;
    }
  }

  render(): void {
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }
  }

  private drawEnemy(enemy: Enemy): void {
    this.ctx.save();

    const size = enemy.isElite ? this.hexSize * 0.45 : this.hexSize * 0.3;

    if (enemy.isElite) {
      const glow = this.ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, size * 2);
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.35)');
      glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(enemy.x, enemy.y, size * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = enemy.flashTime > 0 ? '#ffffff' : (enemy.isElite ? '#d4af37' : '#e63946');
    this.ctx.strokeStyle = enemy.isElite ? '#ffd700' : '#a4161a';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.arc(enemy.x, enemy.y, size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    if (enemy.isElite) {
      this.ctx.strokeStyle = '#ffd700';
      this.ctx.lineWidth = 2.5;
      this.ctx.setLineDash([4, 3]);
      this.ctx.beginPath();
      this.ctx.arc(enemy.x, enemy.y, size * 1.35, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    if (enemy.slowTime > 0) {
      this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.7)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(enemy.x, enemy.y, size * 1.15, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.drawHealthBar(enemy, size);
    this.ctx.restore();
  }

  private drawHealthBar(enemy: Enemy, size: number): void {
    const barWidth = 30;
    const barHeight = 4;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - size - 10;

    const bgGrad = this.ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    bgGrad.addColorStop(0, '#2d0000');
    bgGrad.addColorStop(1, '#1a0000');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    const pct = Math.max(0, enemy.hp / enemy.maxHp);
    const hpGrad = this.ctx.createLinearGradient(barX, barY, barX + barWidth * pct, barY);
    hpGrad.addColorStop(0, '#ff5252');
    hpGrad.addColorStop(1, '#ff1744');
    this.ctx.fillStyle = hpGrad;
    this.ctx.fillRect(barX, barY, barWidth * pct, barHeight);

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  clear(): void {
    this.enemies = [];
  }

  destroy(): void {
    this.clear();
    this.path = [];
  }
}
