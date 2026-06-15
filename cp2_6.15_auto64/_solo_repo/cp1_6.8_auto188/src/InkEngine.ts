type InkColorType = 'black' | 'vermilion' | 'azurite';

const COLOR_MAP: Record<InkColorType, string> = {
  black: '#1A1A1A',
  vermilion: '#C23B22',
  azurite: '#2E5C8A',
};

interface InkPoint {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  color: string;
  createdAt: number;
  spreadRate: number;
  fadeRate: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

interface StrokeData {
  totalLength: number;
  pointCount: number;
  avgSpeed: number;
  directionChanges: number;
  duration: number;
}

type StrokeEndCallback = (stroke: StrokeData, x: number, y: number) => void;
type ClickCallback = (x: number, y: number) => void;

export class InkEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;

  private inkParticles: InkPoint[] = [];
  private burstParticles: BurstParticle[] = [];
  private bgParticles: BackgroundParticle[] = [];

  private isDrawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private lastTime: number = 0;
  private currentStrokePoints: { x: number; y: number; time: number }[] = [];
  private strokeLength: number = 0;
  private strokeDirectionChanges: number = 0;
  private lastDx: number = 0;
  private lastDy: number = 0;

  private animFrameId: number = 0;
  private lastFrameTime: number = 0;

  private currentColor: InkColorType = 'black';
  private onStrokeEnd: StrokeEndCallback | null = null;
  private onClick: ClickCallback | null = null;

  private static readonly BG_PARTICLE_COUNT = 40;
  private static readonly MIN_RADIUS = 2;
  private static readonly MAX_RADIUS = 20;
  private static readonly BURST_COUNT = 20;
  private static readonly SPREAD_RATE = 0.3;
  private static readonly FADE_RATE = 0.08;
  private static readonly INK_LIFETIME = 8000;
  private static readonly DRAG_THRESHOLD = 5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;

    this.offscreen = document.createElement('canvas');
    const offCtx = this.offscreen.getContext('2d', { alpha: true });
    if (!offCtx) throw new Error('Cannot get offscreen 2d context');
    this.offCtx = offCtx;

