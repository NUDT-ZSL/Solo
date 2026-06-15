export interface InkParticle {
  x: number;
  y: number;
  initialRadius: number;
  currentRadius: number;
  targetRadius: number;
  spawnTime: number;
  age: number;
  alpha: number;
  strokeId: number;
  isUndoing: boolean;
  undoStartTime: number;
  colorR: number;
  colorG: number;
  colorB: number;
}

export interface Stroke {
  id: number;
  particles: InkParticle[];
  startTime: number;
  endTime: number;
  isComplete: boolean;
}

const DIFFUSION_DURATION = 3000;
const RADIUS_EXPANSION_FACTOR = 2.5;
const INITIAL_ALPHA = 0.9;
const FINAL_ALPHA_AFTER_DIFFUSION = 0.2;
const LOW_SPEED_THRESHOLD = 50;
const HIGH_SPEED_THRESHOLD = 200;
const MIN_WIDTH_PX = 4;
const MAX_WIDTH_PX = 12;
const BLEND_DISTANCE = 20;
const FULL_BLEND_DISTANCE = 10;
const FADE_INTERVAL = 5 * 60 * 1000;
const FADE_ALPHA_DECREMENT = 0.05;
const REMOVAL_ALPHA_THRESHOLD = 0.05;
const UNDO_DURATION = 1000;
const UNDO_DIFFUSION_MULTIPLIER = 1.5;
const MAX_PARTICLES = 5000;

const COLOR_START = { r: 0, g: 0, b: 0 };
const COLOR_END = { r: 51, g: 51, b: 51 };

export class InkEngine {
  private strokes: Stroke[] = [];
  private currentStrokeId = 0;
  private currentStroke: Stroke | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private lastFadeTime: number;
  private gridCellSize = BLEND_DISTANCE;
  private needsFullRender = true;
  private dpr: number;
  private cssWidth: number = 0;
  private cssHeight: number = 0;

  constructor(canvas: HTMLCanvasElement, dpr: number = 1) {
    this.canvas = canvas;
    this.dpr = dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    const octx = this.offscreenCanvas.getContext('2d');
    if (!octx) throw new Error('Cannot get offscreen 2D context');
    this.offscreenCtx = octx;

    this.lastFadeTime = performance.now();
  }

  resize(cssWidth: number, cssHeight: number, dpr?: number): void {
    if (dpr !== undefined) this.dpr = dpr;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    const physW = Math.floor(cssWidth * this.dpr);
    const physH = Math.floor(cssHeight * this.dpr);
    this.canvas.width = physW;
    this.canvas.height = physH;
    this.offscreenCanvas.width = physW;
    this.offscreenCanvas.height = physH;
    this.needsFullRender = true;
  }

  beginStroke(now: number): void {
    this.currentStrokeId++;
    this.currentStroke = {
      id: this.currentStrokeId,
      particles: [],
      startTime: now,
      endTime: 0,
      isComplete: false
    };
    this.strokes.push(this.currentStroke);
  }

  addPoint(cssX: number, cssY: number, speedPxPerSec: number, now: number): void {
    if (!this.currentStroke) return;

    const totalParticles = this.getTotalParticleCount();
    if (totalParticles >= MAX_PARTICLES) return;

    const baseDiameter = this.calcWidthBySpeed(speedPxPerSec);
    const baseRadius = baseDiameter / 2;

    const particle: InkParticle = {
      x: cssX,
      y: cssY,
      initialRadius: baseRadius,
      currentRadius: baseRadius,
      targetRadius: baseRadius * RADIUS_EXPANSION_FACTOR,
      spawnTime: now,
      age: 0,
      alpha: INITIAL_ALPHA,
      strokeId: this.currentStroke.id,
      isUndoing: false,
      undoStartTime: 0,
      colorR: COLOR_START.r,
      colorG: COLOR_START.g,
      colorB: COLOR_START.b
    };

    this.currentStroke.particles.push(particle);
    this.needsFullRender = true;
  }

