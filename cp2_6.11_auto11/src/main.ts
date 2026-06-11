import { BrushEngine, type StrokePath, type RenderData } from './brush';
import { CanvasRenderer, type PaperTexture } from './renderer';
import { ExportManager, type ExportFormat, type ExportScale } from './export';
import { UIController, type UIToolEvent } from './ui';

const CANVAS_MAX_WIDTH = 900;
const CANVAS_ASPECT_RATIO = 4 / 3;
const MAX_HISTORY = 50;

class CalligraphyApp {
  private brush: BrushEngine;
  private renderer: CanvasRenderer;
  private exporter: ExportManager;
  private ui: UIController;

  private mainCanvas: HTMLCanvasElement;
  private textureCanvas: HTMLCanvasElement;
  private container: HTMLElement;

  private strokes: StrokePath[] = [];
  private history: StrokePath[][] = [];
  private redoStack: StrokePath[][] = [];
  private isDrawing: boolean = false;

  private rafPending: boolean = false;
  private pendingRenderData: RenderData | null = null;

  constructor() {
    this.mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.textureCanvas = document.getElementById('textureLayer') as HTMLCanvasElement;
    this.container = document.querySelector('.canvas-container') as HTMLElement;

    if (!this.mainCanvas || !this.textureCanvas || !this.container) {
      throw new Error('无法找到必要的DOM元素');
    }

    this.brush = new BrushEngine();
    this.renderer = new CanvasRenderer(this.mainCanvas, this.textureCanvas);
    this.exporter = new ExportManager(this.renderer);
    this.ui = new UIController();

    this.init();
  }

  private init(): void {
    this.setupCanvasSize();
    this.setupBrushCallbacks();
    this.setupUICallbacks();
    this.setupInputEvents();
    this.setupWindowEvents();

    this.updateHistoryUI();
  }

  private setupCanvasSize(): void {
    const containerWidth = this.container.clientWidth;
    const width = Math.min(CANVAS_MAX_WIDTH, containerWidth);
    const height = width / CANVAS_ASPECT_RATIO;

    const dpr = window.devicePixelRatio || 1;
    this.mainCanvas.width = Math.floor(width * dpr);
    this.mainCanvas.height = Math.floor(height * dpr);
    this.textureCanvas.width = Math.floor(width * dpr);
    this.textureCanvas.height = Math.floor(height * dpr);

    const ctx = this.mainCanvas.getContext('2d');
    const tctx = this.textureCanvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    if (tctx) tctx.scale(dpr, dpr);

    this.renderer.resize(Math.floor(width * dpr), Math.floor(height * dpr));
  }

  private setupBrushCallbacks(): void {
    this.brush.onRender((data: RenderData) => {
      this.pendingRenderData = data;
      this.scheduleRender();
    });
  }

  private scheduleRender(): void {
    if (this.rafPending) return;
    this.rafPending = true;

    requestAnimationFrame(() => {
      this.rafPending = false;
      if (this.pendingRenderData) {
        this.renderer.handleRenderData(this.pendingRenderData);
        this.pendingRenderData = null;
      }
    });
  }

  private setupUICallbacks(): void {
    this.ui.onEvent((event: UIToolEvent) => {
      this.handleUIEvent(event);
    });
  }

  private handleUIEvent(event: UIToolEvent): void {
    switch (event.type) {
      case 'brushSizeChanged':
        this.brush.setSettings({ baseSize: event.value });
        break;

      case 'colorChanged':
        this.brush.setSettings({ color: event.value });
        break;

      case 'textureChanged':
        this.handleTextureChange(event.value);
        break;

      case 'undo':
        this.undo();
        break;

      case 'redo':
        this.redo();
        break;

      case 'clear':
        this.clearCanvas();
        break;

      case 'reset':
        this.resetCanvas();
        break;

      case 'export':
        this.showExportModal();
        break;

      case 'exportConfirmed':
        this.handleExport(event.format, event.scale);
        break;

      case 'exportCancelled':
        break;
    }
  }

  private handleTextureChange(texture: PaperTexture): void {
    this.renderer.setTexture(texture);
  }

