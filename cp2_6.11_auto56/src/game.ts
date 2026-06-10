export enum TerrainHeight {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2
}

export enum Player {
  NONE = 0,
  PLAYER1 = 1,
  PLAYER2 = 2
}

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainHeight;
  piece: Player;
  terrainAnimProgress: number;
  prevTerrain: TerrainHeight;
  terrainAnimDelay: number;
}

export type AnimationType = 'drop' | 'knockback' | 'eliminate' | 'idle';

export interface PieceAnimation {
  id: number;
  x: number;
  y: number;
  player: Player;
  type: AnimationType;
  progress: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  elapsed: number;
}

export interface RippleEffect {
  id: number;
  x: number;
  y: number;
  progress: number;
  maxRadius: number;
  duration: number;
  elapsed: number;
}

export interface TerrainAnimation {
  cellX: number;
  cellY: number;
  delay: number;
  elapsed: number;
}

export interface GameState {
  board: Cell[][];
  currentPlayer: Player;
  round: number;
  scores: Record<Player, number>;
  remainingPieces: Record<Player, number>;
  isGameOver: boolean;
  winner: Player;
  animations: PieceAnimation[];
  ripples: RippleEffect[];
  terrainAnimations: TerrainAnimation[];
  isStarted: boolean;
  isAnimating: boolean;
}

export interface KnockbackResult {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  player: Player;
  eliminated: boolean;
}

export interface CombatInfo {
  attackerX: number;
  attackerY: number;
  defenderX: number;
  defenderY: number;
  attackerAtk: number;
  defenderAtk: number;
  attackerTerrainBonus: number;
  defenderTerrainBonus: number;
}

export interface PerformanceMetrics {
  lastFrameTime: number;
  fps: number;
  frameCount: number;
  fpsUpdateTime: number;
  logicResponseTime: number;
  maxLogicTime: number;
}

const BOARD_SIZE = 6;
const TIDAL_RANGE = 3;
export const INITIAL_PIECES_PER_PLAYER = 18;

const DROP_ANIM_DURATION = 500;
const KNOCKBACK_ANIM_DURATION = 300;
const ELIMINATE_ANIM_DURATION = 400;
const RIPPLE_DURATION = 600;
const TERRAIN_ANIM_DURATION = 500;
const TERRAIN_ANIM_STAGGER = 50;

const BASE_ATTACK = 1;
const HIGH_GROUND_ATTACK_BONUS = 1;
const LOW_GROUND_ATTACK_PENALTY = 1;
const HIGH_GROUND_DEFENSE_BONUS = 0;
const LOW_GROUND_DEFENSE_PENALTY = 1;

let animationIdCounter = 0;
let rippleIdCounter = 0;

export class AnimationManager {
  private animationQueue: Array<() => void> = [];
  private isProcessing: boolean = false;

  queue(animationFn: () => void): void {
    this.animationQueue.push(animationFn);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isProcessing || this.animationQueue.length === 0) return;
    this.isProcessing = true;
    const anim = this.animationQueue.shift();
    if (anim) {
      anim();
    }
    this.isProcessing = false;
    if (this.animationQueue.length > 0) {
      setTimeout(() => this.processQueue(), 50);
    }
  }

  clear(): void {
    this.animationQueue = [];
    this.isProcessing = false;
  }

  hasPending(): boolean {
    return this.animationQueue.length > 0;
  }
}

export class Game {
  private state: GameState;
  private animationManager: AnimationManager;
  private perfMetrics: PerformanceMetrics;

