import {
  CellType,
  FogState,
  PlayerSide,
  CaptureState,
  Cell,
  Piece,
  BOARD_SIZE,
  FOG_FADE_DURATION,
  FOG_RETURN_DURATION,
  lerp,
  clamp,
} from './types';

export function createBoard(size: number): Cell[][] {
  const board: Cell[][] = [];
  const spiritPositions = generateSpiritPositions(size);
  const thornPositions = generateThornPositions(size, spiritPositions);

  for (let r = 0; r < size; r++) {
    board[r] = [];
    for (let c = 0; c < size; c++) {
      let type = CellType.EMPTY;
      if (spiritPositions.has(`${r},${c}`)) {
        type = CellType.SPIRIT;
      } else if (thornPositions.has(`${r},${c}`)) {
        type = CellType.THORN;
      }
      board[r][c] = {
        type,
        fogState: FogState.FULL,
        fogAlpha: 1.0,
        owner: null,
        captureProgress: 0,
        captureState: CaptureState.IDLE,
        captureSide: null,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    }
  }
  return board;
}

function generateSpiritPositions(size: number): Set<string> {
  const positions = new Set<string>();
  const count = 8 + Math.floor(Math.random() * 3);
  while (positions.size < count) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (!isStartZone(r, c)) {
      positions.add(`${r},${c}`);
    }
  }
  return positions;
}

function generateThornPositions(size: number, spirits: Set<string>): Set<string> {
  const positions = new Set<string>();
  const count = 6 + Math.floor(Math.random() * 4);
  while (positions.size < count) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    const key = `${r},${c}`;
    if (!spirits.has(key) && !isStartZone(r, c)) {
      positions.add(key);
    }
  }
  return positions;
}

function isStartZone(r: number, c: number): boolean {
  const greenStarts = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const amberStarts = [[7, 7], [7, 6], [6, 7], [6, 6]];
  for (const [sr, sc] of greenStarts) {
    if (r === sr && c === sc) return true;
  }
  for (const [sr, sc] of amberStarts) {
    if (r === sr && c === sc) return true;
  }
  return false;
}

export function createInitialPieces(): Piece[] {
  return [
    { side: PlayerSide.GREEN, row: 0, col: 0, entangled: 0 },
    { side: PlayerSide.GREEN, row: 0, col: 1, entangled: 0 },
    { side: PlayerSide.GREEN, row: 1, col: 0, entangled: 0 },
    { side: PlayerSide.GREEN, row: 1, col: 1, entangled: 0 },
    { side: PlayerSide.AMBER, row: 7, col: 7, entangled: 0 },
    { side: PlayerSide.AMBER, row: 7, col: 6, entangled: 0 },
    { side: PlayerSide.AMBER, row: 6, col: 7, entangled: 0 },
    { side: PlayerSide.AMBER, row: 6, col: 6, entangled: 0 },
  ];
}

export function updateFog(pieces: Piece[], board: Cell[][], currentSide: PlayerSide): void {
  const visible = new Set<string>();
  for (const p of pieces) {
    if (p.side === currentSide) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = p.row + dr;
          const nc = p.col + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            visible.add(`${nr},${nc}`);
          }
        }
      }
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      const key = `${r},${c}`;
      if (visible.has(key)) {
        if (cell.fogState === FogState.FULL) {
          cell.fogState = FogState.FADING;
        } else if (cell.fogState === FogState.RETURNING) {
          cell.fogState = FogState.FADING;
        } else if (cell.fogState === FogState.CLEAR) {
          // already clear
        }
      } else {
        if (cell.fogState === FogState.CLEAR || cell.fogState === FogState.FADING) {
          cell.fogState = FogState.RETURNING;
        }
      }
    }
  }
}

export function updateFogAnimations(board: Cell[][], dt: number): void {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      const targetAlpha = cell.fogState === FogState.CLEAR ? 0 : 1;

      if (cell.fogState === FogState.FADING) {
        const t = clamp(dt / FOG_FADE_DURATION, 0, 1);
        cell.fogAlpha = lerp(cell.fogAlpha, targetAlpha, t);
        if (Math.abs(cell.fogAlpha - targetAlpha) < 0.001) {
          cell.fogAlpha = 0;
          cell.fogState = FogState.CLEAR;
        }
      } else if (cell.fogState === FogState.RETURNING) {
        const t = clamp(dt / FOG_RETURN_DURATION, 0, 1);
        cell.fogAlpha = lerp(cell.fogAlpha, targetAlpha, t);
        if (Math.abs(cell.fogAlpha - targetAlpha) < 0.001) {
          cell.fogAlpha = 1;
          cell.fogState = FogState.FULL;
        }
      }
    }
  }
}

export function countSpiritNodes(board: Cell[][]): [number, number] {
  let green = 0;
  let amber = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c].type === CellType.SPIRIT && board[r][c].owner !== null) {
        if (board[r][c].owner === PlayerSide.GREEN) green++;
        else amber++;
      }
    }
  }
  return [green, amber];
}

export function getCellAt(board: Cell[][], row: number, col: number): Cell | null {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return board[row][col];
}

export function getPieceAt(pieces: Piece[], row: number, col: number): Piece | null {
  return pieces.find(p => p.row === row && p.col === col) || null;
}

export function isValidMove(row: number, col: number, pieces: Piece[], board: Cell[][]): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  if (board[row][col].type === CellType.THORN) return false;
  if (getPieceAt(pieces, row, col)) return false;
  return true;
}
