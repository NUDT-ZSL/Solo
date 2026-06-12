import type { Point, DrawStroke, StickyNote, CanvasElement } from './types';

export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CanvasCallbacks {
  onStrokeComplete: (stroke: Omit<DrawStroke, 'id' | 'timestamp' | 'roomId'>) => void;
  onCanvasClick: (worldPoint: Point, screenPoint: Point) => void;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CanvasState = { scale: 1, offsetX: 0, offsetY: 0 };
  private strokes: DrawStroke[] = [];
  private currentStroke: DrawStroke | null = null;
  private isDrawing = false;
  private isPanning = false;
  private lastPanPoint: Point = { x: 0, y: 0 };
  private callbacks: CanvasCallbacks;
  private animationFrameId: number | null = null;
  private brushColor = '#3b82f6';
  private brushWidth = 3;
  private isEraser = false;
  private showFPS = false;
  private frameCount = 0;
  private lastFPSUpdate = performance.now();
  private currentFPS = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: CanvasCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.bindEvents();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.requestRender();
  };

  private bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('click', this.onClick);
  }

  public destroy() {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('click', this.onClick);
    window.removeEventListener('resize', this.resize);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private screenToWorld(sx: number, sy: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const x = (sx - rect.left - this.state.offsetX) / this.state.scale;
    const y = (sy - rect.top - this.state.offsetY) / this.state.scale;
    return { x, y };
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    this.isDrawing = true;
    const worldPoint = this.screenToWorld(e.clientX, e.clientY);
    this.currentStroke = {
      id: '',
      type: 'stroke',
      points: [worldPoint],
      color: this.isEraser ? 'transparent' : this.brushColor,
      width: this.brushWidth * this.state.scale,
      userId: '',
      roomId: '',
      timestamp: Date.now()
    };
    this.canvas.style.cursor = 'crosshair';
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isPanning) {
      const dx = e.clientX - this.lastPanPoint.x;
      const dy = e.clientY - this.lastPanPoint.y;
      this.state.offsetX += dx;
      this.state.offsetY += dy;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.requestRender();
      return;
    }

    if (this.isDrawing && this.currentStroke) {
      const worldPoint = this.screenToWorld(e.clientX, e.clientY);
      this.currentStroke.points.push(worldPoint);
      this.requestRender();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
      return;
    }

    if (this.isDrawing && this.currentStroke) {
      this.isDrawing = false;
      if (this.currentStroke.points.length > 1) {
        const worldStroke: DrawStroke = {
          ...this.currentStroke,
          width: this.brushWidth,
          points: [...this.currentStroke.points]
        };
        this.strokes.push(worldStroke);
        this.callbacks.onStrokeComplete({
          points: worldStroke.points,
          color: worldStroke.color,
          width: worldStroke.width,
          userId: worldStroke.userId,
          type: 'stroke'
        });
      }
      this.currentStroke = null;
      this.canvas.style.cursor = 'default';
      this.requestRender();
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldScale = this.state.scale;
    const newScale = Math.max(0.5, Math.min(3, oldScale + delta));
    if (newScale === oldScale) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.state.offsetX = mouseX - (mouseX - this.state.offsetX) * (newScale / oldScale);
    this.state.offsetY = mouseY - (mouseY - this.state.offsetY) * (newScale / oldScale);
    this.state.scale = newScale;
    this.requestRender();
  };

  private onClick = (e: MouseEvent) => {
    if (this.isDrawing || this.isPanning) return;
    if (e.button !== 0) return;
    const worldPoint = this.screenToWorld(e.clientX, e.clientY);
    this.callbacks.onCanvasClick(worldPoint, { x: e.clientX, y: e.clientY });
  };

  public setBrushColor(color: string) {
    this.brushColor = color;
    this.isEraser = false;
  }

  public setBrushWidth(width: number) {
    this.brushWidth = Math.max(1, Math.min(8, width));
  }

  public setEraser() {
    this.isEraser = true;
  }

  public getState(): CanvasState {
    return { ...this.state };
  }

  public worldToScreen(wx: number, wy: number): Point {
    return {
      x: wx * this.state.scale + this.state.offsetX,
      y: wy * this.state.scale + this.state.offsetY
    };
  }

  public addStroke(stroke: DrawStroke) {
    this.strokes.push(stroke);
    this.requestRender();
  }

  public setStrokes(strokes: DrawStroke[]) {
    this.strokes = strokes;
    this.requestRender();
  }

  public clearAll() {
    this.strokes = [];
    this.requestRender();
  }

  public setShowFPS(show: boolean) {
    this.showFPS = show;
  }

  private requestRender() {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.render);
    }
  }

  public forceRender() {
    this.requestRender();
  }

  private render = () => {
    this.animationFrameId = null;
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFPSUpdate >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = now;
    }

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const { scale, offsetX, offsetY } = this.state;

    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, w, h);

    this.drawGrid(w, h, scale, offsetX, offsetY);

    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);

    for (const stroke of this.strokes) {
      this.drawStroke(stroke);
    }

    if (this.currentStroke) {
      this.drawStroke(this.currentStroke);
    }

    this.ctx.restore();

    if (this.showFPS) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(8, 8, 80, 28);
      this.ctx.fillStyle = '#22c55e';
      this.ctx.font = '14px monospace';
      this.ctx.fillText(`FPS: ${this.currentFPS}`, 16, 28);
    }
  };

  private drawGrid(w: number, h: number, scale: number, offsetX: number, offsetY: number) {
    const gridSize = 40 * scale;
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 1;

    const startX = offsetX % gridSize;
    const startY = offsetY % gridSize;

    this.ctx.beginPath();
    for (let x = startX; x < w; x += gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
    }
    for (let y = startY; y < h; y += gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
    }
    this.ctx.stroke();
  }

  private drawStroke(stroke: DrawStroke) {
    const pts = stroke.points;
    if (pts.length === 0) return;

    if (stroke.color === 'transparent') {
      this.ctx.globalCompositeOperation = 'destination-out';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
    }

    this.ctx.strokeStyle = stroke.color === 'transparent' ? '#ffffff' : stroke.color;
    this.ctx.fillStyle = stroke.color === 'transparent' ? '#ffffff' : stroke.color;
    this.ctx.lineWidth = stroke.width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (pts.length === 1) {
      if (stroke.color === 'transparent') {
        this.ctx.globalCompositeOperation = 'source-over';
        return;
      }
      this.ctx.beginPath();
      this.ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalCompositeOperation = 'source-over';
      return;
    }

    if (pts.length === 2) {
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0].x, pts[0].y);
      const mx = (pts[0].x + pts[1].x) / 2;
      const my = (pts[0].y + pts[1].y) / 2;
      this.ctx.quadraticCurveTo(pts[0].x, pts[0].y, mx, my);
      this.ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[1].x, pts[1].y);
      this.ctx.stroke();
      this.ctx.globalCompositeOperation = 'source-over';
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].x, pts[0].y);

    const firstMidX = (pts[0].x + pts[1].x) / 2;
    const firstMidY = (pts[0].y + pts[1].y) / 2;
    this.ctx.quadraticCurveTo(pts[0].x, pts[0].y, firstMidX, firstMidY);

    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }

    const lastIdx = pts.length - 1;
    this.ctx.quadraticCurveTo(
      pts[lastIdx].x, pts[lastIdx].y,
      pts[lastIdx].x, pts[lastIdx].y
    );

    this.ctx.stroke();
    this.ctx.globalCompositeOperation = 'source-over';
  }
}
