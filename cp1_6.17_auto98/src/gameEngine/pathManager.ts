import { Point, Checkpoint } from '../store/gameStore';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PATH_WIDTH = 40;

export function generatePath(): Point[] {
  return [
    { x: 0, y: 300 },
    { x: 100, y: 300 },
    { x: 150, y: 180 },
    { x: 280, y: 150 },
    { x: 380, y: 280 },
    { x: 450, y: 450 },
    { x: 580, y: 480 },
    { x: 650, y: 350 },
    { x: 720, y: 250 },
    { x: 800, y: 280 },
  ];
}

export function generateCheckpoints(path: Point[]): Checkpoint[] {
  const totalSegments = path.length - 1;
  const indices = [
    Math.floor(totalSegments * 0.25),
    Math.floor(totalSegments * 0.5),
    Math.floor(totalSegments * 0.75),
  ];

  return indices.map((segIdx, i) => {
    const start = path[segIdx];
    const end = path[segIdx + 1];
    const t = 0.5;
    return {
      position: {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      },
      index: i,
      activated: false,
    };
  });
}

export function generateTowerGridPoints(path: Point[]): { position: Point; gridIndex: number }[] {
  const points: { position: Point; gridIndex: number }[] = [];
  const offsets = [
    { x: -50, y: -50 },
    { x: 50, y: -50 },
    { x: -50, y: 50 },
    { x: 50, y: 50 },
  ];

  const keySegments = [1, 3, 5, 7];
  let idx = 0;

  for (const segIdx of keySegments) {
    if (segIdx >= path.length - 1) continue;
    const start = path[segIdx];
    const end = path[segIdx + 1];
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    for (const off of offsets) {
      const pos = { x: midX + off.x, y: midY + off.y };
      if (pos.x > 40 && pos.x < CANVAS_WIDTH - 40 && pos.y > 80 && pos.y < CANVAS_HEIGHT - 40) {
        const minDist = Math.min(
          ...path.slice(0, -1).map((p, i) => {
            const next = path[i + 1];
            const dist = distanceToSegment(pos, p, next);
            return dist;
          })
        );
        if (minDist > PATH_WIDTH / 2 + 10) {
          points.push({ position: pos, gridIndex: idx++ });
        }
      }
      if (points.length >= 12) break;
    }
    if (points.length >= 12) break;
  }

  while (points.length < 12) {
    const segIdx = (points.length * 2) % (path.length - 1);
    const start = path[segIdx];
    const end = path[segIdx + 1];
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2;
    const side = points.length % 2 === 0 ? 1 : -1;
    const dist = 60 + (Math.floor(points.length / 2) % 3) * 10;
    const pos = {
      x: midX + Math.cos(angle) * dist * side,
      y: midY + Math.sin(angle) * dist * side,
    };
    pos.x = Math.max(50, Math.min(CANVAS_WIDTH - 50, pos.x));
    pos.y = Math.max(90, Math.min(CANVAS_HEIGHT - 50, pos.y));
    points.push({ position: pos, gridIndex: idx++ });
  }

  return points.slice(0, 12);
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}
