import { Grid, GridSnapshot } from './Grid';

export interface GridPos {
  row: number;
  col: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  createdAt: number;
  fadeStart: number;
}

export interface MoveAnimation {
  from: GridPos;
  to: GridPos;
  startTime: number;
  duration: number;
  isPlaying: boolean;
}

export interface UndoEntry {
  playerFrom: GridPos;
  playerTo: GridPos;
  gridSnapshot: GridSnapshot;
  pillarHit: GridPos | null;
  trailCount: number;
}

export const CELL_SIZE = 80;
export const MAX_UNDO = 10;
export const MAX_TRAIL = 150;
export const MOVE_DURATION = 300;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function gridCenter(row: number, col: number, gridSize: number, canvasOffsetX: number, canvasOffsetY: number): { x: number; y: number } {
  const totalW = gridSize * CELL_SIZE;
  const startX = canvasOffsetX + (0 - totalW / 2) + CELL_SIZE / 2;
  const startY = canvasOffsetY + (0 - totalW / 2) + CELL_SIZE / 2;
  return {
    x: startX + col * CELL_SIZE,
    y: startY + row * CELL_SIZE,
  };
}

export class Player {
  private currentPos: GridPos;
  private renderPosInternal: { x: number; y: number };
  private trail: TrailPoint[] = [];
  private undoStack: UndoEntry[] = [];
  private moveCount: number = 0;
  private moveAnim: MoveAnimation | null = null;
  private undoAnim: MoveAnimation | null = null;

  constructor(startRow: number, startCol: number) {
    this.currentPos = { row: startRow, col: startCol };
    this.renderPosInternal = { x: 0, y: 0 };
  }

  get currentGridPos(): GridPos {
    return { ...this.currentPos };
  }

  get renderPos(): { x: number; y: number } {
    return { ...this.renderPosInternal };
  }

  getTrail(): TrailPoint[] {
    return this.trail;
  }

  get undoRemaining(): number {
    return MAX_UNDO - this.undoStack.length;
  }

  get moveCounter(): number {
    return this.moveCount;
  }

  get isMoving(): boolean {
    return this.moveAnim?.isPlaying === true || this.undoAnim?.isPlaying === true;
  }

  isUndoing(): boolean {
    return this.undoAnim?.isPlaying === true;
  }

  setInitialRenderPos(x: number, y: number): void {
    this.renderPosInternal = { x, y };
  }

  canMove(to: GridPos, grid: Grid): boolean {
    if (this.isMoving) return false;
    const dr = Math.abs(to.row - this.currentPos.row);
    const dc = Math.abs(to.col - this.currentPos.col);
    if (dr + dc !== 1) return false;
    const size = grid.size;
    const inGrid = to.row >= 0 && to.row < size && to.col >= 0 && to.col < size;
    const fromInGrid = this.currentPos.row >= 0 && this.currentPos.row < size && this.currentPos.col >= 0 && this.currentPos.col < size;
    if (!inGrid && !fromInGrid) return false;
    if (to.row < -1 || to.row > size || to.col < -1 || to.col > size) return false;
    return true;
  }

  startMove(to: GridPos, grid: Grid, now: number, canvasOffsetX: number, canvasOffsetY: number): { moved: boolean; pillarHit: GridPos | null } {
    if (!this.canMove(to, grid)) return { moved: false, pillarHit: null };
    const snap = grid.snapshot();
    const pillarHit: GridPos | null = to.row >= 0 && to.row < grid.size && to.col >= 0 && to.col < grid.size ? { ...to } : null;
    const from = { ...this.currentPos };
    this.moveAnim = {
      from,
      to: { ...to },
      startTime: now,
      duration: MOVE_DURATION,
      isPlaying: true,
    };
    const undoEntry: UndoEntry = {
      playerFrom: from,
      playerTo: { ...to },
      gridSnapshot: snap,
      pillarHit,
      trailCount: this.trail.length,
    };
    if (this.undoStack.length >= MAX_UNDO) this.undoStack.shift();
    this.undoStack.push(undoEntry);
    this.currentPos = { ...to };
    this.moveCount++;
    const inGrid = to.row >= 0 && to.row < grid.size && to.col >= 0 && to.col < grid.size;
    if (inGrid) {
      const center = gridCenter(to.row, to.col, grid.size, canvasOffsetX, canvasOffsetY);
      this.pushTrail(center.x, center.y, now);
    } else {
      const center = {
        x: canvasOffsetX + (to.col + 0.5) * CELL_SIZE - grid.size * CELL_SIZE / 2,
        y: canvasOffsetY + (to.row + 0.5) * CELL_SIZE - grid.size * CELL_SIZE / 2,
      };
      this.pushTrail(center.x, center.y, now);
    }
    let hitResult: GridPos | null = null;
    if (pillarHit) {
      const res = grid.hitPillar(pillarHit.row, pillarHit.col, now);
      if (res.hit) hitResult = pillarHit;
    }
    return { moved: true, pillarHit: hitResult };
  }

