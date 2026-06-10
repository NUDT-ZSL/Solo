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

export interface Position {
  row: number;
  col: number;
}

export interface MatchGroup {
  element: ElementType;
  positions: Position[];
  matchType: 'horizontal' | 'vertical' | 'lshape';
}

export interface LavaSpot {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface IceEffect {
  row: number;
  col: number;
  life: number;
  maxLife: number;
}

export interface StoneWall {
  row: number;
  col: number;
  direction: 'horizontal' | 'vertical';
  life: number;
  maxLife: number;
  isCollapsing: boolean;
}

export interface ScorePopup {
  x: number;
  y: number;
  score: number;
  life: number;
  maxLife: number;
  isCombo: boolean;
}

export type AdjacencyKey = string;

const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#FF4500',
  water: '#00BFFF',
  wind: '#32CD32',
  earth: '#8B4513'
};

const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  wind: '风',
  earth: '土'
};

const ELEMENT_COUNTER: Record<ElementType, ElementType> = {
  fire: 'wind',
  wind: 'earth',
  earth: 'water',
  water: 'fire'
};

const GRID_SIZE = 7;
const GAME_DURATION = 60;
const BASE_SCORE = 30;
const BONUS_SCORE = 15;
const LEADERBOARD_KEY = 'talisman_stack_leaderboard';

function adjKey(r1: number, c1: number, r2: number, c2: number): AdjacencyKey {
  if (r1 < r2 || (r1 === r2 && c1 < c2)) {
    return `${r1},${c1}-${r2},${c2}`;
  }
  return `${r2},${c2}-${r1},${c1}`;
}

export class GameState {
  grid: (Talisman | null)[][];
  score: number;
  timeLeft: number;
  isGameOver: boolean;
  isPlaying: boolean;
  selectedTalisman: Talisman | null;
  lastMatchedElement: ElementType | null;
  leaderboard: number[];

  lavaSpots: LavaSpot[];
  iceEffects: IceEffect[];
  stoneWalls: StoneWall[];
  scorePopups: ScorePopup[];
  blockedAdjacencies: Set<AdjacencyKey>;

  private nextId: number;
  private isResolving: boolean;
  private resolveTimer: number;

  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
  onCombo?: () => void;

  constructor() {
    this.grid = [];
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.isGameOver = false;
    this.isPlaying = false;
    this.selectedTalisman = null;
    this.lastMatchedElement = null;
    this.leaderboard = this.loadLeaderboard();

    this.lavaSpots = [];
    this.iceEffects = [];
    this.stoneWalls = [];
    this.scorePopups = [];
    this.blockedAdjacencies = new Set();

    this.nextId = 1;
    this.isResolving = false;
    this.resolveTimer = 0;

    this.initGrid();
  }

