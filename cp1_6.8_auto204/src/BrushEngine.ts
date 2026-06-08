export interface StrokePoint {
  x: number;
  y: number;
  width: number;
  opacity: number;
  age: number;
  maxAge: number;
  diffusionRadius: number;
  diffusionRate: number;
  inkDensity: number;
}

export interface BrushSettings {
  baseWidth: number;
  speedSensitivity: number;
  pressureSensitivity: number;
  diffusionSpeed: number;
  fadeSpeed: number;
  maxAge: number;
  smoothing: number;
}

const DEFAULT_SETTINGS: BrushSettings = {
  baseWidth: 18,
  speedSensitivity: 0.8,
  pressureSensitivity: 0.6,
  diffusionSpeed: 0.3,
  fadeSpeed: 0.002,
  maxAge: 8000,
  smoothing: 0.35,
};

export class BrushEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private settings: BrushSettings;
  private isDrawing: boolean = false;
  private pressStartTime: number = 0;
  private currentPressure: number = 0;
  private lastX: number = 0;
  private lastY: number = 0;
  private lastTime: number = 0;
  private lastWidth: number = 0;
  private smoothWidth: number = 0;
  private smoothOpacity: number = 0;
  private animationFrameId: number = 0;
  private activePoints: StrokePoint[] = [];
  private pendingStrokes: StrokePoint[][] = [];
  private currentStroke: StrokePoint[] = [];
  private onStrokeComplete: ((points: StrokePoint[]) => void) | null = null;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private particleCanvas: HTMLCanvasElement | null = null;
  private particleCtx: CanvasRenderingContext2D | null = null;

  constructor(settings?: Partial<BrushSettings>) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true })!;
    this.startRenderLoop();
  }

  attachParticleCanvas(canvas: HTMLCanvasElement): void {
    this.particleCanvas = canvas;
    this.particleCtx = canvas.getContext('2d')!;
  }

  resize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx!.scale(this.dpr, this.dpr);
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
      this.offscreenCtx!.scale(this.dpr, this.dpr);
    }
    if (this.particleCanvas) {
      this.particleCanvas.width = rect.width * this.dpr;
      this.particleCanvas.height = rect.height * this.dpr;
      this.particleCtx!.scale(this.dpr, this.dpr);
    }
  }

  setStrokeCompleteCallback(cb: (points: StrokePoint[]) => void): void {
    this.onStrokeComplete = cb;
  }

  updateSettings(settings: Partial<BrushSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): BrushSettings {
    return { ...this.settings };
  }

  onPointerDown(x: number, y: number): void {
    this.isDrawing = true;
    this.pressStartTime = performance.now();
    this.currentPressure = 0;
    this.lastX = x;
    this.lastY = y;
    this.lastTime = performance.now();
    this.lastWidth = this.settings.baseWidth;
    this.smoothWidth = this.settings.baseWidth;
    this.smoothOpacity = 1;
    this.currentStroke = [];
  }

  onPointerMove(x: number, y: number): void {
    if (!this.isDrawing) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    if (dt < 1) return;

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dist / dt;

    const holdDuration = now - this.pressStartTime;
    const pressure = Math.min(1, holdDuration / 2000) * this.settings.pressureSensitivity +
      (1 - this.settings.pressureSensitivity);

    const speedFactor = Math.max(0.15, 1 - speed * this.settings.speedSensitivity * 0.05);
    const targetWidth = this.settings.baseWidth * speedFactor * (0.6 + pressure * 0.4);

    this.smoothWidth += (targetWidth - this.smoothWidth) * this.settings.smoothing;
    const finalWidth = Math.max(1, this.smoothWidth);

    const targetOpacity = Math.min(1, 0.3 + pressure * 0.7);
    this.smoothOpacity += (targetOpacity - this.smoothOpacity) * this.settings.smoothing;
    const finalOpacity = this.smoothOpacity;

    const steps = Math.max(1, Math.floor(dist / 2));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const px = this.lastX + dx * t;
      const py = this.lastY + dy * t;
      const w = this.lastWidth + (finalWidth - this.lastWidth) * t;
      const point: StrokePoint = {
        x: px,
        y: py,
        width: w,
        opacity: finalOpacity,
        age: 0,
        maxAge: this.settings.maxAge,
        diffusionRadius: 0,
        diffusionRate: this.settings.diffusionSpeed * (0.5 + Math.random() * 0.5),
        inkDensity: finalOpacity,
      };
      this.currentStroke.push(point);
      this.activePoints.push(point);
    }

    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
    this.lastWidth = finalWidth;
  }

  onPointerUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentStroke.length > 0 && this.onStrokeComplete) {
      this.onStrokeComplete([...this.currentStroke]);
    }
    this.pendingStrokes.push([...this.currentStroke]);
    this.currentStroke = [];
  }

  clear(): void {
    this.activePoints = [];
    this.pendingStrokes = [];
    this.currentStroke = [];
    if (this.offscreenCtx) {
      this.offscreenCtx.clearRect(0, 0, this.width, this.height);
    }
  }

  addAnimatedStroke(points: StrokePoint[]): void {
    this.pendingStrokes.push([...points]);
    this.activePoints.push(...points);
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private render(): void {
    if (!this.ctx || !this.offscreenCtx) return;

    const now = performance.now();

    this.ctx.fillStyle = '#f5f0e8';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawPaperTexture();

    this.offscreenCtx.clearRect(0, 0, this.width, this.height);

    const toRemove: number[] = [];
    for (let i = 0; i < this.activePoints.length; i++) {
      const p = this.activePoints[i];
      p.age += 16.67;

      if (p.age > p.maxAge) {
        toRemove.push(i);
        continue;
      }

      const ageRatio = p.age / p.maxAge;
      const diffGrowth = p.diffusionRate * Math.sqrt(p.age / 1000);
      p.diffusionRadius = diffGrowth;
      const fadeFactor = 1 - Math.pow(ageRatio, 1.5);
      const currentOpacity = p.inkDensity * fadeFactor * p.opacity;
      const currentWidth = p.width + p.diffusionRadius * 2;

      if (currentOpacity <= 0.005) {
        toRemove.push(i);
        continue;
      }

      this.drawInkPoint(this.offscreenCtx, p.x, p.y, currentWidth, currentOpacity);
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.activePoints.splice(toRemove[i], 1);
    }

    this.ctx.drawImage(this.offscreenCanvas!, 0, 0, this.width, this.height);
  }

  private drawInkPoint(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    opacity: number
  ): void {
    const r = width / 2;

    ctx.save();

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(20, 18, 15, ${opacity})`);
    gradient.addColorStop(0.3, `rgba(30, 28, 24, ${opacity * 0.85})`);
    gradient.addColorStop(0.6, `rgba(50, 45, 38, ${opacity * 0.5})`);
    gradient.addColorStop(0.85, `rgba(70, 62, 52, ${opacity * 0.15})`);
    gradient.addColorStop(1, `rgba(90, 80, 68, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (opacity > 0.4 && r > 4) {
      const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, r * 0.3);
      innerGradient.addColorStop(0, `rgba(10, 8, 5, ${opacity * 0.3})`);
      innerGradient.addColorStop(1, `rgba(20, 18, 15, 0)`);
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPaperTexture(): void {
    if (!this.ctx) return;
    this.ctx.save();
    this.ctx.globalAlpha = 0.03;
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 1.5 + 0.5;
      this.ctx.fillStyle = Math.random() > 0.5 ? '#c8c0b0' : '#d8d0c0';
      this.ctx.fillRect(x, y, size, size);
    }
    this.ctx.restore();
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  getCanvasSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
