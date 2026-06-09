export type PlayerType = 'player' | 'ai';

export interface Piece {
  id: string;
  owner: PlayerType;
  gridX: number;
  gridY: number;
  radius: number;
  moveSteps: number;
  remainingSteps: number;
  isFusing: boolean;
  isSplitting: boolean;
  isMoving: boolean;
  submerged: boolean;
  submergedTimer: number;
  targetX?: number;
  targetY?: number;
  animProgress?: number;
}

export interface GridCell {
  x: number;
  y: number;
  submerged: boolean;
  submergedProgress: number;
  tideDirection: 'north' | 'south' | 'east' | 'west' | null;
}

export interface EngineState {
  pieces: Piece[];
  grid: GridCell[][];
  currentTurn: PlayerType;
  turnNumber: number;
  selectedPieceId: string | null;
  fuseSourceId: string | null;
  scores: { player: number; ai: number };
  gameOver: boolean;
  winner: PlayerType | null;
  matchWinner: PlayerType | null;
}

export const GRID_SIZE = 8;
export const MIN_RADIUS = 4;
export const BASE_RADIUS = 16;

let pieceIdCounter = 0;

function generatePieceId(): string {
  return `piece_${++pieceIdCounter}`;
}

export class Engine {
  state: EngineState;

  constructor() {
    this.state = this.createInitialState();
  }

  createInitialState(): EngineState {
    const grid: GridCell[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = {
          x,
          y,
          submerged: false,
          submergedProgress: 0,
          tideDirection: null
        };
      }
    }

    const pieces: Piece[] = [];
    for (let x = 1; x <= 6; x++) {
      pieces.push(this.createPiece('player', x, 7));
      pieces.push(this.createPiece('ai', x, 0));
    }

