export interface Point {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  thickness: number;
  color: string;
}

interface StrokeSegment {
  start: Point;
  control: Point;
  end: Point;
  thickness: number;
  color: string;
  alpha: number;
  createdAt: number;
}

interface TipGlow {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  fading: boolean;
}

const COLOR_START = { r: 0x1A, g: 0x1A, b: 0x1A };
const COLOR_END = { r: 0x3D, g: 0x2B, b: 0x1F };
const MAX_SAMPLE_INTERVAL = 8;
const FADE_DURATION = 2500;
const MIN_SEGMENTS_FOR_FADE = 60;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getInkColor(velocityRatio: number): string {
  const r = Math.round(lerp(COLOR_START.r, COLOR_END.r, velocityRatio));
  const g = Math.round(lerp(COLOR_START.g, COLOR_END.g, velocityRatio));
  const b = Math.round(lerp(COLOR_START.b, COLOR_END.b, velocityRatio));
  return `rgb(${r},${g},${b})`;
}

function getThickness(velocity: number): number {
  const clamped = clamp(velocity, 0, 10);
  const ratio = clamped / 10;
  return 12 - ratio * 11;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export class StrokeManager {
  private points: Point[] = [];
  private segments: StrokeSegment[] = [];
  private totalLength: number = 0;
  private drawing: boolean = false;
  private tipGlow: TipGlow | null = null;
  private baseTipRadius: number = 4;
  private lastSampleTime: number = 0;
  private currentStrokeStartLength: number = 0;
  private highVelocityStart: Point | null = null;
  private highVelocityFrames: number = 0;
  private readonly velocityThreshold = 3;
  private readonly consecutiveFrames = 5;
  private onButterflyTrigger: ((pt: Point) => void) | null = null;

  constructor() {}

  setButterflyTriggerCallback(cb: (pt: Point) => void): void {
    this.onButterflyTrigger = cb;
  }

  setTipBaseRadius(r: number): void {
    this.baseTipRadius = r;
  }

  isDrawing(): boolean {
    return this.drawing;
  }

  beginDrawing(): void {
    this.drawing = true;
    this.points = [];
    this.currentStrokeStartLength = this.totalLength;
    this.highVelocityStart = null;
    this.highVelocityFrames = 0;
  }

  addPoint(x: number, y: number): Point | null {
    const now = performance.now();
    if (now - this.lastSampleTime < MAX_SAMPLE_INTERVAL) {
      return null;
    }
    this.lastSampleTime = now;

    const prev = this.points[this.points.length - 1];
    let velocity = 0;

    if (prev) {
      const dt = Math.max(now - prev.timestamp, 1);
      const frames = dt / (1000 / 60);
      const dist = distance(prev, { x, y });
      velocity = dist / Math.max(frames, 1);
      this.totalLength += dist;
    }

    const vRatio = clamp(velocity / 10, 0, 1);
    const thickness = getThickness(velocity);
    const color = getInkColor(vRatio);

    const point: Point = { x, y, timestamp: now, velocity, thickness, color };
    this.points.push(point);

    if (this.points.length >= 3) {
      const n = this.points.length;
      const p0 = this.points[n - 3];
      const p1 = this.points[n - 2];

      const cx = (p1.x + p0.x) / 2;
      const cy = (p1.y + p0.y) / 2;
      const control: Point = {
        x: cx, y: cy, timestamp: p1.timestamp,
        velocity: p1.velocity, thickness: p1.thickness, color: p1.color
      };

      this.segments.push({
        start: p0,
        control,
        end: p1,
        thickness: p1.thickness,
        color: p1.color,
        alpha: 1,
        createdAt: now
      });

      if (n >= 4) {
        const p00 = this.points[n - 4];
        const segIdx = this.segments.length - 2;
        if (this.segments[segIdx]) {
          const cx2 = (p0.x + p00.x) / 2;
          const cy2 = (p0.y + p00.y) / 2;
          this.segments[segIdx].control = {
            x: cx2, y: cy2, timestamp: p0.timestamp,
            velocity: p0.velocity, thickness: p0.thickness, color: p0.color
          };
        }
      }
    }

    this.tipGlow = {
      x, y,
      radius: this.baseTipRadius,
      alpha: 0.6,
      fading: false
    };

    this.checkButterflyTrigger(point);
    return point;
  }

  private checkButterflyTrigger(pt: Point): void {
    if (pt.velocity > this.velocityThreshold) {
      if (this.highVelocityFrames === 0) {
        this.highVelocityStart = pt;
      }
      this.highVelocityFrames++;
      if (this.highVelocityFrames >= this.consecutiveFrames) {
        if (this.highVelocityStart && this.onButterflyTrigger) {
          this.onButterflyTrigger(this.highVelocityStart);
        }
        this.highVelocityStart = pt;
        this.highVelocityFrames = 1;
      }
    } else {
      this.highVelocityFrames = 0;
      this.highVelocityStart = null;
    }
  }

  endStroke(): { lastPoint: Point | null; length: number } {
    this.drawing = false;
    const strokeLength = this.totalLength - this.currentStrokeStartLength;

    if (this.tipGlow) {
      this.tipGlow.fading = true;
    }

    const last = this.points[this.points.length - 1] || null;
    return { lastPoint: last, length: strokeLength };
  }

  getTotalLength(): number {
    return this.totalLength;
  }

  getRecentPoints(count: number): Point[] {
    return this.points.slice(-count);
  }

  getLastPoint(): Point | null {
    return this.points[this.points.length - 1] || null;
  }

  getTipGlow(): { x: number; y: number; radius: number; alpha: number } | null {
    if (!this.tipGlow || this.tipGlow.alpha <= 0) return null;
    return {
      x: this.tipGlow.x,
      y: this.tipGlow.y,
      radius: this.tipGlow.radius,
      alpha: this.tipGlow.alpha
    };
  }

  updateTipFade(deltaTime: number): void {
    if (!this.tipGlow || !this.tipGlow.fading) return;
    const fadeSpeed = 1 / 600;
    this.tipGlow.alpha = clamp(this.tipGlow.alpha - fadeSpeed * deltaTime, 0, 1);
    this.tipGlow.radius = this.baseTipRadius * (this.tipGlow.alpha / 0.6);
    if (this.tipGlow.alpha <= 0) {
      this.tipGlow = null;
    }
  }

  clear(): void {
    this.points = [];
    this.segments = [];
    this.totalLength = 0;
    this.tipGlow = null;
    this.drawing = false;
    this.highVelocityFrames = 0;
    this.highVelocityStart = null;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    this.applyFade(now);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const seg of this.segments) {
      if (seg.alpha <= 0.01) continue;

      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.quadraticCurveTo(seg.control.x, seg.control.y, seg.end.x, seg.end.y);
      ctx.lineWidth = seg.thickness;
      ctx.strokeStyle = this.applyAlphaToColor(seg.color, seg.alpha);
      ctx.stroke();
    }

    const tip = this.getTipGlow();
    if (tip) {
      ctx.beginPath();
      const grad = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, tip.radius * 2);
      grad.addColorStop(0, `rgba(255,255,255,${tip.alpha})`);
      grad.addColorStop(0.5, `rgba(255,255,255,${tip.alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.arc(tip.x, tip.y, tip.radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private applyFade(now: number): void {
    if (this.segments.length < MIN_SEGMENTS_FOR_FADE || this.drawing) return;
    for (const seg of this.segments) {
      const age = now - seg.createdAt;
      if (age > FADE_DURATION) {
        seg.alpha = clamp(1 - (age - FADE_DURATION) / 3000, 0, 1);
      }
    }
    this.segments = this.segments.filter(s => s.alpha > 0.01);
  }

  private applyAlphaToColor(color: string, alpha: number): string {
    if (color.startsWith('rgb(')) {
      const inner = color.slice(4, -1);
      const [r, g, b] = inner.split(',').map(s => parseInt(s.trim(), 10));
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return color;
  }
}
