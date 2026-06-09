import type { Point, TrailPoint, Building, BrushParams } from './types';

const BASE_DARK_COLOR = '#1A1A2E';
const BUILDING_DARK_START = '#0B0C10';
const BUILDING_DARK_END = '#1F1B2E';
const STATIONARY_THRESHOLD_MS = 500;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function getComplementaryColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(255 - r, 255 - g, 255 - b);
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

export function createBuilding(
  canvasWidth: number,
  canvasHeight: number,
  glowColor: string
): Building {
  const shape: 'rect' | 'trapezoid' = Math.random() > 0.5 ? 'rect' : 'trapezoid';
  const width = 40 + Math.random() * 100;
  const height = 80 + Math.random() * 220;
  const x = Math.random() * (canvasWidth - width);
  const baseY = canvasHeight * (0.55 + Math.random() * 0.35);
  const topWidth = shape === 'trapezoid' ? width * (0.4 + Math.random() * 0.4) : width;

  const windows: Building['windows'] = [];
  const windowRows = Math.floor(height / 20);
  const windowCols = Math.floor(width / 18);
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      if (Math.random() > 0.35) {
        windows.push({
          x: col * 18 + 6,
          y: row * 20 + 10,
          w: 8,
          h: 12,
          lit: Math.random() > 0.3,
        });
      }
    }
  }

  return {
    x,
    baseY,
    width,
    height,
    shape,
    topWidth,
    opacity: 0,
    targetOpacity: 1,
    glowColor,
    windows,
  };
}

