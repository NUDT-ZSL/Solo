import {
  LightCocoon, Worm, Ray, Particle, SilkThread, Vortex,
  CocoonColor, WormColor, Vec2,
  COCOON_COLORS, WORM_COLORS,
  GRID_COLS, GRID_ROWS, CELL_SIZE, LOGICAL_W, LOGICAL_H,
  MAX_COCOONS, MAX_PARTICLES, SILK_DISTANCE, CRYSTAL_RADIUS, TOTAL_WAVES,
  COCOON_COST, UPGRADE_COSTS
} from './entities';

import {
  clearAndDrawBackground, drawGrid, drawCrystal,
  drawCocoon, drawWorm, drawRay, drawParticle, drawSilk, drawVortex,
  RenderContext
} from './renderer';

export interface GameState {
  score: number;
  lives: number;
  wave: number;
  waveActive: boolean;
  gameOver: boolean;
  victory: boolean;
}

export interface EngineCallbacks {
  onStateChange: (state: GameState) => void;
}

const RAY_BASE_DAMAGE = 5;

function computeDamageMultiplier(cocoonColor: CocoonColor, wormColor: WormColor): number {
  if (wormColor === 'gold') return 1.0;
  if (cocoonColor === wormColor) return 0.8;
  if (cocoonColor === 'red' && wormColor === 'green') return 1.5;
  if (cocoonColor === 'green' && wormColor === 'blue') return 1.5;
  if (cocoonColor === 'blue' && wormColor === 'red') return 1.5;
  return 1.0;
}

export class GameEngine {
  private cocoons: LightCocoon[] = [];
  private worms: Worm[] = [];
  private rays: Ray[] = [];
  private particles: Particle[] = [];
  private silks: SilkThread[] = [];
  private vortex: Vortex;
  private gridOccupancy: Map<string, number> = new Map();
  private state: GameState;
  private callbacks: EngineCallbacks;
  private time: number = 0;
  private waveTimer: number = 0;
  private waveSpawnQueue: number = 0;
  private waveSpawnTimer: number = 0;
  private silkRecalcTimer: number = 0;
  private initialWaveDelay: number = 4;
  private started: boolean = false;

