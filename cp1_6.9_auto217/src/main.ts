import {
  InkStroke,
  createStroke,
  addPoint,
  updateStrokeBloom,
  renderStroke,
  startFade,
  isStrokeFaded
} from './ink';
import { FlowSystem, PathPoint } from './flow';
import { ToolbarUI, UIState, TRADITIONAL_COLORS } from './ui';

const MAX_HISTORY = 20;

interface StrokeHistoryEntry {
  strokeId: string;
}

class HistoryManager {
  private undoStack: StrokeHistoryEntry[][] = [];
  private redoStack: StrokeHistoryEntry[][] = [];
  private maxSteps: number;

  constructor(maxSteps: number = MAX_HISTORY) {
    this.maxSteps = maxSteps;
  }

  pushStep(entry: StrokeHistoryEntry[]): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxSteps) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): StrokeHistoryEntry[] | null {
    if (!this.canUndo()) return null;
    const step = this.undoStack.pop()!;
    this.redoStack.push(step);
    return step;
  }

  redo(): StrokeHistoryEntry[] | null {
    if (!this.canRedo()) return null;
    const step = this.redoStack.pop()!;
    this.undoStack.push(step);
    return step;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}

class InkFlowApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private flowSystem: FlowSystem;
  private toolbar: ToolbarUI;
  private history: HistoryManager;

  private strokes: InkStroke[] = [];
  private currentStroke: InkStroke | null = null;
  private currentStepIds: StrokeHistoryEntry[] = [];
  private isDrawing = false;

  private lastTime = 0;

  private clearAnimation: {
    active: boolean;
    startTime: number;
    centerX: number;
    centerY: number;
    maxRadius: number;
  } | null = null;

  private state: UIState = {
    brushSize: 10,
    selectedColor: TRADITIONAL_COLORS[0].hex,
    selectedColorName: TRADITIONAL_COLORS[0].name
  };

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('无法获取离屏Canvas上下文');
    this.offscreenCtx = offCtx;

    this.flowSystem = new FlowSystem();
    this.history = new HistoryManager(MAX_HISTORY);

    this.toolbar = new ToolbarUI(
      document.getElementById('app') as HTMLElement,
      this.state,
      {
        onBrushSizeChange: (size) => this.state.brushSize = size,
        onColorChange: (hex, name) => {
          this.state.selectedColor = hex;
          this.state.selectedColorName = name;
        },
        onClear: () => this.startClearAnimation(),
        onExport: () => this.exportImage()
      }
    );

    this.resizeCanvas();
    this.bindEvents();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }

    if (this.offscreenCanvas.width !== w || this.offscreenCanvas.height !== h) {
      this.offscreenCanvas.width = w;
      this.offscreenCanvas.height = h;
      this.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.offscreenCtx.scale(dpr, dpr);
    }
  }

  private getCanvasCoords(e: PointerEvent | MouseEvent | Touch): { x: number; y: number; pressure: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e as PointerEvent).clientX !== undefined
      ? (e as PointerEvent).clientX - rect.left
      : (e as Touch).clientX - rect.left;
    const y = (e as PointerEvent).clientY !== undefined
      ? (e as PointerEvent).clientY - rect.top
      : (e as Touch).clientY - rect.top;
    const pressure = (e as PointerEvent).pressure !== undefined && (e as PointerEvent).pressure > 0
      ? (e as PointerEvent).pressure
      : 0.7;
    return { x, y, pressure };
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    const onDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return;
      this.resizeCanvas();
      const { x, y, pressure } = this.getCanvasCoords(e);
      this.beginStroke(x, y, pressure, performance.now());
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!this.isDrawing || !this.currentStroke) return;
      const { x, y, pressure } = this.getCanvasCoords(e);
      this.continueStroke(x, y, pressure, performance.now());
    };

    const onUp = (e: PointerEvent) => {
      if (!this.isDrawing) return;
      const { x, y, pressure } = this.getCanvasCoords(e);
      this.endStroke(x, y, pressure, performance.now());
    };

    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerup', onUp);
    this.canvas.addEventListener('pointercancel', onUp);
    this.canvas.addEventListener('pointerleave', onUp);

    document.addEventListener('keydown', (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isCtrl && !isShift && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
      } else if (isCtrl && isShift && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        this.redo();
      }
    });
  }

  private beginStroke(x: number, y: number, pressure: number, time: number): void {
    this.isDrawing = true;
    this.currentStroke = createStroke(this.state.selectedColor, this.state.brushSize, time);
    this.currentStepIds = [];
    addPoint(this.currentStroke, x, y, pressure, time);
    this.strokes.push(this.currentStroke);
    this.currentStepIds.push({ strokeId: this.currentStroke.id });
  }

  private continueStroke(x: number, y: number, pressure: number, time: number): void {
    if (!this.currentStroke) return;
    const pts = this.currentStroke.points;
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      const dist = Math.hypot(x - last.x, y - last.y);
      if (dist < 1.2) return;
    }
    addPoint(this.currentStroke, x, y, pressure, time);
  }

  private endStroke(_x: number, _y: number, _pressure: number, time: number): void {
    if (!this.currentStroke || !this.isDrawing) return;
    this.isDrawing = false;

    const stroke = this.currentStroke;
    if (stroke.points.length >= 2) {
      const pathPoints: PathPoint[] = stroke.points.map(p => ({ x: p.x, y: p.y }));
      this.flowSystem.spawnParticles(
        stroke.id,
        pathPoints,
        stroke.color,
        time
      );
    }

    if (this.currentStepIds.length > 0) {
      this.history.pushStep([...this.currentStepIds]);
    }
    this.currentStepIds = [];
    this.currentStroke = null;
  }

  private undo(): void {
    const step = this.history.undo();
    if (!step || step.length === 0) return;
    const now = performance.now();
    const strokeIds = new Set(step.map(e => e.strokeId));
    for (const stroke of this.strokes) {
      if (strokeIds.has(stroke.id)) {
        startFade(stroke, now);
        this.flowSystem.startFadeParticlesByStroke(stroke.id, now);
      }
    }
  }

  private redo(): void {
    const step = this.history.redo();
    if (!step || step.length === 0) return;
    const strokeIds = new Set(step.map(e => e.strokeId));
    for (const stroke of this.strokes) {
      if (strokeIds.has(stroke.id)) {
        stroke.fadeOutStart = null;
        stroke.opacity = 1;
        for (const particle of this.flowSystem.particles) {
          if (particle.strokeId === stroke.id) {
            particle.fadeOutStart = null;
            particle.opacity = 1;
          }
        }
      }
    }
  }

  private startClearAnimation(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.clearAnimation = {
      active: true,
      startTime: performance.now(),
      centerX: rect.width / 2,
      centerY: rect.height / 2,
      maxRadius: Math.hypot(rect.width, rect.height) * 0.7
    };
  }

  private updateClearAnimation(now: number): void {
    if (!this.clearAnimation || !this.clearAnimation.active) return;
    const duration = 900;
    const t = Math.min(1, (now - this.clearAnimation.startTime) / duration);
    const eased = t * t * (3 - 2 * t);
    if (eased >= 1) {
      this.strokes.length = 0;
      this.flowSystem.clear();
      this.history.clear();
      this.clearAnimation = null;
    }
  }

  private renderClearMask(now: number, ctx: CanvasRenderingContext2D): void {
    if (!this.clearAnimation || !this.clearAnimation.active) return;
    const duration = 900;
    const t = Math.min(1, (now - this.clearAnimation.startTime) / duration);
    const eased = t * t * (3 - 2 * t);
    const { centerX, centerY, maxRadius } = this.clearAnimation;
    const currentRadius = eased * maxRadius;
    const canvasW = this.canvas.getBoundingClientRect().width;
    const canvasH = this.canvas.getBoundingClientRect().height;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 10, 1)';
    ctx.beginPath();
    ctx.rect(0, 0, canvasW, canvasH);
    ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();
  }

  private exportImage(): void {
    const overlay = this.toolbar.showExportProgress();
    const targetW = 1920;
    const targetH = 1080;

    setTimeout(() => {
      try {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = targetW / rect.width;
        const scaleY = targetH / rect.height;
        const scale = Math.min(scaleX, scaleY);

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = targetW;
        exportCanvas.height = targetH;
        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) throw new Error('导出画布上下文不可用');

        const gradient = exportCtx.createLinearGradient(0, 0, 0, targetH);
        gradient.addColorStop(0, '#0a0a0a');
        gradient.addColorStop(1, '#1a1a1a');
        exportCtx.fillStyle = gradient;
        exportCtx.fillRect(0, 0, targetW, targetH);

        exportCtx.save();
        exportCtx.translate((targetW - rect.width * scale) / 2, (targetH - rect.height * scale) / 2);
        exportCtx.scale(scale, scale);

        const now = performance.now();
        for (const stroke of this.strokes) {
          if (isStrokeFaded(stroke)) continue;
          renderStroke(exportCtx, stroke, now);
        }
        this.flowSystem.render(exportCtx);
        exportCtx.restore();

        const dataUrl = exportCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        const ts = new Date();
        const fname = `墨韵流光_${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}.png`;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => this.toolbar.hideExportProgress(overlay), 500);
      } catch (err) {
        console.error('导出失败', err);
        this.toolbar.hideExportProgress(overlay);
      }
    }, 1000);
  }

  private loop = (time: number): void => {
    const deltaTime = Math.min(50, time - this.lastTime);
    this.lastTime = time;
    this.resizeCanvas();

    for (const stroke of this.strokes) {
      updateStrokeBloom(stroke, time);
    }
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      if (isStrokeFaded(this.strokes[i])) {
        this.strokes.splice(i, 1);
      }
    }

    this.flowSystem.update(time, deltaTime);
    this.flowSystem.removeAllFaded();
    this.updateClearAnimation(time);

    const rect = this.canvas.getBoundingClientRect();
    this.offscreenCtx.save();
    this.offscreenCtx.clearRect(0, 0, rect.width, rect.height);
    for (const stroke of this.strokes) {
      renderStroke(this.offscreenCtx, stroke, time);
    }
    this.offscreenCtx.restore();

    this.flowSystem.render(this.offscreenCtx);
    this.renderClearMask(time, this.offscreenCtx);

    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, rect.width, rect.height);

    this._rafId = requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new InkFlowApp();
  } catch (err) {
    console.error('应用初始化失败:', err);
  }
});
