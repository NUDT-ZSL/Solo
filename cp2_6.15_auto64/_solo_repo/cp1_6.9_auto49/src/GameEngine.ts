import { ElementType } from './AudioManager';
import { ParticleSystem } from './ParticleSystem';

export interface HexCoord {
  row: number;
  col: number;
}

export interface Rune {
  id: string;
  element: ElementType;
  row: number;
  col: number;
  isGolden: boolean;
  energyMultiplier: number;
  energyUntil: number;
  animating: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  animStart: number;
  animDuration: number;
  flashPhase: number;
  isBeingRemoved: boolean;
  removeStart: number;
}

export type GameStatus = 'idle' | 'playing' | 'ended';
export type Rating = 'S' | 'A' | 'B' | 'C' | 'D';

export const ROW_COLS = [5, 6, 5, 6, 5, 6, 5];
export const TOTAL_CELLS = 37;
export const GAME_DURATION = 60;

export const ELEMENT_COLORS: Record<ElementType, string> = {
  [ElementType.FIRE]: '#ff4444',
  [ElementType.WATER]: '#44aaff',
  [ElementType.WIND]: '#44ff88',
  [ElementType.EARTH]: '#aa8844',
  [ElementType.LIGHT]: '#ffdd44',
};

const ELEMENTS = Object.values(ElementType);
let idCounter = 0;
const makeId = () => `r_${++idCounter}_${Date.now().toString(36)}`;

export function getRowCols(row: number): number {
  return ROW_COLS[row] ?? 0;
}

export function isValidCoord(row: number, col: number): boolean {
  if (row < 0 || row > 6) return false;
  if (col < 0 || col >= getRowCols(row)) return false;
  return true;
}

const EVEN_DIRS: HexCoord[] = [
  { row: -1, col: -1 }, { row: -1, col: 0 },
  { row: 0, col: -1 }, { row: 0, col: 1 },
  { row: 1, col: -1 }, { row: 1, col: 0 },
];
const ODD_DIRS: HexCoord[] = [
  { row: -1, col: 0 }, { row: -1, col: 1 },
  { row: 0, col: -1 }, { row: 0, col: 1 },
  { row: 1, col: 0 }, { row: 1, col: 1 },
];

export function getNeighbors(row: number, col: number): HexCoord[] {
  const dirs = row % 2 === 0 ? EVEN_DIRS : ODD_DIRS;
  const result: HexCoord[] = [];
  for (const d of dirs) {
    const nr = row + d.row;
    const nc = col + d.col;
    if (isValidCoord(nr, nc)) result.push({ row: nr, col: nc });
  }
  return result;
}

export function areNeighbors(a: HexCoord, b: HexCoord): boolean {
  const ns = getNeighbors(a.row, a.col);
  return ns.some(n => n.row === b.row && n.col === b.col);
}

export interface EngineCallbacks {
  onScoreChange: (delta: number, total: number) => void;
  onResonance: (element: ElementType, count: number) => void;
  onTideTriggered: () => void;
  onGameEnd: (score: number, rating: Rating, types: number) => void;
}

export interface RenderableRune extends Rune {
  renderX: number;
  renderY: number;
  renderScale: number;
  brightness: number;
  removeOpacity: number;
}

export class GameEngine {
  private board: (Rune | null)[][] = [];
  private status: GameStatus = 'idle';
  private score = 0;
  private combo = 0;
  private timeLeft = GAME_DURATION;
  private boardRotation = 0;
  private playbackSpeed = 1;
  private lastResonanceElements: ElementType[] = [];
  private lastResonanceTime = 0;
  private resonanceTypesTriggered = new Set<ElementType>();
  private nowTime = 0;
  private callbacks: EngineCallbacks;
  private particles: ParticleSystem;
  private tideEffectActive = false;
  private tideEffectStart = 0;
  private shuffleAnimStart = 0;
  private shuffling = false;
  private lockedOperations = false;
  private draggingRuneId: string | null = null;
  private dragOffset = { x: 0, y: 0 };
  private dragCurrent = { x: 0, y: 0 };
  private hoverCell: HexCoord | null = null;
  private lastScoreAnimation = 0;

