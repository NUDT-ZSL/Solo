import {
  TILE_SIZE, Tile, TileType, Player, CrystalOre, Tower, Enemy,
  Bullet, Particle, createParticleBurst
} from './entities';
import { Renderer, Camera } from './renderer';
import { InputManager } from './input';

export type GameState = 'playing' | 'gameover';

const TOWER_COST = 3;
const WAVE_INTERVAL = 15;
const INITIAL_GENERATION_RADIUS = 8;
const GENERATION_DELAY = 0.1;
const HARVEST_DISTANCE = TILE_SIZE * 1.2;

export class Game {
  private tiles: Map<string, Tile> = new Map();
  private pendingGenerations: { tile: Tile; startTime: number }[] = [];
  private player: Player;
  private ores: CrystalOre[] = [];
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private camera: Camera = { x: 0, y: 0 };
  private input: InputManager;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;

  public state: GameState = 'playing';
  public crystals: number = 5;
  public wave: number = 0;
  public buildMode: boolean = false;

  private waveTimer: number = WAVE_INTERVAL * 0.5;
  private gameOverTimer: number = 0;
  private generatedRadius: number = INITIAL_GENERATION_RADIUS;
  private lastTileGenerationCheck: number = 0;
  private restartButtonRect: { x: number; y: number; w: number; h: number } | null = null;

