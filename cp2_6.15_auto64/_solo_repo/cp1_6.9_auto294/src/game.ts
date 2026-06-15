export type StoneColor = 'black' | 'white';

export interface GridPos {
  row: number;
  col: number;
}

export interface Stone {
  pos: GridPos;
  color: StoneColor;
  createdAt: number;
  fadeStartedAt?: number;
  opacity: number;
  removed?: boolean;
}

export interface InkDiffusion {
  centerX: number;
  centerY: number;
  color: StoneColor;
  startTime: number;
  duration: number;
  startRadius: number;
  endRadius: number;
}

export interface Ripple {
  centerX: number;
  centerY: number;
  color: StoneColor;
  startTime: number;
  duration: number;
  startRadius: number;
  endRadius: number;
}

export interface HistorySnapshot {
  stones: Stone[];
  diffusions: InkDiffusion[];
  ripples: Ripple[];
  nextColor: StoneColor;
}

export interface BoardLayout {
  offsetX: number;
  offsetY: number;
  cellSize: number;
}

const GRID_SIZE = 19;
const MAX_HISTORY = 20;
const INK_DURATION = 1500;
const INK_START_RADIUS = 5;
const INK_END_RADIUS = 25;
const FADE_DURATION = 500;
const RIPPLE_DURATION = 500;
const RIPPLE_START_RADIUS = 10;
const RIPPLE_END_RADIUS = 40;

function cloneSnapshot(snap: HistorySnapshot): HistorySnapshot {
  return {
    stones: snap.stones.map((s) => ({ ...s, pos: { ...s.pos } })),
    diffusions: snap.diffusions.map((d) => ({ ...d })),
    ripples: snap.ripples.map((r) => ({ ...r })),
    nextColor: snap.nextColor
  };
}

export class GameEngine {
  public stones: Stone[] = [];
  public diffusions: InkDiffusion[] = [];
  public ripples: Ripple[] = [];
  public nextColor: StoneColor = 'black';
  public layout: BoardLayout = { offsetX: 0, offsetY: 0, cellSize: 30 };

  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];

  public get gridSize(): number {
    return GRID_SIZE;
  }

  public setLayout(layout: BoardLayout): void {
    this.layout = layout;
  }

  public gridToPixel(pos: GridPos): { x: number; y: number } {
    return {
      x: this.layout.offsetX + pos.col * this.layout.cellSize,
      y: this.layout.offsetY + pos.row * this.layout.cellSize
    };
  }

  public pixelToGrid(x: number, y: number): GridPos | null {
    const col = Math.round((x - this.layout.offsetX) / this.layout.cellSize);
    const row = Math.round((y - this.layout.offsetY) / this.layout.cellSize);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    const threshold = this.layout.cellSize / 2;
    const cx = this.layout.offsetX + col * this.layout.cellSize;
    const cy = this.layout.offsetY + row * this.layout.cellSize;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist > threshold) {
      return null;
    }
    return { row, col };
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private takeSnapshot(): HistorySnapshot {
    return cloneSnapshot({
      stones: this.stones,
      diffusions: this.diffusions,
      ripples: this.ripples,
      nextColor: this.nextColor
    });
  }

  private restoreSnapshot(snap: HistorySnapshot): void {
    const copy = cloneSnapshot(snap);
    this.stones = copy.stones;
    this.diffusions = copy.diffusions;
    this.ripples = copy.ripples;
    this.nextColor = copy.nextColor;
  }

  public placeStone(pos: GridPos, now: number): boolean {
    const exists = this.stones.find(
      (s) => !s.removed && s.pos.row === pos.row && s.pos.col === pos.col
    );
    if (exists) {
      return false;
    }

    const snapshot = this.takeSnapshot();
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;

    const color = this.nextColor;
    const { x: cx, y: cy } = this.gridToPixel(pos);
    const stone: Stone = {
      pos,
      color,
      createdAt: now,
      opacity: 1
    };
    this.stones.push(stone);

    this.diffusions.push({
      centerX: cx,
      centerY: cy,
      color,
      startTime: now,
      duration: INK_DURATION,
      startRadius: INK_START_RADIUS,
      endRadius: INK_END_RADIUS
    });

    const fadeCandidates: Stone[] = [];
    for (const other of this.stones) {
      if (other === stone || other.removed || other.color !== color) continue;
      const dr = Math.abs(other.pos.row - pos.row);
      const dc = Math.abs(other.pos.col - pos.col);
      if (dr + dc <= 2) {
        fadeCandidates.push(other);
      }
    }

    for (const candidate of fadeCandidates) {
      candidate.fadeStartedAt = now;
    }

    this.nextColor = color === 'black' ? 'white' : 'black';
    return true;
  }

  public undo(): boolean {
    const snap = this.undoStack.pop();
    if (!snap) return false;
    const current = this.takeSnapshot();
    this.redoStack.push(current);
    this.restoreSnapshot(snap);
    return true;
  }

  public redo(): boolean {
    const snap = this.redoStack.pop();
    if (!snap) return false;
    const current = this.takeSnapshot();
    this.undoStack.push(current);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.restoreSnapshot(snap);
    return true;
  }

  public update(now: number): void {
    this.diffusions = this.diffusions.filter(
      (d) => now - d.startTime < d.duration
    );

    const ripplesToAdd: Ripple[] = [];
    this.stones = this.stones.filter((s) => {
      if (s.removed) return false;
      if (s.fadeStartedAt !== undefined) {
        const elapsed = now - s.fadeStartedAt;
        const progress = Math.min(elapsed / FADE_DURATION, 1);
        s.opacity = 1 - progress;
        if (progress >= 1) {
          const { x, y } = this.gridToPixel(s.pos);
          ripplesToAdd.push({
            centerX: x,
            centerY: y,
            color: s.color,
            startTime: now,
            duration: RIPPLE_DURATION,
            startRadius: RIPPLE_START_RADIUS,
            endRadius: RIPPLE_END_RADIUS
          });
          return false;
        }
      }
      return true;
    });

    for (const r of ripplesToAdd) {
      this.ripples.push(r);
    }

    this.ripples = this.ripples.filter(
      (r) => now - r.startTime < r.duration
    );
  }

  public static getInkProgress(
    diffusion: InkDiffusion,
    now: number
  ): { radius: number; alpha: number } {
    const t = Math.min((now - diffusion.startTime) / diffusion.duration, 1);
    const radius =
      diffusion.startRadius +
      (diffusion.endRadius - diffusion.startRadius) * t;
    const alpha = 1 - t * 0.5;
    return { radius, alpha };
  }

  public static getRippleProgress(
    ripple: Ripple,
    now: number
  ): { innerR: number; outerR: number; alpha: number } {
    const t = Math.min((now - ripple.startTime) / ripple.duration, 1);
    const outerR =
      ripple.startRadius +
      (ripple.endRadius - ripple.startRadius) * t;
    const innerR = Math.max(outerR - 6, 0);
    const alpha = 1 - t;
    return { innerR, outerR, alpha };
  }
}
