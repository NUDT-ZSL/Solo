import { GameMap, GRID_SIZE, TILE_SIZE, TileType } from './gameMap';
import { Enemy, Particle } from './enemy';
import {
  Tower, TowerType, TOWER_CONFIGS, Projectile, updateProjectiles, renderProjectiles,
  easeInOutQuad, DEATH_PARTICLE_COUNT,
  DEATH_PARTICLE_GRAVITY, DEATH_PARTICLE_DRAG
} from './tower';

const INITIAL_GOLD = 200;
const INITIAL_LIVES = 20;
const WAVE_BONUS = 20;
const WAVE_INTERVAL = 5;
const MIN_ENEMIES_PER_WAVE = 10;
const MAX_ENEMIES_PER_WAVE = 20;
const FIRST_WAVE_PREPARE_TIME = 2;

const WAVE_TRANSITION_DURATION = 2.5;
const WAVE_TRANSITION_FADE_IN_PORTION = 0.2;
const WAVE_TRANSITION_FADE_OUT_PORTION = 0.2;
const WAVE_TRANSITION_PULSE_SCALE = 1.1;
const WAVE_TRANSITION_FONT_SIZE = 56;
const WAVE_TRANSITION_STROKE_WIDTH = 6;
const WAVE_TRANSITION_VERTICAL_OFFSET = 100;

const RESIZE_DEBOUNCE_MS = 150;
const MAX_SCALE = 1.2;
const HUD_HEIGHT_EXTRA = 120;
const HUD_VERTICAL_OFFSET = 60;

const FLOATING_TEXT_DURATION = 1.2;
const FLOATING_TEXT_SPEED = 40;

const PARTICLE_POOL_INITIAL_SIZE = 200;
const PROJECTILE_POOL_INITIAL_SIZE = 50;
const MAX_PARTICLES = 500;
const MAX_PROJECTILES = 100;

const SPATIAL_GRID_CELL_SIZE = TILE_SIZE * 2;

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

interface WaveTransition {
  text: string;
  life: number;
  maxLife: number;
}

interface SpatialGrid {
  cellSize: number;
  cols: number;
  rows: number;
  cells: Map<string, number[]>;
}

function buildSpatialGrid(enemies: Enemy[]): SpatialGrid {
  const pixelW = GRID_SIZE * TILE_SIZE;
  const pixelH = GRID_SIZE * TILE_SIZE;
  const cols = Math.ceil(pixelW / SPATIAL_GRID_CELL_SIZE);
  const rows = Math.ceil(pixelH / SPATIAL_GRID_CELL_SIZE);
  const cells = new Map<string, number[]>();

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.isDead() || enemy.hasReachedEnd()) continue;
    const cx = Math.max(0, Math.min(cols - 1, Math.floor(enemy.getX() / SPATIAL_GRID_CELL_SIZE)));
    const cy = Math.max(0, Math.min(rows - 1, Math.floor(enemy.getY() / SPATIAL_GRID_CELL_SIZE)));
    const key = `${cx},${cy}`;
    let arr = cells.get(key);
    if (!arr) { arr = []; cells.set(key, arr); }
    arr.push(i);
  }

  return { cellSize: SPATIAL_GRID_CELL_SIZE, cols, rows, cells };
}

