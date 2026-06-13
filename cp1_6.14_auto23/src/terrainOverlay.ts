export class TerrainOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private width: number = 0;
  private height: number = 0;
  private terrainData: number[][] = [];
  private cols: number = 80;
  private rows: number = 80;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.generateTerrainData();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private generateTerrainData(): void {
    this.terrainData = [];

    for (let y = 0; y < this.rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.cols; x++) {
        const nx = x / this.cols - 0.5;
        const ny = y / this.rows - 0.5;

        const centerDist = Math.sqrt(nx * nx + ny * ny);
        const baseHeight = Math.max(0, 1 - centerDist * 2);

        let noise = 0;
        noise += this.noise(x * 0.15, y * 0.15) * 0.4;
        noise += this.noise(x * 0.3 + 100, y * 0.3 + 100) * 0.3;
        noise += this.noise(x * 0.6 + 200, y * 0.6 + 200) * 0.2;
        noise += this.noise(x * 1.2 + 300, y * 1.2 + 300) * 0.1;

        let height = baseHeight * 0.5 + noise * 0.5;

        const eyeDist = Math.sqrt(nx * nx * 4 + ny * ny * 4);
        if (eyeDist < 0.15) {
          height *= 0.2;
        } else if (eyeDist < 0.25) {
          const t = (eyeDist - 0.15) / 0.1;
          height *= 0.2 + t * 0.8;
        }

        row.push(Math.max(0, Math.min(1, height)));
      }
      this.terrainData.push(row);
    }
  }

  private noise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const f = n - Math.floor(n);
    return f * 2 - 1;
  }

  private bilinearSample(x: number, y: number): number {
    const cx = Math.max(0, Math.min(this.cols - 2, x));
    const cy = Math.max(0, Math.min(this.rows - 2, y));
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const tx = cx - x0;
    const ty = cy - y0;

    const v00 = this.terrainData[y0][x0];
    const v10 = this.terrainData[y0][x1];
    const v01 = this.terrainData[y1][x0];
    const v11 = this.terrainData[y1][x1];

    const v0 = v00 * (1 - tx) + v10 * tx;
    const v1 = v01 * (1 - tx) + v11 * tx;

    return v0 * (1 - ty) + v1 * ty;
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * (window.devicePixelRatio || 1);
    this.canvas.height = this.height * (window.devicePixelRatio || 1);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    this.render();
  }

  public render(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const cellWidth = this.width / this.cols;
    const cellHeight = this.height / this.rows;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const height = this.terrainData[y][x];

        const r = Math.floor(30 + height * 20);
        const g = Math.floor(50 + height * 60);
        const b = Math.floor(90 + height * 100);
        const a = 0.15 + height * 0.25;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.fillRect(
          x * cellWidth,
          y * cellHeight,
          cellWidth + 1,
          cellHeight + 1
        );
      }
    }

    const step = 4;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.lineWidth = 1;

    for (let y = 0; y < this.rows; y += step) {
      ctx.beginPath();
      for (let x = 0; x < this.cols; x++) {
        const height = this.terrainData[y][x];
        const px = x * cellWidth + cellWidth / 2;
        const py = y * cellHeight + cellHeight / 2 - height * 30;
        if (x === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    for (let x = 0; x < this.cols; x += step) {
      ctx.beginPath();
      for (let y = 0; y < this.rows; y++) {
        const height = this.terrainData[y][x];
        const px = x * cellWidth + cellWidth / 2;
        const py = y * cellHeight + cellHeight / 2 - height * 30;
        if (y === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    const radialGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(this.width, this.height) * 0.5
    );
    radialGradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
    radialGradient.addColorStop(0.3, 'rgba(249, 115, 22, 0.05)');
    radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  public sampleHeight(uvX: number, uvY: number): number {
    const x = uvX * (this.cols - 1);
    const y = uvY * (this.rows - 1);
    return this.bilinearSample(x, y);
  }
}

let terrainInstance: TerrainOverlay | null = null;

export function createTerrainOverlay(canvasId: string): TerrainOverlay {
  terrainInstance = new TerrainOverlay(canvasId);
  return terrainInstance;
}

export function getTerrainOverlay(): TerrainOverlay | null {
  return terrainInstance;
}
