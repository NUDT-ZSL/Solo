import {
  SymbolType,
  ALL_SYMBOL_TYPES,
  GRID_SIZE,
  MAX_LEVEL,
  INITIAL_LIVES,
  DEFAULT_PUSH_INTERVAL,
  MIN_PUSH_INTERVAL,
  MAX_PUSH_INTERVAL,
  COMBO_TIMEOUT,
  COMBO_BONUS_THRESHOLD,
  COMBO_BONUS_SCORE,
  INITIAL_PIECE_MIN,
  INITIAL_PIECE_MAX,
  PUSH_PIECE_MIN,
  PUSH_PIECE_MAX,
  GamePiece,
  Position,
  GameState,
  PushDirection
} from './types';

let pieceIdCounter = 0;

export interface GameEventCallbacks {
  onMerge?: (pieces: GamePiece[], newLevel: number, score: number, row: number, col: number) => void;
  onLifeLost?: () => void;
  onPush?: (direction: PushDirection) => void;
  onGameOver?: () => void;
  onMove?: () => void;
  onSelect?: () => void;
  onComboChange?: (combo: number) => void;
}

export class GameManager {
  private grid: (GamePiece | null)[][];
  private state: GameState;
  private mergeQueue: { pieces: GamePiece[]; type: SymbolType; level: number; row: number; col: number; score: number }[] = [];
  private isProcessingMerge = false;
  private pendingScoreAdd = 0;
  private callbacks: GameEventCallbacks = {};

  constructor() {
    this.grid = this.createEmptyGrid();
    this.state = {
      score: 0,
      highScore: this.loadHighScore(),
      lives: INITIAL_LIVES,
      combo: 0,
      lastMergeTime: 0,
      isGameOver: false,
      pushInterval: DEFAULT_PUSH_INTERVAL,
      pushTimer: DEFAULT_PUSH_INTERVAL * 1000,
      selectedPiece: null
    };
    this.initializePieces();
  }

