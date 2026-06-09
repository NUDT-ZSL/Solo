export interface Point {
  x: number;
  y: number;
}

export interface Shard {
  id: number;
  vertices: Point[];
  centroid: Point;
  correctPosition: Point;
  correctRotation: number;
  position: Point;
  rotation: number;
  isPlaced: boolean;
  hue: number;
  edgeBrightness: number;
  brightnessTimer: number;
  flashWhite: number;
  noteIndex: number;
}

const CANVAS_SIZE = 800;
const MIRROR_SIZE = 128;
const SNAP_DISTANCE = 6;
const FINAL_SNAP_DISTANCE = 3;

function pointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

function transformVertices(vertices: Point[], position: Point, rotation: number, centroid: Point): Point[] {
  return vertices.map(v => {
    const p = rotatePoint(v, centroid, rotation);
    return { x: p.x + position.x - centroid.x, y: p.y + position.y - centroid.y };
  });
}

function polygonCentroid(vertices: Point[]): Point {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const cross = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    area += cross;
    cx += (vertices[i].x + vertices[j].x) * cross;
    cy += (vertices[i].y + vertices[j].y) * cross;
  }
  area *= 0.5;
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function polygonArea(vertices: Point[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) * 0.5;
}

function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function minDistanceBetweenPolygons(v1: Point[], v2: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < v1.length; i++) {
    const a1 = v1[i];
    const b1 = v1[(i + 1) % v1.length];
    for (let j = 0; j < v2.length; j++) {
      const a2 = v2[j];
      const b2 = v2[(j + 1) % v2.length];
      min = Math.min(min, distancePointToSegment(a1, a2, b2));
      min = Math.min(min, distancePointToSegment(a2, a1, b1));
    }
  }
  return min;
}

export function generateShards(): Shard[] {
  const half = MIRROR_SIZE / 2;
  const cx = 0, cy = 0;
  const seededRandom = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };
  const rand = seededRandom(Date.now() % 100000);

  const interiorPoints: Point[] = [];
  const numInterior = 5;
  for (let i = 0; i < numInterior; i++) {
    interiorPoints.push({
      x: cx - half * 0.7 + rand() * half * 1.4,
      y: cy - half * 0.7 + rand() * half * 1.4
    });
  }

  const boundaryPoints: { point: Point; side: number }[] = [];
  const numPerSide = 3;
  for (let i = 0; i < numPerSide; i++) {
    const t = (i + 1) / (numPerSide + 1);
    boundaryPoints.push({ point: { x: cx - half + t * MIRROR_SIZE, y: cy - half }, side: 0 });
    boundaryPoints.push({ point: { x: cx + half, y: cy - half + t * MIRROR_SIZE }, side: 1 });
    boundaryPoints.push({ point: { x: cx + half - t * MIRROR_SIZE, y: cy + half }, side: 2 });
    boundaryPoints.push({ point: { x: cx - half, y: cy + half - t * MIRROR_SIZE }, side: 3 });
  }

  const corners: Point[] = [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half }
  ];

  const allPoints = [...boundaryPoints.map(b => b.point), ...interiorPoints, ...corners];

  function nearestNeighbor(from: Point, candidates: Point[], exclude: Set<number>): number | null {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      if (exclude.has(i)) continue;
      const d = Math.hypot(from.x - candidates[i].x, from.y - candidates[i].y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx >= 0 ? bestIdx : null;
  }

  function buildPolygon(startIdx: number, points: Point[], visitedGlobal: Set<number>): Point[] {
    const poly: number[] = [startIdx];
    const usedLocal = new Set<number>([startIdx]);
    let current = startIdx;
    const maxSides = 7;
    const minSides = 4;

    for (let step = 0; step < maxSides + 3; step++) {
      const exclude = new Set<number>(usedLocal);
      if (poly.length >= minSides) {
        exclude.add(startIdx);
      }
      let next = nearestNeighbor(points[current], points, exclude);

      if (next === null) {
        if (poly.length >= minSides) break;
        return [];
      }

      if (poly.length >= minSides && next === startIdx) {
        break;
      }

      poly.push(next);
      usedLocal.add(next);
      current = next;

      if (poly.length > maxSides) break;
    }

    const result = poly.map(i => points[i]);
    const area = polygonArea(result);
    if (area < MIRROR_SIZE * MIRROR_SIZE * 0.05 || result.length < minSides || result.length > maxSides) {
      return [];
    }
    return result;
  }

  const shardPolygons: Point[][] = [];
  const used = new Set<number>();

  for (let attempt = 0; attempt < 50 && shardPolygons.length < 6; attempt++) {
    let startIdx = -1;
    for (let i = 0; i < allPoints.length; i++) {
      if (!used.has(i)) {
        startIdx = i;
        break;
      }
    }
    if (startIdx < 0) break;

    const poly = buildPolygon(startIdx, allPoints, used);
    if (poly.length === 0) {
      used.add(startIdx);
      continue;
    }
    shardPolygons.push(poly);
  }

  while (shardPolygons.length < 6) {
    const fallbackPolys: Point[][] = [
      [corners[0], { x: cx - 20, y: cy - half }, { x: cx, y: cy - 30 }, { x: cx - 40, y: cy }],
      [{ x: cx - 20, y: cy - half }, corners[1], { x: cx + 30, y: cy - 40 }, { x: cx, y: cy - 30 }],
      [{ x: cx - 40, y: cy }, { x: cx, y: cy - 30 }, { x: cx + 20, y: cy }, { x: cx - 10, y: cy + 30 }],
      [{ x: cx, y: cy - 30 }, { x: cx + 30, y: cy - 40 }, { x: cx + half, y: cy - 10 }, { x: cx + 20, y: cy }],
      [{ x: cx - 10, y: cy + 30 }, { x: cx + 20, y: cy }, { x: cx + 10, y: cy + half }, corners[3]],
      [{ x: cx + 20, y: cy }, { x: cx + half, y: cy - 10 }, corners[2], { x: cx + 10, y: cy + half }]
    ];
    const idx = shardPolygons.length;
    const jitter = () => (rand() - 0.5) * 10;
    const jittered = fallbackPolys[idx].map(p => ({ x: p.x + jitter(), y: p.y + jitter() }));
    shardPolygons.push(jittered);
  }

  const mirrorCenter: Point = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 };
  const shards: Shard[] = [];

  for (let i = 0; i < 6; i++) {
    const vertices = shardPolygons[i];
    const centroid = polygonCentroid(vertices);
    const correctPosition = {
      x: mirrorCenter.x + centroid.x,
      y: mirrorCenter.y + centroid.y
    };

    const margin = 60;
    const side = Math.floor(rand() * 4);
    let initX: number, initY: number;
    switch (side) {
      case 0:
        initX = margin + rand() * (CANVAS_SIZE - 2 * margin);
        initY = margin + rand() * 80;
        break;
      case 1:
        initX = CANVAS_SIZE - margin - rand() * 80;
        initY = margin + rand() * (CANVAS_SIZE - 2 * margin);
        break;
      case 2:
        initX = margin + rand() * (CANVAS_SIZE - 2 * margin);
        initY = CANVAS_SIZE - margin - rand() * 80;
        break;
      default:
        initX = margin + rand() * 80;
        initY = margin + rand() * (CANVAS_SIZE - 2 * margin);
        break;
    }

    shards.push({
      id: i,
      vertices,
      centroid,
      correctPosition,
      correctRotation: 0,
      position: { x: initX, y: initY },
      rotation: (rand() - 0.5) * (Math.PI / 3),
      isPlaced: false,
      hue: (i / 6) * 300,
      edgeBrightness: 1.0,
      brightnessTimer: 0,
      flashWhite: 0,
      noteIndex: i
    });
  }

  return shards;
}

