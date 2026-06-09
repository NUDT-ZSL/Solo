import { PixelEngine, KEY_COLORS, RGB } from './pixelEngine';
import { UIManager } from './uiManager';
import './styles.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

class PixelArtApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: PixelEngine;
  private ui: UIManager;
  private mouseX: number = CANVAS_WIDTH / 2;
  private mouseY: number = CANVAS_HEIGHT / 2;
  private animationFrameId: number | null = null;
  private pressedKeys: Set<string> = new Set();
  private isClearing: boolean = false;

  constructor() {
    const canvasEl = document.getElementById('mainCanvas');
    if (!canvasEl) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvasEl as HTMLCanvasElement;

    const ctxEl = this.canvas.getContext('2d');
    if (!ctxEl) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctxEl;

    this.engine = new PixelEngine(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ui = new UIManager();

    this.bindEvents();
    this.startRenderLoop();
    this.ui.updateCounter(this.engine.getPixelCount());
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseenter', (e) => this.handleMouseMove(e));

    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));

    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportBtn = document.getElementById('exportBtn');

    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.handleUndo());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClear());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExport());
    }

    const brushSizeInput = this.ui.getBrushSizeInput();
    brushSizeInput.addEventListener('input', () => {
      const value = parseInt(brushSizeInput.value, 10);
      this.engine.setBrushMultiplier(value);
      this.ui.updateBrushSize(value);
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.handleUndo();
      }
    });
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY = (e.clientY - rect.top) * scaleY;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key.toUpperCase();
    if (!KEY_COLORS[key]) return;
    if (this.pressedKeys.has(key)) return;

    this.pressedKeys.add(key);
    this.placePixel(key);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toUpperCase();
    this.pressedKeys.delete(key);
  }

  private placePixel(key: string): void {
    if (this.isClearing) return;

    const color: RGB = KEY_COLORS[key];
    this.engine.addPixel(this.mouseX, this.mouseY, color);
    this.ui.updatePalette(key);
    this.ui.updateCounter(this.engine.getPixelCount());
  }

  private handleUndo(): void {
    const success = this.engine.undo();
    if (success) {
      this.ui.updateCounter(this.engine.getPixelCount());
      this.ui.showToast('已撤销');
    } else {
      this.ui.showToast('没有可撤销的操作');
    }
  }

  private handleClear(): void {
    if (this.engine.getPixelCount() === 0) {
      this.ui.showToast('画布已经是空的');
      return;
    }

    this.isClearing = true;
    this.ui.playClearAnimation(() => {
      this.engine.clear();
      this.ui.updateCounter(0);
      this.isClearing = false;
      this.ui.showToast('画布已清空');
    });
  }

  private handleExport(): void {
    const startTime = performance.now();
    this.engine.exportPNG(this.canvas);
    const elapsed = performance.now() - startTime;
    this.ui.showToast(`PNG 已导出 (${elapsed.toFixed(0)}ms)`);
  }

  private startRenderLoop(): void {
    const render = () => {
      const now = performance.now();
      this.engine.update(now);
      this.engine.render(this.ctx);
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new PixelArtApp();
    (window as unknown as { pixelArtApp?: PixelArtApp }).pixelArtApp = app;
  } catch (error) {
    console.error('Failed to initialize Pixel Art Generator:', error);
  }
});
