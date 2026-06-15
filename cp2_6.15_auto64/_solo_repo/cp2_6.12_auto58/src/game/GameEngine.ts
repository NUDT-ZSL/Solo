import { GameState, Tower, Enemy, Projectile, ResourcePoint, Particle, FloatText, TowerType, ResourceType, TOWER_CONFIG, CELL_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, GRID_SIZE } from './types';
import { isEnemyInRange, gridToPixel, pixelToGrid, isValidGridPosition, isOnPath } from './Collision';
import { createEnemy, generateWaveEnemyCount, getRandomEnemyType, getEnemyPathRow } from './WaveGenerator';
import { io, Socket } from 'socket.io-client';

let idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${++idCounter}_${Date.now()}`;
}

export class GameEngine {
  state: GameState;
  private updateCallback: ((state: GameState) => void) | null = null;
  private loopId: number | null = null;
  private lastTime: number = 0;
  private waveTimer: number = 0;
  private waveSpawnIndex: number = 0;
  private waveEnemiesTotal: number = 0;
  private waveActive: boolean = false;
  private spawnInterval: number = 800;
  private lastSpawnTime: number = 0;
  private socket: Socket | null = null;

  constructor() {
    this.state = this.createInitialState();
    this.initSocket();
  }

  private createInitialState(): GameState {
    const resources = this.generateInitialResources();
    return {
      towers: [],
      enemies: [],
      projectiles: [],
      resources,
      particles: [],
      gold: 100,
      wood: 80,
      lives: 20,
      wave: 0,
      isPlaying: false,
      freezeActive: false,
      freezeEndTime: 0,
      freezeCooldownEnd: 0,
      warningFlashTime: 0
    };
  }

  private initSocket(): void {
    this.socket = io('http://localhost:3001', { autoConnect: false, transports: ['websocket'] });
    this.socket.on('connect', () => {
      console.log('[GameEngine] Socket.io connected');
    });
    this.socket.on('connect_error', () => {
      // Silently ignore - backend may not be running, local mode still works
    });
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;
    this.socket.on('action:placeTower', (data: { type: TowerType; gridX: number; gridY: number }) => {
      this.placeTower(data.type, data.gridX, data.gridY);
    });
    this.socket.on('action:collectResource', (data: { resourceId: string }) => {
      this.collectResource(data.resourceId);
    });
    this.socket.on('action:upgradeTower', (data: { towerId: string }) => {
      this.upgradeTower(data.towerId);
    });
    this.socket.on('action:freezeSkill', () => {
      this.activateFreezeSkill();
    });
    this.socket.on('action:startGame', () => {
      this.startGame();
    });
    this.socket.on('action:nextWave', () => {
      this.startNextWave();
    });
  }

  emitAction(action: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(`action:${action}`, data);
    }
    (this as Record<string, (...args: unknown[]) => void>)[action]?.(data);
  }

  onUpdate(callback: (state: GameState) => void): void {
    this.updateCallback = callback;
  }

  private notify(): void {
    if (this.updateCallback) {
      this.updateCallback(this.state);
    }
    if (this.socket?.connected) {
      this.socket.emit('state:update', this.state);
    }
  }

  private generateInitialResources(): ResourcePoint[] {
    const resources: ResourcePoint[] = [];
    const occupied = new Set<string>();
    const positions: { gx: number; gy: number }[] = [];
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        if (!isOnPath(gx, gy)) {
          positions.push({ gx, gy });
        }
      }
    }
    const shuffled = positions.sort(() => Math.random() - 0.5);
    const count = Math.min(4, shuffled.length);
    for (let i = 0; i < count; i++) {
      const pos = shuffled[i];
      const key = `${pos.gx},${pos.gy}`;
      if (occupied.has(key)) continue;
      occupied.add(key);
      resources.push({
        id: genId('res'),
        type: Math.random() < 0.5 ? 'gold' : 'wood',
        gridX: pos.gx,
        gridY: pos.gy,
        remainingClicks: 3,
        lastCollectTime: 0,
        floatTexts: []
      });
    }
    return resources;
  }

  startGame(): void {
    this.state.isPlaying = true;
    this.state.wave = 1;
    this.startWave();
    this.lastTime = performance.now();
    if (this.loopId === null) {
      this.loopId = requestAnimationFrame(this.gameLoop);
    }
    this.notify();
  }

  private startWave(): void {
    this.waveActive = true;
    this.waveSpawnIndex = 0;
    this.waveEnemiesTotal = generateWaveEnemyCount(this.state.wave);
    this.lastSpawnTime = performance.now();
  }

  startNextWave(): void {
    this.state.wave++;
    this.startWave();
    this.notify();
  }

  private gameLoop = (timestamp: number): void => {
    const delta = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    if (this.state.isPlaying) {
      this.updateWaveSpawning(timestamp);
      this.updateEnemies(delta);
      this.updateTowers(timestamp, delta);
      this.updateProjectiles(delta);
      this.updateParticles(delta);
      this.updateFreeze(timestamp);
      this.updateWarningFlash(timestamp);
      this.cleanupDeadEnemies(timestamp);
      this.cleanupExpiredFloatTexts(timestamp);
      this.checkWaveComplete();
    }

    this.notify();
    this.loopId = requestAnimationFrame(this.gameLoop);
  };

  private updateWaveSpawning(timestamp: number): void {
    if (!this.waveActive) return;
    if (this.waveSpawnIndex >= this.waveEnemiesTotal) return;
    if (timestamp - this.lastSpawnTime < this.spawnInterval) return;

    const type = getRandomEnemyType(this.state.wave);
    const gridY = getEnemyPathRow();
    const enemy = createEnemy(type, this.state.wave, gridY);
    this.state.enemies.push(enemy);
    this.waveSpawnIndex++;
    this.lastSpawnTime = timestamp;
  }

  private updateEnemies(delta: number): void {
    const speedFactor = delta / 16;
    for (const enemy of this.state.enemies) {
      if (enemy.isDead) continue;
      if (enemy.isFrozen) continue;
      enemy.x += enemy.speed * speedFactor;
    }

    for (const enemy of this.state.enemies) {
      if (enemy.isDead) continue;
      if (enemy.x > CANVAS_WIDTH + 20) {
        this.state.lives--;
        enemy.isDead = true;
        enemy.deathTime = performance.now();
        this.state.warningFlashTime = performance.now();
        if (this.state.lives <= 0) {
          this.state.isPlaying = false;
        }
      }
    }
  }

  private updateTowers(timestamp: number, delta: number): void {
    for (const tower of this.state.towers) {
      tower.rotation += 0.1 * (delta / 1000);

      const config = TOWER_CONFIG[tower.type];
      const effectiveAttackSpeed = config.attackSpeed / (1 + (tower.level - 1) * 0.2);
      if (timestamp - tower.lastAttackTime < effectiveAttackSpeed) continue;

      const targets = this.state.enemies.filter(e =>
        !e.isDead && isEnemyInRange(tower, e)
      );
      if (targets.length === 0) continue;

      const target = targets.reduce((closest, e) => {
        const towerPos = gridToPixel(tower.gridX, tower.gridY);
        const dClosest = Math.hypot(closest.x - towerPos.x, closest.y - towerPos.y);
        const dE = Math.hypot(e.x - towerPos.x, e.y - towerPos.y);
        return dE < dClosest ? e : closest;
      });

      const towerPos = gridToPixel(tower.gridX, tower.gridY);
      const damage = config.damage * (1 + (tower.level - 1) * 0.5);

      this.state.projectiles.push({
        id: genId('proj'),
        x: towerPos.x,
        y: towerPos.y,
        targetX: target.x,
        targetY: target.y,
        color: config.projectileColor,
        speed: 5,
        towerType: tower.type,
        targetId: target.id
      });

      tower.lastAttackTime = timestamp;
      tower.flashTime = timestamp;
    }
  }

  private updateProjectiles(delta: number): void {
    const speedFactor = delta / 16;
    const toRemove: string[] = [];

    for (const proj of this.state.projectiles) {
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.hypot(dx, dy);
      if (dist < proj.speed * speedFactor + 5) {
        toRemove.push(proj.id);
        const target = this.state.enemies.find(e => e.id === proj.targetId);
        if (target && !target.isDead) {
          const tower = this.state.towers.find(t => t.type === proj.towerType);
          const config = TOWER_CONFIG[proj.towerType];
          const damage = config.damage * (1 + ((tower?.level ?? 1) - 1) * 0.5);
          target.hp -= damage;
          if (target.hp <= 0) {
            target.hp = 0;
            target.isDead = true;
            target.deathTime = performance.now();
          }
        }
        this.createExplosionParticles(proj.targetX, proj.targetY, proj.color);
        continue;
      }
      proj.x += (dx / dist) * proj.speed * speedFactor;
      proj.y += (dy / dist) * proj.speed * speedFactor;
    }

    this.state.projectiles = this.state.projectiles.filter(p => !toRemove.includes(p.id));
  }

  private createExplosionParticles(x: number, y: number, color: string): void {
    const now = performance.now();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.3;
      this.state.particles.push({
        id: genId('part'),
        x,
        y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        color,
        life: 300,
        maxLife: 300,
        type: 'explosion',
        size: 4
      });
    }
  }

  private createIceParticles(enemy: Enemy): void {
    const now = performance.now();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      this.state.particles.push({
        id: genId('part'),
        x: enemy.x + Math.cos(angle) * 15,
        y: enemy.y + Math.sin(angle) * 15,
        vx: 0,
        vy: 0,
        color: '#88ddff',
        life: 3000,
        maxLife: 3000,
        type: 'ice',
        size: 5
      });
    }
  }

  private updateParticles(delta: number): void {
    const toRemove: string[] = [];
    for (const p of this.state.particles) {
      p.life -= delta;
      if (p.life <= 0) {
        toRemove.push(p.id);
        continue;
      }
      if (p.type === 'explosion') {
        p.x += p.vx * (delta / 16);
        p.y += p.vy * (delta / 16);
      } else if (p.type === 'ice') {
        const enemy = this.state.enemies.find(e =>
          !e.isDead && e.isFrozen && Math.hypot(e.x - p.x, e.y - p.y) < 50
        );
        if (enemy) {
          const angle = (performance.now() / 500) + (parseInt(p.id.split('_')[1]) * (Math.PI * 2 / 6));
          const radius = 15;
          p.x = enemy.x + Math.cos(angle) * radius;
          p.y = enemy.y + Math.sin(angle) * radius;
        }
      } else if (p.type === 'shockwave') {
        // Shockwave expands
      }
    }
    this.state.particles = this.state.particles.filter(p => !toRemove.includes(p.id));
  }

  private updateFreeze(timestamp: number): void {
    if (this.state.freezeActive) {
      if (timestamp >= this.state.freezeEndTime) {
        this.state.freezeActive = false;
        for (const enemy of this.state.enemies) {
          if (!enemy.isDead) {
            enemy.isFrozen = false;
          }
        }
      }
    }
  }

  private updateWarningFlash(timestamp: number): void {
    // Warning flash auto-expires after 0.6s (2 flashes x 0.15s each + gaps)
    if (this.state.warningFlashTime > 0 && timestamp - this.state.warningFlashTime > 600) {
      this.state.warningFlashTime = 0;
    }
  }

  private cleanupDeadEnemies(timestamp: number): void {
    this.state.enemies = this.state.enemies.filter(e => {
      if (e.isDead && timestamp - e.deathTime > 500) {
        return false;
      }
      return true;
    });
  }

  private cleanupExpiredFloatTexts(timestamp: number): void {
    for (const res of this.state.resources) {
      res.floatTexts = res.floatTexts.filter(ft =>
        timestamp - ft.startTime < ft.duration
      );
    }
    this.state.resources = this.state.resources.filter(r =>
      r.remainingClicks > 0 || r.floatTexts.length > 0
    );
  }

  private checkWaveComplete(): void {
    if (!this.waveActive) return;
    if (this.waveSpawnIndex >= this.waveEnemiesTotal) {
      const aliveEnemies = this.state.enemies.some(e =>
        !e.isDead || (performance.now() - e.deathTime <= 500)
      );
      if (!aliveEnemies) {
        this.waveActive = false;
      }
    }
  }

  placeTower(type: TowerType, gridX: number, gridY: number): void {
    if (!isValidGridPosition(gridX, gridY)) return;
    if (isOnPath(gridX, gridY)) return;

    const existing = this.state.towers.find(t => t.gridX === gridX && t.gridY === gridY);
    if (existing) return;

    const existingRes = this.state.resources.find(r => r.gridX === gridX && r.gridY === gridY);
    if (existingRes && existingRes.remainingClicks > 0) return;

    const config = TOWER_CONFIG[type];
    if (this.state.gold < config.cost.gold || this.state.wood < config.cost.wood) return;

    this.state.gold -= config.cost.gold;
    this.state.wood -= config.cost.wood;

    const now = performance.now();
    const tower: Tower = {
      id: genId('tower'),
      type,
      gridX,
      gridY,
      level: 1,
      rotation: 0,
      placeTime: now,
      lastAttackTime: 0,
      flashTime: 0
    };
    this.state.towers.push(tower);

    const pos = gridToPixel(gridX, gridY);
    this.state.particles.push({
      id: genId('part'),
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      life: 400,
      maxLife: 400,
      type: 'shockwave',
      size: config.range * CELL_SIZE
    });

    this.notify();
  }

  collectResource(resourceId: string): void {
    const resource = this.state.resources.find(r => r.id === resourceId);
    if (!resource) return;
    if (resource.remainingClicks <= 0) return;

    const now = performance.now();
    if (now - resource.lastCollectTime < 300) return;

    resource.remainingClicks--;
    resource.lastCollectTime = now;

    const pos = gridToPixel(resource.gridX, resource.gridY);
    const text = resource.type === 'gold' ? '+1 金币' : '+1 木材';
    const color = resource.type === 'gold' ? '#ffd700' : '#8b4513';

    resource.floatTexts.push({
      id: genId('ft'),
      text,
      color,
      x: pos.x,
      y: pos.y,
      startTime: now,
      duration: 600
    });

    if (resource.type === 'gold') {
      this.state.gold++;
    } else {
      this.state.wood++;
    }

    this.notify();
  }

  upgradeTower(towerId: string): void {
    const tower = this.state.towers.find(t => t.id === towerId);
    if (!tower) return;
    if (tower.level >= 3) return;

    const upgradeGoldCost = 50 * tower.level;
    const upgradeWoodCost = 30 * tower.level;
    if (this.state.gold < upgradeGoldCost || this.state.wood < upgradeWoodCost) return;

    this.state.gold -= upgradeGoldCost;
    this.state.wood -= upgradeWoodCost;
    tower.level++;

    this.notify();
  }

  activateFreezeSkill(): void {
    const now = performance.now();
    if (this.state.freezeActive) return;
    if (now < this.state.freezeCooldownEnd) return;

    this.state.freezeActive = true;
    this.state.freezeEndTime = now + 3000;
    this.state.freezeCooldownEnd = now + 15000;

    for (const enemy of this.state.enemies) {
      if (!enemy.isDead) {
        enemy.isFrozen = true;
        enemy.frozenTime = now;
        this.createIceParticles(enemy);
      }
    }

    this.notify();
  }

  handleClick(canvasX: number, canvasY: number, selectedTowerType: TowerType | null): void {
    const grid = pixelToGrid(canvasX, canvasY);

    const resource = this.state.resources.find(r =>
      r.gridX === grid.x && r.gridY === grid.y && r.remainingClicks > 0
    );
    if (resource) {
      this.collectResource(resource.id);
      return;
    }

    if (selectedTowerType) {
      this.placeTower(selectedTowerType, grid.x, grid.y);
    }
  }

  destroy(): void {
    if (this.loopId !== null) {
      cancelAnimationFrame(this.loopId);
      this.loopId = null;
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
