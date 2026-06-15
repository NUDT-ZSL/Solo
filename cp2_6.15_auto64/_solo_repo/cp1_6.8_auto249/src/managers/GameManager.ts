import { Rune, RuneType, RuneTeam, getDamageMultiplier, RUNE_COLORS } from '../entities/Rune';

export enum GamePhase {
  DEPLOY = 'deploy',
  BATTLE = 'battle',
  RESULT = 'result',
}

export interface GameStats {
  playerRunesDestroyed: number;
  enemyRunesDestroyed: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  turnsPlayed: number;
}

export interface AttackAction {
  attacker: Rune;
  target: Rune;
  damage: number;
  multiplier: number;
}

export class GameManager {
  public phase: GamePhase = GamePhase.DEPLOY;
  public currentTurn: RuneTeam = RuneTeam.PLAYER;
  public turnNumber: number = 1;
  public playerRunes: Rune[] = [];
  public enemyRunes: Rune[] = [];
  public deployTimer: number = 30;
  public turnTimer: number = 15;
  public maxDeployRunes: number = 5;
  public playerDeployedCount: number = 0;
  public enemyDeployedCount: number = 0;
  public stats: GameStats = {
    playerRunesDestroyed: 0,
    enemyRunesDestroyed: 0,
    totalDamageDealt: 0,
    totalDamageReceived: 0,
    turnsPlayed: 0,
  };

  public readonly COLS = 8;
  public readonly ROWS = 6;
  public grid: (Rune | null)[][] = [];

  private onPhaseChange?: (phase: GamePhase) => void;
  private onTurnChange?: (team: RuneTeam, turn: number) => void;
  private onTimerUpdate?: (time: number) => void;
  private onGameOver?: (winner: RuneTeam, stats: GameStats) => void;

  constructor() {
    this.initGrid();
  }

