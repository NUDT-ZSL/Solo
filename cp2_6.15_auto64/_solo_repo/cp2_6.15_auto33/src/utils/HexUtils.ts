import type { HexCoord } from '../shared/types';

export const HEX_SIZE = 40;

const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

export function coordKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

export function hexToPixel(q: number, r: number, size: number = HEX_SIZE): { x: number; y: number } {
  const x = size * (3 / 2 * q);
  const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export function pixelToHex(x: number, y: number, size: number = HEX_SIZE): HexCoord {
  const q = (2 / 3 * x) / size;
  const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / size;
  return hexRound(q, r);
}

export function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function getHexNeighbors(hex: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

export function isValidHex(hex: HexCoord, gridSize: number): boolean {
  return hex.q >= 0 && hex.q < gridSize && hex.r >= 0 && hex.r < gridSize;
}

export function getHexCorners(cx: number, cy: number, size: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return corners;
}

export function drawHex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options?: {
    fill?: string;
    stroke?: string;
    lineWidth?: number;
    alpha?: number;
  }
) {
  const { fill, stroke, lineWidth = 1, alpha = 1 } = options || {};

  ctx.beginPath();
  const corners = getHexCorners(cx, cy, size);
  for (let i = 0; i < corners.length; i++) {
    if (i === 0) {
      ctx.moveTo(corners[i].x, corners[i].y);
    } else {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
  }
  ctx.closePath();

  ctx.save();
  ctx.globalAlpha = alpha;

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  ctx.restore();
}

export function pointInHex(px: number, py: number, hx: number, hy: number, size: number): boolean {
  const corners = getHexCorners(hx, hy, size);
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const xi = corners[i].x, yi = corners[i].y;
    const xj = corners[j].x, yj = corners[j].y;

    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

interface AStarNode {
  coord: HexCoord;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

interface TerrainWeights {
  [key: string]: number;
}

export function aStarSearch(
  start: HexCoord,
  goal: HexCoord,
  gridSize: number,
  blockedSet: Set<string>,
  terrainWeights: TerrainWeights = {},
  allowGoal = true
): HexCoord[] | null {
  const open: AStarNode[] = [];
  const closed = new Set<string>();
  const allNodes = new Map<string, AStarNode>();

  const startKey = coordKey(start);
  const goalKey = coordKey(goal);

  if (!isValidHex(start, gridSize) || (!isValidHex(goal, gridSize) && allowGoal)) {
    return null;
  }

  if (blockedSet.has(startKey) || (blockedSet.has(goalKey) && !allowGoal)) {
    return null;
  }

  const startNode: AStarNode = {
    coord: start,
    g: 0,
    h: hexDistance(start, goal),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  open.push(startNode);
  allNodes.set(startKey, startNode);

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = coordKey(current.coord);

    if (currentKey === goalKey) {
      const path: HexCoord[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift(node.coord);
        node = node.parent;
      }
      return smoothPath(path, blockedSet, gridSize);
    }

    closed.add(currentKey);

    for (const neighbor of getHexNeighbors(current.coord)) {
      const nKey = coordKey(neighbor);

      if (closed.has(nKey)) continue;
      if (!isValidHex(neighbor, gridSize)) continue;
      if (blockedSet.has(nKey) && nKey !== goalKey) continue;

      const terrainCost = terrainWeights[nKey] || 1;
      const tentativeG = current.g + terrainCost;

      let neighborNode = allNodes.get(nKey);
      if (!neighborNode) {
        neighborNode = {
          coord: neighbor,
          g: tentativeG,
          h: hexDistance(neighbor, goal),
          f: 0,
          parent: current,
        };
        neighborNode.f = neighborNode.g + neighborNode.h;
        open.push(neighborNode);
        allNodes.set(nKey, neighborNode);
      } else if (tentativeG < neighborNode.g) {
        neighborNode.g = tentativeG;
        neighborNode.f = neighborNode.g + neighborNode.h;
        neighborNode.parent = current;
      }
    }
  }

  return null;
}

function smoothPath(path: HexCoord[], blockedSet: Set<string>, gridSize: number): HexCoord[] {
  if (path.length < 3) return path;

  const smoothed: HexCoord[] = [path[0]];
  let i = 0;

  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1) {
      if (hasLineOfSight(path[i], path[j], blockedSet, gridSize)) {
        break;
      }
      j--;
    }
    smoothed.push(path[j]);
    i = j;
  }

  return smoothed;
}

function hasLineOfSight(a: HexCoord, b: HexCoord, blockedSet: Set<string>, gridSize: number): boolean {
  const points = getLinePoints(a, b);
  for (const p of points) {
    if (p.q === a.q && p.r === a.r) continue;
    if (p.q === b.q && p.r === b.r) continue;
    if (!isValidHex(p, gridSize)) return false;
    if (blockedSet.has(coordKey(p))) return false;
  }
  return true;
}

function getLinePoints(a: HexCoord, b: HexCoord): HexCoord[] {
  const points: HexCoord[] = [];
  const n = hexDistance(a, b);
  const step = 1.0 / Math.max(n, 1);

  for (let i = 0; i <= n; i++) {
    const t = step * i;
    const q = lerp(a.q, b.q, t);
    const r = lerp(a.r, b.r, t);
    points.push(hexRound(q, r));
  }

  return points;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getFactionColor(faction: 'red' | 'blue' | 'neutral'): {
  primary: string;
  secondary: string;
  dark: string;
  light: string;
} {
  switch (faction) {
    case 'red':
      return {
        primary: '#ff4444',
        secondary: '#ff6644',
        dark: '#aa2222',
        light: '#ff8866',
      };
    case 'blue':
      return {
        primary: '#4444ff',
        secondary: '#4488ff',
        dark: '#2222aa',
        light: '#6688ff',
      };
    case 'neutral':
      return {
        primary: '#888888',
        secondary: '#aaaaaa',
        dark: '#555555',
        light: '#cccccc',
      };
  }
}

export function getHealthColor(ratio: number): string {
  if (ratio > 0.6) return '#44ff44';
  if (ratio > 0.3) return '#ffaa00';
  return '#ff4444';
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}
