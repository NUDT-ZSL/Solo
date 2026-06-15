import './style.css';
import { BrushEngine, BrushStroke, RenderOp } from './brush';
import { InkEngine } from './ink';
import { UIManager } from './ui';
import { createNoise2D } from 'simplex-noise';

interface GlobalState {
  scrollColor: string;
  isDrawing: boolean;
  isMounted: boolean;
  mountedData: MountedData | null;
}

interface MountedData {
  stampX: number;
  stampY: number;
  stampChar: string;
}

interface UndoStroke {
  stroke: BrushStroke;
  fadeStartTime: number;
  fading: boolean;
}

const MAX_UNDO = 10;
const STAMP_CHARS = ['墨', '韵', '雅', '禅', '道', '书', '真', '悟', '清', '静'];
const noise2D = createNoise2D();

class ScrollApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  private brushEngine: BrushEngine;
  private inkEngine: InkEngine;
  private uiManager: UIManager;

  private state: GlobalState = {
    scrollColor: '#F5E6C8',
    isDrawing: false,
    isMounted: false,
    mountedData: null
  };

  private strokes: BrushStroke[] = [];
  private undoStack: UndoStroke[] = [];
  private currentStroke: BrushStroke | null = null;

  private scrollX = 0;
  private scrollY = 0;
  private scrollW = 800;
  private scrollH = 400;

  private startTime: number = 0;
  private animationId: number = 0;

  private lastInkDropTime: number = 0;
  private inkDropInterval: number = 80;

  constructor() {
    this.canvas = document.getElementById('scrollCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.offscreenCanvas = document.createElement('canvas');
    this.offCtx = this.offscreenCanvas.getContext('2d')!;

    this.brushEngine = new BrushEngine();
    this.inkEngine = new InkEngine();
    this.uiManager = new UIManager();

    this.resizeCanvas();
    this.bindEvents();
    this.uiManager.onChange(state => this.handleUIChange(state));
    this.uiManager.onAction(action => this.handleUIAction(action));

    this.startTime = performance.now();
    this.loop();
  }

  private resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.calculateScrollDimensions();

    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private calculateScrollDimensions() {
    const isMobile = window.innerWidth < 900;
    if (isMobile) {
      const maxW = window.innerWidth - 40;
      this.scrollW = maxW;
      this.scrollH = this.scrollW / 2;
    } else {
      const maxW = Math.min(window.innerWidth - 140, 1200);
      this.scrollW = maxW;
      this.scrollH = this.scrollW / 2;
    }
    this.scrollX = (window.innerWidth - this.scrollW) / 2;
    this.scrollY = (window.innerHeight - this.scrollH) / 2 - 20;
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const isInScroll = (x: number, y: number) => {
      return x >= this.scrollX && x <= this.scrollX + this.scrollW &&
             y >= this.scrollY && y <= this.scrollY + this.scrollH;
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (this.state.isMounted) return;
      const pos = getPos(e);
      if (!isInScroll(pos.x, pos.y)) return;

      this.state.isDrawing = true;
      this.currentStroke = this.brushEngine.startStroke(pos.x, pos.y);
      this.inkEngine.addDiffusion(
        pos.x, pos.y,
        this.currentStroke.brushSize * 0.5,
        this.currentStroke.inkDensity
      );
      this.lastInkDropTime = performance.now();
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!this.state.isDrawing || !this.currentStroke) return;
      const pos = getPos(e);
      if (!isInScroll(pos.x, pos.y)) return;

      const result = this.brushEngine.continueStroke(pos.x, pos.y);
      if (result) {
        this.currentStroke = result.stroke;
        this.renderRenderOps(result.renderOps);

        const now = performance.now();
        if (now - this.lastInkDropTime >= this.inkDropInterval) {
          const lastPoint = this.currentStroke.points[this.currentStroke.points.length - 1];
          this.inkEngine.addDiffusion(
            lastPoint.x, lastPoint.y,
            this.currentStroke.brushSize * lastPoint.pressure * 0.5,
            this.currentStroke.inkDensity
          );
          this.lastInkDropTime = now;
        }
      }
    };

    const onUp = () => {
      if (!this.state.isDrawing) return;
      this.state.isDrawing = false;

      const stroke = this.brushEngine.endStroke();
      if (stroke && stroke.points.length > 0) {
        stroke.completed = true;
        this.strokes.push(stroke);
        this.undoStack.push({ stroke, fadeStartTime: 0, fading: false });

        if (this.undoStack.length > MAX_UNDO) {
          this.undoStack.shift();
        }

        this.uiManager.updateStrokeCount(this.strokes.length);
      }
      this.currentStroke = null;
    };

    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('mouseleave', onUp);

    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onUp);
  }

  private renderRenderOps(ops: RenderOp[]) {
    this.ctx.save();
    for (const op of ops) {
      this.ctx.beginPath();
      this.ctx.arc(op.x, op.y, op.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.hexToRgba(op.color, op.alpha);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private handleUIChange(state: { brushSize?: number; inkDensity?: number; scrollColor?: string }) {
    if (state.brushSize !== undefined) {
      this.brushEngine.setBrushSize(state.brushSize);
    }
    if (state.inkDensity !== undefined) {
      this.brushEngine.setInkDensity(state.inkDensity);
    }
    if (state.scrollColor !== undefined) {
      this.state.scrollColor = state.scrollColor;
    }
  }

  private handleUIAction(action: 'undo' | 'mount') {
    if (action === 'undo') {
      this.undoLastStroke();
    } else if (action === 'mount') {
      this.toggleMount();
    }
  }

  private undoLastStroke() {
    if (this.undoStack.length === 0) return;

    const undoItem = this.undoStack.pop()!;
    undoItem.fading = true;
    undoItem.fadeStartTime = performance.now();

    setTimeout(() => {
      const idx = this.strokes.indexOf(undoItem.stroke);
      if (idx > -1) {
        this.strokes.splice(idx, 1);
        this.uiManager.updateStrokeCount(this.strokes.length);
      }
    }, 300);

    this.uiManager.updateStrokeCount(this.strokes.length - 1);
  }

  private toggleMount() {
    if (this.state.isMounted) {
      this.state.isMounted = false;
      this.state.mountedData = null;
    } else {
      this.state.isMounted = true;
      this.state.mountedData = {
        stampX: this.scrollX + 60 + Math.random() * 40,
        stampY: this.scrollY + this.scrollH - 60 - Math.random() * 30,
        stampChar: STAMP_CHARS[Math.floor(Math.random() * STAMP_CHARS.length)]
      };
    }
  }

  private loop = () => {
    const now = performance.now();

    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    this.drawBackground();
    this.drawScroll();

    this.inkEngine.update(now);
    this.inkEngine.render(this.ctx);

    this.drawStrokes(now);

    if (this.currentStroke) {
      this.brushEngine.renderStroke(this.ctx, this.currentStroke, 1);
    }

    if (this.state.isMounted && this.state.mountedData) {
      this.drawMountFrame();
      this.drawStamp(this.state.mountedData);
    }

    const elapsed = (now - this.startTime) / 1000;
    this.uiManager.updateTimer(elapsed);

    this.inkEngine.cleanupCompleted();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private drawStrokes(now: number) {
    for (let i = this.undoStack.length - 1; i >= 0; i--) {
      const item = this.undoStack[i];
      let alpha = 1;
      if (item.fading) {
        const fadeProgress = (now - item.fadeStartTime) / 300;
        alpha = Math.max(0, 1 - fadeProgress);
      }
      this.brushEngine.renderStroke(this.ctx, item.stroke, alpha);
    }
  }

  private drawBackground() {
    this.ctx.fillStyle = '#2a1810';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  private drawScroll() {
    const ctx = this.ctx;
    const { scrollX: x, scrollY: y, scrollW: w, scrollH: h } = this;
    const rodW = 30;

    ctx.save();

    const leftRodGrad = ctx.createLinearGradient(x - rodW, y, x, y);
    leftRodGrad.addColorStop(0, '#2A1810');
    leftRodGrad.addColorStop(0.3, '#4A2C1A');
    leftRodGrad.addColorStop(0.7, '#6B3A22');
    leftRodGrad.addColorStop(1, '#3A2015');
    ctx.fillStyle = leftRodGrad;
    ctx.fillRect(x - rodW, y - 15, rodW, h + 30);

    const rightRodGrad = ctx.createLinearGradient(x + w, y, x + w + rodW, y);
    rightRodGrad.addColorStop(0, '#3A2015');
    rightRodGrad.addColorStop(0.3, '#6B3A22');
    rightRodGrad.addColorStop(0.7, '#4A2C1A');
    rightRodGrad.addColorStop(1, '#2A1810');
    ctx.fillStyle = rightRodGrad;
    ctx.fillRect(x + w, y - 15, rodW, h + 30);

    ctx.fillStyle = this.state.scrollColor;
    ctx.fillRect(x, y, w, h);

    this.drawPaperTexture(x, y, w, h);

    const topShadow = ctx.createLinearGradient(x, y, x, y + 20);
    topShadow.addColorStop(0, 'rgba(0,0,0,0.25)');
    topShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(x, y, w, 20);

    const bottomShadow = ctx.createLinearGradient(x, y + h - 20, x, y + h);
    bottomShadow.addColorStop(0, 'rgba(0,0,0,0)');
    bottomShadow.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = bottomShadow;
    ctx.fillRect(x, y + h - 20, w, 20);

    ctx.strokeStyle = 'rgba(74, 44, 26, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    ctx.restore();
  }

  private drawPaperTexture(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    const step = 6;
    ctx.save();
    ctx.globalAlpha = 0.06;

    for (let px = 0; px < w; px += step) {
      for (let py = 0; py < h; py += step) {
        const noiseVal = noise2D((x + px) * 0.05, (y + py) * 0.05);
        if (noiseVal > 0.3) {
          const fiberLen = 8 + Math.random() * 16;
          const angle = Math.random() * Math.PI;
          ctx.strokeStyle = '#8B7355';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          const startX = x + px;
          const startY = y + py;
          ctx.moveTo(startX, startY);
          ctx.lineTo(
            startX + Math.cos(angle) * fiberLen,
            startY + Math.sin(angle) * fiberLen
          );
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  private drawMountFrame() {
    const ctx = this.ctx;
    const { scrollX: x, scrollY: y, scrollW: w, scrollH: h } = this;
    const frameW = 18;

    ctx.save();

    const frameGrad = ctx.createLinearGradient(x - frameW, y - frameW, x + w + frameW, y + h + frameW);
    frameGrad.addColorStop(0, '#B8964A');
    frameGrad.addColorStop(0.5, '#D4B97A');
    frameGrad.addColorStop(1, '#A8823C');
    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = frameW;
    ctx.strokeRect(x - frameW / 2, y - frameW / 2, w + frameW, h + frameW);

    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - frameW + 2, y - frameW + 2, w + frameW * 2 - 4, h + frameW * 2 - 4);

    ctx.strokeStyle = 'rgba(255, 240, 200, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - frameW + 4, y - frameW + 4, w + frameW * 2 - 8, h + frameW * 2 - 8);

    ctx.restore();
  }

  private drawStamp(data: MountedData) {
    const ctx = this.ctx;
    const stampW = 40;
    const stampH = 50;
    const x = data.stampX;
    const y = data.stampY;

    ctx.save();

    ctx.fillStyle = 'rgba(212, 0, 0, 0.6)';
    const jitter = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + jitter, y);
    ctx.lineTo(x + stampW - jitter, y + jitter * 0.5);
    ctx.lineTo(x + stampW, y + stampH - jitter);
    ctx.lineTo(x + jitter * 0.5, y + stampH);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    for (let i = 0; i < 40; i++) {
      const px = x + Math.random() * stampW;
      const py = y + Math.random() * stampH;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 220, 220, 0.9)';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.stampChar, x + stampW / 2, y + stampH / 2 - 2);

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ScrollApp();
});