    this.resize();
    this.initBgParticles();
    this.bindEvents();
    this.startLoop();
  }

  setColor(color: InkColorType) {
    this.currentColor = color;
  }

  onStrokeEndCallback(cb: StrokeEndCallback) {
    this.onStrokeEnd = cb;
  }

  onClickCallback(cb: ClickCallback) {
    this.onClick = cb;
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.offscreen.width = this.canvas.width;
    this.offscreen.height = this.canvas.height;
    this.offCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.initBgParticles();
  }

  reset() {
    this.inkParticles = [];
    this.burstParticles = [];
    this.offCtx.clearRect(0, 0, this.width, this.height);
  }

  exportPNG(): string {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvas.width;
    exportCanvas.height = this.canvas.height;
    const exportCtx = exportCanvas.getContext('2d')!;
    exportCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    exportCtx.fillStyle = '#F5F0E8';
    exportCtx.fillRect(0, 0, this.width, this.height);
    exportCtx.drawImage(this.offscreen, 0, 0, this.width, this.height);
    exportCtx.setTransform(1, 0, 0, 1, 0, 0);
    exportCtx.drawImage(this.canvas, 0, 0);
    return exportCanvas.toDataURL('image/png');
  }

  destroy() {
    cancelAnimationFrame(this.animFrameId);
    this.unbindEvents();
  }

  private initBgParticles() {
    this.bgParticles = [];
    for (let i = 0; i < InkEngine.BG_PARTICLE_COUNT; i++) {
      this.bgParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1 + Math.random() * 2,
        opacity: 0.05 + Math.random() * 0.15,
      });
    }
  }

  private bindEvents() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }

  private unbindEvents() {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e);
    this.startStroke(pos.x, pos.y);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDrawing) return;
    const pos = this.getCanvasPos(e);
    this.continueStroke(pos.x, pos.y);
  };

  private handleMouseUp = () => {
    this.endStroke();
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch);
    this.startStroke(pos.x, pos.y);
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.isDrawing) return;
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch);
    this.continueStroke(pos.x, pos.y);
  };

  private handleTouchEnd = () => {
    this.endStroke();
  };

  private startStroke(x: number, y: number) {
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    this.lastTime = performance.now();
    this.currentStrokePoints = [{ x, y, time: this.lastTime }];
    this.strokeLength = 0;
    this.strokeDirectionChanges = 0;
    this.lastDx = 0;
    this.lastDy = 0;

    this.addInkPoint(x, y, InkEngine.MAX_RADIUS * 0.6);
  }

  private continueStroke(x: number, y: number) {
    const now = performance.now();
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    const dt = now - this.lastTime;
    const speed = dt > 0 ? dist / dt : 0;

    const t = Math.min(speed / 2, 1);
    const radius = InkEngine.MAX_RADIUS * (1 - t) + InkEngine.MIN_RADIUS * t;

    this.addInkPoint(x, y, radius);

    this.strokeLength += dist;
    if (this.lastDx !== 0 || this.lastDy !== 0) {
      const cross = this.lastDx * dy - this.lastDy * dx;
      if (Math.abs(cross) > 50) {
        this.strokeDirectionChanges++;
      }
    }
    this.lastDx = dx;
    this.lastDy = dy;

    this.currentStrokePoints.push({ x, y, time: now });
    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
  }

  private endStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const strokeDuration = this.currentStrokePoints.length > 1
      ? this.currentStrokePoints[this.currentStrokePoints.length - 1].time - this.currentStrokePoints[0].time
      : 0;

    const isClick = this.strokeLength < InkEngine.DRAG_THRESHOLD && this.currentStrokePoints.length <= 2;

    if (isClick && this.onClick) {
      this.onClick(this.lastX, this.lastY);
      this.createBurst(this.lastX, this.lastY);
    } else if (this.onStrokeEnd && this.currentStrokePoints.length > 1) {
      const avgSpeed = strokeDuration > 0 ? this.strokeLength / strokeDuration : 0;
      this.onStrokeEnd(
        {
          totalLength: this.strokeLength,
          pointCount: this.currentStrokePoints.length,
          avgSpeed,
          directionChanges: this.strokeDirectionChanges,
          duration: strokeDuration,
        },
        this.lastX,
        this.lastY
      );
    }

    this.currentStrokePoints = [];
  }

  private addInkPoint(x: number, y: number, radius: number) {
    const color = COLOR_MAP[this.currentColor];
    const now = performance.now();

    this.inkParticles.push({
      x,
      y,
      radius,
      opacity: 0.7 + Math.random() * 0.3,
      color,
      createdAt: now,
      spreadRate: InkEngine.SPREAD_RATE + Math.random() * 0.2,
      fadeRate: InkEngine.FADE_RATE + Math.random() * 0.04,
    });

    this.drawInkToOffscreen(x, y, radius, color, 0.85);
  }

  private drawInkToOffscreen(x: number, y: number, radius: number, color: string, opacity: number) {
    this.offCtx.save();
    const r = Math.max(radius, 0.5);
    const gradient = this.offCtx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, this.colorWithAlpha(color, opacity));
    gradient.addColorStop(0.5, this.colorWithAlpha(color, opacity * 0.6));
    gradient.addColorStop(1, this.colorWithAlpha(color, 0));
    this.offCtx.fillStyle = gradient;
    this.offCtx.beginPath();
    this.offCtx.arc(x, y, r, 0, Math.PI * 2);
    this.offCtx.fill();
    this.offCtx.restore();
  }

  private createBurst(x: number, y: number) {
    const color = COLOR_MAP[this.currentColor];
    for (let i = 0; i < InkEngine.BURST_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / InkEngine.BURST_COUNT + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 3;
      const life = 600 + Math.random() * 800;
      this.burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 3,
        opacity: 0.8 + Math.random() * 0.2,
        color,
        life,
        maxLife: life,
      });
    }
  }

  private colorWithAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
  }

  private startLoop() {
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      const dt = Math.min(now - this.lastFrameTime, 33.33);
      this.lastFrameTime = now;
      this.update(dt);
      this.render();
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    const now = performance.now();
    const dtSec = dt / 1000;

    this.inkParticles = this.inkParticles.filter((p) => {
      const age = now - p.createdAt;
      if (age > InkEngine.INK_LIFETIME) return false;
      p.radius += p.spreadRate * dtSec * 10;
      const ageRatio = age / InkEngine.INK_LIFETIME;
      p.opacity = Math.max(0, p.opacity - p.fadeRate * dtSec);
      return p.opacity > 0.01;
    });

    this.burstParticles = this.burstParticles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.x += p.vx * dtSec * 60;
      p.y += p.vy * dtSec * 60;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.opacity = (p.life / p.maxLife) * 0.8;
      p.radius = Math.max(0.5, p.radius * 0.998);
      return true;
    });

    this.bgParticles.forEach((p) => {
      p.x += p.vx * dtSec * 60;
      p.y += p.vy * dtSec * 60;
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    });
  }

  private render() {
    this.ctx.fillStyle = '#F5F0E8';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.renderBgParticles();

    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.offscreen, 0, 0);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.restore();

    this.renderInkSpread();
    this.renderBurstParticles();
  }

  private renderBgParticles() {
    this.bgParticles.forEach((p) => {
      this.ctx.save();
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = '#1A1A1A';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private renderInkSpread() {
    this.inkParticles.forEach((p) => {
      this.ctx.save();
      const r = Math.max(p.radius, 0.5);
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gradient.addColorStop(0, this.colorWithAlpha(p.color, p.opacity * 0.5));
      gradient.addColorStop(0.7, this.colorWithAlpha(p.color, p.opacity * 0.2));
      gradient.addColorStop(1, this.colorWithAlpha(p.color, 0));
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private renderBurstParticles() {
    this.burstParticles.forEach((p) => {
      this.ctx.save();
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }
}
