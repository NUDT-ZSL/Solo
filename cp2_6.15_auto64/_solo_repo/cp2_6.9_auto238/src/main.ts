import { InkRenderer } from './renderer';
import { UIController } from './ui';
import { createStroke, createInkPoint, addPointToStroke, finalizeStroke } from './ink';
import type { InkStroke, BrushSettings, RendererStats } from './types';

class InkApplication {
  private canvas: HTMLCanvasElement;
  private renderer: InkRenderer;
  private ui: UIController;
  private currentStroke: InkStroke | null = null;
  private isDrawing: boolean = false;
  private lastPoint: { x: number; y: number } | null = null;
  private brushSettings: BrushSettings;

  constructor() {
    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas as HTMLCanvasElement;

    this.renderer = new InkRenderer(this.canvas);

    this.ui = new UIController({
      onBrushChange: (settings) => this.handleBrushChange(settings),
      onClear: () => this.handleClear(),
    });

    this.brushSettings = this.ui.getSettings();

    this.renderer.setStatsCallback((stats: RendererStats) => {
      this.ui.updateStats(stats);
    });

    this.bindCanvasEvents();
    this.renderer.start();
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseDown({
          clientX: touch.clientX,
          clientY: touch.clientY,
        } as MouseEvent);
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove({
          clientX: touch.clientX,
          clientY: touch.clientY,
        } as MouseEvent);
      },
      { passive: false }
    );

    this.canvas.addEventListener('touchend', () => this.handleMouseUp());
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    const coords = this.getCanvasCoords(e);
    this.lastPoint = coords;

    this.currentStroke = createStroke(this.brushSettings);
    const firstPoint = createInkPoint(coords.x, coords.y);
    addPointToStroke(this.currentStroke, firstPoint, this.brushSettings);
    this.renderer.addStroke(this.currentStroke);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDrawing || !this.currentStroke) return;

    const coords = this.getCanvasCoords(e);

    if (!this.lastPoint) {
      this.lastPoint = coords;
      return;
    }

    const dx = coords.x - this.lastPoint.x;
    const dy = coords.y - this.lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      const steps = Math.max(1, Math.floor(dist / 3));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = this.lastPoint.x + dx * t;
        const y = this.lastPoint.y + dy * t;
        const point = createInkPoint(x, y);
        addPointToStroke(this.currentStroke, point, this.brushSettings);
      }
      this.lastPoint = coords;
      this.renderer.markDirty();
    }
  }

  private handleMouseUp(): void {
    if (!this.isDrawing || !this.currentStroke) return;

    this.extendStrokeEnd();
    finalizeStroke(this.currentStroke);
    this.currentStroke = null;
    this.isDrawing = false;
    this.lastPoint = null;
    this.renderer.markDirty();
  }

  private extendStrokeEnd(): void {
    if (!this.currentStroke || this.currentStroke.points.length < 2) return;

    const points = this.currentStroke.points;
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 0.1) return;

    const extension = 2 + Math.random() * 3;
    const steps = Math.ceil(extension);
    const nx = dx / len;
    const ny = dy / len;

    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * extension;
      const point = createInkPoint(p2.x + nx * t, p2.y + ny * t);
      addPointToStroke(this.currentStroke, point, this.brushSettings);
    }
  }

  private handleBrushChange(settings: BrushSettings): void {
    this.brushSettings = settings;
  }

  private handleClear(): void {
    this.renderer.clear();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new InkApplication();
});
