import {
  PlayerSide,
  Piece,
  Cell,
  CellType,
  FogState,
  AiAction,
  BOARD_SIZE,
  SUMMON_MANA_COST,
  VINE_MANA_COST,
  MAX_MANA,
} from './types';
import { getPieceAt, isValidMove, getCellAt } from './board';

export function movePiece(
  piece: Piece,
  targetRow: number,
  targetCol: number,
  pieces: Piece[],
  board: Cell[][]
): boolean {
  if (piece.entangled > 0) return false;
  const dr = Math.abs(targetRow - piece.row);
  const dc = Math.abs(targetCol - piece.col);
  if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return false;
  if (!isValidMove(targetRow, targetCol, pieces, board)) return false;
  piece.row = targetRow;
  piece.col = targetCol;
  return true;
}

export function summonPiece(
  side: PlayerSide,
  row: number,
  col: number,
  mana: number,
  board: Cell[][],
  pieces: Piece[]
): { success: boolean; newMana: number } {
  if (mana < SUMMON_MANA_COST) return { success: false, newMana: mana };
  const cell = getCellAt(board, row, col);
  if (!cell || cell.type !== CellType.SPIRIT || cell.owner !== side) {
    return { success: false, newMana: mana };
  }
  if (getPieceAt(pieces, row, col)) return { success: false, newMana: mana };
  pieces.push({ side, row, col, entangled: 0 });
  return { success: true, newMana: mana - SUMMON_MANA_COST };
}

export function castVine(
  side: PlayerSide,
  targetPiece: Piece,
  mana: number
): { success: boolean; newMana: number } {
  if (mana < VINE_MANA_COST) return { success: false, newMana: mana };
  if (targetPiece.side === side) return { success: false, newMana: mana };
  if (targetPiece.entangled > 0) return { success: false, newMana: mana };
  targetPiece.entangled = 2;
  return { success: true, newMana: mana - VINE_MANA_COST };
}

export function decrementEntangle(pieces: Piece[]): void {
  for (const p of pieces) {
    if (p.entangled > 0) p.entangled--;
  }
}

export function getAIAction(
  board: Cell[][],
  pieces: Piece[],
  mana: number,
  scores: [number, number]
): AiAction[] {
  const actions: AiAction[] = [];
  const myPieces = pieces.filter(p => p.side === PlayerSide.AMBER);
  const enemyPieces = pieces.filter(p => p.side === PlayerSide.GREEN);

  // Try to cast vine if enemy piece exists and mana allows
  if (mana >= VINE_MANA_COST && enemyPieces.length > 0) {
    const target = enemyPieces.find(ep => ep.entangled === 0);
    if (target && Math.random() > 0.5) {
      actions.push({ type: 'vine', targetPiece: target });
      const remainingMana = mana - VINE_MANA_COST;
      const movablePieces = myPieces.filter(p => p.entangled === 0);
      for (const mp of movablePieces) {
        const moveAction = findBestMove(mp, board, pieces);
        if (moveAction) actions.push(moveAction);
      }
      actions.push({ type: 'endTurn' });
      return actions;
    }
  }

  // Try to summon if mana allows
  if (mana >= SUMMON_MANA_COST) {
    const ownedSpirits: { r: number; c: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c].type === CellType.SPIRIT && board[r][c].owner === PlayerSide.AMBER) {
          if (!getPieceAt(pieces, r, c)) {
            ownedSpirits.push({ r, c });
          }
        }
      }
    }
    if (ownedSpirits.length > 0 && Math.random() > 0.6) {
      const spot = ownedSpirits[Math.floor(Math.random() * ownedSpirits.length)];
      actions.push({ type: 'summon', targetRow: spot.r, targetCol: spot.c });
    }
  }

  // Move pieces
  const movablePieces = myPieces.filter(p => p.entangled === 0);
  for (const mp of movablePieces) {
    const moveAction = findBestMove(mp, board, pieces);
    if (moveAction) actions.push(moveAction);
  }

  actions.push({ type: 'endTurn' });
  return actions;
}

function findBestMove(piece: Piece, board: Cell[][], pieces: Piece[]): AiAction | null {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const moves: { r: number; c: number; score: number }[] = [];

  for (const [dr, dc] of dirs) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;
    if (!isValidMove(nr, nc, pieces, board)) continue;
    let score = 0;
    const cell = board[nr][nc];
    if (cell.type === CellType.SPIRIT && cell.owner !== PlayerSide.AMBER) score += 10;
    if (cell.type === CellType.SPIRIT && cell.owner === PlayerSide.AMBER) score -= 5;
    // Prefer moving toward center
    const centerDist = Math.abs(nr - 3.5) + Math.abs(nc - 3.5);
    score -= centerDist;
    moves.push({ r: nr, c: nc, score });
  }

  if (moves.length === 0) return null;
  moves.sort((a, b) => b.score - a.score);
  const best = moves[0];
  return { type: 'move', piece, targetRow: best.r, targetCol: best.c };
}
