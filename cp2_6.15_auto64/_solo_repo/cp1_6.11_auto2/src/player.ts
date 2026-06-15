import { Board } from './board';

export type PlayerMode = 'human' | 'ai';
export type GameState = 'idle' | 'playing' | 'placing' | 'resetting_hide' | 'resetting_reveal' | 'gameOver';

export class PlayerController {
  currentPlayer: 1 | 2 = 1;
  mode1: PlayerMode = 'human';
  mode2: PlayerMode = 'human';
  board: Board;
  gameState: GameState = 'idle';

  constructor(board: Board) {
    this.board = board;
  }

  setMode(player: 1 | 2, mode: PlayerMode): void {
    if (player === 1) {
      this.mode1 = mode;
    } else {
      this.mode2 = mode;
    }
  }

  getCurrentMode(): PlayerMode {
    return this.currentPlayer === 1 ? this.mode1 : this.mode2;
  }

  canInteract(): boolean {
    if (this.gameState === 'resetting_hide') return false;
    if (this.gameState === 'resetting_reveal') return false;
    if (this.gameState === 'placing') return false;
    if (this.gameState === 'gameOver') return false;
    if (this.gameState === 'idle') return false;
    return this.gameState === 'playing';
  }

  canPlaceNow(): boolean {
    if (this.gameState === 'resetting_hide') return false;
    if (this.gameState === 'resetting_reveal') return false;
    if (this.gameState === 'placing') return false;
    if (this.gameState === 'gameOver') return false;
    if (this.gameState === 'idle') return false;
    return this.gameState === 'playing';
  }

  handleClick(row: number, col: number): boolean {
    if (!this.canPlaceNow()) return false;
    if (this.getCurrentMode() !== 'human') return false;
    return this.board.placePiece(row, col, this.currentPlayer);
  }

  switchTurn(): void {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
  }

  getAIMove(): [number, number] | null {
    if (this.getCurrentMode() !== 'ai') return null;
    if (!this.canPlaceNow()) return null;
    const empties = this.board.getEmptyPositions();
    if (empties.length === 0) return null;
    const idx = Math.floor(Math.random() * empties.length);
    return empties[idx];
  }

  resetRound(): void {
    this.currentPlayer = 1;
    this.gameState = 'idle';
  }
}
