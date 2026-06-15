import { Cell, CellType, MazeData, PistilType } from './types';

export class MazeGenerator {
  private width: number;
  private height: number;
  private startPos: { x: number; y: number };
  private endPos: { x: number; y: number };

  constructor(width = 10, height = 10) {
    this.width = width;
    this.height = height;
    this.startPos = { x: 0, y: height - 1 };
    this.endPos = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  }

  public generate(): MazeData {
    const t0 = performance.now();
    let maze: MazeData;
    let attempts = 0;
    do {
      maze = this.generateSingle();
      attempts++;
    } while (!this.validatePath(maze) && attempts < 50);
    const t1 = performance.now();
    console.debug(`[MazeGenerator] 迷宫生成耗时: ${(t1 - t0).toFixed(2)}ms, 尝试次数: ${attempts}`);
    return maze;
  }

  private generateSingle(): MazeData {
    const cells: Cell[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          x,
          y,
          type: CellType.WALL,
          hasLightPoint: false,
          pistilType: null,
          isStart: false,
          isEnd: false,
        });
      }
      cells.push(row);
    }

    const startX = this.startPos.x;
    const startY = this.startPos.y;
    cells[startY][startX].type = CellType.PATH;
    cells[startY][startX].isStart = true;

    this.carvePassages(cells, startX, startY);

    cells[this.endPos.y][this.endPos.x].type = CellType.PATH;
    cells[this.endPos.y][this.endPos.x].isEnd = true;

    this.placePistils(cells);
    this.placeLightPoints(cells);

    return {
      cells,
      startPos: { ...this.startPos },
      endPos: { ...this.endPos },
      width: this.width,
      height: this.height,
    };
  }

  private carvePassages(cells: Cell[][], startX: number, startY: number): void {
    const stack: Array<{ x: number; y: number }> = [];
    const visited = new Set<string>();
    stack.push({ x: startX, y: startY });
    visited.add(`${startX},${startY}`);

    const directions = [
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
      { dx: 2, dy: 0 },
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: Array<{ x: number; y: number; mx: number; my: number }> = [];

      for (const d of directions) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        const mx = current.x + d.dx / 2;
        const my = current.y + d.dy / 2;
        if (
          nx >= 0 && nx < this.width &&
          ny >= 0 && ny < this.height &&
          !visited.has(`${nx},${ny}`)
        ) {
          neighbors.push({ x: nx, y: ny, mx, my });
        }
      }

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      cells[next.my][next.mx].type = CellType.PATH;
      cells[next.y][next.x].type = CellType.PATH;
      visited.add(`${next.x},${next.y}`);
      stack.push({ x: next.x, y: next.y });
    }

    for (let i = 0; i < 8; i++) {
      const rx = 1 + Math.floor(Math.random() * (this.width - 2));
      const ry = 1 + Math.floor(Math.random() * (this.height - 2));
      if (cells[ry][rx].type === CellType.WALL) {
        let pathNeighbors = 0;
        if (ry - 1 >= 0 && cells[ry - 1][rx].type === CellType.PATH) pathNeighbors++;
        if (ry + 1 < this.height && cells[ry + 1][rx].type === CellType.PATH) pathNeighbors++;
        if (rx - 1 >= 0 && cells[ry][rx - 1].type === CellType.PATH) pathNeighbors++;
        if (rx + 1 < this.width && cells[ry][rx + 1].type === CellType.PATH) pathNeighbors++;
        if (pathNeighbors >= 2) {
          cells[ry][rx].type = CellType.PATH;
        }
      }
    }
  }

  private validatePath(maze: MazeData): boolean {
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [maze.startPos];
    visited.add(`${maze.startPos.x},${maze.startPos.y}`);

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.x === maze.endPos.x && cur.y === maze.endPos.y) return true;
      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const key = `${nx},${ny}`;
        if (
          nx >= 0 && nx < maze.width &&
          ny >= 0 && ny < maze.height &&
          !visited.has(key) &&
          maze.cells[ny][nx].type === CellType.PATH
        ) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }

  private placePistils(cells: Cell[][]): void {
    const pathCells: Cell[] = [];
    for (const row of cells) {
      for (const c of row) {
        if (
          c.type === CellType.PATH &&
          !c.isStart && !c.isEnd
        ) {
          pathCells.push(c);
        }
      }
    }
    this.shuffle(pathCells);

    const pistilTypes: PistilType[] = [PistilType.RED_SPEED, PistilType.GREEN_PIERCE, PistilType.BLUE_MIRROR];
    let pi = 0;
    for (const c of pathCells) {
      if (pi >= pistilTypes.length) break;
      const dist = Math.abs(c.x - this.startPos.x) + Math.abs(c.y - this.startPos.y);
      if (dist >= 3 && !c.pistilType && !c.hasLightPoint) {
        c.pistilType = pistilTypes[pi++];
      }
    }
    if (pi < pistilTypes.length) {
      for (const c of pathCells) {
        if (pi >= pistilTypes.length) break;
        if (!c.pistilType && !c.hasLightPoint) {
          c.pistilType = pistilTypes[pi++];
        }
      }
    }
  }

  private placeLightPoints(cells: Cell[][]): void {
    const pathCells: Cell[] = [];
    for (const row of cells) {
      for (const c of row) {
        if (
          c.type === CellType.PATH &&
          !c.isStart && !c.isEnd &&
          !c.pistilType
        ) {
          pathCells.push(c);
        }
      }
    }
    this.shuffle(pathCells);
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < Math.min(count, pathCells.length); i++) {
      pathCells[i].hasLightPoint = true;
    }
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
