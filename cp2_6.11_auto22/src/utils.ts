export interface StrokePoint {
  x: number;
  y: number;
  time: number;
}

export interface StrokeSegment {
  id: number;
  points: StrokePoint[];
  color: string;
  width: number;
  startTime: number;
  endTime: number;
}

export interface SampledParticle {
  x: number;
  y: number;
  color: string;
  curvature: number;
  normalX: number;
  normalY: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hexToHsl(hex: string): HSL {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function getBrightnessFactor(hex: string): number {
  const { l } = hexToHsl(hex);
  return 1 - l / 100;
}

export function computeCurvature(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): number {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p3.x - p2.x, d2y = p3.y - p2.y;
  const len1 = Math.sqrt(d1x * d1x + d1y * d1y);
  const len2 = Math.sqrt(d2x * d2x + d2y * d2y);
  if (len1 < 1e-6 || len2 < 1e-6) return 0;
  const dot = (d1x * d2x + d1y * d2y) / (len1 * len2);
  const clamped = Math.max(-1, Math.min(1, dot));
  return Math.acos(clamped);
}

export function computeTangent(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { tx: number; ty: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) return { tx: 1, ty: 0 };
  return { tx: dx / len, ty: dy / len };
}

export function computeNormal2D(tx: number, ty: number): { nx: number; ny: number } {
  return { nx: -ty, ny: tx };
}

export function sampleStrokeByDistance(
  points: { x: number; y: number }[],
  interval: number
): { x: number; y: number }[] {
  if (points.length < 2) return points.slice();
  const result: { x: number; y: number }[] = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    let remaining = segLen;
    let current = 0;
    while (acc + remaining >= interval) {
      const need = interval - acc;
      current += need;
      remaining -= need;
      const t = current / segLen;
      result.push({ x: p0.x + dx * t, y: p0.y + dy * t });
      acc = 0;
    }
    acc += remaining;
  }
  result.push(points[points.length - 1]);
  return result;
}
