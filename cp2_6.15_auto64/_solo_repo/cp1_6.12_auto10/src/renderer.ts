import type { Judgment } from './scorer';
import type { RoundRecord } from './scorer';
import type { PatternType } from './metronome';

export interface RendererOptions {
  indicatorDiameter?: number;
  particleCount?: number;
  transitionMs?: number;
}

export interface RendererPerformanceSnapshot {
  frameTimeMs: number;
  drawTimeMs: number;
  chartDrawTimeMs: number;
}

export interface RendererCallbacks {
  onPerformance?: (snapshot: RendererPerformanceSnapshot) => void;
}

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
  startTime: number;
  duration: number;
}

interface PatternTransition {
  from: PatternType;
  to: PatternType;
  startTime: number;
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
  private indicatorTargetDiameter: number;

  private beatPulse: number = 0;
  private particles: Particle[] = [];
  private feedbackFlashes: FeedbackFlash[] = [];
  private patternTransition: PatternTransition | null = null;

  private lastFrameTime: number = 0;
  private animFrameId: number = 0;
  private isPlaying: boolean = false;

  private callbacks: RendererCallbacks = {};
  private transitionMs: number;
  private particleCount: number;

  private currentPattern: PatternType = 'standard';

  private chartRenderCacheMs: number = -Infinity;
  private lastChartRecordsSig: string = '';
  private lastChartDrawMs: number = 0;

  constructor(
    beatCanvas: HTMLCanvasElement,
    historyCanvas: HTMLCanvasElement,
    options: RendererOptions = {}
  ) {
    this.canvas = beatCanvas;
    this.ctx = beatCanvas.getContext('2d')!;
    this.historyCanvas = historyCanvas;
    this.historyCtx = historyCanvas.getContext('2d')!;
    this.indicatorTargetDiameter = options.indicatorDiameter ?? 320;
    this.particleCount = options.particleCount ?? 12;
    this.transitionMs = options.transitionMs ?? 300;
    this.initParticles();
    this.resize();
  }

