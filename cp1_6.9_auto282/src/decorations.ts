import { v4 as uuidv4 } from 'uuid';

export interface Petal {
  id: string;
  x: number;
  y: number;
  diameter: number;
  hue: number;
  saturation: number;
  lightness: number;
  opacity: number;
  fallSpeed: number;
  rotation: number;
  angularVelocity: number;
}

export interface Mountain {
  id: string;
  x: number;
  width: number;
  height: number;
  points: { x: number; y: number }[];
  opacity: number;
  moveSpeed: number;
}

export interface BrushFeatures {
  avgDirection: number;
  avgOpacity: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generatePetal(
  scrollOffset: number,
  canvasWidth: number,
  canvasHeight: number,
  _features: BrushFeatures
): Petal {
  const hue = rand(160, 350);
  return {
    id: uuidv4(),
    x: scrollOffset + canvasWidth * rand(0.3, 0.9),
    y: canvasHeight * rand(0.05, 0.25),
    diameter: rand(8, 15),
    hue,
    saturation: rand(40, 70),
    lightness: rand(70, 85),
    opacity: rand(0.35, 0.55),
    fallSpeed: rand(30, 50),
    rotation: rand(0, Math.PI * 2),
    angularVelocity: 0.5 * (Math.random() > 0.5 ? 1 : -1)
  };
}

export function generateMountain(
  scrollOffset: number,
  canvasWidth: number,
  canvasHeight: number,
  _features: BrushFeatures
): Mountain {
  const height = rand(40, 80);
  const width = rand(180, 320);
  const pointCount = Math.floor(rand(6, 11));
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= pointCount; i++) {
    const px = (i / pointCount) * width;
    let py: number;
    if (i === 0 || i === pointCount) {
      py = canvasHeight;
    } else {
      const relT = (i / pointCount);
      const hillShape = Math.sin(relT * Math.PI);
      const jitter = rand(-height * 0.2, height * 0.2);
      py = canvasHeight - height * hillShape + jitter;
    }
    points.push({ x: px, y: Math.min(py, canvasHeight) });
  }

  return {
    id: uuidv4(),
    x: scrollOffset + canvasWidth + 50,
    width,
    height,
    points,
    opacity: 0.15,
    moveSpeed: 10
  };
}

export function updatePetal(petal: Petal, dt: number): void {
  petal.y += petal.fallSpeed * dt;
  petal.rotation += petal.angularVelocity * dt;
}

export function updateMountain(mountain: Mountain, dt: number): void {
  mountain.x -= mountain.moveSpeed * dt;
}

export function drawPetal(
  ctx: CanvasRenderingContext2D,
  petal: Petal,
  scrollOffset: number
): void {
  const sx = petal.x - scrollOffset;
  const sy = petal.y;
  const r = petal.diameter / 2;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(petal.rotation);
  ctx.globalAlpha = petal.opacity;

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  gradient.addColorStop(
    0,
    `hsl(${petal.hue}, ${petal.saturation}%, ${petal.lightness + 5}%)`
  );
  gradient.addColorStop(
    1,
    `hsl(${petal.hue}, ${petal.saturation - 10}%, ${petal.lightness}%)`
  );
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.9, -r * 0.7, r * 0.9, r * 0.5, 0, r);
  ctx.bezierCurveTo(-r * 0.9, r * 0.5, -r * 0.9, -r * 0.7, 0, -r);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `hsla(${petal.hue}, ${petal.saturation}%, ${petal.lightness - 20}%, 0.3)`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.2, 0, 0, r * 0.8);
  ctx.stroke();

  ctx.restore();
}

export function drawMountain(
  ctx: CanvasRenderingContext2D,
  mountain: Mountain,
  scrollOffset: number,
  canvasHeight: number
): void {
  const baseX = mountain.x - scrollOffset;
  const pts = mountain.points;
  if (pts.length < 2) return;

  ctx.save();
  ctx.globalAlpha = mountain.opacity;

  const gradient = ctx.createLinearGradient(baseX, canvasHeight - mountain.height, baseX, canvasHeight);
  gradient.addColorStop(0, 'hsla(0, 0%, 40%, 1)');
  gradient.addColorStop(1, 'hsla(0, 0%, 60%, 0.6)');
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(baseX + pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = baseX + (prev.x + curr.x) / 2;
    const cpy = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(baseX + prev.x, prev.y, cpx, cpy);
  }

  ctx.lineTo(baseX + pts[pts.length - 1].x, canvasHeight);
  ctx.lineTo(baseX + pts[0].x, canvasHeight);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
