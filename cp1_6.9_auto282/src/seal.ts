import { v4 as uuidv4 } from 'uuid';

export interface SealCurve {
  startX: number;
  startY: number;
  cp1X: number;
  cp1Y: number;
  cp2X: number;
  cp2Y: number;
  endX: number;
  endY: number;
}

export interface Seal {
  id: string;
  x: number;
  y: number;
  size: number;
  curves: SealCurve[];
  scale: number;
  placedAt: number;
}

const SEAL_SIZE = 32;
const SEAL_HALF = SEAL_SIZE / 2;
const ANIM_DURATION = 600;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateCurves(): SealCurve[] {
  const count = Math.floor(rand(3, 6));
  const curves: SealCurve[] = [];
  for (let i = 0; i < count; i++) {
    curves.push(generateSingleCurve(i, count));
  }
  return curves;
}

function generateSingleCurve(index: number, total: number): SealCurve {
  const spread = SEAL_HALF * 0.75;
  const baseY = -spread + (index / Math.max(1, total - 1)) * spread * 2;
  const startX = rand(-spread, -spread * 0.3);
  const startY = baseY + rand(-4, 4);
  const endX = rand(spread * 0.3, spread);
  const endY = baseY + rand(-4, 4) + rand(-6, 6);
  const cp1X = startX + rand(4, 10) * (Math.random() > 0.5 ? 1 : -1);
  const cp1Y = startY + rand(-8, 8);
  const cp2X = endX + rand(4, 10) * (Math.random() > 0.5 ? 1 : -1);
  const cp2Y = endY + rand(-8, 8);
  return { startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY };
}

export function placeSeal(worldX: number, canvasY: number): Seal {
  return {
    id: uuidv4(),
    x: worldX,
    y: canvasY,
    size: SEAL_SIZE,
    curves: generateCurves(),
    scale: 0,
    placedAt: performance.now()
  };
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function updateSeal(seal: Seal, now: number): void {
  const elapsed = now - seal.placedAt;
  if (elapsed >= ANIM_DURATION) {
    seal.scale = 1;
    return;
  }
  const t = elapsed / ANIM_DURATION;
  seal.scale = easeOutBack(Math.min(t, 1));
}

export function drawSeal(
  ctx: CanvasRenderingContext2D,
  seal: Seal,
  scrollOffset: number
): void {
  const sx = seal.x - scrollOffset;
  const sy = seal.y;
  const scale = seal.scale;
  if (scale <= 0.001) return;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);

  const cornerRadius = 3;
  const size = seal.size;
  const half = size / 2;

  ctx.fillStyle = 'hsla(0, 100%, 98%, 0.92)';
  roundRect(ctx, -half - 2, -half - 2, size + 4, size + 4, cornerRadius + 1);
  ctx.fill();

  ctx.fillStyle = 'hsl(0, 100%, 50%)';
  roundRect(ctx, -half, -half, size, size, cornerRadius);
  ctx.fill();

  ctx.strokeStyle = 'hsl(0, 100%, 96%)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const curve of seal.curves) {
    ctx.beginPath();
    ctx.moveTo(curve.startX, curve.startY);
    ctx.bezierCurveTo(curve.cp1X, curve.cp1Y, curve.cp2X, curve.cp2Y, curve.endX, curve.endY);
    ctx.stroke();
  }

  ctx.strokeStyle = 'hsla(0, 85%, 38%, 0.85)';
  ctx.lineWidth = 1.4;
  roundRect(ctx, -half, -half, size, size, cornerRadius);
  ctx.stroke();

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
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