    return {
      pieces,
      grid,
      currentTurn: 'player',
      turnNumber: 1,
      selectedPieceId: null,
      fuseSourceId: null,
      scores: { player: 0, ai: 0 },
      gameOver: false,
      winner: null,
      matchWinner: null
    };
  }

  createPiece(owner: PlayerType, gridX: number, gridY: number): Piece {
    return {
      id: generatePieceId(),
      owner,
      gridX,
      gridY,
      radius: BASE_RADIUS,
      moveSteps: 2,
      remainingSteps: 2,
      isFusing: false,
      isSplitting: false,
      isMoving: false,
      submerged: false,
      submergedTimer: 0
    };
  }

  resetRound(): void {
    pieceIdCounter = 0;
    this.state = this.createInitialState();
  }

  getPieceAt(gridX: number, gridY: number): Piece | null {
    return this.state.pieces.find(p => p.gridX === gridX && p.gridY === gridY) || null;
  }

  getMovableCells(pieceId: string): { x: number; y: number }[] {
    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece || piece.owner !== this.state.currentTurn) return [];
    if (piece.isFusing || piece.isSplitting || piece.isMoving) return [];
    if (piece.remainingSteps <= 0) return [];
    if (piece.submerged) return [];

    const cells: { x: number; y: number }[] = [];
    const steps = Math.min(piece.remainingSteps, piece.moveSteps);
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }
    ];

    for (const dir of directions) {
      for (let s = 1; s <= steps; s++) {
        const nx = piece.gridX + dir.dx * s;
        const ny = piece.gridY + dir.dy * s;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) break;
        const occupant = this.getPieceAt(nx, ny);
        if (occupant) {
          if (occupant.owner === piece.owner && !occupant.submerged && s === 1) {
            cells.push({ x: nx, y: ny });
          }
          break;
        }
        cells.push({ x: nx, y: ny });
      }
    }

    return cells;
  }

  canMovePiece(pieceId: string, toX: number, toY: number): boolean {
    const cells = this.getMovableCells(pieceId);
    return cells.some(c => c.x === toX && c.y === toY);
  }

  movePiece(pieceId: string, toX: number, toY: number): { success: boolean; action: 'move' | 'fuse' | null; fuseResultId?: string } {
    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece) return { success: false, action: null };

    if (!this.canMovePiece(pieceId, toX, toY)) return { success: false, action: null };

    const occupant = this.getPieceAt(toX, toY);
    if (occupant && occupant.owner === piece.owner) {
      return this.fusePieces(pieceId, occupant.id);
    }

    const distance = Math.max(Math.abs(toX - piece.gridX), Math.abs(toY - piece.gridY));
    piece.gridX = toX;
    piece.gridY = toY;
    piece.remainingSteps -= distance;
    piece.isMoving = true;
    piece.animProgress = 0;

    if (piece.remainingSteps <= 0) {
      this.endTurnCheck();
    }

    return { success: true, action: 'move' };
  }

  fusePieces(pieceAId: string, pieceBId: string): { success: boolean; action: 'fuse'; fuseResultId?: string } {
    const pieceA = this.state.pieces.find(p => p.id === pieceAId);
    const pieceB = this.state.pieces.find(p => p.id === pieceBId);
    if (!pieceA || !pieceB) return { success: false, action: 'fuse' };
    if (pieceA.owner !== pieceB.owner) return { success: false, action: 'fuse' };

    const midX = Math.floor((pieceA.gridX + pieceB.gridX) / 2);
    const midY = Math.floor((pieceA.gridY + pieceB.gridY) / 2);

    pieceA.isFusing = true;
    pieceA.targetX = midX;
    pieceA.targetY = midY;
    pieceA.animProgress = 0;
    pieceB.isFusing = true;
    pieceB.targetX = midX;
    pieceB.targetY = midY;
    pieceB.animProgress = 0;

    const newRadius = Math.min(BASE_RADIUS * 2, Math.round(Math.sqrt(pieceA.radius * pieceA.radius + pieceB.radius * pieceB.radius) * 1.2));
    const newPiece: Piece = {
      id: generatePieceId(),
      owner: pieceA.owner,
      gridX: midX,
      gridY: midY,
      radius: newRadius,
      moveSteps: 1,
      remainingSteps: 0,
      isFusing: false,
      isSplitting: false,
      isMoving: false,
      submerged: false,
      submergedTimer: 0
    };

    const fuseResultId = newPiece.id;
    setTimeout(() => {
      this.state.pieces = this.state.pieces.filter(p => p.id !== pieceAId && p.id !== pieceBId);
      this.state.pieces.push(newPiece);
    }, 600);

    this.endTurnCheck();
    return { success: true, action: 'fuse', fuseResultId };
  }

  canSplitPiece(pieceId: string): boolean {
    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece) return false;
    if (piece.owner !== this.state.currentTurn) return false;
    if (piece.isFusing || piece.isSplitting || piece.isMoving) return false;
    if (piece.submerged) return false;
    if (piece.radius < BASE_RADIUS * 1.2) return false;
    if (piece.remainingSteps <= 0) return false;

    const neighbors = [
      { x: piece.gridX - 1, y: piece.gridY },
      { x: piece.gridX + 1, y: piece.gridY },
      { x: piece.gridX, y: piece.gridY - 1 },
      { x: piece.gridX, y: piece.gridY + 1 }
    ].filter(n =>
      n.x >= 0 && n.x < GRID_SIZE &&
      n.y >= 0 && n.y < GRID_SIZE &&
      !this.getPieceAt(n.x, n.y)
    );

    return neighbors.length >= 2;
  }

  splitPiece(pieceId: string): { success: boolean; newPieceIds: string[] } {
    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece || !this.canSplitPiece(pieceId)) return { success: false, newPieceIds: [] };

    piece.isSplitting = true;
    piece.animProgress = 0;

    const neighbors = [
      { x: piece.gridX - 1, y: piece.gridY },
      { x: piece.gridX + 1, y: piece.gridY },
      { x: piece.gridX, y: piece.gridY - 1 },
      { x: piece.gridX, y: piece.gridY + 1 }
    ].filter(n =>
      n.x >= 0 && n.x < GRID_SIZE &&
      n.y >= 0 && n.y < GRID_SIZE &&
      !this.getPieceAt(n.x, n.y)
    ).slice(0, 2);

    const newRadius = Math.max(MIN_RADIUS, Math.round(piece.radius * 0.5));
    const newPieceIds: string[] = [];

    const origX = piece.gridX;
    const origY = piece.gridY;
    const origOwner = piece.owner;

    setTimeout(() => {
      this.state.pieces = this.state.pieces.filter(p => p.id !== pieceId);

      for (const n of neighbors) {
        const newPiece = this.createPiece(origOwner, n.x, n.y);
        newPiece.radius = newRadius;
        newPiece.moveSteps = 4;
        newPiece.remainingSteps = 0;
        this.state.pieces.push(newPiece);
        newPieceIds.push(newPiece.id);
      }
    }, 800);

    this.endTurnCheck();
    return { success: true, newPieceIds };
  }

  triggerTide(): { cells: { x: number; y: number; direction: string }[] } {
    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const result: { x: number; y: number; direction: string }[] = [];

    const rowOrCol = direction === 'north' || direction === 'south'
      ? Array.from({ length: GRID_SIZE }, (_, i) => i)
      : [Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE)];

    const count = 3 + Math.floor(Math.random() * 4);
    const shuffled = [...rowOrCol].sort(() => Math.random() - 0.5).slice(0, count);

    for (const idx of shuffled) {
      let x: number, y: number;
      switch (direction) {
        case 'north':
          x = idx; y = 0; break;
        case 'south':
          x = idx; y = GRID_SIZE - 1; break;
        case 'east':
          x = GRID_SIZE - 1; y = idx; break;
        case 'west':
          x = 0; y = idx; break;
      }

      if (this.state.grid[y] && this.state.grid[y][x]) {
        this.state.grid[y][x].submerged = true;
        this.state.grid[y][x].submergedProgress = 0;
        this.state.grid[y][x].tideDirection = direction;
        result.push({ x, y, direction });

        const piece = this.getPieceAt(x, y);
        if (piece) {
          piece.submerged = true;
          piece.submergedTimer = 3;
          piece.radius = Math.max(MIN_RADIUS, Math.round(piece.radius * 0.8));
        }
      }
    }

    return result;
  }

  updateTideSubmergence(deltaTime: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.state.grid[y][x];
        if (cell.submerged) {
          cell.submergedProgress += deltaTime;
          if (cell.submergedProgress >= 3) {
            cell.submerged = false;
            cell.submergedProgress = 0;
            cell.tideDirection = null;
            const piece = this.getPieceAt(x, y);
            if (piece) {
              piece.submerged = false;
              piece.submergedTimer = 0;
              if (piece.radius < MIN_RADIUS) {
                this.removePiece(piece.id);
              }
            }
          }
        }
      }
    }

    for (const piece of this.state.pieces) {
      if (piece.isMoving && piece.animProgress !== undefined) {
        piece.animProgress += deltaTime * 2;
        if (piece.animProgress >= 1) {
          piece.isMoving = false;
          piece.animProgress = undefined;
        }
      }
      if (piece.isFusing && piece.animProgress !== undefined) {
        piece.animProgress += deltaTime * 1.67;
      }
      if (piece.isSplitting && piece.animProgress !== undefined) {
        piece.animProgress += deltaTime * 1.25;
        if (piece.animProgress >= 1) {
          piece.isSplitting = false;
          piece.animProgress = undefined;
        }
      }
    }

    this.checkPieceDissolution();
    this.checkRoundEnd();
  }

  removePiece(pieceId: string): void {
    this.state.pieces = this.state.pieces.filter(p => p.id !== pieceId);
  }

  checkPieceDissolution(): void {
    this.state.pieces = this.state.pieces.filter(p => p.radius >= MIN_RADIUS);
  }

  checkRoundEnd(): void {
    if (this.state.gameOver) return;

    const playerPieces = this.state.pieces.filter(p => p.owner === 'player');
    const aiPieces = this.state.pieces.filter(p => p.owner === 'ai');

    if (playerPieces.length === 0 || aiPieces.length === 0) {
      this.state.gameOver = true;
      this.state.winner = playerPieces.length === 0 ? 'ai' : 'player';
      this.state.scores[this.state.winner]++;

      if (this.state.scores[this.state.winner] >= 3) {
        this.state.matchWinner = this.state.winner;
      }
    }
  }

  endTurn(): void {
    this.state.currentTurn = this.state.currentTurn === 'player' ? 'ai' : 'player';
    if (this.state.currentTurn === 'player') {
      this.state.turnNumber++;
    }
    for (const piece of this.state.pieces) {
      if (piece.owner === this.state.currentTurn) {
        piece.remainingSteps = piece.moveSteps;
      }
    }
    this.state.selectedPieceId = null;
    this.state.fuseSourceId = null;
  }

  private endTurnCheck(): void {
    const activePieces = this.state.pieces.filter(p => p.owner === this.state.currentTurn);
    const allUsed = activePieces.every(p => p.remainingSteps <= 0 || p.isFusing || p.isSplitting || p.submerged);
    if (allUsed) {
      this.endTurn();
    }
  }

  selectPiece(pieceId: string | null): void {
    this.state.selectedPieceId = pieceId;
    this.state.fuseSourceId = null;
  }

  startFuseMode(pieceId: string): void {
    this.state.fuseSourceId = pieceId;
  }

  getAIAction(): { type: 'move' | 'split' | 'fuse' | 'endTurn'; pieceId?: string; toX?: number; toY?: number; targetId?: string } {
    const aiPieces = this.state.pieces.filter(p => p.owner === 'ai' && !p.isFusing && !p.isSplitting && !p.submerged && p.remainingSteps > 0);
    if (aiPieces.length === 0) {
      return { type: 'endTurn' };
    }

    const playerPieces = this.state.pieces.filter(p => p.owner === 'player');

    for (const piece of aiPieces) {
      if (this.canSplitPiece(piece.id) && piece.radius >= BASE_RADIUS * 1.5) {
        if (Math.random() < 0.2) {
          return { type: 'split', pieceId: piece.id };
        }
      }
    }

    for (const piece of aiPieces) {
      const movableCells = this.getMovableCells(piece.id);
      const adjacentFriendly = movableCells.filter(c => {
        const occupant = this.getPieceAt(c.x, c.y);
        return occupant && occupant.owner === 'ai' && occupant.id !== piece.id;
      });
      if (adjacentFriendly.length > 0 && Math.random() < 0.3) {
        const target = adjacentFriendly[Math.floor(Math.random() * adjacentFriendly.length)];
        const occupant = this.getPieceAt(target.x, target.y)!;
        return { type: 'fuse', pieceId: piece.id, targetId: occupant.id };
      }
    }

    for (const piece of aiPieces) {
      const movableCells = this.getMovableCells(piece.id).filter(c => !this.getPieceAt(c.x, c.y));
      if (movableCells.length === 0) continue;

      let bestCell = movableCells[0];
      let bestScore = -Infinity;

      for (const cell of movableCells) {
        let score = 0;
        for (const playerPiece of playerPieces) {
          const dist = Math.abs(cell.x - playerPiece.gridX) + Math.abs(cell.y - playerPiece.gridY);
          score += (16 - dist) * 2;
        }
        score -= Math.abs(cell.x - 3.5) * 0.5;
        score -= Math.abs(cell.y - 3.5) * 0.5;

        if (this.state.grid[cell.y][cell.x].submerged) {
          score -= 20;
        }

        if (score > bestScore) {
          bestScore = score;
          bestCell = cell;
        }
      }

      if (bestScore > -Infinity) {
        return { type: 'move', pieceId: piece.id, toX: bestCell.x, toY: bestCell.y };
      }
    }

    return { type: 'endTurn' };
  }
}