function querySpatialRange(
  grid: SpatialGrid, enemies: Enemy[],
  cx: number, cy: number, range: number
): Enemy[] {
  const results: Enemy[] = [];
  const rangeSq = range * range;
  const cellMinX = Math.max(0, Math.floor((cx - range) / grid.cellSize));
  const cellMaxX = Math.min(grid.cols - 1, Math.floor((cx + range) / grid.cellSize));
  const cellMinY = Math.max(0, Math.floor((cy - range) / grid.cellSize));
  const cellMaxY = Math.min(grid.rows - 1, Math.floor((cy + range) / grid.cellSize));

  for (let gx = cellMinX; gx <= cellMaxX; gx++) {
    for (let gy = cellMinY; gy <= cellMaxY; gy++) {
      const arr = grid.cells.get(`${gx},${gy}`);
      if (!arr) continue;
      for (const idx of arr) {
        const e = enemies[idx];
        const dx = e.getX() - cx;
        const dy = e.getY() - cy;
        if (dx * dx + dy * dy <= rangeSq) {
          results.push(e);
        }
      }
    }
  }
  return results;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameMap: GameMap;
  private towers: Tower[];
  private enemies: Enemy[];
  private projectiles: Projectile[];
  private particles: Particle[];
  private floatingTexts: FloatingText[];
  private gold: number;
  private lives: number;
  private currentWave: number;
  private totalKills: number;
  private gameOver: boolean;
  private gameWon: boolean;

  private waveInProgress: boolean;
  private enemiesSpawned: number;
  private enemiesToSpawn: number;
  private spawnTimer: number;
  private spawnInterval: number;
  private waveCooldown: number;
  private waveTransition: WaveTransition | null;

  private selectedTile: { x: number; y: number } | null;
  private showBuildPanel: boolean;
  private selectedTower: Tower | null;

  private scale: number;
  private offsetX: number;
  private offsetY: number;
  private hoverTile: { x: number; y: number } | null;

  private lastTime: number;
  private _animationFrameId: number | null;
  private _resizeTimer: number | null;
  private _dpr: number;

  private _spatialGrid: SpatialGrid | null;
  private _spatialGridDirty: boolean;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this._dpr = window.devicePixelRatio || 1;

    this.gameMap = new GameMap();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];

    this.gold = INITIAL_GOLD;
    this.lives = INITIAL_LIVES;
    this.currentWave = 0;
    this.totalKills = 0;
    this.gameOver = false;
    this.gameWon = false;

    this.waveInProgress = false;
    this.enemiesSpawned = 0;
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1;
    this.waveCooldown = FIRST_WAVE_PREPARE_TIME;
    this.waveTransition = null;

    this.selectedTile = null;
    this.showBuildPanel = false;
    this.selectedTower = null;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.hoverTile = null;

    this.lastTime = performance.now();
    this._animationFrameId = null;
    this._resizeTimer = null;

    this._spatialGrid = null;
    this._spatialGridDirty = true;

    this.preallocatePools();
    this.resizeCanvas();
    this.setupEventListeners();
    this.showWaveTransition('第 1 波 即将开始');
  }

  private preallocatePools(): void {
    for (let i = 0; i < PARTICLE_POOL_INITIAL_SIZE; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 3
      });
    }
    this.particles.length = 0;

    for (let i = 0; i < PROJECTILE_POOL_INITIAL_SIZE; i++) {
      this.projectiles.push({
        x: 0, y: 0, targetX: 0, targetY: 0, targetEnemy: null,
        speed: 0, damage: 0, color: '#fff', type: TowerType.ARROW,
        dead: false, trail: []
      });
    }
    this.projectiles.length = 0;
  }

  start(): void {
    this.gameLoop();
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container')!;
    const dpr = this._dpr;

    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;

    const baseWidth = this.gameMap.getGridPixelWidth();
    const baseHeight = this.gameMap.getGridPixelHeight() + HUD_HEIGHT_EXTRA;

    const scaleX = maxWidth / baseWidth;
    const scaleY = maxHeight / baseHeight;
    this.scale = Math.min(scaleX, scaleY, MAX_SCALE);

    const displayWidth = baseWidth * this.scale;
    const displayHeight = baseHeight * this.scale;

    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;
    this.canvas.style.width = displayWidth + 'px';
    this.canvas.style.height = displayHeight + 'px';
    this.canvas.style.transformOrigin = 'center center';
    this.canvas.style.imageRendering = 'auto';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.offsetX = (displayWidth - baseWidth * this.scale) / 2;
    this.offsetY = (displayHeight - baseHeight * this.scale) / 2
                   + HUD_VERTICAL_OFFSET * this.scale;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      if (this._resizeTimer !== null) {
        window.clearTimeout(this._resizeTimer);
      }
      this._resizeTimer = window.setTimeout(() => {
        this._dpr = window.devicePixelRatio || 1;
        this.resizeCanvas();
        this._resizeTimer = null;
      }, RESIZE_DEBOUNCE_MS);
    });

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.closePanels();
    });
  }

  private getCanvasMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;

    const x = (displayX - this.offsetX) / this.scale;
    const y = (displayY - this.offsetY) / this.scale;

    return { x, y };
  }

  private getGridFromMouse(x: number, y: number): { gx: number; gy: number } | null {
    const gx = Math.floor(x / TILE_SIZE);
    const gy = Math.floor(y / TILE_SIZE);

    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      return { gx, gy };
    }
    return null;
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasMousePos(e);
    const grid = this.getGridFromMouse(pos.x, pos.y);

    if (grid) {
      this.hoverTile = { x: grid.gx, y: grid.gy };
    } else {
      this.hoverTile = null;
    }
  }

  private handleClick(e: MouseEvent): void {
    if (this.gameOver) return;

    const pos = this.getCanvasMousePos(e);

    if (this.showBuildPanel) {
      this.handleBuildPanelClick(pos.x, pos.y);
      return;
    }

    if (this.selectedTower) {
      this.handleTowerPanelClick(pos.x, pos.y);
      return;
    }

    const grid = this.getGridFromMouse(pos.x, pos.y);
    if (!grid) {
      this.closePanels();
      return;
    }

    const existingTower = this.towers.find(
      t => t.getGridX() === grid.gx && t.getGridY() === grid.gy
    );

    if (existingTower) {
      this.selectedTower = existingTower;
      this.selectedTile = null;
      this.showBuildPanel = false;
      return;
    }

    if (this.gameMap.isBuildable(grid.gx, grid.gy)) {
      this.selectedTile = { x: grid.gx, y: grid.gy };
      this.showBuildPanel = true;
      this.selectedTower = null;
    } else {
      this.closePanels();
    }
  }

  private handleBuildPanelClick(x: number, y: number): void {
    if (!this.selectedTile) return;

    const panelX = this.selectedTile.x * TILE_SIZE + TILE_SIZE;
    const panelY = this.selectedTile.y * TILE_SIZE;
    const panelW = TILE_SIZE * 3.5;
    const panelH = TILE_SIZE * 3.2;

    if (x < panelX || x > panelX + panelW || y < panelY || y > panelY + panelH) {
      this.closePanels();
      return;
    }

    const types: TowerType[] = [TowerType.ARROW, TowerType.CANNON, TowerType.MAGIC];
    const btnW = (panelW - 20) / 3;
    const btnH = panelH - 50;
    const btnY = panelY + 45;

    for (let i = 0; i < types.length; i++) {
      const btnX = panelX + 10 + i * btnW;
      if (x >= btnX && x <= btnX + btnW - 5 && y >= btnY && y <= btnY + btnH) {
        this.tryBuildTower(types[i]);
        return;
      }
    }
  }

  private handleTowerPanelClick(x: number, y: number): void {
    if (!this.selectedTower) return;

    const panelX = this.selectedTower.getGridX() * TILE_SIZE + TILE_SIZE;
    const panelY = this.selectedTower.getGridY() * TILE_SIZE;
    const panelW = TILE_SIZE * 3.2;
    const panelH = TILE_SIZE * 2.2;

    if (x < panelX || x > panelX + panelW || y < panelY || y > panelY + panelH) {
      this.closePanels();
      return;
    }

    const btnW = (panelW - 24) / 2;
    const btnH = 42;
    const btnY = panelY + panelH - 52;

    const upgradeX = panelX + 12;
    const sellX = panelX + 12 + btnW + 12;

    if (this.selectedTower.canUpgrade() &&
        x >= upgradeX && x <= upgradeX + btnW && y >= btnY && y <= btnY + btnH) {
      this.tryUpgradeTower();
      return;
    }

    if (x >= sellX && x <= sellX + btnW && y >= btnY && y <= btnY + btnH) {
      this.sellTower();
      return;
    }
  }

  private tryBuildTower(type: TowerType): void {
    if (!this.selectedTile) return;

    const config = TOWER_CONFIGS[type];
    if (this.gold < config.cost) {
      this.addFloatingText(
        this.selectedTile.x * TILE_SIZE + TILE_SIZE / 2,
        this.selectedTile.y * TILE_SIZE + TILE_SIZE / 2,
        '金币不足!',
        '#ff6b6b'
      );
      return;
    }

    this.gold -= config.cost;
    const tower = new Tower(this.selectedTile.x, this.selectedTile.y, type);
    this.towers.push(tower);
    this.gameMap.setTile(this.selectedTile.x, this.selectedTile.y, TileType.EMPTY);

    this.addFloatingText(
      this.selectedTile.x * TILE_SIZE + TILE_SIZE / 2,
      this.selectedTile.y * TILE_SIZE + TILE_SIZE / 2 - 20,
      `-${config.cost}`,
      '#ffd43b'
    );

    this.closePanels();
  }

  private tryUpgradeTower(): void {
    if (!this.selectedTower || !this.selectedTower.canUpgrade()) return;

    const cost = this.selectedTower.getUpgradeCost();
    if (this.gold < cost) {
      this.addFloatingText(
        this.selectedTower.getCenterX(),
        this.selectedTower.getCenterY() - 20,
        '金币不足!',
        '#ff6b6b'
      );
      return;
    }

    this.gold -= cost;
    this.selectedTower.upgrade();

    this.addFloatingText(
      this.selectedTower.getCenterX(),
      this.selectedTower.getCenterY() - 20,
      `升级! -${cost}`,
      '#51cf66'
    );

    this.closePanels();
  }

  private sellTower(): void {
    if (!this.selectedTower) return;

    const value = this.selectedTower.getSellValue();
    this.gold += value;
    this.gameMap.setTile(this.selectedTower.getGridX(), this.selectedTower.getGridY(), TileType.BUILDABLE);

    const index = this.towers.indexOf(this.selectedTower);
    if (index !== -1) {
      this.towers.splice(index, 1);
    }

    this.addFloatingText(
      this.selectedTower.getCenterX(),
      this.selectedTower.getCenterY() - 20,
      `+${value}`,
      '#ffd43b'
    );

    this.closePanels();
  }

  private closePanels(): void {
    this.selectedTile = null;
    this.showBuildPanel = false;
    this.selectedTower = null;
  }

  private addFloatingText(x: number, y: number, text: string, color: string): void {
    if (this.floatingTexts.length >= 40) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      x, y, text, color,
      life: FLOATING_TEXT_DURATION,
      maxLife: FLOATING_TEXT_DURATION,
      vy: -FLOATING_TEXT_SPEED
    });
  }

  private showWaveTransition(text: string): void {
    this.waveTransition = {
      text,
      life: WAVE_TRANSITION_DURATION,
      maxLife: WAVE_TRANSITION_DURATION
    };
  }

  private startWave(): void {
    this.currentWave++;
    this.waveInProgress = true;
    this.enemiesSpawned = 0;
    this.enemiesToSpawn = MIN_ENEMIES_PER_WAVE +
      Math.floor(Math.random() * (MAX_ENEMIES_PER_WAVE - MIN_ENEMIES_PER_WAVE + 1));
    this.spawnInterval = Math.max(0.5, 1.2 - this.currentWave * 0.05);
    this.spawnTimer = 0.3;

    this.showWaveTransition(`第 ${this.currentWave} 波`);
  }

  private endWave(): void {
    this.waveInProgress = false;
    this.waveCooldown = WAVE_INTERVAL;
    this.gold += WAVE_BONUS;

    const centerX = GRID_SIZE * TILE_SIZE / 2;
    const centerY = GRID_SIZE * TILE_SIZE / 2;
    this.addFloatingText(centerX, centerY - 40, `波次完成! +${WAVE_BONUS}金币`, '#ffd43b');
  }

  private gameLoop(): void {
    const now = performance.now();
    let deltaTime = (now - this.lastTime) / 1000;
    deltaTime = Math.min(deltaTime, 0.05);
    this.lastTime = now;

    if (!this.gameOver && !this.gameWon) {
      this.update(deltaTime);
    }

    this.render();

    this._animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    if (this.waveTransition) {
      this.waveTransition.life -= deltaTime;
      if (this.waveTransition.life <= 0) {
        this.waveTransition = null;
      }
    }

    if (!this.waveInProgress) {
      if (this.waveCooldown > 0) {
        this.waveCooldown -= deltaTime;
        if (this.waveCooldown <= 0) {
          this.startWave();
        }
      }
    } else {
      if (this.enemiesSpawned < this.enemiesToSpawn) {
        this.spawnTimer -= deltaTime;
        if (this.spawnTimer <= 0) {
          this.enemies.push(new Enemy(this.currentWave, this.gameMap));
          this.enemiesSpawned++;
          this.spawnTimer = this.spawnInterval;
          this._spatialGridDirty = true;
        }
      }

      if (this.enemiesSpawned >= this.enemiesToSpawn && this.enemies.length === 0) {
        this.endWave();
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(this.gameMap, deltaTime);

      if (enemy.hasReachedEnd() && !enemy.isDead()) {
        this.lives--;
        (enemy as unknown as { dead: boolean }).dead = true;
        this._spatialGridDirty = true;

        if (this.lives <= 0) {
          this.lives = 0;
          this.gameOver = true;
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isDead() && !enemy.hasReachedEnd()) {
        this.spawnDeathParticles(enemy);
        this.gold += enemy.getReward();
        this.totalKills++;
        this.addFloatingText(enemy.getX(), enemy.getY() - 20, `+${enemy.getReward()}`, '#ffd43b');
        this.enemies.splice(i, 1);
        this._spatialGridDirty = true;
      } else if (enemy.hasReachedEnd() && enemy.isDead()) {
        this.enemies.splice(i, 1);
        this._spatialGridDirty = true;
      }
    }

    if (this._spatialGridDirty) {
      this._spatialGrid = buildSpatialGrid(this.enemies);
      this._spatialGridDirty = false;
    }

    for (const tower of this.towers) {
      this.updateTower(tower, deltaTime);
    }

    updateProjectiles(this.projectiles, this.enemies, deltaTime, (enemy) => {
      if (enemy.isDead() && !enemy.hasReachedEnd()) {
        const aliveIdx = this.enemies.indexOf(enemy);
        if (aliveIdx !== -1) {
          this.spawnDeathParticles(enemy);
          this.gold += enemy.getReward();
          this.totalKills++;
          this.addFloatingText(enemy.getX(), enemy.getY() - 20, `+${enemy.getReward()}`, '#ffd43b');
          this.enemies.splice(aliveIdx, 1);
          this._spatialGridDirty = true;
        }
      }
    });

    if (this.projectiles.length > MAX_PROJECTILES) {
      this.projectiles.length = MAX_PROJECTILES;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += DEATH_PARTICLE_GRAVITY * deltaTime;
      p.vx *= DEATH_PARTICLE_DRAG;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= deltaTime;
      ft.y += ft.vy * deltaTime;

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateTower(tower: Tower, deltaTime: number): void {
    const grid = this._spatialGrid;
    if (grid) {
      const candidates = querySpatialRange(
        grid, this.enemies,
        tower.getCenterX(), tower.getCenterY(), tower.getRange()
      );
      tower.update(deltaTime, candidates, this.projectiles);
    } else {
      tower.update(deltaTime, this.enemies, this.projectiles);
    }
  }

  private spawnDeathParticles(enemy: Enemy): void {
    const extra = enemy.createDeathParticles();
    if (this.particles.length + extra.length > MAX_PARTICLES) {
      const allowed = Math.max(0, MAX_PARTICLES - this.particles.length);
      const ratio = allowed / extra.length;
      const capped = Math.floor(DEATH_PARTICLE_COUNT * 0.7);
      for (let i = 0; i < Math.min(capped, extra.length); i++) {
        if (Math.random() <= ratio + 0.1) {
          this.particles.push(extra[i]);
        }
      }
    } else {
      for (const p of extra) {
        this.particles.push(p);
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const dpr = this._dpr;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.renderMap();
    this.renderHoverHighlight();

    for (const tower of this.towers) {
      tower.render(ctx, tower === this.selectedTower);
    }

    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }

    renderProjectiles(ctx, this.projectiles);
    this.renderParticles();

    if (this.showBuildPanel && this.selectedTile) {
      this.renderBuildPanel();
    }

    if (this.selectedTower) {
      this.renderTowerPanel();
    }

    this.renderFloatingTexts();

    ctx.restore();

    this.renderHUD(width, height);
    this.renderWaveTransition(width, height);

    if (this.gameOver) {
      this.renderGameOver(width, height);
    }
  }

  private renderMap(): void {
    const ctx = this.ctx;
    const grid = this.gameMap.getGrid();

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = grid[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        ctx.fillStyle = '#16162a';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = '#2a2a4e';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

        if (tile === TileType.PATH || tile === TileType.START || tile === TileType.END) {
          const gradient = ctx.createLinearGradient(px, py, px, py + TILE_SIZE);
          gradient.addColorStop(0, '#5a5a6e');
          gradient.addColorStop(0.5, '#4a4a5e');
          gradient.addColorStop(1, '#3a3a4e');
          ctx.fillStyle = gradient;
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          if (tile === TileType.START) {
            ctx.fillStyle = '#51cf66';
            ctx.font = 'bold 16px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▶', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
          } else if (tile === TileType.END) {
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else if (tile === TileType.BUILDABLE) {
          ctx.fillStyle = 'rgba(100, 180, 255, 0.12)';
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.strokeStyle = 'rgba(100, 180, 255, 0.25)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(px + 4.5, py + 4.5, TILE_SIZE - 9, TILE_SIZE - 9);
          ctx.setLineDash([]);
        }
      }
    }
  }

  private renderHoverHighlight(): void {
    if (!this.hoverTile) return;
    const ctx = this.ctx;
    const { x, y } = this.hoverTile;
    const tile = this.gameMap.getTile(x, y);
    const hasTower = this.towers.some(t => t.getGridX() === x && t.getGridY() === y);

    if (hasTower) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.restore();
      return;
    }

    if (tile === TileType.BUILDABLE) {
      ctx.save();
      ctx.fillStyle = 'rgba(100, 200, 100, 0.25)';
      ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = 'rgba(100, 255, 100, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.restore();
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderFloatingTexts(): void {
    const ctx = this.ctx;
    ctx.font = 'bold 16px "Cinzel", "Noto Serif SC", serif';
    ctx.textAlign = 'center';

    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, Math.min(1, ft.life / ft.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }

  private renderBuildPanel(): void {
    if (!this.selectedTile) return;
    const ctx = this.ctx;

    let panelX = this.selectedTile.x * TILE_SIZE + TILE_SIZE;
    let panelY = this.selectedTile.y * TILE_SIZE;
    const panelW = TILE_SIZE * 3.5;
    const panelH = TILE_SIZE * 3.2;

    if (panelX + panelW > GRID_SIZE * TILE_SIZE) {
      panelX = this.selectedTile.x * TILE_SIZE - panelW;
    }
    if (panelY + panelH > GRID_SIZE * TILE_SIZE) {
      panelY = GRID_SIZE * TILE_SIZE - panelH;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 40, 0.85)';
    this.panelRoundedRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
    ctx.lineWidth = 1.5;
    this.panelRoundedRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Cinzel", "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择防御塔', panelX + panelW / 2, panelY + 28);

    const types: TowerType[] = [TowerType.ARROW, TowerType.CANNON, TowerType.MAGIC];
    const btnW = (panelW - 20) / 3;
    const btnH = panelH - 50;
    const btnY = panelY + 45;

    for (let i = 0; i < types.length; i++) {
      const btnX = panelX + 10 + i * btnW;
      this.renderTowerOption(ctx, types[i], btnX, btnY, btnW - 5, btnH);
    }

    ctx.restore();
  }

  private renderTowerOption(
    ctx: CanvasRenderingContext2D,
    type: TowerType,
    x: number, y: number, w: number, h: number
  ): void {
    const config = TOWER_CONFIGS[type];
    const canAfford = this.gold >= config.cost;

    ctx.fillStyle = canAfford ? 'rgba(60, 60, 100, 0.6)' : 'rgba(40, 40, 60, 0.6)';
    this.panelRoundedRect(ctx, x, y, w, h, 8);
    ctx.fill();

    ctx.strokeStyle = canAfford ? config.color : 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    this.panelRoundedRect(ctx, x, y, w, h, 8);
    ctx.stroke();

    const iconY = y + h * 0.32;
    ctx.fillStyle = canAfford ? config.color : '#555';
    ctx.beginPath();
    ctx.arc(x + w / 2, iconY, w * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = config.secondaryColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = canAfford ? '#ffffff' : '#777';
    ctx.font = '13px "Cinzel", "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.name, x + w / 2, y + h * 0.65);

    ctx.font = '11px "Cinzel", "Noto Serif SC", serif';
    const goldColor = canAfford ? '#ffd43b' : '#777';
    ctx.fillStyle = goldColor;
    ctx.fillText(`💰 ${config.cost}`, x + w / 2, y + h * 0.82);

    ctx.globalAlpha = 1;
  }

  private renderTowerPanel(): void {
    if (!this.selectedTower) return;
    const ctx = this.ctx;
    const tower = this.selectedTower;
    const config = tower.getConfig();

    let panelX = tower.getGridX() * TILE_SIZE + TILE_SIZE;
    let panelY = tower.getGridY() * TILE_SIZE;
    const panelW = TILE_SIZE * 3.2;
    const panelH = TILE_SIZE * 2.2;

    if (panelX + panelW > GRID_SIZE * TILE_SIZE) {
      panelX = tower.getGridX() * TILE_SIZE - panelW;
    }
    if (panelY + panelH > GRID_SIZE * TILE_SIZE) {
      panelY = GRID_SIZE * TILE_SIZE - panelH;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 40, 0.85)';
    this.panelRoundedRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = config.color + '80';
    ctx.lineWidth = 1.5;
    this.panelRoundedRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Cinzel", "Noto Serif SC", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${config.name} Lv.${tower.getLevel()}`, panelX + 15, panelY + 32);

    ctx.font = '12px "Cinzel", "Noto Serif SC", serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`伤害: ${tower.getDamage()}`, panelX + 15, panelY + 55);
    ctx.fillText(`射程: ${Math.floor(tower.getRange())}`, panelX + 15, panelY + 73);
    ctx.fillText(`击杀: ${tower.getTotalKills()}`, panelX + panelW - 90, panelY + 55);

    const btnW = (panelW - 24) / 2;
    const btnH = 42;
    const btnY = panelY + panelH - 52;

    const upgradeCost = tower.getUpgradeCost();
    const canUpgrade = tower.canUpgrade() && this.gold >= upgradeCost;

    ctx.fillStyle = tower.canUpgrade()
      ? (canUpgrade ? 'rgba(81, 207, 102, 0.3)' : 'rgba(60, 60, 60, 0.4)')
      : 'rgba(60, 60, 60, 0.4)';
    this.panelRoundedRect(ctx, panelX + 12, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = tower.canUpgrade() ? (canUpgrade ? '#51cf66' : '#555') : '#555';
    ctx.lineWidth = 2;
    this.panelRoundedRect(ctx, panelX + 12, btnY, btnW, btnH, 8);
    ctx.stroke();

    ctx.fillStyle = canUpgrade ? '#fff' : '#777';
    ctx.font = 'bold 13px "Cinzel", "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    if (tower.canUpgrade()) {
      ctx.fillText('升级', panelX + 12 + btnW / 2, btnY + 18);
      ctx.font = '11px serif';
      ctx.fillStyle = canUpgrade ? '#ffd43b' : '#777';
      ctx.fillText(`💰 ${upgradeCost}`, panelX + 12 + btnW / 2, btnY + 34);
    } else {
      ctx.fillText('满级', panelX + 12 + btnW / 2, btnY + 26);
    }

    const sellValue = tower.getSellValue();
    ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
    this.panelRoundedRect(ctx, panelX + 12 + btnW + 12, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    this.panelRoundedRect(ctx, panelX + 12 + btnW + 12, btnY, btnW, btnH, 8);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Cinzel", "Noto Serif SC", serif';
    ctx.fillText('出售', panelX + 12 + btnW + 12 + btnW / 2, btnY + 18);
    ctx.font = '11px serif';
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(`💰 ${sellValue}`, panelX + 12 + btnW + 12 + btnW / 2, btnY + 34);

    ctx.restore();
  }

  private panelRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private renderHUD(_width: number, _height: number): void {
    const ctx = this.ctx;
    const hudTop = 15;
    const hudWidth = GRID_SIZE * TILE_SIZE * this.scale;
    const hudLeft = this.offsetX;
    const hudHeight = 48;

    ctx.save();

    ctx.fillStyle = 'rgba(20, 20, 40, 0.7)';
    this.panelRoundedRect(ctx, hudLeft, hudTop, hudWidth, hudHeight, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    this.panelRoundedRect(ctx, hudLeft, hudTop, hudWidth, hudHeight, 8);
    ctx.stroke();

    const itemWidth = hudWidth / 4;

    ctx.font = 'bold 18px "Cinzel", "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerY = hudTop + hudHeight / 2;

    ctx.fillStyle = '#ffd43b';
    ctx.fillText(`💰 ${this.gold}`, hudLeft + itemWidth * 0.5, centerY);

    ctx.fillStyle = this.lives > 5 ? '#ff6b6b' : '#ff4444';
    ctx.fillText(`❤ ${this.lives}`, hudLeft + itemWidth * 1.5, centerY);

    ctx.fillStyle = '#4dabf7';
    const waveText = this.waveInProgress
      ? `第 ${this.currentWave} 波`
      : (this.currentWave === 0 ? '准备中' : `下一波 ${Math.ceil(this.waveCooldown)}s`);
    ctx.fillText(`⚔ ${waveText}`, hudLeft + itemWidth * 2.5, centerY);

    ctx.fillStyle = '#a9e34b';
    ctx.fillText(`☠ ${this.totalKills}`, hudLeft + itemWidth * 3.5, centerY);

    ctx.restore();
  }

  private renderWaveTransition(width: number, height: number): void {
    if (!this.waveTransition) return;

    const ctx = this.ctx;
    const progress = this.waveTransition.life / this.waveTransition.maxLife;

    let alpha = 1;
    if (progress > (1 - WAVE_TRANSITION_FADE_OUT_PORTION)) {
      const fadeStart = 1 - WAVE_TRANSITION_FADE_OUT_PORTION;
      alpha = 1 - (progress - fadeStart) / WAVE_TRANSITION_FADE_OUT_PORTION;
    } else if (progress < WAVE_TRANSITION_FADE_IN_PORTION) {
      alpha = progress / WAVE_TRANSITION_FADE_IN_PORTION;
    }

    const pulseProgress = easeInOutQuad(progress);
    const pulse = 1 + Math.sin(pulseProgress * Math.PI) * (WAVE_TRANSITION_PULSE_SCALE - 1);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.9;

    const centerX = width / 2;
    const centerY = height / 2 - WAVE_TRANSITION_VERTICAL_OFFSET * this.scale;

    ctx.translate(centerX, centerY);
    ctx.scale(pulse, pulse);

    ctx.font = `bold ${WAVE_TRANSITION_FONT_SIZE}px "Cinzel", "Noto Serif SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000';
    ctx.lineWidth = WAVE_TRANSITION_STROKE_WIDTH;
    ctx.strokeText(this.waveTransition.text, 0, 0);

    const gradient = ctx.createLinearGradient(0, -40, 0, 40);
    gradient.addColorStop(0, '#ffd43b');
    gradient.addColorStop(0.5, '#fff');
    gradient.addColorStop(1, '#ffd43b');
    ctx.fillStyle = gradient;
    ctx.fillText(this.waveTransition.text, 0, 0);

    ctx.restore();
  }

  private renderGameOver(width: number, height: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, width, height);

    const panelW = 420;
    const panelH = 320;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    ctx.fillStyle = 'rgba(26, 26, 46, 0.98)';
    this.panelRoundedRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
    ctx.lineWidth = 2;
    this.panelRoundedRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 42px "Cinzel", "Noto Serif SC", serif';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('游戏结束', width / 2, panelY + 70);

    ctx.font = '20px "Cinzel", "Noto Serif SC", serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('坚持波数', width / 2 - 80, panelY + 130);
    ctx.fillText('击败敌人', width / 2 + 80, panelY + 130);

    ctx.font = 'bold 32px "Cinzel", "Noto Serif SC", serif';
    ctx.fillStyle = '#4dabf7';
    ctx.fillText(`${this.currentWave}`, width / 2 - 80, panelY + 170);
    ctx.fillStyle = '#a9e34b';
    ctx.fillText(`${this.totalKills}`, width / 2 + 80, panelY + 170);

    ctx.font = 'bold 28px "Cinzel", "Noto Serif SC", serif';
    const gradient = ctx.createLinearGradient(width / 2 - 80, 0, width / 2 + 80, 0);
    gradient.addColorStop(0, '#ffd43b');
    gradient.addColorStop(1, '#ff922b');
    ctx.fillStyle = gradient;
    ctx.fillText(`最终得分: ${this.totalKills * 10 + this.currentWave * 50}`, width / 2, panelY + 220);

    const btnW = 200;
    const btnH = 56;
    const btnX = width / 2 - btnW / 2;
    const btnY = panelY + panelH - 80;

    ctx.fillStyle = 'rgba(81, 207, 102, 0.3)';
    this.panelRoundedRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.strokeStyle = '#51cf66';
    ctx.lineWidth = 2;
    this.panelRoundedRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.stroke();

    ctx.font = 'bold 22px "Cinzel", "Noto Serif SC", serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('重新开始', width / 2, btnY + btnH / 2);

    ctx.restore();

    this.canvas.onclick = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = this._dpr;
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width) / dpr;
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height) / dpr;

      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        this.restart();
      }
    };
  }

  private restart(): void {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
    }
    this.gameMap = new GameMap();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];

    this.gold = INITIAL_GOLD;
    this.lives = INITIAL_LIVES;
    this.currentWave = 0;
    this.totalKills = 0;
    this.gameOver = false;
    this.gameWon = false;

    this.waveInProgress = false;
    this.enemiesSpawned = 0;
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.waveCooldown = FIRST_WAVE_PREPARE_TIME;
    this.waveTransition = null;

    this.selectedTile = null;
    this.showBuildPanel = false;
    this.selectedTower = null;

    this._spatialGrid = null;
    this._spatialGridDirty = true;

    this.setupEventListeners();
    this.preallocatePools();
    this.lastTime = performance.now();
    this.showWaveTransition('第 1 波 即将开始');
    this.gameLoop();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
