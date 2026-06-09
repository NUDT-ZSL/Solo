import { Bubble } from './bubble.js';
import { Ripple } from './ripple.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface ConnectionLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  age: number;
  maxAge: number;
  hue: number;
}

export class Controller {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bubbles: Bubble[] = [];
  private ripples: Ripple[] = [];
  private particles: Particle[] = [];
  private connectionLines: ConnectionLine[] = [];

  private mouseX: number = 0;
  private mouseY: number = 0;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private isDragging: boolean = false;
  private dragMoved: boolean = false;
  private lastFrameTime: number = 0;
  private animationId: number = 0;

  private countDisplay: HTMLElement;
  private resetBtn: HTMLElement;

  private dpr: number = 1;
  private logicalW: number = 0;
  private logicalH: number = 0;

  private _pendingLineCheck: Array<{ b1: Bubble; b2: Bubble; time: number }> = [];

  constructor(canvas: HTMLCanvasElement, countDisplay: HTMLElement, resetBtn: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.countDisplay = countDisplay;
    this.resetBtn = resetBtn;
  }

  init(): void {
    this._resize();
    window.addEventListener('resize', this._resize);

    this.canvas.addEventListener('mousedown', this._onPointerDown);
    this.canvas.addEventListener('mousemove', this._onPointerMove);
    window.addEventListener('mouseup', this._onPointerUp);

    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd);

    this.resetBtn.addEventListener('click', this._onReset);

