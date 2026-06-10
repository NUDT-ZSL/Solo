export type ElementType = 'fire' | 'water' | 'wind' | 'earth';

export interface Talisman {
  id: number;
  element: ElementType;
  row: number;
  col: number;
  isRemoving: boolean;
  removeProgress: number;
  isNew: boolean;
  newProgress: number;
  startRow: number;
  startCol: number;
  targetRow: number;
  targetCol: number;
  isMoving: boolean;
  moveProgress: number;
  moveDuration: number;
}

export interface Position { row: number; col: number; }

export interface MatchGroup {
  element: ElementType;
  positions: Position[];
}

export interface LavaSpot { x: number; y: number; life: number; maxLife: number; }
export interface IceEffect { row: number; col: number; life: number; maxLife: number; }
export interface StoneWall {
  row: number; col: number;
  direction: 'horizontal' | 'vertical';
  life: number; maxLife: number;
  isCollapsing: boolean;
}
export interface ScorePopup {
  x: number; y: number;
  score: number; life: number; maxLife: number;
  isCombo: boolean;
}

const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#FF4500', water: '#00BFFF', wind: '#32CD32', earth: '#8B4513'
};

const COUNTER_MAP: Record<ElementType, ElementType> = {
  fire: 'wind', wind: 'earth', earth: 'water', water: 'fire'
};

const GRID = 7;
const DURATION = 60;
const BASE_PTS = 30;
const EXTRA_PTS = 15;
const LB_KEY = 'talisman_lb';

function adjKey(r1: number, c1: number, r2: number, c2: number): string {
  if (r1 < r2 || (r1 === r2 && c1 < c2)) return `${r1},${c1}|${r2},${c2}`;
  return `${r2},${c2}|${r1},${c1}`;
}

export class GameState {
  grid: (Talisman | null)[][];
  score: number;
  timeLeft: number;
  isGameOver: boolean;
  isPlaying: boolean;
  selectedTalisman: Talisman | null;
  lastMatchElement: ElementType | null;
  leaderboard: number[];

  lavaSpots: LavaSpot[];
  iceEffects: IceEffect[];
  stoneWalls: StoneWall[];
  scorePopups: ScorePopup[];
  blockedAdj: Set<string>;

  private nextId: number;
  private resolving: boolean;
  private resolveTimer: number;

  onGameOver?: (score: number) => void;
  onCombo?: () => void;

  constructor() {
    this.grid = [];
    this.score = 0;
    this.timeLeft = DURATION;
    this.isGameOver = false;
    this.isPlaying = false;
    this.selectedTalisman = null;
    this.lastMatchElement = null;
    this.leaderboard = this._loadLB();
    this.lavaSpots = [];
    this.iceEffects = [];
    this.stoneWalls = [];
    this.scorePopups = [];
    this.blockedAdj = new Set();
    this.nextId = 1;
    this.resolving = false;
    this.resolveTimer = 0;
    this._initGrid();
  }

  static isCounter(atk: ElementType, def: ElementType): boolean {
    return COUNTER_MAP[atk] === def;
  }

  static counterMap(): Record<ElementType, ElementType> { return { ...COUNTER_MAP }; }
  static get GRID() { return GRID; }
  static get DURATION() { return DURATION; }
  static get COLORS() { return { ...ELEMENT_COLORS }; }