  public hoverCell: { col: number; row: number } | null = null;
  public selectedCocoonId: number | null = null;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.vortex = new Vortex();
    this.state = {
      score: 100,
      lives: 10,
      wave: 0,
      waveActive: false,
      gameOver: false,
      victory: false
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  start() {
    this.started = true;
  }

  reset() {
    this.cocoons = [];
    this.worms = [];
    this.rays = [];
    this.particles = [];
    this.silks = [];
    this.vortex = new Vortex();
    this.gridOccupancy.clear();
    this.time = 0;
    this.waveTimer = 0;
    this.waveSpawnQueue = 0;
    this.waveSpawnTimer = 0;
    this.silkRecalcTimer = 0;
    this.initialWaveDelay = 4;
    this.hoverCell = null;
    this.selectedCocoonId = null;
    this.state = {
      score: 100,
      lives: 10,
      wave: 0,
      waveActive: false,
      gameOver: false,
      victory: false
    };
    this.started = true;
    this.emitState();
  }

  canPlaceCocoon(col: number, row: number): boolean {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    if (this.cocoons.length >= MAX_COCOONS) return false;
    if (this.gridOccupancy.has(`${col},${row}`)) return false;
    if (this.state.score < COCOON_COST) return false;
    if (this.state.gameOver) return false;

    const cellCenterX = col * CELL_SIZE + CELL_SIZE / 2;
    const cellCenterY = row * CELL_SIZE + CELL_SIZE / 2;
    const cx = LOGICAL_W / 2;
    const cy = LOGICAL_H / 2;
    if (Math.hypot(cellCenterX - cx, cellCenterY - cy) < CRYSTAL_RADIUS + 8) return false;

    return true;
  }

  placeCocoon(col: number, row: number, color: CocoonColor): boolean {
    if (!this.canPlaceCocoon(col, row)) return false;
    const position = { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 };
    const cocoon = new LightCocoon(position, color, { col, row });
    this.cocoons.push(cocoon);
    this.gridOccupancy.set(`${col},${row}`, cocoon.id);
    this.state.score -= COCOON_COST;
    this.selectedCocoonId = cocoon.id;
    this.emitState();
    return true;
  }

  getCocoonAt(col: number, row: number): LightCocoon | null {
    const id = this.gridOccupancy.get(`${col},${row}`);
    if (!id) return null;
    return this.cocoons.find(c => c.id === id) ?? null;
  }

  findCocoonAtLogical(x: number, y: number): LightCocoon | null {
    for (const cocoon of this.cocoons) {
      if (Math.hypot(cocoon.position.x - x, cocoon.position.y - y) < 14) {
        return cocoon;
      }
    }
    return null;
  }

  getCocoonById(id: number): LightCocoon | null {
    return this.cocoons.find(c => c.id === id) ?? null;
  }

  upgradeCocoon(id: number): boolean {
    const cocoon = this.getCocoonById(id);
    if (!cocoon || cocoon.level >= 3) return false;
    const cost = UPGRADE_COSTS[cocoon.level];
    if (this.state.score < cost) return false;
    if (!cocoon.upgrade()) return false;
    this.state.score -= cost;
    this.emitState();
    return true;
  }

  getUpgradeCost(id: number): number | null {
    const cocoon = this.getCocoonById(id);
    if (!cocoon || cocoon.level >= 3) return null;
    return UPGRADE_COSTS[cocoon.level];
  }

  cellFromLogical(x: number, y: number): { col: number; row: number } {
    return {
      col: Math.floor(x / CELL_SIZE),
      row: Math.floor(y / CELL_SIZE)
    };
  }

  setHoverCell(cell: { col: number; row: number } | null) {
    this.hoverCell = cell;
  }

  update(dt: number) {
    if (!this.started || this.state.gameOver) return;

    this.time += dt;

    this.updateWaves(dt);
    this.updateSpawn(dt);
    this.updateCocoons(dt);
    this.fireRays();
    this.updateRays(dt);
    this.updateWorms(dt);
    this.checkSilkRecalc(dt);
    this.updateSilks(dt);
    this.checkSilkCollisions();
    this.updateParticles(dt);
    this.vortex.update(dt, this.cocoons.length);

    if (this.cocoons.length >= 5 && this.silks.length > 0) {
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number) {
    const rc: RenderContext = {
      ctx,
      time: this.time,
      scale,
      hoverCell: this.hoverCell,
      selectedCocoonId: this.selectedCocoonId
    };

    clearAndDrawBackground(rc);
    drawGrid(rc);
    drawVortex(rc, this.vortex);

    for (const silk of this.silks) {
      drawSilk(rc, silk);
    }

    drawCrystal(rc);

    for (const cocoon of this.cocoons) {
      drawCocoon(rc, cocoon);
    }

    for (const ray of this.rays) {
      drawRay(rc, ray);
    }

    for (const worm of this.worms) {
      if (!worm.dead && !worm.reachedCrystal) {
        drawWorm(rc, worm);
      }
    }

    for (const particle of this.particles) {
      drawParticle(rc, particle);
    }
  }

  private updateWaves(dt: number) {
    if (this.state.victory) return;

    if (this.initialWaveDelay > 0) {
      this.initialWaveDelay -= dt;
      if (this.initialWaveDelay <= 0) {
        this.triggerNextWave();
      }
      return;
    }

    if (!this.state.waveActive) {
      this.waveTimer += dt;
      if (this.waveTimer >= 15) {
        this.waveTimer = 0;
        this.triggerNextWave();
      }
    } else {
      if (this.waveSpawnQueue === 0 && this.worms.length === 0) {
        this.state.waveActive = false;
        if (this.state.wave >= TOTAL_WAVES) {
          this.state.victory = true;
          this.state.gameOver = true;
          this.emitState();
        }
      }
    }
  }

  private triggerNextWave() {
    if (this.state.wave >= TOTAL_WAVES) return;
    this.state.wave++;
    this.state.waveActive = true;
    this.waveSpawnQueue = 10 + Math.floor(Math.random() * 11);
    this.waveSpawnTimer = 0;
    this.emitState();
  }

  private updateSpawn(dt: number) {
    if (this.waveSpawnQueue <= 0) return;
    this.waveSpawnTimer -= dt;
    if (this.waveSpawnTimer <= 0) {
      this.spawnWorm();
      this.waveSpawnQueue--;
      this.waveSpawnTimer = 0.3 + Math.random() * 0.5;
    }
  }

  private spawnWorm() {
    const side = Math.floor(Math.random() * 4);
    let pos: Vec2;
    switch (side) {
      case 0: pos = { x: 40 + Math.random() * (LOGICAL_W - 80), y: -5 }; break;
      case 1: pos = { x: 40 + Math.random() * (LOGICAL_W - 80), y: LOGICAL_H + 5 }; break;
      case 2: pos = { x: -5, y: 40 + Math.random() * (LOGICAL_H - 80) }; break;
      default: pos = { x: LOGICAL_W + 5, y: 40 + Math.random() * (LOGICAL_H - 80) }; break;
    }

    const rand = Math.random();
    let color: WormColor;
    if (rand < 0.33) color = 'red';
    else if (rand < 0.66) color = 'green';
    else if (rand < 0.99) color = 'blue';
    else color = 'gold';

    const waveMultiplier = 1 + 0.1 * (this.state.wave - 1);
    this.worms.push(new Worm(pos, color, waveMultiplier));
  }

  private updateCocoons(dt: number) {
    for (const cocoon of this.cocoons) {
      cocoon.update(dt);
    }
  }

  private fireRays() {
    for (const cocoon of this.cocoons) {
      if (this.time - cocoon.lastFireTime >= cocoon.stats.fireInterval) {
        cocoon.lastFireTime = this.time;
        this.fireRayFromCocoon(cocoon);
      }
    }
  }

  private fireRayFromCocoon(cocoon: LightCocoon) {
    let nearestWorm: Worm | null = null;
    let nearestDist = cocoon.stats.rayLength;
    for (const worm of this.worms) {
      if (worm.dead || worm.reachedCrystal) continue;
      const d = Math.hypot(worm.position.x - cocoon.position.x, worm.position.y - cocoon.position.y);
      if (d <= nearestDist) {
        nearestDist = d;
        nearestWorm = worm;
      }
    }

    let targetX: number, targetY: number;
    if (nearestWorm) {
      targetX = nearestWorm.position.x;
      targetY = nearestWorm.position.y;
    } else {
      const angle = Math.random() * Math.PI * 2;
      targetX = cocoon.position.x + Math.cos(angle) * cocoon.stats.rayLength;
      targetY = cocoon.position.y + Math.sin(angle) * cocoon.stats.rayLength;
    }

    const dx = targetX - cocoon.position.x;
    const dy = targetY - cocoon.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      const clamped = Math.min(dist, cocoon.stats.rayLength);
      const endX = cocoon.position.x + (dx / dist) * clamped;
      const endY = cocoon.position.y + (dy / dist) * clamped;
      const ray = new Ray(cocoon.position, { x: endX, y: endY }, cocoon.color);
      this.rays.push(ray);
      this.checkRayHits(ray, cocoon);
    }
  }

  private checkRayHits(ray: Ray, owner: LightCocoon) {
    for (const worm of this.worms) {
      if (worm.dead || worm.reachedCrystal) continue;
      if (ray.hitWorms.has(worm.id)) continue;
      const dist = pointToSegmentDistance(worm.position, ray.start, ray.end);
      const hitRadius = worm.isElite ? 9 : 6;
      if (dist <= hitRadius + 1) {
        ray.hitWorms.add(worm.id);
        const mult = computeDamageMultiplier(owner.color, worm.color);
        const damage = RAY_BASE_DAMAGE * mult;
        worm.takeDamage(damage);
        worm.applySlow();
        worm.applyHitFlash();
        this.spawnHitParticles(worm.position, owner.color);
        if (worm.dead) {
          this.state.score += worm.isElite ? 50 : 10;
          this.emitState();
        }
      }
    }
  }

  private updateRays(dt: number) {
    for (const ray of this.rays) {
      ray.update(dt);
    }
    this.rays = this.rays.filter(r => !r.isDead);
  }

  private updateWorms(dt: number) {
    const cx = LOGICAL_W / 2;
    const cy = LOGICAL_H / 2;
    for (const worm of this.worms) {
      if (worm.dead || worm.reachedCrystal) continue;
      worm.update(dt);
      const d = Math.hypot(worm.position.x - cx, worm.position.y - cy);
      if (d < CRYSTAL_RADIUS + 2) {
        worm.reachedCrystal = true;
        this.state.lives--;
        this.emitState();
        if (this.state.lives <= 0) {
          this.state.lives = 0;
          this.state.gameOver = true;
          this.emitState();
        }
      }
    }
    this.worms = this.worms.filter(w => !w.dead && !w.reachedCrystal);
  }

  private checkSilkRecalc(dt: number) {
    this.silkRecalcTimer -= dt;
    if (this.silkRecalcTimer <= 0) {
      this.silkRecalcTimer = 0.25;
      this.recomputeSilks();
    }
  }

  private recomputeSilks() {
    const map = new Map<string, SilkThread>();
    for (let i = 0; i < this.cocoons.length; i++) {
      for (let j = i + 1; j < this.cocoons.length; j++) {
        const a = this.cocoons[i];
        const b = this.cocoons[j];
        const d = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
        if (d <= SILK_DISTANCE) {
          const key = `${Math.min(a.id, b.id)}_${Math.max(a.id, b.id)}`;
          let existing = this.silks.find(s => s.fromCocoonId === Math.min(a.id, b.id) && s.toCocoonId === Math.max(a.id, b.id));
          if (!existing) {
            existing = new SilkThread(a.id < b.id ? a : b, a.id < b.id ? b : a);
          } else {
            existing.from = a.position;
            existing.to = b.position;
            existing.level = Math.max(a.level, b.level);
          }
          map.set(key, existing);
        }
      }
    }
    this.silks = Array.from(map.values());
  }

  private updateSilks(dt: number) {
    for (const silk of this.silks) {
      silk.update(dt);
    }
  }

  private checkSilkCollisions() {
    for (const silk of this.silks) {
      for (const worm of this.worms) {
        if (worm.dead || worm.reachedCrystal) continue;
        const now = this.time;
        const lastHit = silk.hitWorms.get(worm.id);
        if (lastHit !== undefined && now - lastHit < 0.35) continue;
        const dist = pointToSegmentDistance(worm.position, silk.from, silk.to);
        const hitR = worm.isElite ? 9 : 6;
        if (dist <= hitR + 1) {
          silk.hitWorms.set(worm.id, now);
          worm.takeDamage(10);
          worm.applyHitFlash();
          this.spawnHitParticles(worm.position, worm.color === 'gold' ? 'gold' : 'silk');
          if (worm.dead) {
            this.state.score += worm.isElite ? 50 : 10;
            this.emitState();
          }
        }
      }
    }
  }

  private updateParticles(dt: number) {
    for (const particle of this.particles) {
      particle.update(dt);
    }
    this.particles = this.particles.filter(p => !p.isDead);
  }

  private spawnHitParticles(position: Vec2, colorKey: CocoonColor | 'gold' | 'silk') {
    let color: string;
    if (colorKey === 'gold') color = WORM_COLORS.gold;
    else if (colorKey === 'silk') color = '#AAFFCC';
    else color = COCOON_COLORS[colorKey];

    const count = 8;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dir = { x: Math.cos(a), y: Math.sin(a) };
      const speed = 200 / 0.3 * 0.3;
      const radius = 2 + Math.random() * 2;
      const p = new Particle(position, dir, color, speed, radius, 0.3);
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      this.particles.push(p);
    }
  }

  private emitState() {
    this.callbacks.onStateChange({ ...this.state });
  }
}

function pointToSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}
