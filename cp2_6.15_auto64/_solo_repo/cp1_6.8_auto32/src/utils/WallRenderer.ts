import { Capsule, Duration, getDurationColor, isExpired } from './CapsuleEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  phase: number;
}

interface FlyingCapsule {
  capsule: Capsule;
  fromX: number;
  fromY: number;
  startTime: number;
  duration: number;
  done: boolean;
}

interface HoveredCapsule {
  capsule: Capsule;
  screenX: number;
  screenY: number;
}

export type WallRendererCallbacks = {
  onCapsuleClick: (capsule: Capsule) => void;
  onCapsuleHover: (capsule: Capsule | null, x: number, y: number) => void;
};

export class WallRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private capsules: Capsule[] = [];
  private particles: Particle[] = [];
  private flyingCapsules: FlyingCapsule[] = [];
  private animFrameId: number = 0;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;
  private mouseX: number = -1;
  private mouseY: number = -1;
  private hoveredCapsule: Capsule | null = null;
  private callbacks: WallRendererCallbacks;
  private visible: boolean = true;
  private lastTime: number = 0;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private particleFrameCount: number = 0;
  private capsuleSize: number = 28;

  constructor(canvas: HTMLCanvasElement, callbacks: WallRendererCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this.bindedHandleClick);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  private bindedHandleClick = (e: MouseEvent) => {
    this.handleClick(e);
  };

  init(capsules: Capsule[]) {
    this.capsules = capsules;
    this.handleResize();
    this.initParticles();
    this.initOffscreen();
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.bindedHandleClick);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.lastTime = performance.now();
    this.render();
  }

  private handleVisibility() {
    this.visible = !document.hidden;
    if (this.visible) {
      this.lastTime = performance.now();
      this.render();
    }
  }

  private handleResize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.width < 768) {
      this.capsuleSize = 20;
    } else if (this.width < 1024) {
      this.capsuleSize = 24;
    } else {
      this.capsuleSize = 28;
    }

    this.initOffscreen();
  }

  private initParticles() {
    const count = this.width < 768 ? 40 : this.width < 1024 ? 70 : 120;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.5 + 0.5,
        alpha: 0,
        baseAlpha: Math.random() * 0.3 + 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private initOffscreen() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width * this.dpr;
    this.offscreenCanvas.height = this.height * this.dpr;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.offscreenCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.particleFrameCount = 0;
  }

  updateCapsules(capsules: Capsule[]) {
    this.capsules = capsules;
  }

  addFlyingCapsule(capsule: Capsule, fromX: number, fromY: number) {
    this.flyingCapsules.push({
      capsule,
      fromX,
      fromY,
      startTime: performance.now(),
      duration: 1200,
      done: false,
    });
  }

  private render() {
    if (!this.visible) return;

    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx, now);
    this.drawParticlesLayer(ctx, now, dt);
    this.drawCapsules(ctx, now);
    this.drawFlyingCapsules(ctx, now);
    this.drawHoverEffect(ctx, now);

    this.animFrameId = requestAnimationFrame(() => this.render());
  }

  private drawBackground(ctx: CanvasRenderingContext2D, _time: number) {
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#0f0f2e');
    gradient.addColorStop(0.5, '#0a0a1a');
    gradient.addColorStop(1, '#050510');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawParticlesLayer(ctx: CanvasRenderingContext2D, time: number, dt: number) {
    this.particleFrameCount++;
    for (const p of this.particles) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(time * 0.001 + p.phase));

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 200, 255, ${p.alpha})`;
      ctx.fill();
    }
  }

  private drawCapsules(ctx: CanvasRenderingContext2D, time: number) {
    for (const capsule of this.capsules) {
      this.drawSingleCapsule(ctx, capsule, time, capsule.wallX * this.width, capsule.wallY * this.height, 1);
    }
  }

  private drawSingleCapsule(
    ctx: CanvasRenderingContext2D,
    capsule: Capsule,
    time: number,
    x: number,
    y: number,
    scale: number
  ) {
    const colors = getDurationColor(capsule.duration);
    const size = this.capsuleSize * scale;
    const halfW = size * 0.8;
    const halfH = size * 0.45;

    const floatOffset = Math.sin(time * 0.001 + capsule.floatPhase) * 4;
    const cy = y + floatOffset;
    const rotation = time * capsule.rotationSpeed + capsule.floatPhase;

    const pulseAlpha = 0.3 + 0.25 * Math.sin(time * 0.002 + capsule.pulsePhase);

    ctx.save();
    ctx.translate(x, cy);
    ctx.rotate(rotation * 0.3);

    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.beginPath();
    ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);

    const grad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
    grad.addColorStop(0, colors.primary);
    grad.addColorStop(1, colors.secondary);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.85 + pulseAlpha * 0.15;
    ctx.fill();

    ctx.shadowBlur = 0;

    const innerGrad = ctx.createRadialGradient(
      -halfW * 0.3, -halfH * 0.3, 0,
      0, 0, halfW
    );
    innerGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    innerGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + pulseAlpha * 0.15})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawFlyingCapsules(ctx: CanvasRenderingContext2D, time: number) {
    const toRemove: number[] = [];
    for (let i = 0; i < this.flyingCapsules.length; i++) {
      const fc = this.flyingCapsules[i];
      const elapsed = time - fc.startTime;
      const t = Math.min(elapsed / fc.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      const targetX = fc.capsule.wallX * this.width;
      const targetY = fc.capsule.wallY * this.height;
      const cpX = (fc.fromX + targetX) / 2 + (targetX - fc.fromX) * 0.3;
      const cpY = fc.fromY - 100;

      const x = (1 - eased) * (1 - eased) * fc.fromX + 2 * (1 - eased) * eased * cpX + eased * eased * targetX;
      const y = (1 - eased) * (1 - eased) * fc.fromY + 2 * (1 - eased) * eased * cpY + eased * eased * targetY;

      const scale = 0.5 + eased * 0.5;

      ctx.save();
      ctx.globalAlpha = 1 - t * 0.3;
      this.drawSingleCapsule(ctx, fc.capsule, time, x, y, scale);
      ctx.restore();

      if (t >= 1) {
        toRemove.push(i);
        if (!this.capsules.find(c => c.id === fc.capsule.id)) {
          this.capsules.push(fc.capsule);
        }
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.flyingCapsules.splice(toRemove[i], 1);
    }
  }

  private drawHoverEffect(ctx: CanvasRenderingContext2D, time: number) {
    if (!this.hoveredCapsule) return;

    const capsule = this.hoveredCapsule;
    const x = capsule.wallX * this.width;
    const y = capsule.wallY * this.height;
    const colors = getDurationColor(capsule.duration);
    const size = this.capsuleSize * 1.35;
    const halfW = size * 0.8;
    const halfH = size * 0.45;
    const floatOffset = Math.sin(time * 0.001 + capsule.floatPhase) * 4;
    const cy = y + floatOffset;

    ctx.save();
    ctx.translate(x, cy);

    ctx.beginPath();
    ctx.ellipse(0, 0, halfW + 6, halfH + 6, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,0.3)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    const labelText = isExpired(capsule) ? '已到期' : formatDateShort(capsule.openAt);
    ctx.save();
    ctx.font = '11px "Noto Sans SC", sans-serif';
    const metrics = ctx.measureText(labelText);
    const labelW = metrics.width + 12;
    const labelH = 20;
    const labelX = x - labelW / 2;
    const labelY = cy - halfH - labelH - 6;

    ctx.fillStyle = 'rgba(15, 15, 46, 0.85)';
    ctx.beginPath();
    roundRect(ctx, labelX, labelY, labelW, labelH, 4);
    ctx.fill();
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, x, labelY + labelH / 2);
    ctx.restore();
  }

  private getCapsuleScreenPos(capsule: Capsule): { x: number; y: number } {
    const x = capsule.wallX * this.width;
    const y = capsule.wallY * this.height;
    const floatOffset = Math.sin(performance.now() * 0.001 + capsule.floatPhase) * 4;
    return { x, y: y + floatOffset };
  }

  private hitTest(mx: number, my: number): Capsule | null {
    for (let i = this.capsules.length - 1; i >= 0; i--) {
      const c = this.capsules[i];
      const pos = this.getCapsuleScreenPos(c);
      const halfW = this.capsuleSize * 0.8;
      const halfH = this.capsuleSize * 0.45;
      const dx = (mx - pos.x) / halfW;
      const dy = (my - pos.y) / halfH;
      if (dx * dx + dy * dy <= 1.2) return c;
    }
    return null;
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    const hit = this.hitTest(this.mouseX, this.mouseY);
    this.hoveredCapsule = hit;
    this.canvas.style.cursor = hit ? 'pointer' : 'default';
    this.callbacks.onCapsuleHover(hit, this.mouseX, this.mouseY);
  }

  private handleClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = this.hitTest(mx, my);
    if (hit) {
      this.callbacks.onCapsuleClick(hit);
    }
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    this.mouseX = touch.clientX - rect.left;
    this.mouseY = touch.clientY - rect.top;
    const hit = this.hitTest(this.mouseX, this.mouseY);
    this.hoveredCapsule = hit;
    this.callbacks.onCapsuleHover(hit, this.mouseX, this.mouseY);
  }

  private handleTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    const hit = this.hitTest(mx, my);
    if (hit) {
      this.callbacks.onCapsuleClick(hit);
    }
    setTimeout(() => {
      this.hoveredCapsule = null;
      this.callbacks.onCapsuleHover(null, 0, 0);
    }, 2000);
  }

  destroy() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.bindedHandleClick);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
