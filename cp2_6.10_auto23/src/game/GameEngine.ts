import { Position, CellState, GameState } from './types';
import { Pathfinder } from './Pathfinder';

export class GameEngine {
  private size: number;
  private pathfinder: Pathfinder;
  private playerStart: Position;
  private aiStart: Position;
  private goalPos: Position;

  constructor(size: number = 6) {
    this.size = size;
    this.pathfinder = new Pathfinder(size);
    this.playerStart = { x: 0, y: 0 };
    this.aiStart = { x: size - 1, y: size - 1 };
    this.goalPos = { x: 0, y: 0 };
  }

  public initializeGame(): GameState {
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

    const path = this.pathfinder.findRandomPath(this.aiStart, this.goalPos);

    return {
      board,
      playerPos: { ...this.playerStart },
      aiPos: { ...this.aiStart },
      goalPos: { ...this.goalPos },
      path,
      turn: 1,
      score: 0,
      aiStepsRemaining: path.length,
      isGameOver: false,
      winner: null,
      aiPaused: false
    };
  }

  public placeTrap(state: GameState, x: number, y: number): GameState {
    if (state.isGameOver) return state;
    
    const cell = state.board[y][x];
    if (cell.type !== 'empty') return state;
    if (x === state.aiPos.x && y === state.aiPos.y) return state;
    if (x === state.playerPos.x && y === state.playerPos.y) return state;

    const newBoard = state.board.map(row => row.map(c => ({ ...c })));
    newBoard[y][x] = { ...newBoard[y][x], type: 'trap', isFlashing: true };

    this.pathfinder.setTrapWeight(x, y);
    const newPath = this.pathfinder.findPath(state.aiPos, state.goalPos);

    const finalPath = newPath.length > 0 ? newPath : state.path;

    setTimeout(() => {
      newBoard[y][x].isFlashing = false;
    }, 500);

    return {
      ...state,
      board: newBoard,
      path: finalPath,
      aiStepsRemaining: finalPath.length
    };
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
