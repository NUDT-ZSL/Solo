import type { BattleMapData, Cell, TerrainType, Unit } from './types';

export class BattleMap {
  private data: BattleMapData;

  constructor(width: number = 8, height: number = 8, cellSize: number = 80) {
    this.data = {
      width,
      height,
      cellSize,
      cells: this.generateCells(width, height)
    };
    this.generateObstacles();
  }

  private generateCells(width: number, height: number): Cell[][] {
    const cells: Cell[][] = [];
    for (let y = 0; y < height; y++) {
      cells[y] = [];
      for (let x = 0; x < width; x++) {
        cells[y][x] = {
          x,
          y,
          terrain: 'normal',
          occupant: null
        };
      }
    }
    return cells;
  }

  private generateObstacles(): void {
    const obstacleCount = 8 + Math.floor(Math.random() * 3);
    const { width, height, cells } = this.data;

    for (let i = 0; i < obstacleCount; i++) {
      let attempts = 0;
      while (attempts < 50) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);

        if ((x >= 2 && x <= 5) && cells[y][x].terrain === 'normal') {
          cells[y][x].terrain = 'obstacle';
          break;
        }
        attempts++;
      }
    }
  }

  getData(): BattleMapData {
    return this.data;
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) {
      return null;
    }
    return this.data.cells[y][x];
  }

  setOccupant(x: number, y: number, unit: Unit | null): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;
    cell.occupant = unit;
    return true;
  }

  isWalkable(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;
    return cell.terrain !== 'obstacle' && cell.occupant === null;
  }

  getMoveableCells(unit: Unit): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    const { moveRange } = unit;
    const visited = new Set<string>();
    const queue: { x: number; y: number; dist: number }[] = [];

    const startKey = `${unit.gridX},${unit.gridY}`;
    visited.add(startKey);
    queue.push({ x: unit.gridX, y: unit.gridY, dist: 0 });

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.dist >= moveRange) continue;

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (visited.has(key)) continue;
        if (!this.isWalkable(nx, ny)) continue;

        visited.add(key);
        result.push({ x: nx, y: ny });
        queue.push({ x: nx, y: ny, dist: current.dist + 1 });
      }
    }

    return result;
  }

  getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);
    let sx = x1 < x2 ? 1 : -1;
    let sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (x !== x2 || y !== y2) {
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }

      if (x === x2 && y === y2) break;

      const cell = this.getCell(x, y);
      if (cell && cell.terrain === 'obstacle') {
        return false;
      }
    }
    return true;
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    const { width, height, cellSize, cells } = this.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = cells[y][x];
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;

        this.drawCell(ctx, px, py, cellSize, cell.terrain, x, y);
      }
    }

    ctx.strokeStyle = '#BDC3C7';
    ctx.lineWidth = 1;
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + y * cellSize);
      ctx.lineTo(offsetX + width * cellSize, offsetY + y * cellSize);
      ctx.stroke();
    }
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * cellSize, offsetY);
      ctx.lineTo(offsetX + x * cellSize, offsetY + height * cellSize);
      ctx.stroke();
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    terrain: TerrainType,
    gridX: number,
    gridY: number
  ): void {
    if (terrain === 'obstacle') {
      ctx.fillStyle = '#34495E';
      ctx.fillRect(px, py, size, size);

      ctx.fillStyle = '#2C3E50';
      const padding = 8;
      ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);

      ctx.fillStyle = '#4A6785';
      ctx.fillRect(px + padding + 4, py + padding + 4, size - padding * 2 - 8, size - padding * 2 - 8);
    } else {
      const isEven = (gridX + gridY) % 2 === 0;
      ctx.fillStyle = isEven ? '#2C3E50' : '#34495E';
      ctx.fillRect(px, py, size, size);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
    }
  }

  renderMoveableCells(
    ctx: CanvasRenderingContext2D,
    cells: { x: number; y: number }[],
    offsetX: number,
    offsetY: number
  ): void {
    const { cellSize } = this.data;
    ctx.fillStyle = 'rgba(52, 152, 219, 0.4)';

    for (const cell of cells) {
      const px = offsetX + cell.x * cellSize;
      const py = offsetY + cell.y * cellSize;
      ctx.fillRect(px, py, cellSize, cellSize);

      ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
    }
  }
}