  constructor(callbacks: EngineCallbacks, particles: ParticleSystem) {
    this.callbacks = callbacks;
    this.particles = particles;
    this.initEmptyBoard();
  }

  private initEmptyBoard(): void {
    this.board = [];
    for (let r = 0; r < 7; r++) {
      this.board.push(new Array(getRowCols(r)).fill(null));
    }
  }

  public getStatus(): GameStatus { return this.status; }
  public getScore(): number { return this.score; }
  public getCombo(): number { return this.combo; }
  public getTimeLeft(): number { return this.timeLeft; }
  public getRotation(): number { return this.boardRotation; }
  public getPlaybackSpeed(): number { return this.playbackSpeed; }
  public getLastResonanceElements(): ElementType[] { return [...this.lastResonanceElements]; }
  public getResonanceTypesCount(): number { return this.resonanceTypesTriggered.size; }
  public isLocked(): boolean { return this.lockedOperations; }
  public getTideProgress(): number {
    if (!this.tideEffectActive) return 0;
    return Math.min(1, (this.nowTime - this.tideEffectStart) / 2000);
  }
  public getScoreAnimProgress(): number {
    const t = (this.nowTime - this.lastScoreAnimation) / 200;
    return Math.max(0, 1 - t);
  }

  public rotateBoard(delta: number): void {
    this.boardRotation = (this.boardRotation + delta) % 360;
  }

  public resetRotation(): void {
    this.boardRotation = 0;
  }

  public togglePlaybackSpeed(): void {
    this.playbackSpeed = this.playbackSpeed === 1 ? 2 : 1;
  }

  public startGame(centerX: number, centerY: number, hexSize: number): void {
    this.initEmptyBoard();
    this.status = 'playing';
    this.score = 0;
    this.combo = 0;
    this.timeLeft = GAME_DURATION;
    this.lastResonanceElements = [];
    this.lastResonanceTime = 0;
    this.resonanceTypesTriggered = new Set();
    this.tideEffectActive = false;
    this.shuffling = false;
    this.lockedOperations = false;
    this.particles.clear();
    this.callbacks.onScoreChange(0, 0);
    this.spawnInitialRunes(centerX, centerY, hexSize);
  }

