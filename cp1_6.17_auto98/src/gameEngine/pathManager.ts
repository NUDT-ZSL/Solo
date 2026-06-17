export interface Point {
  x: number;
  y: number;
}

export interface Checkpoint {
  position: Point;
  index: number;
  activated: boolean;
}

export interface Enemy {
  id: number;
  position: Point;
  pathProgress: number;
  currentSegment: number;
  health: number;
  maxHealth: number;
  baseSpeed: number;
  speed: number;
  temporarySpeedMultiplier: number;
  speedBoostRemainingTime: number;
  permanentSpeedMultiplier: number;
  slowTimer: number;
  passedCheckpoints: number;
  isFlashing: boolean;
  flashTimer: number;
  active: boolean;
}

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

export interface EnemyUpdateResult {
  enemies: Enemy[];
  reachedEndCount: number;
  activatedCheckpointIndices: number[];
}

export function updateEnemiesAlongPath(
  enemies: Enemy[],
  deltaTime: number,
  path: Point[],
  checkpoints: Checkpoint[]
): EnemyUpdateResult {
  const updatedEnemies: Enemy[] = [];
  let reachedEndCount = 0;
  const activatedCheckpointIndices: number[] = [];

  for (const enemy of enemies) {
    if (!enemy.active) continue;

    let e = { ...enemy };

    if (e.flashTimer > 0) {
      e.flashTimer -= deltaTime;
      e.isFlashing = e.flashTimer > 0;
    }

    if (e.speedBoostRemainingTime > 0) {
      e.speedBoostRemainingTime -= deltaTime;
      if (e.speedBoostRemainingTime <= 0) {
        e.speedBoostRemainingTime = 0;
        e.temporarySpeedMultiplier = 1;
      }
    }

    if (e.slowTimer > 0) {
      e.slowTimer -= deltaTime;
    }
    const slowMultiplier = e.slowTimer > 0 ? 0.5 : 1;

    e.speed = e.baseSpeed * e.permanentSpeedMultiplier * e.temporarySpeedMultiplier * slowMultiplier;

    let currentSegment = e.currentSegment;
    let pathProgress = e.pathProgress;
    let remainingDelta = deltaTime;

    while (remainingDelta > 0 && currentSegment < path.length - 1) {
      const segmentStart = path[currentSegment];
      const segmentEnd = path[currentSegment + 1];
      const dx = segmentEnd.x - segmentStart.x;
      const dy = segmentEnd.y - segmentStart.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      const moveDistance = (e.speed * remainingDelta) / 1000;
      const remainingDist = (1 - pathProgress) * segmentLength;

      if (moveDistance < remainingDist) {
        pathProgress += moveDistance / segmentLength;
        remainingDelta = 0;
      } else {
        const timeForSegment = (remainingDist / e.speed) * 1000;
        remainingDelta -= timeForSegment;
        pathProgress = 0;
        currentSegment++;
      }
    }

    if (currentSegment >= path.length - 1) {
      reachedEndCount++;
      continue;
    }

    e.currentSegment = currentSegment;
    e.pathProgress = pathProgress;

    const currentStart = path[e.currentSegment];
    const currentEnd = path[e.currentSegment + 1];
    e.position = {
      x: currentStart.x + (currentEnd.x - currentStart.x) * e.pathProgress,
      y: currentStart.y + (currentEnd.y - currentStart.y) * e.pathProgress,
    };

    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      if (cp.activated) continue;
      const dist = Math.sqrt(
        Math.pow(e.position.x - cp.position.x, 2) +
        Math.pow(e.position.y - cp.position.y, 2)
      );
      if (dist < 20) {
        e.temporarySpeedMultiplier = 1.2;
        e.speedBoostRemainingTime = 2000;
        e.permanentSpeedMultiplier += 0.05;
        e.passedCheckpoints++;
        activatedCheckpointIndices.push(i);
      }
    }

    updatedEnemies.push(e);
  }

  return {
    enemies: updatedEnemies,
    reachedEndCount,
    activatedCheckpointIndices,
  };
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
