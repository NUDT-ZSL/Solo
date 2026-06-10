export enum TerrainHeight {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2
}

export enum Player {
  NONE = 0,
  PLAYER1 = 1,
  PLAYER2 = 2
}

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainHeight;
  piece: Player;
  terrainAnimProgress: number;
  prevTerrain: TerrainHeight;
}

export type AnimationType = 'drop' | 'knockback' | 'idle';

export interface PieceAnimation {
  x: number;
  y: number;
  player: Player;
  type: AnimationType;
  progress: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  progress: number;
  maxRadius: number;
}

export interface GameState {
  board: Cell[][];
  currentPlayer: Player;
  round: number;
  scores: Record<Player, number>;
  remainingPieces: Record<Player, number>;
  isGameOver: boolean;
  winner: Player;
  animations: PieceAnimation[];
  ripples: RippleEffect[];
  isStarted: boolean;
}

export interface KnockbackResult {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  player: Player;
  eliminated: boolean;
}

const BOARD_SIZE = 6;
const TIDAL_RANGE = 3;
const INITIAL_PIECES = 18;
const DROP_ANIM_DURATION = 500;
const KNOCKBACK_ANIM_DURATION = 300;
const RIPPLE_DURATION = 600;
const TERRAIN_ANIM_DURATION = 500;

