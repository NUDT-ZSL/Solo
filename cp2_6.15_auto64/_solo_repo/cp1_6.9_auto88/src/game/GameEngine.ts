import { Tower } from './Tower';
import { Miner } from './Miner';
import { ParticleSystem } from './ParticleSystem';
import { TowerType, TOWER_CONFIGS, PathPoint, CELL_SIZE, GRID_SIZE } from './types';

export interface GameState {
  gold: number;
  hp: number;
  wave: number;
  minerCount: number;
  gameOver: boolean;
  waveInProgress: boolean;
  nextWaveTimer: number;
  selectedTowerType: TowerType | null;
  selectedPlacedTower: Tower | null;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private gridCols: number;
  private gridRows: number;

  public towers: Tower[] = [];
  public miners: Miner[] = [];
  public particles: ParticleSystem;
  public state: GameState;

  private path: PathPoint[] = [];
  private pathGridCells: Set<string> = new Set();
  private towerGridCells: Map<string, Tower> = new Map();

  private waveSpawnQueue: number = 0;
  private waveSpawnTimer: number = 0;
  private time: number = 0;
  private audioContext: AudioContext | null = null;
  private arcEffects: Array<{ x1: number; y1: number; x2: number; y2: number; t1: Tower; t2: Tower }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.gridCols = Math.floor(this.width / CELL_SIZE);
    this.gridRows = Math.floor(this.height / CELL_SIZE);

    this.particles = new ParticleSystem();
    this.state = {
      gold: 200,
      hp: 100,
      wave: 0,
      minerCount: 0,
      gameOver: false,
      waveInProgress: false,
      nextWaveTimer: 30,
      selectedTowerType: null,
      selectedPlacedTower: null,
    };

