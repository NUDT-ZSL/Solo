export interface Expression {
  id: string;
  formula: string;
  color: string;
  type: '2d-line' | '2d-scatter' | '3d-surface' | '3d-contour' | 'implicit' | 'polar';
  visible: boolean;
}

export interface Parameters {
  [key: string]: number;
}

export interface ViewState {
  mode: '2d' | '3d';
  rotationX: number;
  rotationY: number;
  zoom: number;
  panX: number;
  panY: number;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
}

export interface FrameData {
  expressions: Expression[];
  parameters: Parameters;
  viewState: ViewState;
}

type MathFn = (x: number, y?: number, z?: number) => number;

interface ParsedExpression {
  expression: Expression;
  fn: MathFn;
  implicitFn?: ((x: number, y: number) => number) | null;
}

const BUILTIN_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  log: (x: number, base?: number) => (base ? Math.log(x) / Math.log(base) : Math.log(x)),
  ln: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  pow: Math.pow,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  trunc: Math.trunc,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  clamp: (x: number, a: number, b: number) => Math.min(Math.max(x, a), b),
  mod: (a: number, b: number) => ((a % b) + b) % b,
  pi: () => Math.PI,
  e: () => Math.E,
};

export function parseExpression(formula: string, parameters: Parameters): MathFn {
  let processed = formula
    .replace(/\^/g, '**')
    .replace(/(\d)([a-zA-Z])/g, '$1*$2')
    .replace(/\)(\()/g, ')*(')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E');

  const paramKeys = Object.keys(parameters);
  const paramValues = Object.values(parameters);
  const fnNames = Object.keys(BUILTIN_FUNCTIONS);

  for (const name of fnNames) {
    const re = new RegExp(`\\b${name}\\b`, 'g');
    processed = processed.replace(re, `__fn_${name}`);
  }

  const fnArgs = ['x', 'y', 'z', ...paramKeys, ...fnNames.map((n) => `__fn_${n}`)];
  const fnValues = [...paramValues, ...Object.values(BUILTIN_FUNCTIONS)];

  try {
    const body = `try { return (${processed}); } catch(e) { return NaN; }`;
    // eslint-disable-next-line no-new-func
    return new Function(...fnArgs, body).bind(null, ...fnValues) as MathFn;
  } catch {
    return () => NaN;
  }
}

