import { Grid, ViewTransform } from './grid';
import { PathManager } from './path';
import { Controls } from './controls';

const BG_COLOR = '#0a0a1a';
const SMOOTH_DELAY = 150;
const SCALE_MIN = 0.5;
const SCALE_MAX = 2.0;
const SCALE_STEP = 0.0015;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: Grid;
  private pathManager: PathManager;
  private controls: Controls;

  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private transform: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 };

  private isDrawing: boolean = false;
  private isPanning: boolean = false;
  private spacePressed: boolean = false;
  private lastDrawTime: number = 0;
  private lastPanPos: { x: number; y: number } = { x: 0, y: 0 };

  private targetCursor: { x: number; y: number } | null = null;
  private smoothedCursor: { x: number; y: number } | null = null;

  private lastFrameTime: number = 0;
  private rafId: number | null = null;

  constructor() {
    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas as HTMLCanvasElement;

    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.grid = new Grid(this.ctx);
    this.pathManager = new PathManager(this.ctx);
    this.controls = new Controls(
      () => this.handleClear(),
      () => this.handleExport()
    );

    this.setupCanvas();
    this.bindEvents();
    this.lastFrameTime = performance.now();
    this.loop();
  }

  private setupCanvas(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private hueFromScreenX(sx: number): number {
    const ratio = Math.max(0, Math.min(1, sx / this.width));
    return ratio * 270;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.spacePressed) {
        this.spacePressed = true;
        if (this.isDrawing) {
          this.isDrawing = false;
          this.pathManager.endPath();
          this.targetCursor = null;
          this.smoothedCursor = null;
        }
        this.canvas.style.cursor = 'grab';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spacePressed = false;
        this.isPanning = false;
        this.canvas.style.cursor = 'crosshair';
      }
    });

    window.addEventListener('blur', () => {
      this.spacePressed = false;
      this.isPanning = false;
      if (this.isDrawing) {
        this.isDrawing = false;
        this.pathManager.endPath();
        this.targetCursor = null;
        this.smoothedCursor = null;
      }
      this.canvas.style.cursor = 'crosshair';
    });
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const pos = this.getCanvasPos(e);

    if (this.spacePressed) {
      this.isPanning = true;
      this.lastPanPos = pos;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    this.isDrawing = true;
    this.lastDrawTime = performance.now();
    const hue = this.hueFromScreenX(pos.x);
    this.targetCursor = { ...pos };
    this.smoothedCursor = { ...pos };
    this.pathManager.startPath(hue);

    const world = this.grid.screenToWorld(pos.x, pos.y);
    this.pathManager.addPoint(world.x, world.y, hue, this.lastDrawTime);
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (this.isPanning) {
      const dx = pos.x - this.lastPanPos.x;
      const dy = pos.y - this.lastPanPos.y;
      this.transform.offsetX += dx;
      this.transform.offsetY += dy;
      this.lastPanPos = pos;
      this.grid.setTransform(this.transform);
      return;
    }

    if (this.isDrawing) {
      this.targetCursor = { ...pos };
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.spacePressed ? 'grab' : 'crosshair';
      return;
    }
    if (this.isDrawing) {
      this.isDrawing = false;
      this.pathManager.endPath();
      this.targetCursor = null;
      this.smoothedCursor = null;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const pos = this.getCanvasPos(e);
    const oldScale = this.transform.scale;
    let newScale = oldScale * Math.exp(-e.deltaY * SCALE_STEP);
    newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, newScale));
    const k = newScale / oldScale;
    this.transform.offsetX = pos.x - (pos.x - this.transform.offsetX) * k;
    this.transform.offsetY = pos.y - (pos.y - this.transform.offsetY) * k;
    this.transform.scale = newScale;
    this.grid.setTransform(this.transform);
  }

  private getCanvasPos(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private handleClear(): void {
    this.pathManager.clearAllAnimated();
  }

  private handleExport(): string {
    return this.pathManager.exportSVG(this.width, this.height);
  }

  private updateSmoothCursor(dt: number): void {
    if (!this.targetCursor || !this.smoothedCursor) return;
    const tau = SMOOTH_DELAY;
    const alpha = 1 - Math.exp(-dt / tau);
    this.smoothedCursor.x += (this.targetCursor.x - this.smoothedCursor.x) * alpha;
    this.smoothedCursor.y += (this.targetCursor.y - this.smoothedCursor.y) * alpha;
  }

  private addSmoothedPoint(now: number): void {
    if (!this.isDrawing || !this.smoothedCursor) return;
    const hue = this.hueFromScreenX(this.smoothedCursor.x);
    const world = this.grid.screenToWorld(this.smoothedCursor.x, this.smoothedCursor.y);
    this.pathManager.addPoint(world.x, world.y, hue, now);
  }

  private drawCursor(now: number): void {
    if (!this.isDrawing || !this.smoothedCursor) return;
    const ctx = this.ctx;
    const x = this.smoothedCursor.x;
    const y = this.smoothedCursor.y;
    const hue = this.hueFromScreenX(x);
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.008);

    ctx.save();
    const grd = ctx.createRadialGradient(x, y, 0, x, y, 18 * this.transform.scale * pulse);
    grd.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.9)`);
    grd.addColorStop(0.4, `hsla(${hue}, 100%, 65%, 0.4)`);
    grd.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, 18 * this.transform.scale * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsl(${hue}, 100%, 95%)`;
    ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(x, y, 2.5 * this.transform.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private render(now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);

    this.grid.draw(now, this.width, this.height);
    this.pathManager.draw(now, this.transform.scale, this.transform.offsetX, this.transform.offsetY);
    this.drawCursor(now);
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.updateSmoothCursor(dt);
    if (this.isDrawing && this.smoothedCursor) {
      this.addSmoothedPoint(now);
    }

    this.render(now);
    this.controls.updateCount(this.pathManager.getPathCount());

    this.rafId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

new App();