  private initGrid(): void {
    this.grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        this.grid[r][c] = null;
      }
    }

    let attempts = 0;
    do {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          this.grid[r][c] = this.createTalisman(r, c, true);
        }
      }
      attempts++;
    } while (this.findAllMatches().length > 0 && attempts < 100);
  }

  private createTalisman(row: number, col: number, initial: boolean = false): Talisman {
    const elements: ElementType[] = ['fire', 'water', 'wind', 'earth'];
    const element = elements[Math.floor(Math.random() * elements.length)];

    return {
      id: this.nextId++,
      element,
      row,
      col,
      isRemoving: false,
      removeProgress: 0,
      isNew: !initial,
      newProgress: initial ? 1 : 0,
      startRow: row,
      startCol: col,
      targetRow: row,
      targetCol: col,
      isMoving: false,
      moveProgress: 0,
      moveDuration: 0.3
    };
  }

  startGame(): void {
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.isGameOver = false;
    this.isPlaying = true;
    this.selectedTalisman = null;
    this.lastMatchedElement = null;
    this.lavaSpots = [];
    this.iceEffects = [];
    this.stoneWalls = [];
    this.scorePopups = [];
    this.blockedAdjacencies = new Set();
    this.nextId = 1;
    this.isResolving = false;
    this.resolveTimer = 0;
    this.initGrid();
  }

  update(deltaTime: number): void {
    if (!this.isPlaying || this.isGameOver) return;

    this.timeLeft -= deltaTime;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endGame();
      return;
    }

    this.updateTalismans(deltaTime);
    this.updateEffects(deltaTime);

    if (this.isResolving) {
      this.resolveTimer -= deltaTime;
      if (this.resolveTimer <= 0) {
        this.finishResolve();
      }
    } else {
      this.checkAndResolveMatches();
    }
  }

  private updateTalismans(deltaTime: number): void {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const t = this.grid[r][c];
        if (!t) continue;

        if (t.isRemoving) {
          t.removeProgress += deltaTime / 0.15;
          if (t.removeProgress >= 1) {
            this.grid[r][c] = null;
          }
          continue;
        }

        if (t.isNew && t.newProgress < 1) {
          t.newProgress = Math.min(1, t.newProgress + deltaTime / 0.3);
          if (t.newProgress >= 1) t.isNew = false;
        }

        if (t.isMoving) {
          t.moveProgress += deltaTime / t.moveDuration;
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

  private updateEffects(deltaTime: number): void {
    this.lavaSpots = this.lavaSpots.filter(s => {
      s.life -= deltaTime;
      return s.life > 0;
    });

    this.iceEffects = this.iceEffects.filter(e => {
      e.life -= deltaTime;
      return e.life > 0;
    });

    const wallsToRemove: StoneWall[] = [];
    this.stoneWalls = this.stoneWalls.filter(w => {
      w.life -= deltaTime;
      if (w.life <= 0.5 && !w.isCollapsing) {
        w.isCollapsing = true;
      }
      if (w.life <= 0) {
        wallsToRemove.push(w);
        return false;
      }
      return true;
    });

    for (const w of wallsToRemove) {
      this.removeWallBlock(w);
    }

    this.scorePopups = this.scorePopups.filter(p => {
      p.life -= deltaTime;
      return p.life > 0;
    });
  }

  static isCounter(attackElement: ElementType, defenseElement: ElementType): boolean {
    return ELEMENT_COUNTER[attackElement] === defenseElement;
  }

  static getCounterMap(): Record<ElementType, ElementType> {
    return { ...ELEMENT_COUNTER };
  }

  static getElementName(e: ElementType): string {
    return ELEMENT_NAMES[e];
  }

  private checkAndResolveMatches(): void {
    const matches = this.findAllMatches();
    if (matches.length === 0) return;

    this.isResolving = true;
    this.resolveTimer = 0.2;

    const allPositions = new Set<string>();
    for (const m of matches) {
      for (const p of m.positions) {
        allPositions.add(`${p.row},${p.col}`);
      }
    }

    let totalScore = 0;
    let hasCombo = false;

    for (const m of matches) {
      const count = m.positions.length;
      let matchScore = BASE_SCORE + Math.max(0, count - 3) * BONUS_SCORE;

      if (this.lastMatchedElement !== null &&
          GameState.isCounter(m.element, this.lastMatchedElement)) {
        matchScore *= 2;
        hasCombo = true;
      }

      totalScore += matchScore;
      this.lastMatchedElement = m.element;
      this.triggerElementEffect(m);
    }

    this.score += totalScore;

    const fm = matches[0];
    const cp = fm.positions[Math.floor(fm.positions.length / 2)];
    this.scorePopups.push({
      x: cp.col,
      y: cp.row,
      score: totalScore,
      life: 0.5,
      maxLife: 0.5,
      isCombo: hasCombo
    });

    if (hasCombo && this.onCombo) {
      this.onCombo();
    }

    for (const key of allPositions) {
      const [r, c] = key.split(',').map(Number);
      const t = this.grid[r][c];
      if (t && !t.isRemoving) {
        t.isRemoving = true;
        t.removeProgress = 0;
      }
    }
  }

  private finishResolve(): void {
    this.dropTalismans();
    this.fillEmptySpaces();
    this.isResolving = false;
  }

  findAllMatches(): MatchGroup[] {
    const matches: MatchGroup[] = [];
    const usedCells = new Set<string>();

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (usedCells.has(`${r},${c}`)) continue;
        const t = this.grid[r][c];
        if (!t || t.isRemoving) continue;

        const lineMatches = this.findLineMatches(r, c, t.element);
        for (const lm of lineMatches) {
          if (!this.hasAnyOverlap(usedCells, lm.positions)) {
            this.markUsed(usedCells, lm.positions);
            matches.push(lm);
          }
        }

        if (!usedCells.has(`${r},${c}`)) {
          const lmatches = this.findLShapedMatches(r, c, t.element);
          for (const lm of lmatches) {
            if (!this.hasAnyOverlap(usedCells, lm.positions)) {
              this.markUsed(usedCells, lm.positions);
              matches.push(lm);
              break;
            }
          }
        }
      }
    }

    return matches;
  }

  private findLineMatches(row: number, col: number, element: ElementType): MatchGroup[] {
    const results: MatchGroup[] = [];

    const hPositions: Position[] = [{ row, col }];
    for (let c = col + 1; c < GRID_SIZE; c++) {
      if (!this.isMatchable(row, c, element)) break;
      hPositions.push({ row, col: c });
    }
    for (let c = col - 1; c >= 0; c--) {
      if (!this.isMatchable(row, c, element)) break;
      hPositions.unshift({ row, col: c });
    }
    if (hPositions.length >= 3) {
      results.push({ element, positions: hPositions, matchType: 'horizontal' });
    }

    const vPositions: Position[] = [{ row, col }];
    for (let r = row + 1; r < GRID_SIZE; r++) {
      if (!this.isMatchable(r, col, element)) break;
      vPositions.push({ row: r, col });
    }
    for (let r = row - 1; r >= 0; r--) {
      if (!this.isMatchable(r, col, element)) break;
      vPositions.unshift({ row: r, col });
    }
    if (vPositions.length >= 3) {
      results.push({ element, positions: vPositions, matchType: 'vertical' });
    }

    return results;
  }

  private findLShapedMatches(row: number, col: number, element: ElementType): MatchGroup[] {
    const results: MatchGroup[] = [];

    const right = this.countDirection(row, col, 0, 1, element);
    const left = this.countDirection(row, col, 0, -1, element);
    const down = this.countDirection(row, col, 1, 0, element);
    const up = this.countDirection(row, col, -1, 0, element);

    if (right >= 1 && down >= 1) {
      for (let r = 1; r <= right; r++) {
        for (let d = 1; d <= down; d++) {
          if (r + d + 1 >= 3) {
            const positions: Position[] = [{ row, col }];
            for (let i = 1; i <= r; i++) positions.push({ row, col: col + i });
            for (let i = 1; i <= d; i++) positions.push({ row: row + i, col: col + r });
            results.push({ element, positions, matchType: 'lshape' });
          }
        }
      }
    }

    if (right >= 1 && up >= 1) {
      for (let r = 1; r <= right; r++) {
        for (let u = 1; u <= up; u++) {
          if (r + u + 1 >= 3) {
            const positions: Position[] = [{ row, col }];
            for (let i = 1; i <= r; i++) positions.push({ row, col: col + i });
            for (let i = 1; i <= u; i++) positions.push({ row: row - i, col: col + r });
            results.push({ element, positions, matchType: 'lshape' });
          }
        }
      }
    }

    if (left >= 1 && down >= 1) {
      for (let l = 1; l <= left; l++) {
        for (let d = 1; d <= down; d++) {
          if (l + d + 1 >= 3) {
            const positions: Position[] = [{ row, col }];
            for (let i = 1; i <= l; i++) positions.push({ row, col: col - i });
            for (let i = 1; i <= d; i++) positions.push({ row: row + i, col: col - l });
            results.push({ element, positions, matchType: 'lshape' });
          }
        }
      }
    }

    if (left >= 1 && up >= 1) {
      for (let l = 1; l <= left; l++) {
        for (let u = 1; u <= up; u++) {
          if (l + u + 1 >= 3) {
            const positions: Position[] = [{ row, col }];
            for (let i = 1; i <= l; i++) positions.push({ row, col: col - i });
            for (let i = 1; i <= u; i++) positions.push({ row: row - i, col: col - l });
            results.push({ element, positions, matchType: 'lshape' });
          }
        }
      }
    }

    results.sort((a, b) => b.positions.length - a.positions.length);
    return results;
  }

  private countDirection(row: number, col: number, dr: number, dc: number, element: ElementType): number {
    let count = 0;
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      if (!this.isConnected(row, col, r, c)) break;
      if (!this.isMatchable(r, c, element)) break;
      count++;
      r += dr;
      c += dc;
    }
    return count;
  }

  private isMatchable(row: number, col: number, element: ElementType): boolean {
    const t = this.grid[row][col];
    return t !== null && !t.isRemoving && t.element === element;
  }

  isConnected(r1: number, c1: number, r2: number, c2: number): boolean {
    if (r1 < 0 || r1 >= GRID_SIZE || c1 < 0 || c1 >= GRID_SIZE) return false;
    if (r2 < 0 || r2 >= GRID_SIZE || c2 < 0 || c2 >= GRID_SIZE) return false;
    const rd = Math.abs(r1 - r2);
    const cd = Math.abs(c1 - c2);
    if (rd + cd !== 1) return false;
    return !this.blockedAdjacencies.has(adjKey(r1, c1, r2, c2));
  }

  private hasAnyOverlap(used: Set<string>, positions: Position[]): boolean {
    for (const p of positions) {
      if (used.has(`${p.row},${p.col}`)) return true;
    }
    return false;
  }

  private markUsed(used: Set<string>, positions: Position[]): void {
    for (const p of positions) {
      used.add(`${p.row},${p.col}`);
    }
  }

  private triggerElementEffect(match: MatchGroup): void {
    switch (match.element) {
      case 'fire': this.fireEffect(match); break;
      case 'water': this.waterEffect(match); break;
      case 'wind': this.windEffect(match); break;
      case 'earth': this.earthEffect(match); break;
    }
  }

  private fireEffect(match: MatchGroup): void {
    for (const p of match.positions) {
      this.lavaSpots.push({
        x: p.col,
        y: p.row,
        life: 1.2,
        maxLife: 1.2
      });
    }
  }

  private waterEffect(match: MatchGroup): void {
    const adj = new Set<string>();
    for (const p of match.positions) {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = p.row + dr;
        const nc = p.col + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          adj.add(`${nr},${nc}`);
        }
      }
    }
    for (const k of adj) {
      const [r, c] = k.split(',').map(Number);
      this.iceEffects.push({ row: r, col: c, life: 2, maxLife: 2 });
    }
  }

  private windEffect(match: MatchGroup): void {
    const center = match.positions[Math.floor(match.positions.length / 2)];
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    const plannedMoves: Array<{ from: Position; to: Position; t: Talisman }> = [];
    const occupiedTargets = new Set<string>();

    for (const d of dirs) {
      for (let dist = 1; dist <= 2; dist++) {
        const fr = center.row + d.dr * dist;
        const fc = center.col + d.dc * dist;
        if (fr < 0 || fr >= GRID_SIZE || fc < 0 || fc >= GRID_SIZE) break;

        const t = this.grid[fr][fc];
        if (!t || t.isRemoving || t.isMoving) continue;

        const tr = center.row + d.dr * (dist - 1);
        const tc = center.col + d.dc * (dist - 1);
        if (tr < 0 || tr >= GRID_SIZE || tc < 0 || tc >= GRID_SIZE) break;

        const targetKey = `${tr},${tc}`;
        if (occupiedTargets.has(targetKey)) continue;

        const occupyingTalisman = this.grid[tr][tc];
        if (occupyingTalisman && !occupyingTalisman.isRemoving) continue;

        plannedMoves.push({
          from: { row: fr, col: fc },
          to: { row: tr, col: tc },
          t
        });
        occupiedTargets.add(targetKey);
      }
    }

    for (const m of plannedMoves) {
      if (this.grid[m.from.row][m.from.col] === m.t) {
        m.t.startRow = m.from.row;
        m.t.startCol = m.from.col;
        m.t.targetRow = m.to.row;
        m.t.targetCol = m.to.col;
        m.t.isMoving = true;
        m.t.moveProgress = 0;
        m.t.moveDuration = 0.5;

        this.grid[m.to.row][m.to.col] = m.t;
        this.grid[m.from.row][m.from.col] = null;
      }
    }
  }

  private earthEffect(match: MatchGroup): void {
    const dirs: Array<'horizontal' | 'vertical'> = ['horizontal', 'vertical'];

    for (const p of match.positions) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const wall: StoneWall = {
        row: p.row,
        col: p.col,
        direction: dir,
        life: 3,
        maxLife: 3,
        isCollapsing: false
      };
      this.stoneWalls.push(wall);
      this.addWallBlock(wall);
    }
  }

  private addWallBlock(wall: StoneWall): void {
    const { row, col, direction } = wall;
    if (direction === 'horizontal') {
      if (col - 1 >= 0) {
        this.blockedAdjacencies.add(adjKey(row, col - 1, row, col));
      }
      if (col + 1 < GRID_SIZE) {
        this.blockedAdjacencies.add(adjKey(row, col, row, col + 1));
      }
    } else {
      if (row - 1 >= 0) {
        this.blockedAdjacencies.add(adjKey(row - 1, col, row, col));
      }
      if (row + 1 < GRID_SIZE) {
        this.blockedAdjacencies.add(adjKey(row, col, row + 1, col));
      }
    }
  }

  private removeWallBlock(wall: StoneWall): void {
    const { row, col, direction } = wall;
    if (direction === 'horizontal') {
      if (col - 1 >= 0) {
        this.blockedAdjacencies.delete(adjKey(row, col - 1, row, col));
      }
      if (col + 1 < GRID_SIZE) {
        this.blockedAdjacencies.delete(adjKey(row, col, row, col + 1));
      }
    } else {
      if (row - 1 >= 0) {
        this.blockedAdjacencies.delete(adjKey(row - 1, col, row, col));
      }
      if (row + 1 < GRID_SIZE) {
        this.blockedAdjacencies.delete(adjKey(row, col, row + 1, col));
      }
    }
  }

  private dropTalismans(): void {
    for (let c = 0; c < GRID_SIZE; c++) {
      let writeRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        const t = this.grid[r][c];
        if (t && !t.isRemoving) {
          if (r !== writeRow) {
            this.grid[writeRow][c] = t;
            this.grid[r][c] = null;
            t.startRow = r;
            t.startCol = c;
            t.targetRow = writeRow;
            t.targetCol = c;
            t.isMoving = true;
            t.moveProgress = 0;
            t.moveDuration = 0.3;
          }
          writeRow--;
        }
      }
    }
  }

  private fillEmptySpaces(): void {
    for (let c = 0; c < GRID_SIZE; c++) {
      let emptyCount = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!this.grid[r][c]) emptyCount++;
      }
      let idx = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!this.grid[r][c]) {
          const startR = -emptyCount + idx;
          const t = this.createTalisman(startR, c);
          t.startRow = startR;
          t.startCol = c;
          t.targetRow = r;
          t.targetCol = c;
          t.isMoving = true;
          t.moveProgress = 0;
          t.moveDuration = 0.4;
          t.isNew = true;
          t.newProgress = 0;
          this.grid[r][c] = t;
          idx++;
        }
      }
    }
  }

  selectTalisman(row: number, col: number): boolean {
    if (!this.isPlaying || this.isGameOver || this.isResolving) return false;

    const t = this.grid[row][col];
    if (!t || t.isRemoving || t.isMoving) return false;

    if (this.selectedTalisman) {
      if (this.selectedTalisman.id === t.id) {
        this.selectedTalisman = null;
        return true;
      }
      if (this.isAdjacent(this.selectedTalisman, t)) {
        this.swapTalismans(this.selectedTalisman, t);
        this.selectedTalisman = null;
        return true;
      }
      this.selectedTalisman = t;
      return true;
    }
    this.selectedTalisman = t;
    return true;
  }

  private isAdjacent(a: Talisman, b: Talisman): boolean {
    const rd = Math.abs(a.row - b.row);
    const cd = Math.abs(a.col - b.col);
    return (rd === 1 && cd === 0) || (rd === 0 && cd === 1);
  }

  private swapTalismans(a: Talisman, b: Talisman): void {
    const ra = a.row, ca = a.col;
    const rb = b.row, cb = b.col;

    this.grid[ra][ca] = b;
    this.grid[rb][cb] = a;
    a.row = rb; a.col = cb;
    b.row = ra; b.col = ca;
    a.startRow = rb; a.startCol = cb;
    a.targetRow = rb; a.targetCol = cb;
    b.startRow = ra; b.startCol = ca;
    b.targetRow = ra; b.targetCol = ca;

    const matches = this.findAllMatches();
    if (matches.length === 0) {
      this.grid[ra][ca] = a;
      this.grid[rb][cb] = b;
      a.row = ra; a.col = ca;
      b.row = rb; b.col = cb;
      a.startRow = ra; a.startCol = ca;
      a.targetRow = ra; a.targetCol = ca;
      b.startRow = rb; b.startCol = cb;
      b.targetRow = rb; b.targetCol = cb;
    }
  }

  private endGame(): void {
    this.isGameOver = true;
    this.isPlaying = false;
    this.saveScore(this.score);
    if (this.onGameOver) this.onGameOver(this.score);
  }

  private loadLeaderboard(): number[] {
    try {
      const s = localStorage.getItem(LEADERBOARD_KEY);
      if (s) return JSON.parse(s);
    } catch (e) { /* ignore */ }
    return [];
  }

  private saveScore(score: number): void {
    this.leaderboard.push(score);
    this.leaderboard.sort((x, y) => y - x);
    this.leaderboard = this.leaderboard.slice(0, 5);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.leaderboard));
    } catch (e) { /* ignore */ }
  }

  getRank(score: number): number {
    let rank = 1;
    for (const s of this.leaderboard) {
      if (score < s) rank++;
    }
    return rank;
  }

  static get GRID_SIZE(): number { return GRID_SIZE; }
  static get GAME_DURATION(): number { return GAME_DURATION; }
  static get ELEMENT_COLORS(): Record<ElementType, string> { return { ...ELEMENT_COLORS }; }
}