  startUndo(grid: Grid, now: number): boolean {
    if (this.isMoving) return false;
    if (this.undoStack.length === 0) return false;
    const entry = this.undoStack.pop()!;
    grid.restore(entry.gridSnapshot);
    const from = { ...this.currentPos };
    const to = entry.playerFrom;
    this.undoAnim = {
      from,
      to,
      startTime: now,
      duration: MOVE_DURATION,
      isPlaying: true,
    };
    this.currentPos = { ...to };
    const toRemove = this.trail.length - entry.trailCount;
    if (toRemove > 0) {
      const removed = this.trail.splice(entry.trailCount, toRemove);
      for (const t of removed) {
        t.fadeStart = now;
      }
      this.trail.push(...removed);
    }
    this.moveCount = Math.max(0, this.moveCount - 1);
    return true;
  }

  update(now: number, grid: Grid, canvasOffsetX: number, canvasOffsetY: number): void {
    const totalW = grid.size * CELL_SIZE;
    const getPos = (p: GridPos): { x: number; y: number } => {
      const cx = canvasOffsetX - totalW / 2 + (p.col + 0.5) * CELL_SIZE;
      const cy = canvasOffsetY - totalW / 2 + (p.row + 0.5) * CELL_SIZE;
      return { x: cx, y: cy };
    };
    if (this.moveAnim && this.moveAnim.isPlaying) {
      const t = Math.min(1, (now - this.moveAnim.startTime) / this.moveAnim.duration);
      const e = easeOutCubic(t);
      const fp = getPos(this.moveAnim.from);
      const tp = getPos(this.moveAnim.to);
      this.renderPosInternal = {
        x: fp.x + (tp.x - fp.x) * e,
        y: fp.y + (tp.y - fp.y) * e,
      };
      if (t >= 1) {
        this.moveAnim.isPlaying = false;
        this.moveAnim = null;
      }
    } else if (this.undoAnim && this.undoAnim.isPlaying) {
      const t = Math.min(1, (now - this.undoAnim.startTime) / this.undoAnim.duration);
      const e = easeOutCubic(t);
      const fp = getPos(this.undoAnim.from);
      const tp = getPos(this.undoAnim.to);
      this.renderPosInternal = {
        x: fp.x + (tp.x - fp.x) * e,
        y: fp.y + (tp.y - fp.y) * e,
      };
      if (t >= 1) {
        this.undoAnim.isPlaying = false;
        this.undoAnim = null;
      }
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const tp = this.trail[i];
      if (tp.fadeStart > 0) {
        const age = (now - tp.fadeStart) / 500;
        if (age >= 1) {
          this.trail.splice(i, 1);
        } else {
          tp.alpha = 0.5 * (1 - age);
        }
      } else {
        const age = (now - tp.createdAt) / 8000;
        tp.alpha = Math.max(0.15, 0.5 - age * 0.35);
      }
    }
    while (this.trail.length > MAX_TRAIL) {
      this.trail.shift();
    }
  }

  clearTrail(): void {
    this.trail = [];
  }

  private pushTrail(x: number, y: number, now: number): void {
    this.trail.push({
      x,
      y,
      alpha: 0.5,
      createdAt: now,
      fadeStart: 0,
    });
  }
}
