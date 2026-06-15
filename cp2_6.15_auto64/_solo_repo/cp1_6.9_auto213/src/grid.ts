import { noise2 } from './perlin';

export interface Vertex {
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  userOffsetX: number;
  userOffsetY: number;
  decayX: number;
  decayY: number;
}

export interface CellColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface RenderCell {
  points: Array<{ x: number; y: number }>;
  color: CellColor;
}

export interface Pulse {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
  strength: number;
}

export type ColorTheme = 'ocean' | 'lava' | 'aurora' | 'magic';

export interface GridOptions {
  cols: number;
  rows: number;
  flowSpeed: number;
  width: number;
  height: number;
  theme: ColorTheme;
}

const THEME_CONFIGS: Record<ColorTheme, {
  baseColors: Array<[number, number, number]>;
  shiftSpeed: number;
}> = {
  ocean: {
    baseColors: [
      [10, 50, 120],
      [30, 120, 180],
      [80, 200, 220],
      [20, 80, 160],
    ],
    shiftSpeed: 0.15,
  },
  lava: {
    baseColors: [
      [180, 30, 30],
      [255, 120, 40],
      [255, 200, 80],
      [140, 20, 60],
    ],
    shiftSpeed: 0.25,
  },
  aurora: {
    baseColors: [
      [40, 180, 120],
      [80, 100, 220],
      [200, 80, 200],
      [60, 220, 180],
    ],
    shiftSpeed: 0.2,
  },
  magic: {
    baseColors: [
      [200, 80, 180],
      [100, 60, 220],
      [80, 200, 240],
      [255, 160, 100],
    ],
    shiftSpeed: 0.3,
  },
};

export class FluidGrid {
  private cols: number;
  private rows: number;
  private flowSpeed: number;
  private width: number;
  private height: number;
  private theme: ColorTheme;
  private vertices: Vertex[][] = [];
  private pulses: Pulse[] = [];
  private time: number = 0;
  private lastFrameTime: number = 0;
  private noiseScale: number = 0.002;

  constructor(options: GridOptions) {
    this.cols = options.cols;
    this.rows = options.rows;
    this.flowSpeed = options.flowSpeed;
    this.width = options.width;
    this.height = options.height;
    this.theme = options.theme;
    this.initVertices();
  }

  private initVertices(): void {
    this.vertices = [];
    const cellW = this.width / (this.cols - 1);
    const cellH = this.height / (this.rows - 1);
    for (let y = 0; y < this.rows; y++) {
      const row: Vertex[] = [];
      for (let x = 0; x < this.cols; x++) {
        row.push({
          baseX: x * cellW,
          baseY: y * cellH,
          offsetX: 0,
          offsetY: 0,
          userOffsetX: 0,
          userOffsetY: 0,
          decayX: 0,
          decayY: 0,
        });
      }
      this.vertices.push(row);
    }
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initVertices();
  }

  public setSize(cols: number, rows: number): void {
    if (cols === this.cols && rows === this.rows) return;
    this.cols = cols;
    this.rows = rows;
    this.initVertices();
  }

  public setFlowSpeed(speed: number): void {
    this.flowSpeed = speed;
  }

  public setTheme(theme: ColorTheme): void {
    this.theme = theme;
  }

  public applyDrag(
    x: number,
    y: number,
    dx: number,
    dy: number,
    radius: number = 120,
    strength: number = 0.6
  ): void {
    const cellW = this.width / (this.cols - 1);
    const cellH = this.height / (this.rows - 1);
    const pad = Math.ceil(radius / Math.min(cellW, cellH)) + 1;
    const centerCol = x / cellW;
    const centerRow = y / cellH;
    const minCol = Math.max(0, Math.floor(centerCol - pad));
    const maxCol = Math.min(this.cols - 1, Math.ceil(centerCol + pad));
    const minRow = Math.max(0, Math.floor(centerRow - pad));
    const maxRow = Math.min(this.rows - 1, Math.ceil(centerRow + pad));
    const rSq = radius * radius;
    for (let ry = minRow; ry <= maxRow; ry++) {
      for (let cx = minCol; cx <= maxCol; cx++) {
        const v = this.vertices[ry][cx];
        const px = v.baseX;
        const py = v.baseY;
        const distSq = (px - x) * (px - x) + (py - y) * (py - y);
        if (distSq < rSq) {
          const falloff = 1 - Math.sqrt(distSq) / radius;
          const factor = falloff * falloff * strength;
          v.userOffsetX += dx * factor;
          v.userOffsetY += dy * factor;
          v.decayX = Math.max(v.decayX, 2.0);
          v.decayY = Math.max(v.decayY, 2.0);
        }
      }
    }
  }

  public applyPulse(x: number, y: number): void {
    this.pulses.push({
      x,
      y,
      startTime: this.time,
      duration: 1.2,
      maxRadius: 200,
      strength: 60,
    });
  }

