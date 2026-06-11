import type { Judgment } from './scorer';
import type { RoundRecord } from './scorer';

interface Particle {
  angle: number;
  radius: number;
  baseRadius: number;
  speed: number;
  size: number;
  opacity: number;
  hue: number;
}

interface FeedbackFlash {
  judgment: Judgment;
  time: number;
  duration: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private historyCanvas: HTMLCanvasElement;
  private historyCtx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;
  private indicatorRadius: number = 160;
  private beatPulse: number = 0;
  private particles: Particle[] = [];
  private feedbackFlashes: FeedbackFlash[] = [];
  private beatActive: boolean = false;
  private lastTime: number = 0;
  private animFrameId: number = 0;
  private isPlaying: boolean = false;

  constructor(beatCanvas: HTMLCanvasElement, historyCanvas: HTMLCanvasElement) {
    this.canvas = beatCanvas;
    this.ctx = beatCanvas.getContext('2d')!;
    this.historyCanvas = historyCanvas;
    this.historyCtx = historyCanvas.getContext('2d')!;
    this.initParticles();
    this.resize();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        angle,
        radius: 180,
        baseRadius: 180,
        speed: 0.003 + Math.random() * 0.004,
        size: 4 + Math.random() * 3,
        opacity: 0.4 + Math.random() * 0.4,
        hue: 180 + Math.random() * 60,
      });
    }
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height - 200;

    this.canvas.width = w * dpr;
    this.canvas.height = Math.max(h, 300) * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = Math.max(h, 300) + 'px';
    this.ctx.scale(dpr, dpr);

    this.width = w;
    this.height = Math.max(h, 300);
    this.centerX = w / 2;
    this.centerY = this.height / 2;

    const minDim = Math.min(this.width, this.height);
    this.indicatorRadius = Math.min(160, minDim * 0.28);

    for (const p of this.particles) {
      p.baseRadius = this.indicatorRadius + 20 + Math.random() * 20;
      p.radius = p.baseRadius;
    }
  }

  setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    if (playing && !this.animFrameId) {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  triggerBeat(isDownbeat: boolean): void {
    this.beatPulse = 1.0;
    this.beatActive = true;
  }

  triggerFeedback(judgment: Judgment): void {
    this.feedbackFlashes.push({
      judgment,
      time: performance.now(),
      duration: 400,
    });
  }

  private loop(now: number): void {
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(dt, now);
    this.draw(now);

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number, now: number): void {
    if (this.beatPulse > 0) {
      this.beatPulse = Math.max(0, this.beatPulse - dt * 4);
    }

    for (const p of this.particles) {
      p.angle += p.speed;
      p.radius = p.baseRadius + Math.sin(now * 0.002 + p.angle * 3) * 8;
    }

    this.feedbackFlashes = this.feedbackFlashes.filter(
      (f) => now - f.time < f.duration
    );
  }

  private draw(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawParticles(ctx, now);
    this.drawIndicator(ctx, now);
    this.drawFeedbackFlash(ctx, now);
  }

  private drawParticles(ctx: CanvasRenderingContext2D, now: number): void {
    for (const p of this.particles) {
      const x = this.centerX + Math.cos(p.angle) * p.radius;
      const y = this.centerY + Math.sin(p.angle) * p.radius;

      const beatScale = 1 + this.beatPulse * 0.3;
      const sz = p.size * beatScale;

      ctx.save();
      ctx.globalAlpha = p.opacity * (0.6 + this.beatPulse * 0.4);
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
      ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
      ctx.shadowBlur = 12 + this.beatPulse * 10;
      ctx.fill();
      ctx.restore();
    }
  }

  private drawIndicator(ctx: CanvasRenderingContext2D, now: number): void {
    const pulseScale = 1 + this.beatPulse * 0.12;
    const r = this.indicatorRadius * pulseScale;

    ctx.save();

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2);

    const glowIntensity = 8 + this.beatPulse * 25;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
    ctx.shadowBlur = glowIntensity;

    const grad = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, r
    );

    if (this.isPlaying) {
      const brightness = 15 + this.beatPulse * 25;
      grad.addColorStop(0, `rgba(0, 240, 255, ${0.05 + this.beatPulse * 0.15})`);
      grad.addColorStop(0.6, `rgba(20, ${brightness}, 60, 0.3)`);
      grad.addColorStop(1, `rgba(0, 240, 255, ${0.02 + this.beatPulse * 0.08})`);
    } else {
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
    }

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 + this.beatPulse * 0.7})`;
    ctx.lineWidth = 2 + this.beatPulse * 2;
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 6 + this.beatPulse * 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 240, 255, ${0.5 + this.beatPulse * 0.5})`;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
    ctx.shadowBlur = 20 + this.beatPulse * 30;
    ctx.fill();
    ctx.restore();
  }

  private drawFeedbackFlash(ctx: CanvasRenderingContext2D, now: number): void {
    for (const flash of this.feedbackFlashes) {
      const elapsed = now - flash.time;
      const progress = elapsed / flash.duration;
      const alpha = 1 - progress;

      let color: string;
      switch (flash.judgment) {
        case 'Perfect':
          color = `rgba(0, 255, 136, ${alpha})`;
          break;
        case 'Good':
          color = `rgba(255, 204, 0, ${alpha})`;
          break;
        case 'Miss':
          color = `rgba(255, 51, 102, ${alpha})`;
          break;
      }

      const flashR = this.indicatorRadius * (0.8 + progress * 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, flashR, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * (1 - progress);
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 * alpha;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHistoryChart(records: RoundRecord[]): void {
    const ctx = this.historyCtx;
    const dpr = window.devicePixelRatio || 1;
    const displayW = this.historyCanvas.clientWidth;
    const displayH = this.historyCanvas.clientHeight;

    this.historyCanvas.width = displayW * dpr;
    this.historyCanvas.height = displayH * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayW, displayH);

    const pad = { top: 20, right: 20, bottom: 28, left: 40 };
    const chartW = displayW - pad.left - pad.right;
    const chartH = displayH - pad.top - pad.bottom;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((100 - i * 25) + '%', pad.left - 6, y + 4);
    }
    ctx.restore();

    if (records.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无训练记录', displayW / 2, displayH / 2);
      return;
    }

    const points: { x: number; y: number }[] = [];
    const n = records.length;
    const maxSlots = 10;
    const step = chartW / Math.max(n - 1, 1);

    for (let i = 0; i < n; i++) {
      const x = pad.left + (n === 1 ? chartW / 2 : step * i);
      const y = pad.top + chartH * (1 - records[i].accuracy / 100);
      points.push({ x, y });
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, pad.top + chartH);
    for (const p of points) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    fillGrad.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
    fillGrad.addColorStop(1, 'rgba(0, 119, 255, 0.02)');
    ctx.fillStyle = fillGrad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    const lineGrad = ctx.createLinearGradient(pad.left, 0, pad.left + chartW, 0);
    lineGrad.addColorStop(0, '#00f0ff');
    lineGrad.addColorStop(1, '#0077ff');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < points.length; i++) {
      if (i === 0) ctx.moveTo(points[i].x, points[i].y);
      else ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();

    for (const p of points) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < points.length; i++) {
      ctx.fillText('R' + records[i].roundIndex, points[i].x, pad.top + chartH + 16);
    }
    ctx.restore();
  }

  destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }
}
