import type { TrafficFrame, Intersection, HeatmapPoint } from './types';
import { TrafficDataSimulator } from './trafficData';
import { flowToHeatmapRadius } from './utils/color';

export class HeatmapLayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private simulator: TrafficDataSimulator;
  private width: number = 0;
  private height: number = 0;
  private cachedHeatmapPoints: HeatmapPoint[] = [];
  private lastFrameHash: string = '';
  private dpr: number = 1;
  private fadeAlpha: number = 0.35;
  private readonly GAUSS_SIGMA = 0.3;

  constructor(canvasId: string, simulator: TrafficDataSimulator) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element #${canvasId} not found`);
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for heatmap canvas');
    }
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) {
      throw new Error('Failed to create offscreen canvas context');
    }
    this.offscreenCtx = offCtx;

    this.simulator = simulator;
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(this.dpr, this.dpr);

    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
  }

  private worldToScreen(x: number, z: number): { x: number; y: number } {
    const bounds = this.simulator.getWorldBounds();
    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxZ - bounds.minZ;

    const marginX = this.width * 0.18;
    const marginY = this.height * 0.15;

    const scaleX = (this.width - marginX * 2) / worldWidth;
    const scaleY = (this.height - marginY * 2) / worldHeight;

    return {
      x: marginX + (x - bounds.minX) * scaleX,
      y: marginY + (z - bounds.minZ) * scaleY,
    };
  }

  private gaussianFalloff(dist: number, radius: number): number {
    const normalized = dist / radius;
    return Math.exp(-(normalized * normalized) / (2 * this.GAUSS_SIGMA * this.GAUSS_SIGMA));
  }

  private drawGaussianBlob(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    intensity: number
  ): void {
    const steps = 5;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = radius * (0.3 + t * 0.7);
      const alpha = intensity * this.gaussianFalloff(r, radius) * 0.35;

      const [cr, cg, cb] = this.intensityToColor(intensity);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
      ctx.fill();
    }
  }

  private intensityToColor(intensity: number): [number, number, number] {
    const t = clamp01(intensity);
    if (t < 0.33) {
      const k = t / 0.33;
      return [
        Math.round(lerp(0, 0, k)),
        Math.round(lerp(102, 200, k)),
        Math.round(lerp(255, 255, k)),
      ];
    } else if (t < 0.7) {
      const k = (t - 0.33) / 0.37;
      return [
        Math.round(lerp(0, 255, k)),
        Math.round(lerp(200, 255, k)),
        Math.round(lerp(255, 0, k)),
      ];
    } else {
      const k = (t - 0.7) / 0.3;
      return [
        255,
        Math.round(lerp(255, 0, k)),
        0,
      ];
    }
  }

  private computePoints(frame: TrafficFrame): HeatmapPoint[] {
    const intersections: Intersection[] = this.simulator.getIntersectionArray();
    const points: HeatmapPoint[] = [];

    for (const int of intersections) {
      const data = frame.data.get(int.id);
      if (!data) continue;

      const screen = this.worldToScreen(int.x, int.z);
      const intensity = clamp01(data.flow / 1000);
      const radius = flowToHeatmapRadius(data.flow);

      points.push({
        x: screen.x,
        y: screen.y,
        intensity,
        radius,
      });
    }

    return points;
  }

  private hashFrame(frame: TrafficFrame): string {
    return `${frame.hour.toFixed(2)}_${frame.totalFlow.toFixed(0)}`;
  }

  update(frame: TrafficFrame, transitionT: number = 1.0): void {
    void transitionT;
    const frameHash = this.hashFrame(frame);

    if (frameHash !== this.lastFrameHash) {
      this.cachedHeatmapPoints = this.computePoints(frame);
      this.lastFrameHash = frameHash;
    }

    this.offscreenCtx.globalCompositeOperation = 'source-over';
    this.offscreenCtx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
    this.offscreenCtx.fillRect(0, 0, this.width, this.height);

    this.offscreenCtx.globalCompositeOperation = 'lighter';

    for (const pt of this.cachedHeatmapPoints) {
      this.drawGaussianBlob(
        this.offscreenCtx,
        pt.x,
        pt.y,
        pt.radius,
        pt.intensity
      );
    }

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(
      this.offscreenCanvas,
      0, 0, this.width, this.height,
      0, 0, this.canvas.width, this.canvas.height
    );
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