  constructor() {
    this.animationManager = new AnimationManager();
    this.perfMetrics = {
      lastFrameTime: 0,
      fps: 60,
      frameCount: 0,
      fpsUpdateTime: 0,
      logicResponseTime: 0,
      maxLogicTime: 0
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const board: Cell[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      board[y] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        board[y][x] = {
          x,
          y,
          terrain: TerrainHeight.MEDIUM,
          prevTerrain: TerrainHeight.MEDIUM,
          piece: Player.NONE,
          terrainAnimProgress: 1,
          terrainAnimDelay: 0
        };
      }
    }

    return {
      board,
      currentPlayer: Player.PLAYER1,
      round: 1,
      scores: { [Player.NONE]: 0, [Player.PLAYER1]: 0, [Player.PLAYER2]: 0 },
      remainingPieces: {
        [Player.NONE]: 0,
        [Player.PLAYER1]: INITIAL_PIECES_PER_PLAYER,
        [Player.PLAYER2]: INITIAL_PIECES_PER_PLAYER
      },
      isGameOver: false,
      winner: Player.NONE,
      animations: [],
      ripples: [],
      terrainAnimations: [],
      isStarted: false,
      isAnimating: false
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  getAnimationManager(): AnimationManager {
    return this.animationManager;
  }

  getPerformanceMetrics(): Readonly<PerformanceMetrics> {
    return this.perfMetrics;
  }

  start(): void {
    this.state.isStarted = true;
  }

  reset(): void {
    this.animationManager.clear();
    this.perfMetrics = {
      lastFrameTime: 0,
      fps: 60,
      frameCount: 0,
      fpsUpdateTime: 0,
      logicResponseTime: 0,
      maxLogicTime: 0
    };
    this.state = this.createInitialState();
  }

  canPlacePiece(x: number, y: number): boolean {
    if (!this.state.isStarted || this.state.isGameOver) return false;
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false;
    if (this.state.board[y][x].piece !== Player.NONE) return false;
    if (this.state.remainingPieces[this.state.currentPlayer] <= 0) return false;
    if (this.state.isAnimating) return false;
    return true;
  }

  placePiece(x: number, y: number): boolean {
    const logicStartTime = performance.now();

    if (!this.canPlacePiece(x, y)) {
      this.recordLogicTime(logicStartTime);
      return false;
    }

    this.state.isAnimating = true;

    const cell = this.state.board[y][x];
    cell.piece = this.state.currentPlayer;
    this.state.remainingPieces[this.state.currentPlayer]--;
    this.state.scores[this.state.currentPlayer]++;

    this.state.animations.push({
      id: ++animationIdCounter,
      x,
      y,
      player: this.state.currentPlayer,
      type: 'drop',
      progress: 0,
      startX: x,
      startY: y - 3,
      endX: x,
      endY: y,
      duration: DROP_ANIM_DURATION,
      elapsed: 0
    });

    this.state.ripples.push({
      id: ++rippleIdCounter,
      x,
      y,
      progress: 0,
      maxRadius: TIDAL_RANGE,
      duration: RIPPLE_DURATION,
      elapsed: 0
    });

    this.applyTidalSurge(x, y);

    setTimeout(() => {
      const knockbackResults = this.checkAndResolveCombat(x, y);

      for (const result of knockbackResults) {
        if (result.eliminated) {
          this.state.scores[this.state.currentPlayer]++;
        }
      }

      this.checkGameOver();

      if (!this.state.isGameOver) {
        this.switchPlayer();
      }

      setTimeout(() => {
        this.state.isAnimating = false;
      }, Math.max(KNOCKBACK_ANIM_DURATION, ELIMINATE_ANIM_DURATION) + 50);

    }, Math.max(RIPPLE_DURATION, TERRAIN_ANIM_DURATION + TIDAL_RANGE * TERRAIN_ANIM_STAGGER));

    this.recordLogicTime(logicStartTime);
    return true;
  }

  private recordLogicTime(startTime: number): void {
    const elapsed = performance.now() - startTime;
    this.perfMetrics.logicResponseTime = elapsed;
    if (elapsed > this.perfMetrics.maxLogicTime) {
      this.perfMetrics.maxLogicTime = elapsed;
    }
    if (elapsed > 200) {
      console.warn(`Game logic exceeded 200ms: ${elapsed.toFixed(2)}ms`);
    }
  }

  private applyTidalSurge(centerX: number, centerY: number): void {
    const affectedCells: { cell: Cell; distance: number }[] = [];

    for (let dy = -TIDAL_RANGE; dy <= TIDAL_RANGE; dy++) {
      for (let dx = -TIDAL_RANGE; dx <= TIDAL_RANGE; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > TIDAL_RANGE) continue;

        const x = centerX + dx;
        const y = centerY + dy;
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) continue;

        const cell = this.state.board[y][x];
        cell.prevTerrain = cell.terrain;
        cell.terrain = ((cell.terrain + 1) % 3) as TerrainHeight;
        cell.terrainAnimProgress = 0;
        cell.terrainAnimDelay = distance * TERRAIN_ANIM_STAGGER;
        affectedCells.push({ cell, distance });
      }
    }

    affectedCells.sort((a, b) => a.distance - b.distance);
  }

  private checkAndResolveCombat(_placedX: number, _placedY: number): KnockbackResult[] {
    const results: KnockbackResult[] = [];
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    const combatPairs: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.state.board[y][x].piece === Player.NONE) continue;

        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;

          const cell1 = this.state.board[y][x];
          const cell2 = this.state.board[ny][nx];

          if (cell1.piece === Player.NONE || cell2.piece === Player.NONE) continue;
          if (cell1.piece === cell2.piece) continue;
          if (cell1.terrain !== TerrainHeight.HIGH && cell2.terrain !== TerrainHeight.HIGH) continue;

