import { Position, GameState } from './types';

export class AIPlayer {
  private moveInterval: number;
  private lastMoveTime: number;

  constructor(moveInterval: number = 1500) {
    this.moveInterval = moveInterval;
    this.lastMoveTime = 0;
  }

  public shouldMove(currentTime: number): boolean {
    return currentTime - this.lastMoveTime >= this.moveInterval;
  }

  public updateLastMoveTime(time: number): void {
    this.lastMoveTime = time;
  }

  public getNextMove(state: GameState): Position | null {
    const startTime = performance.now();

    if (state.path.length <= 1) {
      return null;
    }

    const currentPos = state.aiPos;
    const currentIndex = state.path.findIndex(
      p => p.x === currentPos.x && p.y === currentPos.y
    );

    if (currentIndex === -1 || currentIndex >= state.path.length - 1) {
      return this.getGreedyMove(state);
    }

    if (Math.random() < 0.3) {
      const greedyMove = this.getGreedyMove(state);
      if (greedyMove && this.isValidMove(state, greedyMove)) {
        this.checkPerformance(startTime);
        return greedyMove;
      }
    }

    const nextPos = state.path[currentIndex + 1];
    if (nextPos && this.isValidMove(state, nextPos)) {
      this.checkPerformance(startTime);
      return nextPos;
    }

    const alternativeMove = this.findAlternativeMove(state);
    this.checkPerformance(startTime);
    return alternativeMove;
  }

  private getGreedyMove(state: GameState): Position | null {
    const currentPos = state.aiPos;
    const goalPos = state.goalPos;

    const directions = [
      { dx: 0, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 0 }
    ];

    directions.sort((a, b) => {
      const distA = Math.abs((currentPos.x + a.dx) - goalPos.x) + 
                   Math.abs((currentPos.y + a.dy) - goalPos.y);
      const distB = Math.abs((currentPos.x + b.dx) - goalPos.x) + 
                   Math.abs((currentPos.y + b.dy) - goalPos.y);
      return distA - distB;
    });

    for (const dir of directions) {
      const nx = currentPos.x + dir.dx;
      const ny = currentPos.y + dir.dy;
      const nextPos = { x: nx, y: ny };
      
      if (this.isValidMove(state, nextPos)) {
        return nextPos;
      }
    }

    return null;
  }

  private findAlternativeMove(state: GameState): Position | null {
    const currentPos = state.aiPos;
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ].sort(() => Math.random() - 0.5);

    for (const dir of directions) {
      const nx = currentPos.x + dir.dx;
      const ny = currentPos.y + dir.dy;
      const nextPos = { x: nx, y: ny };
      
      if (this.isValidMove(state, nextPos)) {
        return nextPos;
      }
    }

    return null;
  }

  private isValidMove(state: GameState, pos: Position): boolean {
    const size = state.board.length;
    
    if (pos.x < 0 || pos.x >= size || pos.y < 0 || pos.y >= size) {
      return false;
    }

    if (pos.x === state.playerPos.x && pos.y === state.playerPos.y) {
      return false;
    }

    return true;
  }

  private checkPerformance(startTime: number): void {
    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`AI decision took ${elapsed.toFixed(2)}ms, exceeding 50ms limit`);
    }
  }

  public getMoveInterval(): number {
    return this.moveInterval;
  }
}
