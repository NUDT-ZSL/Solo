export type Cell = {
  row: number;
  col: number;
};

export type WallAnimation = {
  row: number;
  col: number;
  isWall: boolean;
  startTime: number;
  duration: number;
};

const WALL_COLOR = '#2A1B38';
const PATH_COLOR = '#1A1A24';
const EXIT_COLOR = '#FFD700';
const MAZE_SIZE = 20;

export class Maze {
  private size: number;
  private grid: number[][];
  private exit: Cell;
  private start: Cell;
  private wallAnimations: WallAnimation[] = [];
  private lastMutationTime: number = 0;
  private mutationInterval: number = 30000;

  constructor(size: number = MAZE_SIZE) {
    this.size = size;
    this.grid = [];
    this.start = { row: 0, col: 0 };
    this.exit = { row: size - 1, col: size - 1 };
    this.generate();
  }

  public generate(): void {
    this.grid = [];
    for (let r = 0; r < this.size * 2 + 1; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.size * 2 + 1; c++) {
        row.push(1);
      }
      this.grid.push(row);
    }

    this.primGenerate();
    this.grid[1][0] = 0;
    this.grid[this.size * 2 - 1][this.size * 2] = 0;
    this.wallAnimations = [];
    this.lastMutationTime = performance.now();
  }

  private primGenerate(): void {
    const visited: boolean[][] = [];
    for (let r = 0; r < this.size; r++) {
      visited.push(new Array(this.size).fill(false));
    }

    const frontier: { cr: number; cc: number; nr: number; nc: number; wr: number; wc: number }[] = [];

    visited[0][0] = true;
    this.grid[1][1] = 0;

    this.addFrontier(frontier, 0, 0, visited);

    while (frontier.length > 0) {
      const idx = Math.floor(Math.random() * frontier.length);
      const edge = frontier.splice(idx, 1)[0];

      if (visited[edge.nr][edge.nc]) continue;

      visited[edge.nr][edge.nc] = true;
      this.grid[edge.wr * 2 + 1][edge.wc * 2 + 1] = 0;
      this.grid[edge.nr * 2 + 1][edge.nc * 2 + 1] = 0;

      this.addFrontier(frontier, edge.nr, edge.nc, visited);
    }
  }

  private addFrontier(
    frontier: { cr: number; cc: number; nr: number; nc: number; wr: number; wc: number }[],
    r: number,
    c: number,
    visited: boolean[][]
  ): void {
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const d of dirs) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && !visited[nr][nc]) {
        frontier.push({
          cr: r,
          cc: c,
          nr,
          nc,
          wr: r + d.dr,
          wc: c + d.dc,
        });
      }
    }
  }

  public getGrid(): number[][] {
    return this.grid;
  }

  public getSize(): number {
    return this.size;
  }

  public getGridWidth(): number {
    return this.size * 2 + 1;
  }

  public getStart(): Cell {
    return this.start;
  }

  public getExit(): Cell {
    return this.exit;
  }

  public isWall(row: number, col: number): boolean {
    if (row < 0 || row >= this.grid.length || col < 0 || col >= this.grid[0].length) {
      return true;
    }
    const anim = this.getAnimationAt(row, col);
    if (anim) {
      return anim.isWall;
    }
    return this.grid[row][col] === 1;
  }

  public getWallOpacity(row: number, col: number): number {
    const anim = this.getAnimationAt(row, col);
    if (anim) {
      const t = (performance.now() - anim.startTime) / anim.duration;
      const progress = Math.min(1, Math.max(0, t));
      const baseOpacity = anim.isWall ? 0.3 : 1;
      const targetOpacity = anim.isWall ? 1 : 0.3;
      return baseOpacity + (targetOpacity - baseOpacity) * progress;
    }
    return 1;
  }

  private getAnimationAt(row: number, col: number): WallAnimation | undefined {
    return this.wallAnimations.find((a) => a.row === row && a.col === col);
  }

  public update(now: number): void {
    this.wallAnimations = this.wallAnimations.filter((a) => now - a.startTime < a.duration);

    if (now - this.lastMutationTime >= this.mutationInterval) {
      this.lastMutationTime = now;
      this.mutateWalls(now);
    }
  }

  private mutateWalls(now: number): void {
    const count = 3 + Math.floor(Math.random() * 3);
    const candidates: Cell[] = [];

    for (let r = 1; r < this.grid.length - 1; r++) {
      for (let c = 1; c < this.grid[0].length - 1; c++) {
        if (this.isSafeToMutate(r, c)) {
          candidates.push({ row: r, col: c });
        }
      }
    }

    for (let i = 0; i < count && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const cell = candidates.splice(idx, 1)[0];
      const isCurrentlyWall = this.grid[cell.row][cell.col] === 1;

      this.wallAnimations.push({
        row: cell.row,
        col: cell.col,
        isWall: !isCurrentlyWall,
        startTime: now,
        duration: 500,
      });

      this.grid[cell.row][cell.col] = isCurrentlyWall ? 0 : 1;
    }
  }

  private isSafeToMutate(row: number, col: number): boolean {
    if (this.grid[row][col] === 0) {
      return false;
    }

    if (
      (row === 1 && col === 0) ||
      (row === this.size * 2 - 1 && col === this.size * 2)
    ) {
      return false;
    }

    const neighbors = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    let pathCount = 0;
    for (const n of neighbors) {
      const nr = row + n.dr;
      const nc = col + n.dc;
      if (nr >= 0 && nr < this.grid.length && nc >= 0 && nc < this.grid[0].length) {
        if (this.grid[nr][nc] === 0) pathCount++;
      }
    }

    return pathCount === 2;
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    cellSize: number,
    now: number
  ): void {
    const gridW = this.grid.length;
    const gridH = this.grid[0].length;

    for (let r = 0; r < gridW; r++) {
      for (let c = 0; c < gridH; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;

        if (this.grid[r][c] === 1) {
          const opacity = this.getWallOpacity(r, c);
          ctx.fillStyle = WALL_COLOR;
          ctx.globalAlpha = opacity;
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = PATH_COLOR;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    const exitCellX = offsetX + this.exit.col * 2 * cellSize + cellSize;
    const exitCellY = offsetY + this.exit.row * 2 * cellSize + cellSize;
    const blink = (Math.sin(now / 400) + 1) / 2;
    const exitSize = cellSize * 0.6;
    const exitOffset = (cellSize - exitSize) / 2;

    ctx.save();
    ctx.shadowColor = EXIT_COLOR;
    ctx.shadowBlur = 15 * blink + 5;
    ctx.fillStyle = EXIT_COLOR;
    ctx.globalAlpha = 0.5 + 0.5 * blink;
    ctx.fillRect(exitCellX + exitOffset, exitCellY + exitOffset, exitSize, exitSize);
    ctx.restore();
  }

  public drawBorder(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    totalWidth: number,
    totalHeight: number
  ): void {
    ctx.save();
    const gradient = ctx.createLinearGradient(offsetX, offsetY, offsetX + totalWidth, offsetY + totalHeight);
    gradient.addColorStop(0, '#4A3F6B');
    gradient.addColorStop(1, '#7A6F9B');

    ctx.shadowColor = '#7A6F9B';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX - 1, offsetY - 1, totalWidth + 2, totalHeight + 2);
    ctx.restore();
  }
}