    this.lastFrameTime = performance.now();
    this.animationId = requestAnimationFrame(this._loop);
  }

  destroy(): void {
    window.removeEventListener('resize', this._resize);
    this.canvas.removeEventListener('mousedown', this._onPointerDown);
    this.canvas.removeEventListener('mousemove', this._onPointerMove);
    window.removeEventListener('mouseup', this._onPointerUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    this.resetBtn.removeEventListener('click', this._onReset);
    cancelAnimationFrame(this.animationId);
  }

  private _resize = (): void => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.logicalW = w;
    this.logicalH = h;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private _onPointerDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.isDragging = true;
    this.dragMoved = false;
  };

  private _onPointerMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    if (this.isDragging) {
      const dx = this.mouseX - this.prevMouseX;
      const dy = this.mouseY - this.prevMouseY;
      if (dx * dx + dy * dy > 4) this.dragMoved = true;
    }
  };

  private _onPointerUp = (_e: MouseEvent): void => {
    if (this.isDragging && !this.dragMoved) {
      this._handleClick(this.mouseX, this.mouseY);
    }
    this.isDragging = false;
  };

  private _onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = t.clientX - rect.left;
    this.mouseY = t.clientY - rect.top;
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.isDragging = true;
    this.dragMoved = false;
  };

  private _onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.mouseX = t.clientX - rect.left;
    this.mouseY = t.clientY - rect.top;
    if (this.isDragging) {
      const dx = this.mouseX - this.prevMouseX;
      const dy = this.mouseY - this.prevMouseY;
      if (dx * dx + dy * dy > 4) this.dragMoved = true;
    }
  };

  private _onTouchEnd = (_e: TouchEvent): void => {
    if (this.isDragging && !this.dragMoved) {
      this._handleClick(this.mouseX, this.mouseY);
    }
    this.isDragging = false;
  };

  private _onReset = (): void => {
    for (const b of this.bubbles) {
      b.startDying();
    }
  };

  private _handleClick(x: number, y: number): void {
    const now = performance.now();
    const bubble = new Bubble(x, y, now);
    this.bubbles.push(bubble);
    this.ripples.push(new Ripple(x, y, this.logicalW, this.logicalH));
    this._updateCount();
  }

  private _updateCount(): void {
    const alive = this.bubbles.filter(b => !b.dying).length;
    this.countDisplay.textContent = String(alive);
    this.countDisplay.style.color = alive > 80 ? '#ff9fb0' : alive > 50 ? '#c4a8ff' : '#7fb8ff';
  }

  private _loop = (timestamp: number): void => {
    const dt = Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    this._updatePhysics(dt, timestamp);
    this._render();

    this.animationId = requestAnimationFrame(this._loop);
  };

  private _updatePhysics(dt: number, now: number): void {
    if (this.isDragging && this.dragMoved) {
      const count = 5 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 10 + Math.random() * 25;
        const r = 1 + Math.random() * 1.5;
        this.particles.push({
          x: this.mouseX + (Math.random() - 0.5) * 8,
          y: this.mouseY + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 5,
          radius: r,
          alpha: 0.8 + Math.random() * 0.2,
          life: 0,
          maxLife: 0.55 + Math.random() * 0.15,
          hue: 240 + Math.random() * 50
        });
      }
      if (this.particles.length > 400) {
        this.particles.splice(0, this.particles.length - 400);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      p.alpha = (1 - t) * 0.9;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.vy += 8 * dt;
    }

    if (this.isDragging && this.dragMoved) {
      for (const b of this.bubbles) {
        b.applyAttraction(this.mouseX, this.mouseY, dt);
      }
    }

    this._pendingLineCheck.length = 0;
    const n = this.bubbles.length;
    const maxPairs = Math.min(n * (n - 1) / 2, 600);
    let pairsChecked = 0;
    for (let i = 0; i < n && pairsChecked < maxPairs; i++) {
      for (let j = i + 1; j < n && pairsChecked < maxPairs; j++) {
        pairsChecked++;
        const b1 = this.bubbles[i];
        const b2 = this.bubbles[j];
        if (b1.dying || b2.dying) continue;
        const res = b1.applyRepulsion(b2, now);
        if (res.triggered) {
          this._pendingLineCheck.push({ b1, b2, time: now });
        }
      }
    }

    for (const { b1, b2, time } of this._pendingLineCheck) {
      let alreadyExists = false;
      for (const line of this.connectionLines) {
        const dx1 = line.x1 - b1.x;
        const dy1 = line.y1 - b1.y;
        const dx2 = line.x2 - b2.x;
        const dy2 = line.y2 - b2.y;
        if ((dx1 * dx1 + dy1 * dy1 < 100 && dx2 * dx2 + dy2 * dy2 < 100) ||
            (dx1 * dx1 + dy1 * dy1 < 100 && dx2 * dx2 + dy2 * dy2 < 100 &&
             (line.x1 === b2.x && line.y1 === b2.y))) {
          alreadyExists = true;
          line.age = 0;
          break;
        }
      }
      if (!alreadyExists) {
        this.connectionLines.push({
          x1: b1.x, y1: b1.y,
          x2: b2.x, y2: b2.y,
          alpha: 0,
          age: 0,
          maxAge: 0.3,
          hue: 200 + Math.random() * 20
        });
        void time;
      }
    }

    for (let i = this.connectionLines.length - 1; i >= 0; i--) {
      const line = this.connectionLines[i];
      line.age += dt;
      const t = line.age / line.maxAge;
      if (t >= 1) {
        this.connectionLines.splice(i, 1);
        continue;
      }
      line.alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const alive = this.bubbles[i].update(dt, this.logicalW, this.logicalH, now);
      if (!alive) {
        this.bubbles.splice(i, 1);
        this._updateCount();
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const alive = this.ripples[i].update(dt, this.logicalW, this.logicalH);
      if (!alive || this.ripples[i].isDead()) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private _render(): void {
    const ctx = this.ctx;
    const w = this.logicalW;
    const h = this.logicalH;

    ctx.clearRect(0, 0, w, h);

    this._renderBackground(ctx, w, h);

    ctx.globalCompositeOperation = 'lighter';

    for (const ripple of this.ripples) {
      ripple.render(ctx);
    }

    for (const p of this.particles) {
      if (p.alpha <= 0.02) continue;
      const glow = p.radius * 3;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
      g.addColorStop(0, `hsla(${p.hue}, 100%, 78%, ${p.alpha})`);
      g.addColorStop(0.5, `hsla(${p.hue}, 95%, 68%, ${p.alpha * 0.4})`);
      g.addColorStop(1, `hsla(${p.hue}, 90%, 60%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const line of this.connectionLines) {
      if (line.alpha <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = line.alpha * 0.8;
      const grad = ctx.createLinearGradient(line.x1, line.y1, line.x2, line.y2);
      grad.addColorStop(0, `hsla(${line.hue}, 100%, 78%, 0)`);
      grad.addColorStop(0.5, `hsla(${line.hue}, 100%, 80%, ${line.alpha})`);
      grad.addColorStop(1, `hsla(${line.hue}, 100%, 78%, 0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsla(${line.hue}, 100%, 75%, 0.6)`;
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';

    for (const bubble of this.bubbles) {
      bubble.render(ctx);
    }
  }

  private _renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.max(w, h) * 0.7;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(15, 30, 55, 0.35)');
    g.addColorStop(0.5, 'rgba(8, 16, 32, 0.15)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const vignette = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.1);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }
}
