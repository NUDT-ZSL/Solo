import './styles.css';
import { Palette, BASE_COLORS, type RGBA } from './palette';
import { Brush, type BrushShape, type StrokePoint } from './brush';

interface FadingStroke {
  canvas: HTMLCanvasElement;
  startTime: number;
  duration: number;
  initialAlpha: number;
}

class App {
  private palette: Palette;
  private brush: Brush;

  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private displayCanvas: HTMLCanvasElement;
  private displayCtx: CanvasRenderingContext2D;
  private brushPreviewCanvas: HTMLCanvasElement;
  private brushPreviewCtx: CanvasRenderingContext2D;

  private paperCanvas: HTMLCanvasElement;

  private isDrawing: boolean;
  private lastPoint: StrokePoint | null;
  private currentStrokeCanvas: HTMLCanvasElement | null;
  private currentStrokeCtx: CanvasRenderingContext2D | null;

  private undoStack: HTMLCanvasElement[];
  private readonly MAX_UNDO = 5;

  private committedCanvas: HTMLCanvasElement;
  private committedCtx: CanvasRenderingContext2D;

  private fadingStrokes: FadingStroke[];
  private animationFrameId: number | null;

  private eyedropperActive: boolean;
  private rafPending: boolean;

  constructor() {
    this.palette = new Palette();
    this.brush = new Brush();

    this.displayCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    const displayCtx = this.displayCanvas.getContext('2d');
    if (!displayCtx) throw new Error('无法获取画布上下文');
    this.displayCtx = displayCtx;

    this.mainCanvas = document.createElement('canvas');
    this.mainCanvas.width = this.displayCanvas.width;
    this.mainCanvas.height = this.displayCanvas.height;
    const mainCtx = this.mainCanvas.getContext('2d');
    if (!mainCtx) throw new Error('无法获取主画布上下文');
    this.mainCtx = mainCtx;

    this.paperCanvas = document.createElement('canvas');
    this.paperCanvas.width = this.displayCanvas.width;
    this.paperCanvas.height = this.displayCanvas.height;

    this.committedCanvas = document.createElement('canvas');
    this.committedCanvas.width = this.displayCanvas.width;
    this.committedCanvas.height = this.displayCanvas.height;
    const committedCtx = this.committedCanvas.getContext('2d');
    if (!committedCtx) throw new Error('无法获取提交画布上下文');
    this.committedCtx = committedCtx;

    this.brushPreviewCanvas = document.getElementById('brushPreview') as HTMLCanvasElement;
    const previewCtx = this.brushPreviewCanvas.getContext('2d');
    if (!previewCtx) throw new Error('无法获取预览画布上下文');
    this.brushPreviewCtx = previewCtx;

    this.isDrawing = false;
    this.lastPoint = null;
    this.currentStrokeCanvas = null;
    this.currentStrokeCtx = null;
    this.undoStack = [];
    this.fadingStrokes = [];
    this.animationFrameId = null;
    this.eyedropperActive = false;
    this.rafPending = false;

    this._init();
  }

  private _init(): void {
    this._renderPaperBackground();
    this._resetCommitted();
    this._renderColorGrid();
    this._bindPaletteEvents();
    this._bindToolbarEvents();
    this._bindCanvasEvents();
    this._bindKeyboardEvents();
    this._updateUI();
    this._scheduleRender();
  }

  private _renderPaperBackground(): void {
    const pctx = this.paperCanvas.getContext('2d')!;
    this.brush.drawPaperBackground(pctx, this.paperCanvas.width, this.paperCanvas.height);
  }

  private _resetCommitted(): void {
    this.committedCtx.clearRect(
      0,
      0,
      this.committedCanvas.width,
      this.committedCanvas.height,
    );
  }

