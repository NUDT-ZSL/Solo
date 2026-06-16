export interface Point {
  x: number;
  y: number;
}

export interface Crease {
  start: Point;
  end: Point;
  isFolded: boolean;
}

export interface FoldLayer {
  vertices: Point[];
  opacity: number;
}

export interface PaperState {
  layers: FoldLayer[];
  creases: Crease[];
  rotation: number;
  offsetX: number;
  offsetY: number;
}

export function createDefaultPaperState(): PaperState {
  return {
    layers: [
      {
        vertices: [
          { x: 0, y: 0 },
          { x: 400, y: 0 },
          { x: 400, y: 400 },
          { x: 0, y: 400 },
        ],
        opacity: 1,
      },
    ],
    creases: [],
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
  };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

function reflectPoint(point: Point, lineStart: Point, lineEnd: Point): Point {
  const d = sub(lineEnd, lineStart);
  const v = sub(point, lineStart);
  const t = dot(v, d) / dot(d, d);
  const closest = add(lineStart, scale(d, t));
  return { x: 2 * closest.x - point.x, y: 2 * closest.y - point.y };
}

function sideOfLine(point: Point, lineStart: Point, lineEnd: Point): number {
  return (lineEnd.x - lineStart.x) * (point.y - lineStart.y) -
    (lineEnd.y - lineStart.y) * (point.x - lineStart.x);
}

function lineIntersection(
  p1: Point,
  p2: Point,
  lineStart: Point,
  lineEnd: Point
): Point {
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = lineEnd.x - lineStart.x;
  const dy2 = lineEnd.y - lineStart.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return p1;
  const t = ((lineStart.x - p1.x) * dy2 - (lineStart.y - p1.y) * dx2) / denom;
  return { x: p1.x + t * dx1, y: p1.y + t * dy1 };
}

function clipPolygonByLine(
  vertices: Point[],
  lineStart: Point,
  lineEnd: Point,
  keepSide: number
): Point[] {
  if (vertices.length < 3) return [];
  const output: Point[] = [];
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % n];
    const currentSide = sideOfLine(current, lineStart, lineEnd);
    const nextSide = sideOfLine(next, lineStart, lineEnd);

    const currentInside = keepSide > 0 ? currentSide >= 0 : currentSide <= 0;
    const nextInside = keepSide > 0 ? nextSide >= 0 : nextSide <= 0;

    if (currentInside) {
      output.push(current);
      if (!nextInside) {
        output.push(lineIntersection(current, next, lineStart, lineEnd));
      }
    } else if (nextInside) {
      output.push(lineIntersection(current, next, lineStart, lineEnd));
    }
  }

  return output;
}

export function fold(
  state: PaperState,
  creaseStart: Point,
  creaseEnd: Point,
  foldSide: Point
): PaperState {
  const side = sideOfLine(foldSide, creaseStart, creaseEnd);
  const keepSide = side > 0 ? -1 : 1;
  const foldSideDir = side > 0 ? 1 : -1;

  const newLayers: FoldLayer[] = [];
  const newCreases: Crease[] = [...state.creases, { start: creaseStart, end: creaseEnd, isFolded: true }];

  for (const layer of state.layers) {
    const stationary = clipPolygonByLine(layer.vertices, creaseStart, creaseEnd, keepSide);
    const folding = clipPolygonByLine(layer.vertices, creaseStart, creaseEnd, foldSideDir);

    if (stationary.length >= 3) {
      newLayers.push({ vertices: stationary, opacity: layer.opacity });
    }

    if (folding.length >= 3) {
      const reflectedVertices = folding.map((p) => reflectPoint(p, creaseStart, creaseEnd));
      newLayers.push({ vertices: reflectedVertices, opacity: 0.4 });
    }
  }

  return {
    ...state,
    layers: newLayers.length > 0 ? newLayers : state.layers,
    creases: newCreases,
  };
}

export function rotate(vertices: Point[], angle: number, center: Point = { x: 200, y: 200 }): Point[] {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return vertices.map((p) => ({
    x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
    y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos,
  }));
}

export function translate(vertices: Point[], dx: number, dy: number): Point[] {
  return vertices.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function polygonArea(vertices: Point[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

export function findNearestGridPoint(
  clickX: number,
  clickY: number,
  gridSize: number = 20,
  threshold: number = 10
): Point | null {
  const gx = Math.round(clickX / gridSize) * gridSize;
  const gy = Math.round(clickY / gridSize) * gridSize;
  const dist = Math.sqrt((clickX - gx) ** 2 + (clickY - gy) ** 2);
  if (dist <= threshold) {
    return { x: gx, y: gy };
  }
  return null;
}

export function isPointOnPaper(point: Point, layers: FoldLayer[]): boolean {
  for (const layer of layers) {
    if (isPointInPolygon(point, layer.vertices)) {
      return true;
    }
  }
  return false;
}

function isPointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y;
    const xj = vertices[j].x,
      yj = vertices[j].y;
    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
