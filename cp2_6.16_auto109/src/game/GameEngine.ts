import {
  GameState,
  Building,
  Seaweed,
  TideBeast,
  BuildingType,
  BUILDING_CONFIGS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TILE_SIZE,
  TIDE_RISE_TIME,
  TIDE_FALL_TIME,
  TIDE_MAX_LEVEL,
  MAX_TIDE_BEASTS,
  SHIELD_DURATION,
  SHIELD_COST,
  SEAWEED_SPAWN_INTERVAL,
  SEAWEED_ENERGY,
  SEAWEED_SCORE,
  BUILDING_SCORE,
  CYCLE_SCORE,
  DAMAGE_DURATION,
  MAX_DESTROYED,
  WARNING_TIME,
} from './entities';
import { TileMap } from './TileMap';

export class GameEngine {
  private tileMap: TileMap;
  private buildings: Building[] = [];
  private seaweeds: Seaweed[] = [];
  private tideBeasts: TideBeast[] = [];
  private state: GameState;
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private running: boolean = false;
  private seaweedSpawnTimer: number = 0;
  private nextSeaweedId: number = 0;
  private nextBeastId: number = 0;
  private onStateChange?: (state: GameState) => void;
  private tideBeastSpawnCooldown: number = 0;

  constructor() {
    this.tileMap = new TileMap();
    this.state = {
      score: 0,
      energy: 30,
      tideLevel: 0,
      tidePhase: 'rising',
      tideTimer: 0,
      cycleCount: 0,
      buildingsBuilt: 0,
      destroyedBuildings: 0,
      gameOver: false,
      selectedBuilding: null,
      warningActive: false,
    };
    this.spawnInitialSeaweeds();
  }

