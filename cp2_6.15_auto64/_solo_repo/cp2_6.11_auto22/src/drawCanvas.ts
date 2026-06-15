import {
  StrokePoint,
  StrokeSegment,
  SampledParticle,
  hexToHsl,
  computeCurvature,
  computeTangent,
  computeNormal2D,
  sampleStrokeByDistance,
  getBrightnessFactor
} from './utils';

export const COLORS = [
  '#FF3366', '#FF9933', '#FFD700', '#33CC66',
  '#3399FF', '#9966FF', '#FFFFFF'
];

const SAMPLE_INTERVAL = 4;
const IDLE_MS = 2000;
const TRAIL_LENGTH = 15;
const TRAIL_FADE_MS = 300;

export type OnParticlesReady = (particles: SampledParticle[], segmentId: number) => void;
export type OnSegmentRemoved = (segmentId: number) => void;

interface TrailPoint extends StrokePoint {
  alpha: number;
}

export class DrawCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private isDrawing = false;
  private currentColor = COLORS[0];
  private currentWidth = 3;
  private currentSegmentId = 0;
  private currentPoints: StrokePoint[] = [];
  private segments: StrokeSegment[] = [];
  private trail: TrailPoint[] = [];
  private idleTimer: number | null = null;
  private rafId: number | null = null;
  private lastMoveTime = 0;
  private hasUnprocessedSegment = false;

  private onParticlesReady: OnParticlesReady | null = null;
  private onSegmentRemoved: OnSegmentRemoved | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    opts?: {
      onParticlesReady?: OnParticlesReady;
      onSegmentRemoved?: OnSegmentRemoved;
    }
  ) {
    this.canvas = canvas;
    this.container = container;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.onParticlesReady = opts?.onParticlesReady ?? null;
    this.onSegmentRemoved = opts?.onSegmentRemoved ?? null;

    this.resize();
    this.bindEvents();
    this.startTrailLoop();
    this.updateCursor();
  }

  getColor(): string { return this.currentColor; }
  setColor(c: string): void {
    this.currentColor = c;
    this.updateCursor();
    document.documentElement.style.setProperty('--brush-color', c);
  }
  getWidth(): number { return this.currentWidth; }
  setWidth(w: number): void {
    this.currentWidth = Math.max(1, Math.min(10, w));
    this.updateCursor();
  }

  setOnParticlesReady(cb: OnParticlesReady): void { this.onParticlesReady = cb; }
  setOnSegmentRemoved(cb: OnSegmentRemoved): void { this.onSegmentRemoved = cb; }

  getSegments(): StrokeSegment[] { return this.segments.slice(); }

  removeOldestSegment(): void {
    const seg = this.segments.shift();
    if (seg && this.onSegmentRemoved) this.onSegmentRemoved(seg.id);
    this.redrawAll();
  }

  reset(): void {
    this.segments = [];
    this.currentPoints = [];
    this.trail = [];
    this.hasUnprocessedSegment = false;
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    this.clear();
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width * 0.8));
    const h = Math.max(400, Math.floor(rect.height * 0.85));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.redrawAll();
  }

  private bindEvents(): void {
    const c = this.canvas;
    c.addEventListener('mousedown', this.onMouseDown);
    c.addEventListener('mousemove', this.onMouseMove);
    c.addEventListener('mouseleave', this.onMouseUpOrLeave);
    c.addEventListener('mouseup', this.onMouseUpOrLeave);
    window.addEventListener('resize', () => this.resize());
  }

  private getCanvasPoint(e: MouseEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDrawing = true;
    this.hasUnprocessedSegment = true;
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    const p = this.getCanvasPoint(e);
    const t = performance.now();
    this.currentSegmentId++;
    this.currentPoints = [{ ...p, time: t }];
    this.trail = [{ ...p, time: t, alpha: 1 }];
    this.lastMoveTime = t;
  };

  private onMouseMove = (e: MouseEvent): void => {
    const p = this.getCanvasPoint(e);
    const t = performance.now();
    if (this.isDrawing) {
      this.currentPoints.push({ ...p, time: t });
      this.trail.push({ ...p, time: t, alpha: 1 });
      if (this.trail.length > 60) this.trail.shift();
      this.drawSegmentToCanvas(this.currentPoints, this.currentColor, this.currentWidth);
      this.lastMoveTime = t;
    }
  };

  private onMouseUpOrLeave = (): void => {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentPoints.length >= 2) {
      const seg: StrokeSegment = {
        id: this.currentSegmentId,
        points: this.currentPoints.slice(),
        color: this.currentColor,
        width: this.currentWidth,
        startTime: this.currentPoints[0].time,
        endTime: performance.now()
      };
      this.segments.push(seg);
    }
    this.currentPoints = [];
    this.scheduleIdleCheck();
  };

  private scheduleIdleCheck(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      if (!this.isDrawing && this.hasUnprocessedSegment) {
        this.processNewSegments();
      }
    }, IDLE_MS);
  }

  private processNewSegments(): void {
    if (!this.onParticlesReady) { this.hasUnprocessedSegment = false; return; }
    for (const seg of this.segments) {
      if (seg.points.length < 2) continue;
      const particles = this.segmentToParticles(seg);
      if (particles.length > 0) this.onParticlesReady(particles, seg.id);
    }
    this.hasUnprocessedSegment = false;
  }

  private segmentToParticles(seg: StrokeSegment): SampledParticle[] {
    const sampled = sampleStrokeByDistance(seg.points, SAMPLE_INTERVAL);
    if (sampled.length < 3) return [];

    const brightnessFactor = getBrightnessFactor(seg.color);
    const densityMultiplier = 0.25 + brightnessFactor * 3.5;

    const result: SampledParticle[] = [];
    const addParticleAt = (idx: number) => {
      const prev = sampled[Math.max(0, idx - 1)];
      const cur = sampled[idx];
      const next = sampled[Math.min(sampled.length - 1, idx + 1)];
      const curvature = computeCurvature(prev, cur, next);
      const { tx, ty } = computeTangent(prev, next);
      const { nx, ny } = computeNormal2D(tx, ty);
      result.push({
        x: cur.x, y: cur.y, color: seg.color,
        curvature, normalX: nx, normalY: ny
      });
    };

    for (let i = 0; i < sampled.length; i++) {
      addParticleAt(i);
      const extra = Math.floor(densityMultiplier);
      for (let k = 0; k < extra; k++) {
        const jitterX = (Math.random() - 0.5) * seg.width * 1.2;
        const jitterY = (Math.random() - 0.5) * seg.width * 1.2;
        const prev = sampled[Math.max(0, i - 1)];
        const cur = sampled[i];
        const next = sampled[Math.min(sampled.length - 1, i + 1)];
        const curvature = computeCurvature(prev, cur, next);
        const { tx, ty } = computeTangent(prev, next);
        const { nx, ny } = computeNormal2D(tx, ty);
        result.push({
          x: cur.x + jitterX, y: cur.y + jitterY,
          color: seg.color, curvature,
          normalX: nx, normalY: ny
        });
      }
      if (Math.random() < (densityMultiplier - Math.floor(densityMultiplier))) {
        addParticleAt(i);
      }
    }
    return result;
  }

  private clear(): void {
    this.ctx.fillStyle = '#0B0B1A';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawSegmentToCanvas(
    pts: StrokePoint[],
    color: string,
    width: number
  ): void {
    if (pts.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private redrawAll(): void {
    this.clear();
    for (const seg of this.segments) {
      this.drawSegmentToCanvas(seg.points, seg.color, seg.width);
    }
    if (this.currentPoints.length >= 2) {
      this.drawSegmentToCanvas(this.currentPoints, this.currentColor, this.currentWidth);
    }
  }

  private startTrailLoop(): void {
    const loop = () => {
      const now = performance.now();
      const fadeStart = now - TRAIL_FADE_MS;
      this.trail = this.trail.filter(p => now - p.time <= TRAIL_FADE_MS + 50);
      if (this.trail.length > 1 && !this.isDrawing) {
        this.redrawAll();
        const ctx = this.ctx;
        for (let i = 1; i < this.trail.length; i++) {
          const p0 = this.trail[i - 1];
          const p1 = this.trail[i];
          const age = now - p1.time;
          const alpha = Math.max(0, 1 - age / TRAIL_FADE_MS) * 0.7;
          const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          if (dist > TRAIL_LENGTH) continue;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.shadowColor = this.currentColor;
          ctx.shadowBlur = 8;
          ctx.strokeStyle = this.currentColor;
          ctx.lineWidth = this.currentWidth * alpha;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          ctx.restore();
        }
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private updateCursor(): void {
    const r = 10;
    const size = r * 4;
    const off = document.createElement('canvas');
    off.width = size; off.height = size;
    const o = off.getContext('2d')!;
    o.strokeStyle = 'rgba(255,255,255,0.7)';
    o.lineWidth = 1.2;
    o.beginPath();
    o.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    o.stroke();
    o.beginPath();
    o.moveTo(size / 2 - r - 4, size / 2);
    o.lineTo(size / 2 - 3, size / 2);
    o.moveTo(size / 2 + 3, size / 2);
    o.lineTo(size / 2 + r + 4, size / 2);
    o.moveTo(size / 2, size / 2 - r - 4);
    o.lineTo(size / 2, size / 2 - 3);
    o.moveTo(size / 2, size / 2 + 3);
    o.lineTo(size / 2, size / 2 + r + 4);
    o.strokeStyle = this.currentColor;
    o.fillStyle = this.currentColor;
    o.stroke();
    o.beginPath();
    o.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
    o.fill();
    const url = off.toDataURL('image/png');
    this.canvas.style.cursor = `url(${url}) ${size / 2} ${size / 2}, crosshair`;
  }

  destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }
}