  endStroke(now: number): void {
    if (this.currentStroke) {
      this.currentStroke.endTime = now;
      this.currentStroke.isComplete = true;
      this.currentStroke = null;
    }
  }

  undo(): void {
    if (this.strokes.length === 0) return;

    const now = performance.now();
    const completedStrokes = this.strokes.filter(s => s.isComplete);
    if (completedStrokes.length === 0) return;

    const lastStroke = completedStrokes[completedStrokes.length - 1];
    for (const p of lastStroke.particles) {
      if (!p.isUndoing) {
        p.isUndoing = true;
        p.undoStartTime = now;
      }
    }
    this.needsFullRender = true;
  }

  update(now: number): void {
    let hasChanges = false;

    for (const s of this.strokes) {
      const toRemove: number[] = [];

      for (let i = 0; i < s.particles.length; i++) {
        const p = s.particles[i];
        const dt = now - p.spawnTime;
        const prevRadius = p.currentRadius;
        const prevAlpha = p.alpha;
        const prevColorR = p.colorR;
        p.age = dt;

        if (p.isUndoing) {
          hasChanges = true;
          const undoElapsed = now - p.undoStartTime;
          const undoT = Math.min(1, undoElapsed / UNDO_DURATION);

          const maxUndoRadius = p.targetRadius * UNDO_DIFFUSION_MULTIPLIER;
          const startRadius = Math.max(p.currentRadius, p.initialRadius);
          p.currentRadius = startRadius + (maxUndoRadius - startRadius) * undoT;
          p.alpha = p.alpha * (1 - undoT);

          if (undoT >= 1) {
            toRemove.push(i);
          }
          continue;
        }

        if (dt < DIFFUSION_DURATION) {
          hasChanges = true;
          const t = dt / DIFFUSION_DURATION;
          const expDecay = 1 - Math.exp(-t * 4);
          p.currentRadius = p.initialRadius + (p.targetRadius - p.initialRadius) * expDecay;

          const colorT = t;
          p.colorR = Math.round(COLOR_START.r + (COLOR_END.r - COLOR_START.r) * colorT);
          p.colorG = Math.round(COLOR_START.g + (COLOR_END.g - COLOR_START.g) * colorT);
          p.colorB = Math.round(COLOR_START.b + (COLOR_END.b - COLOR_START.b) * colorT);

          p.alpha = INITIAL_ALPHA - (INITIAL_ALPHA - FINAL_ALPHA_AFTER_DIFFUSION) * t;
        }
      }

      if (toRemove.length > 0) {
        for (let i = toRemove.length - 1; i >= 0; i--) {
          s.particles.splice(toRemove[i], 1);
        }
        hasChanges = true;
      }
    }

    this.checkPeriodicFade(now);
    if (this.cleanupStrokes()) hasChanges = true;

    if (hasChanges) this.needsFullRender = true;
  }

  render(): void {
    if (this.needsFullRender) {
      this.renderFull();
      this.needsFullRender = false;
    }
  }

  private renderFull(): void {
    const octx = this.offscreenCtx;
    const physW = this.offscreenCanvas.width;
    const physH = this.offscreenCanvas.height;
    octx.clearRect(0, 0, physW, physH);
    octx.save();
    octx.scale(this.dpr, this.dpr);

    const allParticles: InkParticle[] = [];
    for (const s of this.strokes) {
      allParticles.push(...s.particles);
    }

    const spatialGrid = this.buildSpatialGrid(allParticles);
    this.renderBlendedParticles(octx, allParticles, spatialGrid);

    octx.restore();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  private buildSpatialGrid(particles: InkParticle[]): Map<string, InkParticle[]> {
    const grid = new Map<string, InkParticle[]>();
    for (const p of particles) {
      const cx = Math.floor(p.x / this.gridCellSize);
      const cy = Math.floor(p.y / this.gridCellSize);
      const key = `${cx},${cy}`;
      let arr = grid.get(key);
      if (!arr) {
        arr = [];
        grid.set(key, arr);
      }
      arr.push(p);
    }
    return grid;
  }

  private getNeighborsFromGrid(
    grid: Map<string, InkParticle[]>,
    p: InkParticle
  ): InkParticle[] {
    const cx = Math.floor(p.x / this.gridCellSize);
    const cy = Math.floor(p.y / this.gridCellSize);
    const neighbors: InkParticle[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const arr = grid.get(key);
        if (arr) {
          for (const n of arr) {
            if (n !== p) neighbors.push(n);
          }
        }
      }
    }
    return neighbors;
  }