export function detectExpressionType(formula: string): Expression['type'] {
  const f = formula.toLowerCase().trim();
  if (f.includes('z') && f.includes('x') && f.includes('y')) return '3d-surface';
  if (f.includes('=') && (f.includes('x') || f.includes('y'))) return 'implicit';
  if (f.includes('theta') || f.includes('r(') || f.startsWith('r=')) return 'polar';
  if (f.includes('x') || f.includes('y')) return '2d-line';
  return '2d-line';
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class GraphEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameData: FrameData;
  private targetFrameData: FrameData | null = null;
  private animationStart: number = 0;
  private animationDuration: number = 400;
  private parsedExpressions: ParsedExpression[] = [];
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private touchStartDist: number = 0;
  private touchStartZoom: number = 1;
  private onViewChange?: (view: ViewState) => void;

  constructor(canvas: HTMLCanvasElement, initialData: FrameData, onViewChange?: (view: ViewState) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.frameData = initialData;
    this.onViewChange = onViewChange;
    this.reparseExpressions();
    this.attachEvents();
    this.resize();
    this.startRenderLoop();
  }

  public setFrameData(data: FrameData, animate: boolean = true): void {
    if (animate) {
      this.targetFrameData = JSON.parse(JSON.stringify(data));
      this.animationStart = performance.now();
    } else {
      this.frameData = JSON.parse(JSON.stringify(data));
      this.targetFrameData = null;
      this.reparseExpressions();
    }
  }

  public updateParameters(params: Parameters): void {
    this.frameData.parameters = { ...params };
    if (this.targetFrameData) this.targetFrameData.parameters = { ...params };
    this.reparseExpressions();
  }

  public setMode(mode: '2d' | '3d'): void {
    const current = this.frameData.viewState;
    this.frameData.viewState = {
      ...current,
      mode,
      rotationX: mode === '3d' ? 30 : 0,
      rotationY: mode === '3d' ? 45 : 0,
    };
    if (this.onViewChange) this.onViewChange(this.frameData.viewState);
  }

  public getViewState(): ViewState {
    return { ...this.frameData.viewState };
  }

  public getFrameData(): FrameData {
    return JSON.parse(JSON.stringify(this.frameData));
  }

  public destroy(): void {
    this.detachEvents();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private reparseExpressions(): void {
    this.parsedExpressions = this.frameData.expressions
      .filter((e) => e.visible && e.formula.trim())
      .map((expr) => {
        let formula = expr.formula;
        let implicitFn: ((x: number, y: number) => number) | null = null;
        if (expr.type === 'implicit' && formula.includes('=')) {
          const parts = formula.split('=');
          const left = parts[0].trim();
          const right = parts[1].trim();
          formula = `(${left}) - (${right})`;
          implicitFn = parseExpression(formula, this.frameData.parameters) as (x: number, y: number) => number;
        }
        return {
          expression: expr,
          fn: parseExpression(formula, this.frameData.parameters),
          implicitFn,
        };
      });
  }

  private attachEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('resize', this.resize);
  }

  private detachEvents(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.resize);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.canvas.style.cursor = 'grabbing';
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    const now = performance.now();
    const dt = Math.max(now - this.lastFrameTime, 1);
    this.velocityX = dx / dt * 16;
    this.velocityY = dy / dt * 16;
    this.applyDrag(dx, dy, e.shiftKey);
    this.lastFrameTime = now;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const vs = this.frameData.viewState;
    const newZoom = Math.min(5, Math.max(0.5, vs.zoom * (1 + delta)));
    vs.zoom = this.inertialDamp(vs.zoom, newZoom, 0.3);
    if (this.onViewChange) this.onViewChange(vs);
  };

  private inertialDamp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      this.touchStartZoom = this.frameData.viewState.zoom;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastMouseX;
      const dy = e.touches[0].clientY - this.lastMouseY;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.applyDrag(dx, dy, false);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / this.touchStartDist;
      const vs = this.frameData.viewState;
      vs.zoom = Math.min(5, Math.max(0.5, this.touchStartZoom * scale));

      const cx1 = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy1 = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (this.lastMouseX !== -999) {
        const rdx = cx1 - this.lastMouseX;
        const rdy = cy1 - this.lastMouseY;
        vs.rotationY += rdx * 0.3;
        vs.rotationX = Math.min(70, Math.max(-45, vs.rotationX + rdy * 0.3));
      }
      this.lastMouseX = cx1;
      this.lastMouseY = cy1;
      if (this.onViewChange) this.onViewChange(vs);
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    this.lastMouseX = -999;
  };

  private applyDrag(dx: number, dy: number, pan: boolean): void {
    const vs = this.frameData.viewState;
    if (pan || vs.mode === '2d') {
      vs.panX += dx / vs.zoom;
      vs.panY += dy / vs.zoom;
    } else {
      vs.rotationY += dx * 0.3;
      vs.rotationX = Math.min(70, Math.max(-45, vs.rotationX + dy * 0.3));
    }
    if (this.onViewChange) this.onViewChange(vs);
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  private render(): void {
    const now = performance.now();
    if (this.targetFrameData) {
      const t = Math.min(1, (now - this.animationStart) / this.animationDuration);
      const ease = easeInOutCubic(t);
      this.interpolateFrameData(ease);
      if (t >= 1) {
        this.frameData = this.targetFrameData;
        this.targetFrameData = null;
        this.reparseExpressions();
      }
    }

    if (!this.isDragging) {
      const vs = this.frameData.viewState;
      if (vs.mode === '3d' && (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1)) {
        vs.rotationY += this.velocityX * 0.05;
        vs.rotationX = Math.min(70, Math.max(-45, vs.rotationX + this.velocityY * 0.05));
        this.velocityX *= 0.92;
        this.velocityY *= 0.92;
        if (this.onViewChange) this.onViewChange(vs);
      }
    }

    this.draw();
  }

  private interpolateFrameData(t: number): void {
    if (!this.targetFrameData) return;
    const src = this.frameData.viewState;
    const dst = this.targetFrameData.viewState;
    this.frameData.viewState = {
      mode: dst.mode,
      rotationX: src.rotationX + (dst.rotationX - src.rotationX) * t,
      rotationY: src.rotationY + (dst.rotationY - src.rotationY) * t,
      zoom: src.zoom + (dst.zoom - src.zoom) * t,
      panX: src.panX + (dst.panX - src.panX) * t,
      panY: src.panY + (dst.panY - src.panY) * t,
      xRange: [
        src.xRange[0] + (dst.xRange[0] - src.xRange[0]) * t,
        src.xRange[1] + (dst.xRange[1] - src.xRange[1]) * t,
      ],
      yRange: [
        src.yRange[0] + (dst.yRange[0] - src.yRange[0]) * t,
        src.yRange[1] + (dst.yRange[1] - src.yRange[1]) * t,
      ],
      zRange: [
        src.zRange[0] + (dst.zRange[0] - src.zRange[0]) * t,
        src.zRange[1] + (dst.zRange[1] - src.zRange[1]) * t,
      ],
    };
    if (!this.targetFrameData || t >= 1) this.reparseExpressions();
  }

  private draw(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const vs = this.frameData.viewState;

    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(1, '#1a1a2e');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.translate(w / 2 + vs.panX, h / 2 + vs.panY);
    this.ctx.scale(vs.zoom, vs.zoom);

    if (vs.mode === '2d') {
      this.drawGrid2D(w, h);
      this.drawAxes2D(w, h);
      for (const pe of this.parsedExpressions) {
        this.drawExpression2D(pe, w, h);
      }
    } else {
      this.drawGrid3D(w, h);
      for (const pe of this.parsedExpressions) {
        if (pe.expression.type === '3d-surface' || pe.expression.type === '3d-contour') {
          this.drawSurface3D(pe);
        } else {
          this.drawExpression3Dto2D(pe, w, h);
        }
      }
    }

    this.ctx.restore();
  }

  private worldToScreen2D(x: number, y: number, w: number, h: number): [number, number] {
    const vs = this.frameData.viewState;
    const sx = ((x - vs.xRange[0]) / (vs.xRange[1] - vs.xRange[0]) - 0.5) * Math.min(w, h) * 0.8;
    const sy = -((y - vs.yRange[0]) / (vs.yRange[1] - vs.yRange[0]) - 0.5) * Math.min(w, h) * 0.8;
    return [sx, sy];
  }

  private drawGrid2D(w: number, h: number): void {
    const vs = this.frameData.viewState;
    this.ctx.strokeStyle = '#ffffff10';
    this.ctx.lineWidth = 1 / vs.zoom;
    const step = this.getNiceStep(vs.xRange[1] - vs.xRange[0]);
    for (let x = Math.ceil(vs.xRange[0] / step) * step; x <= vs.xRange[1]; x += step) {
      const [sx1, sy1] = this.worldToScreen2D(x, vs.yRange[0], w, h);
      const [sx2, sy2] = this.worldToScreen2D(x, vs.yRange[1], w, h);
      this.ctx.beginPath();
      this.ctx.moveTo(sx1, sy1);
      this.ctx.lineTo(sx2, sy2);
      this.ctx.stroke();
    }
    const ystep = this.getNiceStep(vs.yRange[1] - vs.yRange[0]);
    for (let y = Math.ceil(vs.yRange[0] / ystep) * ystep; y <= vs.yRange[1]; y += ystep) {
      const [sx1, sy1] = this.worldToScreen2D(vs.xRange[0], y, w, h);
      const [sx2, sy2] = this.worldToScreen2D(vs.xRange[1], y, w, h);
      this.ctx.beginPath();
      this.ctx.moveTo(sx1, sy1);
      this.ctx.lineTo(sx2, sy2);
      this.ctx.stroke();
    }
  }

  private drawAxes2D(w: number, h: number): void {
    this.ctx.strokeStyle = '#ffffff40';
    this.ctx.lineWidth = 1.5 / this.frameData.viewState.zoom;
    const vs = this.frameData.viewState;
    const [ox, oy] = this.worldToScreen2D(0, 0, w, h);
    const [x1, y1] = this.worldToScreen2D(vs.xRange[0], 0, w, h);
    const [x2, y2] = this.worldToScreen2D(vs.xRange[1], 0, w, h);
    const [x3, y3] = this.worldToScreen2D(0, vs.yRange[0], w, h);
    const [x4, y4] = this.worldToScreen2D(0, vs.yRange[1], w, h);
    this.ctx.beginPath();
    this.ctx.moveTo(Math.min(x1, x2), oy);
    this.ctx.lineTo(Math.max(x1, x2), oy);
    this.ctx.moveTo(ox, Math.min(y3, y4));
    this.ctx.lineTo(ox, Math.max(y3, y4));
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff80';
    this.ctx.font = `${12 / this.frameData.viewState.zoom}px sans-serif`;
    this.ctx.textAlign = 'center';
    const step = this.getNiceStep(vs.xRange[1] - vs.xRange[0]);
    for (let x = Math.ceil(vs.xRange[0] / step) * step; x <= vs.xRange[1]; x += step) {
      if (Math.abs(x) < 0.0001) continue;
      const [sx, sy] = this.worldToScreen2D(x, 0, w, h);
      this.ctx.fillText(x.toFixed(Math.abs(x) < 1 ? 2 : 0), sx, sy + 15 / vs.zoom);
    }
    const ystep = this.getNiceStep(vs.yRange[1] - vs.yRange[0]);
    for (let y = Math.ceil(vs.yRange[0] / ystep) * ystep; y <= vs.yRange[1]; y += ystep) {
      if (Math.abs(y) < 0.0001) continue;
      const [sx, sy] = this.worldToScreen2D(0, y, w, h);
      this.ctx.textAlign = 'right';
      this.ctx.fillText(y.toFixed(Math.abs(y) < 1 ? 2 : 0), sx - 6 / vs.zoom, sy + 4 / vs.zoom);
    }
  }

  private drawExpression2D(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    if (pe.expression.type === 'polar') {
      this.drawPolar(pe, w, h);
      return;
    }
    if (pe.expression.type === 'implicit' && pe.implicitFn) {
      this.drawImplicit(pe, w, h);
      return;
    }
    if (pe.expression.type === '2d-scatter') {
      this.drawScatter(pe, w, h);
      return;
    }

    const samples = 500;
    const dx = (vs.xRange[1] - vs.xRange[0]) / samples;
    this.ctx.strokeStyle = pe.expression.color;
    this.ctx.lineWidth = 2 / vs.zoom;
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    let started = false;
    let prevY = NaN;

    for (let i = 0; i <= samples; i++) {
      const x = vs.xRange[0] + i * dx;
      const y = pe.fn(x);
      if (!isFinite(y) || Math.abs(y) > 1e6 || (isFinite(prevY) && Math.abs(y - prevY) > (vs.yRange[1] - vs.yRange[0]) * 10)) {
        started = false;
      } else {
        const [sx, sy] = this.worldToScreen2D(x, y, w, h);
        if (!started) {
          this.ctx.moveTo(sx, sy);
          started = true;
        } else {
          this.ctx.lineTo(sx, sy);
        }
      }
      prevY = y;
    }
    this.ctx.stroke();
  }

  private drawPolar(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    const samples = 500;
    this.ctx.strokeStyle = pe.expression.color;
    this.ctx.lineWidth = 2 / vs.zoom;
    this.ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const theta = (i / samples) * Math.PI * 8;
      const r = pe.fn(theta);
      if (!isFinite(r)) continue;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const [sx, sy] = this.worldToScreen2D(x, y, w, h);
      if (i === 0) this.ctx.moveTo(sx, sy);
      else this.ctx.lineTo(sx, sy);
    }
    this.ctx.stroke();
  }

  private drawScatter(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    const samples = 100;
    const dx = (vs.xRange[1] - vs.xRange[0]) / samples;
    this.ctx.fillStyle = pe.expression.color;
    for (let i = 0; i <= samples; i++) {
      const x = vs.xRange[0] + i * dx;
      const y = pe.fn(x);
      if (!isFinite(y)) continue;
      const [sx, sy] = this.worldToScreen2D(x, y, w, h);
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 3 / vs.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawImplicit(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    const steps = 200;
    const dx = (vs.xRange[1] - vs.xRange[0]) / steps;
    const dy = (vs.yRange[1] - vs.yRange[0]) / steps;
    const grid: number[][] = [];
    for (let j = 0; j <= steps; j++) {
      grid[j] = [];
      for (let i = 0; i <= steps; i++) {
        const x = vs.xRange[0] + i * dx;
        const y = vs.yRange[0] + j * dy;
        grid[j][i] = pe.implicitFn!(x, y);
      }
    }
    this.ctx.strokeStyle = pe.expression.color;
    this.ctx.lineWidth = 2 / vs.zoom;
    for (let j = 0; j < steps; j++) {
      for (let i = 0; i < steps; i++) {
        const v00 = grid[j][i], v10 = grid[j][i + 1], v01 = grid[j + 1][i], v11 = grid[j + 1][i + 1];
        const x0 = vs.xRange[0] + i * dx, x1 = x0 + dx;
        const y0 = vs.yRange[0] + j * dy, y1 = y0 + dy;
        const edges: [number, number, number, number][] = [];
        if ((v00 < 0) !== (v10 < 0)) {
          const t = v00 / (v00 - v10);
          edges.push([x0 + t * dx, y0, -1, -1]);
        }
        if ((v10 < 0) !== (v11 < 0)) {
          const t = v10 / (v10 - v11);
          if (edges[edges.length - 1] && edges[edges.length - 1][2] === -1) {
            edges[edges.length - 1][2] = x1;
            edges[edges.length - 1][3] = y0 + t * dy;
          } else edges.push([-1, -1, x1, y0 + t * dy]);
        }
        if ((v01 < 0) !== (v11 < 0)) {
          const t = v01 / (v01 - v11);
          if (edges[edges.length - 1] && edges[edges.length - 1][2] === -1) {
            edges[edges.length - 1][2] = x0 + t * dx;
            edges[edges.length - 1][3] = y1;
          } else edges.push([-1, -1, x0 + t * dx, y1]);
        }
        if ((v00 < 0) !== (v01 < 0)) {
          const t = v00 / (v00 - v01);
          if (edges[edges.length - 1] && edges[edges.length - 1][2] === -1) {
            edges[edges.length - 1][2] = x0;
            edges[edges.length - 1][3] = y0 + t * dy;
          } else edges.push([-1, -1, x0, y0 + t * dy]);
        }
        for (const e of edges) {
          if (e[2] === -1) continue;
          const [sx1, sy1] = this.worldToScreen2D(e[0], e[1], w, h);
          const [sx2, sy2] = this.worldToScreen2D(e[2], e[3], w, h);
          this.ctx.beginPath();
          this.ctx.moveTo(sx1, sy1);
          this.ctx.lineTo(sx2, sy2);
          this.ctx.stroke();
        }
      }
    }
  }

  private project3D(x: number, y: number, z: number): [number, number, number] {
    const vs = this.frameData.viewState;
    const [xMin, xMax] = vs.xRange;
    const [yMin, yMax] = vs.yRange;
    const [zMin, zMax] = vs.zRange;
    const nx = ((x - xMin) / (xMax - xMin) - 0.5) * 2;
    const ny = ((y - yMin) / (yMax - yMin) - 0.5) * 2;
    const nz = ((z - zMin) / (zMax - zMin) - 0.5) * 2;
    const cx = Math.cos((vs.rotationX * Math.PI) / 180);
    const sx = Math.sin((vs.rotationX * Math.PI) / 180);
    const cy = Math.cos((vs.rotationY * Math.PI) / 180);
    const sy = Math.sin((vs.rotationY * Math.PI) / 180);
    const p1x = nx * cy + nz * sy;
    const p1y = ny;
    const p1z = -nx * sy + nz * cy;
    const p2x = p1x;
    const p2y = p1y * cx - p1z * sx;
    const p2z = p1y * sx + p1z * cx;
    const d = 3;
    const scale = d / (d + p2z);
    return [p2x * scale * 150, -p2y * scale * 150, p2z];
  }

  private drawGrid3D(_w: number, _h: number): void {
    this.ctx.strokeStyle = '#ffffff15';
    this.ctx.lineWidth = 0.8 / this.frameData.viewState.zoom;
    const vs = this.frameData.viewState;
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = vs.xRange[0] + t * (vs.xRange[1] - vs.xRange[0]);
      const y = vs.yRange[0] + t * (vs.yRange[1] - vs.yRange[0]);
      this.ctx.beginPath();
      for (let j = 0; j <= steps; j++) {
        const s = j / steps;
        const yv = vs.yRange[0] + s * (vs.yRange[1] - vs.yRange[0]);
        const [px, py] = this.project3D(x, yv, vs.zRange[0]);
        if (j === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.stroke();
      this.ctx.beginPath();
      for (let j = 0; j <= steps; j++) {
        const s = j / steps;
        const xv = vs.xRange[0] + s * (vs.xRange[1] - vs.xRange[0]);
        const [px, py] = this.project3D(xv, y, vs.zRange[0]);
        if (j === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.stroke();
    }
    this.ctx.strokeStyle = '#48dbfb';
    this.ctx.lineWidth = 1.5 / vs.zoom;
    const origin = this.project3D(0, 0, 0);
    const xEnd = this.project3D(vs.xRange[1], 0, 0);
    this.ctx.beginPath(); this.ctx.moveTo(origin[0], origin[1]); this.ctx.lineTo(xEnd[0], xEnd[1]); this.ctx.stroke();
    const yEnd = this.project3D(0, vs.yRange[1], 0);
    this.ctx.beginPath(); this.ctx.moveTo(origin[0], origin[1]); this.ctx.lineTo(yEnd[0], yEnd[1]); this.ctx.stroke();
    const zEnd = this.project3D(0, 0, vs.zRange[1]);
    this.ctx.beginPath(); this.ctx.moveTo(origin[0], origin[1]); this.ctx.lineTo(zEnd[0], zEnd[1]); this.ctx.stroke();
  }

  private drawSurface3D(pe: ParsedExpression): void {
    const vs = this.frameData.viewState;
    const steps = 40;
    const dx = (vs.xRange[1] - vs.xRange[0]) / steps;
    const dy = (vs.yRange[1] - vs.yRange[0]) / steps;
    const points: { x: number; y: number; p: [number, number, number]; z: number }[][] = [];
    for (let j = 0; j <= steps; j++) {
      points[j] = [];
      for (let i = 0; i <= steps; i++) {
        const x = vs.xRange[0] + i * dx;
        const y = vs.yRange[0] + j * dy;
        const z = pe.fn(x, y);
        const zc = isFinite(z) ? z : (vs.zRange[0] + vs.zRange[1]) / 2;
        points[j][i] = { x, y, p: this.project3D(x, y, zc), z: zc };
      }
    }
    if (pe.expression.type === '3d-contour') {
      this.ctx.lineWidth = 1.5 / vs.zoom;
      for (let j = 0; j < steps; j++) {
        for (let i = 0; i < steps; i++) {
          const avgZ = (points[j][i].z + points[j][i + 1].z + points[j + 1][i + 1].z + points[j + 1][i].z) / 4;
          const t = (avgZ - vs.zRange[0]) / (vs.zRange[1] - vs.zRange[0]);
          this.ctx.strokeStyle = this.colorMap(t, pe.expression.color);
          this.ctx.beginPath();
          this.ctx.moveTo(points[j][i].p[0], points[j][i].p[1]);
          this.ctx.lineTo(points[j][i + 1].p[0], points[j][i + 1].p[1]);
          this.ctx.lineTo(points[j + 1][i + 1].p[0], points[j + 1][i + 1].p[1]);
          this.ctx.lineTo(points[j + 1][i].p[0], points[j + 1][i].p[1]);
          this.ctx.closePath();
          this.ctx.stroke();
        }
      }
      return;
    }
    const triangles: { z: number; draw: () => void }[] = [];
    for (let j = 0; j < steps; j++) {
      for (let i = 0; i < steps; i++) {
        const p00 = points[j][i], p10 = points[j][i + 1], p01 = points[j + 1][i], p11 = points[j + 1][i + 1];
        const z1 = (p00.z + p10.z + p11.z) / 3;
        triangles.push({
          z: z1,
          draw: () => {
            const t = (z1 - vs.zRange[0]) / (vs.zRange[1] - vs.zRange[0]);
            this.ctx.fillStyle = this.colorMap(t, pe.expression.color, 0.85);
            this.ctx.strokeStyle = this.colorMap(t, pe.expression.color, 1);
            this.ctx.lineWidth = 0.5 / vs.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(p00.p[0], p00.p[1]);
            this.ctx.lineTo(p10.p[0], p10.p[1]);
            this.ctx.lineTo(p11.p[0], p11.p[1]);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
          },
        });
        const z2 = (p00.z + p11.z + p01.z) / 3;
        triangles.push({
          z: z2,
          draw: () => {
            const t = (z2 - vs.zRange[0]) / (vs.zRange[1] - vs.zRange[0]);
            this.ctx.fillStyle = this.colorMap(t, pe.expression.color, 0.85);
            this.ctx.strokeStyle = this.colorMap(t, pe.expression.color, 1);
            this.ctx.lineWidth = 0.5 / vs.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(p00.p[0], p00.p[1]);
            this.ctx.lineTo(p11.p[0], p11.p[1]);
            this.ctx.lineTo(p01.p[0], p01.p[1]);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
          },
        });
      }
    }
    triangles.sort((a, b) => a.z - b.z);
    for (const tri of triangles) tri.draw();
  }

  private drawExpression3Dto2D(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    const samples = 300;
    const dx = (vs.xRange[1] - vs.xRange[0]) / samples;
    this.ctx.strokeStyle = pe.expression.color;
    this.ctx.lineWidth = 2 / vs.zoom;
    this.ctx.beginPath();
    let started = false;
    for (let i = 0; i <= samples; i++) {
      const x = vs.xRange[0] + i * dx;
      const y = pe.fn(x);
      if (!isFinite(y)) { started = false; continue; }
      const p = this.project3D(x, y, vs.zRange[0]);
      if (!started) { this.ctx.moveTo(p[0], p[1]); started = true; }
      else this.ctx.lineTo(p[0], p[1]);
    }
    this.ctx.stroke();
    void w; void h;
  }

  private colorMap(t: number, baseColor: string, alpha: number = 1): string {
    const clamped = Math.max(0, Math.min(1, t));
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    const light = 0.3 + clamped * 0.7;
    const nr = Math.min(255, Math.round(r * light));
    const ng = Math.min(255, Math.round(g * light));
    const nb = Math.min(255, Math.round(b * light));
    if (alpha < 1) return `rgba(${nr},${ng},${nb},${alpha})`;
    return `rgb(${nr},${ng},${nb})`;
  }

  private getNiceStep(range: number): number {
    const rough = range / 10;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const n = rough / pow;
    if (n < 1.5) return pow;
    if (n < 3) return 2 * pow;
    if (n < 7) return 5 * pow;
    return 10 * pow;
  }
}

export const FUNCTION_TEMPLATES: { label: string; template: string; desc: string }[] = [
  { label: 'sin(x)', template: 'sin(x)', desc: '正弦函数' },
  { label: 'cos(x)', template: 'cos(x)', desc: '余弦函数' },
  { label: 'tan(x)', template: 'tan(x)', desc: '正切函数' },
  { label: 'exp(x)', template: 'exp(x)', desc: '指数函数 e^x' },
  { label: 'log(x)', template: 'log(x)', desc: '自然对数' },
  { label: 'log(x, base)', template: 'log(x, 10)', desc: '对数函数（可指定底）' },
  { label: 'pow(x, n)', template: 'pow(x, 2)', desc: '幂函数 x^n' },
  { label: 'sqrt(x)', template: 'sqrt(x)', desc: '平方根' },
  { label: 'abs(x)', template: 'abs(x)', desc: '绝对值' },
  { label: 'floor(x)', template: 'floor(x)', desc: '向下取整' },
  { label: 'ceil(x)', template: 'ceil(x)', desc: '向上取整' },
  { label: 'sin(x)*cos(a*x)', template: 'sin(x)*cos(a*x)', desc: '带参数a的调制波' },
  { label: 'a*sin(b*x)', template: 'a*sin(b*x)', desc: '振幅a频率b的正弦' },
  { label: 'x^2+y^2', template: 'x*x + y*y', desc: '3D抛物面' },
  { label: 'sin(sqrt(x^2+y^2))', template: 'sin(sqrt(x*x + y*y))', desc: '3D涟漪曲面' },
  { label: 'r=cos(2*theta)', template: 'cos(2*theta)', desc: '四叶玫瑰线(极坐标)' },
  { label: 'x^2+y^2=r^2', template: 'x*x + y*y = 4', desc: '圆形(隐函数)' },
];
