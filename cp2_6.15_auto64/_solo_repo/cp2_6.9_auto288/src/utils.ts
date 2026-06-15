export type EasingFn = (t: number) => number;

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function generateRandomPosition(
  canvasW: number,
  canvasH: number,
  existingRects: Rect[],
  minDistFromLighthouse: number = 100,
  margin: number = 60,
  maxAttempts: number = 100
): Point | null {
  const lighthouseCenterX = canvasW / 2;
  const lighthouseCenterY = canvasH / 2 + 50;

  for (let i = 0; i < maxAttempts; i++) {
    const x = margin + Math.random() * (canvasW - margin * 2);
    const y = margin + Math.random() * (canvasH - margin * 2 - 50);

    const dx = x - lighthouseCenterX;
    const dy = y - lighthouseCenterY;
    const distToLighthouse = Math.sqrt(dx * dx + dy * dy);

    if (distToLighthouse < minDistFromLighthouse) continue;

    let overlapping = false;
    for (const rect of existingRects) {
      if (rectsOverlap(
        { x: x - 20, y: y - 20, w: 40, h: 40 },
        { x: rect.x, y: rect.y, w: rect.w, h: rect.h }
      )) {
        overlapping = true;
        break;
      }
    }

    if (!overlapping) {
      return { x, y };
    }
  }

  return null;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function pointInDiamond(px: number, py: number, cx: number, cy: number, size: number): boolean {
  const half = size / 2;
  return Math.abs(px - cx) / half + Math.abs(py - cy) / half <= 1;
}

export function pointInRect(px: number, py: number, rect: Rect): boolean {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function drawRoundedDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  cornerRadius: number
): void {
  const half = size / 2;

  ctx.beginPath();
  ctx.moveTo(cx, cy - half + cornerRadius);

  ctx.lineTo(cx + half - cornerRadius, cy);
  ctx.quadraticCurveTo(cx + half, cy, cx + half - cornerRadius * 0.7, cy + cornerRadius * 0.7);

  ctx.lineTo(cx, cy + half - cornerRadius);
  ctx.quadraticCurveTo(cx, cy + half, cx - cornerRadius * 0.7, cy + half - cornerRadius * 0.7);

  ctx.lineTo(cx - half + cornerRadius, cy);
  ctx.quadraticCurveTo(cx - half, cy, cx - half + cornerRadius * 0.7, cy - cornerRadius * 0.7);

  ctx.lineTo(cx, cy - half + cornerRadius);
  ctx.quadraticCurveTo(cx, cy - half, cx + cornerRadius * 0.7, cy - half + cornerRadius * 0.7);

  ctx.closePath();
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function generateNoiseData(width: number, height: number, density: number): Uint8ClampedArray {
  const size = width * height;
  const data = new Uint8ClampedArray(size);
  const threshold = Math.floor(255 * density);

  for (let i = 0; i < size; i++) {
    data[i] = Math.random() * 255 < threshold ? 255 : 0;
  }

  return data;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lerpColor(hex1: string, hex2: string, t: number): { r: number; g: number; b: number } {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
  };
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): { lines: string[]; lastY: number } {
  const chars = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < chars.length; i++) {
    const testLine = currentLine + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = chars[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  let lastY = y;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
    lastY = y + index * lineHeight;
  });

  return { lines, lastY };
}
