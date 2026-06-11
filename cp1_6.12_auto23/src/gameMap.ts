export const GRID_SIZE = 15;
export const TILE_SIZE = 48;

export enum TileType {
  EMPTY = 0,
  PATH = 1,
  BUILDABLE = 2,
  START = 3,
  END = 4
}

export interface Point {
  x: number;
  y: number;
}

export interface PathPoint {
  gridX: number;
  gridY: number;
  description: string;
}

export const PATH_WAYPOINTS: PathPoint[] = [
  { gridX: 0,  gridY: 7,  description: '入口点（左侧中间）' },
  { gridX: 3,  gridY: 7,  description: '第一转折点（向右直行）' },
  { gridX: 3,  gridY: 2,  description: '第二转折点（向上直行）' },
  { gridX: 7,  gridY: 2,  description: '第三转折点（向右直行）' },
  { gridX: 7,  gridY: 9,  description: '第四转折点（向下直行）' },
  { gridX: 11, gridY: 9,  description: '第五转折点（向右直行）' },
  { gridX: 11, gridY: 5,  description: '第六转折点（向上直行）' },
  { gridX: 14, gridY: 5,  description: '终点点（右侧出口）' }
];

export const PATH_INTERPOLATION_STEP = 2;
export const ADJACENT_OFFSETS: Array<[number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1]
];

export class GameMap {
  private grid: TileType[][];
  private pathPoints: Point[];
  private smoothPath: { x: number; y: number }[];

  constructor() {
    this.grid = this.createGrid();
    this.pathPoints = this.convertWaypointsToGrid();
    this.markPathOnGrid();
    this.markBuildableTiles();
    this.smoothPath = this.generateSmoothPath();
  }

  private createGrid(): TileType[][] {
    const grid: TileType[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = TileType.EMPTY;
      }
    }
    return grid;
  }

  private convertWaypointsToGrid(): Point[] {
    return PATH_WAYPOINTS.map(wp => ({ x: wp.gridX, y: wp.gridY }));
  }

  private markPathOnGrid(): void {
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const start = this.pathPoints[i];
      const end = this.pathPoints[i + 1];

      if (start.x === end.x) {
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        for (let y = minY; y <= maxY; y++) {
          this.grid[y][start.x] = TileType.PATH;
        }
      } else {
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        for (let x = minX; x <= maxX; x++) {
          this.grid[start.y][x] = TileType.PATH;
        }
      }
    }

    const startPoint = this.pathPoints[0];
    const endPoint = this.pathPoints[this.pathPoints.length - 1];
    this.grid[startPoint.y][startPoint.x] = TileType.START;
    this.grid[endPoint.y][endPoint.x] = TileType.END;
  }

  private markBuildableTiles(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === TileType.EMPTY) {
          if (this.isAdjacentToPath(x, y)) {
            this.grid[y][x] = TileType.BUILDABLE;
          }
        }
      }
    }
  }

  private isAdjacentToPath(x: number, y: number): boolean {
    for (const [dx, dy] of ADJACENT_OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        const tile = this.grid[ny][nx];
        if (tile === TileType.PATH ||
            tile === TileType.START ||
            tile === TileType.END) {
          return true;
        }
      }
    }
    return false;
  }

  private generateSmoothPath(): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const tileHalf = TILE_SIZE / 2;

    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const start = this.pathPoints[i];
      const end = this.pathPoints[i + 1];

      const startX = start.x * TILE_SIZE + tileHalf;
      const startY = start.y * TILE_SIZE + tileHalf;
      const endX = end.x * TILE_SIZE + tileHalf;
      const endY = end.y * TILE_SIZE + tileHalf;

      const segmentLength = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
      );
      const stepCount = Math.max(1, Math.ceil(segmentLength / PATH_INTERPOLATION_STEP));

      for (let t = 0; t < stepCount; t++) {
        const progress = t / stepCount;
        points.push({
          x: startX + (endX - startX) * progress,
          y: startY + (endY - startY) * progress
        });
      }
    }

    const lastPoint = this.pathPoints[this.pathPoints.length - 1];
    points.push({
      x: lastPoint.x * TILE_SIZE + tileHalf,
      y: lastPoint.y * TILE_SIZE + tileHalf
    });

    return points;
  }

  getGrid(): TileType[][] {
    return this.grid;
  }

  getTile(x: number, y: number): TileType {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      return TileType.EMPTY;
    }
    return this.grid[y][x];
  }

  isBuildable(x: number, y: number): boolean {
    return this.getTile(x, y) === TileType.BUILDABLE;
  }

  setTile(x: number, y: number, type: TileType): void {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      this.grid[y][x] = type;
    }
  }

  getSmoothPath(): { x: number; y: number }[] {
    return this.smoothPath;
  }

  getPathLength(): number {
    return this.smoothPath.length;
  }

  getStartPosition(): Point {
    return this.pathPoints[0];
  }

  getEndPosition(): Point {
    return this.pathPoints[this.pathPoints.length - 1];
  }

  getGridPixelWidth(): number {
    return GRID_SIZE * TILE_SIZE;
  }

  getGridPixelHeight(): number {
    return GRID_SIZE * TILE_SIZE;
  }

  getWaypoints(): PathPoint[] {
    return PATH_WAYPOINTS.slice();
  }
}
