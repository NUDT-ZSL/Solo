export const GameEvents = {
  ENERGY_UPDATE: 'energy:update',
  TIMER_UPDATE: 'timer:update',
  GAME_OVER: 'game:over',
  MINION_DEVOURED: 'minion:devoured',
  HEX_SPLIT: 'hex:split',
  RIFT_START: 'rift:start',
  RIFT_END: 'rift:end'
} as const;

export type EventCallback = (data: unknown) => void;

export interface HexCell {
  id: number;
  q: number;
  r: number;
  cx: number;
  cy: number;
  vertices: { x: number; y: number }[];
  splitEdges: boolean[];
  split: boolean;
}

export interface Minion {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alive: boolean;
  devoured: boolean;
}

export interface EnergyShard {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  floatOffset: number;
}

export interface RiftPoint {
  x: number;
  y: number;
  width: number;
  speed: number;
}

export interface GameConfig {
  width: number;
  height: number;
  hexSize: number;
  gameDuration: number;
  initialEnergy: number;
  energyDecayRate: number;
  energyGainPerMinion: number;
  minionSpawnInterval: number;
  coreRadius: number;
  minionRadius: number;
  energyShardRadius: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export interface DevourRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export interface HexParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface ScoreParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export class GameEngine {
  private config: GameConfig;
  private listeners: Map<string, EventCallback[]> = new Map();
  private hexGrid: HexCell[] = [];
  private minions: Minion[] = [];
  private shards: EnergyShard[] = [];
  private ripples: Ripple[] = [];
  private devourRings: DevourRing[] = [];
  private hexParticles: HexParticle[] = [];
  private scoreParticles: ScoreParticle[] = [];

  private coreX: number = 0;
  private coreY: number = 0;
  private corePulseTime: number = 0;
  private coreBrightness: number = 1;
  private energy: number = 100;
  private maxEnergy: number = 100;
  private gameTime: number = 0;
  private timeRemaining: number = 120;
  private minionSpawnTimer: number = 0;
  private energyDecayAccumulator: number = 0;
  private devouredCount: number = 0;
  private isGameOver: boolean = false;
  private isRunning: boolean = false;

  private riftActive: boolean = false;
  private riftPoints: RiftPoint[] = [];
  private lastRiftPointTime: number = 0;
  private splitHexIds: Set<number> = new Set();
  private nextMinionId: number = 1;
  private nextShardId: number = 1;

  constructor(config: GameConfig) {
    this.config = config;
    this.maxEnergy = config.initialEnergy;
    this.generateHexGrid();
    this.placeCore();
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: unknown = null): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getHexGrid(): HexCell[] {
    return this.hexGrid;
  }

  getMinions(): Minion[] {
    return this.minions;
  }

  getShards(): EnergyShard[] {
    return this.shards;
  }

  getRipples(): Ripple[] {
    return this.ripples;
  }

  getDevourRings(): DevourRing[] {
    return this.devourRings;
  }

  getHexParticles(): HexParticle[] {
    return this.hexParticles;
  }

  getScoreParticles(): ScoreParticle[] {
    return this.scoreParticles;
  }

  getCorePosition(): { x: number; y: number } {
    return { x: this.coreX, y: this.coreY };
  }

  getCorePulseTime(): number {
    return this.corePulseTime;
  }

  getCoreBrightness(): number {
    return this.coreBrightness;
  }

  isLowEnergy(): boolean {
    return this.energy < 20;
  }

  getEnergy(): number {
    return this.energy;
  }

  getMaxEnergy(): number {
    return this.maxEnergy;
  }

  getRiftPoints(): RiftPoint[] {
    return this.riftPoints;
  }

  isRiftActive(): boolean {
    return this.riftActive;
  }

  getGameOver(): boolean {
    return this.isGameOver;
  }

  getDevouredCount(): number {
    return this.devouredCount;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  private generateHexGrid(): void {
    const size = this.config.hexSize;
    const w = this.config.width;
    const h = this.config.height;
    const hexW = size * Math.sqrt(3);
    const hexH = size * 1.5;
    const cols = Math.ceil(w / hexW) + 2;
    const rows = Math.ceil(h / hexH) + 2;
    let id = 0;

    const offsetX = (w - cols * hexW) / 2 + hexW / 2;
    const offsetY = (h - rows * hexH) / 2 + hexH / 2;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const q = col - Math.floor(row / 2);
        const r = row;
        const cx = offsetX + col * hexW + (row % 2 === 1 ? hexW / 2 : 0);
        const cy = offsetY + row * hexH;

        if (cx < -size || cx > w + size || cy < -size || cy > h + size) {
          continue;
        }

        const vertices: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          vertices.push({
            x: cx + size * Math.cos(angle),
            y: cy + size * Math.sin(angle)
          });
        }

        this.hexGrid.push({
          id: id++,
          q,
          r,
          cx,
          cy,
          vertices,
          splitEdges: [false, false, false, false, false, false],
          split: false
        });

        if (this.hexGrid.length >= 50) {
          return;
        }
      }
    }
  }

  private placeCore(): void {
    this.coreX = this.config.width / 2;
    this.coreY = this.config.height / 2;
  }

  start(): void {
    this.isRunning = true;
  }

  reset(): void {
    this.hexGrid = [];
    this.minions = [];
    this.shards = [];
    this.ripples = [];
    this.devourRings = [];
    this.hexParticles = [];
    this.scoreParticles = [];
    this.energy = this.config.initialEnergy;
    this.maxEnergy = this.config.initialEnergy;
    this.gameTime = 0;
    this.timeRemaining = this.config.gameDuration;
    this.minionSpawnTimer = 0;
    this.energyDecayAccumulator = 0;
    this.devouredCount = 0;
    this.isGameOver = false;
    this.isRunning = false;
    this.riftActive = false;
    this.riftPoints = [];
    this.splitHexIds.clear();
    this.coreBrightness = 1;
    this.nextMinionId = 1;
    this.nextShardId = 1;
    this.generateHexGrid();
    this.placeCore();
    this.emit(GameEvents.ENERGY_UPDATE, {
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      lowEnergy: false
    });
    this.emit(GameEvents.TIMER_UPDATE, { remaining: this.timeRemaining });
    this.isRunning = true;
  }

  startRift(x: number, y: number): boolean {
    if (this.isGameOver || this.energy <= 0) return false;
    const dx = x - this.coreX;
    const dy = y - this.coreY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.config.coreRadius + 10) return false;

    this.riftActive = true;
    this.riftPoints = [{ x, y, width: 8, speed: 0 }];
    this.lastRiftPointTime = performance.now();
    this.splitHexIds.clear();
    this.addRipple(this.coreX, this.coreY);
    this.emit(GameEvents.RIFT_START, { x, y });
    return true;
  }

  extendRift(x: number, y: number): void {
    if (!this.riftActive || this.isGameOver) return;
    const last = this.riftPoints[this.riftPoints.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 3) return;

    const now = performance.now();
    const dt = Math.max(1, now - this.lastRiftPointTime);
    const speed = (dist / dt) * 1000;
    this.lastRiftPointTime = now;

    const width = Math.max(5, Math.min(15, 5 + speed / 80));
    this.riftPoints.push({ x, y, width, speed });

    this.checkHexSplits(last.x, last.y, x, y);
    this.checkMinionCollisions(last.x, last.y, x, y, width);
  }

  endRift(): void {
    if (!this.riftActive) return;
    this.riftActive = false;
    this.riftPoints = [];
    this.emit(GameEvents.RIFT_END, null);
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 20,
      maxRadius: 60,
      life: 800,
      maxLife: 800
    });
  }

  private checkHexSplits(x1: number, y1: number, x2: number, y2: number): void {
    for (const hex of this.hexGrid) {
      if (this.splitHexIds.has(hex.id)) continue;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const fx = x1 - hex.cx;
      const fy = y1 - hex.cy;
      const a = dx * dx + dy * dy;
      const b = 2 * (fx * dx + fy * dy);
      const c = fx * fx + fy * fy - (this.config.hexSize + 8) * (this.config.hexSize + 8);
      let discriminant = b * b - 4 * a * c;
      if (discriminant < 0) continue;
      discriminant = Math.sqrt(discriminant);
      const t1 = (-b - discriminant) / (2 * a);
      const t2 = (-b + discriminant) / (2 * a);
      if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1)) {
        this.splitHex(hex);
        this.splitHexIds.add(hex.id);
      }
    }
  }

  private splitHex(hex: HexCell): void {
    hex.split = true;
    const particleCount = 20 + Math.floor(Math.random() * 11);
    for (let i = 0; i < particleCount; i++) {
      if (this.hexParticles.length >= 200) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      this.hexParticles.push({
        x: hex.cx + (Math.random() - 0.5) * this.config.hexSize,
        y: hex.cy + (Math.random() - 0.5) * this.config.hexSize,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: 1500,
        maxLife: 1500,
        color: '#DDA0DD'
      });
    }
    this.emit(GameEvents.HEX_SPLIT, { hex });
  }

  private checkMinionCollisions(x1: number, y1: number, x2: number, y2: number, width: number): void {
    for (const m of this.minions) {
      if (!m.alive || m.devoured) continue;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      let t = 0;
      if (len2 > 0) {
        t = ((m.x - x1) * dx + (m.y - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
      }
      const closestX = x1 + t * dx;
      const closestY = y1 + t * dy;
      const distX = m.x - closestX;
      const distY = m.y - closestY;
      const dist = Math.sqrt(distX * distX + distY * distY);
      if (dist < m.radius + width / 2) {
        this.devourMinion(m);
      }
    }
  }

  private devourMinion(minion: Minion): void {
    minion.devoured = true;
    minion.alive = false;
    this.devouredCount++;
    this.energy = Math.min(this.maxEnergy, this.energy + this.config.energyGainPerMinion);
    this.coreBrightness = Math.min(2, this.coreBrightness + 0.05);

    this.shards.push({
      id: this.nextShardId++,
      x: minion.x,
      y: minion.y,
      radius: this.config.energyShardRadius,
      life: 3000,
      maxLife: 3000,
      floatOffset: Math.random() * Math.PI * 2
    });

    this.devourRings.push({
      x: minion.x,
      y: minion.y,
      radius: 0,
      maxRadius: 40,
      life: 500,
      maxLife: 500
    });

    this.emit(GameEvents.MINION_DEVOURED, { minion, count: this.devouredCount });
    this.emitEnergyUpdate();
  }

  private spawnMinion(): void {
    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number;
    const margin = 30;
    switch (edge) {
      case 0:
        x = Math.random() * this.config.width;
        y = margin;
        break;
      case 1:
        x = this.config.width - margin;
        y = Math.random() * this.config.height;
        break;
      case 2:
        x = Math.random() * this.config.width;
        y = this.config.height - margin;
        break;
      default:
        x = margin;
        y = Math.random() * this.config.height;
        break;
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 10;
    this.minions.push({
      id: this.nextMinionId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: this.config.minionRadius,
      alive: true,
      devoured: false
    });
  }

  private emitEnergyUpdate(): void {
    this.emit(GameEvents.ENERGY_UPDATE, {
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      lowEnergy: this.isLowEnergy()
    });
  }

  triggerScoreExplosion(): void {
    const cx = this.config.width / 2;
    const cy = this.config.height / 2;
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      this.scoreParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        life: 2000 + Math.random() * 1000,
        maxLife: 3000,
        color: Math.random() > 0.5 ? '#FFD700' : '#FF00FF'
      });
    }
  }

  update(dt: number): void {
    if (!this.isRunning || this.isGameOver) return;

    const sec = dt / 1000;
    this.gameTime += dt;
    this.timeRemaining -= sec;

    const pulsePeriod = this.isLowEnergy() ? 1000 : 2000;
    this.corePulseTime = (this.corePulseTime + dt) % pulsePeriod;

    if (this.timeRemaining <= 0 || this.energy <= 0) {
      this.endGame();
      return;
    }

    this.emit(GameEvents.TIMER_UPDATE, { remaining: this.timeRemaining });

    this.energyDecayAccumulator += dt;
    if (this.energyDecayAccumulator >= 1000) {
      const seconds = Math.floor(this.energyDecayAccumulator / 1000);
      this.energy = Math.max(0, this.energy - this.config.energyDecayRate * seconds);
      this.energyDecayAccumulator -= seconds * 1000;
      this.emitEnergyUpdate();
    }

    this.minionSpawnTimer += dt;
    if (this.minionSpawnTimer >= this.config.minionSpawnInterval) {
      this.minionSpawnTimer = 0;
      this.spawnMinion();
    }

    for (const m of this.minions) {
      if (!m.alive) continue;
      m.x += m.vx * sec;
      m.y += m.vy * sec;
      if (m.x < m.radius || m.x > this.config.width - m.radius) {
        m.vx *= -1;
        m.x = Math.max(m.radius, Math.min(this.config.width - m.radius, m.x));
      }
      if (m.y < m.radius || m.y > this.config.height - m.radius) {
        m.vy *= -1;
        m.y = Math.max(m.radius, Math.min(this.config.height - m.radius, m.y));
      }
    }

    this.minions = this.minions.filter(m => m.alive);

    for (const s of this.shards) {
      s.life -= dt;
    }
    this.shards = this.shards.filter(s => s.life > 0);

    for (const r of this.ripples) {
      r.life -= dt;
      r.radius = r.maxRadius * (1 - r.life / r.maxLife) + 20;
    }
    this.ripples = this.ripples.filter(r => r.life > 0);

    for (const d of this.devourRings) {
      d.life -= dt;
      d.radius = d.maxRadius * (1 - d.life / d.maxLife);
    }
    this.devourRings = this.devourRings.filter(d => d.life > 0);

    for (const p of this.hexParticles) {
      p.life -= dt;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    this.hexParticles = this.hexParticles.filter(p => p.life > 0);

    for (const p of this.scoreParticles) {
      p.life -= dt;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
      p.vy += 80 * sec;
      p.vx *= 0.98;
    }
    this.scoreParticles = this.scoreParticles.filter(p => p.life > 0);
  }

  private endGame(): void {
    this.isGameOver = true;
    this.isRunning = false;
    this.timeRemaining = Math.max(0, this.timeRemaining);
    const score = this.devouredCount * 100 + Math.floor(this.energy) * 2;
    this.emit(GameEvents.GAME_OVER, {
      score,
      devoured: this.devouredCount,
      remainingEnergy: this.energy
    });
  }
}
