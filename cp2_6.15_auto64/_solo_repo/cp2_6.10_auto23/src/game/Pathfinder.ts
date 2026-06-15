import { Position } from './types';

export class Pathfinder {
  private size: number;
  private weights: number[][];

  constructor(size: number) {
    this.size = size;
    this.weights = this.initializeWeights();
  }

  private initializeWeights(): number[][] {
    const weights: number[][] = [];
    for (let y = 0; y < this.size; y++) {
      weights[y] = [];
      for (let x = 0; x < this.size; x++) {
        weights[y][x] = 1;
      }
    }
    return weights;
  }

  public setTrapWeight(x: number, y: number): void {
    if (this.isValidPosition(x, y)) {
      this.weights[y][x] = Infinity;
    }
  }

  public resetWeight(x: number, y: number): void {
    if (this.isValidPosition(x, y)) {
      this.weights[y][x] = 1;
    }
  }

  public resetAllWeights(): void {
    this.weights = this.initializeWeights();
  }

  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  private getNeighbors(pos: Position): Position[] {
    const neighbors: Position[] = [];
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];

    for (const dir of directions) {
      const nx = pos.x + dir.dx;
      const ny = pos.y + dir.dy;
      if (this.isValidPosition(nx, ny) && this.weights[ny][nx] !== Infinity) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  private heuristic(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  public findPath(start: Position, goal: Position): Position[] {
    const startTime = performance.now();
    
    const openSet: Position[] = [start];
    const closedSet: Set<string> = new Set();
    const cameFrom: Map<string, Position> = new Map();
    const gScore: Map<string, number> = new Map();
    const fScore: Map<string, number> = new Map();

    const posKey = (p: Position) => `${p.x},${p.y}`;

    gScore.set(posKey(start), 0);
    fScore.set(posKey(start), this.heuristic(start, goal));

    while (openSet.length > 0) {
      if (performance.now() - startTime > 40) {
        break;
      }

      let current = openSet[0];
      let currentF = fScore.get(posKey(current)) || Infinity;
      
      for (const pos of openSet) {
        const f = fScore.get(posKey(pos)) || Infinity;
        if (f < currentF) {
          current = pos;
          currentF = f;
        }
      }

      if (current.x === goal.x && current.y === goal.y) {
        return this.reconstructPath(cameFrom, current);
      }

      openSet.splice(openSet.indexOf(current), 1);
      closedSet.add(posKey(current));

      for (const neighbor of this.getNeighbors(current)) {
        if (closedSet.has(posKey(neighbor))) continue;

        const tentativeG = (gScore.get(posKey(current)) || 0) + this.weights[neighbor.y][neighbor.x];

        if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor);
        } else if (tentativeG >= (gScore.get(posKey(neighbor)) || Infinity)) {
          continue;
        }

        cameFrom.set(posKey(neighbor), current);
        gScore.set(posKey(neighbor), tentativeG);
        fScore.set(posKey(neighbor), tentativeG + this.heuristic(neighbor, goal));
      }
    }

    return [];
  }

  private reconstructPath(cameFrom: Map<string, Position>, current: Position): Position[] {
    const path: Position[] = [current];
    const posKey = (p: Position) => `${p.x},${p.y}`;
    
    while (cameFrom.has(posKey(current))) {
      current = cameFrom.get(posKey(current))!;
      path.unshift(current);
    }
    
    return path;
  }

  public findRandomPath(start: Position, goal: Position): Position[] {
    const path: Position[] = [start];
    let current = { ...start };
    const visited = new Set<string>();
    visited.add(`${current.x},${current.y}`);

    const maxIterations = this.size * this.size;
    let iterations = 0;

    while ((current.x !== goal.x || current.y !== goal.y) && iterations < maxIterations) {
      iterations++;
      
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }
      ].sort(() => Math.random() - 0.5);

      let moved = false;

      const sortedDirs = directions.sort((a, b) => {
        const distA = Math.abs((current.x + a.dx) - goal.x) + Math.abs((current.y + a.dy) - goal.y);
        const distB = Math.abs((current.x + b.dx) - goal.x) + Math.abs((current.y + b.dy) - goal.y);
        return distA - distB + (Math.random() - 0.5) * 2;
      });

      for (const dir of sortedDirs) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (this.isValidPosition(nx, ny) && !visited.has(key) && this.weights[ny][nx] !== Infinity) {
          current = { x: nx, y: ny };
          path.push(current);
          visited.add(key);
          moved = true;
          break;
        }
      }

      if (!moved) {
        const shortestPath = this.findPath(start, goal);
        if (shortestPath.length > 0) {
          return shortestPath;
        }
        break;
      }
    }

    return path;
  }
}