  private initGrid(): void {
    this.grid = [];
    for (let r = 0; r < this.ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.COLS; c++) {
        this.grid[r][c] = null;
      }
    }
  }

  setCallbacks(
    onPhaseChange?: (phase: GamePhase) => void,
    onTurnChange?: (team: RuneTeam, turn: number) => void,
    onTimerUpdate?: (time: number) => void,
    onGameOver?: (winner: RuneTeam, stats: GameStats) => void,
  ): void {
    this.onPhaseChange = onPhaseChange;
    this.onTurnChange = onTurnChange;
    this.onTimerUpdate = onTimerUpdate;
    this.onGameOver = onGameOver;
  }

  deployRune(rune: Rune, col: number, row: number): boolean {
    if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return false;
    if (this.grid[row][col] !== null) return false;

    if (rune.team === RuneTeam.PLAYER) {
      if (row < this.ROWS - 2) return false;
      if (this.playerDeployedCount >= this.maxDeployRunes) return false;
      this.playerDeployedCount++;
    } else {
      if (row > 1) return false;
      this.enemyDeployedCount++;
    }

    rune.gridX = col;
    rune.gridY = row;
    this.grid[row][col] = rune;

    if (rune.team === RuneTeam.PLAYER) {
      this.playerRunes.push(rune);
    } else {
      this.enemyRunes.push(rune);
    }

    return true;
  }

  removeRuneAt(col: number, row: number): Rune | null {
    if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return null;
    const rune = this.grid[row][col];
    if (!rune) return null;

    this.grid[row][col] = null;
    if (rune.team === RuneTeam.PLAYER) {
      this.playerDeployedCount--;
      const idx = this.playerRunes.indexOf(rune);
      if (idx >= 0) this.playerRunes.splice(idx, 1);
    } else {
      this.enemyDeployedCount--;
      const idx = this.enemyRunes.indexOf(rune);
      if (idx >= 0) this.enemyRunes.splice(idx, 1);
    }
    return rune;
  }

  startBattle(): void {
    this.phase = GamePhase.BATTLE;
    this.currentTurn = RuneTeam.PLAYER;
    this.turnNumber = 1;
    this.turnTimer = 15;
    this.onPhaseChange?.(GamePhase.BATTLE);
    this.onTurnChange?.(this.currentTurn, this.turnNumber);
  }

  updateDeployTimer(deltaSec: number): void {
    if (this.phase !== GamePhase.DEPLOY) return;
    this.deployTimer -= deltaSec;
    this.onTimerUpdate?.(Math.max(0, this.deployTimer));
    if (this.deployTimer <= 0) {
      this.autoDeployEnemy();
      this.startBattle();
    }
  }

  updateTurnTimer(deltaSec: number): void {
    if (this.phase !== GamePhase.BATTLE) return;
    this.turnTimer -= deltaSec;
    this.onTimerUpdate?.(Math.max(0, this.turnTimer));
    if (this.turnTimer <= 0) {
      this.endTurn();
    }
  }

  autoDeployEnemy(): void {
    const types = [RuneType.FIRE, RuneType.ICE, RuneType.LIGHTNING];
    let placed = 0;
    while (placed < this.maxDeployRunes) {
      const col = Math.floor(Math.random() * this.COLS);
      const row = Math.floor(Math.random() * 2);
      if (this.grid[row][col] === null) {
        const type = types[Math.floor(Math.random() * types.length)];
        const rune = new Rune(type, RuneTeam.ENEMY, 60);
        this.deployRune(rune, col, row);
        placed++;
      }
    }
  }

  computeActions(): AttackAction[] {
    const attackers = this.currentTurn === RuneTeam.PLAYER
      ? this.playerRunes.filter(r => r.isAlive)
      : this.enemyRunes.filter(r => r.isAlive);
    const defenders = this.currentTurn === RuneTeam.PLAYER
      ? this.enemyRunes.filter(r => r.isAlive)
      : this.playerRunes.filter(r => r.isAlive);

    const actions: AttackAction[] = [];
    const targeted = new Set<Rune>();

    for (const attacker of attackers) {
      let bestTarget: Rune | null = null;
      let bestScore = -Infinity;

      for (const defender of defenders) {
        if (!defender.isAlive || targeted.has(defender)) continue;
        const mult = getDamageMultiplier(attacker.runeType, defender.runeType);
        const dist = Math.abs(attacker.gridX - defender.gridX) + Math.abs(attacker.gridY - defender.gridY);
        const score = mult * 10 - dist;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = defender;
        }
      }

      if (bestTarget) {
        targeted.add(bestTarget);
        const mult = getDamageMultiplier(attacker.runeType, bestTarget.runeType);
        const damage = Math.round(attacker.attackPower * mult);
        actions.push({ attacker, target: bestTarget, damage, multiplier: mult });

        if (this.currentTurn === RuneTeam.PLAYER) {
          this.stats.totalDamageDealt += damage;
        } else {
          this.stats.totalDamageReceived += damage;
        }
      }
    }

    return actions;
  }

  computeAIMoves(): { rune: Rune; toCol: number; toRow: number }[] {
    const moves: { rune: Rune; toCol: number; toRow: number }[] = [];
    const enemies = this.enemyRunes.filter(r => r.isAlive);
    const players = this.playerRunes.filter(r => r.isAlive);

    for (const rune of enemies) {
      let bestCol = rune.gridX;
      let bestRow = rune.gridY;
      let bestDist = Infinity;

      for (const player of players) {
        const dx = player.gridX - rune.gridX;
        const dy = player.gridY - rune.gridY;
        const moveCol = rune.gridX + Math.sign(dx) * Math.min(Math.abs(dx), 2);
        const moveRow = rune.gridY + Math.sign(dy) * Math.min(Math.abs(dy), 2);

        const clampedCol = Math.max(0, Math.min(this.COLS - 1, moveCol));
        const clampedRow = Math.max(0, Math.min(this.ROWS - 1, moveRow));

        if (this.grid[clampedRow][clampedCol] !== null && this.grid[clampedRow][clampedCol] !== rune) {
          continue;
        }

        const dist = Math.abs(clampedCol - player.gridX) + Math.abs(clampedRow - player.gridY);
        if (dist < bestDist) {
          bestDist = dist;
          bestCol = clampedCol;
          bestRow = clampedRow;
        }
      }

      if (bestCol !== rune.gridX || bestRow !== rune.gridY) {
        moves.push({ rune, toCol: bestCol, toRow: bestRow });
      }
    }

    return moves;
  }

  applyMove(rune: Rune, toCol: number, toRow: number): boolean {
    if (toRow < 0 || toRow >= this.ROWS || toCol < 0 || toCol >= this.COLS) return false;
    if (this.grid[toRow][toCol] !== null) return false;

    this.grid[rune.gridY][rune.gridX] = null;
    rune.gridX = toCol;
    rune.gridY = toRow;
    this.grid[toRow][toCol] = rune;
    return true;
  }

  applyAction(action: AttackAction): void {
    action.target.takeDamage(action.damage);
    if (!action.target.isAlive) {
      this.grid[action.target.gridY][action.target.gridX] = null;
      if (action.target.team === RuneTeam.PLAYER) {
        this.stats.playerRunesDestroyed++;
      } else {
        this.stats.enemyRunesDestroyed++;
      }
    }
  }

  endTurn(): void {
    this.stats.turnsPlayed++;
    const playerAlive = this.playerRunes.filter(r => r.isAlive).length;
    const enemyAlive = this.enemyRunes.filter(r => r.isAlive).length;

    if (playerAlive === 0) {
      this.endGame(RuneTeam.ENEMY);
      return;
    }
    if (enemyAlive === 0) {
      this.endGame(RuneTeam.PLAYER);
      return;
    }

    this.currentTurn = this.currentTurn === RuneTeam.PLAYER ? RuneTeam.ENEMY : RuneTeam.PLAYER;
    if (this.currentTurn === RuneTeam.PLAYER) {
      this.turnNumber++;
    }
    this.turnTimer = 15;
    this.onTurnChange?.(this.currentTurn, this.turnNumber);
  }

  endGame(winner: RuneTeam): void {
    this.phase = GamePhase.RESULT;
    this.onGameOver?.(winner, { ...this.stats });
  }

  getAliveCount(team: RuneTeam): number {
    return (team === RuneTeam.PLAYER ? this.playerRunes : this.enemyRunes).filter(r => r.isAlive).length;
  }

  reset(): void {
    this.phase = GamePhase.DEPLOY;
    this.currentTurn = RuneTeam.PLAYER;
    this.turnNumber = 1;
    this.deployTimer = 30;
    this.turnTimer = 15;
    this.playerDeployedCount = 0;
    this.enemyDeployedCount = 0;
    this.playerRunes = [];
    this.enemyRunes = [];
    this.stats = {
      playerRunesDestroyed: 0,
      enemyRunesDestroyed: 0,
      totalDamageDealt: 0,
      totalDamageReceived: 0,
      turnsPlayed: 0,
    };
    this.initGrid();
  }
}