  private spawnInitialRunes(cx: number, cy: number, hs: number): void {
    const emptyCells: HexCoord[] = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        emptyCells.push({ row: r, col: c });
      }
    }
    const count = 8 + Math.floor(Math.random() * 5);
    this.shuffleArray(emptyCells);
    for (let i = 0; i < count && i < emptyCells.length; i++) {
      const cell = emptyCells[i];
      const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      const pos = this.cellToPixel(cell.row, cell.col, cx, cy, hs);
      const rune: Rune = {
        id: makeId(),
        element,
        row: cell.row,
        col: cell.col,
        isGolden: false,
        energyMultiplier: 1,
        energyUntil: 0,
        animating: false,
        fromX: pos.x, fromY: pos.y,
        toX: pos.x, toY: pos.y,
        animStart: 0, animDuration: 0,
        flashPhase: 0,
        isBeingRemoved: false,
        removeStart: 0,
      };
      this.board[cell.row][cell.col] = rune;
    }
  }

  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  public cellToPixel(row: number, col: number, cx: number, cy: number, hs: number): { x: number; y: number } {
    const w = Math.sqrt(3) * hs;
    const h = 1.5 * hs;
    const yOff = (row - 3) * h;
    const rowCount = getRowCols(row);
    const xBase = (row % 2 === 0 ? 0 : w / 2);
    const xOff = xBase + (col - (rowCount - 1) / 2) * w;
    return { x: cx + xOff, y: cy + yOff };
  }

  public pixelToCell(px: number, py: number, cx: number, cy: number, hs: number): HexCoord | null {
    let best: { coord: HexCoord; dist: number } | null = null;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        const p = this.cellToPixel(r, c, cx, cy, hs);
        const dx = p.x - px;
        const dy = p.y - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < hs * 0.95 && (!best || d < best.dist)) {
          best = { coord: { row: r, col: c }, dist: d };
        }
      }
    }
    return best ? best.coord : null;
  }

  public getAllCellsCenter(cx: number, cy: number, hs: number): { coord: HexCoord; x: number; y: number }[] {
    const result: { coord: HexCoord; x: number; y: number }[] = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        const p = this.cellToPixel(r, c, cx, cy, hs);
        result.push({ coord: { row: r, col: c }, x: p.x, y: p.y });
      }
    }
    return result;
  }

  public startDrag(coord: HexCoord, mouseX: number, mouseY: number, cx: number, cy: number, hs: number): boolean {
    if (this.lockedOperations || this.status !== 'playing') return false;
    const rune = this.board[coord.row]?.[coord.col];
    if (!rune || rune.animating || rune.isBeingRemoved) return false;
    this.draggingRuneId = rune.id;
    const p = this.cellToPixel(coord.row, coord.col, cx, cy, hs);
    this.dragOffset.x = mouseX - p.x;
    this.dragOffset.y = mouseY - p.y;
    this.dragCurrent.x = mouseX;
    this.dragCurrent.y = mouseY;
    return true;
  }

  public updateDrag(mouseX: number, mouseY: number, cx: number, cy: number, hs: number): void {
    if (!this.draggingRuneId) return;
    this.dragCurrent.x = mouseX;
    this.dragCurrent.y = mouseY;
    this.hoverCell = this.pixelToCell(mouseX - this.dragOffset.x, mouseY - this.dragOffset.y, cx, cy, hs);
  }

  public endDrag(cx: number, cy: number, hs: number): boolean {
    if (!this.draggingRuneId) return false;
    const src = this.findRuneCoord(this.draggingRuneId);
    const dst = this.hoverCell;
    this.draggingRuneId = null;
    this.hoverCell = null;
    if (!src || !dst) return false;
    if (src.row === dst.row && src.col === dst.col) return false;
    if (!areNeighbors(src, dst)) return false;
    return this.performMove(src, dst, cx, cy, hs);
  }

  private findRuneCoord(id: string): HexCoord | null {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        if (this.board[r][c]?.id === id) return { row: r, col: c };
      }
    }
    return null;
  }

  private performMove(src: HexCoord, dst: HexCoord, cx: number, cy: number, hs: number): boolean {
    const a = this.board[src.row][src.col];
    const b = this.board[dst.row][dst.col];
    if (!a) return false;
    const aFrom = this.cellToPixel(src.row, src.col, cx, cy, hs);
    const aTo = this.cellToPixel(dst.row, dst.col, cx, cy, hs);
    a.fromX = aFrom.x; a.fromY = aFrom.y;
    a.toX = aTo.x; a.toY = aTo.y;
    a.animStart = this.nowTime;
    a.animDuration = 300;
    a.animating = true;
    a.row = dst.row; a.col = dst.col;
    this.board[src.row][src.col] = null;
    this.board[dst.row][dst.col] = a;
    if (b) {
      const bFrom = this.cellToPixel(dst.row, dst.col, cx, cy, hs);
      const bTo = this.cellToPixel(src.row, src.col, cx, cy, hs);
      b.fromX = bFrom.x; b.fromY = bFrom.y;
      b.toX = bTo.x; b.toY = bTo.y;
      b.animStart = this.nowTime;
      b.animDuration = 300;
      b.animating = true;
      b.row = src.row; b.col = src.col;
      this.board[src.row][src.col] = b;
    }
    this.lockedOperations = true;
    setTimeout(() => this.checkResonances(cx, cy, hs), 310);
    return true;
  }

  private checkResonances(cx: number, cy: number, hs: number): void {
    const groups = this.detectResonanceGroups();
    if (groups.length === 0) {
      this.combo = 0;
      this.lockedOperations = false;
      return;
    }
    const toRemove = new Set<string>();
    const elementCounts = new Map<ElementType, number>();
    for (const g of groups) {
      const elem = g.element;
      for (const coord of g.coords) {
        const rune = this.board[coord.row][coord.col];
        if (rune) {
          toRemove.add(`${coord.row},${coord.col}`);
          elementCounts.set(elem, (elementCounts.get(elem) ?? 0) + 1);
        }
      }
    }
    const removedList: { rune: Rune; px: number; py: number }[] = [];
    const neighborBoost = new Set<string>();
    for (const key of toRemove) {
      const [r, c] = key.split(',').map(Number);
      const rune = this.board[r][c];
      if (!rune) continue;
      const pos = this.cellToPixel(r, c, cx, cy, hs);
      rune.isBeingRemoved = true;
      rune.removeStart = this.nowTime;
      rune.flashPhase = 0;
      removedList.push({ rune, px: pos.x, py: pos.y });
      const ns = getNeighbors(r, c);
      for (const n of ns) {
        const nk = `${n.row},${n.col}`;
        if (!toRemove.has(nk)) neighborBoost.add(nk);
      }
    }
    setTimeout(() => {
      for (const item of removedList) {
        this.particles.spawnExplosion(item.px, item.py, ELEMENT_COLORS[item.rune.element]);
        this.score += (item.rune.isGolden ? 30 : 10) * item.rune.energyMultiplier;
        this.score += this.combo * 5 * item.rune.energyMultiplier;
        this.callbacks.onScoreChange(this.score, this.score);
        this.lastScoreAnimation = this.nowTime;
      }
      for (const key of toRemove) {
        const [r, c] = key.split(',').map(Number);
        this.board[r][c] = null;
      }
      for (const nk of neighborBoost) {
        const [r, c] = nk.split(',').map(Number);
        const rune = this.board[r]?.[c];
        if (rune && !rune.isBeingRemoved) {
          rune.energyMultiplier = 2;
          rune.energyUntil = this.nowTime + 5000;
        }
      }
    }, 500);
    for (const [elem, count] of elementCounts) {
      this.resonanceTypesTriggered.add(elem);
      this.callbacks.onResonance(elem, count);
    }
    this.combo++;
    const firstElem = groups[0].element;
    this.updateResonanceChain(firstElem);
    setTimeout(() => {
      this.checkAndTriggerTide(cx, cy, hs);
    }, 550);
    setTimeout(() => {
      this.checkResonances(cx, cy, hs);
    }, 1200);
  }

  private updateResonanceChain(elem: ElementType): void {
    const now = this.nowTime;
    if (now - this.lastResonanceTime > 3000) {
      this.lastResonanceElements = [];
    }
    if (this.lastResonanceElements[this.lastResonanceElements.length - 1] !== elem) {
      this.lastResonanceElements.push(elem);
      if (this.lastResonanceElements.length > 3) {
        this.lastResonanceElements.shift();
      }
    }
    this.lastResonanceTime = now;
  }

  private checkAndTriggerTide(cx: number, cy: number, hs: number): void {
    if (this.lastResonanceElements.length === 3) {
      const set = new Set(this.lastResonanceElements);
      if (set.size === 3) {
        this.triggerTide(cx, cy, hs);
        this.lastResonanceElements = [];
      }
    }
  }

  private triggerTide(cx: number, cy: number, hs: number): void {
    this.tideEffectActive = true;
    this.tideEffectStart = this.nowTime;
    this.particles.spawnHalo(cx, cy);
    this.particles.spawnVortex(cx, cy, '#ffdd44', 50);
    this.callbacks.onTideTriggered();
    this.shuffling = true;
    this.shuffleAnimStart = this.nowTime;
    this.lockedOperations = true;
    setTimeout(() => {
      this.shuffleRunes(cx, cy, hs);
      setTimeout(() => {
        this.spawnGoldenRunes(10, cx, cy, hs);
        this.tideEffectActive = false;
        this.shuffling = false;
        this.lockedOperations = false;
        setTimeout(() => this.checkResonances(cx, cy, hs), 320);
      }, 820);
    }, 300);
  }

  private shuffleRunes(cx: number, cy: number, hs: number): void {
    const entries: { rune: Rune; from: { x: number; y: number } }[] = [];
    const positions: HexCoord[] = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        const rune = this.board[r][c];
        if (rune && !rune.isGolden) {
          const pos = this.cellToPixel(r, c, cx, cy, hs);
          entries.push({ rune, from: { x: pos.x, y: pos.y } });
          positions.push({ row: r, col: c });
        }
      }
    }
    const runes = entries.map(e => e.rune);
    this.shuffleArray(runes);
    this.shuffleArray(positions);
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        const rune = this.board[r][c];
        if (rune && !rune.isGolden) {
          this.board[r][c] = null;
        }
      }
    }
    const n = Math.min(runes.length, positions.length);
    for (let i = 0; i < n; i++) {
      const rune = runes[i];
      const pos = positions[i];
      const toP = this.cellToPixel(pos.row, pos.col, cx, cy, hs);
      const fromP = this.cellToPixel(rune.row, rune.col, cx, cy, hs);
      rune.row = pos.row;
      rune.col = pos.col;
      rune.fromX = fromP.x; rune.fromY = fromP.y;
      rune.toX = toP.x; rune.toY = toP.y;
      rune.animStart = this.nowTime;
      rune.animDuration = 800;
      rune.animating = true;
      this.board[pos.row][pos.col] = rune;
    }
  }

  private spawnGoldenRunes(count: number, cx: number, cy: number, hs: number): void {
    const empties: HexCoord[] = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        if (!this.board[r][c]) empties.push({ row: r, col: c });
      }
    }
    this.shuffleArray(empties);
    const n = Math.min(count, empties.length);
    for (let i = 0; i < n; i++) {
      const cell = empties[i];
      const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      const pos = this.cellToPixel(cell.row, cell.col, cx, cy, hs);
      const rune: Rune = {
        id: makeId(),
        element,
        row: cell.row,
        col: cell.col,
        isGolden: true,
        energyMultiplier: 1,
        energyUntil: 0,
        animating: true,
        fromX: cx, fromY: cy,
        toX: pos.x, toY: pos.y,
        animStart: this.nowTime,
        animDuration: 500,
        flashPhase: 0,
        isBeingRemoved: false,
        removeStart: 0,
      };
      this.board[cell.row][cell.col] = rune;
    }
  }

  private detectResonanceGroups(): { element: ElementType; coords: HexCoord[]; shape: string }[] {
    const groups: { element: ElementType; coords: HexCoord[]; shape: string }[] = [];
    const used = new Set<string>();
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        const rune = this.board[r][c];
        if (!rune || rune.isBeingRemoved) continue;
        const elem = rune.element;
        const lineGroups = this.detectLines(r, c, elem);
        for (const lg of lineGroups) {
          const key = 'L:' + lg.map(k => `${k.row},${k.col}`).sort().join('|');
          if (!used.has(key)) {
            used.add(key);
            groups.push({ element: elem, coords: lg, shape: 'line' });
          }
        }
        const tri = this.detectTriangle(r, c, elem);
        if (tri) {
          const key = 'T:' + tri.map(k => `${k.row},${k.col}`).sort().join('|');
          if (!used.has(key)) {
            used.add(key);
            groups.push({ element: elem, coords: tri, shape: 'triangle' });
          }
        }
        const diamond = this.detectDiamond(r, c, elem);
        if (diamond) {
          const key = 'D:' + diamond.map(k => `${k.row},${k.col}`).sort().join('|');
          if (!used.has(key)) {
            used.add(key);
            groups.push({ element: elem, coords: diamond, shape: 'diamond' });
          }
        }
      }
    }
    return groups;
  }

  private sameElem(r: number, c: number, elem: ElementType): boolean {
    const rune = this.board[r]?.[c];
    return !!rune && !rune.isBeingRemoved && rune.element === elem;
  }

  private detectLines(r: number, c: number, elem: ElementType): HexCoord[][] {
    const results: HexCoord[][] = [];
    const dirs = r % 2 === 0 ? EVEN_DIRS : ODD_DIRS;
    const seen = new Set<string>();
    for (let d = 0; d < 6; d++) {
      const dir = dirs[d];
      const coords: HexCoord[] = [{ row: r, col: c }];
      let cr = r, cc = c;
      while (true) {
        const next = this.stepDir(cr, cc, dir);
        if (!next) break;
        if (!this.sameElem(next.row, next.col, elem)) break;
        coords.push(next);
        cr = next.row; cc = next.col;
      }
      if (coords.length >= 3) {
        const key = coords.map(k => `${k.row},${k.col}`).sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          results.push(coords);
        }
      }
    }
    return results;
  }

  private stepDir(r: number, c: number, dir: HexCoord): HexCoord | null {
    const isOdd = r % 2 === 1;
    let offset: HexCoord;
    if (isOdd) {
      offset = ODD_DIRS[EVEN_DIRS.findIndex(d => d.row === dir.row && d.col === dir.col)];
      if (!offset) {
        const idx = dirsIndex(EVEN_DIRS, dir);
        offset = idx >= 0 ? ODD_DIRS[idx] : dir;
      }
    } else {
      offset = EVEN_DIRS[ODD_DIRS.findIndex(d => d.row === dir.row && d.col === dir.col)];
      if (!offset) {
        const idx = dirsIndex(ODD_DIRS, dir);
        offset = idx >= 0 ? EVEN_DIRS[idx] : dir;
      }
    }
    const nr = r + offset.row;
    const nc = c + offset.col;
    if (!isValidCoord(nr, nc)) return null;
    return { row: nr, col: nc };
  }

  private detectTriangle(r: number, c: number, elem: ElementType): HexCoord[] | null {
    const ns = getNeighbors(r, c).filter(n => this.sameElem(n.row, n.col, elem));
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        if (areNeighbors(ns[i], ns[j])) {
          return [{ row: r, col: c }, ns[i], ns[j]];
        }
      }
    }
    return null;
  }

  private detectDiamond(r: number, c: number, elem: ElementType): HexCoord[] | null {
    const dirs = r % 2 === 0 ? EVEN_DIRS : ODD_DIRS;
    const patterns = [
      [0, 2, 3, 5],
      [1, 2, 3, 4],
      [0, 1, 4, 5],
    ];
    for (const pat of patterns) {
      const [a, b, cc, d] = pat;
      const na = this.nbFromDirs(r, c, dirs[a]);
      const nb = this.nbFromDirs(r, c, dirs[b]);
      const nc2 = this.nbFromDirs(r, c, dirs[cc]);
      const nd = this.nbFromDirs(r, c, dirs[d]);
      if (na && nb && nc2 && nd &&
          this.sameElem(na.row, na.col, elem) &&
          this.sameElem(nb.row, nb.col, elem) &&
          this.sameElem(nc2.row, nc2.col, elem) &&
          this.sameElem(nd.row, nd.col, elem)) {
        return [{ row: r, col: c }, na, nb, nc2, nd].slice(0, 4);
      }
    }
    return null;
  }

  private nbFromDirs(r: number, c: number, dir: HexCoord): HexCoord | null {
    const isOdd = r % 2 === 1;
    const dList = isOdd ? ODD_DIRS : EVEN_DIRS;
    const idx = dList.findIndex(d => d.row === dir.row && d.col === dir.col);
    if (idx < 0) {
      const altIdx = dirsIndex(isOdd ? EVEN_DIRS : ODD_DIRS, dir);
      if (altIdx < 0) return null;
      const actualDir = dList[altIdx];
      const nr = r + actualDir.row;
      const nc = c + actualDir.col;
      return isValidCoord(nr, nc) ? { row: nr, col: nc } : null;
    }
    const nr = r + dir.row;
    const nc = c + dir.col;
    return isValidCoord(nr, nc) ? { row: nr, col: nc } : null;
  }

  public update(dtMs: number): void {
    const dt = dtMs * this.playbackSpeed;
    this.nowTime += dt;
    if (this.status === 'playing') {
      this.timeLeft -= dt / 1000;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.status = 'ended';
        const rating = this.computeRating();
        this.callbacks.onGameEnd(this.score, rating, this.resonanceTypesTriggered.size);
      }
    }
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        const rune = this.board[r][c];
        if (!rune) continue;
        if (rune.animating) {
          const t = (this.nowTime - rune.animStart) / rune.animDuration;
          if (t >= 1) rune.animating = false;
        }
        if (rune.isBeingRemoved) {
          const t = (this.nowTime - rune.removeStart) / 500;
          rune.flashPhase = t * Math.PI * 2 * 3;
          if (t >= 1) {
            this.board[r][c] = null;
            continue;
          }
        }
        if (rune.energyUntil > 0 && this.nowTime > rune.energyUntil) {
          rune.energyMultiplier = 1;
          rune.energyUntil = 0;
        }
      }
    }
  }

  private computeRating(): Rating {
    if (this.score >= 500) return 'S';
    if (this.score >= 400) return 'A';
    if (this.score >= 300) return 'B';
    if (this.score >= 200) return 'C';
    return 'D';
  }

  public getRenderableRunes(cx: number, cy: number, hs: number): RenderableRune[] {
    const list: RenderableRune[] = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < getRowCols(r); c++) {
        const rune = this.board[r][c];
        if (!rune) continue;
        const basePos = this.cellToPixel(r, c, cx, cy, hs);
        let rx = basePos.x, ry = basePos.y;
        let scale = 1;
        if (rune.animating) {
          const t = Math.min(1, (this.nowTime - rune.animStart) / rune.animDuration);
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          rx = rune.fromX + (rune.toX - rune.fromX) * ease;
          ry = rune.fromY + (rune.toY - rune.fromY) * ease;
        }
        let brightness = 1;
        let removeOpacity = 1;
        if (rune.isBeingRemoved) {
          const t = (this.nowTime - rune.removeStart) / 500;
          brightness = 1 + Math.abs(Math.sin(rune.flashPhase * 6)) * 1;
          removeOpacity = Math.max(0, 1 - t);
          scale = 1 + t * 0.4;
        }
        if (rune.id === this.draggingRuneId) {
          rx = this.dragCurrent.x - this.dragOffset.x;
          ry = this.dragCurrent.y - this.dragOffset.y;
          scale = 1.15;
        }
        list.push({
          ...rune,
          renderX: rx,
          renderY: ry,
          renderScale: scale,
          brightness,
          removeOpacity,
        });
      }
    }
    return list;
  }

  public getHoverCell(): HexCoord | null { return this.hoverCell; }
  public getDraggingRuneId(): string | null { return this.draggingRuneId; }

  public getNextNeededElement(): ElementType | null {
    if (this.lastResonanceElements.length === 0) return null;
    const last = this.lastResonanceElements[this.lastResonanceElements.length - 1];
    if (!last) return null;
    const set = new Set(this.lastResonanceElements);
    for (const e of ELEMENTS) {
      if (!set.has(e)) return e;
    }
    return null;
  }
}

function dirsIndex(list: HexCoord[], d: HexCoord): number {
  return list.findIndex(x => x.row === d.row && x.col === d.col);
}
