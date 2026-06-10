import { Loom } from './loom.js';
import { UI } from './ui.js';

function pad(n: number, w = 2): string {
  return String(n).padStart(w, '0');
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function downloadDataURL(dataURL: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

class App {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  loom: Loom;
  ui: UI;

  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private lastTime: number = 0;
  private rafId: number = 0;
  private draggingMoved: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  constructor() {
    const c = document.getElementById('mainCanvas') as HTMLCanvasElement | null;
    if (!c) throw new Error('mainCanvas not found');
    this.canvas = c;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;

    this.loom = new Loom();
    this.ui = new UI();

    this.resize();
    this.loom.setViewport(window.innerWidth, window.innerHeight);
    this.loom.initParticles(2000);
    this.ui.bindEvents(this.loom);

    this.ui.onReset(() => {
      this.loom.reset();
      this.ui.resetSliders(this.loom);
    });

    this.ui.onSave(() => {
      const url = this.loom.getSnapshotDataURL(this.canvas);
      const fn = `星尘织机_${formatDate(new Date())}.png`;
      downloadDataURL(url, fn);
    });

    this.bindEvents();
  }

  private resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.loom.setViewport(w, h);
    if (this.loom.pool.activeCount() === 0) {
      this.loom.initParticles(2000);
    }
  };

  private toLoomCoord(clientX: number, clientY: number): { lx: number; ly: number } {
    const rect = this.canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    return {
      lx: cx - this.loom.getOffsetX(),
      ly: cy - this.loom.getOffsetY()
    };
  }

  private onPointerDown = (e: PointerEvent): void => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { lx, ly } = this.toLoomCoord(e.clientX, e.clientY);
    if (!this.loom.containsPoint(lx, ly)) return;
    this.isDragging = true;
    this.draggingMoved = false;
    this.lastX = lx;
    this.lastY = ly;
    this.dragStartX = lx;
    this.dragStartY = ly;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const { lx, ly } = this.toLoomCoord(e.clientX, e.clientY);
    const dx = lx - this.lastX;
    const dy = ly - this.lastY;
    const startDx = lx - this.dragStartX;
    const startDy = ly - this.dragStartY;
    if (startDx * startDx + startDy * startDy > 25) {
      this.draggingMoved = true;
    }
    if (this.loom.containsPoint(lx, ly)) {
      this.loom.addTrailPoint(lx, ly);
      this.loom.distortRegion(lx, ly, dx, dy);
    }
    this.lastX = lx;
    this.lastY = ly;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const { lx, ly } = this.toLoomCoord(e.clientX, e.clientY);
    this.isDragging = false;
    if (!this.draggingMoved && this.loom.containsPoint(lx, ly)) {
      this.loom.burstAt(lx, ly);
    } else {
      this.loom.beginReturnForDistorted();
    }
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  private renderBackground(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const g = this.ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1A1A1A');
    g.addColorStop(1, '#0B132B');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, w, h);
  }

  private loop = (t: number): void => {
    if (!this.lastTime) this.lastTime = t;
    let dt = (t - this.lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastTime = t;

    this.loom.update(dt);
    this.renderBackground();
    this.loom.render(this.ctx);
    this.ui.updatePreview(this.loom);

    this.rafId = requestAnimationFrame(this.loop);
  };

  start(): void {
    this.lastTime = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new App();
    app.start();
  } catch (err) {
    console.error('App init failed:', err);
  }
});
