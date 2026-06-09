import type {
  InkStroke,
  DiffusionArea,
  RendererStats,
  InkPoint,
  Point,
} from './types';
import {
  updateStrokeDiffusion,
  checkStrokeOverlap,
  createDiffusionAreas,
  darkenStroke,
  getStrokeLength,
  shouldMergeStrokes,
  mergeStrokes,
  mixColors,
} from './ink';

const BG_COLOR = '#F5F0E8';
const CANVAS_SIZE = 800;
const GRID_SIZE = 20;
const MERGE_THRESHOLD = 2000;

export class InkRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private strokes: InkStroke[] = [];
  private diffusionAreas: DiffusionArea[] = [];
  private lastFrameTime: number = 0;
  private animationId: number = 0;
  private needsRender: boolean = true;
  private onStatsUpdate?: (stats: RendererStats) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = canvas.width;
    this.bgCanvas.height = canvas.height;
    const bgCtx = this.bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('Cannot get background context');
    this.bgCtx = bgCtx;

    this.drawPaperTexture();
  }

  setStatsCallback(callback: (stats: RendererStats) => void): void {
    this.onStatsUpdate = callback;
  }

  private drawPaperTexture(): void {
    const { width, height } = this.bgCanvas;
    this.bgCtx.fillStyle = BG_COLOR;
    this.bgCtx.fillRect(0, 0, width, height);

    this.bgCtx.strokeStyle = 'rgba(139, 115, 85, 0.05)';
    this.bgCtx.lineWidth = 0.5;

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const angle = Math.random() * Math.PI * 2;
      const len = Math.random() * 30 + 10;

      this.bgCtx.beginPath();
      this.bgCtx.moveTo(x, y);
      this.bgCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      this.bgCtx.stroke();
    }

    this.bgCtx.globalAlpha = 0.02;
    for (let i = 0; i < 1000; i++) {
      this.bgCtx.fillStyle = Math.random() > 0.5 ? '#8B7355' : '#6B5B4B';
      this.bgCtx.fillRect(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2,
        Math.random() * 2
      );
    }
    this.bgCtx.globalAlpha = 1;
  }

  addStroke(stroke: InkStroke): void {
    this.strokes.push(stroke);
    this.needsRender = true;
    this.checkOverlapAndBlend(stroke);
  }

  getStrokes(): InkStroke[] {
    return this.strokes;
  }

  clear(): void {
    this.strokes = [];
    this.diffusionAreas = [];
    this.needsRender = true;
    this.updateStats();
  }

  private checkOverlapAndBlend(newStroke: InkStroke): void {
    for (const existingStroke of this.strokes) {
      if (existingStroke.id === newStroke.id) continue;
      if (existingStroke.isActive) continue;

      if (checkStrokeOverlap(newStroke, existingStroke)) {
        const newDiffusions = createDiffusionAreas(newStroke, BG_COLOR);
        const existingDiffusions = createDiffusionAreas(existingStroke, BG_COLOR);
        this.diffusionAreas.push(...newDiffusions, ...existingDiffusions);
        darkenStroke(existingStroke, 0.1);
      }
    }
  }

  private drawStrokeLine(
    ctx: CanvasRenderingContext2D,
    points: InkPoint[],
    color: string,
    baseOpacity: number,
    baseWidth: number,
    diffusionRadius: number = 0
  ): void {
    if (points.length < 2) return;

    const totalWidth = baseWidth + diffusionRadius * 2;

    const gradient = ctx.createLinearGradient(
      points[0].x,
      points[0].y,
      points[points.length - 1].x,
      points[points.length - 1].y
    );
    gradient.addColorStop(0, mixColors(color, '#3A2A2A', 0.2));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, mixColors(color, '#3A2A2A', 0.3));

    ctx.save();
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = baseOpacity;

    if (diffusionRadius > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = diffusionRadius * 2;
    }

    ctx.lineWidth = totalWidth * 0.6;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.lineWidth = totalWidth * 0.3;
    ctx.globalAlpha = baseOpacity * 0.5;
    ctx.stroke();

    ctx.restore();
  }

  private drawBranch(ctx: CanvasRenderingContext2D, branch: {
    points: Point[];
    opacity: number;
    color: string;
    width: number;
  }): void {
    if (branch.points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = branch.color;
    ctx.globalAlpha = branch.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = branch.width;

    ctx.beginPath();
    ctx.moveTo(branch.points[0].x, branch.points[0].y);
    for (let i = 1; i < branch.points.length; i++) {
      ctx.lineTo(branch.points[i].x, branch.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawDiffusionArea(ctx: CanvasRenderingContext2D, area: DiffusionArea): void {
    const elapsed = Date.now() - area.createdAt;
    const progress = Math.min(1, elapsed / area.duration);
    const currentOpacity = area.opacity * (1 - progress * 0.9);

    if (currentOpacity <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = currentOpacity;

    const gradient = ctx.createRadialGradient(
      area.centerX,
      area.centerY,
      0,
      area.centerX,
      area.centerY,
      area.radius
    );
    gradient.addColorStop(0, area.color);
    gradient.addColorStop(0.5, mixColors(area.color, BG_COLOR, 0.5));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(area.centerX, area.centerY, area.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private render(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.drawImage(this.bgCanvas, 0, 0);

    for (const area of this.diffusionAreas) {
      this.drawDiffusionArea(this.ctx, area);
    }

    for (const stroke of this.strokes) {
      this.drawStrokeLine(
        this.ctx,
        stroke.points,
        stroke.color,
        stroke.opacity,
        stroke.baseWidth,
        stroke.diffusionRadius
      );

      for (const branch of stroke.branches) {
        this.drawBranch(this.ctx, branch);
      }
    }
  }

  private updateDiffusions(deltaTime: number): boolean {
    let changed = false;

    for (const stroke of this.strokes) {
      if (!stroke.isActive && !stroke.diffusionComplete) {
        if (updateStrokeDiffusion(stroke, deltaTime)) {
          changed = true;
        }
      }
    }

    const now = Date.now();
    const beforeCount = this.diffusionAreas.length;
    this.diffusionAreas = this.diffusionAreas.filter(
      (area) => now - area.createdAt < area.duration
    );
    if (this.diffusionAreas.length !== beforeCount) {
      changed = true;
    }

    return changed;
  }

  private mergeOptimization(): void {
    if (this.strokes.length <= MERGE_THRESHOLD) return;

    const inactiveStrokes = this.strokes.filter((s) => !s.isActive);
    if (inactiveStrokes.length < 100) return;

    const mergedIds = new Set<string>();
    const newStrokes: InkStroke[] = [];

    for (let i = 0; i < inactiveStrokes.length; i++) {
      const s1 = inactiveStrokes[i];
      if (mergedIds.has(s1.id)) continue;

      let merged = s1;
      for (let j = i + 1; j < Math.min(i + 50, inactiveStrokes.length); j++) {
        const s2 = inactiveStrokes[j];
        if (mergedIds.has(s2.id)) continue;

        if (shouldMergeStrokes(merged, s2)) {
          merged = mergeStrokes(merged, s2);
          mergedIds.add(s2.id);
        }
      }
      newStrokes.push(merged);
      mergedIds.add(s1.id);
    }

    const activeStrokes = this.strokes.filter((s) => s.isActive);
    const remainingInactive = inactiveStrokes.filter((s) => !mergedIds.has(s.id));
    this.strokes = [...remainingInactive, ...newStrokes, ...activeStrokes];
  }

  private updateStats(): void {
    if (!this.onStatsUpdate) return;

    const totalLength = this.strokes.reduce((sum, s) => sum + getStrokeLength(s), 0);

    const cellW = CANVAS_SIZE / GRID_SIZE;
    const cellH = CANVAS_SIZE / GRID_SIZE;
    const grid: number[][] = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(0));

    let totalDensity = 0;
    let totalWeight = 0;

    for (const stroke of this.strokes) {
      for (const point of stroke.points) {
        const gx = Math.min(GRID_SIZE - 1, Math.floor(point.x / cellW));
        const gy = Math.min(GRID_SIZE - 1, Math.floor(point.y / cellH));
        grid[gy][gx] += stroke.opacity * 0.5;
        totalDensity += stroke.opacity;
        totalWeight++;
      }
    }

    let maxDensity = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = Math.min(1, grid[y][x]);
        if (grid[y][x] > maxDensity) maxDensity = grid[y][x];
      }
    }

    if (maxDensity > 0) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          grid[y][x] = grid[y][x] / maxDensity;
        }
      }
    }

    const avgDensity = totalWeight > 0 ? (totalDensity / totalWeight) * 100 : 0;

    this.onStatsUpdate({
      avgDensity: Math.round(avgDensity),
      totalLength: Math.round(totalLength),
      densityGrid: grid,
    });
  }

  start(): void {
    this.lastFrameTime = performance.now();

    const loop = (now: number) => {
      const deltaTime = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      const diffChanged = this.updateDiffusions(deltaTime);
      if (diffChanged || this.needsRender) {
        this.render();
        this.needsRender = false;
        this.mergeOptimization();
        this.updateStats();
      }

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  markDirty(): void {
    this.needsRender = true;
  }
}
