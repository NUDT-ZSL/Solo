import { type Particle, type ParticleType, createParticle } from './particle.js';

export class Grid {
  width: number;
  height: number;
  cells: (Particle | null)[][];
  particleCount: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.particleCount = 0;
    for (let y = 0; y < height; y++) {
      this.cells[y] = [];
      for (let x = 0; x < width; x++) {
        this.cells[y][x] = null;
      }
    }
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getCell(x: number, y: number): Particle | null {
    if (!this.isInBounds(x, y)) return null;
    return this.cells[y][x];
  }

  setCell(x: number, y: number, p: Particle | null): void {
    if (!this.isInBounds(x, y)) return;
    this.cells[y][x] = p;
  }

  decrementCount(): void {
    if (this.particleCount > 0) this.particleCount--;
  }

  spawnParticle(type: ParticleType, centerX: number, centerY: number, brushSize: number): void {
    const half = Math.floor(brushSize / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (!this.isInBounds(x, y)) continue;
        if (this.cells[y][x]) continue;
        if (Math.random() > 0.6) continue;
        const p = createParticle(type, x, y);
        this.cells[y][x] = p;
        this.particleCount++;
      }
    }
  }

  removeAt(centerX: number, centerY: number, brushSize: number): void {
    const half = Math.floor(brushSize / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (!this.isInBounds(x, y)) continue;
        if (this.cells[y][x]) {
          this.cells[y][x] = null;
          this.particleCount--;
        }
      }
    }
  }

  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells[y][x] = null;
      }
    }
    this.particleCount = 0;
  }

  updateAll(): void {
    const leftToRight = Math.random() < 0.5;
    for (let y = this.height - 1; y >= 0; y--) {
      if (leftToRight) {
        for (let x = 0; x < this.width; x++) {
          const p = this.cells[y][x];
          if (p && !p.updated) {
            p.update(this);
          }
        }
      } else {
        for (let x = this.width - 1; x >= 0; x--) {
          const p = this.cells[y][x];
          if (p && !p.updated) {
            p.update(this);
          }
        }
      }
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const p = this.cells[y][x];
        if (p) p.updated = false;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, pixelSize: number): void {
    const imgData = ctx.createImageData(canvasWidth, canvasHeight);
    const data = imgData.data;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const p = this.cells[y][x];
        if (!p) continue;
        const [r, g, b] = p.color;
        const startX = x * pixelSize;
        const startY = y * pixelSize;
        for (let py = 0; py < pixelSize; py++) {
          for (let px = 0; px < pixelSize; px++) {
            const idx = ((startY + py) * canvasWidth + (startX + px)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}