  public setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public restart(): void {
    this.stop();
    this.tileMap = new TileMap();
    this.buildings = [];
    this.seaweeds = [];
    this.tideBeasts = [];
    this.seaweedSpawnTimer = 0;
    this.nextSeaweedId = 0;
    this.nextBeastId = 0;
    this.tideBeastSpawnCooldown = 0;
    this.state = {
      score: 0,
      energy: 30,
      tideLevel: 0,
      tidePhase: 'rising',
      tideTimer: 0,
      cycleCount: 0,
      buildingsBuilt: 0,
      destroyedBuildings: 0,
      gameOver: false,
      selectedBuilding: null,
      warningActive: false,
    };
    this.spawnInitialSeaweeds();
    this.notifyStateChange();
    this.start();
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getTileMap(): TileMap {
    return this.tileMap;
  }

  public getBuildings(): Building[] {
    return [...this.buildings];
  }

  public selectBuilding(type: BuildingType | null): void {
    this.state.selectedBuilding = type;
    this.notifyStateChange();
  }

  private gameLoop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.state.gameOver) {
      this.update(deltaTime);
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  public update(deltaTime: number): void {
    this.updateTide(deltaTime);
    this.updateSeaweeds(deltaTime);
    this.updateBuildings(deltaTime);
    this.updateTideBeasts(deltaTime);
    this.checkCollisions();
    this.tileMap.updateWaterLevels(this.state.tideLevel, this.buildings);
    this.checkGameOver();
  }

  private updateTide(deltaTime: number): void {
    this.state.tideTimer += deltaTime;

    const levelPerSecond = TIDE_MAX_LEVEL / TIDE_RISE_TIME;

    if (this.state.tidePhase === 'rising') {
      this.state.tideLevel = Math.min(
        this.state.tideLevel + levelPerSecond * deltaTime,
        TIDE_MAX_LEVEL
      );

      if (this.state.tideLevel >= TIDE_MAX_LEVEL) {
        this.state.tideLevel = TIDE_MAX_LEVEL;
      }

      const timeToMax = TIDE_RISE_TIME - this.state.tideTimer;
      this.state.warningActive = this.hasWatchtower() && timeToMax <= WARNING_TIME && timeToMax > 0;

      if (this.state.tideTimer >= TIDE_RISE_TIME) {
        this.state.tidePhase = 'falling';
        this.state.tideTimer = 0;
        this.state.cycleCount += 1;
        this.state.score += CYCLE_SCORE;
        this.notifyStateChange();
      }
    } else {
      this.state.tideLevel = Math.max(
        this.state.tideLevel - levelPerSecond * deltaTime,
        0
      );

      if (this.state.tideLevel <= 0) {
        this.state.tideLevel = 0;
      }

      this.state.warningActive = false;

      if (this.state.tideTimer >= TIDE_FALL_TIME) {
        this.state.tidePhase = 'rising';
        this.state.tideTimer = 0;
      }
    }

    if (this.state.tideLevel >= TIDE_MAX_LEVEL * 0.9) {
      this.spawnTideBeasts(deltaTime);
    }
  }

  private hasWatchtower(): boolean {
    return this.buildings.some(b => b.type === 'watchtower' && !b.isDamaged);
  }

  private updateSeaweeds(deltaTime: number): void {
    this.seaweedSpawnTimer += deltaTime;

    for (const seaweed of this.seaweeds) {
      if (seaweed.collectAnimation > 0) {
        seaweed.collectAnimation -= deltaTime;
      }
      if (seaweed.spawnAnimation > 0) {
        seaweed.spawnAnimation -= deltaTime;
      }
      if (seaweed.collected) {
        seaweed.respawnTimer -= deltaTime;
        if (seaweed.respawnTimer <= 0) {
          seaweed.collected = false;
          seaweed.respawnTimer = 0;
          seaweed.spawnAnimation = 0.5;
        }
      }
    }

    if (this.seaweedSpawnTimer >= SEAWEED_SPAWN_INTERVAL) {
      this.seaweedSpawnTimer = 0;
      this.spawnMoreSeaweeds();
    }
  }

  private spawnInitialSeaweeds(): void {
    const count = 5 + Math.floor(Math.random() * 4);
    const shallowTiles = this.tileMap.getShallowTiles();
    for (let i = 0; i < Math.min(count, shallowTiles.length); i++) {
      const tile = shallowTiles[Math.floor(Math.random() * shallowTiles.length)];
      const center = this.tileMap.getTileCenter(tile.x, tile.y);
      this.seaweeds.push({
        id: this.nextSeaweedId++,
        x: center.x + (Math.random() - 0.5) * 20,
        y: center.y + (Math.random() - 0.5) * 20,
        collected: false,
        collectAnimation: 0,
        respawnTimer: 0,
        spawnAnimation: 0.5,
      });
    }
  }

  private spawnMoreSeaweeds(): void {
    const activeCount = this.seaweeds.filter(s => !s.collected).length;
    if (activeCount >= 8) return;
    const shallowTiles = this.tileMap.getShallowTiles();
    const toSpawn = Math.min(2, shallowTiles.length - activeCount);
    for (let i = 0; i < toSpawn; i++) {
      const tile = shallowTiles[Math.floor(Math.random() * shallowTiles.length)];
      const center = this.tileMap.getTileCenter(tile.x, tile.y);
      this.seaweeds.push({
        id: this.nextSeaweedId++,
        x: center.x + (Math.random() - 0.5) * 20,
        y: center.y + (Math.random() - 0.5) * 20,
        collected: false,
        collectAnimation: 0,
        respawnTimer: 0,
        spawnAnimation: 0.5,
      });
    }
  }

  private updateBuildings(deltaTime: number): void {
    const now = Date.now();
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const building = this.buildings[i];

      if (building.hasShield) {
        building.shieldTimer -= deltaTime;
        if (building.shieldTimer <= 0) {
          building.hasShield = false;
          building.shieldTimer = 0;
        }
      }

      if (building.isDamaged) {
        building.damageTimer -= deltaTime;
        if (building.damageTimer <= 0) {
          this.buildings.splice(i, 1);
          this.state.destroyedBuildings += 1;
          this.notifyStateChange();
          continue;
        }
      }

      if (building.type === 'plantation' && !building.isDamaged) {
        if (now - building.lastProduction >= 5000) {
          this.state.energy += 2;
          building.lastProduction = now;
          this.notifyStateChange();
        }
      }
    }
  }

