import type { DrawEventData, StickyData } from './SyncModule';

export type ToolType = 'pen' | 'rect' | 'circle' | 'sticky' | 'select';

type DrawOperation = {
  tool: 'pen' | 'rect' | 'circle';
  color: string;
  lineWidth: number;
  points: { x: number; y: number }[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type Point = { x: number; y: number };

export class CanvasModule {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private operations: DrawOperation[] = [];
  private currentOp: DrawOperation | null = null;
  private isDrawing = false;
  private tool: ToolType = 'pen';
  private color = '#333333';
  private lineWidth = 3;

  private onDrawEvent?: (data: Omit<DrawEventData, 'roomId'>) => void;
  private onStickyAdd?: (sticky: Omit<StickyData, 'roomId'>) => void;
  private onStickyMove?: (id: string, x: number, y: number) => void;
  private onStickyUpdate?: (id: string, text: string) => void;
  private onStickyDelete?: (id: string) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bindEvents();
  }

  setCallbacks(cb: {
    onDrawEvent?: (data: Omit<DrawEventData, 'roomId'>) => void;
    onStickyAdd?: (sticky: Omit<StickyData, 'roomId'>) => void;
    onStickyMove?: (id: string, x: number, y: number) => void;
    onStickyUpdate?: (id: string, text: string) => void;
    onStickyDelete?: (id: string) => void;
  }) {
    Object.assign(this, cb);
  }

  setTool(tool: ToolType) {
    this.tool = tool;
  }

  getTool(): ToolType {
    return this.tool;
  }

  setColor(color: string) {
    this.color = color;
  }

  getColor(): string {
    return this.color;
  }

  setLineWidth(width: number) {
    this.lineWidth = width;
  }

  getLineWidth(): number {
    return this.lineWidth;
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redrawAll();
  }

  clear() {
    this.operations = [];
    this.currentOp = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private getPos(e: MouseEvent | Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private bindEvents() {
    const el = this.canvas;

    el.addEventListener('mousedown', (e) => this.onStart(this.getPos(e)));
    el.addEventListener('mousemove', (e) => this.onMove(this.getPos(e)));
    el.addEventListener('mouseup', () => this.onEnd());
    el.addEventListener('mouseleave', () => this.onEnd());

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) this.onStart(this.getPos(e.touches[0]));
    }, { passive: false });
    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) this.onMove(this.getPos(e.touches[0]));
    }, { passive: false });
    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onEnd();
    }, { passive: false });
  }

  private onStart(pos: Point) {
    if (this.tool === 'sticky' || this.tool === 'select') return;

    this.isDrawing = true;
    const op: DrawOperation = {
      tool: this.tool as 'pen' | 'rect' | 'circle',
      color: this.color,
      lineWidth: this.lineWidth,
      points: [pos],
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
    };
    this.currentOp = op;

    if (this.tool === 'pen') {
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
  }

  private onMove(pos: Point) {
    if (!this.isDrawing || !this.currentOp) return;

    this.currentOp.endX = pos.x;
    this.currentOp.endY = pos.y;

    if (this.tool === 'pen') {
      this.currentOp.points.push(pos);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    } else {
      this.redrawAll();
      this.drawShape(this.currentOp);
    }
  }

  private onEnd() {
    if (!this.isDrawing || !this.currentOp) {
      this.isDrawing = false;
      return;
    }

    this.isDrawing = false;
    this.operations.push(this.currentOp);

    this.onDrawEvent?.({
      tool: this.currentOp.tool,
      color: this.currentOp.color,
      lineWidth: this.currentOp.lineWidth,
      points: this.currentOp.points,
      startX: this.currentOp.startX,
      startY: this.currentOp.startY,
      endX: this.currentOp.endX,
      endY: this.currentOp.endY,
    });

    this.currentOp = null;
  }

  applyRemoteDraw(data: DrawEventData) {
    const op: DrawOperation = {
      tool: data.tool,
      color: data.color,
      lineWidth: data.lineWidth,
      points: data.points,
      startX: data.startX,
      startY: data.startY,
      endX: data.endX,
      endY: data.endY,
    };
    this.operations.push(op);
    this.redrawAll();
  }

  private redrawAll() {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    for (const op of this.operations) {
      if (op.tool === 'pen') {
        this.drawPen(op);
      } else {
        this.drawShape(op);
      }
    }
  }

  private drawPen(op: DrawOperation) {
    if (op.points.length < 2) return;
    this.ctx.beginPath();
    this.ctx.moveTo(op.points[0].x, op.points[0].y);
    for (let i = 1; i < op.points.length; i++) {
      this.ctx.lineTo(op.points[i].x, op.points[i].y);
    }
    this.ctx.strokeStyle = op.color;
    this.ctx.lineWidth = op.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
  }

  private drawShape(op: DrawOperation) {
    this.ctx.strokeStyle = op.color;
    this.ctx.lineWidth = op.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (op.tool === 'rect') {
      const x = Math.min(op.startX, op.endX);
      const y = Math.min(op.startY, op.endY);
      const w = Math.abs(op.endX - op.startX);
      const h = Math.abs(op.endY - op.startY);
      this.ctx.strokeRect(x, y, w, h);
    } else if (op.tool === 'circle') {
      const cx = (op.startX + op.endX) / 2;
      const cy = (op.startY + op.endY) / 2;
      const rx = Math.abs(op.endX - op.startX) / 2;
      const ry = Math.abs(op.endY - op.startY) / 2;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  addStickyAt(x: number, y: number): Omit<StickyData, 'roomId'> {
    const id = 'sticky-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const sticky: Omit<StickyData, 'roomId'> = {
      id,
      x,
      y,
      text: '',
      color: this.color,
    };
    this.onStickyAdd?.(sticky);
    return sticky;
  }

  exportAsPng(): string {
    return this.canvas.toDataURL('image/png');
  }

  destroy() {
    this.operations = [];
    this.currentOp = null;
  }
}
