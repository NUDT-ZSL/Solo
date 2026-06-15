import { PulseRing } from './PulseRing';
import { ParticleTrailManager } from './ParticleTrail';
import { BackgroundFlow } from './BackgroundFlow';
import { ControlPanel, ControlState } from './ControlPanel';

interface Ripple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

class PulseMemoryApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  private pulseRings: PulseRing[] = [];
  private particleManager: ParticleTrailManager;
  private backgroundFlow: BackgroundFlow;
  private controlPanel: ControlPanel;

  private ripples: Ripple[] = [];

  private isDragging: boolean = false;
  private dragStartPos: { x: number; y: number } | null = null;

  private state: ControlState = {
    decayRate: 0.05,
    particleSize: 5,
    colorOffset: 0
  };

  private readonly MAX_PULSE_RINGS = 200;
  private readonly RIPPLE_DURATION = 300;

  private animationId: number = 0;
  private lastFrameTime: number = 0;

  private cursorCanvas: HTMLCanvasElement;
  private cursorCtx: CanvasRenderingContext2D;
  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private isMouseInCanvas: boolean = false;

  constructor() {
    const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('Canvas element #stage not found');
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.particleManager = new ParticleTrailManager();
    this.backgroundFlow = new BackgroundFlow(canvas);

    this.cursorCanvas = document.createElement('canvas');
    this.cursorCanvas.width = 32;
    this.cursorCanvas.height = 32;
    const cctx = this.cursorCanvas.getContext('2d');
    if (!cctx) throw new Error('Cursor canvas context not available');
    this.cursorCtx = cctx;

    this.controlPanel = new ControlPanel(
      document.body,
      this.state,
      {
        onDecayRateChange: (v) => this.handleDecayRateChange(v),
        onParticleSizeChange: (v) => this.handleParticleSizeChange(v),
        onColorOffsetChange: (v) => this.handleColorOffsetChange(v),
        onClear: () => this.handleClear()
      }
    );

    this.setupCursor();
    this.bindEvents();
    this.resize();
    this.start();
  }

  private setupCursor(): void {
    const size = 32;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 8;

    this.cursorCtx.clearRect(0, 0, size, size);

    const glow = this.cursorCtx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.5);
    glow.addColorStop(0, 'rgba(255, 180, 120, 0.8)');
    glow.addColorStop(0.4, 'rgba(255, 140, 80, 0.35)');
    glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
    this.cursorCtx.fillStyle = glow;
    this.cursorCtx.beginPath();
    this.cursorCtx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2);
    this.cursorCtx.fill();

    const core = this.cursorCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    core.addColorStop(0, 'rgba(255, 240, 220, 1)');
    core.addColorStop(0.5, 'rgba(255, 200, 150, 0.9)');
    core.addColorStop(1, 'rgba(255, 160, 100, 0)');
    this.cursorCtx.fillStyle = core;
    this.cursorCtx.beginPath();
    this.cursorCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.cursorCtx.fill();

    const dataUrl = this.cursorCanvas.toDataURL('image/png');
    this.canvas.style.cursor = `url(${dataUrl}) 16 16, crosshair`;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointerenter', () => {
      this.isMouseInCanvas = true;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.isMouseInCanvas = false;
      if (this.isDragging) {
        this.isDragging = false;
        this.particleManager.endStroke();
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      if (this.isDragging) {
        const now = performance.now();
        this.particleManager.moveStroke(this.mouseX * this.dpr, this.mouseY * this.dpr, now);
      }
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * this.dpr;
      const y = (e.clientY - rect.top) * this.dpr;
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      this.isDragging = true;
      this.dragStartPos = { x, y };
      this.canvas.setPointerCapture(e.pointerId);

      const now = performance.now();
      this.particleManager.beginStroke(x, y, now);

      this.addRipple(x, y, now);
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * this.dpr;
      const y = (e.clientY - rect.top) * this.dpr;

      if (this.isDragging && this.dragStartPos) {
        const dx = x - this.dragStartPos.x;
        const dy = y - this.dragStartPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5 * this.dpr) {
          this.addPulseRing(x, y);
        }
      }

      this.isDragging = false;
      this.dragStartPos = null;
      this.particleManager.endStroke();
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (_) {
        // ignore
      }
    });

    this.canvas.addEventListener('pointercancel', () => {
      this.isDragging = false;
      this.dragStartPos = null;
      this.particleManager.endStroke();
    });
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.backgroundFlow.resize(w * this.dpr, h * this.dpr);
  }

  private addPulseRing(x: number, y: number): void {
    const ring = new PulseRing({
      x,
      y,
      initialRadius: 20 * this.dpr,
      maxRadius: 80 * this.dpr,
      baseHue: 30,
      colorOffset: this.state.colorOffset,
      decayRate: this.state.decayRate
    });

    this.pulseRings.push(ring);

    while (this.pulseRings.length > this.MAX_PULSE_RINGS) {
      this.pulseRings.shift();
    }

    this.addRipple(x, y, performance.now());
  }

  private addRipple(x: number, y: number, now: number): void {
    this.ripples.push({ x, y, startTime: now, duration: this.RIPPLE_DURATION });
  }

  private handleDecayRateChange(value: number): void {
    this.state.decayRate = value;
    this.particleManager.decayRate = value * 0.6;
    for (const ring of this.pulseRings) {
      ring.decayRate = value;
    }
  }

  private handleParticleSizeChange(value: number): void {
    this.state.particleSize = value;
    this.particleManager.baseParticleSize = value * this.dpr;
  }

  private handleColorOffsetChange(value: number): void {
    this.state.colorOffset = value;
    this.particleManager.colorOffset = value;
    for (const ring of this.pulseRings) {
      ring.colorOffset = value;
    }
  }

  private handleClear(): void {
    const now = performance.now();
    for (const ring of this.pulseRings) {
      ring.startClear(now);
    }
    this.particleManager.startClearAll(now);
  }

  private updateRipples(now: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (now - r.startTime > r.duration) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private drawRipples(now: number): void {
    if (this.ripples.length === 0) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    for (const r of this.ripples) {
      const elapsed = now - r.startTime;
      const t = elapsed / r.duration;
      const eased = t * t * (3 - 2 * t);

      const startR = 5 * this.dpr;
      const endR = 20 * this.dpr;
      const radius = startR + (endR - startR) * eased;
      const opacity = (1 - t) * 0.9;
      const lineWidth = 2 * this.dpr * (1 - t * 0.5);

      const hue = (elapsed / r.duration) * 360;
      const gradient = this.ctx.createLinearGradient(
        r.x - radius,
        r.y - radius,
        r.x + radius,
        r.y + radius
      );
      gradient.addColorStop(0, `hsla(${(hue) % 360}, 90%, 65%, ${opacity})`);
      gradient.addColorStop(0.25, `hsla(${(hue + 60) % 360}, 90%, 65%, ${opacity})`);
      gradient.addColorStop(0.5, `hsla(${(hue + 120) % 360}, 90%, 65%, ${opacity})`);
      gradient.addColorStop(0.75, `hsla(${(hue + 200) % 360}, 90%, 65%, ${opacity})`);
      gradient.addColorStop(1, `hsla(${(hue + 280) % 360}, 90%, 65%, ${opacity})`);

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawCursor(now: number): void {
    if (!this.isMouseInCanvas) return;

    const x = this.mouseX * this.dpr;
    const y = this.mouseY * this.dpr;
    const pulse = 1 + Math.sin(now * 0.006) * 0.15;
    const baseR = 10 * this.dpr * pulse;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    const outer = this.ctx.createRadialGradient(x, y, 0, x, y, baseR * 3);
    outer.addColorStop(0, 'rgba(255, 200, 140, 0.35)');
    outer.addColorStop(1, 'rgba(255, 150, 80, 0)');
    this.ctx.fillStyle = outer;
    this.ctx.beginPath();
    this.ctx.arc(x, y, baseR * 3, 0, Math.PI * 2);
    this.ctx.fill();

    const core = this.ctx.createRadialGradient(x, y, 0, x, y, baseR);
    core.addColorStop(0, 'rgba(255, 250, 235, 0.95)');
    core.addColorStop(0.5, 'rgba(255, 220, 180, 0.6)');
    core.addColorStop(1, 'rgba(255, 180, 120, 0)');
    this.ctx.fillStyle = core;
    this.ctx.beginPath();
    this.ctx.arc(x, y, baseR, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private loop = (now: number): void => {
    const frameTime = now - this.lastFrameTime;
    if (frameTime < 14) {
      this.animationId = requestAnimationFrame(this.loop);
      return;
    }
    this.lastFrameTime = now;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.backgroundFlow.draw(now);

    for (let i = this.pulseRings.length - 1; i >= 0; i--) {
      const ring = this.pulseRings[i];
      ring.update(now);
      ring.draw(this.ctx, now);
      if (ring.isDead()) {
        this.pulseRings.splice(i, 1);
      }
    }

    this.particleManager.updateAll(now);
    this.particleManager.drawAll(this.ctx);

    this.updateRipples(now);
    this.drawRipples(now);

    this.drawCursor(now);

    this.animationId = requestAnimationFrame(this.loop);
  };

  private start(): void {
    this.lastFrameTime = performance.now();
    this.animationId = requestAnimationFrame(this.loop);
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.controlPanel.destroy();
  }
}

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new PulseMemoryApp();
    });
  } else {
    new PulseMemoryApp();
  }
}

bootstrap();
