import type { NodeData } from './types';

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function generateRandomHue(): number {
  return Math.floor(Math.random() * 360);
}

export function hslToString(hue: number, saturation = 80, lightness = 90, alpha = 1): string {
  if (alpha < 1) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function mixHue(h1: number, h2: number, ratio = 0.5): number {
  const diff = Math.abs(h1 - h2);
  if (diff > 180) {
    if (h1 < h2) h1 += 360;
    else h2 += 360;
  }
  return (h1 * (1 - ratio) + h2 * ratio) % 360;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getBezierPoint(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  t: number
): { x: number; y: number } {
  const it = 1 - t;
  return {
    x: it * it * x1 + 2 * it * t * cx + t * t * x2,
    y: it * it * y1 + 2 * it * t * cy + t * t * y2,
  };
}

export function findNearbyNodes(
  target: NodeData,
  nodes: NodeData[],
  threshold = 100
): NodeData[] {
  return nodes.filter(
    (n) => n.id !== target.id && distance(target.x, target.y, n.x, n.y) < threshold
  );
}

export function snapToGrid(
  node: NodeData,
  nodes: NodeData[],
  gridSize = 40,
  threshold = 100
): { x: number; y: number } | null {
  const nearby = findNearbyNodes(node, nodes, threshold);
  if (nearby.length === 0) return null;

  let bestX = node.x;
  let bestY = node.y;
  let bestDist = Infinity;

  nearby.forEach((n) => {
    const offsets = [
      [gridSize, 0],
      [-gridSize, 0],
      [0, gridSize],
      [0, -gridSize],
      [gridSize, gridSize],
      [-gridSize, gridSize],
      [gridSize, -gridSize],
      [-gridSize, -gridSize],
    ];

    offsets.forEach(([ox, oy]) => {
      const tx = n.x + ox;
      const ty = n.y + oy;
      const d = distance(node.x, node.y, tx, ty);
      if (d < bestDist) {
        bestDist = d;
        bestX = tx;
        bestY = ty;
      }
    });
  });

  if (bestDist < threshold) {
    return { x: bestX, y: bestY };
  }
  return null;
}

export function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export function heatColor(connectionCount: number, maxConnections = 10): number {
  const ratio = Math.min(connectionCount / maxConnections, 1);
  const blue = 220;
  const red = 0;
  return lerp(blue, red, ratio);
}

export function heatSize(connectionCount: number, baseSize = 40, increment = 8): number {
  return baseSize + connectionCount * increment;
}

export function edgeOpacity(fromCount: number, toCount: number, maxCount = 10): number {
  const total = fromCount + toCount;
  const maxTotal = maxCount * 2;
  return 0.3 + Math.min(total / maxTotal, 1) * 0.7;
}
