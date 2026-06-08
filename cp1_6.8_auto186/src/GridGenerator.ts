export enum CellState {
  Superposition = 0,
  Solid = 1,
  Hollow = 2,
}

export interface Position {
  row: number;
  col: number;
}

export interface Cell {
  row: number;
  col: number;
  state: CellState;
  entangledWith: Position | null;
  flipInterval: number;
  flipTimer: number;
  collapseBias: number;
  rotation: number;
  shockwaveAlpha: number;
  shockwaveRadius: number;
}

export interface Grid {
  width: number;
  height: number;
  cells: Cell[][];
  exit: Position;
  start: Position;
}

export interface LevelConfig {
  width: number;
  height: number;
  entangledPairs: number;
  flippingCells: number;
  solidBias: number;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { width: 5, height: 5, entangledPairs: 0, flippingCells: 0, solidBias: 0.7 },
  { width: 6, height: 5, entangledPairs: 1, flippingCells: 0, solidBias: 0.65 },
  { width: 6, height: 6, entangledPairs: 2, flippingCells: 0, solidBias: 0.6 },
  { width: 7, height: 6, entangledPairs: 2, flippingCells: 1, solidBias: 0.55 },
  { width: 7, height: 7, entangledPairs: 3, flippingCells: 1, solidBias: 0.5 },
  { width: 8, height: 7, entangledPairs: 3, flippingCells: 2, solidBias: 0.5 },
  { width: 8, height: 8, entangledPairs: 4, flippingCells: 2, solidBias: 0.45 },
  { width: 9, height: 8, entangledPairs: 5, flippingCells: 3, solidBias: 0.45 },
];

export function cloneGrid(grid: Grid): Grid {
  return {
    width: grid.width,
    height: grid.height,
    exit: { ...grid.exit },
    start: { ...grid.start },
    cells: grid.cells.map(row =>
      row.map(cell => ({
        ...cell,
        entangledWith: cell.entangledWith ? { ...cell.entangledWith } : null,
      }))
    ),
  };
}

export function generateGrid(config: LevelConfig, seed?: number): Grid {
  let s = seed ?? Date.now();
  const random = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };

  const cells: Cell[][] = [];
  for (let r = 0; r < config.height; r++) {
    cells[r] = [];
    for (let c = 0; c < config.width; c++) {
      cells[r][c] = {
        row: r,
        col: c,
        state: CellState.Superposition,
        entangledWith: null,
        flipInterval: 0,
        flipTimer: 0,
        collapseBias: config.solidBias + (random() - 0.5) * 0.2,
        rotation: random() * Math.PI * 2,
        shockwaveAlpha: 0,
        shockwaveRadius: 0,
      };
    }
  }

  const start: Position = { row: 0, col: 0 };
  const exit: Position = { row: config.height - 1, col: config.width - 1 };

  cells[start.row][start.col].state = CellState.Solid;
  cells[start.row][start.col].collapseBias = 1.0;
  cells[exit.row][exit.col].state = CellState.Solid;
  cells[exit.row][exit.col].collapseBias = 1.0;

  const superposCells = () => {
    const result: Position[] = [];
    for (let r = 0; r < config.height; r++) {
      for (let c = 0; c < config.width; c++) {
        if (cells[r][c].state === CellState.Superposition && !cells[r][c].entangledWith) {
          result.push({ row: r, col: c });
        }
      }
    }
    return result;
  };

  for (let i = 0; i < config.entangledPairs; i++) {
    const available = superposCells();
    if (available.length < 2) break;
    const i1 = Math.floor(random() * available.length);
    const p1 = available[i1];
    const remaining = available.filter((_, idx) => idx !== i1);
    const i2 = Math.floor(random() * remaining.length);
    const p2 = remaining[i2];
    cells[p1.row][p1.col].entangledWith = { row: p2.row, col: p2.col };
    cells[p2.row][p2.col].entangledWith = { row: p1.row, col: p1.col };
  }

  const flipAvail = superposCells();
  const shuffled = flipAvail.sort(() => random() - 0.5);
  for (let i = 0; i < config.flippingCells && i < shuffled.length; i++) {
    const pos = shuffled[i];
    cells[pos.row][pos.col].flipInterval = 3000 + random() * 4000;
  }

  return { width: config.width, height: config.height, cells, exit, start };
}
