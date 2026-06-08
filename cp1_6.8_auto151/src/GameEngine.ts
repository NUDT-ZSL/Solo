export type Player = 'blue' | 'orange';

export interface Piece {
  id: number;
  player: Player;
  row: number;
  col: number;
  gravity: number;
  hp: number;
  maxHp: number;
}

export interface GravityEvent {
  pieceId: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  isAttract: boolean;
}

export interface DestroyEvent {
  pieceId: number;
  row: number;
  col: number;
  player: Player;
  isExplosion: boolean;
}

export interface PlaceEvent {
  piece: Piece;
}

export type GameEventType = 'place' | 'gravity' | 'destroy' | 'win';
export type GamePhase = 'placing' | 'gravity' | 'gameOver';

export interface GameEvent {
  type: GameEventType;
  data: PlaceEvent | GravityEvent[] | DestroyEvent | { winner: Player };
}

const BOARD_SIZE = 5;
const MAX_PIECES_PER_PLAYER = 10;

export class GameEngine {
  board: (Piece | null)[][];
  pieces: Map<number, Piece>;
  currentPlayer: Player;
  turn: number;
  piecesPlaced: Record<Player, number>;
  phase: GamePhase;
  winner: Player | null;
  private nextId: number;
  private eventListeners: ((event: GameEvent) => void)[];

  constructor() {
    this.board = [];
    this.pieces = new Map();
    this.currentPlayer = 'blue';
    this.turn = 1;
    this.piecesPlaced = { blue: 0, orange: 0 };
    this.phase = 'placing';
    this.winner = null;
    this.nextId = 1;
    this.eventListeners = [];
    this.initBoard();
  }

  private initBoard() {
    this.board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      this.board[r] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        this.board[r][c] = null;
      }
    }
  }

  reset() {
    this.pieces.clear();
    this.currentPlayer = 'blue';
    this.turn = 1;
    this.piecesPlaced = { blue: 0, orange: 0 };
    this.phase = 'placing';
    this.winner = null;
    this.nextId = 1;
    this.initBoard();
  }

  onEvent(listener: (event: GameEvent) => void) {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: GameEvent) => void) {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private emit(event: GameEvent) {
    this.eventListeners.forEach(l => l(event));
  }

  canPlace(row: number, col: number): boolean {
    if (this.phase !== 'placing') return false;
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
    if (this.board[row][col] !== null) return false;
    if (this.piecesPlaced[this.currentPlayer] >= MAX_PIECES_PER_PLAYER) return false;
    return true;
  }

  placePiece(row: number, col: number): Piece | null {
    if (!this.canPlace(row, col)) return null;

    const piece: Piece = {
      id: this.nextId++,
      player: this.currentPlayer,
      row,
      col,
      gravity: Math.floor(Math.random() * 3) + 1,
      hp: Math.floor(Math.random() * 3) + 1,
      maxHp: 0,
    };
    piece.maxHp = piece.hp;

    this.board[row][col] = piece;
    this.pieces.set(piece.id, piece);
    this.piecesPlaced[this.currentPlayer]++;

    this.emit({ type: 'place', data: { piece } });

    this.phase = 'gravity';
    this.executeGravity(piece);

    return piece;
  }

  private executeGravity(source: Piece) {
    const gravityEvents: GravityEvent[] = [];
    const destroyEvents: DestroyEvent[] = [];
    const gravityStrength = source.gravity;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const tr = source.row + dr;
        const tc = source.col + dc;
        if (tr < 0 || tr >= BOARD_SIZE || tc < 0 || tc >= BOARD_SIZE) continue;

        const target = this.board[tr][tc];
        if (!target || target.id === source.id) continue;

        const dirR = dr > 0 ? 1 : dr < 0 ? -1 : 0;
        const dirC = dc > 0 ? 1 : dc < 0 ? -1 : 0;

        let destR: number, destC: number;

        if (target.player !== source.player) {
          destR = target.row + dirR * gravityStrength;
          destC = target.col + dirC * gravityStrength;
        } else {
          destR = target.row - dirR * gravityStrength;
          destC = target.col - dirC * gravityStrength;
        }

        if (destR < 0 || destR >= BOARD_SIZE || destC < 0 || destC >= BOARD_SIZE) {
          this.board[target.row][target.col] = null;
          this.pieces.delete(target.id);
          destroyEvents.push({
            pieceId: target.id,
            row: target.row,
            col: target.col,
            player: target.player,
            isExplosion: true,
          });
          gravityEvents.push({
            pieceId: target.id,
            fromRow: target.row,
            fromCol: target.col,
            toRow: destR,
            toCol: destC,
            isAttract: target.player !== source.player,
          });
          continue;
        }

        if (this.board[destR][destC] !== null) continue;

        if (target.player !== source.player) {
          target.hp--;
          if (target.hp <= 0) {
            this.board[target.row][target.col] = null;
            this.pieces.delete(target.id);
            destroyEvents.push({
              pieceId: target.id,
              row: target.row,
              col: target.col,
              player: target.player,
              isExplosion: false,
            });
            gravityEvents.push({
              pieceId: target.id,
              fromRow: target.row,
              fromCol: target.col,
              toRow: target.row,
              toCol: target.col,
              isAttract: true,
            });
            continue;
          }
        }

        this.board[target.row][target.col] = null;
        target.row = destR;
        target.col = destC;
        this.board[destR][destC] = target;

        gravityEvents.push({
          pieceId: target.id,
          fromRow: tr,
          fromCol: tc,
          toRow: destR,
          toCol: destC,
          isAttract: target.player !== source.player,
        });
      }
    }

    if (gravityEvents.length > 0) {
      this.emit({ type: 'gravity', data: gravityEvents });
    }

    for (const de of destroyEvents) {
      this.emit({ type: 'destroy', data: de });
    }

    this.checkWinCondition();
  }

  private checkWinCondition() {
    const bluePieces = Array.from(this.pieces.values()).filter(p => p.player === 'blue');
    const orangePieces = Array.from(this.pieces.values()).filter(p => p.player === 'orange');

    if (bluePieces.length === 0 && this.piecesPlaced.blue > 0) {
      this.phase = 'gameOver';
      this.winner = 'orange';
      this.emit({ type: 'win', data: { winner: 'orange' } });
      return;
    }
    if (orangePieces.length === 0 && this.piecesPlaced.orange > 0) {
      this.phase = 'gameOver';
      this.winner = 'blue';
      this.emit({ type: 'win', data: { winner: 'blue' } });
      return;
    }

    this.phase = 'placing';
  }

  endTurn() {
    if (this.phase === 'gameOver') return;
    this.currentPlayer = this.currentPlayer === 'blue' ? 'orange' : 'blue';
    if (this.currentPlayer === 'blue') {
      this.turn++;
    }
    this.phase = 'placing';
  }

  getPieceAt(row: number, col: number): Piece | null {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
    return this.board[row][col];
  }

  getPlayerPieceCount(player: Player): number {
    return Array.from(this.pieces.values()).filter(p => p.player === player).length;
  }

  getRemainingPlacements(player: Player): number {
    return MAX_PIECES_PER_PLAYER - this.piecesPlaced[player];
  }
}

export { BOARD_SIZE, MAX_PIECES_PER_PLAYER };
