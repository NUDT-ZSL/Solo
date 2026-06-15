export enum CellState {
  Superposition = 'superposition',
  Collapsed = 'collapsed',
}

export interface CellData {
  row: number;
  col: number;
  state: CellState;
  fluctuationPhase: number;
  fluctuationHue: number;
}

export interface BoardData {
  size: number;
  cells: CellData[][];
}

export function generateBoard(size: number): BoardData {
  const cells: CellData[][] = [];
  for (let r = 0; r < size; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < size; c++) {
      row.push({
        row: r,
        col: c,
        state: Math.random() < 0.5 ? CellState.Superposition : CellState.Collapsed,
        fluctuationPhase: Math.random() * Math.PI * 2,
        fluctuationHue: Math.random() * 360,
      });
    }
    cells.push(row);
  }
  return { size, cells };
}

export function flipCellState(cell: CellData): void {
  cell.state =
    cell.state === CellState.Superposition
      ? CellState.Collapsed
      : CellState.Superposition;
}

export function findLines(board: BoardData, lineLength: number): { row: number; col: number }[][] {
  const lines: { row: number; col: number }[][] = [];
  const { size, cells } = board;
  const visited = new Set<string>();

  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const state = cells[r][c].state;
      for (const { dr, dc } of directions) {
        const line: { row: number; col: number }[] = [];
        let valid = true;
        for (let i = 0; i < lineLength; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size || cells[nr][nc].state !== state) {
            valid = false;
            break;
          }
          line.push({ row: nr, col: nc });
        }
        if (valid && line.length === lineLength) {
          const key = line.map((p) => `${p.row},${p.col}`).join('|');
          if (!visited.has(key)) {
            visited.add(key);
            lines.push(line);
          }
        }
      }
    }
  }

  return lines;
}
