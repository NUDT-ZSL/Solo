export type PieceType = 'player1' | 'player2' | null;
export type BoardState = PieceType[][];
export type GameResult = 'player1' | 'player2' | 'draw' | null;

export const PLAYER1_COLOR = '#4FC3F7';
export const PLAYER2_COLOR = '#FF7043';
export const GRID_SIZE = 3;

export interface WinInfo {
  winner: 'player1' | 'player2';
  line: [number, number][];
}

export class Board {
  private state: BoardState;

  constructor() {
    this.state = this.createEmptyState();
  }

  private createEmptyState(): BoardState {
    return Array.from({ length: GRID_SIZE }, () => 
      Array.from<PieceType>({ length: GRID_SIZE }).fill(null)
    );
  }

  getState(): BoardState {
    return this.state.map(row => [...row]);
  }

  getCell(row: number, col: number): PieceType {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    return this.state[row][col];
  }

  placePiece(row: number, col: number, player: 'player1' | 'player2'): boolean {
    if (this.getCell(row, col) !== null) {
      return false;
    }
    this.state[row][col] = player;
    return true;
  }

  isFull(): boolean {
    return this.state.every(row => row.every(cell => cell !== null));
  }

  getEmptyCells(): [number, number][] {
    const cells: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.state[r][c] === null) {
          cells.push([r, c]);
        }
      }
    }
    return cells;
  }

  resetBoard(): void {
    this.state = this.createEmptyState();
  }

  shuffle(): void {
    const pieces: PieceType[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        pieces.push(this.state[r][c]);
      }
    }

    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }

    let idx = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        this.state[r][c] = pieces[idx++];
      }
    }
  }

  checkWin(): WinInfo | null {
    const lines: [number, number][][] = [
      [[0, 0], [0, 1], [0, 2]],
      [[1, 0], [1, 1], [1, 2]],
      [[2, 0], [2, 1], [2, 2]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 1], [1, 1], [2, 1]],
      [[0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 1], [2, 2]],
      [[0, 2], [1, 1], [2, 0]],
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      const piece = this.state[a[0]][a[1]];
      if (piece && piece === this.state[b[0]][b[1]] && piece === this.state[c[0]][c[1]]) {
        return { winner: piece, line };
      }
    }
    return null;
  }

  getResult(): GameResult {
    const winInfo = this.checkWin();
    if (winInfo) {
      return winInfo.winner;
    }
    if (this.isFull()) {
      return 'draw';
    }
    return null;
  }

  getPieceCounts(): { player1: number; player2: number } {
    let player1 = 0;
    let player2 = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.state[r][c] === 'player1') player1++;
        if (this.state[r][c] === 'player2') player2++;
      }
    }
    return { player1, player2 };
  }
}

export function getPlayerColor(player: 'player1' | 'player2'): string {
  return player === 'player1' ? PLAYER1_COLOR : PLAYER2_COLOR;
}
