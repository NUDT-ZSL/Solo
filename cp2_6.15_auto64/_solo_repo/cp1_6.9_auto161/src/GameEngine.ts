import {
  GRID_SIZE,
  CRYSTAL_ENERGY_HATCH,
  SPRITE_ENERGY_RAGE,
  SPRITE_RAGE_DURATION,
  RESONANCE_DURATION,
  RESONANCE_ENERGY_GAIN,
  ENERGY_POINT_DURATION,
  ENERGY_POINT_SPAWN_INTERVAL,
  SPRITE_MOVE_INTERVAL,
  SPRITE_RAGE_MOVE_INTERVAL,
  HOSTILE_PAIRS,
  MAX_PARTICLES,
  COLOR_HEX,
  type CrystalColor,
  type GridCell,
  type Crystal,
  type Sprite,
  type SpriteState,
  type EnergyPoint,
  type Particle,
  type ResonanceLine,
  type ScreenShake,
  type GameStats,
  type RenderData,
  type TrailPoint
} from './types';

let idCounter = 1;
const nextId = () => idCounter++;

export class GameEngine {
  private grid: GridCell[][] = [];
  private crystals: Crystal[] = [];
  private sprites: Sprite[] = [];
  private energyPoints: EnergyPoint[] = [];
  private particles: Particle[] = [];
  private resonanceLines: ResonanceLine[] = [];
  private screenShake: ScreenShake = { active: false, until: 0, intensity: 0 };
  private lastEnergyPointSpawn: number = 0;
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
    this.initGrid();
  }

  private initGrid(): void {
    this.grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowArr: GridCell[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        rowArr.push({ row, col, crystal: null, energyPoint: null });
      }
      this.grid.push(rowArr);
    }
  }

  public placeCrystal(row: number, col: number, color: CrystalColor): boolean {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
    const cell = this.grid[row][col];
    if (cell.crystal) return false;

    const now = performance.now();
    const crystal: Crystal = {
      id: nextId(),
      color,
      row,
      col,
      energy: 0,
      placedAt: now,
      glowUntil: 0,
      resonanceUntil: 0,
      resonancePartners: []
    };

    cell.crystal = crystal;
    this.crystals.push(crystal);
    this.checkResonance(crystal, now);
    this.addPlacementParticles(crystal);
    return true;
  }

  private checkResonance(crystal: Crystal, now: number): void {
    const neighbors = this.getNeighborCrystals(crystal.row, crystal.col);
    for (const neighbor of neighbors) {
      const isSame = neighbor.color === crystal.color;
      const isComplementary =
        crystal.color === 'red' && neighbor.color === 'yellow' ||
        crystal.color === 'yellow' && neighbor.color === 'red' ||
        crystal.color === 'blue' && neighbor.color === 'red' ||
        crystal.color === 'red' && neighbor.color === 'blue' ||
        crystal.color === 'blue' && neighbor.color === 'yellow' ||
        crystal.color === 'yellow' && neighbor.color === 'blue';

      if (isSame || isComplementary) {
        crystal.energy += RESONANCE_ENERGY_GAIN;
        neighbor.energy += RESONANCE_ENERGY_GAIN;
        crystal.resonanceUntil = now + RESONANCE_DURATION;
        neighbor.resonanceUntil = now + RESONANCE_DURATION;
        crystal.resonancePartners.push(neighbor.id);
        neighbor.resonancePartners.push(crystal.id);

        this.resonanceLines.push({
          id: nextId(),
          fromRow: crystal.row,
          fromCol: crystal.col,
          toRow: neighbor.row,
          toCol: neighbor.col,
          expiresAt: now + RESONANCE_DURATION,
          color: crystal.color
        });
      }
    }
  }

  private getNeighborCrystals(row: number, col: number): Crystal[] {
    const result: Crystal[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          const cell = this.grid[nr][nc];
          if (cell.crystal) result.push(cell.crystal);
        }
      }
    }
    return result;
  }

  private addPlacementParticles(crystal: Crystal): void {
    const now = performance.now();
    const cx = crystal.col;
    const cy = crystal.row;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.pushParticle({
        id: nextId(),
        x: cx,
        y: cy,
        vx: Math.cos(angle) * 0.03,
        vy: Math.sin(angle) * 0.03,
        life: 400,
        maxLife: 400,
        size: 4,
        color: COLOR_HEX[crystal.color],
        type: 'debris'
      });
    }
  }

  private pushParticle(p: Particle): void {
    this.particles.push(p);
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  private spawnEnergyPoint(now: number): void {
    const emptyCells: { row: number; col: number }[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        if (!cell.crystal && !cell.energyPoint) {
          emptyCells.push({ row, col });
        }
      }
    }
    if (emptyCells.length === 0) return;
    const pos = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const ep: EnergyPoint = {
      id: nextId(),
      row: pos.row,
      col: pos.col,
      spawnedAt: now,
      expiresAt: now + ENERGY_POINT_DURATION
    };
    this.grid[pos.row][pos.col].energyPoint = ep;
    this.energyPoints.push(ep);
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    if (now - this.lastEnergyPointSpawn >= ENERGY_POINT_SPAWN_INTERVAL) {
      this.spawnEnergyPoint(now);
      this.lastEnergyPointSpawn = now;
    }

    this.updateSprites(deltaTime, now);

    this.updateParticles(deltaTime);

    this.energyPoints = this.energyPoints.filter(ep => {
      if (now >= ep.expiresAt) {
        this.grid[ep.row][ep.col].energyPoint = null;
        return false;
      }
      return true;
    });

    this.resonanceLines = this.resonanceLines.filter(rl => now < rl.expiresAt);

    if (this.screenShake.active && now >= this.screenShake.until) {
      this.screenShake.active = false;
    }

    for (const crystal of this.crystals) {
      if (crystal.energy >= CRYSTAL_ENERGY_HATCH) {
        this.hatchSprite(crystal, now);
      }
    }
  }

  private hatchSprite(crystal: Crystal, now: number): void {
    const sprite: Sprite = {
      id: nextId(),
      color: crystal.color,
      row: crystal.row,
      col: crystal.col,
      energy: 5,
      state: 'normal',
      moveTimer: 0,
      moveInterval: SPRITE_MOVE_INTERVAL,
      rageUntil: 0,
      flashUntil: 0,
      trail: [],
      bobPhase: Math.random() * Math.PI * 2,
      auraPhase: 0
    };
    this.sprites.push(sprite);

    this.grid[crystal.row][crystal.col].crystal = null;
    this.crystals = this.crystals.filter(c => c.id !== crystal.id);

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.pushParticle({
        id: nextId(),
        x: crystal.col,
        y: crystal.row,
        vx: Math.cos(angle) * 0.05,
        vy: Math.sin(angle) * 0.05,
        life: 600,
        maxLife: 600,
        size: 5,
        color: COLOR_HEX[crystal.color],
        type: 'debris'
      });
    }
  }

  private updateSprites(deltaTime: number, now: number): void {
    for (const sprite of this.sprites) {
      sprite.bobPhase += deltaTime * 0.005;
      sprite.auraPhase += deltaTime * 0.004;

      if (sprite.state === 'rage') {
        sprite.auraPhase += deltaTime * 0.006;
        if (now >= sprite.rageUntil) {
          sprite.state = 'normal';
          sprite.energy = Math.max(0, sprite.energy - 30);
          sprite.moveInterval = SPRITE_MOVE_INTERVAL;
        }
      }

      sprite.moveTimer += deltaTime;
      if (sprite.moveTimer >= sprite.moveInterval) {
        sprite.moveTimer = 0;
        this.moveSprite(sprite, now);
      }

      if (sprite.energy >= SPRITE_ENERGY_RAGE && sprite.state === 'normal') {
        sprite.state = 'rage';
        sprite.rageUntil = now + SPRITE_RAGE_DURATION;
        sprite.moveInterval = SPRITE_RAGE_MOVE_INTERVAL;
      }

      if (sprite.state === 'rage') {
        const haloAngle = (now / 1000) % (Math.PI * 2);
        for (let i = 0; i < 8; i++) {
          const a = haloAngle + (Math.PI * 2 * i) / 8;
          this.pushParticle({
            id: nextId(),
            x: sprite.col + Math.cos(a) * 0.2,
            y: sprite.row + Math.sin(a) * 0.2,
            vx: 0,
            vy: 0,
            life: 100,
            maxLife: 100,
            size: 3,
            color: COLOR_HEX[sprite.color],
            type: 'halo',
            angle: a,
            radius: 0.2
          });
        }
      }
    }

    this.sprites = this.sprites.filter(s => s.energy > 0 || s.state === 'rage' || true);
  }

  private moveSprite(sprite: Sprite, now: number): void {
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    const validDirs = directions.filter(d => {
      const nr = sprite.row + d.dr;
      const nc = sprite.col + d.dc;
      return nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE;
    });

    if (validDirs.length === 0) return;

    const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
    const newRow = sprite.row + dir.dr;
    const newCol = sprite.col + dir.dc;

    const trailPoint: TrailPoint = {
      row: sprite.row,
      col: sprite.col,
      time: now
    };
    sprite.trail.push(trailPoint);
    if (sprite.trail.length > 3) sprite.trail.shift();

    for (let i = 0; i < 3; i++) {
      this.pushParticle({
        id: nextId(),
        x: sprite.col,
        y: sprite.row,
        vx: (newCol - sprite.col) * 0.01 + (Math.random() - 0.5) * 0.01,
        vy: (newRow - sprite.row) * 0.01 + (Math.random() - 0.5) * 0.01,
        life: 200,
        maxLife: 200,
        size: 3,
        color: COLOR_HEX[sprite.color],
        type: 'trail'
      });
    }

    sprite.row = newRow;
    sprite.col = newCol;

    const cell = this.grid[newRow][newCol];

    if (cell.energyPoint) {
      this.collectEnergyPoint(sprite, cell, now);
    }

    if (cell.crystal) {
      if (cell.crystal.color === sprite.color) {
        this.feedFriendlyCrystal(sprite, cell, now);
      } else if (HOSTILE_PAIRS[sprite.color] === cell.crystal.color) {
        this.eatHostileCrystal(sprite, cell, now);
      }
    }
  }

  private collectEnergyPoint(sprite: Sprite, cell: GridCell, now: number): void {
    if (!cell.energyPoint) return;
    sprite.energy += 3;
    sprite.flashUntil = now + 200;
    this.energyPoints = this.energyPoints.filter(ep => ep.id !== cell.energyPoint!.id);
    cell.energyPoint = null;

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.pushParticle({
        id: nextId(),
        x: sprite.col,
        y: sprite.row,
        vx: Math.cos(angle) * 0.04,
        vy: Math.sin(angle) * 0.04,
        life: 300,
        maxLife: 300,
        size: 4,
        color: '#ffffff',
        type: 'debris'
      });
    }
  }

  private feedFriendlyCrystal(sprite: Sprite, cell: GridCell, now: number): void {
    if (!cell.crystal) return;
    cell.crystal.energy = Math.min(CRYSTAL_ENERGY_HATCH, cell.crystal.energy + 2);
    cell.crystal.glowUntil = now + 500;
  }

  private eatHostileCrystal(sprite: Sprite, cell: GridCell, now: number): void {
    if (!cell.crystal) return;
    const gain = sprite.state === 'rage' ? 10 : 5;
    sprite.energy += gain;

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      this.pushParticle({
        id: nextId(),
        x: cell.col,
        y: cell.row,
        vx: Math.cos(angle) * 0.06,
        vy: Math.sin(angle) * 0.06,
        life: 500,
        maxLife: 500,
        size: 5,
        color: COLOR_HEX[cell.crystal.color],
        type: 'debris'
      });
    }

    this.screenShake = {
      active: true,
      until: now + 100,
      intensity: 5
    };

    this.crystals = this.crystals.filter(c => c.id !== cell.crystal!.id);
    cell.crystal = null;
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime / 16.67;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  public getRenderData(): RenderData {
    const now = performance.now();
    let topSprite: Sprite | null = null;
    for (const s of this.sprites) {
      if (!topSprite || s.energy > topSprite.energy) {
        topSprite = s;
      }
    }

    const stats: GameStats = {
      crystalCount: this.crystals.length,
      spriteCount: this.sprites.length,
      topSpriteEnergy: topSprite ? topSprite.energy : 0,
      topSpriteState: topSprite ? topSprite.state : 'normal',
      topSpriteColor: topSprite ? topSprite.color : null
    };

    return {
      grid: this.grid,
      crystals: this.crystals,
      sprites: this.sprites,
      energyPoints: this.energyPoints,
      particles: this.particles,
      resonanceLines: this.resonanceLines,
      screenShake: this.screenShake,
      stats,
      now
    };
  }
}
