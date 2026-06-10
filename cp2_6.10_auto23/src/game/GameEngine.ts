import { Position, CellState, GameState, WeightUpdate } from './types';
import { Pathfinder } from './Pathfinder';

export class GameEngine {
  private size: number;
  private pathfinder: Pathfinder;
  private playerStart: Position;
  private aiStart: Position;
  private goalPos: Position;
  private weights: number[][];

  constructor(size: number = 6) {
    this.size = size;
    this.pathfinder = new Pathfinder(size);
    this.playerStart = { x: 0, y: 0 };
    this.aiStart = { x: size - 1, y: size - 1 };
    this.goalPos = { x: 0, y: 0 };
    this.weights = this.initializeWeights();
  }

  private initializeWeights(): number[][] {
    const w: number[][] = [];
    for (let y = 0; y < this.size; y++) {
      w[y] = [];
      for (let x = 0; x < this.size; x++) {
        w[y][x] = 1;
      }
    }
    return w;
  }

  public updateWeight(update: WeightUpdate): void {
    if (update.x >= 0 && update.x < this.size && update.y >= 0 && update.y < this.size) {
      this.weights[update.y][update.x] = update.weight;
      if (update.weight === Infinity) {
        this.pathfinder.setTrapWeight(update.x, update.y);
      } else {
        this.pathfinder.resetWeight(update.x, update.y);
      }
    }
  }

  public getWeights(): number[][] {
    return this.weights.map(row => [...row]);
  }

  public initializeGame(): GameState {
    this.weights = this.initializeWeights();
    this.pathfinder.resetAllWeights();
    
    const board: CellState[][] = [];
    for (let y = 0; y < this.size; y++) {
      board[y] = [];
      for (let x = 0; x < this.size; x++) {
        let type: CellState['type'] = 'empty';
        if (x === this.playerStart.x && y === this.playerStart.y) {
          type = 'player-start';
        } else if (x === this.aiStart.x && y === this.aiStart.y) {
          type = 'ai-start';
        } else if (x === this.goalPos.x && y === this.goalPos.y) {
          type = 'goal';
        }
        board[y][x] = { type };
      }
    }

    const path = this.generateRandomPath();

    return {
      board,
      playerPos: { ...this.playerStart },
      aiPos: { ...this.aiStart },
      goalPos: { ...this.goalPos },
      path,
      turn: 1,
      score: 0,
      aiStepsRemaining: Math.max(0, path.length - 1),
      isGameOver: false,
      winner: null,
      aiPaused: false
    };
  }

  private generateRandomPath(): Position[] {
    const path: Position[] = [this.aiStart];
    let current = { ...this.aiStart };
    const visited = new Set<string>();
    visited.add(`${current.x},${current.y}`);

    const maxIterations = this.size * this.size * 2;
    let iterations = 0;

    while ((current.x !== this.goalPos.x || current.y !== this.goalPos.y) && iterations < maxIterations) {
      iterations++;

      const directions = this.getWeightedDirections(current, this.goalPos);

      let moved = false;
      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (this.isValidPosition(nx, ny) && !visited.has(key) && this.weights[ny][nx] !== Infinity) {
          current = { x: nx, y: ny };
          path.push({ ...current });
          visited.add(key);
          moved = true;
          break;
        }
      }

      if (!moved) {
        const shortestPath = this.pathfinder.findPath(this.aiStart, this.goalPos);
        if (shortestPath.length > 0) {
          return shortestPath;
        }
        break;
      }
    }