    this.generatePath();
  }

  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx;
    Miner.setAudioContext(ctx);
  }

  ensureAudio(): void {
    if (this.audioContext === null) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        this.setAudioContext(audioCtx);
      } catch { /* ignore */ }
    }
  }

  getPath(): PathPoint[] {
    return this.path;
  }

  private generatePath(): void {
    this.path = [];
    this.pathGridCells.clear();

    const waypoints: { gx: number; gy: number }[] = [
      { gx: 0, gy: Math.floor(this.gridRows * 0.3) },
      { gx: Math.floor(this.gridCols * 0.25), gy: Math.floor(this.gridRows * 0.3) },
      { gx: Math.floor(this.gridCols * 0.25), gy: Math.floor(this.gridRows * 0.7) },
      { gx: Math.floor(this.gridCols * 0.5), gy: Math.floor(this.gridRows * 0.7) },
      { gx: Math.floor(this.gridCols * 0.5), gy: Math.floor(this.gridRows * 0.2) },
      { gx: Math.floor(this.gridCols * 0.75), gy: Math.floor(this.gridRows * 0.2) },
      { gx: Math.floor(this.gridCols * 0.75), gy: Math.floor(this.gridRows * 0.8) },
      { gx: this.gridCols - 1, gy: Math.floor(this.gridRows * 0.8) },
    ];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const steps = Math.abs(b.gx - a.gx) + Math.abs(b.gy - a.gy);
      for (let s = 0; s <= steps; s++) {
        const t = steps === 0 ? 0 : s / steps;
        const gx = Math.round(a.gx + (b.gx - a.gx) * t);
        const gy = Math.round(a.gy + (b.gy - a.gy) * t);
        this.pathGridCells.add(`${gx},${gy}`);
        this.path.push({
          x: gx * CELL_SIZE + CELL_SIZE / 2,
          y: gy * CELL_SIZE + CELL_SIZE / 2,
        });
      }
    }
  }

  canPlaceTower(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= this.gridCols || gridY < 0 || gridY >= this.gridRows) return false;
    if (this.pathGridCells.has(`${gridX},${gridY}`)) return false;
    if (this.towerGridCells.has(`${gridX},${gridY}`)) return false;
    return true;
  }

  placeTower(type: TowerType, gridX: number, gridY: number): boolean {
    const config = TOWER_CONFIGS[type];
    if (this.state.gold < config.cost) return false;
    if (!this.canPlaceTower(gridX, gridY)) return false;

    const tower = new Tower(type, gridX, gridY);
    this.towers.push(tower);
    this.towerGridCells.set(`${gridX},${gridY}`, tower);
    this.state.gold -= config.cost;
    this.rebuildArcEffects();
    return true;
  }

  upgradeTower(tower: Tower): boolean {
    if (!tower.canUpgrade()) return false;
    const cost = tower.getUpgradeCost();
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    tower.upgrade();
    this.rebuildArcEffects();
    return true;
  }

  sellTower(tower: Tower): void {
    const idx = this.towers.indexOf(tower);
    if (idx >= 0) {
      this.towers.splice(idx, 1);
      this.towerGridCells.delete(`${tower.state.gridX},${tower.state.gridY}`);
      const refund = Math.floor(tower.getConfig().cost * 0.6);
      this.state.gold += refund;
      if (this.state.selectedPlacedTower === tower) {
        this.state.selectedPlacedTower = null;
      }
      this.rebuildArcEffects();
    }
  }

  private rebuildArcEffects(): void {
    this.arcEffects = [];
    for (let i = 0; i < this.towers.length; i++) {
      for (let j = i + 1; j < this.towers.length; j++) {
        const t1 = this.towers[i];
        const t2 = this.towers[j];
        if (t1.state.type !== t2.state.type && t1.isAdjacent(t2)) {
          this.arcEffects.push({
            x1: t1.state.x, y1: t1.state.y,
            x2: t2.state.x, y2: t2.state.y,
            t1, t2,
          });
        }
      }
    }
  }

  selectTowerType(type: TowerType | null): void {
    this.state.selectedTowerType = type;
    if (type !== null && this.state.selectedPlacedTower) {
      this.state.selectedPlacedTower.setSelected(false);
      this.state.selectedPlacedTower = null;
    }
  }

  handleCanvasClick(x: number, y: number): void {
    if (this.state.gameOver) return;

    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    const cellKey = `${gridX},${gridY}`;

    const existingTower = this.towerGridCells.get(cellKey);
    if (existingTower) {
      if (this.state.selectedPlacedTower) {
        this.state.selectedPlacedTower.setSelected(false);
      }
      this.state.selectedPlacedTower = existingTower;
      existingTower.setSelected(true);
      this.state.selectedTowerType = null;
      return;
    }

    if (this.state.selectedTowerType) {
      if (this.placeTower(this.state.selectedTowerType, gridX, gridY)) {
        void 0;
      }
      return;
    }

    if (this.state.selectedPlacedTower) {
      this.state.selectedPlacedTower.setSelected(false);
      this.state.selectedPlacedTower = null;
    }
  }

  getGridPos(x: number, y: number): { gridX: number; gridY: number } {
    return {
      gridX: Math.floor(x / CELL_SIZE),
      gridY: Math.floor(y / CELL_SIZE),
    };
  }

  private startNextWave(): void {
    this.state.wave++;
    this.state.waveInProgress = true;
    this.waveSpawnQueue = Math.min(6 + (this.state.wave - 1) * 2, 20);
    this.waveSpawnTimer = 0;
    this.state.nextWaveTimer = 30;
  }

  public startWaveNow(): void {
    if (this.state.gameOver) return;
    if (!this.state.waveInProgress) {
      this.startNextWave();
    }
  }

  private spawnMiner(): void {
    if (this.path.length === 0) return;
    const start = this.path[0];
    const miner = new Miner({ x: start.x - 30, y: start.y });
    this.miners.push(miner);
    this.state.minerCount = this.miners.length;
  }

  private updateMiners(dt: number): void {
    for (let i = this.miners.length - 1; i >= 0; i--) {
      const miner = this.miners[i];
      miner.update(dt, this.path, this.time);

      if (miner.hasReachedEnd(this.path)) {
        this.state.hp = Math.max(0, this.state.hp - 5);
        this.miners.splice(i, 1);
        continue;
      }

      if (miner.state.dead) {
        const gold = miner.getGoldReward();
        this.state.gold += gold;
        this.particles.spawnExplosion(miner.position, 12 + Math.floor(Math.random() * 7));
        this.miners.splice(i, 1);
      }
    }
    this.state.minerCount = this.miners.length;
  }

  private updateCollisions(dt: number): void {
    void dt;
    const cellMap = new Map<string, Miner[]>();
    const hashSize = 40;

    for (const miner of this.miners) {
      const cx = Math.floor(miner.state.x / hashSize);
      const cy = Math.floor(miner.state.y / hashSize);
      const key = `${cx},${cy}`;
      if (!cellMap.has(key)) cellMap.set(key, []);
      cellMap.get(key)!.push(miner);
    }

    const checked = new Set<number>();
    for (const miner of this.miners) {
      const cx = Math.floor(miner.state.x / hashSize);
      const cy = Math.floor(miner.state.y / hashSize);
      const neighbors: Miner[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const arr = cellMap.get(`${cx + dx},${cy + dy}`);
          if (arr) neighbors.push(...arr);
        }
      }

      for (const other of neighbors) {
        if (other === miner) continue;
        const pairKey = Math.min(miner.state.id, other.state.id) * 100000 + Math.max(miner.state.id, other.state.id);
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const dx = other.state.x - miner.state.x;
        const dy = other.state.y - miner.state.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20 && dist > 0.01) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = 20 - dist;
          const totalMass = miner.state.mass + other.state.mass;
          miner.state.x -= nx * overlap * (other.state.mass / totalMass);
          miner.state.y -= ny * overlap * (other.state.mass / totalMass);
          other.state.x += nx * overlap * (miner.state.mass / totalMass);
          other.state.y += ny * overlap * (miner.state.mass / totalMass);

          const rvx = other.state.vx - miner.state.vx;
          const rvy = other.state.vy - miner.state.vy;
          const velAlongNormal = rvx * nx + rvy * ny;
          if (velAlongNormal > 0) continue;

          const e = 0.8;
          const j = -(1 + e) * velAlongNormal / (1 / miner.state.mass + 1 / other.state.mass);
          const ix = j * nx;
          const iy = j * ny;
          miner.state.vx -= ix / miner.state.mass;
          miner.state.vy -= iy / miner.state.mass;
          other.state.vx += ix / other.state.mass;
          other.state.vy += iy / other.state.mass;

          miner.state.vx *= 0.8;
          miner.state.vy *= 0.8;
          other.state.vx *= 0.8;
          other.state.vy *= 0.8;

          const impactForce = Math.sqrt(ix * ix + iy * iy);
          const minerLowHp = miner.shouldShatter();
          const otherLowHp = other.shouldShatter();

          if (impactForce > 30) {
            if (minerLowHp && !miner.state.dead) {
              miner.shatter(this.particles);
              miner.applyDamage(9999);
            }
            if (otherLowHp && !other.state.dead) {
              other.shatter(this.particles);
              other.applyDamage(9999);
            }
          }
        }
      }
    }

    for (const miner of this.miners) {
      if (miner.state.dead) continue;
      for (const tower of this.towers) {
        const tdx = miner.state.x - tower.state.x;
        const tdy = miner.state.y - tower.state.y;
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
        if (tdist < 22) {
          miner.slowForTowerHit();
          const nx = tdx / Math.max(0.1, tdist);
          const ny = tdy / Math.max(0.1, tdist);
          miner.state.x += nx * (22 - tdist);
          miner.state.y += ny * (22 - tdist);
        }
      }
    }
  }

  private updateTowers(dt: number): void {
    for (const tower of this.towers) {
      tower.update(dt);
      tower.applyEffect(this.miners, dt);
    }
  }

  private updateArcEffects(dt: number): void {
    for (const arc of this.arcEffects) {
      for (const miner of this.miners) {
        if (miner.state.dead) continue;
        const dist = this.pointToSegmentDistance(
          miner.state.x, miner.state.y,
          arc.x1, arc.y1, arc.x2, arc.y2
        );
        if (dist < 18) {
          miner.applyArcDamage(8, dt);
        }
      }
    }
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const ex = px - x1;
      const ey = py - y1;
      return Math.sqrt(ex * ex + ey * ey);
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const ex = px - closestX;
    const ey = py - closestY;
    return Math.sqrt(ex * ex + ey * ey);
  }

  update(dt: number): void {
    if (this.state.gameOver) return;
    this.time += dt;

    if (!this.state.waveInProgress) {
      this.state.nextWaveTimer -= dt;
      if (this.state.nextWaveTimer <= 0) {
        this.startNextWave();
      }
    } else {
      this.waveSpawnTimer -= dt;
      if (this.waveSpawnQueue > 0 && this.waveSpawnTimer <= 0) {
        this.spawnMiner();
        this.waveSpawnQueue--;
        this.waveSpawnTimer = 0.8;
      }
      if (this.waveSpawnQueue <= 0 && this.miners.length === 0) {
        this.state.waveInProgress = false;
        this.state.nextWaveTimer = 30;
      }
    }

    this.updateTowers(dt);
    this.updateMiners(dt);
    this.updateCollisions(dt);
    this.updateArcEffects(dt);
    this.particles.update(dt);

    if (this.state.hp <= 0) {
      this.state.gameOver = true;
    }
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0B0C2A');
    bgGrad.addColorStop(1, '#1E1A3A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.gridCols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, h);
      ctx.stroke();
    }
    for (let y = 0; y <= this.gridRows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(w, y * CELL_SIZE);
      ctx.stroke();
    }
    ctx.restore();

    this.renderPath();
    this.renderCrystal();
    this.renderArcEffects();

    for (const tower of this.towers) {
      tower.render(ctx, this.time);
    }
    for (const miner of this.miners) {
      miner.render(ctx, this.time);
    }
    this.particles.render(ctx);

    if (this.state.gameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FF4466';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#FF4466';
      ctx.shadowBlur = 20;
      ctx.fillText('游戏结束', w / 2, h / 2 - 30);
      ctx.fillStyle = '#fff';
      ctx.font = '24px sans-serif';
      ctx.fillText(`坚持到第 ${this.state.wave} 波`, w / 2, h / 2 + 20);
      ctx.restore();
    }
  }

  private renderPath(): void {
    const ctx = this.ctx;
    if (this.path.length < 2) return;

    ctx.save();
    ctx.shadowColor = '#FF8844';
    ctx.shadowBlur = 20 * 0.3;
    ctx.strokeStyle = '#FF8844';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -this.time * 30;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) {
      ctx.lineTo(this.path[i].x, this.path[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderCrystal(): void {
    const ctx = this.ctx;
    if (this.path.length === 0) return;
    const end = this.path[this.path.length - 1];
    const pulse = 1 + Math.sin(this.time * 3) * 0.15;
    const hpRatio = this.state.hp / 100;

    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = hpRatio > 0.3 ? '#44DDFF' : '#FF4466';
    ctx.shadowBlur = 30;

    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(14, -5);
    ctx.lineTo(10, 18);
    ctx.lineTo(-10, 18);
    ctx.lineTo(-14, -5);
    ctx.closePath();

    const crystalGrad = ctx.createLinearGradient(0, -20, 0, 18);
    if (hpRatio > 0.3) {
      crystalGrad.addColorStop(0, '#88FFFF');
      crystalGrad.addColorStop(0.5, '#4488FF');
      crystalGrad.addColorStop(1, '#2244AA');
    } else {
      crystalGrad.addColorStop(0, '#FFAAAA');
      crystalGrad.addColorStop(0.5, '#FF4466');
      crystalGrad.addColorStop(1, '#882233');
    }
    ctx.fillStyle = crystalGrad;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-3, -15);
    ctx.lineTo(2, -8);
    ctx.lineTo(0, 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private renderArcEffects(): void {
    const ctx = this.ctx;
    const blinkPhase = Math.floor(this.time * 3) % 2;
    if (blinkPhase === 0) {
      for (const arc of this.arcEffects) {
        ctx.save();
        const grad = ctx.createLinearGradient(arc.x1, arc.y1, arc.x2, arc.y2);
        grad.addColorStop(0, '#00FFAA');
        grad.addColorStop(1, '#FF44AA');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00FFAA';
        ctx.shadowBlur = 15;

        const mx = (arc.x1 + arc.x2) / 2;
        const my = (arc.y1 + arc.y2) / 2;
        const jitterX = (Math.random() - 0.5) * 12;
        const jitterY = (Math.random() - 0.5) * 12;

        ctx.beginPath();
        ctx.moveTo(arc.x1, arc.y1);
        ctx.quadraticCurveTo(mx + jitterX, my + jitterY, arc.x2, arc.y2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