function buildBezierPoints(points: TrailPoint[]): { pts: Point[]; alphas: number[]; thicknesses: number[] } {
  if (points.length < 2) {
    return {
      pts: points.map((p) => ({ x: p.x, y: p.y })),
      alphas: points.map((p) => p.alpha),
      thicknesses: points.map((p) => p.thickness),
    };
  }

  const result: Point[] = [];
  const alphas: number[] = [];
  const thicknesses: number[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let t = 0; t < 1; t += 0.1) {
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      result.push({ x, y });

      const idxT = i + t;
      const alpha =
        points[i].alpha + (points[i + 1].alpha - points[i].alpha) * t;
      const thickness =
        points[i].thickness +
        (points[i + 1].thickness - points[i].thickness) * t;
      alphas.push(alpha);
      thicknesses.push(thickness);
    }
  }

  const last = points[points.length - 1];
  result.push({ x: last.x, y: last.y });
  alphas.push(last.alpha);
  thicknesses.push(last.thickness);

  return { pts: result, alphas, thicknesses };
}

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: TrailPoint[],
  brush: BrushParams,
  now: number
): void {
  if (trail.length < 2) return;

  for (let i = 0; i < trail.length; i++) {
    const age = (now - trail[i].timestamp) / 1000;
    trail[i].alpha = Math.max(0, 1 - age * 0.15);
  }

  const { pts, alphas, thicknesses } = buildBezierPoints(trail);

  for (let pass = 0; pass < 3; pass++) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < pts.length; i++) {
      const alpha = alphas[i] * brush.opacity * (pass === 0 ? 0.15 : pass === 1 ? 0.35 : 1);
      const thickness = thicknesses[i] * (pass === 0 ? 3 : pass === 1 ? 1.8 : 1);
      const color =
        pass < 2
          ? brush.glowColor
          : lerpColor(BASE_DARK_COLOR, brush.color, Math.min(1, alphas[i] * 1.5));

      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);

      const { r, g, b } = hexToRgb(color);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = thickness;
      ctx.stroke();
    }
  }
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: Building,
  zoomLevel: number
): void {
  if (building.opacity <= 0.01) return;

  const zoom = 0.5 + zoomLevel * 0.5;
  const scale = building.opacity * zoom;

  const topY = building.baseY - building.height * scale;
  const leftX = building.x + (building.width - building.width * scale) / 2;
  const rightX = leftX + building.width * scale;
  const topLeftX = leftX + (building.width - building.topWidth * scale) / 2;
  const topRightX = topLeftX + building.topWidth * scale;

  ctx.save();
  ctx.globalAlpha = building.opacity;

  const gradient = ctx.createLinearGradient(0, topY, 0, building.baseY);
  gradient.addColorStop(0, BUILDING_DARK_START);
  gradient.addColorStop(1, BUILDING_DARK_END);

  ctx.beginPath();
  ctx.moveTo(leftX, building.baseY);
  ctx.lineTo(rightX, building.baseY);
  ctx.lineTo(topRightX, topY);
  ctx.lineTo(topLeftX, topY);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = building.glowColor;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = building.glowColor;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const { r, g, b } = hexToRgb(building.glowColor);
  for (const win of building.windows) {
    const winScale = scale;
    const wx = leftX + win.x * winScale;
    const wy = topY + win.y * winScale;
    const ww = win.w * winScale;
    const wh = win.h * winScale;

    if (wx < leftX || wx + ww > rightX || wy < topY || wy + wh > building.baseY) continue;

    if (win.lit) {
      ctx.fillStyle = `rgba(${r},${g},${b},0.75)`;
      ctx.shadowColor = building.glowColor;
      ctx.shadowBlur = 4;
    } else {
      ctx.fillStyle = 'rgba(30,30,50,0.8)';
    }
    ctx.fillRect(wx, wy, ww, wh);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

export function updateBuildings(
  buildings: Building[],
  zoomLevel: number,
  canvasWidth: number,
  canvasHeight: number,
  glowColor: string
): Building[] {
  const targetCount = Math.floor(5 + zoomLevel * 20);

  let updated = buildings.map((b) => {
    const dist = b.targetOpacity - b.opacity;
    return { ...b, opacity: b.opacity + dist * 0.08 };
  });

  updated = updated.filter((b) => b.opacity > 0.01 || b.targetOpacity > 0.01);

  while (updated.length < targetCount) {
    const b = createBuilding(canvasWidth, canvasHeight, glowColor);
    b.opacity = 0;
    updated.push(b);
  }

  if (updated.length > targetCount + 5) {
    for (let i = updated.length - 1; i >= 0 && updated.length > targetCount; i--) {
      if (updated[i].targetOpacity > 0) {
        updated[i].targetOpacity = 0;
      }
    }
  }

  return updated;
}

export function updateCurrentTrailBrightness(
  trail: TrailPoint[],
  now: number,
  stationaryStart: number
): void {
  if (!stationaryStart) return;
  const stationaryDuration = now - stationaryStart;
  if (stationaryDuration < STATIONARY_THRESHOLD_MS) return;

  const boostAmount = Math.min(1, (stationaryDuration - STATIONARY_THRESHOLD_MS) / 1000);
  for (let i = Math.max(0, trail.length - 8); i < trail.length; i++) {
    trail[i].alpha = Math.min(1, trail[i].alpha + boostAmount * 0.02);
  }
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  trails: TrailPoint[][],
  currentTrail: TrailPoint[] | null,
  buildings: Building[],
  brush: BrushParams,
  now: number,
  zoomLevel: number
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const bgGrad = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight / 2,
    0,
    canvasWidth / 2,
    canvasHeight / 2,
    Math.max(canvasWidth, canvasHeight) * 0.7
  );
  bgGrad.addColorStop(0, '#1A1A2E');
  bgGrad.addColorStop(1, '#0A0A0F');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const sortedBuildings = [...buildings].sort(
    (a, b) => a.height * a.opacity - b.height * b.opacity
  );
  for (const b of sortedBuildings) {
    drawBuilding(ctx, b, zoomLevel);
  }

  for (const trail of trails) {
    drawTrail(ctx, trail, brush, now);
  }

  if (currentTrail) {
    drawTrail(ctx, currentTrail, brush, now);
  }
}