  private renderBlendedParticles(
    ctx: CanvasRenderingContext2D,
    particles: InkParticle[],
    grid: Map<string, InkParticle[]>
  ): void {
    ctx.globalCompositeOperation = 'source-over';

    for (const p of particles) {
      const neighbors = this.getNeighborsFromGrid(grid, p);
      const { r, g, b } = this.computeBlendedColor(p, neighbors);
      const finalAlpha = Math.max(0, Math.min(1, p.alpha));

      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.currentRadius
      );
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${finalAlpha})`);
      gradient.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${finalAlpha * 0.65})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private computeBlendedColor(
    p: InkParticle,
    neighbors: InkParticle[]
  ): { r: number; g: number; b: number } {
    let r = p.colorR;
    let g = p.colorG;
    let b = p.colorB;
    let totalWeight = 1;

    for (const n of neighbors) {
      if (n.strokeId === p.strokeId) continue;

      const dx = n.x - p.x;
      const dy = n.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < BLEND_DISTANCE) {
        let t = 1 - (dist - FULL_BLEND_DISTANCE) / (BLEND_DISTANCE - FULL_BLEND_DISTANCE);
        t = Math.max(0, Math.min(1, t));
        const weight = t * 0.5;

        const blendR = (p.colorR + n.colorR) / 2 + (1 - t) * 25;
        const blendG = (p.colorG + n.colorG) / 2 + (1 - t) * 25;
        const blendB = (p.colorB + n.colorB) / 2 + (1 - t) * 25;

        r += blendR * weight;
        g += blendG * weight;
        b += blendB * weight;
        totalWeight += weight;
      }
    }

    return {
      r: Math.max(0, Math.min(255, Math.round(r / totalWeight))),
      g: Math.max(0, Math.min(255, Math.round(g / totalWeight))),
      b: Math.max(0, Math.min(255, Math.round(b / totalWeight)))
    };
  }

  private calcWidthBySpeed(speedPxPerSec: number): number {
    if (speedPxPerSec <= LOW_SPEED_THRESHOLD) {
      return MAX_WIDTH_PX;
    }
    if (speedPxPerSec >= HIGH_SPEED_THRESHOLD) {
      return MIN_WIDTH_PX;
    }
    const t = (speedPxPerSec - LOW_SPEED_THRESHOLD) / (HIGH_SPEED_THRESHOLD - LOW_SPEED_THRESHOLD);
    return MAX_WIDTH_PX - (MAX_WIDTH_PX - MIN_WIDTH_PX) * t;
  }

  private checkPeriodicFade(now: number): void {
    if (now - this.lastFadeTime >= FADE_INTERVAL) {
      this.lastFadeTime = now;
      for (const s of this.strokes) {
        for (const p of s.particles) {
          if (!p.isUndoing) {
            p.alpha = Math.max(0, p.alpha - FADE_ALPHA_DECREMENT);
          }
        }
      }
      this.needsFullRender = true;
    }
  }

  private cleanupStrokes(): boolean {
    const beforeCount = this.strokes.length;
    this.strokes = this.strokes.filter(s => {
      s.particles = s.particles.filter(p => {
        if (p.alpha <= REMOVAL_ALPHA_THRESHOLD && !p.isUndoing) {
          return false;
        }
        return true;
      });
      return s.particles.length > 0 || !s.isComplete;
    });
    return this.strokes.length !== beforeCount;
  }

  private getTotalParticleCount(): number {
    let count = 0;
    for (const s of this.strokes) count += s.particles.length;
    return count;
  }

  getStrokeCount(): number {
    return this.strokes.filter(s => s.isComplete).length;
  }
}