  private _renderColorGrid(): void {
    const grid = document.getElementById('colorGrid') as HTMLDivElement;
    grid.innerHTML = '';
    BASE_COLORS.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      if (index === this.palette.activeBaseIndex) {
        swatch.classList.add('active');
      }
      swatch.style.backgroundColor = color.hex;
      swatch.dataset.index = String(index);

      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.textContent = `${color.name} ${color.hex}`;
      swatch.appendChild(tooltip);

      swatch.addEventListener('click', () => {
        this.palette.selectBaseColor(index);
      });
      grid.appendChild(swatch);
    });
  }

  private _updateActiveSwatchHighlight(): void {
    const swatches = document.querySelectorAll<HTMLDivElement>('.color-swatch');
    swatches.forEach((el, i) => {
      el.classList.toggle('active', i === this.palette.activeBaseIndex);
    });
  }

  private _bindPaletteEvents(): void {
    const rSlider = document.getElementById('rSlider') as HTMLInputElement;
    const gSlider = document.getElementById('gSlider') as HTMLInputElement;
    const bSlider = document.getElementById('bSlider') as HTMLInputElement;
    const aSlider = document.getElementById('aSlider') as HTMLInputElement;

    rSlider.addEventListener('input', (e) => {
      this.palette.setR(parseInt((e.target as HTMLInputElement).value, 10));
    });
    gSlider.addEventListener('input', (e) => {
      this.palette.setG(parseInt((e.target as HTMLInputElement).value, 10));
    });
    bSlider.addEventListener('input', (e) => {
      this.palette.setB(parseInt((e.target as HTMLInputElement).value, 10));
    });
    aSlider.addEventListener('input', (e) => {
      this.palette.setAlpha(parseInt((e.target as HTMLInputElement).value, 10) / 100);
    });

    this.palette.onChange(() => this._updateUI());
  }

  private _bindToolbarEvents(): void {
    const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    const eyedropperBtn = document.getElementById('eyedropperBtn') as HTMLButtonElement;
    const brushSizeSlider = document.getElementById('brushSizeSlider') as HTMLInputElement;

    undoBtn.addEventListener('click', () => this._undo());
    clearBtn.addEventListener('click', () => this._clearCanvas());
    exportBtn.addEventListener('click', () => this._exportPNG());
    eyedropperBtn.addEventListener('click', () => this._toggleEyedropper());

    brushSizeSlider.addEventListener('input', (e) => {
      const size = parseInt((e.target as HTMLInputElement).value, 10);
      this.brush.setParams({ diameter: size });
      (document.getElementById('brushSizeLabel') as HTMLSpanElement).textContent = String(size);
      this._renderBrushPreview();
    });

    const shapeBtns = document.querySelectorAll<HTMLButtonElement>('.shape-btn');
    shapeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        shapeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const shape = btn.dataset.shape as BrushShape;
        this.brush.setParams({ shape });
        this._renderBrushPreview();
      });
    });
  }

  private _toggleEyedropper(): void {
    this.eyedropperActive = !this.eyedropperActive;
    this.displayCanvas.classList.toggle('eyedropper', this.eyedropperActive);
    (document.getElementById('eyedropperBtn') as HTMLButtonElement).classList.toggle(
      'active',
      this.eyedropperActive,
    );
  }

  private _bindCanvasEvents(): void {
    this.displayCanvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    window.addEventListener('mouseup', () => this._onMouseUp());
    this.displayCanvas.addEventListener('mouseleave', () => {
      if (this.isDrawing) this._onMouseUp();
    });
  }

  private _bindKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this._undo();
      }
      if (e.key.toLowerCase() === 'i' && !this._isInputTarget(e)) {
        e.preventDefault();
        this._toggleEyedropper();
      }
    });
  }

  private _isInputTarget(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement;
    return (
      t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.isContentEditable
    );
  }

  private _getCanvasPoint(e: MouseEvent): { x: number; y: number } {
    const rect = this.displayCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.displayCanvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.displayCanvas.height / rect.height),
    };
  }

  private _onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const pt = this._getCanvasPoint(e);

    if (this.eyedropperActive) {
      this._pickColor(pt.x, pt.y);
      return;
    }

    this.isDrawing = true;
    const now = performance.now();
    this.lastPoint = { x: pt.x, y: pt.y, speed: 0, timestamp: now };

    this.currentStrokeCanvas = document.createElement('canvas');
    this.currentStrokeCanvas.width = this.displayCanvas.width;
    this.currentStrokeCanvas.height = this.displayCanvas.height;
    const sctx = this.currentStrokeCanvas.getContext('2d');
    if (!sctx) return;
    this.currentStrokeCtx = sctx;

    this._scheduleRender();
  }

  private _onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const pt = this._getCanvasPoint(e);
    const now = performance.now();

    if (!this.lastPoint || !this.currentStrokeCtx) return;

    const dx = pt.x - this.lastPoint.x;
    const dy = pt.y - this.lastPoint.y;
    const dt = Math.max(1, now - this.lastPoint.timestamp);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = (dist / dt) * 1000;

    const newPoint: StrokePoint = {
      x: pt.x,
      y: pt.y,
      speed,
      timestamp: now,
    };

    const color = this.palette.currentColor;
    this.brush.drawSegment(this.currentStrokeCtx, this.lastPoint, newPoint, color);

    this.lastPoint = newPoint;
    this._scheduleRender();
  }

  private _onMouseUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentStrokeCanvas) {
      const strokeSnapshot = document.createElement('canvas');
      strokeSnapshot.width = this.currentStrokeCanvas.width;
      strokeSnapshot.height = this.currentStrokeCanvas.height;
      const ssCtx = strokeSnapshot.getContext('2d')!;
      ssCtx.drawImage(this.currentStrokeCanvas, 0, 0);

      const initialAlpha = this.palette.currentColor.a;
      this.fadingStrokes.push({
        canvas: strokeSnapshot,
        startTime: performance.now(),
        duration: 1000,
        initialAlpha,
      });
      this._pushUndo();
    }

    this.currentStrokeCanvas = null;
    this.currentStrokeCtx = null;
    this.lastPoint = null;
    this._scheduleRender();
  }

  private _pushUndo(): void {
    const snapshot = document.createElement('canvas');
    snapshot.width = this.committedCanvas.width;
    snapshot.height = this.committedCanvas.height;
    const sctx = snapshot.getContext('2d')!;
    sctx.drawImage(this.committedCanvas, 0, 0);
    if (this.undoStack.length >= this.MAX_UNDO) {
      this.undoStack.shift();
    }
    this.undoStack.push(snapshot);
  }

  private _undo(): void {
    const prev = this.undoStack.pop();
    this.fadingStrokes = [];
    this._resetCommitted();
    if (prev) {
      this.committedCtx.drawImage(prev, 0, 0);
    }
    this._scheduleRender();
  }

  private _clearCanvas(): void {
    this._pushUndo();
    this.fadingStrokes = [];
    this._resetCommitted();
    this._scheduleRender();
  }

  private _pickColor(x: number, y: number): void {
    this._composeTo(this.mainCanvas);
    const data = this.mainCtx.getImageData(
      Math.floor(x),
      Math.floor(y),
      1,
      1,
    ).data;
    const rgba: RGBA = {
      r: data[0],
      g: data[1],
      b: data[2],
      a: 1,
    };
    this.palette.setFromRGBA(rgba);
    this._toggleEyedropper();
  }

  private _composeTo(target: HTMLCanvasElement): void {
    const tctx = target.getContext('2d')!;
    tctx.clearRect(0, 0, target.width, target.height);
    tctx.drawImage(this.paperCanvas, 0, 0);
    tctx.save();
    tctx.globalCompositeOperation = 'multiply';
    tctx.drawImage(this.committedCanvas, 0, 0);
    for (const fs of this.fadingStrokes) {
      tctx.drawImage(fs.canvas, 0, 0);
    }
    if (this.currentStrokeCanvas) {
      tctx.drawImage(this.currentStrokeCanvas, 0, 0);
    }
    tctx.restore();
  }

  private _exportPNG(): void {
    this._composeTo(this.mainCanvas);
    const url = this.mainCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `watercolor-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private _scheduleRender(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    const frame = () => {
      this.rafPending = false;
      this._render();
    };
    if (this.animationFrameId === null) {
      this._tickLoop();
    }
    requestAnimationFrame(frame);
  }

  private _tickLoop(): void {
    const tick = () => {
      this.animationFrameId = requestAnimationFrame(tick);
      let needRender = false;
      if (this.fadingStrokes.length > 0) {
        const now = performance.now();
        const remaining: FadingStroke[] = [];
        for (const fs of this.fadingStrokes) {
          const elapsed = now - fs.startTime;
          if (elapsed >= fs.duration) {
            this.committedCtx.save();
            this.committedCtx.drawImage(fs.canvas, 0, 0);
            this.committedCtx.restore();
          } else {
            remaining.push(fs);
          }
        }
        if (remaining.length !== this.fadingStrokes.length) {
          this.fadingStrokes = remaining;
          needRender = true;
        } else if (this.fadingStrokes.length > 0) {
          needRender = true;
        }
      }
      if (needRender) {
        this._render();
      }
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  private _render(): void {
    this.displayCtx.clearRect(
      0,
      0,
      this.displayCanvas.width,
      this.displayCanvas.height,
    );
    this.displayCtx.drawImage(this.paperCanvas, 0, 0);

    this.displayCtx.save();
    this.displayCtx.globalCompositeOperation = 'multiply';
    this.displayCtx.drawImage(this.committedCanvas, 0, 0);

    const now = performance.now();
    for (const fs of this.fadingStrokes) {
      const elapsed = now - fs.startTime;
      const progress = Math.min(1, elapsed / fs.duration);
      const alpha = 1 - progress;
      if (alpha <= 0) continue;
      this.displayCtx.save();
      this.displayCtx.globalAlpha = alpha;
      this.displayCtx.drawImage(fs.canvas, 0, 0);
      this.displayCtx.restore();
    }

    if (this.currentStrokeCanvas) {
      this.displayCtx.drawImage(this.currentStrokeCanvas, 0, 0);
    }
    this.displayCtx.restore();
  }

  private _updateUI(): void {
    const color = this.palette.currentColor;

    (document.getElementById('rSlider') as HTMLInputElement).value = String(color.r);
    (document.getElementById('gSlider') as HTMLInputElement).value = String(color.g);
    (document.getElementById('bSlider') as HTMLInputElement).value = String(color.b);
    (document.getElementById('aSlider') as HTMLInputElement).value = String(Math.round(color.a * 100));

    (document.getElementById('rValue') as HTMLSpanElement).textContent = String(color.r);
    (document.getElementById('gValue') as HTMLSpanElement).textContent = String(color.g);
    (document.getElementById('bValue') as HTMLSpanElement).textContent = String(color.b);
    (document.getElementById('aValue') as HTMLSpanElement).textContent = color.a.toFixed(2);

    const preview = document.getElementById('colorPreview') as HTMLDivElement;
    preview.style.backgroundColor = this.palette.getCssColor();

    this.brush.setParams({ opacity: color.a });
    this._updateActiveSwatchHighlight();
    this._renderBrushPreview();
  }

  private _renderBrushPreview(): void {
    this.brush.renderPreview(
      this.brushPreviewCtx,
      this.palette.currentColor,
      this.brushPreviewCanvas.width,
      this.brushPreviewCanvas.height,
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
