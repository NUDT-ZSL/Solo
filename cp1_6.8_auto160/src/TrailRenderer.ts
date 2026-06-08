import type { TrailSegment } from "./ScrollEngine";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
}

export class TrailRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private animFrameId: number | null = null;
  private glowPhase = 0;

  constructor() {}

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize(): void {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  detach(): void {
    this.stopAnimation();
    this.canvas = null;
    this.ctx = null;
  }

  renderTrails(segments: TrailSegment[], animated = true): void {
    if (!this.ctx || !this.canvas) return;

    this.stopAnimation();

    if (animated) {
      this.glowPhase = 0;
      const animate = () => {
        this.glowPhase += 0.02;
        this.drawTrails(segments);
        this.animFrameId = requestAnimationFrame(animate);
      };
      this.animFrameId = requestAnimationFrame(animate);
    } else {
      this.drawTrails(segments);
    }
  }

  private drawTrails(segments: TrailSegment[]): void {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    const glowIntensity = 0.6 + 0.4 * Math.sin(this.glowPhase);

    for (const seg of segments) {
      this.drawSingleTrail(seg, glowIntensity);
    }

    this.drawConnectors(segments, glowIntensity);
  }

  private drawSingleTrail(seg: TrailSegment, glowIntensity: number): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const cornerRadius = Math.min(seg.width * 0.3, 6);

    ctx.save();

    ctx.shadowColor = seg.glowColor;
    ctx.shadowBlur = 12 * glowIntensity;

    ctx.beginPath();
    this.roundedRect(ctx, seg.x, seg.y, seg.width, seg.height, cornerRadius);

    const gradient = ctx.createLinearGradient(
      seg.x,
      seg.y,
      seg.x + seg.width,
      seg.y + seg.height
    );
    gradient.addColorStop(0, seg.color);
    gradient.addColorStop(0.5, this.lightenColor(seg.color, 15));
    gradient.addColorStop(1, seg.color);

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 20 * glowIntensity;
    ctx.shadowColor = seg.glowColor;
    ctx.fill();

    ctx.restore();
  }

  private drawConnectors(segments: TrailSegment[], glowIntensity: number): void {
    if (!this.ctx || segments.length < 2) return;

    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * glowIntensity})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i < segments.length - 1; i++) {
      const a = segments[i];
      const b = segments[i + 1];

      if (b.chapterId - a.chapterId !== 1) continue;

      const ax = a.x + a.width;
      const ay = a.y + a.height / 2;
      const bx = b.x;
      const by = b.y + b.height / 2;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private lightenColor(hslColor: string, amount: number): string {
    const match = hslColor.match(/hsl\((\d+\.?\d*),\s*(\d+\.?\d*)%,\s*(\d+\.?\d*)%\)/);
    if (!match) return hslColor;
    const h = parseFloat(match[1]);
    const s = parseFloat(match[2]);
    const l = Math.min(95, parseFloat(match[3]) + amount);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  stopAnimation(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}

export class ParticleRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animFrameId: number | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.initParticles();
    this.startAnimation();
  }

  resize(): void {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  detach(): void {
    this.stopAnimation();
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
  }

  private initParticles(): void {
    this.particles = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.4,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.3 - 0.1,
      });
    }
  }

  private startAnimation(): void {
    const animate = () => {
      this.update();
      this.draw();
      this.animFrameId = requestAnimationFrame(animate);
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  private update(): void {
    for (const p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    }
  }

  private draw(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(210, 200, 180, ${p.opacity})`;
      this.ctx.fill();
    }
  }

  stopAnimation(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
