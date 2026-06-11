export type CellValue = 0 | 1 | 2;
export type BoardGrid = CellValue[][];
export type WinLine = [number, number][];

const SIZE = 3;

const WIN_LINES: WinLine[] = [
  [[0, 0], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
];

export class Board {
  grid: BoardGrid;
  isHidden: boolean;

  constructor() {
    this.grid = this.createEmptyGrid();
    this.isHidden = false;
  }

  createEmptyGrid(): BoardGrid {
    const g: BoardGrid = [];
    for (let r = 0; r < SIZE; r++) {
      const row: CellValue[] = [];
      for (let c = 0; c < SIZE; c++) {
        row.push(0);
      }
      g.push(row);
    }
    return g;
  }

  reset(): void {
    this.grid = this.createEmptyGrid();
    this.isHidden = false;
  }

  placePiece(row: number, col: number, player: 1 | 2): boolean {
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return false;
    if (this.grid[row][col] !== 0) return false;
    this.grid[row][col] = player;
    return true;
  }

  shufflePieces(): void {
    const indices: number[] = [];
    const total = SIZE * SIZE;
    for (let i = 0; i < total; i++) {
      indices.push(i);
    }
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const original: CellValue[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        original.push(this.grid[r][c]);
      }
    }
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      this.grid[r][c] = original[indices[i]];
    }
  }

  getEmptyPositions(): [number, number][] {
    const positions: [number, number][] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.grid[r][c] === 0) {
          positions.push([r, c]);
        }
      }
    }
    return positions;
  }

  isFull(): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.grid[r][c] === 0) return false;
      }
    }
    return true;
  }

  checkWinner(): { winner: 1 | 2 | null; line: WinLine | null } {
    for (const line of WIN_LINES) {
      const [a, b, cc] = line;
      const v = this.grid[a[0]][a[1]];
      if (v !== 0 && v === this.grid[b[0]][b[1]] && v === this.grid[cc[0]][cc[1]]) {
        return { winner: v as 1 | 2, line };
      }
    }
    return { winner: null, line: null };
  }

  getCell(row: number, col: number): CellValue {
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return 0;
    return this.grid[row][col];
  }
}