          const pairExists = combatPairs.some(p =>
            (p.x1 === nx && p.y1 === ny && p.x2 === x && p.y2 === y)
          );
          if (!pairExists) {
            combatPairs.push({ x1: x, y1: y, x2: nx, y2: ny });
          }
        }
      }
    }

    for (const pair of combatPairs) {
      const cell1 = this.state.board[pair.y1][pair.x1];
      const cell2 = this.state.board[pair.y2][pair.x2];

      const { atk: atk1 } = this.calculateAttack(cell1, cell2);
      const { atk: atk2 } = this.calculateAttack(cell2, cell1);

      if (atk1 > atk2) {
        const result = this.knockback(pair.x2, pair.y2, pair.x2 - pair.x1, pair.y2 - pair.y1);
        if (result) results.push(result);
      } else if (atk2 > atk1) {
        const result = this.knockback(pair.x1, pair.y1, pair.x1 - pair.x2, pair.y1 - pair.y2);
        if (result) results.push(result);
      }
    }

    return results;
  }

  private calculateAttack(attacker: Cell, defender: Cell): { atk: number; bonus: number } {
    let atk = BASE_ATTACK;
    let bonus = 0;

    if (attacker.terrain === TerrainHeight.HIGH) {
      bonus += HIGH_GROUND_ATTACK_BONUS;
    }
    if (attacker.terrain === TerrainHeight.LOW) {
      bonus -= LOW_GROUND_ATTACK_PENALTY;
    }
    if (defender.terrain === TerrainHeight.HIGH) {
      bonus -= HIGH_GROUND_DEFENSE_BONUS;
    }
    if (defender.terrain === TerrainHeight.LOW) {
      bonus += LOW_GROUND_DEFENSE_PENALTY;
    }

    atk += bonus;
    return { atk: Math.max(0, atk), bonus };
  }

  private knockback(x: number, y: number, dirX: number, dirY: number): KnockbackResult | null {
    const cell = this.state.board[y][x];
    if (cell.piece === Player.NONE) return null;

    const targetX = x + dirX;
    const targetY = y + dirY;

    const player = cell.piece;
    const opponent = player === Player.PLAYER1 ? Player.PLAYER2 : Player.PLAYER1;

    let eliminated = false;

    if (targetX < 0 || targetX >= BOARD_SIZE || targetY < 0 || targetY >= BOARD_SIZE) {
      eliminated = true;
      cell.piece = Player.NONE;
      this.state.scores[opponent]++;
      this.state.scores[player] = Math.max(0, this.state.scores[player] - 1);

      this.state.animations.push({
        id: ++animationIdCounter,
        x,
        y,
        player,
        type: 'eliminate',
        progress: 0,
        startX: x,
        startY: y,
        endX: targetX,
        endY: targetY,
        duration: ELIMINATE_ANIM_DURATION,
        elapsed: 0
      });
    } else {
      const targetCell = this.state.board[targetY][targetX];
      if (targetCell.piece !== Player.NONE) {
        eliminated = true;
        cell.piece = Player.NONE;
        this.state.scores[opponent]++;
        this.state.scores[player] = Math.max(0, this.state.scores[player] - 1);

        this.state.animations.push({
          id: ++animationIdCounter,
          x,
          y,
          player,
          type: 'eliminate',
          progress: 0,
          startX: x,
          startY: y,
          endX: x + dirX * 0.5,
          endY: y + dirY * 0.5,
          duration: ELIMINATE_ANIM_DURATION,
          elapsed: 0
        });
      } else {
        cell.piece = Player.NONE;
        targetCell.piece = player;

        this.state.animations.push({
          id: ++animationIdCounter,
          x: targetX,
          y: targetY,
          player,
          type: 'knockback',
          progress: 0,
          startX: x,
          startY: y,
          endX: targetX,
          endY: targetY,
          duration: KNOCKBACK_ANIM_DURATION,
          elapsed: 0
        });

        return {
          fromX: x,
          fromY: y,
          toX: targetX,
          toY: targetY,
          player,
          eliminated: false
        };
      }
    }

    return eliminated ? {
      fromX: x,
      fromY: y,
      toX: targetX,
      toY: targetY,
      player,
      eliminated: true
    } : null;
  }

  private switchPlayer(): void {
    this.state.currentPlayer =
      this.state.currentPlayer === Player.PLAYER1 ? Player.PLAYER2 : Player.PLAYER1;
    if (this.state.currentPlayer === Player.PLAYER1) {
      this.state.round++;
    }
  }

  private checkGameOver(): void {
    const p1Remaining = this.state.remainingPieces[Player.PLAYER1];
    const p2Remaining = this.state.remainingPieces[Player.PLAYER2];
    const p1OnBoard = this.countPieces(Player.PLAYER1);
    const p2OnBoard = this.countPieces(Player.PLAYER2);

    const bothOutOfPieces = p1Remaining === 0 && p2Remaining === 0;
    const oneOutOfPieces = p1Remaining === 0 || p2Remaining === 0;
    const boardFull = p1OnBoard + p2OnBoard === BOARD_SIZE * BOARD_SIZE;

    if (bothOutOfPieces || boardFull || (oneOutOfPieces && this.noValidMoves())) {
      this.state.isGameOver = true;
      if (this.state.scores[Player.PLAYER1] > this.state.scores[Player.PLAYER2]) {
        this.state.winner = Player.PLAYER1;
      } else if (this.state.scores[Player.PLAYER2] > this.state.scores[Player.PLAYER1]) {
        this.state.winner = Player.PLAYER2;
      } else {
        this.state.winner = Player.NONE;
      }
    }
  }

  private noValidMoves(): boolean {
    const current = this.state.currentPlayer;
    if (this.state.remainingPieces[current] > 0) return false;

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.state.board[y][x].piece === Player.NONE) return false;
      }
    }
    return true;
  }

  private countPieces(player: Player): number {
    let count = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.state.board[y][x].piece === player) count++;
      }
    }
    return count;
  }

  update(deltaTime: number, currentTime: number): void {
    this.updateFPS(currentTime);

    const finishedAnimIndices: number[] = [];
    this.state.animations.forEach((anim, index) => {
      anim.elapsed += deltaTime;
      anim.progress = Math.min(1, anim.elapsed / anim.duration);
      if (anim.progress >= 1) {
        finishedAnimIndices.push(index);
      }
    });

    for (let i = finishedAnimIndices.length - 1; i >= 0; i--) {
      this.state.animations.splice(finishedAnimIndices[i], 1);
    }

    const finishedRippleIndices: number[] = [];
    this.state.ripples.forEach((ripple, index) => {
      ripple.elapsed += deltaTime;
      ripple.progress = Math.min(1, ripple.elapsed / ripple.duration);
      if (ripple.progress >= 1) {
        finishedRippleIndices.push(index);
      }
    });

    for (let i = finishedRippleIndices.length - 1; i >= 0; i--) {
      this.state.ripples.splice(finishedRippleIndices[i], 1);
    }

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = this.state.board[y][x];
        if (cell.terrainAnimDelay > 0) {
          cell.terrainAnimDelay -= deltaTime;
          if (cell.terrainAnimDelay < 0) cell.terrainAnimDelay = 0;
        } else if (cell.terrainAnimProgress < 1) {
          cell.terrainAnimProgress += deltaTime / TERRAIN_ANIM_DURATION;
          if (cell.terrainAnimProgress > 1) cell.terrainAnimProgress = 1;
        }
      }
    }

    if (this.state.animations.length === 0 &&
        this.state.ripples.length === 0 &&
        this.state.isAnimating) {
      let allTerrainAnimDone = true;
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (this.state.board[y][x].terrainAnimProgress < 1) {
            allTerrainAnimDone = false;
            break;
          }
        }
        if (!allTerrainAnimDone) break;
      }
      if (allTerrainAnimDone) {
        this.state.isAnimating = false;
      }
    }
  }

  private updateFPS(currentTime: number): void {
    this.perfMetrics.frameCount++;
    if (currentTime - this.perfMetrics.fpsUpdateTime >= 1000) {
      this.perfMetrics.fps = this.perfMetrics.frameCount;
      this.perfMetrics.frameCount = 0;
      this.perfMetrics.fpsUpdateTime = currentTime;

      if (this.perfMetrics.fps < 30) {
        console.warn(`FPS dropped below 30: ${this.perfMetrics.fps}`);
      }
    }
  }

  getBoardSize(): number {
    return BOARD_SIZE;
  }

  getTidalRange(): number {
    return TIDAL_RANGE;
  }

  getCellAt(x: number, y: number): Readonly<Cell> | null {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;
    return this.state.board[y][x];
  }

  getCombatInfo(attackerX: number, attackerY: number, defenderX: number, defenderY: number): CombatInfo | null {
    const attacker = this.getCellAt(attackerX, attackerY);
    const defender = this.getCellAt(defenderX, defenderY);
    if (!attacker || !defender) return null;

    const { atk: attackerAtk, bonus: attackerBonus } = this.calculateAttack(attacker, defender);
    const { atk: defenderAtk, bonus: defenderBonus } = this.calculateAttack(defender, attacker);

    return {
      attackerX,
      attackerY,
      defenderX,
      defenderY,
      attackerAtk,
      defenderAtk,
      attackerTerrainBonus: attackerBonus,
      defenderTerrainBonus: defenderBonus
    };
  }

  getAttackBonusDescription(): string {
    return `基础攻击: ${BASE_ATTACK}, 高地加成: +${HIGH_GROUND_ATTACK_BONUS}, 低地惩罚: -${LOW_GROUND_ATTACK_PENALTY}`;
  }
}
