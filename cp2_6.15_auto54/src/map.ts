export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ObstacleType = 'wall' | 'rubble';

export class Obstacle {
  rect: Rect;
  type: ObstacleType;

  constructor(rect: Rect, type: ObstacleType) {
    this.rect = rect;
    this.type = type;
  }
}

interface AStarNode {
  gx: number;
  gy: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class GameMap {
  width: number;
  height: number;
  cellSize: number;
  grid: boolean[][];
  obstacles: Obstacle[];
  cols: number;
  rows: number;
  lastPathTime: number = 0;
  lastPathCache: Map<string, { time: number; path: Vec2[] }> = new Map();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cellSize = 20;
    this.cols = Math.floor(width / this.cellSize);
    this.rows = Math.floor(height / this.cellSize);
    this.obstacles = [];
    this.grid = [];

    this.generateObstacles();
    this.updateGrid();
  }

  private generateObstacles(): void {
    const cx = this.width / 2;
    const cy = this.height * 0.65;
    const totalLen = this.width * 0.3;
    const thickness = 12;
    const armLen = totalLen / 2;

    const offsets: Array<[number, number]> = [
      [-totalLen * 0.8, 0],
      [0, 0],
      [totalLen * 0.8, 0],
    ];

    for (const [ox, oy] of offsets) {
      const baseX = cx + ox;
      const baseY = cy + oy;

      this.obstacles.push(
        new Obstacle(
          { x: baseX - armLen / 2, y: baseY - thickness / 2, w: armLen, h: thickness },
          'wall'
        )
      );
      this.obstacles.push(
        new Obstacle(
          { x: baseX - thickness / 2, y: baseY - thickness / 2, w: thickness, h: armLen },
          'wall'
        )
      );
    }

    const rubbleSize = 40;
    this.obstacles.push(
      new Obstacle(
        { x: this.width * 0.2 - rubbleSize / 2, y: this.height * 0.4 - rubbleSize / 2, w: rubbleSize, h: rubbleSize },
        'rubble'
      )
    );
    this.obstacles.push(
      new Obstacle(
        { x: this.width * 0.8 - rubbleSize / 2, y: this.height * 0.4 - rubbleSize / 2, w: rubbleSize, h: rubbleSize },
        'rubble'
      )
    );
  }

  updateGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < this.cols; x++) {
        const center = this.gridToWorld(x, y);
        row.push(!this.pointInObstacle(center.x, center.y));
      }
      this.grid.push(row);
    }
  }

  worldToGrid(x: number, y: number): { gx: number; gy: number } {
    return {
      gx: Math.floor(x / this.cellSize),
      gy: Math.floor(y / this.cellSize),
    };
  }

  gridToWorld(gx: number, gy: number): { x: number; y: number } {
    return {
      x: gx * this.cellSize + this.cellSize / 2,
      y: gy * this.cellSize + this.cellSize / 2,
    };
  }

  pointInObstacle(x: number, y: number, padding: number = 0): boolean {
    for (const obs of this.obstacles) {
      const r = obs.rect;
      if (
        x >= r.x - padding &&
        x <= r.x + r.w + padding &&
        y >= r.y - padding &&
        y <= r.y + r.h + padding
      ) {
        return true;
      }
    }
    return false;
  }

  lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, rect: Rect): boolean {
    const minX = rect.x;
    const minY = rect.y;
    const maxX = rect.x + rect.w;
    const maxY = rect.y + rect.h;

    if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
    if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;

    const edges: Array<[number, number, number, number]> = [
      [minX, minY, maxX, minY],
      [maxX, minY, maxX, maxY],
      [maxX, maxY, minX, maxY],
      [minX, maxY, minX, minY],
    ];

    for (const [ex1, ey1, ex2, ey2] of edges) {
      if (this.lineSegmentsIntersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) {
        return true;
      }
    }

    return false;
  }

  private lineSegmentsIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-9) return false;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  canWalk(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return false;
    return this.grid[gy][gx];
  }

  private addToCache(key: string, value: { time: number; path: Vec2[] }): void {
    this.lastPathCache.delete(key);
    this.lastPathCache.set(key, value);
    while (this.lastPathCache.size > 50) {
      const firstKey = this.lastPathCache.keys().next().value;
      if (firstKey) this.lastPathCache.delete(firstKey);
    }
  }

  private cleanupExpiredCache(now: number): void {
    const expiredKeys: string[] = [];
    for (const [key, value] of this.lastPathCache) {
      if (now - value.time > 5000) {
        expiredKeys.push(key);
      }
    }
    for (const key of expiredKeys) {
      this.lastPathCache.delete(key);
    }
  }

  findPath(startX: number, startY: number, endX: number, endY: number): Vec2[] {
    const now = performance.now();
    const start = this.worldToGrid(startX, startY);
    const end = this.worldToGrid(endX, endY);
    const cacheKey = `${start.gx},${start.gy}-${end.gx},${end.gy}`;

    const cached = this.lastPathCache.get(cacheKey);
    if (cached && now - cached.time < 1000) {
      this.lastPathCache.delete(cacheKey);
      this.lastPathCache.set(cacheKey, cached);
      return cached.path;
    }

    this.cleanupExpiredCache(now);

    if (!this.canWalk(start.gx, start.gy) || !this.canWalk(end.gx, end.gy)) {
      this.addToCache(cacheKey, { time: now, path: [] });
      return [];
    }

    if (start.gx === end.gx && start.gy === end.gy) {
      const p = this.gridToWorld(start.gx, start.gy);
      const result = [{ x: p.x, y: p.y }];
      this.addToCache(cacheKey, { time: now, path: result });
      return result;
    }

    const open: Map<string, AStarNode> = new Map();
    const closed: Set<string> = new Set();
    const key = (gx: number, gy: number) => `${gx},${gy}`;
    const heuristic = (gx: number, gy: number) =>
      Math.abs(gx - end.gx) + Math.abs(gy - end.gy);

    const startNode: AStarNode = {
      gx: start.gx,
      gy: start.gy,
      g: 0,
      h: heuristic(start.gx, start.gy),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    open.set(key(start.gx, start.gy), startNode);

    const neighbors: Array<[number, number, number]> = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, Math.SQRT2],
      [1, -1, Math.SQRT2],
      [-1, 1, Math.SQRT2],
      [-1, -1, Math.SQRT2],
    ];

    while (open.size > 0) {
      let current: AStarNode | null = null;
      for (const node of open.values()) {
        if (!current || node.f < current.f) {
          current = node;
        }
      }

      if (!current) break;

      if (current.gx === end.gx && current.gy === end.gy) {
        const path: Vec2[] = [];
        let node: AStarNode | null = current;
        while (node) {
          const p = this.gridToWorld(node.gx, node.gy);
          path.unshift({ x: p.x, y: p.y });
          node = node.parent;
        }
        this.addToCache(cacheKey, { time: now, path });
        return path;
      }

      open.delete(key(current.gx, current.gy));
      closed.add(key(current.gx, current.gy));

      for (const [dx, dy, cost] of neighbors) {
        const ngx = current.gx + dx;
        const ngy = current.gy + dy;
        const nkey = key(ngx, ngy);

        if (closed.has(nkey)) continue;
        if (!this.canWalk(ngx, ngy)) continue;

        if (dx !== 0 && dy !== 0) {
          if (!this.canWalk(current.gx + dx, current.gy) || !this.canWalk(current.gx, current.gy + dy)) {
            continue;
          }
        }

        const tentativeG = current.g + cost;
        const existing = open.get(nkey);

        if (!existing || tentativeG < existing.g) {
          const h = heuristic(ngx, ngy);
          const newNode: AStarNode = {
            gx: ngx,
            gy: ngy,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current,
          };
          open.set(nkey, newNode);
        }
      }
    }

    return [];
  }
}