  setCallbacks(cbs: RendererCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / this.particleCount;
      this.particles.push({
        angle,
        radius: 180,
        baseRadius: 180,
        speed: 0.0025 + Math.random() * 0.0035,
        size: 3.5 + Math.random() * 3,
        opacity: 0.35 + Math.random() * 0.45,
        hue: 170 + Math.random() * 60,
      });
    }
  }

  resize(): void {
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const parent = this.canvas.parentElement!;
    const css = parent.getBoundingClientRect();
    const historyH = 180;
    const reservedBottom = historyH + 40;
    const w = css.width;
    const h = Math.max(320, css.height - reservedBottom);

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.width = w;
    this.height = h;
    this.centerX = w / 2;
    this.centerY = h / 2;

    const minDim = Math.min(this.width, this.height);
    const targetR = this.indicatorTargetDiameter / 2;
    this.indicatorRadius = Math.min(targetR, minDim * 0.32);

    for (const p of this.particles) {
      p.baseRadius = this.indicatorRadius + 18 + Math.random() * 22;
      p.radius = p.baseRadius;
    }
  }

  setPlaying(playing: boolean): void {
    const wasPlaying = this.isPlaying;
    this.isPlaying = playing;
    if (playing && !wasPlaying) {
      this.lastFrameTime = performance.now();
      this.frameLoop(this.lastFrameTime);
    } else if (!playing && this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
      this.drawIdle();
    }
  }

  triggerBeat(isDownbeat: boolean): void {
    this.beatPulse = Math.max(this.beatPulse, isDownbeat ? 1.0 : 0.75);
  }

  triggerFeedback(judgment: Judgment): void {
    this.feedbackFlashes.push({
      judgment,
      startTime: performance.now(),
      duration: 420,
    });
  }

  setCurrentPattern(pattern: PatternType, animate: boolean = true): void {
    if (animate && pattern !== this.currentPattern) {
      this.patternTransition = {
        from: this.currentPattern,
        to: pattern,
        startTime: performance.now(),
        duration: this.transitionMs,
      };
    }
    this.currentPattern = pattern;
  }

  private patternHueFor(p: PatternType): number {
    switch (p) {
      case 'standard':
        return 190;
      case 'swing':
        return 320;
      case 'syncopation':
        return 40;
      case 'dotted':
        return 110;
      case 'triplet':
        return 280;
    }
  }

  private getEffectiveHue(now: number): number {
    if (!this.patternTransition) return this.patternHueFor(this.currentPattern);
    const t = Math.min(
      1,
      (now - this.patternTransition.startTime) / this.patternTransition.duration
    );
    const e = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const h1 = this.patternHueFor(this.patternTransition.from);
    const h2 = this.patternHueFor(this.patternTransition.to);
    return h1 + (h2 - h1) * e;
  }

  private frameLoop = (now: number): void => {
    if (!this.isPlaying) {
      this.animFrameId = 0;
      return;
    }
    const t0 = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    this.update(dt, now);
    this.draw(now);

    const drawTime = performance.now() - t0;
    const frameTime = drawTime;
    if (this.callbacks.onPerformance) {
      try {
        this.callbacks.onPerformance({
          frameTimeMs: frameTime,
          drawTimeMs: drawTime,
          chartDrawTimeMs: this.lastChartDrawMs,
        });
      } catch (e) {
        console.warn('[Renderer] onPerformance callback error:', e);
      }
    }

    if (drawTime > 16 && typeof console !== 'undefined') {
      console.debug(
        '[Renderer:perf] frame=%.1fms chart=%.1fms (over 16ms budget)',
        drawTime,
        this.lastChartDrawMs
      );
    }
    this.animFrameId = requestAnimationFrame(this.frameLoop);
  };

  private update(dt: number, now: number): void {
    if (this.beatPulse > 0) {
      this.beatPulse = Math.max(0, this.beatPulse - dt * 3.8);
    }

    for (const p of this.particles) {
      p.angle += p.speed;
      const wobble = Math.sin(now * 0.0018 + p.angle * 3) * 8;
      p.radius = p.baseRadius + wobble + this.beatPulse * 6;
    }

    this.feedbackFlashes = this.feedbackFlashes.filter(
      (f) => now - f.startTime < f.duration
    );

    if (
      this.patternTransition &&
      now - this.patternTransition.startTime >= this.patternTransition.duration
    ) {
      this.patternTransition = null;
    }
  }

  private draw(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawParticles(ctx, now);
    this.drawIndicator(ctx, now);
    this.drawFeedbackFlash(ctx, now);
  }

  private drawIdle(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawParticles(ctx, performance.now());
    this.drawIndicator(ctx, performance.now());
  }

  private drawParticles(ctx: CanvasRenderingContext2D, now: number): void {
    const hue = this.getEffectiveHue(now);
    for (const p of this.particles) {
      const x = this.centerX + Math.cos(p.angle) * p.radius;
      const y = this.centerY + Math.sin(p.angle) * p.radius;
      const beatScale = 1 + this.beatPulse * 0.35;
      const sz = p.size * beatScale;
      ctx.save();
      ctx.globalAlpha = p.opacity * (0.55 + this.beatPulse * 0.45);
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue + (p.hue - 190) * 0.25}, 100%, 70%)`;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.9)`;
      ctx.shadowBlur = 10 + this.beatPulse * 12;
      ctx.fill();
      ctx.restore();
    }
  }

  private drawIndicator(ctx: CanvasRenderingContext2D, now: number): void {
    const hue = this.getEffectiveHue(now);
    const pulseScale = 1 + this.beatPulse * 0.14;
    const r = this.indicatorRadius * pulseScale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2);

    const glow = 6 + this.beatPulse * 28;
    ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.7)`;
    ctx.shadowBlur = glow;

    const grad = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      0,
      this.centerX,
      this.centerY,
      r
    );

    if (this.isPlaying) {
      const bright = 20 + this.beatPulse * 30;
      grad.addColorStop(0, `hsla(${hue}, 100%, 65%, ${0.06 + this.beatPulse * 0.16})`);
      grad.addColorStop(
        0.55,
        `hsla(${hue + 20}, 80%, ${bright}%, 0.22)`
      );
      grad.addColorStop(1, `hsla(${hue}, 100%, 65%, ${0.03 + this.beatPulse * 0.08})`);
    } else {
      grad.addColorStop(0, 'rgba(255,255,255,0.04)');
      grad.addColorStop(1, 'rgba(255,255,255,0.015)');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.3 + this.beatPulse * 0.6})`;
    ctx.lineWidth = 2 + this.beatPulse * 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const innerR = 5 + this.beatPulse * 7;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, innerR, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${0.55 + this.beatPulse * 0.45})`;
    ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.85)`;
    ctx.shadowBlur = 18 + this.beatPulse * 32;
    ctx.fill();
    ctx.restore();
  }

  private drawFeedbackFlash(ctx: CanvasRenderingContext2D, now: number): void {
    for (const flash of this.feedbackFlashes) {
      const progress = (now - flash.startTime) / flash.duration;
      if (progress < 0 || progress > 1) continue;
      const alpha = 1 - progress;
      let color = '';
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
      const ringR = this.indicatorRadius * (0.75 + progress * 0.65);
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * (1 - progress * 0.5);
      ctx.shadowColor = color;
      ctx.shadowBlur = 18 * alpha;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHistoryChart(records: RoundRecord[], force: boolean = false): number {
    const t0 = performance.now();
    const trimmed = records.length > 10 ? records.slice(-10) : records;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const cssW = this.historyCanvas.clientWidth || 480;
    const cssH = this.historyCanvas.clientHeight || 160;

    const sig = `${cssW}x${cssH}-${trimmed.length}-${trimmed
      .map((r) => `${r.roundIndex}:${r.accuracy}`)
      .join(',')}`;

    if (!force && sig === this.lastChartRecordsSig) {
      return this.lastChartDrawMs;
    }
    this.lastChartRecordsSig = sig;

    this.historyCanvas.width = Math.floor(cssW * dpr);
    this.historyCanvas.height = Math.floor(cssH * dpr);
    this.historyCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.historyCtx.scale(dpr, dpr);

    const ctx = this.historyCtx;
    ctx.clearRect(0, 0, cssW, cssH);

    const pad = { top: 16, right: 14, bottom: 26, left: 36 };
    const chartW = cssW - pad.left - pad.right;
    const chartH = cssH - pad.top - pad.bottom;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      ctx.fillText(100 - i * 25 + '%', pad.left - 5, y + 3);
    }
    ctx.restore();

    if (trimmed.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无训练记录，完成一轮后将显示准确率趋势', cssW / 2, cssH / 2 + 4);
      this.lastChartDrawMs = performance.now() - t0;
      return this.lastChartDrawMs;
    }

    const points: { x: number; y: number; r: RoundRecord }[] = [];
    const n = trimmed.length;
    const slotCount = 10;
    const step = chartW / (slotCount - 1);
    const startOffset = (slotCount - n) * step;

    for (let i = 0; i < n; i++) {
      const x =
        n === 1
          ? pad.left + chartW / 2
          : pad.left + startOffset + step * i;
      const clampedAcc = Math.max(0, Math.min(100, trimmed[i].accuracy));
      const y = pad.top + chartH * (1 - clampedAcc / 100);
      points.push({ x, y, r: trimmed[i] });
    }

    ctx.save();
    ctx.beginPath();
    const p0 = points[0];
    ctx.moveTo(p0.x, pad.top + chartH);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    fillGrad.addColorStop(0, 'rgba(0, 240, 255, 0.42)');
    fillGrad.addColorStop(1, 'rgba(0, 119, 255, 0.04)');
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
      ctx.shadowColor = 'rgba(0, 240, 255, 0.85)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(p.r.accuracy) + '%', p.x, p.y - 9);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < points.length; i++) {
      ctx.fillText('R' + points[i].r.roundIndex, points[i].x, pad.top + chartH + 14);
    }
    ctx.restore();

    this.chartRenderCacheMs = performance.now();
    this.lastChartDrawMs = this.chartRenderCacheMs - t0;
    return this.lastChartDrawMs;
  }

  destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }
}