    return path.length > 1 ? path : [this.aiStart, this.goalPos];
  }

  private getWeightedDirections(current: Position, goal: Position): Array<{ dx: number; dy: number; priority: number }> {
    const baseDirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];

    return baseDirs
      .map(dir => {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const distToGoal = Math.abs(nx - goal.x) + Math.abs(ny - goal.y);
        const randomFactor = Math.random() * 2;
        return {
          ...dir,
          priority: distToGoal + randomFactor
        };
      })
      .sort((a, b) => a.priority - b.priority);
  }

  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  public placeTrap(state: GameState, x: number, y: number): GameState {
    if (state.isGameOver) return state;
    
    const cell = state.board[y][x];
    if (cell.type !== 'empty') return state;
    if (x === state.aiPos.x && y === state.aiPos.y) return state;
    if (x === state.playerPos.x && y === state.playerPos.y) return state;

    this.updateWeight({ x, y, weight: Infinity });

    const newBoard = state.board.map(row => row.map(c => ({ ...c })));
    newBoard[y][x] = { ...newBoard[y][x], type: 'trap', isFlashing: true };

    const newPath = this.recalculatePath(state.aiPos, state.goalPos);
    const finalPath = newPath.length > 0 ? newPath : state.path;

    setTimeout(() => {
      if (newBoard[y] && newBoard[y][x]) {
        newBoard[y][x].isFlashing = false;
      }
    }, 500);

    return {
      ...state,
      board: newBoard,
      path: finalPath,
      aiStepsRemaining: Math.max(0, finalPath.length - 1)
    };
  }

  private recalculatePath(from: Position, to: Position): Position[] {
    const aStarPath = this.pathfinder.findPath(from, to);
    if (aStarPath.length > 0) {
      return aStarPath;
    }

    const fallbackPath: Position[] = [from];
    let current = { ...from };
    const visited = new Set<string>([`${current.x},${current.y}`]);
    let iterations = 0;

    while ((current.x !== to.x || current.y !== to.y) && iterations < 100) {
      iterations++;
      const dirs = this.getWeightedDirections(current, to);
      let moved = false;

      for (const dir of dirs) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (this.isValidPosition(nx, ny) && !visited.has(key) && this.weights[ny][nx] !== Infinity) {
          current = { x: nx, y: ny };
          fallbackPath.push({ ...current });
          visited.add(key);
          moved = true;
          break;
        }
      }

      if (!moved) break;
    }

    return fallbackPath;
  }

  public addCellParticles(state: GameState, x: number, y: number): GameState {
    const newBoard = state.board.map(row => row.map(c => ({ ...c })));
    const particles = Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      return {
        id: Date.now() + i,
        dx: Math.cos(angle) * 30,
        dy: Math.sin(angle) * 30
      };
    });
    newBoard[y][x].particles = particles;

    setTimeout(() => {
      if (newBoard[y][x].particles) {
        delete newBoard[y][x].particles;
      }
    }, 400);

    return {
      ...state,
      board: newBoard
    };
  }

  public moveAI(state: GameState, nextPos: Position): GameState {
    if (state.isGameOver) return state;
    if (state.aiPaused) {
      return {
        ...state,
        aiPaused: false,
        turn: state.turn + 1
      };
    }

    const newBoard = state.board.map(row => row.map(c => ({ ...c })));

    const oldX = state.aiPos.x;
    const oldY = state.aiPos.y;
    if (newBoard[oldY][oldX].type === 'ai') {
      newBoard[oldY][oldX].type = 'empty';
    }

    newBoard[nextPos.y][nextPos.x].isPulsing = true;
    setTimeout(() => {
      if (newBoard[nextPos.y] && newBoard[nextPos.y][nextPos.x]) {
        newBoard[nextPos.y][nextPos.x].isPulsing = false;
      }
    }, 300);

    const targetCell = state.board[nextPos.y][nextPos.x];
    let newAiPos = nextPos;
    let newScore = state.score;
    let aiPaused = false;
    let newPath = state.path;

    if (targetCell.type === 'trap') {
      newBoard[nextPos.y][nextPos.x].isExploding = true;
      newBoard[nextPos.y][nextPos.x].type = 'empty';
      this.pathfinder.resetWeight(nextPos.x, nextPos.y);
      
      setTimeout(() => {
        if (newBoard[nextPos.y] && newBoard[nextPos.y][nextPos.x]) {
          newBoard[nextPos.y][nextPos.x].isExploding = false;
        }
      }, 800);

      const pathIndex = state.path.findIndex(p => p.x === nextPos.x && p.y === nextPos.y);
      const retreatIndex = Math.max(0, pathIndex - 2);
      newAiPos = state.path[retreatIndex] || state.aiStart;
      newScore = state.score + 1;
      aiPaused = true;

      newPath = this.pathfinder.findPath(newAiPos, state.goalPos);
      if (newPath.length === 0) {
        newPath = state.path.slice(0, retreatIndex + 1);
      }
    }

    if (newAiPos.x === state.goalPos.x && newAiPos.y === state.goalPos.y) {
      return {
        ...state,
        board: newBoard,
        aiPos: newAiPos,
        path: newPath,
        turn: state.turn + 1,
        score: newScore,
        aiStepsRemaining: 0,
        isGameOver: true,
        winner: 'ai',
        aiPaused
      };
    }

    if (newScore >= 5) {
      return {
        ...state,
        board: newBoard,
        aiPos: newAiPos,
        path: newPath,
        turn: state.turn + 1,
        score: newScore,
        aiStepsRemaining: newPath.length,
        isGameOver: true,
        winner: 'player',
        aiPaused
      };
    }

    return {
      ...state,
      board: newBoard,
      aiPos: newAiPos,
      path: newPath,
      turn: state.turn + 1,
      score: newScore,
      aiStepsRemaining: newPath.length,
      aiPaused
    };
  }

  public getPathfinder(): Pathfinder {
    return this.pathfinder;
  }

  public getSize(): number {
    return this.size;
  }
}