  constructor(canvas: HTMLCanvasElement, renderer: Renderer, input: InputManager) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.input = input;
    this.player = new Player(0, 0);
    this.initializeWorld();
  }

  private initializeWorld(): void {
    const centerTX = 0;
    const centerTY = 0;

    for (let radius = 0; radius <= INITIAL_GENERATION_RADIUS; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const tx = centerTX + dx;
          const ty = centerTY + dy;
          this.queueTileGeneration(tx, ty, radius * GENERATION_DELAY);
        }
      }
    }
  }

  private queueTileGeneration(tx: number, ty: number, delay: number): void {
    const key = `${tx},${ty}`;
    if (this.tiles.has(key)) return;

    const dist = Math.hypot(tx, ty);
    let type: TileType = 'grass';
    const r = Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453;
    const rand = r - Math.floor(r);

    if (dist > 2) {
      if (rand < 0.08) type = 'rock';
      else if (rand < 0.14) type = 'crystal';
    }
    if (Math.abs(tx) < 2 && Math.abs(ty) < 2) type = 'grass';

    const tile: Tile = {
      type,
      x: tx,
      y: ty,
      generated: false,
      generateProgress: 0,
      noiseSeed: Math.random() * 100
    };

    this.tiles.set(key, tile);
    this.pendingGenerations.push({
      tile,
      startTime: Date.now() + delay * 1000
    });

    if (type === 'crystal') {
      this.ores.push(new CrystalOre(tx, ty));
    }
  }

  reset(): void {
    this.tiles.clear();
    this.pendingGenerations = [];
    this.ores = [];
    this.towers = [];
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.player = new Player(0, 0);
    this.camera = { x: 0, y: 0 };
    this.state = 'playing';
    this.crystals = 5;
    this.wave = 0;
    this.buildMode = false;
    this.waveTimer = WAVE_INTERVAL * 0.5;
    this.gameOverTimer = 0;
    this.generatedRadius = INITIAL_GENERATION_RADIUS;
    this.lastTileGenerationCheck = 0;
    this.restartButtonRect = null;
    this.initializeWorld();
  }

  private updateTileGeneration(): void {
    const now = Date.now();
    for (let i = this.pendingGenerations.length - 1; i >= 0; i--) {
      const pg = this.pendingGenerations[i];
      if (now >= pg.startTime) {
        pg.tile.generated = true;
        pg.tile.generateProgress = Math.min(1, (now - pg.startTime) / 300);
        if (pg.tile.generateProgress >= 1) {
          this.pendingGenerations.splice(i, 1);
        }
      }
    }
  }

  private checkExpandWorld(): void {
    const now = Date.now();
    if (now - this.lastTileGenerationCheck < 500) return;
    this.lastTileGenerationCheck = now;

    const ptx = Math.floor(this.player.x / TILE_SIZE);
    const pty = Math.floor(this.player.y / TILE_SIZE);
    const maxDist = 5;

    let needsExpand = false;
    for (let dy = -maxDist; dy <= maxDist; dy++) {
      for (let dx = -maxDist; dx <= maxDist; dx++) {
        const key = `${ptx + dx},${pty + dy}`;
        if (!this.tiles.has(key)) {
          needsExpand = true;
          break;
        }
      }
      if (needsExpand) break;
    }

    if (needsExpand) {
      this.generatedRadius++;
      const newRadius = this.generatedRadius;
      for (let r = 0; r <= newRadius; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const tx = ptx + dx;
            const ty = pty + dy;
            const key = `${tx},${ty}`;
            if (!this.tiles.has(key)) {
              this.queueTileGeneration(tx, ty, Math.max(0, r - 4) * GENERATION_DELAY);
            }
          }
        }
      }
    }
  }

  private canWalkTo(px: number, py: number): boolean {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    const key = `${tx},${ty}`;
    const tile = this.tiles.get(key);
    if (!tile || !tile.generated) return false;
    if (tile.type === 'rock') return false;

    const hw = this.player.width / 2 - 1;
    const hh = this.player.height / 2 - 1;
    const corners = [
      { x: px - hw, y: py - hh },
      { x: px + hw, y: py - hh },
      { x: px - hw, y: py + hh },
      { x: px + hw, y: py + hh }
    ];

    for (const c of corners) {
      const ctx = Math.floor(c.x / TILE_SIZE);
      const cty = Math.floor(c.y / TILE_SIZE);
      const ck = `${ctx},${cty}`;
      const ct = this.tiles.get(ck);
      if (!ct || !ct.generated) return false;
      if (ct.type === 'rock') return false;
    }

    return true;
  }

  private handlePlayerMovement(dt: number): void {
    const move = this.input.getMovementVector();
    const oldX = this.player.x;
    const oldY = this.player.y;

    this.player.update(dt, move.x, move.y);

    if (move.x !== 0) {
      const newX = oldX + move.x * this.player.speed;
      if (this.canWalkTo(newX, oldY)) {
        this.player.x = newX;
      }
    }
    if (move.y !== 0) {
      const newY = oldY + move.y * this.player.speed;
      if (this.canWalkTo(this.player.x, newY)) {
        this.player.y = newY;
      }
    }

    const lerp = 0.1;
    this.camera.x += (this.player.x - this.camera.x) * lerp;
    this.camera.y += (this.player.y - this.camera.y) * lerp;
  }

  private handleHarvest(): void {
    if (!this.input.wasEPressed()) return;

    let nearestOre: CrystalOre | null = null;
    let nearestDist = HARVEST_DISTANCE;
    for (const ore of this.ores) {
      if (ore.collected || ore.isHarvesting) continue;
      const dist = Math.hypot(ore.x - this.player.x, ore.y - this.player.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestOre = ore;
      }
    }

    if (nearestOre) {
      nearestOre.startHarvest();
    }
  }

  private handleBuildMode(): void {
    if (this.input.wasOnePressed()) {
      this.buildMode = !this.buildMode;
    }
  }

  private handleBuildPlacement(): void {
    if (!this.buildMode) return;
    if (!this.input.wasMouseClicked()) return;

    const mouseWorld = this.renderer.screenToWorld(
      this.input.state.mouseX,
      this.input.state.mouseY,
      this.camera
    );
    const tx = Math.floor(mouseWorld.x / TILE_SIZE);
    const ty = Math.floor(mouseWorld.y / TILE_SIZE);

    if (!this.canBuildAt(tx, ty)) return;
    if (this.crystals < TOWER_COST) return;

    this.crystals -= TOWER_COST;
    const tower = new Tower(tx, ty);
    this.towers.push(tower);

    this.particles.push(...createParticleBurst(
      tower.x, tower.y, 8, '#FFDD44', 'tower_build', 1.5, 0.6
    ));
  }

  private canBuildAt(tx: number, ty: number): boolean {
    const key = `${tx},${ty}`;
    const tile = this.tiles.get(key);
    if (!tile || !tile.generated) return false;
    if (tile.type !== 'grass') return false;

    for (const tower of this.towers) {
      if (tower.tileX === tx && tower.tileY === ty) return false;
    }
    for (const ore of this.ores) {
      if (!ore.collected && ore.tileX === tx && ore.tileY === ty) return false;
    }

    const dist = Math.hypot(
      tx * TILE_SIZE + TILE_SIZE / 2 - this.player.x,
      ty * TILE_SIZE + TILE_SIZE / 2 - this.player.y
    );
    return dist < TILE_SIZE * 6;
  }

  public getBuildPreviewInfo(): { valid: boolean; canAfford: boolean; worldX: number; worldY: number } | null {
    if (!this.buildMode) return null;

    const mouseWorld = this.renderer.screenToWorld(
      this.input.state.mouseX,
      this.input.state.mouseY,
      this.camera
    );
    const tx = Math.floor(mouseWorld.x / TILE_SIZE);
    const ty = Math.floor(mouseWorld.y / TILE_SIZE);

    return {
      valid: this.canBuildAt(tx, ty),
      canAfford: this.crystals >= TOWER_COST,
      worldX: mouseWorld.x,
      worldY: mouseWorld.y
    };
  }

  private updateOres(dt: number): void {
    for (let i = this.ores.length - 1; i >= 0; i--) {
      const ore = this.ores[i];
      if (ore.update(dt)) {
        this.crystals += ore.crystalValue;
        this.particles.push(...createParticleBurst(
          ore.x, ore.y, 12, '#FFDD00', 'crystal_collect', 2, 0.6
        ));
        this.ores.splice(i, 1);
      }
    }
  }

  private updateTowers(dt: number): void {
    for (const tower of this.towers) {
      tower.update(dt);
      if (tower.canAttack()) {
        let nearestEnemy: Enemy | null = null;
        let nearestDist = tower.attackRange;
        for (const enemy of this.enemies) {
          const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestEnemy = enemy;
          }
        }
        if (nearestEnemy) {
          tower.resetAttackTimer();
          this.bullets.push(new Bullet(tower.x, tower.y - 2, nearestEnemy.x, nearestEnemy.y));
        }
      }
    }
  }

  private updateWave(dt: number): void {
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.wave++;
      this.waveTimer = WAVE_INTERVAL;
      this.spawnWave();
    }
  }

  private spawnWave(): void {
    const count = 3 + Math.floor(this.wave * 1.5);
    const tilesOut = 12;
    const px = this.player.x;
    const py = this.player.y;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const dist = TILE_SIZE * tilesOut + Math.random() * TILE_SIZE * 4;
      const ex = px + Math.cos(angle) * dist;
      const ey = py + Math.sin(angle) * dist;
      this.enemies.push(new Enemy(ex, ey, this.wave));
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.x, this.player.y, this.towers);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      if (Math.hypot(dx, dy) < 10) {
        if (this.player.invincibleTimer <= 0) {
          this.player.takeDamage(enemy.damage);
          this.particles.push(...createParticleBurst(
            this.player.x, this.player.y, 8, '#FF3355', 'heart_break', 2, 0.5
          ));
        }
      }

      for (let j = this.towers.length - 1; j >= 0; j--) {
        const tower = this.towers[j];
        if (tower.isBuilding) continue;
        const tdx = enemy.x - tower.x;
        const tdy = enemy.y - tower.y;
        if (Math.hypot(tdx, tdy) < 12) {
          if (tower.takeDamage(enemy.damage)) {
            this.particles.push(...createParticleBurst(
              tower.x, tower.y, 16, '#FFAA44', 'tower_destroy', 3, 0.8
            ));
            this.towers.splice(j, 1);
          }
          this.enemies.splice(i, 1);
          this.particles.push(...createParticleBurst(
            enemy.x, enemy.y, 8, '#660044', 'enemy_death', 2, 0.5
          ));
          break;
        }
      }
    }
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update(dt);

      if (!bullet.alive) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
          if (dist < 10) {
            if (enemy.takeDamage(bullet.damage)) {
              this.particles.push(...createParticleBurst(
                enemy.x, enemy.y, 10, '#660044', 'enemy_death', 2.5, 0.6
              ));
              this.enemies.splice(j, 1);
            }
            break;
          }
        }
        this.bullets.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
        if (dist < 8) {
          bullet.alive = false;
          if (enemy.takeDamage(bullet.damage)) {
            this.particles.push(...createParticleBurst(
              enemy.x, enemy.y, 10, '#660044', 'enemy_death', 2.5, 0.6
            ));
            this.enemies.splice(j, 1);
          }
          this.bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].update(dt)) {
        this.particles.splice(i, 1);
      }
    }
  }

  private checkGameOver(): void {
    if (this.player.isDead() && this.state === 'playing') {
      this.state = 'gameover';
      this.gameOverTimer = 0;
    }
  }

  public handleGameOverClick(): void {
    if (this.state !== 'gameover') return;
    if (this.gameOverTimer < 1.2) return;
    if (this.renderer.checkRestartClick(
      this.input.state.mouseX, this.input.state.mouseY,
      this.restartButtonRect || undefined
    )) {
      this.reset();
    }
  }

  public update(dt: number): void {
    if (this.state === 'gameover') {
      this.gameOverTimer += dt;
      this.handleGameOverClick();
      this.updateParticles(dt);
      return;
    }

    this.input.update();
    this.updateTileGeneration();
    this.checkExpandWorld();
    this.handlePlayerMovement(dt);
    this.handleHarvest();
    this.handleBuildMode();
    this.handleBuildPlacement();
    this.updateOres(dt);
    this.updateTowers(dt);
    this.updateWave(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateParticles(dt);
    this.checkGameOver();

    const totalEntities = this.enemies.length + this.towers.length + this.ores.length + this.bullets.length;
    this.renderer.entityCount = totalEntities;
    this.renderer.lodEnabled = totalEntities > 400;
  }

  public render(): void {
    this.renderer.clear();

    this.renderer.drawTiles(this.tiles, this.camera);
    this.renderer.drawCrystalOres(this.ores, this.camera);
    this.renderer.drawTowers(this.towers, this.camera);

    if (this.state === 'playing') {
      for (const ore of this.ores) {
        if (ore.collected || ore.isHarvesting) continue;
        const dist = Math.hypot(ore.x - this.player.x, ore.y - this.player.y);
        if (dist < HARVEST_DISTANCE * 1.1) {
          this.renderer.drawHarvestHint(ore.x, ore.y, this.camera);
          break;
        }
      }
    }

    this.renderer.drawEnemies(this.enemies, this.camera);
    this.renderer.drawBullets(this.bullets, this.camera);
    this.renderer.drawPlayer(this.player, this.camera);
    this.renderer.drawParticles(this.particles, this.camera);

    const preview = this.getBuildPreviewInfo();
    if (preview) {
      this.renderer.drawBuildPreview(
        preview.worldX, preview.worldY, this.camera,
        preview.valid, preview.canAfford
      );
    }

    this.renderer.drawUI(this.player, this.crystals, this.wave, this.buildMode);
    this.renderer.drawMinimap(this.tiles, this.player, this.towers, this.enemies, this.camera);

    if (this.state === 'gameover') {
      const result = this.renderer.drawGameOver(this.gameOverTimer);
      if (result) this.restartButtonRect = result.buttonRect;
    }
  }
}
