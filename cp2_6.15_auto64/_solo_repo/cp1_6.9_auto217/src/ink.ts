export interface InkPoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  brushSize: number;
  color: string;
}

export interface InkStroke {
  id: string;
  points: InkPoint[];
  color: string;
  brushSize: number;
  createdAt: number;
  bloomProgress: number;
  opacity: number;
  fadeOutStart: number | null;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  time: number;
  deltaTime: number;
}

const BLOOM_DURATION = 1000;
const FADE_DURATION = 300;
const BLOOM_MIN_RADIUS = 5;
const BLOOM_MAX_RADIUS = 15;

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function parseColor(color: string): { r: number; g: number; b: number } {
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10)
    };
  }
  const hex = color.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

export function getComplementaryColor(hex: string): string {
  const { r, g, b } = parseColor(hex);
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;
  const h = (compR * 0.299 + compG * 0.587 + compB * 0.114) > 128 ? 0.7 : 1.2;
  const adjR = Math.min(255, Math.floor(compR * h));
  const adjG = Math.min(255, Math.floor(compG * h));
  const adjB = Math.min(255, Math.floor(compB * h));
  return `rgb(${adjR}, ${adjG}, ${adjB})`;
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function createStroke(
  color: string,
  brushSize: number,
  createdAt: number
): InkStroke {
  return {
    id: Math.random().toString(36).substring(2, 11),
    points: [],
    color,
    brushSize,
    createdAt,
    bloomProgress: 0,
    opacity: 1,
    fadeOutStart: null
  };
}

export function addPoint(
  stroke: InkStroke,
  x: number,
  y: number,
  pressure: number,
  time: number
): void {
  stroke.points.push({
    x,
    y,
    pressure: Math.max(0.2, Math.min(1, pressure)),
    timestamp: time,
    brushSize: stroke.brushSize,
    color: stroke.color
  });
}

export function updateStrokeBloom(stroke: InkStroke, time: number): void {
  if (stroke.fadeOutStart !== null) {
    const fadeElapsed = time - stroke.fadeOutStart;
    stroke.opacity = Math.max(0, 1 - fadeElapsed / FADE_DURATION);
    return;
  }
  const age = time - stroke.createdAt;
  stroke.bloomProgress = Math.min(1, age / BLOOM_DURATION);
}

export function isStrokeFaded(stroke: InkStroke): boolean {
  return stroke.fadeOutStart !== null && stroke.opacity <= 0;
}

function drawBloomCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseSize: number,
  bloomAmount: number,
  color: string,
  pressure: number,
  opacity: number
): void {
  const bloomRadius = (BLOOM_MIN_RADIUS + (BLOOM_MAX_RADIUS - BLOOM_MIN_RADIUS) * bloomAmount);
  const totalRadius = baseSize + bloomRadius;
  const rgb = parseColor(color);
  const baseAlpha = 0.55 * pressure * opacity;

  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, totalRadius);
  const innerSize = baseSize * 0.5;
  const innerRatio = Math.min(1, innerSize / totalRadius);
  gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha})`);
  gradient.addColorStop(innerRatio * 0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha * 0.6})`);
  gradient.addColorStop(innerRatio, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha * 0.35})`);
  gradient.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha * 0.18})`);
  gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, totalRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoreCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  pressure: number,
  opacity: number
): void {
  const rgb = parseColor(color);
  const coreAlpha = 0.85 * pressure * opacity;
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${coreAlpha})`);
  gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${coreAlpha * 0.85})`);
  gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${coreAlpha * 0.4})`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  _time: number
): void {
  if (stroke.opacity <= 0) return;
  const points = stroke.points;
  if (points.length === 0) return;
  const bloomEased = easeOutQuad(stroke.bloomProgress);

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let prevPoint = i > 0 ? points[i - 1] : point;
    const distance = Math.hypot(point.x - prevPoint.x, point.y - prevPoint.y);
    const steps = Math.max(1, Math.ceil(distance / 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const ix = prevPoint.x + (point.x - prevPoint.x) * t;
      const iy = prevPoint.y + (point.y - prevPoint.y) * t;
      const ip = prevPoint.pressure + (point.pressure - prevPoint.pressure) * t;
      const jitterX = (Math.sin(ix * 0.12 + iy * 0.08 + point.timestamp * 0.001) * 2.5) * bloomEased;
      const jitterY = (Math.cos(ix * 0.09 - iy * 0.11 + point.timestamp * 0.0012) * 2.5) * bloomEased;
      const bx = ix + jitterX;
      const by = iy + jitterY;
      const size = stroke.brushSize * 0.5 * ip;
      drawBloomCircle(ctx, bx, by, size, bloomEased, stroke.color, ip, stroke.opacity);
      drawCoreCircle(ctx, ix, iy, size * 0.55, stroke.color, ip, stroke.opacity);
    }
  }
}

export function startFade(stroke: InkStroke, time: number): void {
  if (stroke.fadeOutStart === null) {
    stroke.fadeOutStart = time;
  }
}
