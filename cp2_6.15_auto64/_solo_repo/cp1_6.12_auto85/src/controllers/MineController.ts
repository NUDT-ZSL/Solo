export type CellState = 'hidden' | 'revealed' | 'flagged';
export type ItemType = 'radar' | 'shield' | 'freeze';
export type PlayerId = 1 | 2;
export type GameStatus = 'playing' | 'p1_wins' | 'p2_wins' | 'draw';

export interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  state: CellState;
  revealedBy: PlayerId | null;
  shieldBroken: boolean;
}

export interface Player {
  id: PlayerId;
  revealedSafe: number;
  revealedMines: number;
  itemsUsed: number;
  inventory: Map<ItemType, number>;
  hasShield: boolean;
  cursorRow: number;
  cursorCol: number;
  safeRevealedForReward: number;
}

export interface GameStats {
  p1RevealedSafe: number;
  p2RevealedSafe: number;
  p1RevealedMines: number;
  p2RevealedMines: number;
  p1ItemsUsed: number;
  p2ItemsUsed: number;
  totalTurns: number;
  winner: PlayerId | 0;
}

export interface RadarHighlight {
  row: number;
  col: number;
  isMine: boolean;
}

export class MineController {
  readonly ROWS = 16;
  readonly COLS = 16;
  readonly MINES = 40;
  readonly MAX_ITEMS = 3;

  board: Cell[][] = [];
  players: Map<PlayerId, Player> = new Map();
  currentPlayer: PlayerId = 1;
  gameStatus: GameStatus = 'playing';
  totalTurns = 0;
  totalSafeRevealed = 0;
  totalSafeCells = 0;
  minesGenerated = false;
  frozenOpponent = false;
  opponentFrozenTurns = 0;
  activeRadar: RadarHighlight[] = [];
  radarEndTime = 0;

  constructor() {
    this.initBoard();
    this.initPlayers();
    this.totalSafeCells = this.ROWS * this.COLS - this.MINES;
  }

