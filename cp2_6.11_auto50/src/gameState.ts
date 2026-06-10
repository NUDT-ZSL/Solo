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
  targetRow: number;
  targetCol: number;
  isMoving: boolean;
  moveProgress: number;
}

export interface Position {
  row: number;
  col: number;
}

export interface MatchGroup {
  element: ElementType;
  positions: Position[];
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

const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#FF4500',
  water: '#00BFFF',
  wind: '#32CD32',
  earth: '#8B4513'
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

export class GameState {
  grid: (Talisman | null)[][];
  score: number;
  timeLeft: number;
  isGameOver: boolean;
  isPlaying: boolean;
  selectedTalisman: Talisman | null;
  lastElement: ElementType | null;
  leaderboard: number[];
  
  lavaSpots: LavaSpot[];
  iceEffects: IceEffect[];
  stoneWalls: StoneWall[];
  scorePopups: ScorePopup[];
  
  private nextId: number;
  private isResolving: boolean;
  private resolveTimer: number;
  
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;

  constructor() {
    this.grid = [];
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.isGameOver = false;
    this.isPlaying = false;
    this.selectedTalisman = null;
    this.lastElement = null;
    this.leaderboard = this.loadLeaderboard();
    
    this.lavaSpots = [];
    this.iceEffects = [];
    this.stoneWalls = [];
    this.scorePopups = [];
    
    this.nextId = 1;
    this.isResolving = false;
    this.resolveTimer = 0;
    
    this.initGrid();
  }

  private initGrid(): void {
    this.grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grid[row][col] = null;
      }
    }
    
