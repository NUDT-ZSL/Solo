import {
  BackgroundParticle,
  CellEntityData,
  CellType,
  GameEngineCallbacks,
  GameState,
  SplitRipple,
  Vec2
} from './types';
import {
  applyEnemyAI,
  applyFollowerBoids,
  applyPlayerMovement,
  canSplit,
  createEnemyCell,
  createNutrient,
  createPlayerCell,
  growFromEat
} from './CellEntity';
import { EvolutionTree } from './EvolutionTree';

const MAX_ENTITIES = 30;
const ENEMY_SPAWN_INTERVAL = 10;
const ENERGY_TO_SPLIT = 5;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  private cells: CellEntityData[] = [];
  private selectedCellId: string | null = null;
  private mouseTarget: Vec2 = { x: 0, y: 0 };

  private evolutionTree: EvolutionTree;
  private splitRipples: SplitRipple[] = [];
  private backgroundParticles: BackgroundParticle[] = [];

  private state: GameState;
  private startTime: number = 0;
  private lastFrameTime: number = 0;
  private enemySpawnTimer: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number = 0;

  private audioCtx: AudioContext | null = null;

  private scanRingAngle: number = 0;
  private glowPulsePhase: number = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.evolutionTree = new EvolutionTree();
    this.state = {
      status: 'playing',
      score: 0,
      survivalTime: 0,
      selectedCellId: null,
      playerCells: [],
      enemySpawnTimer: 0
    };
    this.init();
  }

  private init(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.startTime = performance.now();
    this.mouseTarget = { x: w * 0.4, y: h * 0.5 };

    const initial = createPlayerCell(w * 0.4, h * 0.5, 0);
    this.cells.push(initial);
    this.selectedCellId = initial.id;
    this.evolutionTree.addCell(initial);
    this.state.selectedCellId = initial.id;
    this.state.playerCells = [initial.id];

    for (let i = 0; i < 5; i++) {
      const nx = w * 0.2 + Math.random() * w * 0.6;
      const ny = h * 0.2 + Math.random() * h * 0.6;
      this.cells.push(createNutrient(nx, ny, 0));
    }

    this.initBackgroundParticles();
    this.emitState();
    this.emitSelectedCell();
  }

  private initBackgroundParticles(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.backgroundParticles = [];
    for (let i = 0; i < 1000; i++) {
      this.backgroundParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 1 + Math.random() * 1,
        baseAlpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }

  private emitState(): void {
    this.callbacks.onStateChange({ ...this.state });
  }

  private emitSelectedCell(): void {
    const cell = this.cells.find(c => c.id === this.selectedCellId) ?? null;
    this.callbacks.onSelectedCellChange(cell);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.initBackgroundParticles();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  setMouseTarget(x: number, y: number): void {
    this.mouseTarget.x = x;
    this.mouseTarget.y = y;
  }

  selectCellAt(x: number, y: number): boolean {
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const c = this.cells[i];
      if (c.cellType !== CellType.PLAYER) continue;
      const dx = x - c.position.x;
      const dy = y - c.position.y;
      if (dx * dx + dy * dy <= (c.radius + 4) * (c.radius + 4)) {
        this.setSelectedCell(c.id);
        return true;
      }
    }
    return false;
  }

  setSelectedCell(id: string): void {
    this.cells = this.cells.map(c => ({
      ...c,
      isSelected: c.id === id
    }));
    this.selectedCellId = id;
    this.state.selectedCellId = id;
    this.emitState();
    this.emitSelectedCell();
  }

  triggerSplit(): void {
    const selected = this.cells.find(c => c.id === this.selectedCellId);
    if (!selected || selected.cellType !== CellType.PLAYER || !canSplit(selected)) return;

    const gameTime = (performance.now() - this.startTime) / 1000;
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;
    const baseX = selected.position.x;
    const baseY = selected.position.y;

    this.splitRipples.push({
      x: baseX,
      y: baseY,
      hue: selected.hue,
      radius: 10,
      maxRadius: 80,
      alpha: 0.8,
      startTime: performance.now(),
      duration: 600
    });
    this.playSplitSound();

    const newCells: CellEntityData[] = [];
    const idToRemove = selected.id;

    this.evolutionTree.markDeath(idToRemove, gameTime);

    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const child = createPlayerCell(
        baseX + Math.cos(angle) * 12,
        baseY + Math.sin(angle) * 12,
        gameTime,
        selected
      );
      child.isSelected = i === 0;
      child.velocity.x = Math.cos(angle) * 80;
      child.velocity.y = Math.sin(angle) * 80;
      if (child.targetPosition) {
        child.targetPosition.x = baseX + offsetX + i * 15;
        child.targetPosition.y = baseY + offsetY + (i - 0.5) * 15;
      }
      newCells.push(child);
      this.evolutionTree.addCell(child);
    }

    this.cells = [
      ...this.cells.filter(c => c.id !== idToRemove),
      ...newCells
    ];

    this.selectedCellId = newCells[0].id;
    this.state.selectedCellId = this.selectedCellId;
    this.state.playerCells = this.cells
      .filter(c => c.cellType === CellType.PLAYER)
      .map(c => c.id);

    this.emitState();
    this.emitSelectedCell();
  }

  private playEatSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // ignore
    }
  }

  private playSplitSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.38);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch {
      // ignore
    }
  }

  private spawnEnemies(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const count = 3 + Math.floor(Math.random() * 3);
    const gameTime = (performance.now() - this.startTime) / 1000;

    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;
      switch (edge) {
        case 0: x = Math.random() * w; y = -20; break;
        case 1: x = w + 20; y = Math.random() * h; break;
        case 2: x = Math.random() * w; y = h + 20; break;
        default: x = -20; y = Math.random() * h; break;
      }
      this.cells.push(createEnemyCell(x, y, gameTime));
    }

    this.enforceEntityLimit();
  }

  private enforceEntityLimit(): void {
    const enemies = this.cells.filter(c => c.cellType === CellType.ENEMY);
    const others = this.cells.filter(c => c.cellType !== CellType.ENEMY);
    const budget = MAX_ENTITIES - others.length;
    if (enemies.length > budget) {
      const sortedEnemies = enemies.slice().sort((a, b) => a.birthTime - b.birthTime);
      const toRemove = sortedEnemies.slice(0, enemies.length - budget).map(e => e.id);
      this.cells = [...others, ...sortedEnemies.slice(enemies.length - budget)].filter(
        c => !toRemove.includes(c.id)
      );
    }
  }

  private checkCollisions(): void {
    const gameTime = (performance.now() - this.startTime) / 1000;
    type Pair = [CellEntityData, CellEntityData];
    const pairs: Pair[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      for (let j = i + 1; j < this.cells.length; j++) {
        const a = this.cells[i];
        const b = this.cells[j];
        if (a.cellType === CellType.PLAYER && b.cellType === CellType.PLAYER) continue;
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const r = a.radius + b.radius;
        if (dx * dx + dy * dy < r * r) {
          pairs.push([a, b]);
        }
      }
    }

    const consumed = new Set<string>();
    for (const [a, b] of pairs) {
      if (consumed.has(a.id) || consumed.has(b.id)) continue;

      const aEats = a.radius > b.radius * 1.1 && this.isPredator(a, b);
      const bEats = b.radius > a.radius * 1.1 && this.isPredator(b, a);

      if (aEats) {
        consumed.add(b.id);
        const idx = this.cells.findIndex(c => c.id === a.id);
        if (idx >= 0) {
          this.cells[idx] = growFromEat(this.cells[idx], b);
          if (a.cellType === CellType.PLAYER) {
            this.state.score++;
            this.playEatSound();
          }
        }
        if (b.cellType === CellType.PLAYER) {
          this.evolutionTree.markDeath(b.id, gameTime);
        }
      } else if (bEats) {
        consumed.add(a.id);
        const idx = this.cells.findIndex(c => c.id === b.id);
        if (idx >= 0) {
          this.cells[idx] = growFromEat(this.cells[idx], a);
          if (b.cellType === CellType.PLAYER) {
            this.state.score++;
            this.playEatSound();
          }
        }
        if (a.cellType === CellType.PLAYER) {
          this.evolutionTree.markDeath(a.id, gameTime);
        }
      }
    }

    if (consumed.size > 0) {
      this.cells = this.cells.filter(c => !consumed.has(c.id));
      this.state.playerCells = this.cells
        .filter(c => c.cellType === CellType.PLAYER)
        .map(c => c.id);

      if (this.selectedCellId && !this.state.playerCells.includes(this.selectedCellId)) {
        this.selectedCellId = this.state.playerCells[0] ?? null;
        this.state.selectedCellId = this.selectedCellId;
        this.cells = this.cells.map(c => ({ ...c, isSelected: c.id === this.selectedCellId }));
        this.emitSelectedCell();
      }

      this.emitState();
    }
  }

  private isPredator(predator: CellEntityData, prey: CellEntityData): boolean {
    if (predator.cellType === CellType.PLAYER) {
      return prey.cellType === CellType.ENEMY || prey.cellType === CellType.NUTRIENT;
    }
    if (predator.cellType === CellType.ENEMY) {
      return prey.cellType === CellType.PLAYER || prey.cellType === CellType.NUTRIENT;
    }
    return false;
  }

  private checkGameOver(): void {
    const playerCells = this.cells.filter(c => c.cellType === CellType.PLAYER);
    if (playerCells.length === 0 && this.state.status === 'playing') {
      this.state.status = 'gameover';
      this.emitState();
      setTimeout(() => {
        const root = this.evolutionTree.getRoot();
        if (root) this.callbacks.onGameOver(root);
      }, 600);
    }
  }

  private update(dt: number): void {
    if (this.state.status !== 'playing') return;

    const now = performance.now();
    this.state.survivalTime = (now - this.startTime) / 1000;
    this.enemySpawnTimer += dt;

    if (this.enemySpawnTimer >= ENEMY_SPAWN_INTERVAL) {
      this.enemySpawnTimer = 0;
      this.spawnEnemies();
      this.emitState();
    }

    const w = this.canvas.width;
    const h = this.canvas.height;

    const selectedCell = this.cells.find(c => c.id === this.selectedCellId);
    const playerCells = this.cells.filter(c => c.cellType === CellType.PLAYER);
    const enemies = this.cells.filter(c => c.cellType === CellType.ENEMY);

    this.cells = this.cells.map(cell => {
      if (cell.cellType === CellType.PLAYER) {
        if (cell.id === this.selectedCellId) {
          return applyPlayerMovement(cell, this.mouseTarget, dt);
        } else if (selectedCell) {
          return applyFollowerBoids(cell, playerCells, selectedCell, dt, w, h);
        }
      } else if (cell.cellType === CellType.ENEMY) {
        return applyEnemyAI(cell, playerCells, dt, w, h);
      }
      return cell;
    });

    if (selectedCell) {
      const r = selectedCell.radius;
      if (selectedCell.position.x < r) this.mouseTarget.x = r;
      if (selectedCell.position.x > w - r) this.mouseTarget.x = w - r;
      if (selectedCell.position.y < r) this.mouseTarget.y = r;
      if (selectedCell.position.y > h - r) this.mouseTarget.y = h - r;
    }

    this.splitRipples = this.splitRipples.filter(rp => {
      const elapsed = (now - rp.startTime) / rp.duration;
      if (elapsed >= 1) return false;
      rp.radius = 10 + (rp.maxRadius - 10) * elapsed;
      rp.alpha = 0.8 * (1 - elapsed);
      return true;
    });

    this.scanRingAngle += dt * Math.PI * 4;
    this.glowPulsePhase += dt * Math.PI * 4;

    this.checkCollisions();
    this.checkGameOver();
    this.emitState();
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    this.renderBackgroundParticles();
    this.renderCellConnections();
    this.renderSplitRipples();
    this.renderCells();
    this.renderEdgeFade();
  }

  private renderBackgroundParticles(): void {
    const ctx = this.ctx;
    const now = performance.now() / 1000;
    ctx.save();
    for (const p of this.backgroundParticles) {
      const a = p.baseAlpha * (0.5 + 0.5 * Math.sin(now * p.speed + p.phase));
      ctx.fillStyle = `rgba(200, 220, 255, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderCellConnections(): void {
    const ctx = this.ctx;
    const playerCells = this.cells.filter(c => c.cellType === CellType.PLAYER);
    if (playerCells.length < 2) return;

    let cx = 0, cy = 0;
    for (const p of playerCells) {
      cx += p.position.x;
      cy += p.position.y;
    }
    cx /= playerCells.length;
    cy /= playerCells.length;

    let clustered = true;
    for (const p of playerCells) {
      const dx = p.position.x - cx;
      const dy = p.position.y - cy;
      if (dx * dx + dy * dy > 10000) { clustered = false; break; }
    }

    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < playerCells.length; i++) {
      for (let j = i + 1; j < playerCells.length; j++) {
        const a = playerCells[i];
        const b = playerCells[j];
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = clustered ? 0.3 : 0.08 + 0.12 * (1 - dist / 120);
          const hue = (a.hue + b.hue) * 0.5;
          ctx.strokeStyle = `hsla(${hue.toFixed(0)}, 85%, 65%, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.position.x, a.position.y);
          ctx.lineTo(b.position.x, b.position.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private renderSplitRipples(): void {
    const ctx = this.ctx;
    ctx.save();
    for (const rp of this.splitRipples) {
      const grad = ctx.createRadialGradient(rp.x, rp.y, rp.radius * 0.6, rp.x, rp.y, rp.radius);
      grad.addColorStop(0, `hsla(${rp.hue}, 90%, 70%, 0)`);
      grad.addColorStop(0.7, `hsla(${rp.hue}, 90%, 70%, ${(rp.alpha * 0.6).toFixed(3)})`);
      grad.addColorStop(1, `hsla(${rp.hue}, 90%, 70%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderCells(): void {
    const ctx = this.ctx;
    const now = performance.now();
    for (const cell of this.cells) {
      const glowR = cell.radius * 2.2;
      const grad = ctx.createRadialGradient(
        cell.position.x, cell.position.y, cell.radius * 0.3,
        cell.position.x, cell.position.y, glowR
      );
      const h = cell.hue.toFixed(0);
      const s = (cell.saturation * 100).toFixed(0);
      const l = (cell.lightness * 100).toFixed(0);

      grad.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, 0.9)`);
      grad.addColorStop(0.45, `hsla(${h}, ${s}%, ${l}%, 0.35)`);
      grad.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cell.position.x, cell.position.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
      ctx.beginPath();
      ctx.arc(cell.position.x, cell.position.y, cell.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${h}, 100%, 92%, 0.75)`;
      ctx.beginPath();
      ctx.arc(
        cell.position.x - cell.radius * 0.35,
        cell.position.y - cell.radius * 0.35,
        cell.radius * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      if (cell.isSelected) {
        const pulse = 0.5 + 0.5 * Math.sin(this.glowPulsePhase);
        ctx.strokeStyle = `hsla(${h}, 100%, 85%, ${(0.5 + 0.5 * pulse).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cell.position.x, cell.position.y, cell.radius + 4 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.translate(cell.position.x, cell.position.y);
        ctx.rotate(this.scanRingAngle);
        const scanHue = h;
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2;
          const rr = cell.radius + 10;
          ctx.strokeStyle = `hsla(${scanHue}, 90%, 70%, 0.35)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, rr, angle, angle + 0.4);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (cell.cellType === CellType.PLAYER && canSplit(cell)) {
        const blink = 0.5 + 0.5 * Math.sin(now * 0.008);
        ctx.strokeStyle = `hsla(${(cell.hue + 40) % 360}, 100%, 70%, ${(0.4 + blink * 0.4).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(cell.position.x, cell.position.y, cell.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private renderEdgeFade(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const f = 50;

    const gradLeft = ctx.createLinearGradient(0, 0, f, 0);
    gradLeft.addColorStop(0, '#0a0a1a');
    gradLeft.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = gradLeft;
    ctx.fillRect(0, 0, f, h);

    const gradRight = ctx.createLinearGradient(w - f, 0, w, 0);
    gradRight.addColorStop(0, 'rgba(10, 10, 26, 0)');
    gradRight.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradRight;
    ctx.fillRect(w - f, 0, f, h);

    const gradTop = ctx.createLinearGradient(0, 0, 0, f);
    gradTop.addColorStop(0, '#0a0a1a');
    gradTop.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, w, f);

    const gradBottom = ctx.createLinearGradient(0, h - f, 0, h);
    gradBottom.addColorStop(0, 'rgba(10, 10, 26, 0)');
    gradBottom.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradBottom;
    ctx.fillRect(0, h - f, w, f);
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    const now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastFrameTime = now;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  getEvolutionTreeRoot() {
    return this.evolutionTree.getRoot();
  }

  getState(): GameState {
    return { ...this.state };
  }

  restart(): void {
    this.stop();
    this.cells = [];
    this.splitRipples = [];
    this.selectedCellId = null;
    this.enemySpawnTimer = 0;
    this.evolutionTree = new EvolutionTree();
    this.state = {
      status: 'playing',
      score: 0,
      survivalTime: 0,
      selectedCellId: null,
      playerCells: [],
      enemySpawnTimer: 0
    };
    this.init();
    this.start();
  }

  getEnergyThreshold(): number {
    return ENERGY_TO_SPLIT;
  }
}
