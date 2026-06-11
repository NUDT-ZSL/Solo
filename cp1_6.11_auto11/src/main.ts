import { BrushEngine, type BrushConfig, type RenderCommand } from './brush';
import { Renderer } from './renderer';
import { ExportManager, type ExportOptions } from './export';
import { UIController, MAX_UNDO_STEPS } from './ui';

class App {
  private canvas: HTMLCanvasElement;
  private previewCanvas: HTMLCanvasElement;
  private brush: BrushEngine;
  private renderer: Renderer;
  private exporter: ExportManager;
  private ui: UIController;

  private isDrawing = false;
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private pendingCommands: RenderCommand[] = [];

  private canvasWidth = 900;
  private canvasHeight = 675;

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;

    this.setupCanvasSize();

    const initialConfig: BrushConfig = {
      baseSize: 10,
      color: '#1A1A1A',
      textureType: 'danxuan',
    };

    this.brush = new BrushEngine(initialConfig);
    this.renderer = new Renderer(this.canvas, this.previewCanvas);
    this.exporter = new ExportManager(this.renderer);
    this.ui = new UIController(initialConfig);

    this.renderer.applyTexture('danxuan');
    this.saveUndoState();
  }

  private setupCanvasSize(): void {
    this.canvasWidth = 900;
    this.canvasHeight = 675;

    const container = document.getElementById('canvas-container');
    if (container) {
      const maxW = Math.min(900, container.clientWidth || 900);
      const maxH = maxW * 0.75;
      this.canvasWidth = maxW;
      this.canvasHeight = maxH;
    }

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.previewCanvas.width = this.canvasWidth;
    this.previewCanvas.height = this.canvasHeight;
  }

  init(): void {
    this.ui.bindEvents();
    this.bindCanvasEvents();
    this.bindUICallbacks();
    this.bindExportEvents();
    this.bindKeyboard();
    this.ui.updateStatusInk('浓墨');
  }

  private bindCanvasEvents(): void {
    const canvasEl = this.canvas;

    const scaleCoord = (offsetX: number, offsetY: number): { x: number; y: number } => {
      const rect = canvasEl.getBoundingClientRect();
      const scaleX = canvasEl.width / rect.width;
      const scaleY = canvasEl.height / rect.height;
      return { x: offsetX * scaleX, y: offsetY * scaleY };
    };

    canvasEl.addEventListener('mousedown', (e) => {
      const c = scaleCoord(e.offsetX, e.offsetY);
      this.onPointerDown(c.x, c.y, 0.5);
    });
    canvasEl.addEventListener('mousemove', (e) => {
      if (this.isDrawing) {
        const c = scaleCoord(e.offsetX, e.offsetY);
        this.onPointerMove(c.x, c.y, 0.5);
      }
    });
    canvasEl.addEventListener('mouseup', (e) => {
      const c = scaleCoord(e.offsetX, e.offsetY);
      this.onPointerUp(c.x, c.y);
    });
    canvasEl.addEventListener('mouseleave', (e) => {
      if (this.isDrawing) {
        const c = scaleCoord(e.offsetX, e.offsetY);
        this.onPointerUp(c.x, c.y);
      }
    });

    canvasEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvasEl.getBoundingClientRect();
      const scaleX = canvasEl.width / rect.width;
      const scaleY = canvasEl.height / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;
      this.onPointerDown(x, y, touch.force || 0.5);
    }, { passive: false });

    canvasEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvasEl.getBoundingClientRect();
      const scaleX = canvasEl.width / rect.width;
      const scaleY = canvasEl.height / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;
      this.onPointerMove(x, y, touch.force || 0.5);
    }, { passive: false });

    canvasEl.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.pendingCommands.length > 0) {
        const lastCmd = this.pendingCommands[this.pendingCommands.length - 1];
        this.onPointerUp(lastCmd.x, lastCmd.y);
      } else {
        this.onPointerUp(0, 0);
      }
    });

    canvasEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen') {
        const c = scaleCoord(e.offsetX, e.offsetY);
        this.onPointerDown(c.x, c.y, e.pressure);
      }
    });

    canvasEl.addEventListener('pointermove', (e) => {
      if (this.isDrawing && e.pointerType === 'pen') {
        const c = scaleCoord(e.offsetX, e.offsetY);
        this.onPointerMove(c.x, c.y, e.pressure);
      }
    });

    canvasEl.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'pen' && this.isDrawing) {
        const c = scaleCoord(e.offsetX, e.offsetY);
        this.onPointerUp(c.x, c.y);
      }
    });

    canvasEl.style.cursor = 'crosshair';
  }

  private onPointerDown(x: number, y: number, pressure: number): void {
    this.isDrawing = true;
    this.pendingCommands = [];
    this.brush.startStroke(x, y, pressure);
  }

  private onPointerMove(x: number, y: number, pressure: number): void {
    if (!this.isDrawing) return;
    const commands = this.brush.moveStroke(x, y, pressure);
    this.pendingCommands.push(...commands);

    for (const cmd of commands) {
      this.renderer.render(cmd);
    }

    if (commands.length > 0 && commands[0].type === 'stroke') {
      this.ui.updateCurrentWidth(commands[0].width);
    }
  }

  private onPointerUp(x: number, y: number): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const commands = this.brush.endStroke(x, y);
    for (const cmd of commands) {
      this.renderer.render(cmd);
    }
    this.pendingCommands = [];
    this.saveUndoState();
  }

  private bindUICallbacks(): void {
    this.ui.setBrushSizeCallback((size) => {
      this.brush.updateConfig({ baseSize: size });
    });

    this.ui.setInkColorCallback((color, name) => {
      this.brush.updateConfig({ color });
    });

    this.ui.setTextureCallback((texture) => {
      this.brush.updateConfig({ textureType: texture });
      this.renderer.applyTexture(texture);
    });

    this.ui.setUndoCallback(() => this.undo());
    this.ui.setRedoCallback(() => this.redo());
    this.ui.setExportCallback(() => this.ui.showExportModal());
    this.ui.setClearCallback(() => this.clearCanvas());
  }

  private bindExportEvents(): void {
    document.addEventListener('export-confirm', ((e: CustomEvent) => {
      const options: ExportOptions = e.detail;
      this.ui.hideExportModal();
      this.ui.showExportLoading();
      this.exporter.export(options).then(() => {
        this.ui.hideExportLoading();
      });
    }) as EventListener);
  }

  private bindKeyboard(): void {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      }
    });
  }

  private saveUndoState(): void {
    const imageData = this.renderer.getImageData();
    this.undoStack.push(imageData);
    if (this.undoStack.length > MAX_UNDO_STEPS) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.ui.updateUndoState(this.undoStack.length - 1, this.redoStack.length);
  }

  private undo(): void {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.renderer.putImageData(prev);
    this.ui.updateUndoState(this.undoStack.length - 1, this.redoStack.length);
  }

  private redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.renderer.putImageData(next);
    this.ui.updateUndoState(this.undoStack.length - 1, this.redoStack.length);
  }

  private clearCanvas(): void {
    this.renderer.clear();
    this.saveUndoState();
  }
}

const app = new App();
app.init();