  private _initGrid(): void {
    this.grid = [];
    for (let r = 0; r < GRID; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID; c++) this.grid[r][c] = null;
    }
    let tries = 0;
    do {
      for (let r = 0; r < GRID; r++)
        for (let c = 0; c < GRID; c++)
          this.grid[r][c] = this._make(r, c, true);
      tries++;
    } while (this._findAllMatches().length > 0 && tries < 200);
  }

  private _make(row: number, col: number, initial: boolean): Talisman {
    const els: ElementType[] = ['fire', 'water', 'wind', 'earth'];
    const element = els[Math.floor(Math.random() * els.length)];
    return {
      id: this.nextId++, element, row, col,
      isRemoving: false, removeProgress: 0,
      isNew: !initial, newProgress: initial ? 1 : 0,
      startRow: row, startCol: col,
      targetRow: row, targetCol: col,
      isMoving: false, moveProgress: 0, moveDuration: 0.3
    };
  }

  startGame(): void {
    this.score = 0;
    this.timeLeft = DURATION;
    this.isGameOver = false;
    this.isPlaying = true;
    this.selectedTalisman = null;
    this.lastMatchElement = null;
    this.lavaSpots = [];
    this.iceEffects = [];
    this.stoneWalls = [];
    this.scorePopups = [];
    this.blockedAdj = new Set();
    this.nextId = 1;
    this.resolving = false;
    this.resolveTimer = 0;
    this._initGrid();
  }

  update(dt: number): void {
    if (!this.isPlaying || this.isGameOver) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this._endGame(); return; }
    this._updateTalismans(dt);
    this._updateEffects(dt);
    if (this.resolving) {
      this.resolveTimer -= dt;
      if (this.resolveTimer <= 0) this._finishResolve();
    } else {
      this._tryResolve();
    }
  }

  private _updateTalismans(dt: number): void {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const t = this.grid[r][c];
        if (!t) continue;
        if (t.isRemoving) {
          t.removeProgress += dt / 0.15;
          if (t.removeProgress >= 1) this.grid[r][c] = null;
          continue;
        }
        if (t.isNew && t.newProgress < 1) {
          t.newProgress = Math.min(1, t.newProgress + dt / 0.3);
          if (t.newProgress >= 1) t.isNew = false;
        }
        if (t.isMoving) {
          t.moveProgress += dt / t.moveDuration;
          if (t.moveProgress >= 1) {
            t.moveProgress = 1;
            t.isMoving = false;
            t.row = t.targetRow;
            t.col = t.targetCol;
            t.startRow = t.targetRow;
            t.startCol = t.targetCol;
          }
        }
      }
    }
  }

  private _updateEffects(dt: number): void {
    this.lavaSpots = this.lavaSpots.filter(s => { s.life -= dt; return s.life > 0; });
    this.iceEffects = this.iceEffects.filter(e => { e.life -= dt; return e.life > 0; });
    const dead: StoneWall[] = [];
    this.stoneWalls = this.stoneWalls.filter(w => {
      w.life -= dt;
      if (w.life <= 0.5 && !w.isCollapsing) w.isCollapsing = true;
      if (w.life <= 0) { dead.push(w); return false; }
      return true;
    });
    for (const w of dead) this._removeWall(w);
    this.scorePopups = this.scorePopups.filter(p => { p.life -= dt; return p.life > 0; });
  }

  private _findAllMatches(): MatchGroup[] {
    const matches: MatchGroup[] = [];
    const used = new Set<string>();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const t = this.grid[r][c];
        if (!t || t.isRemoving) continue;
        if (used.has(`${r},${c}`)) continue;
        const found = this._bfsFind(r, c, t.element);
        for (const g of found) {
          let hasNew = false;
          for (const p of g.positions) {
            if (!used.has(`${p.row},${p.col}`)) { hasNew = true; break; }
          }
          if (!hasNew) continue;
          for (const p of g.positions) used.add(`${p.row},${p.col}`);
          matches.push(g);
        }
      }
    }
    return matches;
  }

  private _bfsFind(sr: number, sc: number, el: ElementType): MatchGroup[] {
    const results: MatchGroup[] = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    for (const [dr, dc] of dirs) {
      const line: Position[] = [{ row: sr, col: sc }];
      let r = sr + dr, c = sc + dc;
      while (r >= 0 && r < GRID && c >= 0 && c < GRID && this._ok(r, c, el) && this._conn(r - dr, c - dc, r, c)) {
        line.push({ row: r, col: c });
        r += dr; c += dc;
      }
      if (line.length >= 3) results.push({ element: el, positions: [...line] });

      for (let ti = 1; ti < line.length; ti++) {
        const tp = line[ti];
        const perpDr = dr === 0 ? 1 : 0;
        const perpDc = dc === 0 ? 1 : 0;
        for (const tdr of [perpDr, -perpDr]) {
          for (const tdc of [perpDc, -perpDc]) {
            if (tdr === 0 && tdc === 0) continue;
            if (Math.abs(tdr) + Math.abs(tdc) !== 1) continue;
            const lp: Position[] = [...line.slice(0, ti + 1)];
            let lr = tp.row + tdr, lc = tp.col + tdc;
            while (lr >= 0 && lr < GRID && lc >= 0 && lc < GRID && this._ok(lr, lc, el) && this._conn(lr - tdr, lc - tdc, lr, lc)) {
              lp.push({ row: lr, col: lc });
              lr += tdr; lc += tdc;
            }
            if (lp.length >= 3) {
              const u = new Map<string, Position>();
              for (const p of lp) u.set(`${p.row},${p.col}`, p);
              const d = Array.from(u.values());
              if (d.length >= 3) results.push({ element: el, positions: d });
            }
          }
        }
      }
    }
    if (results.length > 1) results.sort((a, b) => b.positions.length - a.positions.length);
    return results;
  }

  private _ok(r: number, c: number, el: ElementType): boolean {
    const t = this.grid[r][c];
    return t !== null && !t.isRemoving && t.element === el;
  }

  private _conn(r1: number, c1: number, r2: number, c2: number): boolean {
    if (r1 < 0 || r1 >= GRID || c1 < 0 || c1 >= GRID) return false;
    if (r2 < 0 || r2 >= GRID || c2 < 0 || c2 >= GRID) return false;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;
    return !this.blockedAdj.has(adjKey(r1, c1, r2, c2));
  }

  private _tryResolve(): void {
    const matches = this._findAllMatches();
    if (matches.length === 0) return;
    this.resolving = true;
    this.resolveTimer = 0.2;
    const all = new Set<string>();
    for (const m of matches) for (const p of m.positions) all.add(`${p.row},${p.col}`);
    let total = 0;
    let combo = false;
    for (const m of matches) {
      const n = m.positions.length;
      let pts = BASE_PTS + Math.max(0, n - 3) * EXTRA_PTS;
      if (this.lastMatchElement !== null && GameState.isCounter(m.element, this.lastMatchElement)) {
        pts *= 2;
        combo = true;
      }
      total += pts;
      this.lastMatchElement = m.element;
      this._fx(m);
    }
    this.score += total;
    const cp = matches[0].positions[Math.floor(matches[0].positions.length / 2)];
    this.scorePopups.push({ x: cp.col, y: cp.row, score: total, life: 0.5, maxLife: 0.5, isCombo: combo });
    if (combo && this.onCombo) this.onCombo();
    for (const k of all) {
      const [r, c] = k.split(',').map(Number);
      const t = this.grid[r][c];
      if (t && !t.isRemoving) { t.isRemoving = true; t.removeProgress = 0; }
    }
  }

  private _finishResolve(): void {
    this._dropFill();
    this.resolving = false;
  }

  private _fx(m: MatchGroup): void {
    switch (m.element) {
      case 'fire': this._fireFx(m); break;
      case 'water': this._waterFx(m); break;
      case 'wind': this._windFx(m); break;
      case 'earth': this._earthFx(m); break;
    }
  }

  private _fireFx(m: MatchGroup): void {
    for (const p of m.positions) this.lavaSpots.push({ x: p.col, y: p.row, life: 1.2, maxLife: 1.2 });
  }

  private _waterFx(m: MatchGroup): void {
    const adj = new Set<string>();
    for (const p of m.positions) {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = p.row + dr, nc = p.col + dc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) adj.add(`${nr},${nc}`);
      }
    }
    for (const k of adj) {
      const [r, c] = k.split(',').map(Number);
      this.iceEffects.push({ row: r, col: c, life: 2, maxLife: 2 });
    }
  }

  private _windFx(m: MatchGroup): void {
    const ctr = m.positions[Math.floor(m.positions.length / 2)];
    const moves: { from: Position; to: Position; t: Talisman }[] = [];
    const taken = new Set<string>();
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      for (let d = 1; d <= 2; d++) {
        const fr = ctr.row + dr * d, fc = ctr.col + dc * d;
        if (fr < 0 || fr >= GRID || fc < 0 || fc >= GRID) break;
        const t = this.grid[fr][fc];
        if (!t || t.isRemoving || t.isMoving) continue;
        const tr = ctr.row + dr * (d - 1), tc = ctr.col + dc * (d - 1);
        if (tr < 0 || tr >= GRID || tc < 0 || tc >= GRID) break;
        const tk = `${tr},${tc}`;
        if (taken.has(tk)) continue;
        const occ = this.grid[tr][tc];
        if (occ && !occ.isRemoving) continue;
        moves.push({ from: { row: fr, col: fc }, to: { row: tr, col: tc }, t });
        taken.add(tk);
      }
    }
    for (const mv of moves) {
      if (this.grid[mv.from.row][mv.from.col] !== mv.t) continue;
      mv.t.startRow = mv.from.row; mv.t.startCol = mv.from.col;
      mv.t.targetRow = mv.to.row; mv.t.targetCol = mv.to.col;
      mv.t.isMoving = true; mv.t.moveProgress = 0; mv.t.moveDuration = 0.5;
      this.grid[mv.to.row][mv.to.col] = mv.t;
      this.grid[mv.from.row][mv.from.col] = null;
    }
  }

  private _earthFx(m: MatchGroup): void {
    const ds: Array<'horizontal' | 'vertical'> = ['horizontal', 'vertical'];
    for (const p of m.positions) {
      const dir = ds[Math.floor(Math.random() * ds.length)];
      const w: StoneWall = { row: p.row, col: p.col, direction: dir, life: 3, maxLife: 3, isCollapsing: false };
      this.stoneWalls.push(w);
      this._addWall(w);
    }
  }

  private _addWall(w: StoneWall): void {
    const { row, col, direction } = w;
    if (direction === 'horizontal') {
      if (col - 1 >= 0) this.blockedAdj.add(adjKey(row, col - 1, row, col));
      if (col + 1 < GRID) this.blockedAdj.add(adjKey(row, col, row, col + 1));
    } else {
      if (row - 1 >= 0) this.blockedAdj.add(adjKey(row - 1, col, row, col));
      if (row + 1 < GRID) this.blockedAdj.add(adjKey(row, col, row + 1, col));
    }
  }

  private _removeWall(w: StoneWall): void {
    const { row, col, direction } = w;
    if (direction === 'horizontal') {
      if (col - 1 >= 0) this.blockedAdj.delete(adjKey(row, col - 1, row, col));
      if (col + 1 < GRID) this.blockedAdj.delete(adjKey(row, col, row, col + 1));
    } else {
      if (row - 1 >= 0) this.blockedAdj.delete(adjKey(row - 1, col, row, col));
      if (row + 1 < GRID) this.blockedAdj.delete(adjKey(row, col, row + 1, col));
    }
  }

  private _dropFill(): void {
    for (let c = 0; c < GRID; c++) {
      let wr = GRID - 1;
      for (let r = GRID - 1; r >= 0; r--) {
        const t = this.grid[r][c];
        if (t && !t.isRemoving) {
          if (r !== wr) {
            this.grid[wr][c] = t; this.grid[r][c] = null;
            t.startRow = r; t.startCol = c;
            t.targetRow = wr; t.targetCol = c;
            t.isMoving = true; t.moveProgress = 0; t.moveDuration = 0.3;
          }
          wr--;
        }
      }
    }
    for (let c = 0; c < GRID; c++) {
      let emp = 0;
      for (let r = 0; r < GRID; r++) if (!this.grid[r][c]) emp++;
      let idx = 0;
      for (let r = 0; r < GRID; r++) {
        if (!this.grid[r][c]) {
          const sr = -emp + idx;
          const t = this._make(sr, c, false);
          t.startRow = sr; t.startCol = c;
          t.targetRow = r; t.targetCol = c;
          t.isMoving = true; t.moveProgress = 0; t.moveDuration = 0.4;
          t.isNew = true; t.newProgress = 0;
          this.grid[r][c] = t;
          idx++;
        }
      }
    }
  }

  selectTalisman(row: number, col: number): boolean {
    if (!this.isPlaying || this.isGameOver || this.resolving) return false;
    const t = this.grid[row][col];
    if (!t || t.isRemoving || t.isMoving) return false;
    if (this.selectedTalisman) {
      if (this.selectedTalisman.id === t.id) { this.selectedTalisman = null; return true; }
      if (this._adj(this.selectedTalisman, t)) {
        this._swap(this.selectedTalisman, t);
        this.selectedTalisman = null;
        return true;
      }
      this.selectedTalisman = t;
      return true;
    }
    this.selectedTalisman = t;
    return true;
  }

  private _adj(a: Talisman, b: Talisman): boolean {
    return (Math.abs(a.row - b.row) + Math.abs(a.col - b.col)) === 1;
  }

  private _swap(a: Talisman, b: Talisman): void {
    const ra = a.row, ca = a.col, rb = b.row, cb = b.col;
    this.grid[ra][ca] = b; this.grid[rb][cb] = a;
    a.row = rb; a.col = cb; a.startRow = rb; a.startCol = cb; a.targetRow = rb; a.targetCol = cb;
    b.row = ra; b.col = ca; b.startRow = ra; b.startCol = ca; b.targetRow = ra; b.targetCol = ca;
    if (this._findAllMatches().length === 0) {
      this.grid[ra][ca] = a; this.grid[rb][cb] = b;
      a.row = ra; a.col = ca; a.startRow = ra; a.startCol = ca; a.targetRow = ra; a.targetCol = ca;
      b.row = rb; b.col = cb; b.startRow = rb; b.startCol = cb; b.targetRow = rb; b.targetCol = cb;
    }
  }

  private _endGame(): void {
    this.isGameOver = true; this.isPlaying = false;
    this._saveLB(this.score);
    if (this.onGameOver) this.onGameOver(this.score);
  }

  private _loadLB(): number[] {
    try { const s = localStorage.getItem(LB_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  }

  private _saveLB(score: number): void {
    this.leaderboard.push(score);
    this.leaderboard.sort((a, b) => b - a);
    this.leaderboard = this.leaderboard.slice(0, 5);
    try { localStorage.setItem(LB_KEY, JSON.stringify(this.leaderboard)); } catch { /* */ }
  }

  getRank(score: number): number {
    let rank = 1;
    for (const s of this.leaderboard) if (score < s) rank++;
    return rank;
  }
}
