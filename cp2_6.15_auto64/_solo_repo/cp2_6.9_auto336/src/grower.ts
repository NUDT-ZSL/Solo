import { PixelData, PlantTemplate, GRID_SIZE, CELL_SIZE } from './builder';

const STEM_COLOR = '#795548';
const STEM_LIGHT_COLOR = '#A1887F';
const GREEN_COLORS = ['#4CAF50', '#8BC34A', '#2E7D32'];
const FLOWER_COLORS = ['#E91E63', '#9C27B0', '#FFEB3B', '#FFFFFF'];

function isStemColor(color: string): boolean {
  return color === STEM_COLOR || color === STEM_LIGHT_COLOR;
}

function isGreenColor(color: string): boolean {
  return GREEN_COLORS.indexOf(color) >= 0;
}

function isFlowerColor(color: string): boolean {
  return FLOWER_COLORS.indexOf(color) >= 0;
}

export type GrowPhase = 'idle' | 'growing' | 'complete';

export class Grower {
  public template: PlantTemplate;
  public phase: GrowPhase;

  private rowPixels: Map<number, PixelData[]>;
  private minRow: number;
  private maxRow: number;
  private totalRows: number;

  public currentRow: number;
  public rowProgress: number;
  public rowsPerSecond: number;

  private stemBends: Map<string, number>;
  private leafAngles: Map<string, number>;
  private leafTargets: Map<string, number>;

  public breathTime: number;
  public breathPeriod: number;
  public breathAmp: number;

  public plantOffsetX: number;
  public plantOffsetY: number;

  constructor() {
    this.template = [];
    this.phase = 'idle';
    this.rowPixels = new Map();
    this.minRow = GRID_SIZE;
    this.maxRow = -1;
    this.totalRows = 0;
    this.currentRow = GRID_SIZE;
    this.rowProgress = 0;
    this.rowsPerSecond = 3;
    this.stemBends = new Map();
    this.leafAngles = new Map();
    this.leafTargets = new Map();
    this.breathTime = 0;
    this.breathPeriod = 0.8;
    this.breathAmp = 2;
    this.plantOffsetX = 72;
    this.plantOffsetY = 430;
  }

  public setTemplate(template: PlantTemplate): void {
    this.template = template;
    this.rowPixels.clear();
    this.stemBends.clear();
    this.leafAngles.clear();
    this.leafTargets.clear();
    this.minRow = GRID_SIZE;
    this.maxRow = -1;

    for (const p of template) {
      if (!this.rowPixels.has(p.y)) {
        this.rowPixels.set(p.y, []);
      }
      this.rowPixels.get(p.y)!.push(p);

      if (p.y < this.minRow) this.minRow = p.y;
      if (p.y > this.maxRow) this.maxRow = p.y;

      const key = `${p.x},${p.y}`;
      if (isStemColor(p.color)) {
        this.stemBends.set(key, (Math.random() * 2 - 1) * 2);
      }
      if (isGreenColor(p.color) || isFlowerColor(p.color)) {
        const dir = p.x < GRID_SIZE / 2 ? -1 : 1;
        this.leafTargets.set(key, dir * (Math.PI / 6));
        this.leafAngles.set(key, 0);
      }
    }

    this.totalRows = Math.max(0, this.maxRow - this.minRow + 1);
    this.currentRow = GRID_SIZE;
    this.rowProgress = 0;
    this.phase = 'idle';
  }

  public start(): void {
    if (this.template.length === 0) return;
    this.currentRow = GRID_SIZE;
    this.rowProgress = 0;
    this.breathTime = 0;
    this.phase = 'growing';
  }

  public reset(): void {
    this.template = [];
    this.rowPixels.clear();
    this.stemBends.clear();
    this.leafAngles.clear();
    this.leafTargets.clear();
    this.phase = 'idle';
    this.currentRow = GRID_SIZE;
    this.rowProgress = 0;
    this.minRow = GRID_SIZE;
    this.maxRow = -1;
    this.totalRows = 0;
  }

  public update(dt: number): void {
    if (this.phase === 'growing') {
      this.rowProgress += dt * this.rowsPerSecond;
      while (this.rowProgress >= 1) {
        this.rowProgress -= 1;
        this.currentRow -= 1;
        if (this.currentRow < this.minRow) {
          this.phase = 'complete';
          this.rowProgress = 0;
          break;
        }
      }

      for (const [key, target] of this.leafTargets) {
        const row = parseInt(key.split(',')[1], 10);
        if (row > this.currentRow) continue;
        if (row === this.currentRow) {
          const eased = 1 - Math.pow(1 - this.rowProgress, 3);
          this.leafAngles.set(key, target * eased);
        } else if (row < this.currentRow) {
          this.leafAngles.set(key, target);
        }
      }
    }

    if (this.phase !== 'idle') {
      this.breathTime += dt;
    }
  }