  private initBoard(): void {
    this.board = [];
    for (let r = 0; r < this.ROWS; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.COLS; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          adjacentMines: 0,
          state: 'hidden',
          revealedBy: null,
          shieldBroken: false,
        });
      }
      this.board.push(row);
    }
  }

  private initPlayers(): void {
    for (const id of [1, 2] as PlayerId[]) {
      this.players.set(id, {
        id,
        revealedSafe: 0,
        revealedMines: 0,
        itemsUsed: 0,
        inventory: new Map<ItemType, number>([
          ['radar', 0],
          ['shield', 0],
          ['freeze', 0],
        ]),
        hasShield: false,
        cursorRow: Math.floor(this.ROWS / 2),
        cursorCol: Math.floor(this.COLS / 2),
        safeRevealedForReward: 0,
      });
    }
  }

  generateMines(safeRow: number, safeCol: number): void {
    if (this.minesGenerated) return;

    const safeZone = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = safeRow + dr;
        const c = safeCol + dc;
        if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
          safeZone.add(`${r},${c}`);
        }
      }
    }

    let placed = 0;
    while (placed < this.MINES) {
      const r = Math.floor(Math.random() * this.ROWS);
      const c = Math.floor(Math.random() * this.COLS);
      if (!this.board[r][c].isMine && !safeZone.has(`${r},${c}`)) {
        this.board[r][c].isMine = true;
        placed++;
      }
    }

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (!this.board[r][c].isMine) {
          this.board[r][c].adjacentMines = this.countAdjacentMines(r, c);
        }
      }
    }

    this.minesGenerated = true;
  }

  private countAdjacentMines(row: number, col: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && this.board[r][c].isMine) {
          count++;
        }
      }
    }
    return count;
  }

  revealCell(row: number, col: number, playerId: PlayerId): {
    revealed: Cell[];
    hitMine: Cell | null;
    shieldTriggered: Cell | null;
  } {
    if (this.gameStatus !== 'playing') {
      return { revealed: [], hitMine: null, shieldTriggered: null };
    }

    const cell = this.board[row][col];
    if (cell.state !== 'hidden') {
      return { revealed: [], hitMine: null, shieldTriggered: null };
    }

    if (!this.minesGenerated) {
      this.generateMines(row, col);
    }

    const player = this.players.get(playerId)!;

    if (cell.isMine) {
      if (player.hasShield) {
        player.hasShield = false;
        cell.state = 'revealed';
        cell.revealedBy = playerId;
        cell.shieldBroken = true;
        player.revealedSafe++;
        player.safeRevealedForReward++;
        this.totalSafeRevealed++;
        this.checkForItemReward(playerId);
        this.checkWinCondition();
        return { revealed: [cell], hitMine: null, shieldTriggered: cell };
      } else {
        cell.state = 'revealed';
        cell.revealedBy = playerId;
        player.revealedMines++;
        this.gameStatus = playerId === 1 ? 'p2_wins' : 'p1_wins';
        return { revealed: [cell], hitMine: cell, shieldTriggered: null };
      }
    }

    const revealed = this.floodFill(row, col, playerId);
    this.totalSafeRevealed += revealed.length;
    player.safeRevealedForReward += revealed.length;
    this.checkForItemReward(playerId);
    this.checkWinCondition();
    return { revealed, hitMine: null, shieldTriggered: null };
  }

  private floodFill(startRow: number, startCol: number, playerId: PlayerId): Cell[] {
    const result: Cell[] = [];
    const stack: [number, number][] = [[startRow, startCol]];

    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const cell = this.board[r][c];
      if (cell.state !== 'hidden' || cell.isMine) continue;

      cell.state = 'revealed';
      cell.revealedBy = playerId;
      const player = this.players.get(playerId)!;
      player.revealedSafe++;
      result.push(cell);

      if (cell.adjacentMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
              if (this.board[nr][nc].state === 'hidden' && !this.board[nr][nc].isMine) {
                stack.push([nr, nc]);
              }
            }
          }
        }
      }
    }
    return result;
  }

  toggleFlag(row: number, col: number): boolean {
    const cell = this.board[row][col];
    if (cell.state === 'hidden') {
      cell.state = 'flagged';
      return true;
    } else if (cell.state === 'flagged') {
      cell.state = 'hidden';
      return true;
    }
    return false;
  }

  private checkForItemReward(playerId: PlayerId): void {
    const player = this.players.get(playerId)!;
    while (player.safeRevealedForReward >= 5) {
      player.safeRevealedForReward -= 5;
      this.giveRandomItem(playerId);
    }
  }

  private giveRandomItem(playerId: PlayerId): void {
    const player = this.players.get(playerId)!;
    const totalItems = Array.from(player.inventory.values()).reduce((a, b) => a + b, 0);
    if (totalItems >= this.MAX_ITEMS) return;

    const types: ItemType[] = ['radar', 'shield', 'freeze'];
    const available = types.filter(t => (player.inventory.get(t) || 0) < this.MAX_ITEMS);
    if (available.length === 0) return;

    const chosen = available[Math.floor(Math.random() * available.length)];
    player.inventory.set(chosen, (player.inventory.get(chosen) || 0) + 1);
  }

  useItem(playerId: PlayerId, itemType: ItemType): {
    success: boolean;
    effect: 'radar' | 'shield' | 'freeze' | null;
    radarResult?: RadarHighlight[];
  } {
    if (this.gameStatus !== 'playing') {
      return { success: false, effect: null };
    }

    const player = this.players.get(playerId)!;
    const count = player.inventory.get(itemType) || 0;
    if (count <= 0) {
      return { success: false, effect: null };
    }

    player.inventory.set(itemType, count - 1);
    player.itemsUsed++;

    switch (itemType) {
      case 'radar':
        return { success: true, effect: 'radar', radarResult: this.applyRadar(player) };
      case 'shield':
        player.hasShield = true;
        return { success: true, effect: 'shield' };
      case 'freeze':
        this.frozenOpponent = true;
        this.opponentFrozenTurns = 1;
        return { success: true, effect: 'freeze' };
    }
  }

  private applyRadar(player: Player): RadarHighlight[] {
    const result: RadarHighlight[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = player.cursorRow + dr;
        const c = player.cursorCol + dc;
        if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
          const cell = this.board[r][c];
          if (cell.state === 'hidden') {
            result.push({ row: r, col: c, isMine: cell.isMine });
          }
        }
      }
    }
    this.activeRadar = result.filter(h => h.isMine);
    this.radarEndTime = performance.now() + 2000;
    return result;
  }

  isRadarActive(): RadarHighlight[] {
    if (performance.now() > this.radarEndTime) {
      this.activeRadar = [];
      return [];
    }
    return this.activeRadar;
  }

  endTurn(): void {
    this.totalTurns++;
    if (this.opponentFrozenTurns > 0 && this.frozenOpponent) {
      if (this.currentPlayer === 1) {
        this.currentPlayer = 2;
        this.frozenOpponent = false;
        this.opponentFrozenTurns = 0;
      } else {
        this.currentPlayer = 1;
        this.frozenOpponent = false;
        this.opponentFrozenTurns = 0;
      }
    } else {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }
  }

  isCurrentPlayerFrozen(): boolean {
    const opponentId = this.currentPlayer === 1 ? 2 : 1;
    return this.frozenOpponent && this.opponentFrozenTurns > 0 &&
      ((opponentId === 1 && this.currentPlayer === 2) ||
       (opponentId === 2 && this.currentPlayer === 1));
  }

  private checkWinCondition(): void {
    if (this.totalSafeRevealed >= this.totalSafeCells) {
      const p1 = this.players.get(1)!;
      const p2 = this.players.get(2)!;
      if (p1.revealedSafe > p2.revealedSafe) {
        this.gameStatus = 'p1_wins';
      } else if (p2.revealedSafe > p1.revealedSafe) {
        this.gameStatus = 'p2_wins';
      } else {
        this.gameStatus = 'draw';
      }
    }
  }

  moveCursor(playerId: PlayerId, dRow: number, dCol: number): { row: number; col: number } {
    const player = this.players.get(playerId)!;
    player.cursorRow = Math.max(0, Math.min(this.ROWS - 1, player.cursorRow + dRow));
    player.cursorCol = Math.max(0, Math.min(this.COLS - 1, player.cursorCol + dCol));
    return { row: player.cursorRow, col: player.cursorCol };
  }

  getStats(): GameStats {
    const p1 = this.players.get(1)!;
    const p2 = this.players.get(2)!;
    let winner: PlayerId | 0 = 0;
    if (this.gameStatus === 'p1_wins') winner = 1;
    else if (this.gameStatus === 'p2_wins') winner = 2;

    return {
      p1RevealedSafe: p1.revealedSafe,
      p2RevealedSafe: p2.revealedSafe,
      p1RevealedMines: p1.revealedMines,
      p2RevealedMines: p2.revealedMines,
      p1ItemsUsed: p1.itemsUsed,
      p2ItemsUsed: p2.itemsUsed,
      totalTurns: this.totalTurns,
      winner,
    };
  }

  getCell(row: number, col: number): Cell {
    return this.board[row][col];
  }

  getPlayer(id: PlayerId): Player {
    return this.players.get(id)!;
  }

  restart(): void {
    this.initBoard();
    this.initPlayers();
    this.currentPlayer = 1;
    this.gameStatus = 'playing';
    this.totalTurns = 0;
    this.totalSafeRevealed = 0;
    this.minesGenerated = false;
    this.frozenOpponent = false;
    this.opponentFrozenTurns = 0;
    this.activeRadar = [];
    this.radarEndTime = 0;
  }
}
