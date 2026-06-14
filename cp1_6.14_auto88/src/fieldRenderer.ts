import { GravityEngine, GravitySource, Particle } from './gravityEngine';

export type SourceDoubleClickCallback = (x: number, y: number) => void;
export type SourceChangeCallback = () => void;

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export class FieldRenderer {
  private container: HTMLElement;
  private engine: GravityEngine;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private view: ViewState = {
    zoom: 1,
    offsetX: 0,
    offsetY: 0
  };

  private isDragging = false;
  private isPanning = false;
  private dragSourceId: string | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private mouseDownPos = { x: 0, y: 0 };

  private hoveredSourceId: string | null = null;

  private onSourceDoubleClick: SourceDoubleClickCallback | null = null;
  private onSourceChange: SourceChangeCallback | null = null;

  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(container: HTMLElement, engine: GravityEngine) {
    this.container = container;
    this.engine = engine;

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.ctx = this.canvas.getContext('2d')!;

    this.dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    container.appendChild(this.canvas);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const x = (screenX - this.width / 2) / this.view.zoom + this.view.offsetX;
    const y = (screenY - this.height / 2) / this.view.zoom + this.view.offsetY;
    return { x, y };
  }

  private hitTestSource(wx: number, wy: number): string | null {
    const sources = this.engine.getSources();
    for (let i = sources.length - 1; i >= 0; i--) {
      const s = sources[i];
      const dist = Math.hypot(wx - s.x, wy - s.y);
      const scale = this.hoveredSourceId === s.id ? 1.2 : 1.0;
      if (dist < s.radius * scale + 4) {
        return s.id;
      }
    }
    return null;
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };

    const world = this.screenToWorld(sx, sy);
    const hit = this.hitTestSource(world.x, world.y);

    if (hit) {
      this.isDragging = true;
      this.dragSourceId = hit;
      this.canvas.style.cursor = 'grab';
    } else {
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (this.isDragging && this.dragSourceId) {
      const world = this.screenToWorld(sx, sy);
      this.engine.updateSourcePosition(this.dragSourceId, world.x, world.y);
      if (this.onSourceChange) {
        this.onSourceChange();
      }
      this.canvas.style.cursor = 'grab';
    } else if (this.isPanning) {
      const dx = (e.clientX - this.lastMouseX) / this.view.zoom;
      const dy = (e.clientY - this.lastMouseY) / this.view.zoom;
      this.view.offsetX -= dx;
      this.view.offsetY -= dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else {
      const world = this.screenToWorld(sx, sy);
      const hit = this.hitTestSource(world.x, world.y);
      if (hit !== this.hoveredSourceId) {
        this.hoveredSourceId = hit;
      }
      this.canvas.style.cursor = hit ? 'grab' : 'default';
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragSourceId = null;
    }
    if (this.isPanning) {
      this.isPanning = false;
    }
    this.canvas.style.cursor = 'default';
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.dragSourceId = null;
    this.isPanning = false;
    this.hoveredSourceId = null;
    this.canvas.style.cursor = 'default';
  }

  private onDoubleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);
    const hit = this.hitTestSource(world.x, world.y);
    if (!hit && this.onSourceDoubleClick) {
      this.onSourceDoubleClick(world.x, world.y);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const worldBefore = this.screenToWorld(sx, sy);

    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    this.view.zoom = Math.max(0.5, Math.min(2.0, this.view.zoom * factor));

    const worldAfter = this.screenToWorld(sx, sy);
    this.view.offsetX += worldBefore.x - worldAfter.x;
    this.view.offsetY += worldBefore.y - worldAfter.y;
  }

  private onResize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
  }

  public setOnSourceDoubleClick(cb: SourceDoubleClickCallback): void {
    this.onSourceDoubleClick = cb;
  }

  public setOnSourceChange(cb: SourceChangeCallback): void {
    this.onSourceChange = cb;
  }

  public resetView(): void {
    this.view = { zoom: 1, offsetX: 0, offsetY: 0 };
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.view.zoom, this.view.zoom);
    ctx.translate(-this.view.offsetX, -this.view.offsetY);

    this.drawGrid(ctx);
    this.drawTrails(ctx);
    this.drawSources(ctx);
    this.drawParticles(ctx);

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const step = 80;
    const vw = this.width / this.view.zoom;
    const vh = this.height / this.view.zoom;
    const left = this.view.offsetX - vw / 2 - step;
    const right = this.view.offsetX + vw / 2 + step;
    const top = this.view.offsetY - vh / 2 - step;
    const bottom = this.view.offsetY + vh / 2 + step;

    const startX = Math.floor(left / step) * step;
    const startY = Math.floor(top / step) * step;

    ctx.strokeStyle = '#151525';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = startX; x <= right; x += step) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = startY; y <= bottom; y += step) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, 0);
    ctx.lineTo(right, 0);
    ctx.moveTo(0, top);
    ctx.lineTo(0, bottom);
    ctx.stroke();
  }

  private drawSources(ctx: CanvasRenderingContext2D): void {
    const sources = this.engine.getSources();
    for (const source of sources) {
      const isHovered = this.hoveredSourceId === source.id;
      const scale = isHovered ? 1.2 : 1.0;
      const r = source.radius * scale;

      ctx.save();
      ctx.beginPath();
      ctx.arc(source.x, source.y, r, 0, Math.PI * 2);

      const grad = ctx.createRadialGradient(source.x, source.y, 0, source.x, source.y, r);
      grad.addColorStop(0, source.color);
      grad.addColorStop(0.7, source.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(source.x, source.y, r * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = source.color;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      if (isHovered) {
        ctx.font = `bold ${14 / this.view.zoom}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`质量: ${source.mass.toFixed(1)}`, source.x, source.y - r - 6);
      }

      ctx.restore();
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D): void {
    const particles = this.engine.getParticles();
    for (const particle of particles) {
      const trail = particle.trail;
      if (trail.length < 2) continue;

      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1];
        const p1 = trail[i];

        const t = i / (trail.length - 1);
        const r = Math.round(0 + t * 255);
        const g = Math.round(210 - t * 103);
        const b = Math.round(255 - t * 148);

        const alpha = Math.max(0, p1.alpha) * 0.85;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.engine.getParticles();
    for (const particle of particles) {
      if (particle.dead) continue;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00d2ff';
      ctx.shadowColor = '#00d2ff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
