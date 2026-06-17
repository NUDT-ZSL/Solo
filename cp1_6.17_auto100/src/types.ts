export interface ColorNode {
  id: string;
  color: string;
  x: number;
  y: number;
}

export type GradientType = 'linear' | 'radial';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function randomColor(): string {
  const hex = Math.floor(Math.random() * 16777215).toString(16);
  return '#' + hex.padStart(6, '0');
}

export function computeStopPosition(
  x: number,
  y: number,
  angle: number,
  type: GradientType
): number {
  if (type === 'radial') {
    const dx = x - 50;
    const dy = y - 50;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.round(Math.max(0, Math.min(100, dist)));
  }
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  let tPos = Infinity;
  let tNeg = -Infinity;
  if (dx > 1e-6) {
    tPos = Math.min(tPos, 50 / dx);
    tNeg = Math.max(tNeg, -50 / dx);
  } else if (dx < -1e-6) {
    tPos = Math.min(tPos, -50 / dx);
    tNeg = Math.max(tNeg, 50 / dx);
  }
  if (dy > 1e-6) {
    tPos = Math.min(tPos, 50 / dy);
    tNeg = Math.max(tNeg, -50 / dy);
  } else if (dy < -1e-6) {
    tPos = Math.min(tPos, -50 / dy);
    tNeg = Math.max(tNeg, 50 / dy);
  }
  if (!isFinite(tPos)) tPos = 50;
  if (!isFinite(tNeg)) tNeg = -50;
  const rel = (x - 50) * dx + (y - 50) * dy;
  const pos = ((rel - tNeg) / (tPos - tNeg)) * 100;
  return Math.round(Math.max(0, Math.min(100, pos)));
}

export function buildGradientCSS(
  nodes: ColorNode[],
  angle: number,
  type: GradientType
): string {
  const withPos = nodes.map((n) => ({
    ...n,
    position: computeStopPosition(n.x, n.y, angle, type),
  }));
  const sorted = [...withPos].sort((a, b) => a.position - b.position);
  const stops = sorted.map((n) => `${n.color} ${n.position}%`).join(', ');
  if (type === 'linear') {
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  return `radial-gradient(circle ${angle}% at center, ${stops})`;
}
