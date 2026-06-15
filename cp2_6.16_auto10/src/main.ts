import { StrokeManager, type StrokeType, type Point } from './StrokeManager';
import { Renderer } from './Renderer';
import { ExportTool } from './ExportTool';

class App {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private strokeManager: StrokeManager;

  private currentStrokeType: StrokeType = 'pen';
  private currentColor: string = '#222222';
  private currentThickness: number = 4;

  private isDrawing: boolean = false;
  private currentPoints: Point[] = [];
  private lastPointTime: number = 0;
  private minPointInterval: number = 5;
  private maxPointsPerFrame: number = 16;
  private framePoints: Point[] = [];

  private animationFrameId: number | null = null;
  private lastFpsUpdateTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private showFps: boolean = true;
  private fpsDisplay: HTMLDivElement | null = null;

  private strokeButtons: NodeListOf<HTMLButtonElement>;
  private colorSwatches: NodeListOf<HTMLDivElement>;
  private thicknessSlider: HTMLInputElement;
  private thicknessValue: HTMLSpanElement;
  private undoBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.renderer = new Renderer(this.canvas);
    this.strokeManager = new StrokeManager();

    this.strokeButtons = document.querySelectorAll('.stroke-btn');
    this.colorSwatches = document.querySelectorAll('.color-swatch');
    this.thicknessSlider = document.getElementById('thickness') as HTMLInputElement;
    this.thicknessValue = document.getElementById('thickness-value') as HTMLSpanElement;
    this.undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    this.renderer.clear();
    this.bindEvents();
    this.updateButtonStates();

    window.addEventListener('resize', () => this.handleResize());

