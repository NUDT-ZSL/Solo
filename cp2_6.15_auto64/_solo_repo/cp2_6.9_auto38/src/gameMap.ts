export interface HexCoord {
  q: number;
  r: number;
}

export interface HexCell extends HexCoord {
  x: number;
  y: number;
  isPath: boolean;
  isSpawn: boolean;
  isEnd: boolean;
  hasTower: boolean;
}

export class GameMap {
  private readonly gridSize = 7;
  private hexSize: number = 48;
  private hexHeight: number;
  private hexWidth: number;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private cells: Map<string, HexCell> = new Map();
  private path: HexCoord[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private minHexSize: number = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.hexHeight = this.hexSize * 2;
    this.hexWidth = Math.sqrt(3) * this.hexSize;
    this.generateGrid();
    this.generatePath();
  }

  private coordKey(q: number, r: number): string {
    return `${q},${r}`;
  }

  private generateGrid(): void {
    this.cells.clear();
    const centerQ = Math.floor(this.gridSize / 2);
    const centerR = Math.floor(this.gridSize / 2);

    for (let q = 0; q < this.gridSize; q++) {
      for (let r = 0; r < this.gridSize; r++) {
        const offset = r % 2 === 1 ? this.hexWidth / 2 : 0;
        const x = q * this.hexWidth + offset + this.offsetX;
        const y = r * this.hexHeight * 0.75 + this.offsetY;

        const isSpawn = q === centerQ && r === centerR;
        const isEnd = q === centerQ && r === this.gridSize - 1;

        this.cells.set(this.coordKey(q, r), {
          q,
          r,
          x,
          y,
          isPath: false,
          isSpawn,
          isEnd,
          hasTower: false
        });
      }
    }
  }

  private generatePath(): void {
    this.path = [];
    const centerQ = Math.floor(this.gridSize / 2);
    const centerR = Math.floor(this.gridSize / 2);

    const rawPath: HexCoord[] = [
      { q: centerQ, r: this.gridSize - 1 },
      { q: centerQ, r: this.gridSize - 2 },
      { q: centerQ - 1, r: this.gridSize - 3 },
      { q: centerQ, r: this.gridSize - 4 },
      { q: centerQ, r: this.gridSize - 5 },
      { q: centerQ, r: this.gridSize - 6 },
      { q: centerQ, r: centerR }
    ];

    for (const coord of rawPath) {
      const key = this.coordKey(coord.q, coord.r);
      const cell = this.cells.get(key);
      if (cell) {
        cell.isPath = true;
        this.path.push(coord);
      }
    }
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const gridPixelWidth = this.gridSize * this.hexWidth + this.hexWidth / 2;
    const gridPixelHeight = this.gridSize * this.hexHeight * 0.75 + this.hexHeight * 0.25;

    const availableWidth = canvasWidth - 40;
    const availableHeight = canvasHeight - 40;

    const scaleX = availableWidth / gridPixelWidth;
    const scaleY = availableHeight / gridPixelHeight;
    const scale = Math.min(scaleX, scaleY, 1.5);

    const newHexSize = Math.max(this.minHexSize, this.hexSize * scale);
    if (Math.abs(newHexSize - this.hexSize) > 1) {
      this.hexSize = newHexSize;
      this.hexHeight = this.hexSize * 2;
      this.hexWidth = Math.sqrt(3) * this.hexSize;
    }

    const actualWidth = this.gridSize * this.hexWidth + this.hexWidth / 2;
    const actualHeight = this.gridSize * this.hexHeight * 0.75 + this.hexHeight * 0.25;

    this.offsetX = (canvasWidth - actualWidth) / 2 + this.hexWidth / 2;
    this.offsetY = (canvasHeight - actualHeight) / 2 + this.hexHeight / 2;

    for (const cell of this.cells.values()) {
      const offset = cell.r % 2 === 1 ? this.hexWidth / 2 : 0;
      cell.x = cell.q * this.hexWidth + offset + this.offsetX;
      cell.y = cell.r * this.hexHeight * 0.75 + this.offsetY;
    }
  }

  getHexSize(): number {
    return this.hexSize;
  }

  getCell(q: number, r: number): HexCell | undefined {
    return this.cells.get(this.coordKey(q, r));
  }

  getAllCells(): HexCell[] {
    return Array.from(this.cells.values());
  }

  getPath(): HexCoord[] {
    return [...this.path];
  }

  getPathPixelPoints(): { x: number; y: number }[] {
    return this.path.map(coord => {
      const cell = this.cells.get(this.coordKey(coord.q, coord.r));
      return cell ? { x: cell.x, y: cell.y } : { x: 0, y: 0 };
    });
  }

  getSpawnCell(): HexCell | undefined {
    for (const cell of this.cells.values()) {
      if (cell.isSpawn) return cell;
    }
    return undefined;
  }

  getEndCell(): HexCell | undefined {
    for (const cell of this.cells.values()) {
      if (cell.isEnd) return cell;
    }
    return undefined;
  }

  setTowerAt(q: number, r: number, hasTower: boolean): void {
    const cell = this.cells.get(this.coordKey(q, r));
    if (cell) {
      cell.hasTower = hasTower;
    }
  }

  pixelToHex(px: number, py: number): HexCoord | null {
    let bestDist = Infinity;
    let bestCoord: HexCoord | null = null;

    for (const cell of this.cells.values()) {
      const dx = px - cell.x;
      const dy = py - cell.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist && dist < this.hexSize * 0.95) {
        bestDist = dist;
        bestCoord = { q: cell.q, r: cell.r };
      }
    }
    return bestCoord;
  }

  render(): void {
    this.ctx.save();

    for (const cell of this.cells.values()) {
      this.drawHexCell(cell);
    }

    this.drawPath();
    this.drawSpawnPoint();
    this.ctx.restore();
  }

  private drawHexCell(cell: HexCell): void {
    const { x, y } = cell;
    const size = this.hexSize * 0.95;

    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const hx = x + size * Math.cos(angle);
      const hy = y + size * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();

    if (cell.isPath) {
      this.ctx.fillStyle = 'rgba(76, 201, 240, 0.08)';
    } else if (cell.hasTower) {
      this.ctx.fillStyle = 'rgba(0, 245, 212, 0.05)';
    } else {
      this.ctx.fillStyle = 'rgba(30, 30, 46, 0.6)';
    }
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawPath(): void {
    const points = this.getPathPixelPoints();
    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.4)';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawSpawnPoint(): void {
    const spawn = this.getSpawnCell();
    if (!spawn) return;

    this.ctx.save();

    const gradient = this.ctx.createRadialGradient(spawn.x, spawn.y, 0, spawn.x, spawn.y, this.hexSize * 1.2);
    gradient.addColorStop(0, 'rgba(255, 82, 82, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 82, 82, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 82, 82, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(spawn.x, spawn.y, this.hexSize * 1.2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 82, 82, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(spawn.x, spawn.y, this.hexSize * 0.55, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255, 82, 82, 0.9)';
    this.ctx.font = `bold ${this.hexSize * 0.5}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('⚑', spawn.x, spawn.y);

    this.ctx.restore();
  }

  highlightCell(q: number, r: number, color: string = 'rgba(0, 245, 212, 0.25)'): void {
    const cell = this.getCell(q, r);
    if (!cell) return;

    this.ctx.save();
    const size = this.hexSize * 0.95;

    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const hx = cell.x + size * Math.cos(angle);
      const hy = cell.y + size * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.restore();
  }
}
