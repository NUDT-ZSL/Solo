import type { StarField } from './stars';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export interface BezierCurve {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: { x: number; y: number };
}

export type CraneState = 'folding' | 'flying' | 'unfolding' | 'done';

export interface PaperCrane {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  foldProgress: number;
  trail: TrailPoint[];
  state: CraneState;
  path: BezierCurve;
  flyProgress: number;
  text: string;
  opacity: number;
}

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function cubicBezierDerivative(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function createFlightPath(width: number, height: number): BezierCurve {
  return {
    p0: { x: width * 0.08, y: height * 0.88 },
    p1: { x: width * 0.15, y: height * 0.35 },
    p2: { x: width * 0.7, y: height * 0.7 },
    p3: { x: width * 0.5, y: height * 0.38 },
  };
}

export function createCrane(text: string, width: number, height: number, scale: number): PaperCrane {
  const path = createFlightPath(width, height);
  return {
    x: path.p0.x,
    y: path.p0.y,
    scale,
    rotation: 0,
    foldProgress: 0,
    trail: [],
    state: 'folding',
    path,
    flyProgress: 0,
    text,
    opacity: 1,
  };
}

export function updateCrane(crane: PaperCrane, dt: number, starField: StarField): boolean {
  switch (crane.state) {
    case 'folding':
      crane.foldProgress += dt * 1.5;
      if (crane.foldProgress >= 1) {
        crane.foldProgress = 1;
        crane.state = 'flying';
      }
      break;
    case 'flying': {
      crane.flyProgress += dt * 0.5;
      if (crane.flyProgress >= 1) crane.flyProgress = 1;
      const t = easeInOutCubic(crane.flyProgress);
      crane.x = cubicBezier(t, crane.path.p0.x, crane.path.p1.x, crane.path.p2.x, crane.path.p3.x);
      crane.y = cubicBezier(t, crane.path.p0.y, crane.path.p1.y, crane.path.p2.y, crane.path.p3.y);
      const dx = cubicBezierDerivative(t, crane.path.p0.x, crane.path.p1.x, crane.path.p2.x, crane.path.p3.x);
      const dy = cubicBezierDerivative(t, crane.path.p0.y, crane.path.p1.y, crane.path.p2.y, crane.path.p3.y);
      crane.rotation = Math.atan2(dy, dx);
      crane.trail.push({ x: crane.x, y: crane.y, alpha: 1, size: 2.5 });
      if (crane.trail.length > 60) crane.trail.shift();
      starField.brightnessBoost = Math.min(0.2, starField.brightnessBoost + dt * 0.3);
      if (crane.flyProgress >= 1) {
        crane.state = 'unfolding';
        crane.foldProgress = 1;
      }
      break;
    }
    case 'unfolding':
      crane.foldProgress -= dt * 1.2;
      crane.opacity = crane.foldProgress;
      if (crane.foldProgress <= 0) {
        crane.foldProgress = 0;
        crane.opacity = 0;
        crane.state = 'done';
        return true;
      }
      break;
    case 'done':
      return true;
  }
  for (const tp of crane.trail) {
    tp.alpha -= dt * 1.5;
    tp.size -= dt * 1.5;
  }
  crane.trail = crane.trail.filter(tp => tp.alpha > 0 && tp.size > 0);
  return false;
}

export function drawCrane(ctx: CanvasRenderingContext2D, crane: PaperCrane, time: number) {
  if (crane.state === 'done') return;
  for (const tp of crane.trail) {
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, Math.max(0.5, tp.size), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 100, ${tp.alpha * 0.6})`;
    ctx.fill();
  }
  if (crane.state === 'folding' || crane.state === 'flying' || crane.state === 'unfolding') {
    ctx.save();
    ctx.translate(crane.x, crane.y);
    ctx.rotate(crane.rotation);
    ctx.scale(crane.scale, crane.scale);
    const glow = 0.6 + Math.sin(time * 3) * 0.15;
    drawCraneShape(ctx, crane.foldProgress, crane.opacity, glow);
    ctx.restore();
  }
}

function drawCraneShape(ctx: CanvasRenderingContext2D, foldProgress: number, opacity: number, glow: number) {
  ctx.globalAlpha = opacity;
  const s = 25;
  ctx.strokeStyle = `rgba(255, 215, 100, ${glow})`;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = `rgba(255, 220, 120, ${glow * 0.15})`;
  ctx.shadowColor = 'rgba(255, 215, 100, 0.5)';
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(-s * 1.2, 0);
  ctx.lineTo(-s * 0.3, -s * 0.15);
  ctx.lineTo(0, -s * 0.6 * foldProgress);
  ctx.lineTo(s * 0.3, -s * 0.15);
  ctx.lineTo(s * 1.2, 0);
  ctx.lineTo(s * 0.3, s * 0.1);
  ctx.lineTo(0, s * 0.5 * foldProgress);
  ctx.lineTo(-s * 0.3, s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-s * 0.6, -s * 0.05);
  ctx.lineTo(-s * 1.0, -s * 0.25 * foldProgress);
  ctx.strokeStyle = `rgba(255, 215, 100, ${glow * 0.6})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-s * 0.6, s * 0.03);
  ctx.lineTo(-s * 1.0, s * 0.25 * foldProgress);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -s * 0.6 * foldProgress);
  ctx.lineTo(s * 0.05, -s * 0.9 * foldProgress);
  ctx.strokeStyle = `rgba(255, 215, 100, ${glow * 0.5})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