export class Game {
  private state: GameState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const board: Cell[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      board[y] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        board[y][x] = {
          x,
          y,
          terrain: TerrainHeight.MEDIUM,
          prevTerrain: TerrainHeight.MEDIUM,
          piece: Player.NONE,
          terrainAnimProgress: 1
        };
      }
    }

    return {
      board,
      currentPlayer: Player.PLAYER1,
      round: 1,
      scores: { [Player.NONE]: 0, [Player.PLAYER1]: 0, [Player.PLAYER2]: 0 },
      remainingPieces: { [Player.NONE]: 0, [Player.PLAYER1]: INITIAL_PIECES, [Player.PLAYER2]: INITIAL_PIECES },
      isGameOver: false,
      winner: Player.NONE,
      animations: [],
      ripples: [],
      isStarted: false
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  start(): void {
    this.state.isStarted = true;
  }

  reset(): void {
    this.state = this.createInitialState();
  }

  placePiece(x: number, y: number): boolean {
    if (!this.state.isStarted || this.state.isGameOver) return false;
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false;
    if (this.state.board[y][x].piece !== Player.NONE) return false;
    if (this.state.remainingPieces[this.state.currentPlayer] <= 0) return false;

    const cell = this.state.board[y][x];
    cell.piece = this.state.currentPlayer;
    this.state.remainingPieces[this.state.currentPlayer]--;
    this.state.scores[this.state.currentPlayer]++;

    this.state.animations.push({
      x,
      y,
      player: this.state.currentPlayer,
      type: 'drop',
      progress: 0,
      startX: x,
      startY: y - 3,
      endX: x,
      endY: y
    });

    this.state.ripples.push({
      x,
      y,
      progress: 0,
      maxRadius: TIDAL_RANGE
    });

    this.applyTidalSurge(x, y);
    const knockbackResults = this.checkAndResolveCombat(x, y);

    for (const result of knockbackResults) {
      if (result.eliminated) {
        this.state.scores[this.state.currentPlayer]++;
      }
    }

    this.checkGameOver();

    if (!this.state.isGameOver) {
      this.switchPlayer();
    }

    return true;
  }

  private applyTidalSurge(centerX: number, centerY: number): void {
    const affectedCells: Cell[] = [];

    for (let dy = -TIDAL_RANGE; dy <= TIDAL_RANGE; dy++) {
      for (let dx = -TIDAL_RANGE; dx <= TIDAL_RANGE; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > TIDAL_RANGE) continue;

        const x = centerX + dx;
        const y = centerY + dy;
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) continue;

        const cell = this.state.board[y][x];
        cell.prevTerrain = cell.terrain;
        cell.terrain = ((cell.terrain + 1) % 3) as TerrainHeight;
        cell.terrainAnimProgress = 0;
        affectedCells.push(cell);
      }
    }
  }

  private checkAndResolveCombat(_placedX: number, _placedY: number): KnockbackResult[] {
    const results: KnockbackResult[] = [];
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    const combatPairs: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.state.board[y][x].piece === Player.NONE) continue;

        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;

          const cell1 = this.state.board[y][x];
          const cell2 = this.state.board[ny][nx];

          if (cell1.piece === Player.NONE || cell2.piece === Player.NONE) continue;
          if (cell1.piece === cell2.piece) continue;
          if (cell1.terrain !== TerrainHeight.HIGH && cell2.terrain !== TerrainHeight.HIGH) continue;

          const pairExists = combatPairs.some(p =>
            (p.x1 === nx && p.y1 === ny && p.x2 === x && p.y2 === y)
          );
          if (!pairExists) {
            combatPairs.push({ x1: x, y1: y, x2: nx, y2: ny });
          }
        }
      }
    }

    for (const pair of combatPairs) {
      const cell1 = this.state.board[pair.y1][pair.x1];
      const cell2 = this.state.board[pair.y2][pair.x2];

      const atk1 = this.calculateAttack(cell1, cell2);
      const atk2 = this.calculateAttack(cell2, cell1);

      if (atk1 > atk2) {
        const result = this.knockback(pair.x2, pair.y2, pair.x2 - pair.x1, pair.y2 - pair.y1);
        if (result) results.push(result);
      } else if (atk2 > atk1) {
        const result = this.knockback(pair.x1, pair.y1, pair.x1 - pair.x2, pair.y1 - pair.y2);
        if (result) results.push(result);
      }
    }

    return results;
  }

  private calculateAttack(attacker: Cell, defender: Cell): number {
    let atk = 1;
    if (attacker.terrain === TerrainHeight.HIGH) atk += 1;
    if (defender.terrain === TerrainHeight.LOW) atk += 0;
    if (attacker.terrain === TerrainHeight.LOW) atk -= 1;
    return Math.max(0, atk);
  }

  private knockback(x: number, y: number, dirX: number, dirY: number): KnockbackResult | null {
    const cell = this.state.board[y][x];
    if (cell.piece === Player.NONE) return null;

    const targetX = x + dirX;
    const targetY = y + dirY;

    const player = cell.piece;
    const opponent = player === Player.PLAYER1 ? Player.PLAYER2 : Player.PLAYER1;

    let eliminated = false;

    if (targetX < 0 || targetX >= BOARD_SIZE || targetY < 0 || targetY >= BOARD_SIZE) {
      eliminated = true;
      cell.piece = Player.NONE;
      this.state.scores[opponent]++;
      this.state.scores[player] = Math.max(0, this.state.scores[player] - 1);
    } else {
      const targetCell = this.state.board[targetY][targetX];
      if (targetCell.piece !== Player.NONE) {
        eliminated = true;
        cell.piece = Player.NONE;
        this.state.scores[opponent]++;
        this.state.scores[player] = Math.max(0, this.state.scores[player] - 1);
      } else {
        cell.piece = Player.NONE;
        targetCell.piece = player;

        this.state.animations.push({
          x: targetX,
          y: targetY,
          player,
          type: 'knockback',
          progress: 0,
          startX: x,
          startY: y,
          endX: targetX,
          endY: targetY
        });

        return {
          fromX: x,
          fromY: y,
          toX: targetX,
          toY: targetY,
          player,
          eliminated: false
        };
      }
    }

    if (eliminated) {
      this.state.animations.push({
        x: targetX,
        y: targetY,
        player,
        type: 'knockback',
        progress: 0,
        startX: x,
        startY: y,
        endX: targetX,
        endY: targetY
      });
    }

    return eliminated ? {
      fromX: x,
      fromY: y,
      toX: targetX,
      toY: targetY,
      player,
      eliminated: true
    } : null;
  }

  private switchPlayer(): void {
    this.state.currentPlayer =
      this.state.currentPlayer === Player.PLAYER1 ? Player.PLAYER2 : Player.PLAYER1;
    if (this.state.currentPlayer === Player.PLAYER1) {
      this.state.round++;
    }
  }

  private checkGameOver(): void {
    const p1Remaining = this.state.remainingPieces[Player.PLAYER1];
    const p2Remaining = this.state.remainingPieces[Player.PLAYER2];
    const p1OnBoard = this.countPieces(Player.PLAYER1);
    const p2OnBoard = this.countPieces(Player.PLAYER2);

    const bothOutOfPieces = p1Remaining === 0 && p2Remaining === 0;
    const oneOutOfPieces = p1Remaining === 0 || p2Remaining === 0;
    const boardFull = p1OnBoard + p2OnBoard === BOARD_SIZE * BOARD_SIZE;

    if (bothOutOfPieces || boardFull || (oneOutOfPieces && this.noValidMoves())) {
      this.state.isGameOver = true;
      if (this.state.scores[Player.PLAYER1] > this.state.scores[Player.PLAYER2]) {
        this.state.winner = Player.PLAYER1;
      } else if (this.state.scores[Player.PLAYER2] > this.state.scores[Player.PLAYER1]) {
        this.state.winner = Player.PLAYER2;
      } else {
        this.state.winner = Player.NONE;
      }
    }
  }

  private noValidMoves(): boolean {
    const current = this.state.currentPlayer;
    if (this.state.remainingPieces[current] > 0) return false;

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.state.board[y][x].piece === Player.NONE) return false;
      }
    }
    return true;
  }

  private countPieces(player: Player): number {
    let count = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.state.board[y][x].piece === player) count++;
      }
    }
    return count;
  }

  update(deltaTime: number): void {
    const finishedAnimIndices: number[] = [];
    this.state.animations.forEach((anim, index) => {
      if (anim.type === 'drop') {
        anim.progress += deltaTime / DROP_ANIM_DURATION;
      } else if (anim.type === 'knockback') {
        anim.progress += deltaTime / KNOCKBACK_ANIM_DURATION;
      }
      if (anim.progress >= 1) {
        anim.progress = 1;
        finishedAnimIndices.push(index);
      }
    });

    for (let i = finishedAnimIndices.length - 1; i >= 0; i--) {
      this.state.animations.splice(finishedAnimIndices[i], 1);
    }

    const finishedRippleIndices: number[] = [];
    this.state.ripples.forEach((ripple, index) => {
      ripple.progress += deltaTime / RIPPLE_DURATION;
      if (ripple.progress >= 1) {
        ripple.progress = 1;
        finishedRippleIndices.push(index);
      }
    });

    for (let i = finishedRippleIndices.length - 1; i >= 0; i--) {
      this.state.ripples.splice(finishedRippleIndices[i], 1);
    }

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = this.state.board[y][x];
        if (cell.terrainAnimProgress < 1) {
          cell.terrainAnimProgress += deltaTime / TERRAIN_ANIM_DURATION;
          if (cell.terrainAnimProgress > 1) cell.terrainAnimProgress = 1;
        }
      }
    }
  }

  getBoardSize(): number {
    return BOARD_SIZE;
  }

  getTidalRange(): number {
    return TIDAL_RANGE;
  }

  getCellAt(x: number, y: number): Readonly<Cell> | null {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;
    return this.state.board[y][x];
  }
}