    if (this.showFps) {
      this.createFpsDisplay();
      this.startFpsCounter();
      this.startFpsUpdateLoop();
    }
  }

  private startFpsUpdateLoop(): void {
    const update = (timestamp: number) => {
      this.updateFps(timestamp);
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  private createFpsDisplay(): void {
    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.style.position = 'fixed';
    this.fpsDisplay.style.top = '70px';
    this.fpsDisplay.style.right = '16px';
    this.fpsDisplay.style.fontSize = '12px';
    this.fpsDisplay.style.color = '#999';
    this.fpsDisplay.style.fontFamily = 'monospace';
    this.fpsDisplay.style.pointerEvents = 'none';
    this.fpsDisplay.style.zIndex = '1000';
    this.fpsDisplay.textContent = 'FPS: 0';
    document.body.appendChild(this.fpsDisplay);
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.renderer.resize(rect.width * dpr, rect.height * dpr);

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    this.renderer.clear();
    this.redrawAllStrokes();
  }

  private handleResize(): void {
    const strokes = this.strokeManager.getStrokes();
    this.resizeCanvas();
    this.renderer.redrawAll(strokes, false);
  }

  private bindEvents(): void {
    this.strokeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        this.addClickAnimation(target);
        const strokeType = target.dataset.stroke as StrokeType;
        if (strokeType) {
          this.setStrokeType(strokeType);
        }
      });
    });

    this.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLDivElement;
        this.addClickAnimation(target);
        const color = target.dataset.color;
        if (color) {
          this.setColor(color);
        }
      });
    });

    this.thicknessSlider.addEventListener('input', () => {
      this.currentThickness = parseInt(this.thicknessSlider.value, 10);
      this.thicknessValue.textContent = this.currentThickness.toString();
    });

    this.undoBtn.addEventListener('click', () => {
      this.addClickAnimation(this.undoBtn);
      this.undo();
    });

    this.clearBtn.addEventListener('click', () => {
      this.addClickAnimation(this.clearBtn);
      this.clear();
    });

    this.exportBtn.addEventListener('click', () => {
      this.addClickAnimation(this.exportBtn);
      this.export();
    });

    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', () => this.handlePointerUp());
    this.canvas.addEventListener('mouseleave', () => this.handlePointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handlePointerDown(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handlePointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handlePointerUp();
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.handlePointerUp();
    }, { passive: false });
  }

  private addClickAnimation(element: HTMLElement): void {
    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 0.1s ease';

    setTimeout(() => {
      element.style.transform = '';
    }, 100);
  }

  private getCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private handlePointerDown(clientX: number, clientY: number): void {
    const { x, y } = this.getCanvasCoordinates(clientX, clientY);
    this.isDrawing = true;
    this.currentPoints = [];
    this.framePoints = [];
    this.lastPointTime = performance.now();

    const point: Point = { x, y, timestamp: this.lastPointTime };
    this.currentPoints.push(point);
    this.framePoints.push(point);
  }

  private handlePointerMove(clientX: number, clientY: number): void {
    if (!this.isDrawing) return;

    const now = performance.now();
    if (now - this.lastPointTime < this.minPointInterval) return;

    const { x, y } = this.getCanvasCoordinates(clientX, clientY);
    const point: Point = { x, y, timestamp: now };
    
    this.currentPoints.push(point);
    this.framePoints.push(point);
    this.lastPointTime = now;

    if (this.framePoints.length >= this.maxPointsPerFrame) {
      this.flushFramePoints();
    }

    this.scheduleRender();
  }

  private flushFramePoints(): void {
    if (this.framePoints.length === 0) return;
    this.framePoints = [];
  }

  private scheduleRender(): void {
    if (this.animationFrameId !== null) return;

    this.animationFrameId = requestAnimationFrame((timestamp) => {
      this.animationFrameId = null;

      if (this.currentPoints.length > 1) {
        this.renderer.drawPreview(
          this.currentPoints,
          this.currentStrokeType,
          this.currentColor,
          this.currentThickness,
          this.strokeManager.getStrokes()
        );
      }

      this.framePoints = [];
    });
  }

  private handlePointerUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentPoints.length > 1) {
      this.strokeManager.addStroke({
        type: this.currentStrokeType,
        color: this.currentColor,
        thickness: this.currentThickness,
        points: [...this.currentPoints]
      });
      this.updateButtonStates();
    }

    this.currentPoints = [];
    this.framePoints = [];
    this.renderer.clearPendingPoints();
  }

  private setStrokeType(type: StrokeType): void {
    this.currentStrokeType = type;
    this.strokeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.stroke === type);
    });
  }

  private setColor(color: string): void {
    this.currentColor = color;
    this.colorSwatches.forEach(swatch => {
      swatch.classList.toggle('selected', swatch.dataset.color === color);
    });
  }

  private async undo(): Promise<void> {
    if (!this.strokeManager.canUndo()) return;

    const removedStroke = this.strokeManager.undo();
    const remainingStrokes = this.strokeManager.getStrokes();

    if (!removedStroke) return;

    const duration = 150;
    const startTime = performance.now();
    const totalPoints = removedStroke.points.length;

    this.renderer.redrawAll(remainingStrokes, false);

    const animateUndo = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const pointsToRemove = Math.floor(totalPoints * progress);
      const pointsToRender = Math.max(0, totalPoints - pointsToRemove);

      const ctx = this.renderer.getMainContext();
      ctx.fillStyle = '#ece8df';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.renderer.getOffscreenCanvas(), 0, 0);

      if (pointsToRender > 1) {
        const partialStroke = {
          ...removedStroke,
          points: removedStroke.points.slice(0, pointsToRender)
        };
        this.renderer.drawStroke(partialStroke, false);
      }

      if (progress < 1) {
        requestAnimationFrame(animateUndo);
      } else {
        this.renderer.redrawAll(remainingStrokes, false);
      }
    };

    requestAnimationFrame(animateUndo);
    this.updateButtonStates();
  }

  private clear(): void {
    if (this.strokeManager.getStrokeCount() === 0) return;

    const strokes = this.strokeManager.getStrokes();
    const duration = 150;
    const startTime = performance.now();
    const totalStrokes = strokes.length;

    const animateClear = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const strokesToRemove = Math.floor(totalStrokes * progress);
      const strokesToRender = totalStrokes - strokesToRemove;

      this.renderer.clear();
      for (let i = 0; i < strokesToRender; i++) {
        this.renderer.drawStroke(strokes[i], false);
      }

      if (progress < 1) {
        requestAnimationFrame(animateClear);
      } else {
        this.strokeManager.clear();
        this.renderer.clear();
        this.updateButtonStates();
      }
    };

    requestAnimationFrame(animateClear);
  }

  private export(): void {
    ExportTool.exportToPNG(this.canvas);
  }

  private updateButtonStates(): void {
    const canUndo = this.strokeManager.canUndo();
    this.undoBtn.disabled = !canUndo;
    this.clearBtn.disabled = !canUndo;
  }

  private async redrawAllStrokes(): Promise<void> {
    const strokes = this.strokeManager.getStrokes();
    await this.renderer.redrawAll(strokes, false);
  }

  private startFpsCounter(): void {
    setInterval(() => {
      console.log(`FPS: ${this.fps}`);
    }, 1000);
  }

  private updateFps(timestamp: number): void {
    this.frameCount++;
    if (this.lastFpsUpdateTime === 0) {
      this.lastFpsUpdateTime = timestamp;
      return;
    }
    
    const elapsed = timestamp - this.lastFpsUpdateTime;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdateTime = timestamp;
      
      if (this.fpsDisplay) {
        const color = this.fps >= 45 ? '#4CAF50' : this.fps >= 30 ? '#FF9800' : '#F44336';
        this.fpsDisplay.style.color = color;
        this.fpsDisplay.textContent = `FPS: ${this.fps}`;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