    let attempts = 0;
    do {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          this.grid[row][col] = this.createTalisman(row, col, true);
        }
      }
      attempts++;
    } while (this.findMatches().length > 0 && attempts < 100);
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
      targetRow: row,
      targetCol: col,
      isMoving: false,
      moveProgress: 0
    };
  }

  startGame(): void {
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.isGameOver = false;
    this.isPlaying = true;
    this.selectedTalisman = null;
    this.lastElement = null;
    this.lavaSpots = [];
    this.iceEffects = [];
    this.stoneWalls = [];
    this.scorePopups = [];
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
        this.continueResolve();
      }
    } else {
      this.checkAndResolveMatches();
    }
  }

  private updateTalismans(deltaTime: number): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const talisman = this.grid[row][col];
        if (!talisman) continue;

        if (talisman.isRemoving) {
          talisman.removeProgress += deltaTime / 0.15;
          if (talisman.removeProgress >= 1) {
            this.grid[row][col] = null;
          }
        }

        if (talisman.isNew && talisman.newProgress < 1) {
          talisman.newProgress += deltaTime / 0.3;
          if (talisman.newProgress >= 1) {
            talisman.newProgress = 1;
            talisman.isNew = false;
          }
        }

        if (talisman.isMoving) {
          talisman.moveProgress += deltaTime * 3;
          if (talisman.moveProgress >= 1) {
            talisman.moveProgress = 1;
            talisman.isMoving = false;
            talisman.row = talisman.targetRow;
            talisman.col = talisman.targetCol;
          }
        }
      }
    }
  }

  private updateEffects(deltaTime: number): void {
    this.lavaSpots = this.lavaSpots.filter(spot => {
      spot.life -= deltaTime;
      return spot.life > 0;
    });

    this.iceEffects = this.iceEffects.filter(effect => {
      effect.life -= deltaTime;
      return effect.life > 0;
    });

    this.stoneWalls = this.stoneWalls.filter(wall => {
      wall.life -= deltaTime;
      if (wall.life <= 0.5 && !wall.isCollapsing) {
        wall.isCollapsing = true;
      }
      return wall.life > 0;
    });

    this.scorePopups = this.scorePopups.filter(popup => {
      popup.life -= deltaTime;
      return popup.life > 0;
    });
  }

  private checkAndResolveMatches(): void {
    const matches = this.findMatches();
    if (matches.length === 0) return;

    this.isResolving = true;
    this.resolveTimer = 0.2;

    const allPositions = new Set<string>();

    for (const match of matches) {
      for (const pos of match.positions) {
        allPositions.add(`${pos.row},${pos.col}`);
      }
    }

    let totalScore = 0;
    let hasCombo = false;

    for (const match of matches) {
      const count = match.positions.length;
      let matchScore = BASE_SCORE + (count - 3) * BONUS_SCORE;

      if (this.lastElement && ELEMENT_COUNTER[match.element] === this.lastElement) {
        matchScore *= 2;
        hasCombo = true;
      }

      totalScore += matchScore;
      this.lastElement = match.element;
      this.triggerElementEffect(match);
    }

    this.score += totalScore;

    const firstMatch = matches[0];
    const centerPos = firstMatch.positions[Math.floor(firstMatch.positions.length / 2)];
    this.scorePopups.push({
      x: centerPos.col,
      y: centerPos.row,
      score: totalScore,
      life: 0.5,
      maxLife: 0.5,
      isCombo: hasCombo
    });

    for (const posKey of allPositions) {
      const [row, col] = posKey.split(',').map(Number);
      const talisman = this.grid[row][col];
      if (talisman && !talisman.isRemoving) {
        talisman.isRemoving = true;
        talisman.removeProgress = 0;
      }
    }
  }

  private continueResolve(): void {
    this.dropTalismans();
    this.fillEmptySpaces();
    this.isResolving = false;
  }

  private findMatches(): MatchGroup[] {
    const matches: MatchGroup[] = [];
    const visitedPositions = new Set<string>();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const talisman = this.grid[row][col];
        if (!talisman || talisman.isRemoving) continue;

        const horizontalMatch = this.findHorizontalMatch(row, col);
        if (horizontalMatch.length >= 3) {
          if (!this.hasOverlap(visitedPositions, horizontalMatch)) {
            this.addPositionsToSet(visitedPositions, horizontalMatch);
            matches.push({
              element: talisman.element,
              positions: horizontalMatch
            });
          }
        }

        const verticalMatch = this.findVerticalMatch(row, col);
        if (verticalMatch.length >= 3) {
          if (!this.hasOverlap(visitedPositions, verticalMatch)) {
            this.addPositionsToSet(visitedPositions, verticalMatch);
            matches.push({
              element: talisman.element,
              positions: verticalMatch
            });
          }
        }

        const lMatches = this.findLShapedMatches(row, col);
        for (const lMatch of lMatches) {
          if (!this.hasOverlap(visitedPositions, lMatch)) {
            this.addPositionsToSet(visitedPositions, lMatch);
            matches.push({
              element: talisman.element,
              positions: lMatch
            });
          }
        }
      }
    }

    return matches;
  }

  private addPositionsToSet(set: Set<string>, positions: Position[]): void {
    for (const pos of positions) {
      set.add(`${pos.row},${pos.col}`);
    }
  }

  private hasOverlap(visited: Set<string>, positions: Position[]): boolean {
    for (const pos of positions) {
      const key = `${pos.row},${pos.col}`;
      if (visited.has(key)) return true;
    }
    return false;
  }

  private findHorizontalMatch(row: number, col: number): Position[] {
    const talisman = this.grid[row][col];
    if (!talisman) return [];

    const positions: Position[] = [{ row, col }];
    const element = talisman.element;

    for (let c = col + 1; c < GRID_SIZE; c++) {
      const t = this.grid[row][c];
      if (t && t.element === element && !t.isRemoving) {
        positions.push({ row, col: c });
      } else {
        break;
      }
    }

    return positions;
  }

  private findVerticalMatch(row: number, col: number): Position[] {
    const talisman = this.grid[row][col];
    if (!talisman) return [];

    const positions: Position[] = [{ row, col }];
    const element = talisman.element;

    for (let r = row + 1; r < GRID_SIZE; r++) {
      const t = this.grid[r][col];
      if (t && t.element === element && !t.isRemoving) {
        positions.push({ row: r, col });
      } else {
        break;
      }
    }

    return positions;
  }

  private findLShapedMatches(row: number, col: number): Position[][] {
    const results: Position[][] = [];
    const element = this.grid[row][col]?.element;
    if (!element) return results;

    const directions = [
      { dr: 1, dc: 0 },
      { dr: -1, dc: 0 },
      { dr: 0, dc: 1 },
      { dr: 0, dc: -1 }
    ];

    for (let i = 0; i < directions.length; i++) {
      for (let j = 0; j < directions.length; j++) {
        if (i === j) continue;
        const d1 = directions[i];
        const d2 = directions[j];
        
        if (d1.dr === -d2.dr && d1.dc === -d2.dc) continue;

        for (let len1 = 2; len1 <= 4; len1++) {
          for (let len2 = 2; len2 <= 4; len2++) {
            const match = this.tryLMatch(row, col, d1, len1, d2, len2, element);
            if (match && match.length >= 3) {
              results.push(match);
            }
          }
        }
      }
    }

    return results;
  }

  private tryLMatch(
    row: number,
    col: number,
    dir1: { dr: number; dc: number },
    len1: number,
    dir2: { dr: number; dc: number },
    len2: number,
    element: ElementType
  ): Position[] | null {
    const positions: Position[] = [{ row, col }];

    let r = row;
    let c = col;

    for (let i = 1; i < len1; i++) {
      r += dir1.dr;
      c += dir1.dc;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
      const t = this.grid[r][c];
      if (!t || t.element !== element || t.isRemoving) return null;
      positions.push({ row: r, col: c });
    }

    for (let i = 1; i < len2; i++) {
      r += dir2.dr;
      c += dir2.dc;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
      const t = this.grid[r][c];
      if (!t || t.element !== element || t.isRemoving) return null;
      positions.push({ row: r, col: c });
    }

    if (positions.length < 3) return null;
    
    const uniquePositions = new Set(positions.map(p => `${p.row},${p.col}`));
    if (uniquePositions.size !== positions.length) return null;

    return positions;
  }

  private triggerElementEffect(match: MatchGroup): void {
    const element = match.element;

    switch (element) {
      case 'fire':
        this.triggerFireEffect(match);
        break;
      case 'water':
        this.triggerWaterEffect(match);
        break;
      case 'wind':
        this.triggerWindEffect(match);
        break;
      case 'earth':
        this.triggerEarthEffect(match);
        break;
    }
  }

  private triggerFireEffect(match: MatchGroup): void {
    for (const pos of match.positions) {
      this.lavaSpots.push({
        x: pos.col,
        y: pos.row,
        life: 1.2,
        maxLife: 1.2
      });
    }
  }

  private triggerWaterEffect(match: MatchGroup): void {
    const adjacentPositions = new Set<string>();

    for (const pos of match.positions) {
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        const nr = pos.row + dr;
        const nc = pos.col + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          adjacentPositions.add(`${nr},${nc}`);
        }
      }
    }

    for (const posKey of adjacentPositions) {
      const [row, col] = posKey.split(',').map(Number);
      this.iceEffects.push({
        row,
        col,
        life: 2,
        maxLife: 2
      });
    }
  }

  private triggerWindEffect(match: MatchGroup): void {
    const centerPos = match.positions[Math.floor(match.positions.length / 2)];
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    const moveTargets: Array<{ from: Position; to: Position; talisman: Talisman }> = [];

    for (const dir of directions) {
      for (let i = 1; i <= 2; i++) {
        const nr = centerPos.row + dir.dr * i;
        const nc = centerPos.col + dir.dc * i;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) break;

        const talisman = this.grid[nr][nc];
        if (talisman && !talisman.isRemoving && !talisman.isMoving) {
          const targetRow = centerPos.row + dir.dr * (i - 1);
          const targetCol = centerPos.col + dir.dc * (i - 1);
          
          if (targetRow >= 0 && targetRow < GRID_SIZE && 
              targetCol >= 0 && targetCol < GRID_SIZE) {
            moveTargets.push({
              from: { row: nr, col: nc },
              to: { row: targetRow, col: targetCol },
              talisman
            });
          }
        }
      }
    }

    for (const move of moveTargets) {
      if (!this.grid[move.to.row][move.to.col]) {
        move.talisman.targetRow = move.to.row;
        move.talisman.targetCol = move.to.col;
        move.talisman.isMoving = true;
        move.talisman.moveProgress = 0;
        
        this.grid[move.to.row][move.to.col] = move.talisman;
        this.grid[move.from.row][move.from.col] = null;
      }
    }
  }

  private triggerEarthEffect(match: MatchGroup): void {
    const directions: Array<'horizontal' | 'vertical'> = ['horizontal', 'vertical'];

    for (const pos of match.positions) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      this.stoneWalls.push({
        row: pos.row,
        col: pos.col,
        direction,
        life: 3,
        maxLife: 3,
        isCollapsing: false
      });
    }
  }

  private dropTalismans(): void {
    for (let col = 0; col < GRID_SIZE; col++) {
      let writeRow = GRID_SIZE - 1;
      
      for (let readRow = GRID_SIZE - 1; readRow >= 0; readRow--) {
        const talisman = this.grid[readRow][col];
        if (talisman && !talisman.isRemoving) {
          if (readRow !== writeRow) {
            this.grid[writeRow][col] = talisman;
            this.grid[readRow][col] = null;
            talisman.targetRow = writeRow;
            talisman.targetCol = col;
            talisman.isMoving = true;
            talisman.moveProgress = 0;
          }
          writeRow--;
        }
      }
    }
  }

  private fillEmptySpaces(): void {
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyCount = 0;
      for (let row = 0; row < GRID_SIZE; row++) {
        if (!this.grid[row][col]) {
          emptyCount++;
        }
      }

      let fillIndex = 0;
      for (let row = 0; row < GRID_SIZE; row++) {
        if (!this.grid[row][col]) {
          const startRow = -emptyCount + fillIndex;
          const newTalisman = this.createTalisman(startRow, col);
          newTalisman.targetRow = row;
          newTalisman.targetCol = col;
          newTalisman.isMoving = true;
          newTalisman.moveProgress = 0;
          newTalisman.isNew = true;
          newTalisman.newProgress = 0;
          this.grid[row][col] = newTalisman;
          fillIndex++;
        }
      }
    }
  }

  selectTalisman(row: number, col: number): boolean {
    if (!this.isPlaying || this.isGameOver || this.isResolving) return false;

    const talisman = this.grid[row][col];
    if (!talisman || talisman.isRemoving || talisman.isMoving) return false;

    if (this.selectedTalisman) {
      if (this.selectedTalisman.id === talisman.id) {
        this.selectedTalisman = null;
        return true;
      }

      const canSwap = this.canSwap(this.selectedTalisman, talisman);
      
      if (canSwap) {
        this.swapTalismans(this.selectedTalisman, talisman);
        this.selectedTalisman = null;
        return true;
      } else {
        this.selectedTalisman = talisman;
        return true;
      }
    } else {
      this.selectedTalisman = talisman;
      return true;
    }
  }

  private canSwap(t1: Talisman, t2: Talisman): boolean {
    const rowDiff = Math.abs(t1.row - t2.row);
    const colDiff = Math.abs(t1.col - t2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  private swapTalismans(t1: Talisman, t2: Talisman): void {
    const r1 = t1.row;
    const c1 = t1.col;
    const r2 = t2.row;
    const c2 = t2.col;

    this.grid[r1][c1] = t2;
    this.grid[r2][c2] = t1;

    t1.row = r2;
    t1.col = c2;
    t2.row = r1;
    t2.col = c1;

    const matches = this.findMatches();
    if (matches.length === 0) {
      this.grid[r1][c1] = t1;
      this.grid[r2][c2] = t2;
      
      t1.row = r1;
      t1.col = c1;
      t2.row = r2;
      t2.col = c2;
    }
  }

  getTalismanAt(row: number, col: number): Talisman | null {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    return this.grid[row][col];
  }

  private endGame(): void {
    this.isGameOver = true;
    this.isPlaying = false;
    this.saveScore(this.score);
    
    if (this.onGameOver) {
      this.onGameOver(this.score);
    }
  }

  private loadLeaderboard(): number[] {
    try {
      const data = localStorage.getItem(LEADERBOARD_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    }
    return [];
  }

  private saveScore(score: number): void {
    this.leaderboard.push(score);
    this.leaderboard.sort((a, b) => b - a);
    this.leaderboard = this.leaderboard.slice(0, 5);
    
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.leaderboard));
    } catch (e) {
      console.error('Failed to save leaderboard:', e);
    }
  }

  getRank(score: number): number {
    let rank = 1;
    for (const s of this.leaderboard) {
      if (score < s) rank++;
    }
    return rank;
  }

  static get GRID_SIZE(): number {
    return GRID_SIZE;
  }

  static get GAME_DURATION(): number {
    return GAME_DURATION;
  }

  static get ELEMENT_COLORS(): Record<ElementType, string> {
    return ELEMENT_COLORS;
  }
}
