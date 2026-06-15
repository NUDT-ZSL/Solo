import {
  CellState,
  Grid,
  Position,
  LevelConfig,
  LEVEL_CONFIGS,
  cloneGrid,
  generateGrid,
} from './GridGenerator';
import { QubitSystem } from './QubitSystem';

export interface GameStateSnapshot {
  grid: Grid;
  playerPos: Position;
  steps: number;
  observations: number;
}

export interface GamePublicState {
  currentLevel: number;
  totalLevels: number;
  steps: number;
  observations: number;
  historyLength: number;
  historyIndex: number;
  won: boolean;
}

type StateChangeCallback = (state: GamePublicState) => void;

interface CelebrationWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  hue: number;
  alpha: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: Grid;
  private qubitSystem: QubitSystem;
  private currentLevel: number = 0;
  private playerPos: Position;
  private playerRenderX: number = 0;
  private playerRenderY: number = 0;
  private playerTargetX: number = 0;
  private playerTargetY: number = 0;
  private playerVelX: number = 0;
  private playerVelY: number = 0;
  private steps: number = 0;
  private observations: number = 0;
  private history: GameStateSnapshot[] = [];
  private historyIndex: number = -1;
  private won: boolean = false;
  private celebrationWaves: CelebrationWave[] = [];
  private exitGlowPhase: number = 0;
  private time: number = 0;
  private lastTime: number = 0;
  private animFrameId: number = 0;
  private cellSize: number = 60;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private onStateChange: StateChangeCallback | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragCurrentX: number = 0;
  private dragCurrentY: number = 0;
  private movePath: Position[] = [];
  private movePathIndex: number = 0;
  private moveTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.qubitSystem = new QubitSystem();
    const config = LEVEL_CONFIGS[0];
    this.grid = generateGrid(config);
    this.playerPos = { ...this.grid.start };
    this.pushHistory();
    this.resize();
    this.playerRenderX = this.offsetX + this.playerPos.col * this.cellSize + this.cellSize / 2;
    this.playerRenderY = this.offsetY + this.playerPos.row * this.cellSize + this.cellSize / 2;
    this.playerTargetX = this.playerRenderX;
    this.playerTargetY = this.playerRenderY;
    this.bindEvents();
    this.lastTime = performance.now();
    this.loop();
  }

  setOnStateChange(cb: StateChangeCallback) {
    this.onStateChange = cb;
    this.notifyState();
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        currentLevel: this.currentLevel + 1,
        totalLevels: LEVEL_CONFIGS.length,
        steps: this.steps,
        observations: this.observations,
        historyLength: this.history.length,
        historyIndex: this.historyIndex,
        won: this.won,
      });
    }
  }

  private pushHistory() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({
      grid: cloneGrid(this.grid),
      playerPos: { ...this.playerPos },
      steps: this.steps,
      observations: this.observations,
    });
    this.historyIndex = this.history.length - 1;
  }

  rewindTo(index: number) {
    if (index < 0 || index >= this.history.length) return;
    const snap = this.history[index];
    this.grid = cloneGrid(snap.grid);
    this.playerPos = { ...snap.playerPos };
    this.steps = snap.steps;
    this.observations = snap.observations;
    this.historyIndex = index;
    this.movePath = [];
    this.won = false;
    this.celebrationWaves = [];
    this.playerTargetX = this.offsetX + this.playerPos.col * this.cellSize + this.cellSize / 2;
    this.playerTargetY = this.offsetY + this.playerPos.row * this.cellSize + this.cellSize / 2;
    this.notifyState();
  }

  resetLevel() {
    this.rewindTo(0);
  }

  nextLevel() {
    if (this.currentLevel < LEVEL_CONFIGS.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
    }
  }

  private loadLevel(index: number) {
    const config = LEVEL_CONFIGS[index];
    this.grid = generateGrid(config);
    this.playerPos = { ...this.grid.start };
    this.steps = 0;
    this.observations = 0;
    this.history = [];
    this.historyIndex = -1;
    this.won = false;
    this.celebrationWaves = [];
    this.movePath = [];
    this.qubitSystem = new QubitSystem();
    this.pushHistory();
    this.resize();
    this.playerRenderX = this.offsetX + this.playerPos.col * this.cellSize + this.cellSize / 2;
    this.playerRenderY = this.offsetY + this.playerPos.row * this.cellSize + this.cellSize / 2;
    this.playerTargetX = this.playerRenderX;
    this.playerTargetY = this.playerRenderY;
    this.playerVelX = 0;
    this.playerVelY = 0;
    this.notifyState();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const maxCellW = (w * 0.8) / this.grid.width;
    const maxCellH = (h * 0.8) / this.grid.height;
    this.cellSize = Math.min(maxCellW, maxCellH, 80);
    this.offsetX = (w - this.grid.width * this.cellSize) / 2;
    this.offsetY = (h - this.grid.height * this.cellSize) / 2;
    this.playerTargetX = this.offsetX + this.playerPos.col * this.cellSize + this.cellSize / 2;
    this.playerTargetY = this.offsetY + this.playerPos.row * this.cellSize + this.cellSize / 2;
  }

  destroy() {
    cancelAnimationFrame(this.animFrameId);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.onResize);
  }

  private bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.resize();
  };

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private screenToGrid(sx: number, sy: number): Position | null {
    const col = Math.floor((sx - this.offsetX) / this.cellSize);
    const row = Math.floor((sy - this.offsetY) / this.cellSize);
    if (row >= 0 && row < this.grid.height && col >= 0 && col < this.grid.width) {
      return { row, col };
    }
    return null;
  }

  private onMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e);
    this.isDragging = true;
    this.dragStartX = pos.x;
    this.dragStartY = pos.y;
    this.dragCurrentX = pos.x;
    this.dragCurrentY = pos.y;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const pos = this.getCanvasPos(e);
    this.dragCurrentX = pos.x;
    this.dragCurrentY = pos.y;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    const pos = this.getCanvasPos(e);
    this.handleClick(this.dragStartX, this.dragStartY, pos.x, pos.y);
  };

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getCanvasPos(e.touches[0]);
      this.isDragging = true;
      this.dragStartX = pos.x;
      this.dragStartY = pos.y;
      this.dragCurrentX = pos.x;
      this.dragCurrentY = pos.y;
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getCanvasPos(e.touches[0]);
      this.dragCurrentX = pos.x;
      this.dragCurrentY = pos.y;
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.handleClick(this.dragStartX, this.dragStartY, this.dragCurrentX, this.dragCurrentY);
  };

  private handleClick(startX: number, startY: number, endX: number, endY: number) {
    if (this.won) return;

    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      const gridPos = this.screenToGrid(endX, endY);
      if (!gridPos) return;
      const cell = this.grid.cells[gridPos.row][gridPos.col];

      if (cell.state === CellState.Superposition) {
        this.observeCell(gridPos.row, gridPos.col);
      } else if (cell.state === CellState.Solid) {
        this.tryMoveTo(gridPos);
      }
    } else {
      const gridPos = this.screenToGrid(startX, startY);
      if (!gridPos) return;
      const cell = this.grid.cells[gridPos.row][gridPos.col];
      if (cell.state === CellState.Superposition) {
        this.observeCell(gridPos.row, gridPos.col);
      }
    }
  }

  private observeCell(row: number, col: number) {
    const cell = this.grid.cells[row][col];
    if (cell.state !== CellState.Superposition) return;

    const fromX = this.playerTargetX;
    const fromY = this.playerTargetY;
    const toX = this.offsetX + col * this.cellSize + this.cellSize / 2;
    const toY = this.offsetY + row * this.cellSize + this.cellSize / 2;

    this.qubitSystem.fire(fromX, fromY, toX, toY, row, col);
    this.observations++;
    this.steps++;
    this.collapseCell(row, col);
    this.pushHistory();
    this.notifyState();
  }

  private collapseCell(row: number, col: number) {
    const cell = this.grid.cells[row][col];
    if (cell.state !== CellState.Superposition) return;

    const isSolid = Math.random() < cell.collapseBias;
    cell.state = isSolid ? CellState.Solid : CellState.Hollow;
    cell.shockwaveAlpha = 1;
    cell.shockwaveRadius = 0;

    if (cell.entangledWith) {
      const partner = this.grid.cells[cell.entangledWith.row][cell.entangledWith.col];
      if (partner.state === CellState.Superposition) {
        partner.state = isSolid ? CellState.Hollow : CellState.Solid;
        partner.shockwaveAlpha = 1;
        partner.shockwaveRadius = 0;
        const pcx = this.offsetX + partner.col * this.cellSize + this.cellSize / 2;
        const pcy = this.offsetY + partner.row * this.cellSize + this.cellSize / 2;
        this.qubitSystem.addShockwave(pcx, pcy, this.cellSize * 1.5);
      }
    }
  }

  private tryMoveTo(target: Position) {
    if (this.movePath.length > 0) return;

    const path = this.findPath(this.playerPos, target);
    if (path.length === 0) return;

    this.movePath = path;
    this.movePathIndex = 0;
    this.moveTimer = 0;
  }

  private findPath(from: Position, to: Position): Position[] {
    if (from.row === to.row && from.col === to.col) return [];
    if (this.grid.cells[to.row][to.col].state !== CellState.Solid) return [];

    const visited = new Set<string>();
    const queue: { pos: Position; path: Position[] }[] = [{ pos: from, path: [] }];
    visited.add(`${from.row},${from.col}`);

    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    while (queue.length > 0) {
      const { pos, path } = queue.shift()!;
      for (const d of dirs) {
        const nr = pos.row + d.dr;
        const nc = pos.col + d.dc;
        const key = `${nr},${nc}`;
        if (
          nr >= 0 && nr < this.grid.height &&
          nc >= 0 && nc < this.grid.width &&
          !visited.has(key) &&
          this.grid.cells[nr][nc].state === CellState.Solid
        ) {
          visited.add(key);
          const newPath = [...path, { row: nr, col: nc }];
          if (nr === to.row && nc === to.col) {
            return newPath;
          }
          queue.push({ pos: { row: nr, col: nc }, path: newPath });
        }
      }
    }

    return [];
  }

  private loop = () => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.time += dt;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const hitCells = this.qubitSystem.update(
      dt,
      this.grid,
      this.cellSize,
      this.offsetX,
      this.offsetY
    );

    for (let r = 0; r < this.grid.height; r++) {
      for (let c = 0; c < this.grid.width; c++) {
        const cell = this.grid.cells[r][c];
        if (cell.shockwaveAlpha > 0) {
          cell.shockwaveRadius += dt * 300;
          cell.shockwaveAlpha = Math.max(0, 1 - cell.shockwaveRadius / (this.cellSize * 2));
          if (cell.shockwaveAlpha <= 0) {
            cell.shockwaveRadius = 0;
          }
        }
        if (cell.state === CellState.Superposition) {
          cell.rotation += dt * 0.5;
        }
        if (
          (cell.state === CellState.Solid || cell.state === CellState.Hollow) &&
          cell.flipInterval > 0
        ) {
          cell.flipTimer += dt * 1000;
          if (cell.flipTimer >= cell.flipInterval) {
            cell.flipTimer = 0;
            cell.state = cell.state === CellState.Solid ? CellState.Hollow : CellState.Solid;
          }
        }
      }
    }

    this.exitGlowPhase += dt * 2;

    if (this.movePath.length > 0 && this.movePathIndex < this.movePath.length) {
      this.moveTimer += dt;
      const stepDuration = 0.12;
      if (this.moveTimer >= stepDuration) {
        this.moveTimer -= stepDuration;
        const next = this.movePath[this.movePathIndex];
        this.playerPos = { ...next };
        this.playerTargetX = this.offsetX + next.col * this.cellSize + this.cellSize / 2;
        this.playerTargetY = this.offsetY + next.row * this.cellSize + this.cellSize / 2;
        this.steps++;
        this.movePathIndex++;

        if (
          this.playerPos.row === this.grid.exit.row &&
          this.playerPos.col === this.grid.exit.col
        ) {
          this.won = true;
          this.spawnCelebration();
        }

        if (this.movePathIndex >= this.movePath.length) {
          this.movePath = [];
          this.pushHistory();
          this.notifyState();
        }
      }
    }

    const springK = 12;
    const dampK = 6;
    const ax = (this.playerTargetX - this.playerRenderX) * springK - this.playerVelX * dampK;
    const ay = (this.playerTargetY - this.playerRenderY) * springK - this.playerVelY * dampK;
    this.playerVelX += ax * dt;
    this.playerVelY += ay * dt;
    this.playerRenderX += this.playerVelX * dt;
    this.playerRenderY += this.playerVelY * dt;

    for (const w of this.celebrationWaves) {
      w.radius += dt * 250;
      w.alpha = Math.max(0, 1 - w.radius / w.maxRadius);
    }
    this.celebrationWaves = this.celebrationWaves.filter(w => w.alpha > 0);
  }

  private spawnCelebration() {
    const cx = this.offsetX + this.grid.exit.col * this.cellSize + this.cellSize / 2;
    const cy = this.offsetY + this.grid.exit.row * this.cellSize + this.cellSize / 2;
    for (let i = 0; i < 5; i++) {
      this.celebrationWaves.push({
        x: cx,
        y: cy,
        radius: i * 20,
        maxRadius: 300,
        hue: (i * 72) % 360,
        alpha: 1,
      });
    }
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const cs = this.cellSize;
    const ox = this.offsetX;
    const oy = this.offsetY;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    this.renderGridLines(ctx, cs, ox, oy);
    this.renderEntanglementLines(ctx, cs, ox, oy);
    this.renderCells(ctx, cs, ox, oy);
    this.renderExit(ctx, cs, ox, oy);
    this.renderShockwaves(ctx);
    this.renderParticles(ctx);
    this.renderPlayer(ctx);
    this.renderCelebration(ctx);
    this.renderDragLine(ctx);
  }

  private renderGridLines(ctx: CanvasRenderingContext2D, cs: number, ox: number, oy: number) {
    ctx.save();
    ctx.strokeStyle = 'rgba(100,180,255,0.3)';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(100,180,255,0.5)';
    ctx.shadowBlur = 6;

    for (let r = 0; r <= this.grid.height; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * cs);
      ctx.lineTo(ox + this.grid.width * cs, oy + r * cs);
      ctx.stroke();
    }
    for (let c = 0; c <= this.grid.width; c++) {
      ctx.beginPath();
      ctx.moveTo(ox + c * cs, oy);
      ctx.lineTo(ox + c * cs, oy + this.grid.height * cs);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderEntanglementLines(ctx: CanvasRenderingContext2D, cs: number, ox: number, oy: number) {
    const drawn = new Set<string>();
    ctx.save();
    for (let r = 0; r < this.grid.height; r++) {
      for (let c = 0; c < this.grid.width; c++) {
        const cell = this.grid.cells[r][c];
        if (!cell.entangledWith) continue;
        const key = `${Math.min(r, cell.entangledWith.row)},${Math.min(c, cell.entangledWith.col)}-${Math.max(r, cell.entangledWith.row)},${Math.max(c, cell.entangledWith.col)}`;
        if (drawn.has(key)) continue;
        drawn.add(key);

        const x1 = ox + c * cs + cs / 2;
        const y1 = oy + r * cs + cs / 2;
        const x2 = ox + cell.entangledWith.col * cs + cs / 2;
        const y2 = oy + cell.entangledWith.row * cs + cs / 2;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255,100,255,0.4)');
        grad.addColorStop(0.5, 'rgba(200,100,255,0.6)');
        grad.addColorStop(1, 'rgba(255,100,255,0.4)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(200,100,255,0.6)';
        ctx.shadowBlur = 8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  private renderCells(ctx: CanvasRenderingContext2D, cs: number, ox: number, oy: number) {
    for (let r = 0; r < this.grid.height; r++) {
      for (let c = 0; c < this.grid.width; c++) {
        const cell = this.grid.cells[r][c];
        const cx = ox + c * cs + cs / 2;
        const cy = oy + r * cs + cs / 2;
        const padding = 3;
        const innerSize = cs - padding * 2;

        if (cell.state === CellState.Superposition) {
          this.renderSuperpositionCell(ctx, cx, cy, innerSize, cell.rotation, cell.flipInterval > 0);
        } else if (cell.state === CellState.Solid) {
          this.renderSolidCell(ctx, cx, cy, innerSize, cell.flipInterval > 0, cell.flipTimer, cell.flipInterval);
        } else {
          this.renderHollowCell(ctx, cx, cy, innerSize);
        }

        if (cell.shockwaveAlpha > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(150,200,255,${cell.shockwaveAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, cell.shockwaveRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  private renderSuperpositionCell(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    rotation: number,
    hasFlip: boolean
  ) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const half = size / 2;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, half);
    gradient.addColorStop(0, 'rgba(160,80,220,0.6)');
    gradient.addColorStop(0.5, 'rgba(120,50,200,0.3)');
    gradient.addColorStop(1, 'rgba(80,20,160,0.1)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180,100,255,0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const r = half * 0.6;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r * 0.3, Math.sin(angle) * r * 0.3, r * 0.5, angle, angle + Math.PI * 0.8);
      ctx.stroke();
    }

    ctx.restore();

    if (hasFlip) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,180,50,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private renderSolidCell(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    hasFlip: boolean,
    flipTimer: number,
    flipInterval: number
  ) {
    ctx.save();
    const half = size / 2;
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    ctx.shadowColor = 'rgba(180,220,255,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillRect(cx - half, cy - half, size, size);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(cx - half + 2, cy - half + 2, size - 4, size / 3);

    if (hasFlip && flipInterval > 0) {
      const progress = flipTimer / flipInterval;
      ctx.strokeStyle = `rgba(255,180,50,0.7)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, half + 4, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderHollowCell(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number
  ) {
    ctx.save();
    const half = size / 2;
    ctx.strokeStyle = 'rgba(100,140,180,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - half, cy - half, size, size);
    ctx.restore();
  }

  private renderExit(ctx: CanvasRenderingContext2D, cs: number, ox: number, oy: number) {
    const ex = this.grid.exit;
    const cx = ox + ex.col * cs + cs / 2;
    const cy = oy + ex.row * cs + cs / 2;
    const pulse = 0.6 + Math.sin(this.exitGlowPhase) * 0.4;

    ctx.save();
    ctx.fillStyle = `rgba(50,255,150,${0.15 * pulse})`;
    ctx.shadowColor = `rgba(50,255,150,${0.6 * pulse})`;
    ctx.shadowBlur = 20;
    ctx.fillRect(
      cx - cs / 2 + 3,
      cy - cs / 2 + 3,
      cs - 6,
      cs - 6
    );
    ctx.shadowBlur = 0;

    ctx.strokeStyle = `rgba(50,255,150,${0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - cs / 2 + 3, cy - cs / 2 + 3, cs - 6, cs - 6);

    ctx.fillStyle = `rgba(50,255,150,${0.8 * pulse})`;
    ctx.font = `${cs * 0.4}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', cx, cy);
    ctx.restore();
  }

  private renderShockwaves(ctx: CanvasRenderingContext2D) {
    for (const sw of this.qubitSystem.shockwaves) {
      ctx.save();
      ctx.strokeStyle = `rgba(120,180,255,${sw.alpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(120,180,255,${sw.alpha * 0.5})`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.qubitSystem.particles) {
      if (p.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < p.trail.length; i++) {
          const t0 = p.trail[i - 1];
          const t1 = p.trail[i];
          ctx.strokeStyle = `rgba(100,200,255,${t1.alpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(t0.x, t0.y);
          ctx.lineTo(t1.x, t1.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (p.alive) {
        ctx.save();
        ctx.fillStyle = 'rgba(180,220,255,0.9)';
        ctx.shadowColor = 'rgba(100,200,255,0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const px = this.playerRenderX;
    const py = this.playerRenderY;
    const r = this.cellSize * 0.25;

    ctx.save();
    ctx.fillStyle = 'rgba(50,200,255,0.9)';
    ctx.shadowColor = 'rgba(50,200,255,0.8)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(150,230,255,0.6)';
    ctx.beginPath();
    ctx.arc(px - r * 0.2, py - r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderCelebration(ctx: CanvasRenderingContext2D) {
    for (const w of this.celebrationWaves) {
      ctx.save();
      ctx.strokeStyle = `hsla(${w.hue},100%,60%,${w.alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = `hsla(${w.hue},100%,60%,${w.alpha * 0.5})`;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderDragLine(ctx: CanvasRenderingContext2D) {
    if (!this.isDragging) return;
    const dx = this.dragCurrentX - this.dragStartX;
    const dy = this.dragCurrentY - this.dragStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(100,200,255,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.dragStartX, this.dragStartY);
    ctx.lineTo(this.dragCurrentX, this.dragCurrentY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
