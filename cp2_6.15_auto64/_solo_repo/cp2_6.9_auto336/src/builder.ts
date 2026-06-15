export interface PixelData {
  x: number;
  y: number;
  color: string;
}

export type PlantTemplate = PixelData[];

export const COLORS: { name: string; value: string }[] = [
  { name: '叶绿', value: '#4CAF50' },
  { name: '草绿', value: '#8BC34A' },
  { name: '花红', value: '#E91E63' },
  { name: '花紫', value: '#9C27B0' },
  { name: '花黄', value: '#FFEB3B' },
  { name: '枝干棕', value: '#795548' },
  { name: '深绿', value: '#2E7D32' },
  { name: '白色', value: '#FFFFFF' }
];

export const GRID_SIZE = 16;
export const CELL_SIZE = 12;

export class Builder {
  public grid: (string | null)[][];
  public selectedColor: string;
  public pixelCount: number;
  public isDrawing: boolean;

  public gridOffsetX: number;
  public gridOffsetY: number;
  public paletteOffsetX: number;
  public paletteOffsetY: number;
  public paletteCellSize: number;

  constructor() {
    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = null;
      }
    }
    this.selectedColor = COLORS[0].value;
    this.pixelCount = 0;
    this.isDrawing = false;

    this.gridOffsetX = 140;
    this.gridOffsetY = 410;
    this.paletteOffsetX = 360;
    this.paletteOffsetY = 410;
    this.paletteCellSize = 22;
  }

  public handlePaletteClick(mx: number, my: number): boolean {
    if (this.hitPalette(mx, my)) {
      const idx = this.getPaletteIndex(mx, my);
      if (idx >= 0 && idx < COLORS.length) {
        this.selectedColor = COLORS[idx].value;
      }
      return true;
    }
    return false;
  }

  public handleMouseDown(mx: number, my: number): boolean {
    if (this.hitGrid(mx, my)) {
      this.isDrawing = true;
      const { gx, gy } = this.getGridCell(mx, my);
      this.togglePixel(gx, gy);
      return true;
    }
    return false;
  }

  public handleMouseMove(mx: number, my: number): boolean {
    if (!this.isDrawing) return false;
    if (this.hitGrid(mx, my)) {
      const { gx, gy } = this.getGridCell(mx, my);
      if (this.grid[gy][gx] !== this.selectedColor) {
        this.setPixel(gx, gy, this.selectedColor);
      }
      return true;
    }
    return false;
  }

  public handleMouseUp(): void {
    this.isDrawing = false;
  }

  public togglePixel(gx: number, gy: number): void {
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;
    if (this.grid[gy][gx] === null) {
      this.grid[gy][gx] = this.selectedColor;
      this.pixelCount++;
    } else if (this.grid[gy][gx] === this.selectedColor) {
      this.grid[gy][gx] = null;
      this.pixelCount--;
    } else {
      this.grid[gy][gx] = this.selectedColor;
    }
  }

  public setPixel(gx: number, gy: number, color: string): void {
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;
    if (this.grid[gy][gx] === null) {
      this.pixelCount++;
    }
    this.grid[gy][gx] = color;
  }

  public clearPixel(gx: number, gy: number): void {
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;
    if (this.grid[gy][gx] !== null) {
      this.grid[gy][gx] = null;
      this.pixelCount--;
    }
  }

  public getTemplate(): PlantTemplate {
    const result: PlantTemplate = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] !== null) {
          result.push({ x, y, color: this.grid[y][x] as string });
        }
      }
    }
    return result;
  }

  public reset(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = null;
      }
    }
    this.pixelCount = 0;
    this.selectedColor = COLORS[0].value;
  }

  public hitGrid(mx: number, my: number): boolean {
    return (
      mx >= this.gridOffsetX &&
      mx < this.gridOffsetX + GRID_SIZE * CELL_SIZE &&
      my >= this.gridOffsetY &&
      my < this.gridOffsetY + GRID_SIZE * CELL_SIZE
    );
  }

  public getGridCell(mx: number, my: number): { gx: number; gy: number } {
    const gx = Math.floor((mx - this.gridOffsetX) / CELL_SIZE);
    const gy = Math.floor((my - this.gridOffsetY) / CELL_SIZE);
    return { gx, gy };
  }

  public hitPalette(mx: number, my: number): boolean {
    const cols = 2;
    const rows = Math.ceil(COLORS.length / cols);
    return (
      mx >= this.paletteOffsetX &&
      mx < this.paletteOffsetX + cols * this.paletteCellSize &&
      my >= this.paletteOffsetY &&
      my < this.paletteOffsetY + rows * this.paletteCellSize
    );
  }

  public getPaletteIndex(mx: number, my: number): number {
    const cols = 2;
    const px = Math.floor((mx - this.paletteOffsetX) / this.paletteCellSize);
    const py = Math.floor((my - this.paletteOffsetY) / this.paletteCellSize);
    return py * cols + px;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawGrid(ctx);
    this.drawPalette(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const ox = this.gridOffsetX;
    const oy = this.gridOffsetY;
    const totalW = GRID_SIZE * CELL_SIZE;
    const totalH = GRID_SIZE * CELL_SIZE;

    ctx.fillStyle = 'rgba(30, 20, 10, 0.3)';
    ctx.fillRect(ox - 4, oy - 4, totalW + 8, totalH + 8);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = ox + x * CELL_SIZE;
        const py = oy + y * CELL_SIZE;
        if (this.grid[y][x] !== null) {
          ctx.fillStyle = this.grid[y][x] as string;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        } else {
          ctx.fillStyle = 'rgba(40, 25, 15, 0.5)';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    ctx.strokeStyle = 'rgba(107, 66, 38, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * CELL_SIZE + 0.5, oy);
      ctx.lineTo(ox + i * CELL_SIZE + 0.5, oy + totalH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, oy + i * CELL_SIZE + 0.5);
      ctx.lineTo(ox + totalW, oy + i * CELL_SIZE + 0.5);
      ctx.stroke();
    }
  }

  private drawPalette(ctx: CanvasRenderingContext2D): void {
    const cols = 2;
    const gap = 4;
    for (let i = 0; i < COLORS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = this.paletteOffsetX + col * (this.paletteCellSize + gap);
      const py = this.paletteOffsetY + row * (this.paletteCellSize + gap);
      const size = this.paletteCellSize;

      ctx.fillStyle = COLORS[i].value;
      ctx.fillRect(px, py, size, size);

      if (COLORS[i].value === this.selectedColor) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.strokeRect(px - 2, py - 2, size + 4, size + 4);
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 3, py - 3, size + 6, size + 6);
      } else {
        ctx.strokeStyle = 'rgba(62, 39, 35, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
      }
    }
  }
}