export function getWorldVertices(shard: Shard): Point[] {
  return transformVertices(shard.vertices, shard.position, shard.rotation, shard.centroid);
}

export function hitTest(shard: Shard, x: number, y: number): boolean {
  const worldVerts = getWorldVertices(shard);
  return pointInPolygon({ x, y }, worldVerts);
}

export function checkSnap(
  shards: Shard[],
  currentId: number
): { shouldSnap: boolean; targets: number[] } {
  const current = shards[currentId];
  const currentVerts = getWorldVertices(current);
  const targets: number[] = [];

  for (let i = 0; i < shards.length; i++) {
    if (i === currentId) continue;
    const other = shards[i];
    const otherVerts = getWorldVertices(other);
    const dist = minDistanceBetweenPolygons(currentVerts, otherVerts);
    if (dist <= SNAP_DISTANCE) {
      targets.push(i);
    }
  }

  return { shouldSnap: targets.length > 0, targets };
}

export function snapToCorrect(shard: Shard): void {
  shard.position = { ...shard.correctPosition };
  shard.rotation = shard.correctRotation;
  shard.isPlaced = true;
}

export function isRotationAligned(shard: Shard, toleranceRad: number = 0.1): boolean {
  const r = ((shard.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.min(r, Math.PI * 2 - r) < toleranceRad;
}

export function checkVictory(shards: Shard[]): boolean {
  for (const s of shards) {
    const dx = s.position.x - s.correctPosition.x;
    const dy = s.position.y - s.correctPosition.y;
    if (Math.hypot(dx, dy) > FINAL_SNAP_DISTANCE) return false;
    if (!isRotationAligned(s)) return false;
  }

  for (let i = 0; i < shards.length; i++) {
    for (let j = i + 1; j < shards.length; j++) {
      const vi = getWorldVertices(shards[i]);
      const vj = getWorldVertices(shards[j]);
      const d = minDistanceBetweenPolygons(vi, vj);
      if (d > FINAL_SNAP_DISTANCE * 3) {
        // Check if they are adjacent in correct positions
      }
    }
  }

  return true;
}

export function rotateShard(shard: Shard): void {
  shard.rotation -= Math.PI / 12;
  shard.flashWhite = 0.2;
}