  private spawnTideBeasts(deltaTime: number): void {
    this.tideBeastSpawnCooldown -= deltaTime;
    if (this.tideBeasts.length >= MAX_TIDE_BEASTS) return;
    if (this.tideBeastSpawnCooldown > 0) return;

    this.tideBeastSpawnCooldown = 2 + Math.random() * 2;

    const deepTiles = this.tileMap.getDeepTiles();
    if (deepTiles.length === 0) return;

    const edgeTiles = deepTiles.filter(t => {
      const adjacent = this.tileMap.getAdjacentTiles(t.x, t.y, 1);
      return adjacent.some(a => a.terrain !== 'deep');
    });

    if (edgeTiles.length === 0) return;

    const spawnTile = edgeTiles[Math.floor(Math.random() * edgeTiles.length)];
    const center = this.tileMap.getTileCenter(spawnTile.x, spawnTile.y);

    let targetX = CANVAS_WIDTH / 2;
    let targetY = CANVAS_HEIGHT / 2;
    if (this.buildings.length > 0) {
      const target = this.buildings[Math.floor(Math.random() * this.buildings.length)];
      const targetCenter = this.tileMap.getTileCenter(target.x, target.y);
      targetX = targetCenter.x;
      targetY = targetCenter.y;
    }

    this.tideBeasts.push({
      id: this.nextBeastId++,
      x: center.x,
      y: center.y,
      radius: 12 + Math.random() * 4,
      targetX,
      targetY,
      speed: 30,
      dying: false,
      deathAnimation: 0,
    });
  }

