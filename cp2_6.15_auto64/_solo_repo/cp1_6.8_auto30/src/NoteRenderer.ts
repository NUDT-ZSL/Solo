import { Note, LevelConfig } from './BeatManager';

interface Ripple {
  x: number;
  y: number;
  color: string;
  startTime: number;
  duration: number;
  maxRadius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class NoteRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ripples: Ripple[] = [];
  private particles: Particle[] = [];
  private tidalParticles: Particle[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private fadeAlpha = 0;
  private shakeIntensity = 0;
  private shakeDecay = 0.9;
  private darkOverlay = 0;
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  triggerShake(intensity: number): void {
    this.shakeIntensity = intensity;
  }

  setDarkOverlay(alpha: number): void {
    this.darkOverlay = Math.min(alpha, 0.7);
  }

  setFadeAlpha(alpha: number): void {
    this.fadeAlpha = alpha;
  }

  addRipple(x: number, y: number, color: string): void {
    this.ripples.push({
      x,
      y,
      color,
      startTime: this.time,
      duration: 0.8,
      maxRadius: 80,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.6 + Math.random() * 0.3,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  triggerTidalBurst(colors: string[]): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.tidalParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 1.0,
        maxLife: 1.0 + Math.random() * 1.0,
        color,
        size: 3 + Math.random() * 5,
      });
    }
  }

  render(
    notes: Note[],
    config: LevelConfig,
    elapsed: number,
    hitLineY: number,
    laneXs: number[]
  ): void {
    const dt = 1 / 60;
    this.time += dt;

    const ctx = this.ctx;
    ctx.save();

    if (this.shakeIntensity > 0.5) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }

    this.drawBackground(ctx, config, elapsed);

    this.drawLanes(ctx, laneXs, hitLineY);

    this.drawNotes(ctx, notes, elapsed, hitLineY, laneXs);

    this.updateAndDrawRipples(ctx);

    this.updateAndDrawParticles(ctx, this.particles);

    this.updateAndDrawParticles(ctx, this.tidalParticles);

    this.drawHitLine(ctx, hitLineY);

    if (this.darkOverlay > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${this.darkOverlay})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.fadeAlpha > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    config: LevelConfig,
    elapsed: number
  ): void {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, config.bgColor1);
    grad.addColorStop(1, config.bgColor2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    const bubbleCount = 15;
    for (let i = 0; i < bubbleCount; i++) {
      const seed = i * 137.5;
      const baseX = ((seed * 7.3) % this.width);
      const speed = 20 + (seed % 30);
      const y = this.height - ((elapsed * speed + seed * 3) % (this.height + 40));
      const r = 2 + (seed % 4);
      const alpha = 0.08 + 0.05 * Math.sin(elapsed * 2 + seed);
      ctx.beginPath();
      ctx.arc(baseX, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,200,255,${alpha})`;
      ctx.fill();
    }

    const causticsCount = 6;
    for (let i = 0; i < causticsCount; i++) {
      const cx = (this.width * (i + 0.5)) / causticsCount + Math.sin(elapsed * 0.5 + i * 2) * 30;
      const cy = this.height * 0.3 + Math.cos(elapsed * 0.3 + i) * 20;
      const r = 60 + Math.sin(elapsed + i) * 20;
      const grad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad2.addColorStop(0, 'rgba(0,229,255,0.03)');
      grad2.addColorStop(1, 'rgba(0,229,255,0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }

  private drawLanes(
    ctx: CanvasRenderingContext2D,
    laneXs: number[],
    hitLineY: number
  ): void {
    for (const x of laneXs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hitLineY);
      ctx.strokeStyle = 'rgba(0,229,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawHitLine(ctx: CanvasRenderingContext2D, hitLineY: number): void {
    const grad = ctx.createLinearGradient(0, hitLineY - 2, 0, hitLineY + 2);
    grad.addColorStop(0, 'rgba(0,229,255,0)');
    grad.addColorStop(0.5, 'rgba(0,229,255,0.5)');
    grad.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, hitLineY - 2, this.width, 4);
  }

  private drawNotes(
    ctx: CanvasRenderingContext2D,
    notes: Note[],
    elapsed: number,
    hitLineY: number,
    laneXs: number[]
  ): void {
    const approachTime = 2.0;

    for (const note of notes) {
      if (note.hit || note.missed) continue;

      const timeDiff = note.time - elapsed;
      if (timeDiff > approachTime || timeDiff < -0.5) continue;

      const progress = 1 - timeDiff / approachTime;
      const y = progress * hitLineY;

      if (y < -50 || y > this.height + 50) continue;

      const x = laneXs[note.lane] || this.width / 2;

      const glow = 0.5 + 0.5 * Math.sin(elapsed * 4 + note.glowPhase);

      ctx.save();
      ctx.globalAlpha = Math.min(1, progress * 3) * (1 - Math.max(0, -timeDiff) * 4);

      if (note.type === 'conch') {
        this.drawConch(ctx, x, y, note.radius, note.color, glow);
      } else {
        this.drawCoral(ctx, x, y, note.radius, note.color, glow);
      }

      ctx.restore();
    }
  }

  private drawConch(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    glow: number
  ): void {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    grad.addColorStop(0, color + 'aa');
    grad.addColorStop(0.4, color + '44');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r * (0.8 + glow * 0.2), 0, Math.PI * 2);
    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
    innerGrad.addColorStop(0, '#ffffff');
    innerGrad.addColorStop(0.3, color);
    innerGrad.addColorStop(1, color + '88');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + glow * 0.4})`;
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = color + '22';
    ctx.fill();
    ctx.restore();
  }

  private drawCoral(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    glow: number
  ): void {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    grad.addColorStop(0, color + '88');
    grad.addColorStop(0.5, color + '33');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, Math.PI * 2);
    ctx.fill();

    const branches = 5;
    for (let i = 0; i < branches; i++) {
      const angle = (Math.PI * 2 * i) / branches - Math.PI / 2;
      const len = r * (1.0 + glow * 0.3);
      const bx = x + Math.cos(angle) * len;
      const by = y + Math.sin(angle) * len;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bx, by, 4 + glow * 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.4 + glow * 0.3})`;
    ctx.fill();
  }

  private updateAndDrawRipples(ctx: CanvasRenderingContext2D): void {
    const remaining: Ripple[] = [];
    for (const r of this.ripples) {
      const t = (this.time - r.startTime) / r.duration;
      if (t >= 1) continue;
      remaining.push(r);

      const radius = r.maxRadius * t;
      const alpha = 1 - t;

      for (let ring = 0; ring < 3; ring++) {
        const ringRadius = radius * (0.6 + ring * 0.2);
        const ringAlpha = alpha * (0.4 - ring * 0.1);
        ctx.beginPath();
        ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color + Math.floor(ringAlpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 2 - ring * 0.5;
        ctx.stroke();
      }
    }
    this.ripples = remaining;
  }

  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    const dt = 1 / 60;
    const remaining: Particle[] = [];
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) continue;
      remaining.push(p);

      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, '0');
      ctx.fill();
    }
    if (particles === this.particles) {
      this.particles = remaining;
    } else {
      this.tidalParticles = remaining;
    }
  }

  clear(): void {
    this.ripples = [];
    this.particles = [];
    this.tidalParticles = [];
    this.shakeIntensity = 0;
    this.darkOverlay = 0;
    this.fadeAlpha = 0;
  }
}