  public update(currentTime: number): void {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
      return;
    }
    const delta = Math.min((currentTime - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = currentTime;
    this.time += delta * this.flowSpeed;
    const noiseOffset = this.time * 0.8;
    const displace = 22 + this.flowSpeed * 3;
    const nScale = this.noiseScale;
    const nOff = noiseOffset;
    for (let y = 0; y < this.rows; y++) {
      const row = this.vertices[y];
      for (let x = 0; x < this.cols; x++) {
        const v = row[x];
        v.offsetX = noise2(v.baseX * nScale + nOff, v.baseY * nScale) * displace;
        v.offsetY = noise2(v.baseX * nScale, v.baseY * nScale + nOff) * displace;
        if (v.decayX > 0) {
          const decayRate = delta * 0.9;
          v.userOffsetX *= 1 - decayRate;
          v.decayX -= delta;
          if (v.decayX <= 0) {
            v.decayX = 0;
            v.userOffsetX = 0;
          }
        }
        if (v.decayY > 0) {
          const decayRate = delta * 0.9;
          v.userOffsetY *= 1 - decayRate;
          v.decayY -= delta;
          if (v.decayY <= 0) {
            v.decayY = 0;
            v.userOffsetY = 0;
          }
        }
      }
    }
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      const elapsed = this.time - pulse.startTime;
      if (elapsed > pulse.duration) {
        this.pulses.splice(i, 1);
        continue;
      }
      const progress = elapsed / pulse.duration;
      const radius = progress * pulse.maxRadius;
      const wave = Math.sin(progress * Math.PI) * pulse.strength;
      const cellW = this.width / (this.cols - 1);
      const cellH = this.height / (this.rows - 1);
      const pad = Math.ceil(radius / Math.min(cellW, cellH)) + 1;
      const centerCol = pulse.x / cellW;
      const centerRow = pulse.y / cellH;
      const minCol = Math.max(0, Math.floor(centerCol - pad));
      const maxCol = Math.min(this.cols - 1, Math.ceil(centerCol + pad));
      const minRow = Math.max(0, Math.floor(centerRow - pad));
      const maxRow = Math.min(this.rows - 1, Math.ceil(centerRow + pad));
      const rSq = radius * radius;
      const ringWidth = 40;
      const innerR = Math.max(0, radius - ringWidth);
      const innerRSq = innerR * innerR;
      for (let ry = minRow; ry <= maxRow; ry++) {
        for (let cx = minCol; cx <= maxCol; cx++) {
          const v = this.vertices[ry][cx];
          const px = v.baseX;
          const py = v.baseY;
          const dx = px - pulse.x;
          const dy = py - pulse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < rSq && distSq > innerRSq) {
            const dist = Math.sqrt(distSq);
            const ringFactor = 1 - Math.abs(dist - radius + ringWidth / 2) / (ringWidth / 2);
            const smooth = ringFactor * ringFactor * (3 - 2 * ringFactor);
            const nx = dist > 0 ? dx / dist : 0;
            const ny = dist > 0 ? dy / dist : 0;
            const displacement = wave * smooth;
            v.userOffsetX += nx * displacement;
            v.userOffsetY += ny * displacement;
            v.decayX = Math.max(v.decayX, 1.5);
            v.decayY = Math.max(v.decayY, 1.5);
          }
        }
      }
    }
  }

  private getCellColor(
    cellX: number,
    cellY: number,
    width: number,
    height: number
  ): CellColor {
    const config = THEME_CONFIGS[this.theme];
    const colors = config.baseColors;
    const nx = cellX / width;
    const ny = cellY / height;
    const t = noise2(
      nx * 2 + this.time * config.shiftSpeed,
      ny * 2 + 0.5
    ) * 0.5 + 0.5;
    const idx = t * (colors.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, colors.length - 1);
    const frac = idx - i0;
    const c0 = colors[i0];
    const c1 = colors[i1];
    const smooth = frac * frac * (3 - 2 * frac);
    const variation = noise2(nx * 4 + this.time * 0.1, ny * 4 + this.time * 0.15);
    const bright = 0.85 + variation * 0.15;
    return {
      r: Math.round((c0[0] + (c1[0] - c0[0]) * smooth) * bright),
      g: Math.round((c0[1] + (c1[1] - c0[1]) * smooth) * bright),
      b: Math.round((c0[2] + (c1[2] - c0[2]) * smooth) * bright),
      a: 0.78,
    };
  }

  public getRenderData(): RenderCell[] {
    const cells: RenderCell[] = [];
    const vertices = this.vertices;
    for (let y = 0; y < this.rows - 1; y++) {
      for (let x = 0; x < this.cols - 1; x++) {
        const v00 = vertices[y][x];
        const v10 = vertices[y][x + 1];
        const v01 = vertices[y + 1][x];
        const v11 = vertices[y + 1][x + 1];
        const gv = (v: Vertex) => ({
          x: v.baseX + v.offsetX + v.userOffsetX,
          y: v.baseY + v.offsetY + v.userOffsetY,
        });
        const cellX = (v00.baseX + v11.baseX) * 0.5;
        const cellY = (v00.baseY + v11.baseY) * 0.5;
        cells.push({
          points: [gv(v00), gv(v10), gv(v11), gv(v01)],
          color: this.getCellColor(cellX, cellY, this.width, this.height),
        });
      }
    }
    return cells;
  }

  public getCols(): number {
    return this.cols;
  }

  public getRows(): number {
    return this.rows;
  }
}