  private setupInputEvents(): void {
    const canvas = this.mainCanvas;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointerleave', (e) => {
      if (this.isDrawing) this.onPointerUp(e);
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      }
    });
  }

  private setupWindowEvents(): void {
    let resizeTimeout: number;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        this.handleResize();
      }, 100);
    });
  }

  private handleResize(): void {
    const snapshot = [...this.strokes];
    this.setupCanvasSize();
    this.renderer.redrawAllStrokes(snapshot);
  }

  private getCanvasCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.mainCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (e.clientX - rect.left) * (this.mainCanvas.width / rect.width) / dpr,
      y: (e.clientY - rect.top) * (this.mainCanvas.height / rect.height) / dpr
    };
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.mainCanvas.setPointerCapture(e.pointerId);

    const coords = this.getCanvasCoords(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    this.isDrawing = true;
    this.brush.startStroke(coords.x, coords.y, pressure);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;
    e.preventDefault();

    const coords = this.getCanvasCoords(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    this.brush.moveStroke(coords.x, coords.y, pressure);
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isDrawing) return;
    e.preventDefault();

    const coords = this.getCanvasCoords(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    const completedStroke = this.brush.endStroke(coords.x, coords.y, pressure);
    if (completedStroke && completedStroke.points.length > 0) {
      this.pushHistory();
      this.strokes.push(completedStroke);
      this.redoStack = [];
      this.updateHistoryUI();
    }

    this.isDrawing = false;
  }

  private pushHistory(): void {
    this.history.push([...this.strokes]);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
  }

  private undo(): void {
    if (this.history.length === 0) return;

    this.redoStack.push([...this.strokes]);
    const prevState = this.history.pop() || [];
    this.strokes = prevState;

    this.renderer.clear();
    this.renderer.redrawAllStrokes(this.strokes);
    this.updateHistoryUI();
  }

  private redo(): void {
    if (this.redoStack.length === 0) return;

    this.history.push([...this.strokes]);
    const nextState = this.redoStack.pop() || [];
    this.strokes = nextState;

    this.renderer.clear();
    this.renderer.redrawAllStrokes(this.strokes);
    this.updateHistoryUI();
  }

  private clearCanvas(): void {
    if (this.strokes.length === 0) return;

    this.pushHistory();
    this.strokes = [];
    this.redoStack = [];

    this.renderer.clear();
    this.renderer.setTexture(this.renderer.getTexture());
    this.updateHistoryUI();
  }

  private resetCanvas(): void {
    this.strokes = [];
    this.history = [];
    this.redoStack = [];

    this.brush.setSettings({
      baseSize: 10,
      color: '#1A1A1A'
    });
    this.renderer.setTexture('plain');

    this.renderer.clear();

    const sizeSlider = document.getElementById('sizeSlider') as HTMLInputElement;
    if (sizeSlider) sizeSlider.value = '10';

    const colorDots = document.querySelectorAll('#colorPalette .color-dot');
    colorDots.forEach((d, i) => {
      d.classList.toggle('active', i === 0);
    });

    const textureBtns = document.querySelectorAll('#textureButtons .texture-btn');
    textureBtns.forEach((b, i) => {
      b.classList.toggle('active', i === 0);
    });

    this.updateHistoryUI();

    const state = this.ui.getState();
    this.ui.updateHistory(0, 0);
  }

  private updateHistoryUI(): void {
    this.ui.updateHistory(this.history.length, this.redoStack.length);
  }

  private showExportModal(): void {
    this.ui.showExportModal();

    const previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    if (previewCanvas) {
      this.exporter.generatePreview(previewCanvas, 0.3);
    }
  }

  private async handleExport(format: ExportFormat, scale: ExportScale): Promise<void> {
    this.ui.setExportLoading(true);

    try {
      await this.exporter.exportAndDownload(
        { format, scale },
        this.strokes,
        (_progress: number) => {}
      );

      setTimeout(() => {
        this.ui.hideExportModal();
        this.ui.setExportLoading(false);
      }, 300);
    } catch (err) {
      console.error('导出失败:', err);
      this.ui.setExportLoading(false);
      alert('导出失败，请重试');
    }
  }

  destroy(): void {
    this.renderer.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    (window as unknown as { app?: CalligraphyApp }).app = new CalligraphyApp();
  } catch (err) {
    console.error('应用初始化失败:', err);
  }
});
