export interface Point {
  x: number;
  y: number;
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Stalactite {
  x: number;
  y: number;
  baseWidth: number;
  height: number;
  isTop: boolean;
  segments: WallSegment[];
}

export interface CaveMap {
  width: number;
  height: number;
  topCurve: Point[];
  bottomCurve: Point[];
  walls: WallSegment[];
  stalactites: Stalactite[];
  bugSpawnPoints: Point[];
}

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
  };
}

function generateSpline(points: Point[], segmentsPerSpan: number): Point[] {
  const result: Point[] = [];
  const n = points.length;
  const extended: Point[] = [points[0], ...points, points[n - 1]];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < segmentsPerSpan; j++) {
      const t = j / segmentsPerSpan;
      result.push(catmullRom(extended[i], extended[i + 1], extended[i + 2], extended[i + 3], t));
    }
  }
  result.push(points[n - 1]);
  return result;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function curveToSegments(curve: Point[]): WallSegment[] {
  const segments: WallSegment[] = [];
  for (let i = 0; i < curve.length - 1; i++) {
    segments.push({
      x1: curve[i].x,
      y1: curve[i].y,
      x2: curve[i + 1].x,
      y2: curve[i + 1].y
    });
  }
  return segments;
}

function createStalactite(x: number, baseWidth: number, height: number, isTop: boolean, caveTop: number, caveBottom: number): Stalactite {
  const halfWidth = baseWidth / 2;
  const segments: WallSegment[] = [];

  if (isTop) {
    const baseY = caveTop;
    const tipY = caveTop + height;
    segments.push(
      { x1: x - halfWidth, y1: baseY, x2: x, y2: tipY },
      { x1: x, y1: tipY, x2: x + halfWidth, y2: baseY }
    );
    return { x, y: caveTop, baseWidth, height, isTop, segments };
  } else {
    const baseY = caveBottom;
    const tipY = caveBottom - height;
    segments.push(
      { x1: x - halfWidth, y1: baseY, x2: x, y2: tipY },
      { x1: x, y1: tipY, x2: x + halfWidth, y2: baseY }
    );
    return { x, y: caveBottom, baseWidth, height, isTop, segments };
  }
}

export function generateCave(width: number, height: number): CaveMap {
  const topMargin = 80;
  const bottomMargin = height - 80;

  const topControlPoints: Point[] = [];
  const bottomControlPoints: Point[] = [];
  const numControlPoints = 10;

  for (let i = 0; i < numControlPoints; i++) {
    const x = (i / (numControlPoints - 1)) * width;
    topControlPoints.push({ x, y: randomRange(40, topMargin) });
    bottomControlPoints.push({ x, y: randomRange(bottomMargin, height - 40) });
  }

  const topCurve = generateSpline(topControlPoints, 10);
  const bottomCurve = generateSpline(bottomControlPoints, 10);

  const walls: WallSegment[] = [];
  walls.push(...curveToSegments(topCurve));
  walls.push(...curveToSegments(bottomCurve));

  const leftEdge = topCurve[0];
  const leftBottom = bottomCurve[0];
  walls.push({ x1: leftEdge.x, y1: leftEdge.y, x2: leftBottom.x, y2: leftBottom.y });

  const rightEdge = topCurve[topCurve.length - 1];
  const rightBottom = bottomCurve[bottomCurve.length - 1];
  walls.push({ x1: rightEdge.x, y1: rightEdge.y, x2: rightBottom.x, y2: rightBottom.y });

  const stalactites: Stalactite[] = [];
  const numStalactites = Math.floor(randomRange(5, 11));
  const placedX: number[] = [];

  for (let i = 0; i < numStalactites; i++) {
    let attempts = 0;
    while (attempts < 50) {
      const x = randomRange(100, width - 100);
      const tooClose = placedX.some(px => Math.abs(px - x) < 80);
      if (!tooClose) {
        placedX.push(x);
        const isTop = Math.random() > 0.5;
        const baseWidth = randomRange(20, 30);
        const height_ = randomRange(30, 60);
        const avgTopY = topCurve[Math.floor(topCurve.length / 2)].y;
        const avgBottomY = bottomCurve[Math.floor(bottomCurve.length / 2)].y;
        const stalactite = createStalactite(x, baseWidth, height_, isTop, avgTopY, avgBottomY);
        stalactites.push(stalactite);
        walls.push(...stalactite.segments);
        break;
      }
      attempts++;
    }
  }

  const bugSpawnPoints: Point[] = [];
  const safeMargin = 150;
  for (let i = 0; i < 20; i++) {
    bugSpawnPoints.push({
      x: randomRange(safeMargin, width - safeMargin),
      y: randomRange(height / 2 - 100, height / 2 + 100)
    });
  }

  return {
    width,
    height,
    topCurve,
    bottomCurve,
    walls,
    stalactites,
    bugSpawnPoints
  };
}

export function pointToSegments(curve: Point[]): WallSegment[] {
  return curveToSegments(curve);
}
