import { v4 as uuidv4 } from 'uuid';

export interface BrushPoint {
  x: number;
  y: number;
  width: number;
  opacity: number;
  hue: number;
  saturation: number;
  lightness: number;
  timestamp: number;
}

export interface BrushStroke {
  id: string;
  points: BrushPoint[];
  createdAt: number;
}

const SPEED_SLOW = 50;
const SPEED_FAST = 150;
const WIDTH_SLOW = 20;
const WIDTH_FAST = 4;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computePointStyle(speed: number): {
  width: number;
  hue: number;
  saturation: number;
  lightness: number;
} {
  if (speed < SPEED_SLOW) {
    return {
      width: WIDTH_SLOW,
      hue: 0,
      saturation: 0,
      lightness: 30
    };
  } else if (speed > SPEED_FAST) {
    return {
      width: WIDTH_FAST,
      hue: 160,
      saturation: 60,
      lightness: 70
    };
  } else {
    const t = (speed - SPEED_SLOW) / (SPEED_FAST - SPEED_SLOW);
    return {
      width: lerp(WIDTH_SLOW, WIDTH_FAST, t),
      hue: lerp(0, 160, t),
      saturation: lerp(0, 60, t),
      lightness: lerp(30, 70, t)
    };
  }
}

export function createStroke(): BrushStroke {
  return {
    id: uuidv4(),
    points: [],
    createdAt: performance.now()
  };
}

export function addPointToStroke(
  stroke: BrushStroke,
  worldX: number,
  y: number,
  speed: number,
  timestamp?: number
): BrushPoint {
  const style = computePointStyle(speed);
  const point: BrushPoint = {
    x: worldX,
    y: clamp(y, 60, Number.MAX_SAFE_INTEGER),
    width: style.width,
    opacity: 0.75 + Math.random() * 0.15,
    hue: style.hue,
    saturation: style.saturation,
    lightness: style.lightness,
    timestamp: timestamp ?? performance.now()
  };
  stroke.points.push(point);
  return point;
}

export function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  stroke: BrushStroke,
  scrollOffset: number,
  _canvasHeight: number
): void {
  const points = stroke.points;
  if (points.length < 1) return;

  if (points.length === 1) {
    const p = points[0];
    const screenX = p.x - scrollOffset;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = `hsl(${p.hue}, ${p.saturation}%, ${p.lightness}%)`;
    ctx.beginPath();
    ctx.arc(screenX, p.y, p.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const steps = Math.max(2, Math.ceil(Math.hypot(curr.x - prev.x, curr.y - prev.y) / 2));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const px = lerp(prev.x, curr.x, t) - scrollOffset;
      const py = lerp(prev.y, curr.y, t);
      const pw = lerp(prev.width, curr.width, t);
      const ph = lerp(prev.hue, curr.hue, t);
      const ps = lerp(prev.saturation, curr.saturation, t);
      const pl = lerp(prev.lightness, curr.lightness, t);
      const po = lerp(prev.opacity, curr.opacity, t);

      ctx.save();
      ctx.globalAlpha = po;
      ctx.fillStyle = `hsl(${ph}, ${ps}%, ${pl}%)`;
      ctx.beginPath();
      ctx.arc(px, py, pw / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function getStrokeAverageOpacity(stroke: BrushStroke): number {
  if (stroke.points.length === 0) return 0;
  const sum = stroke.points.reduce((acc, p) => acc + p.opacity, 0);
  return sum / stroke.points.length;
}

export function getStrokeDirection(stroke: BrushStroke): number {
  const pts = stroke.points;
  if (pts.length < 2) return 0;
  const start = pts[0];
  const end = pts[pts.length - 1];
  return Math.atan2(end.y - start.y, end.x - start.x);
}

export function getStrokeAvgSpeed(stroke: BrushStroke): number {
  const pts = stroke.points;
  if (pts.length < 2) return 0;
  let totalDist = 0;
  for (let i = 1; i < pts.length; i++) {
    totalDist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  const duration = (pts[pts.length - 1].timestamp - pts[0].timestamp) / 1000;
  return duration > 0 ? totalDist / duration : 0;
}