  private updateTideBeasts(deltaTime: number): void {
    for (let i = this.tideBeasts.length - 1; i >= 0; i--) {
      const beast = this.tideBeasts[i];

      if (beast.dying) {
        beast.deathAnimation -= deltaTime;
        if (beast.deathAnimation <= 0) {
          this.tideBeasts.splice(i, 1);
        }
        continue;
      }

      let nearestBuilding: Building | null = null;
      let minDist = Infinity;
      for (const building of this.buildings) {
        if (building.isDamaged) continue;
        const bc = this.tileMap.getTileCenter(building.x, building.y);
        const dx = bc.x - beast.x;
        const dy = bc.y - beast.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearestBuilding = building;
        }
      }

      if (nearestBuilding) {
        const bc = this.tileMap.getTileCenter(nearestBuilding.x, nearestBuilding.y);
        beast.targetX = bc.x;
        beast.targetY = bc.y;
      }

      const dx = beast.targetX - beast.x;
      const dy = beast.targetY - beast.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        beast.x += (dx / dist) * beast.speed * deltaTime;
        beast.y += (dy / dist) * beast.speed * deltaTime;
      }
    }
  }

  private checkCollisions(): void {
    for (const beast of this.tideBeasts) {
      if (beast.dying) continue;

      for (const building of this.buildings) {
        if (building.isDamaged) continue;

        const bc = this.tileMap.getTileCenter(building.x, building.y);
        const dx = beast.x - bc.x;
        const dy = beast.y - bc.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (building.hasShield) {
          if (dist < beast.radius + 40) {
            beast.dying = true;
            beast.deathAnimation = 0.3;
          }
        } else {
          if (dist < beast.radius + 20) {
            if (!building.isDamaged) {
              building.isDamaged = true;
              building.damageTimer = DAMAGE_DURATION;
            }
            beast.dying = true;
            beast.deathAnimation = 0.3;
          }
        }
      }
    }
  }

  private checkGameOver(): void {
    if (this.state.destroyedBuildings >= MAX_DESTROYED && !this.state.gameOver) {
      this.state.gameOver = true;
      this.notifyStateChange();
    }
  }

  public handleClick(pixelX: number, pixelY: number): void {
    if (this.state.gameOver) return;

    for (const building of this.buildings) {
      if (building.isDamaged) continue;
      const bc = this.tileMap.getTileCenter(building.x, building.y);
      const dx = pixelX - bc.x;
      const dy = pixelY - bc.y;
      if (Math.sqrt(dx * dx + dy * dy) < TILE_SIZE / 2) {
        this.activateShield(building);
        return;
      }
    }

    for (const seaweed of this.seaweeds) {
      if (seaweed.collected) continue;
      const dx = pixelX - seaweed.x;
      const dy = pixelY - seaweed.y;
      if (Math.sqrt(dx * dx + dy * dy) < 12) {
        this.collectSeaweed(seaweed);
        return;
      }
    }

    if (this.state.selectedBuilding) {
      const tilePos = this.tileMap.getPixelToTile(pixelX, pixelY);
      if (tilePos) {
        this.placeBuilding(tilePos.x, tilePos.y);
      }
    }
  }

  private activateShield(building: Building): void {
    if (this.state.energy < SHIELD_COST) return;
    if (building.hasShield || building.isDamaged) return;

    this.state.energy -= SHIELD_COST;
    building.hasShield = true;
    building.shieldTimer = SHIELD_DURATION;
    this.notifyStateChange();
  }

  private collectSeaweed(seaweed: Seaweed): void {
    if (seaweed.collected) return;
    seaweed.collected = true;
    seaweed.collectAnimation = 0.3;
    seaweed.respawnTimer = SEAWEED_SPAWN_INTERVAL;
    this.state.energy += SEAWEED_ENERGY;
    this.state.score += SEAWEED_SCORE;
    this.notifyStateChange();
  }

  private placeBuilding(tileX: number, tileY: number): void {
    if (!this.state.selectedBuilding) return;

    const tile = this.tileMap.getTile(tileX, tileY);
    if (!tile || tile.terrain !== 'land') return;

    const occupied = this.buildings.some(b => b.x === tileX && b.y === tileY && !b.isDamaged);
    if (occupied) return;

    const config = BUILDING_CONFIGS[this.state.selectedBuilding];
    if (this.state.energy < config.cost) return;

    this.state.energy -= config.cost;
    this.buildings.push({
      id: `${this.state.selectedBuilding}-${Date.now()}-${Math.random()}`,
      type: this.state.selectedBuilding,
      x: tileX,
      y: tileY,
      isDamaged: false,
      damageTimer: 0,
      hasShield: false,
      shieldTimer: 0,
      lastProduction: Date.now(),
    });
    this.state.buildingsBuilt += 1;
    this.state.score += BUILDING_SCORE;
    this.notifyStateChange();
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.tileMap.render(ctx);

    if (this.state.warningActive) {
      this.renderWarning(ctx);
    }

    this.renderSeaweeds(ctx);
    this.renderBuildings(ctx);
    this.renderTideBeasts(ctx);
    this.renderSelectedBuildingPreview(ctx);
  }

  private renderWarning(ctx: CanvasRenderingContext2D): void {
    const offset = this.tileMap.getOffset();
    const flash = Math.sin(Date.now() / 100) > 0;
    if (flash) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      ctx.fillRect(offset.x, offset.y, this.tileMap.width * TILE_SIZE, this.tileMap.height * TILE_SIZE);
    }
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#FF6B6B';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ 潮汐预警 ⚠', CANVAS_WIDTH / 2, 40);
  }

  private renderSeaweeds(ctx: CanvasRenderingContext2D): void {
    for (const seaweed of this.seaweeds) {
      if (!seaweed.collected) {
        ctx.save();
        ctx.shadowColor = '#00FF88';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#00FF88';
        ctx.beginPath();
        ctx.arc(seaweed.x, seaweed.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (seaweed.spawnAnimation > 0 && !seaweed.collected) {
        const progress = 1 - seaweed.spawnAnimation / 0.5;
        const radius = 40 * progress;
        const alpha = 0.8 * (1 - progress);
        ctx.save();
        ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(seaweed.x, seaweed.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (seaweed.collectAnimation > 0) {
        const progress = 1 - seaweed.collectAnimation / 0.3;
        const radius = 8 + 20 * progress;
        const alpha = 1 - progress;
        ctx.save();
        ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.beginPath();
        ctx.arc(seaweed.x, seaweed.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private renderBuildings(ctx: CanvasRenderingContext2D): void {
    for (const building of this.buildings) {
      const center = this.tileMap.getTileCenter(building.x, building.y);
      ctx.save();

      if (building.isDamaged) {
        const flash = Math.sin(Date.now() / 80) > 0;
        if (flash) {
          ctx.globalAlpha = 0.7;
        }
      }

      const damagedColor = building.isDamaged ? '#FF4444' : null;

      switch (building.type) {
        case 'seawall':
          ctx.fillStyle = damagedColor || '#888888';
          ctx.fillRect(center.x - 10, center.y - 30, 20, 60);
          ctx.strokeStyle = '#555555';
          ctx.lineWidth = 2;
          ctx.strokeRect(center.x - 10, center.y - 30, 20, 60);
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#666666';
            ctx.fillRect(center.x - 8, center.y - 25 + i * 18, 16, 2);
          }
          break;

        case 'watchtower':
          ctx.fillStyle = damagedColor || '#1B5E20';
          ctx.beginPath();
          ctx.moveTo(center.x, center.y - 25);
          ctx.lineTo(center.x + 20, center.y + 25);
          ctx.lineTo(center.x - 20, center.y + 25);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#0D3D11';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = damagedColor || '#2E7D32';
          ctx.fillRect(center.x - 6, center.y - 10, 12, 12);
          ctx.fillStyle = '#FFEB3B';
          ctx.beginPath();
          ctx.arc(center.x, center.y - 4, 3, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'plantation':
          ctx.fillStyle = damagedColor || '#D4A76A';
          ctx.fillRect(center.x - 30, center.y - 20, 60, 40);
          ctx.strokeStyle = '#8B6914';
          ctx.lineWidth = 2;
          ctx.strokeRect(center.x - 30, center.y - 20, 60, 40);
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 2; j++) {
              ctx.fillStyle = '#4CAF50';
              ctx.beginPath();
              ctx.arc(
                center.x - 22 + i * 15,
                center.y - 12 + j * 20,
                3,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }
          break;
      }

      if (building.hasShield) {
        const shieldProgress = building.shieldTimer / SHIELD_DURATION;
        const alpha = 0.5 + Math.sin(Date.now() / 50) * 0.1;
        ctx.save();
        ctx.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
        ctx.fillStyle = `rgba(0, 200, 255, ${0.15 * shieldProgress})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 40, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private renderTideBeasts(ctx: CanvasRenderingContext2D): void {
    for (const beast of this.tideBeasts) {
      ctx.save();
      if (beast.dying) {
        const progress = 1 - beast.deathAnimation / 0.3;
        ctx.fillStyle = `rgba(0, 255, 100, ${1 - progress})`;
        ctx.shadowColor = '#00FF64';
        ctx.shadowBlur = 20 * (1 - progress);
        ctx.beginPath();
        ctx.arc(beast.x, beast.y, beast.radius * (1 + progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#0A2463';
        ctx.shadowColor = '#1E3A5F';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(beast.x, beast.y, beast.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(beast.x - 4, beast.y - 2, 3, 0, Math.PI * 2);
        ctx.arc(beast.x + 4, beast.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderSelectedBuildingPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.state.selectedBuilding) return;

    ctx.save();
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    const config = BUILDING_CONFIGS[this.state.selectedBuilding];
    ctx.fillText(
      `已选择: ${config.name} (消耗 ${config.cost} 能量) - 点击陆地放置`,
      10,
      CANVAS_HEIGHT - 15
    );
    ctx.restore();
  }
}