  private getBreathOffset(): number {
    if (this.phase === 'idle') return 0;
    return Math.sin((this.breathTime / this.breathPeriod) * Math.PI * 2) * this.breathAmp;
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bl})`;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.phase === 'idle') return;

    const breath = this.getBreathOffset();
    const overallProgress = this.phase === 'complete'
      ? 1
      : 1 - (this.currentRow - this.minRow + this.rowProgress) / this.totalRows;

    for (let row = GRID_SIZE - 1; row >= this.minRow; row--) {
      if (row > this.currentRow) continue;
      const pixels = this.rowPixels.get(row);
      if (!pixels) continue;

      let rowAlpha = 1;
      let colorT = overallProgress;
      if (row === this.currentRow && this.phase === 'growing') {
        rowAlpha = this.rowProgress;
        colorT = Math.min(1, overallProgress);
      }

      for (const p of pixels) {
        const key = `${p.x},${p.y}`;
        let drawColor = p.color;

        if (isStemColor(p.color)) {
          drawColor = this.lerpColor(STEM_COLOR, STEM_LIGHT_COLOR, colorT);
        }

        const bend = this.stemBends.get(key) || 0;
        const angle = this.leafAngles.get(key) || 0;

        let px = this.plantOffsetX + p.x * CELL_SIZE;
        let py = this.plantOffsetY + p.y * CELL_SIZE;

        if (isStemColor(p.color)) {
          px += bend * overallProgress;
        }

        if ((isGreenColor(p.color) || isFlowerColor(p.color)) && angle !== 0) {
          const cx = this.plantOffsetX + (GRID_SIZE / 2) * CELL_SIZE;
          const cy = this.plantOffsetY + p.y * CELL_SIZE + CELL_SIZE / 2;
          const dx = px + CELL_SIZE / 2 - cx;
          const dy = py + CELL_SIZE / 2 - cy;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const rx = dx * cosA - dy * sinA;
          const ry = dx * sinA + dy * cosA;
          px = cx + rx - CELL_SIZE / 2;
          py = cy + ry - CELL_SIZE / 2;
        }

        py += breath;

        ctx.globalAlpha = rowAlpha;
        ctx.fillStyle = drawColor;
        ctx.fillRect(Math.round(px), Math.round(py), CELL_SIZE, CELL_SIZE);
      }
    }
    ctx.globalAlpha = 1;
  }

  public drawForScreenshot(ctx: CanvasRenderingContext2D, size: number): void {
    if (this.template.length === 0) return;

    const breath = this.getBreathOffset();
    const scale = size / (GRID_SIZE * CELL_SIZE);
    const overallProgress = this.phase === 'complete' ? 1 : 1 - (this.currentRow - this.minRow + this.rowProgress) / this.totalRows;

    for (let row = GRID_SIZE - 1; row >= this.minRow; row--) {
      if (this.phase === 'growing' && row > this.currentRow) continue;
      const pixels = this.rowPixels.get(row);
      if (!pixels) continue;

      for (const p of pixels) {
        const key = `${p.x},${p.y}`;
        let drawColor = p.color;
        if (isStemColor(p.color)) {
          drawColor = this.lerpColor(STEM_COLOR, STEM_LIGHT_COLOR, overallProgress);
        }

        const bend = this.stemBends.get(key) || 0;
        const angle = this.leafAngles.get(key) || 0;

        let px = p.x * CELL_SIZE;
        let py = p.y * CELL_SIZE;

        if (isStemColor(p.color)) {
          px += bend * overallProgress;
        }

        if ((isGreenColor(p.color) || isFlowerColor(p.color)) && angle !== 0) {
          const cx = (GRID_SIZE / 2) * CELL_SIZE;
          const cy = p.y * CELL_SIZE + CELL_SIZE / 2;
          const dx = px + CELL_SIZE / 2 - cx;
          const dy = py + CELL_SIZE / 2 - cy;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const rx = dx * cosA - dy * sinA;
          const ry = dx * sinA + dy * cosA;
          px = cx + rx - CELL_SIZE / 2;
          py = cy + ry - CELL_SIZE / 2;
        }

        py += breath;

        ctx.fillStyle = drawColor;
        ctx.fillRect(
          Math.round(px * scale),
          Math.round(py * scale),
          Math.ceil(CELL_SIZE * scale),
          Math.ceil(CELL_SIZE * scale)
        );
      }
    }
  }
}
