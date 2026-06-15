export type ShapeType = 'rect' | 'circle' | 'triangle';
export type PhysicsType = 'static' | 'dynamic' | 'portal-a' | 'portal-b' | 'trap';

export interface Point { x: number; y: number; }

export interface Shape {
  id: string;
  type: ShapeType;
  physics: PhysicsType;
  rect?: { x: number; y: number; w: number; h: number };
  ellipse?: { cx: number; cy: number; rx: number; ry: number };
  triangle?: { p1: Point; p2: Point; p3: Point };
  flash?: number;
}

export type Tool = 'rect' | 'circle' | 'triangle';

interface EditorState {
  shapes: Shape[];
  selectedId: string | null;
  tool: Tool;
  history: Shape[][];
  future: Shape[][];
}

const COLORS = {
  fill: '#D1D5DB',
  stroke: '#4B5563',
  selected: '#3B82F6',
  staticFill: '#6B7280',
  dynamicFill: '#93C5FD',
  portalA: '#3B82F6',
  portalB: '#8B5CF6',
  trap: 'rgba(239, 68, 68, 0.5)',
  anchor: '#FFFFFF',
  anchorStroke: '#3B82F6'
};

const ANCHOR_SIZE = 7;
const MAX_SHAPES = 50;

export class Editor {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: EditorState;
  private drawing: boolean = false;
  private dragStart: Point = { x: 0, y: 0 };
  private trianglePoints: Point[] = [];
  private draggingShape: string | null = null;
  private dragOffset: Point = { x: 0, y: 0 };
  private resizingAnchor: number = -1;
  private resizeStartShape: Shape | null = null;
  private resizeStartPoint: Point = { x: 0, y: 0 };
  private lastHistorySnapshot: Shape[] | null = null;
  onShapesChange?: () => void;
  onSelectionChange?: (shape: Shape | null) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = {
      shapes: [],
      selectedId: null,
      tool: 'rect',
      history: [],
      future: []
    };
    this.resize();
  }

  resize() {
    const wrap = this.canvas.parentElement!;
    const w = Math.max(800, wrap.clientWidth);
    const h = Math.max(600, wrap.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get width(): number { return this.canvas.width / (window.devicePixelRatio || 1); }
  get height(): number { return this.canvas.height / (window.devicePixelRatio || 1); }

  setTool(tool: Tool) {
    this.state.tool = tool;
    this.trianglePoints = [];
    this.state.selectedId = null;
    this.onSelectionChange?.(null);
    this.render();
  }

  getSelectedShape(): Shape | null {
    return this.state.shapes.find(s => s.id === this.state.selectedId) || null;
  }

  setShapePhysics(id: string, physics: PhysicsType) {
    this.saveHistory();
    const s = this.state.shapes.find(x => x.id === id);
    if (s) {
      s.physics = physics;
      s.flash = 0.3;
    }
    this.onShapesChange?.();
    this.render();
  }

  deleteSelected() {
    if (!this.state.selectedId) return;
    this.saveHistory();
    this.state.shapes = this.state.shapes.filter(s => s.id !== this.state.selectedId);
    this.state.selectedId = null;
    this.onSelectionChange?.(null);
    this.onShapesChange?.();
    this.render();
  }

  private genId(): string {
    return 's_' + Math.random().toString(36).slice(2, 10);
  }

  private cloneShapes(shapes: Shape[]): Shape[] {
    return JSON.parse(JSON.stringify(shapes));
  }

  saveHistory() {
    const snap = this.cloneShapes(this.state.shapes);
    if (this.lastHistorySnapshot && JSON.stringify(this.lastHistorySnapshot) === JSON.stringify(snap)) return;
    this.state.history.push(snap);
    this.state.future = [];
    this.lastHistorySnapshot = snap;
  }

  undo() {
    if (this.state.history.length === 0) return;
    const prev = this.state.history.pop()!;
    this.state.future.push(this.cloneShapes(this.state.shapes));
    this.state.shapes = prev;
    this.state.selectedId = null;
    this.onSelectionChange?.(null);
    this.onShapesChange?.();
    this.render();
  }

  redo() {
    if (this.state.future.length === 0) return;
    const next = this.state.future.pop()!;
    this.state.history.push(this.cloneShapes(this.state.shapes));
    this.state.shapes = next;
    this.state.selectedId = null;
    this.onSelectionChange?.(null);
    this.onShapesChange?.();
    this.render();
  }

  getMousePos(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  onMouseDown(e: MouseEvent) {
    const p = this.getMousePos(e);

    const anchor = this.hitAnchor(p);
    if (anchor >= 0 && this.state.selectedId) {
      this.resizingAnchor = anchor;
      this.resizeStartShape = this.cloneShapes([this.getSelectedShape()!])[0];
      this.resizeStartPoint = p;
      this.saveHistory();
      return;
    }

    const hitId = this.hitShape(p);
    if (hitId) {
      const shape = this.state.shapes.find(s => s.id === hitId)!;
      this.state.selectedId = hitId;
      this.draggingShape = hitId;
      const center = this.getShapeCenter(shape);
      this.dragOffset = { x: p.x - center.x, y: p.y - center.y };
      this.saveHistory();
      this.onSelectionChange?.(shape);
      this.render();
      return;
    }

    this.state.selectedId = null;
    this.onSelectionChange?.(null);

    if (this.state.shapes.length >= MAX_SHAPES) {
      this.render();
      return;
    }

    if (this.state.tool === 'rect' || this.state.tool === 'circle') {
      this.drawing = true;
      this.dragStart = p;
    } else if (this.state.tool === 'triangle') {
      this.trianglePoints.push(p);
      if (this.trianglePoints.length === 3) {
        this.saveHistory();
        this.state.shapes.push({
          id: this.genId(),
          type: 'triangle',
          physics: 'static',
          triangle: {
            p1: { ...this.trianglePoints[0] },
            p2: { ...this.trianglePoints[1] },
            p3: { ...this.trianglePoints[2] }
          },
          flash: 0.3
        });
        this.trianglePoints = [];
        this.onShapesChange?.();
      }
      this.render();
    }
  }

  onMouseMove(e: MouseEvent) {
    const p = this.getMousePos(e);

    if (this.resizingAnchor >= 0 && this.state.selectedId && this.resizeStartShape) {
      const dx = p.x - this.resizeStartPoint.x;
      const dy = p.y - this.resizeStartPoint.y;
      this.applyResize(dx, dy);
      this.onShapesChange?.();
      this.render();
      return;
    }

    if (this.draggingShape) {
      const shape = this.state.shapes.find(s => s.id === this.draggingShape)!;
      const target = { x: p.x - this.dragOffset.x, y: p.y - this.dragOffset.y };
      this.moveShapeTo(shape, target);
      this.onShapesChange?.();
      this.render();
      return;
    }

    if (this.drawing) {
      this.render();
      this.drawPreview(p);
    }
  }

  onMouseUp(e: MouseEvent) {
    const p = this.getMousePos(e);

    if (this.resizingAnchor >= 0) {
      this.resizingAnchor = -1;
      this.resizeStartShape = null;
      return;
    }

    if (this.draggingShape) {
      this.draggingShape = null;
      return;
    }

    if (this.drawing) {
      this.drawing = false;
      const w = Math.abs(p.x - this.dragStart.x);
      const h = Math.abs(p.y - this.dragStart.y);
      if (w > 5 && h > 5) {
        this.saveHistory();
        const x = Math.min(p.x, this.dragStart.x);
        const y = Math.min(p.y, this.dragStart.y);
        if (this.state.tool === 'rect') {
          this.state.shapes.push({
            id: this.genId(),
            type: 'rect',
            physics: 'static',
            rect: { x, y, w, h },
            flash: 0.3
          });
        } else if (this.state.tool === 'circle') {
          this.state.shapes.push({
            id: this.genId(),
            type: 'circle',
            physics: 'static',
            ellipse: { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 },
            flash: 0.3
          });
        }
        this.onShapesChange?.();
      }
      this.render();
    }
  }

  private getShapeCenter(s: Shape): Point {
    if (s.rect) return { x: s.rect.x + s.rect.w / 2, y: s.rect.y + s.rect.h / 2 };
    if (s.ellipse) return { x: s.ellipse.cx, y: s.ellipse.cy };
    if (s.triangle) {
      return {
        x: (s.triangle.p1.x + s.triangle.p2.x + s.triangle.p3.x) / 3,
        y: (s.triangle.p1.y + s.triangle.p2.y + s.triangle.p3.y) / 3
      };
    }
    return { x: 0, y: 0 };
  }

  private getShapeBounds(s: Shape): { x: number; y: number; w: number; h: number } {
    if (s.rect) return { ...s.rect };
    if (s.ellipse) return { x: s.ellipse.cx - s.ellipse.rx, y: s.ellipse.cy - s.ellipse.ry, w: s.ellipse.rx * 2, h: s.ellipse.ry * 2 };
    if (s.triangle) {
      const xs = [s.triangle.p1.x, s.triangle.p2.x, s.triangle.p3.x];
      const ys = [s.triangle.p1.y, s.triangle.p2.y, s.triangle.p3.y];
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  private moveShapeTo(s: Shape, center: Point) {
    const old = this.getShapeCenter(s);
    const dx = center.x - old.x;
    const dy = center.y - old.y;
    if (s.rect) { s.rect.x += dx; s.rect.y += dy; }
    else if (s.ellipse) { s.ellipse.cx += dx; s.ellipse.cy += dy; }
    else if (s.triangle) {
      s.triangle.p1.x += dx; s.triangle.p1.y += dy;
      s.triangle.p2.x += dx; s.triangle.p2.y += dy;
      s.triangle.p3.x += dx; s.triangle.p3.y += dy;
    }
  }

  private getAnchors(s: Shape): Point[] {
    const b = this.getShapeBounds(s);
    return [
      { x: b.x, y: b.y },
      { x: b.x + b.w / 2, y: b.y },
      { x: b.x + b.w, y: b.y },
      { x: b.x + b.w, y: b.y + b.h / 2 },
      { x: b.x + b.w, y: b.y + b.h },
      { x: b.x + b.w / 2, y: b.y + b.h },
      { x: b.x, y: b.y + b.h },
      { x: b.x, y: b.y + b.h / 2 }
    ];
  }

  private hitAnchor(p: Point): number {
    if (!this.state.selectedId) return -1;
    const s = this.getSelectedShape();
    if (!s) return -1;
    const anchors = this.getAnchors(s);
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      if (Math.abs(p.x - a.x) <= ANCHOR_SIZE && Math.abs(p.y - a.y) <= ANCHOR_SIZE) return i;
    }
    return -1;
  }

  private applyResize(dx: number, dy: number) {
    const s = this.getSelectedShape();
    if (!s || !this.resizeStartShape) return;
    const b = this.getShapeBounds(this.resizeStartShape);
    let nx = b.x, ny = b.y, nw = b.w, nh = b.h;
    switch (this.resizingAnchor) {
      case 0: nx = b.x + dx; ny = b.y + dy; nw = b.w - dx; nh = b.h - dy; break;
      case 1: ny = b.y + dy; nh = b.h - dy; break;
      case 2: nw = b.w + dx; ny = b.y + dy; nh = b.h - dy; break;
      case 3: nw = b.w + dx; break;
      case 4: nw = b.w + dx; nh = b.h + dy; break;
      case 5: nh = b.h + dy; break;
      case 6: nx = b.x + dx; nw = b.w - dx; nh = b.h + dy; break;
      case 7: nx = b.x + dx; nw = b.w - dx; break;
    }
    if (nw < 10) { nx = b.x + b.w - 10; nw = 10; }
    if (nh < 10) { ny = b.y + b.h - 10; nh = 10; }

    if (s.rect) {
      s.rect.x = nx; s.rect.y = ny; s.rect.w = nw; s.rect.h = nh;
    } else if (s.ellipse) {
      s.ellipse.cx = nx + nw / 2;
      s.ellipse.cy = ny + nh / 2;
      s.ellipse.rx = nw / 2;
      s.ellipse.ry = nh / 2;
    } else if (s.triangle && this.resizeStartShape.triangle) {
      const sx = nw / b.w, sy = nh / b.h;
      const ox = b.x, oy = b.y;
      const pts = [this.resizeStartShape.triangle.p1, this.resizeStartShape.triangle.p2, this.resizeStartShape.triangle.p3];
      const npts = pts.map(pt => ({
        x: nx + (pt.x - ox) * sx,
        y: ny + (pt.y - oy) * sy
      }));
      s.triangle.p1 = npts[0];
      s.triangle.p2 = npts[1];
      s.triangle.p3 = npts[2];
    }
  }

  private pointInShape(p: Point, s: Shape): boolean {
    if (s.rect) {
      return p.x >= s.rect.x && p.x <= s.rect.x + s.rect.w && p.y >= s.rect.y && p.y <= s.rect.y + s.rect.h;
    }
    if (s.ellipse) {
      const dx = (p.x - s.ellipse.cx) / s.ellipse.rx;
      const dy = (p.y - s.ellipse.cy) / s.ellipse.ry;
      return dx * dx + dy * dy <= 1;
    }
    if (s.triangle) {
      const { p1, p2, p3 } = s.triangle;
      const sign = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
        (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
      const d1 = sign(p.x, p.y, p1.x, p1.y, p2.x, p2.y);
      const d2 = sign(p.x, p.y, p2.x, p2.y, p3.x, p3.y);
      const d3 = sign(p.x, p.y, p3.x, p3.y, p1.x, p1.y);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      return !(hasNeg && hasPos);
    }
    return false;
  }

  private hitShape(p: Point): string | null {
    for (let i = this.state.shapes.length - 1; i >= 0; i--) {
      if (this.pointInShape(p, this.state.shapes[i])) return this.state.shapes[i].id;
    }
    return null;
  }

  private getFillColor(s: Shape): string {
    switch (s.physics) {
      case 'static': return COLORS.staticFill;
      case 'dynamic': return COLORS.dynamicFill;
      case 'portal-a': return COLORS.portalA;
      case 'portal-b': return COLORS.portalB;
      case 'trap': return COLORS.trap;
      default: return COLORS.fill;
    }
  }

  private drawShape(s: Shape, selected: boolean) {
    const ctx = this.ctx;
    let fill = this.getFillColor(s);
    let stroke = selected ? COLORS.selected : COLORS.stroke;
    let lw = selected ? 3 : 2;

    if (s.flash && s.flash > 0) {
      ctx.globalAlpha = 0.5 + s.flash;
    }

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;

    if (s.rect) {
      ctx.beginPath();
      ctx.rect(s.rect.x, s.rect.y, s.rect.w, s.rect.h);
      ctx.fill();
      ctx.stroke();
    } else if (s.ellipse) {
      ctx.beginPath();
      ctx.ellipse(s.ellipse.cx, s.ellipse.cy, s.ellipse.rx, s.ellipse.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (s.triangle) {
      ctx.beginPath();
      ctx.moveTo(s.triangle.p1.x, s.triangle.p1.y);
      ctx.lineTo(s.triangle.p2.x, s.triangle.p2.y);
      ctx.lineTo(s.triangle.p3.x, s.triangle.p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    if (selected) {
      const anchors = this.getAnchors(s);
      ctx.fillStyle = COLORS.anchor;
      ctx.strokeStyle = COLORS.anchorStroke;
      ctx.lineWidth = 2;
      anchors.forEach(a => {
        ctx.beginPath();
        ctx.rect(a.x - ANCHOR_SIZE / 2, a.y - ANCHOR_SIZE / 2, ANCHOR_SIZE, ANCHOR_SIZE);
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  private drawPreview(p: Point) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = COLORS.fill;
    ctx.strokeStyle = COLORS.selected;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const x = Math.min(p.x, this.dragStart.x);
    const y = Math.min(p.y, this.dragStart.y);
    const w = Math.abs(p.x - this.dragStart.x);
    const h = Math.abs(p.y - this.dragStart.y);
    if (this.state.tool === 'rect') {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.stroke();
    } else if (this.state.tool === 'circle') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    if (this.state.tool === 'triangle' && this.trianglePoints.length > 0) {
      ctx.save();
      ctx.fillStyle = COLORS.selected;
      this.trianglePoints.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      if (this.trianglePoints.length >= 2) {
        ctx.strokeStyle = COLORS.selected;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.trianglePoints[0].x, this.trianglePoints[0].y);
        for (let i = 1; i < this.trianglePoints.length; i++) {
          ctx.lineTo(this.trianglePoints[i].x, this.trianglePoints[i].y);
        }
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.state.shapes.forEach(s => {
      this.drawShape(s, s.id === this.state.selectedId);
      if (s.flash && s.flash > 0) s.flash = Math.max(0, s.flash - 0.02);
    });
  }

  tick() {
    let needsRender = false;
    this.state.shapes.forEach(s => {
      if (s.flash && s.flash > 0) needsRender = true;
    });
    if (needsRender) this.render();
  }
}
