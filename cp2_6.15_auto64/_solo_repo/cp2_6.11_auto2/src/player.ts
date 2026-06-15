import { Board } from './board';

export type PlayerMode = 'pvp' | 'pve';
export type CurrentPlayer = 'player1' | 'player2';

export class PlayerController {
  private board: Board;
  private mode: PlayerMode;
  private currentPlayer: CurrentPlayer;
  private aiDelay: number = 500;
  private aiTimer: number | null = null;

  constructor(board: Board, mode: PlayerMode = 'pvp') {
    this.board = board;
    this.mode = mode;
    this.currentPlayer = 'player1';
  }

  getMode(): PlayerMode {
    return this.mode;
  }

  setMode(mode: PlayerMode): void {
    this.mode = mode;
    this.resetTurn();
    this.clearAiTimer();
  }

  getCurrentPlayer(): CurrentPlayer {
    return this.currentPlayer;
  }

  switchTurn(): void {
    this.currentPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';
  }

  resetTurn(): void {
    this.currentPlayer = 'player1';
    this.clearAiTimer();
  }

  handlePlayerMove(row: number, col: number): boolean {
    if (this.mode === 'pve' && this.currentPlayer === 'player2') {
      return false;
    }
    return this.makeMove(row, col);
  }

  handleAiMove(row: number, col: number): boolean {
    if (this.mode !== 'pve' || this.currentPlayer !== 'player2') {
      return false;
    }
    return this.makeMove(row, col);
  }

  private makeMove(row: number, col: number): boolean {
    return this.board.placePiece(row, col, this.currentPlayer);
  }

  isAiTurn(): boolean {
    return this.mode === 'pve' && this.currentPlayer === 'player2';
  }

  scheduleAiMove(callback: (row: number, col: number) => void): void {
    this.clearAiTimer();
    
    const emptyCells = this.board.getEmptyCells();
    if (emptyCells.length === 0) return;

    this.aiTimer = window.setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const [row, col] = emptyCells[randomIndex];
      callback(row, col);
      this.aiTimer = null;
    }, this.aiDelay);
  }

  clearAiTimer(): void {
    if (this.aiTimer !== null) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  getPlayerName(player: CurrentPlayer): string {
    if (this.mode === 'pve' && player === 'player2') {
      return 'AI';
    }
    return player === 'player1' ? '玩家1' : '玩家2';
  }
}