  private createEmptyGrid(): (GamePiece | null)[][] {
    const grid: (GamePiece | null)[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        grid[row][col] = null;
      }
    }
    return grid;
  }

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem('symbolWeaver_highScore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem('symbolWeaver_highScore', this.state.highScore.toString());
    } catch {
      // ignore
    }
  }

  private initializePieces(): void {
    const totalPieces = INITIAL_PIECE_MIN + Math.floor(Math.random() * (INITIAL_PIECE_MAX - INITIAL_PIECE_MIN + 1));
    const positions: Position[] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        positions.push({ row, col });
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    const selectedPositions = positions.slice(0, totalPieces);
    const symbolsPerType = Math.ceil(totalPieces / ALL_SYMBOL_TYPES.length);
    const symbolCount: Record<SymbolType, number> = {
      [SymbolType.PLANET]: 0,
      [SymbolType.LIGHTNING]: 0,
      [SymbolType.LEAF]: 0,
      [SymbolType.FIRE]: 0,
      [SymbolType.WATER]: 0,
      [SymbolType.STAR]: 0
    };

    for (const pos of selectedPositions) {
      let type: SymbolType;
      do {
        type = ALL_SYMBOL_TYPES[Math.floor(Math.random() * ALL_SYMBOL_TYPES.length)];
      } while (symbolCount[type] >= symbolsPerType + 2 && this.getTotalPlaced(symbolCount) < totalPieces - ALL_SYMBOL_TYPES.length);

      symbolCount[type]++;
      const piece = this.createPiece(type, 1, pos.row, pos.col);
      piece.isNew = true;
      piece.newTimer = 0.5;
      this.grid[pos.row][pos.col] = piece;
    }
  }

  private getTotalPlaced(count: Record<SymbolType, number>): number {
    return Object.values(count).reduce((sum, c) => sum + c, 0);
  }

  private createPiece(type: SymbolType, level: number, row: number, col: number): GamePiece {
    return {
      id: ++pieceIdCounter,
      type,
      level: Math.min(level, MAX_LEVEL),
      row,
      col,
      isNew: false,
      newTimer: 0,
      isMerging: false,
      mergeTimer: 0,
      isMoving: false,
      moveFromRow: row,
      moveFromCol: col,
      moveTimer: 0
    };
  }

  getGrid(): (GamePiece | null)[][] {
    return this.grid;
  }

  getState(): GameState {
    return { ...this.state };
  }

  setCallbacks(callbacks: GameEventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  getSelectedPiece(): GamePiece | null {
    return this.state.selectedPiece;
  }

  setPushInterval(seconds: number): void {
    this.state.pushInterval = Math.max(MIN_PUSH_INTERVAL, Math.min(MAX_PUSH_INTERVAL, seconds));
  }

  selectPiece(row: number, col: number): boolean {
    if (this.state.isGameOver || this.isProcessingMerge) return false;

    const piece = this.grid[row][col];

    if (piece) {
      if (this.state.selectedPiece && this.state.selectedPiece.id === piece.id) {
        this.state.selectedPiece = null;
        return true;
      }
      this.state.selectedPiece = piece;
      this.callbacks.onSelect?.();
      return true;
    } else {
      if (this.state.selectedPiece) {
        const selected = this.state.selectedPiece;
        if (this.isAdjacent(selected.row, selected.col, row, col)) {
          return this.movePiece(selected, row, col);
        } else {
          this.state.selectedPiece = null;
          return false;
        }
      }
      return false;
    }
  }

  private isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  private movePiece(piece: GamePiece, toRow: number, toCol: number): boolean {
    if (this.grid[toRow][toCol] !== null) return false;

    const fromRow = piece.row;
    const fromCol = piece.col;

    piece.isMoving = true;
    piece.moveFromRow = fromRow;
    piece.moveFromCol = fromCol;
    piece.moveTimer = 0;
    piece.row = toRow;
    piece.col = toCol;

    this.grid[toRow][toCol] = piece;
    this.grid[fromRow][fromCol] = null;

    this.state.selectedPiece = null;
    this.callbacks.onMove?.();

    setTimeout(() => {
      this.checkAndProcessMerges();
    }, 150);

    return true;
  }

  private checkAndProcessMerges(): void {
    if (this.state.isGameOver) return;

    const mergeGroups = this.findAllMerges();

    if (mergeGroups.length === 0) {
      this.isProcessingMerge = false;
      return;
    }

    this.isProcessingMerge = true;

    const now = Date.now();
    if (now - this.state.lastMergeTime < COMBO_TIMEOUT) {
      this.state.combo++;
    } else {
      this.state.combo = 1;
    }
    this.state.lastMergeTime = now;
    this.callbacks.onComboChange?.(this.state.combo);

    const processed = new Set<number>();

    for (const group of mergeGroups) {
      const validPieces = group.filter(p => !processed.has(p.id));
      if (validPieces.length >= 3) {
        const type = validPieces[0].type;
        const level = validPieces[0].level;
        const centerPiece = validPieces[1];

        validPieces.forEach(p => processed.add(p.id));

        let score = Math.floor(10 * Math.pow(level, 1.5));
        if (this.state.combo >= COMBO_BONUS_THRESHOLD) {
          score += COMBO_BONUS_SCORE;
        }
        this.pendingScoreAdd += score;

        this.mergeQueue.push({
          pieces: validPieces,
          type,
          level,
          row: centerPiece.row,
          col: centerPiece.col,
          score
        });
      }
    }

    this.processNextMerge();
  }

  private findAllMerges(): GamePiece[][] {
    const groups: GamePiece[][] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE - 3; col++) {
        const group = this.checkLine(row, col, 0, 1);
        if (group) groups.push(group);
      }
    }

    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row <= GRID_SIZE - 3; row++) {
        const group = this.checkLine(row, col, 1, 0);
        if (group) groups.push(group);
      }
    }

    for (let row = 0; row <= GRID_SIZE - 3; row++) {
      for (let col = 0; col <= GRID_SIZE - 3; col++) {
        const group = this.checkLine(row, col, 1, 1);
        if (group) groups.push(group);
      }
    }

    for (let row = 0; row <= GRID_SIZE - 3; row++) {
      for (let col = 2; col < GRID_SIZE; col++) {
        const group = this.checkLine(row, col, 1, -1);
        if (group) groups.push(group);
      }
    }

    return groups;
  }

  private checkLine(startRow: number, startCol: number, rowStep: number, colStep: number): GamePiece[] | null {
    const pieces: GamePiece[] = [];
    let firstType: SymbolType | null = null;
    let firstLevel: number | null = null;

    for (let i = 0; i < 3; i++) {
      const row = startRow + i * rowStep;
      const col = startCol + i * colStep;

      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;

      const piece = this.grid[row][col];
      if (!piece) return null;

      if (firstType === null) {
        firstType = piece.type;
        firstLevel = piece.level;
      } else if (piece.type !== firstType || piece.level !== firstLevel) {
        return null;
      }

      pieces.push(piece);
    }

    return pieces;
  }

  private processNextMerge(): void {
    if (this.mergeQueue.length === 0) {
      if (this.pendingScoreAdd > 0) {
        this.state.score += this.pendingScoreAdd;
        if (this.state.score > this.state.highScore) {
          this.state.highScore = this.state.score;
          this.saveHighScore();
        }
        this.pendingScoreAdd = 0;
      }
      this.isProcessingMerge = false;
      return;
    }

    const merge = this.mergeQueue.shift()!;

    merge.pieces.forEach(p => {
      p.isMerging = true;
      p.mergeTimer = 0.3;
    });

    this.callbacks.onMerge?.(merge.pieces, merge.level + 1, merge.score, merge.row, merge.col);

    setTimeout(() => {
      merge.pieces.forEach(p => {
        if (this.grid[p.row][p.col]?.id === p.id) {
          this.grid[p.row][p.col] = null;
        }
      });

      if (merge.level < MAX_LEVEL) {
        const newPiece = this.createPiece(merge.type, merge.level + 1, merge.row, merge.col);
        newPiece.isNew = true;
        newPiece.newTimer = 0.5;
        this.grid[merge.row][merge.col] = newPiece;
      }

      setTimeout(() => {
        this.checkAndProcessMerges();
      }, 200);
    }, 300);
  }

  pushNewPieces(direction: PushDirection): { lostLife: boolean; count: number } {
    if (this.state.isGameOver) return { lostLife: false, count: 0 };

    const count = PUSH_PIECE_MIN + Math.floor(Math.random() * (PUSH_PIECE_MAX - PUSH_PIECE_MIN + 1));
    let lostLife = false;

    if (direction === 'left') {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const pushTypes: SymbolType[] = [];
      for (let i = 0; i < count; i++) {
        pushTypes.push(ALL_SYMBOL_TYPES[Math.floor(Math.random() * ALL_SYMBOL_TYPES.length)]);
      }

      if (this.grid[row][GRID_SIZE - 1] !== null) {
        lostLife = true;
        this.loseLife();
      }

      for (let col = GRID_SIZE - 1; col > 0; col--) {
        this.grid[row][col] = this.grid[row][col - 1];
        if (this.grid[row][col]) {
          this.grid[row][col]!.col = col;
          this.grid[row][col]!.isMoving = true;
          this.grid[row][col]!.moveFromCol = col - 1;
          this.grid[row][col]!.moveFromRow = row;
          this.grid[row][col]!.moveTimer = 0;
        }
      }

      const newPiece = this.createPiece(pushTypes[0], 1, row, 0);
      newPiece.isNew = true;
      newPiece.newTimer = 0.5;
      this.grid[row][0] = newPiece;
    } else {
      const col = Math.floor(Math.random() * GRID_SIZE);
      const pushTypes: SymbolType[] = [];
      for (let i = 0; i < count; i++) {
        pushTypes.push(ALL_SYMBOL_TYPES[Math.floor(Math.random() * ALL_SYMBOL_TYPES.length)]);
      }

      if (this.grid[0][col] !== null) {
        lostLife = true;
        this.loseLife();
      }

      for (let row = 0; row < GRID_SIZE - 1; row++) {
        this.grid[row][col] = this.grid[row + 1][col];
        if (this.grid[row][col]) {
          this.grid[row][col]!.row = row;
          this.grid[row][col]!.isMoving = true;
          this.grid[row][col]!.moveFromRow = row + 1;
          this.grid[row][col]!.moveFromCol = col;
          this.grid[row][col]!.moveTimer = 0;
        }
      }

      const newPiece = this.createPiece(pushTypes[0], 1, GRID_SIZE - 1, col);
      newPiece.isNew = true;
      newPiece.newTimer = 0.5;
      this.grid[GRID_SIZE - 1][col] = newPiece;
    }

    setTimeout(() => {
      this.checkAndProcessMerges();
    }, 300);

    this.callbacks.onPush?.(direction);

    return { lostLife, count };
  }

  private loseLife(): void {
    this.state.lives--;
    this.callbacks.onLifeLost?.();
    if (this.state.lives <= 0) {
      this.state.lives = 0;
      this.state.isGameOver = true;
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
        this.saveHighScore();
      }
      this.callbacks.onGameOver?.();
    }
  }

  update(deltaTime: number): void {
    if (this.state.isGameOver) return;

    this.state.pushTimer -= deltaTime * 1000;
    if (this.state.pushTimer <= 0) {
      const direction: PushDirection = Math.random() < 0.5 ? 'left' : 'bottom';
      this.pushNewPieces(direction);
      this.state.pushTimer = this.state.pushInterval * 1000;
    }

    if (Date.now() - this.state.lastMergeTime > COMBO_TIMEOUT && this.state.combo > 0) {
      this.state.combo = 0;
    }

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const piece = this.grid[row][col];
        if (!piece) continue;

        if (piece.isNew) {
          piece.newTimer -= deltaTime;
          if (piece.newTimer <= 0) {
            piece.isNew = false;
            piece.newTimer = 0;
          }
        }

        if (piece.isMoving) {
          piece.moveTimer += deltaTime;
          if (piece.moveTimer >= 0.15) {
            piece.isMoving = false;
            piece.moveTimer = 0;
          }
        }

        if (piece.isMerging) {
          piece.mergeTimer -= deltaTime;
        }
      }
    }
  }

  resetGame(): void {
    pieceIdCounter = 0;
    this.grid = this.createEmptyGrid();
    this.mergeQueue = [];
    this.isProcessingMerge = false;
    this.pendingScoreAdd = 0;
    this.state = {
      score: 0,
      highScore: this.state.highScore,
      lives: INITIAL_LIVES,
      combo: 0,
      lastMergeTime: 0,
      isGameOver: false,
      pushInterval: this.state.pushInterval,
      pushTimer: this.state.pushInterval * 1000,
      selectedPiece: null
    };
    this.initializePieces();
  }

  getStarRating(): number {
    if (this.state.score < 1000) return 1;
    if (this.state.score <= 3000) return 2;
    return 3;
  }

  isMergeInProgress(): boolean {
    return this.isProcessingMerge;
  }

  getPushTimer(): number {
    return this.state.pushTimer;
  }

  getPushInterval(): number {
    return this.state.pushInterval;
  }
}
