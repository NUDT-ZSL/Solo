import Delaunator from 'delaunator';

export interface Point {
  x: number;
  y: number;
}

export interface SharedEdge {
  edge: [Point, Point];
  neighborIndex: number;
}

export interface Triangle {
  a: Point;
  b: Point;
  c: Point;
  centroid: Point;
  avgColor: { r: number; g: number; b: number };
  neighbors: number[];
  sharedEdges: SharedEdge[];
  uvBounds: { minX: number; minY: number; maxX: number; maxY: number };
  area: number;
}

export interface FaceData {
  triangles: Triangle[];
  imageWidth: number;
  imageHeight: number;
  normalizedScale: number;
}

const MAX_FACES = 200;
const MAX_IMAGE_SIZE = 480;
const EDGE_THRESHOLD = 55;

function normalizeImageSize(w: number, h: number): { width: number; height: number } {
  const maxDim = Math.max(w, h);
  if (maxDim <= MAX_IMAGE_SIZE) return { width: w, height: h };
  const scale = MAX_IMAGE_SIZE / maxDim;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function getImageDataFromImage(img: HTMLImageElement): ImageData {
  const { width, height } = normalizeImageSize(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function sobelEdgeDetect(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const len = width * height;
  const gray = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  const edges = new Uint8Array(len);
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      const gx =
        -gray[idx - width - 1] - 2 * gray[idx - 1] - gray[idx + width - 1] +
        gray[idx - width + 1] + 2 * gray[idx + 1] + gray[idx + width + 1];
      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = mag > EDGE_THRESHOLD ? 255 : 0;
    }
  }
  return edges;
}

function poissonDiskSampleEdges(
  edges: Uint8Array,
  w: number,
  h: number,
  targetCount: number,
  minDist: number
): Point[] {
  const edgePoints: Point[] = [];
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] === 255) {
      edgePoints.push({ x: i % w, y: Math.floor(i / w) });
    }
  }
  if (edgePoints.length === 0) return [];
  const shuffled = edgePoints.sort(() => Math.random() - 0.5);
  const result: Point[] = [];
  const gridSize = minDist / Math.SQRT2;
  const cols = Math.ceil(w / gridSize);
  const rows = Math.ceil(h / gridSize);
  const grid = new Int32Array(cols * rows).fill(-1);
  function getGridPos(p: Point) {
    const gx = Math.floor(p.x / gridSize);
    const gy = Math.floor(p.y / gridSize);
    return gy * cols + gx;
  }
  function tooClose(p: Point): boolean {
    const gx = Math.floor(p.x / gridSize);
    const gy = Math.floor(p.y / gridSize);
    const minGX = Math.max(0, gx - 2);
    const maxGX = Math.min(cols - 1, gx + 2);
    const minGY = Math.max(0, gy - 2);
    const maxGY = Math.min(rows - 1, gy + 2);
    for (let y = minGY; y <= maxGY; y++) {
      for (let x = minGX; x <= maxGX; x++) {
        const idx = grid[y * cols + x];
        if (idx >= 0) {
          const existing = result[idx];
          const dx = p.x - existing.x;
          const dy = p.y - existing.y;
          if (dx * dx + dy * dy < minDist * minDist) return true;
        }
      }
    }
    return false;
  }
  let maxIterations = targetCount * 30;
  let si = 0;
  while (result.length < targetCount && maxIterations > 0 && si < shuffled.length) {
    const p = shuffled[si++];
    if (!tooClose(p)) {
      result.push(p);
      grid[getGridPos(p)] = result.length - 1;
    }
    maxIterations--;
  }
  return result;
}

function generateBoundaryPoints(w: number, h: number, count: number): Point[] {
  const points: Point[] = [];
  const perimeter = 2 * (w + h);
  const step = perimeter / count;
  let d = 0;
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0;
    if (d < w) {
      x = d; y = 0;
    } else if (d < w + h) {
      x = w - 1; y = d - w;
    } else if (d < 2 * w + h) {
      x = (2 * w + h) - d; y = h - 1;
    } else {
      x = 0; y = perimeter - d;
    }
    points.push({ x: Math.round(x), y: Math.round(y) });
    d += step;
  }
  return points;
}

function generateInteriorPoints(
  _edges: Uint8Array,
  w: number,
  h: number,
  count: number,
  minDist: number
): Point[] {
  const result: Point[] = [];
  const gridSize = minDist / Math.SQRT2;
  const cols = Math.ceil(w / gridSize);
  const rows = Math.ceil(h / gridSize);
  const grid = new Int32Array(cols * rows).fill(-1);
  function tooClose(p: Point): boolean {
    const gx = Math.floor(p.x / gridSize);
    const gy = Math.floor(p.y / gridSize);
    const minGX = Math.max(0, gx - 2);
    const maxGX = Math.min(cols - 1, gx + 2);
    const minGY = Math.max(0, gy - 2);
    const maxGY = Math.min(rows - 1, gy + 2);
    for (let yy = minGY; yy <= maxGY; yy++) {
      for (let xx = minGX; xx <= maxGX; xx++) {
        const idx = grid[yy * cols + xx];
        if (idx >= 0) {
          const existing = result[idx];
          const dx = p.x - existing.x;
          const dy = p.y - existing.y;
          if (dx * dx + dy * dy < minDist * minDist) return true;
        }
      }
    }
    return false;
  }
  let maxAttempts = count * 50;
  while (result.length < count && maxAttempts > 0) {
    const p = {
      x: Math.random() * (w - 6) + 3,
      y: Math.random() * (h - 6) + 3
    };
    if (!tooClose(p)) {
      result.push(p);
      const gx = Math.floor(p.x / gridSize);
      const gy = Math.floor(p.y / gridSize);
      grid[gy * cols + gx] = result.length - 1;
    }
    maxAttempts--;
  }
  return result;
}

function runDelaunay(points: Point[]): { indices: Uint32Array; points: Float64Array } {
  const coords = new Float64Array(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    coords[i * 2] = points[i].x;
    coords[i * 2 + 1] = points[i].y;
  }
  const delaunay = new Delaunator(coords);
  return { indices: delaunay.triangles, points: coords };
}

function triangleArea(a: Point, b: Point, c: Point): number {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
}

function triangleCentroid(a: Point, b: Point, c: Point): Point {
  return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
}

function pointsAlmostEqual(p1: Point, p2: Point, eps: number = 0.5): boolean {
  return Math.abs(p1.x - p2.x) < eps && Math.abs(p1.y - p2.y) < eps;
}

function getTriangleAvgColor(imgData: ImageData, a: Point, b: Point, c: Point): { r: number; g: number; b: number } {
  const { data, width } = imgData;
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxY = Math.min(imgData.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const total = triangleArea(a, b, c);
  if (total < 0.5) {
    const cx = Math.round((a.x + b.x + c.x) / 3);
    const cy = Math.round((a.y + b.y + c.y) / 3);
    const idx = (Math.max(0, Math.min(imgData.height - 1, cy)) * width + Math.max(0, Math.min(width - 1, cx))) * 4;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
  }
  let r = 0, g = 0, bl = 0, count = 0;
  const stepX = Math.max(1, Math.floor((maxX - minX) / 20));
  const stepY = Math.max(1, Math.floor((maxY - minY) / 20));
  for (let y = minY; y <= maxY; y += stepY) {
    for (let x = minX; x <= maxX; x += stepX) {
      const p = { x, y };
      const a1 = triangleArea(p, b, c);
      const a2 = triangleArea(a, p, c);
      const a3 = triangleArea(a, b, p);
      if (Math.abs(a1 + a2 + a3 - total) < total * 0.05) {
        const idx = (y * width + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        bl += data[idx + 2];
        count++;
      }
    }
  }
  if (count === 0) {
    const cx = Math.round((a.x + b.x + c.x) / 3);
    const cy = Math.round((a.y + b.y + c.y) / 3);
    const idx = (Math.max(0, Math.min(imgData.height - 1, cy)) * width + Math.max(0, Math.min(width - 1, cx))) * 4;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
  }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(bl / count) };
}

function getUVBounds(a: Point, b: Point, c: Point, w: number, h: number) {
  const minX = Math.max(0, Math.min(a.x, b.x, c.x));
  const maxX = Math.min(w, Math.max(a.x, b.x, c.x));
  const minY = Math.max(0, Math.min(a.y, b.y, c.y));
  const maxY = Math.min(h, Math.max(a.y, b.y, c.y));
  return {
    minX: minX / w,
    minY: minY / h,
    maxX: maxX / w,
    maxY: maxY / h
  };
}

function findSharedEdge(
  t1: { a: Point; b: Point; c: Point },
  t2: { a: Point; b: Point; c: Point }
): [Point, Point] | null {
  const pts1 = [t1.a, t1.b, t1.c];
  const pts2 = [t2.a, t2.b, t2.c];
  const shared: Point[] = [];
  for (const p1 of pts1) {
    for (const p2 of pts2) {
      if (pointsAlmostEqual(p1, p2, 1)) {
        shared.push(p1);
        break;
      }
    }
  }
  if (shared.length >= 2) {
    return [shared[0], shared[1]];
  }
  return null;
}

function buildTriangleData(
  indices: Uint32Array,
  coords: Float64Array,
  imgData: ImageData,
  imgW: number,
  imgH: number
): Triangle[] {
  const triCount = indices.length / 3;
  const triangles: Triangle[] = [];
  for (let i = 0; i < triCount; i++) {
    const i0 = indices[i * 3] * 2;
    const i1 = indices[i * 3 + 1] * 2;
    const i2 = indices[i * 3 + 2] * 2;
    const a = { x: coords[i0], y: coords[i0 + 1] };
    const b = { x: coords[i1], y: coords[i1 + 1] };
    const c = { x: coords[i2], y: coords[i2 + 1] };
    const area = triangleArea(a, b, c);
    if (area < 1) continue;
    const centroid = triangleCentroid(a, b, c);
    if (centroid.x < 0 || centroid.x > imgW || centroid.y < 0 || centroid.y > imgH) continue;
    const avgColor = getTriangleAvgColor(imgData, a, b, c);
    const uvBounds = getUVBounds(a, b, c, imgW, imgH);
    triangles.push({
      a, b, c, centroid, avgColor,
      neighbors: [],
      sharedEdges: [],
      uvBounds,
      area
    });
  }
  for (let i = 0; i < triangles.length; i++) {
    for (let j = i + 1; j < triangles.length; j++) {
      const shared = findSharedEdge(triangles[i], triangles[j]);
      if (shared) {
        triangles[i].neighbors.push(j);
        triangles[j].neighbors.push(i);
        triangles[i].sharedEdges.push({ edge: shared, neighborIndex: j });
        triangles[j].sharedEdges.push({ edge: [shared[1], shared[0]], neighborIndex: i });
      }
    }
  }
  return triangles;
}

function crossSign2D(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function pointInTriangle(p: Point, a: Point, b: Point, c: Point, eps: number = 1e-6): boolean {
  const d1 = crossSign2D(p, a, b);
  const d2 = crossSign2D(p, b, c);
  const d3 = crossSign2D(p, c, a);
  const hasNeg = (d1 < -eps) || (d2 < -eps) || (d3 < -eps);
  const hasPos = (d1 > eps) || (d2 > eps) || (d3 > eps);
  return !(hasNeg && hasPos);
}

function isPolygonSimple(poly: Point[]): boolean {
  const n = poly.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a1 = poly[i];
    const a2 = poly[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (j === i || j === (i + 1) % n || i === (j + 1) % n) continue;
      const b1 = poly[j];
      const b2 = poly[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = crossSign2D(p4, p3, p1);
  const d2 = crossSign2D(p4, p3, p2);
  const d3 = crossSign2D(p2, p1, p3);
  const d4 = crossSign2D(p2, p1, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

function isPolygonConvex(poly: Point[]): boolean {
  const n = poly.length;
  if (n < 3) return false;
  let hasPos = false;
  let hasNeg = false;
  for (let i = 0; i < n; i++) {
    const o = poly[i];
    const a = poly[(i + 1) % n];
    const b = poly[(i + 2) % n];
    const cross = crossSign2D(o, a, b);
    if (cross > 1e-6) hasPos = true;
    else if (cross < -1e-6) hasNeg = true;
    if (hasPos && hasNeg) return false;
  }
  return true;
}

function mergeTwoTriangles(t1: Triangle, t2: Triangle): Triangle | null {
  const verts1 = [t1.a, t1.b, t1.c];
  const verts2 = [t2.a, t2.b, t2.c];
  const sharedPts: Point[] = [];
  const uniqueFromT1: Point[] = [];
  for (const p1 of verts1) {
    let found = false;
    for (const p2 of verts2) {
      if (pointsAlmostEqual(p1, p2, 1)) { found = true; sharedPts.push(p1); break; }
    }
    if (!found) uniqueFromT1.push(p1);
  }
  const uniqueFromT2: Point[] = [];
  for (const p2 of verts2) {
    let found = false;
    for (const p1 of verts1) {
      if (pointsAlmostEqual(p2, p1, 1)) { found = true; break; }
    }
    if (!found) uniqueFromT2.push(p2);
  }
  if (sharedPts.length !== 2 || uniqueFromT1.length !== 1 || uniqueFromT2.length !== 1) {
    return null;
  }
  const unique1 = uniqueFromT1[0];
  const unique2 = uniqueFromT2[0];
  const s0 = sharedPts[0];
  const s1 = sharedPts[1];
  let poly: Point[];
  const cross = crossSign2D(s0, s1, unique1);
  if (cross > 0) {
    poly = [unique1, s1, unique2, s0];
  } else {
    poly = [unique1, s0, unique2, s1];
  }
  if (!isPolygonSimple(poly)) return null;
  if (!isPolygonConvex(poly)) return null;
  const diag1A = poly[0], diag1B = poly[2];
  const diag2A = poly[1], diag2B = poly[3];
  const areaWithDiag1 = triangleArea(poly[0], poly[1], poly[2]) + triangleArea(poly[0], poly[2], poly[3]);
  const targetArea = t1.area + t2.area;
  if (Math.abs(areaWithDiag1 - targetArea) / targetArea > 0.05) return null;
  let diagChoice: [Point, Point];
  const tForDiag1 = pointInTriangle(poly[3], poly[0], poly[1], poly[2]);
  const tForDiag2 = pointInTriangle(poly[1], poly[0], poly[2], poly[3]);
  if (!tForDiag1) diagChoice = [diag1A, diag1B];
  else if (!tForDiag2) diagChoice = [diag2A, diag2B];
  else diagChoice = [diag1A, diag1B];
  const newTriA: [Point, Point, Point] = [poly[0], poly[1], diagChoice[1]];
  const newTriB: [Point, Point, Point] = [poly[0], diagChoice[1], poly[3]];
  const at = triangleArea(newTriA[0], newTriA[1], newTriA[2]);
  const bt = triangleArea(newTriB[0], newTriB[1], newTriB[2]);
  const [a, b, c] = at > bt ? newTriA : newTriB;
  const colorRatioA = t1.area / targetArea;
  const colorRatioB = t2.area / targetArea;
  const newColor = {
    r: Math.min(255, Math.round(t1.avgColor.r * colorRatioA + t2.avgColor.r * colorRatioB)),
    g: Math.min(255, Math.round(t1.avgColor.g * colorRatioA + t2.avgColor.g * colorRatioB)),
    b: Math.min(255, Math.round(t1.avgColor.b * colorRatioA + t2.avgColor.b * colorRatioB))
  };
  const allX = poly.map(p => p.x);
  const allY = poly.map(p => p.y);
  return {
    a, b, c,
    centroid: { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 },
    avgColor: newColor,
    neighbors: [],
    sharedEdges: [],
    uvBounds: {
      minX: Math.min(...allX),
      minY: Math.min(...allY),
      maxX: Math.max(...allX),
      maxY: Math.max(...allY)
    },
    area: at + bt
  };
}

function rebuildTopology(tris: Triangle[]): Triangle[] {
  const n = tris.length;
  const result: Triangle[] = tris.map(t => ({
    ...t,
    neighbors: [],
    sharedEdges: []
  }));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const shared = findSharedEdge(result[i], result[j]);
      if (shared) {
        result[i].neighbors.push(j);
        result[j].neighbors.push(i);
        result[i].sharedEdges.push({ edge: shared, neighborIndex: j });
        result[j].sharedEdges.push({ edge: [shared[1], shared[0]], neighborIndex: i });
      }
    }
  }
  return result;
}

function mergeSmallTriangles(triangles: Triangle[], maxCount: number): Triangle[] {
  if (triangles.length <= maxCount) return triangles;
  let result = rebuildTopology(triangles);
  let maxMergeAttempts = (result.length - maxCount) * 4;
  while (result.length > maxCount && maxMergeAttempts > 0) {
    maxMergeAttempts--;
    let smallestIdx = -1;
    let smallestArea = Infinity;
    for (let i = 0; i < result.length; i++) {
      if (result[i].neighbors.length === 0) continue;
      if (result[i].area < smallestArea) {
        smallestArea = result[i].area;
        smallestIdx = i;
      }
    }
    if (smallestIdx === -1) break;
    const neighs = result[smallestIdx].neighbors;
    neighs.sort((x, y) => result[x].area - result[y].area);
    let merged = false;
    for (const neighborIdx of neighs) {
      const candidate = mergeTwoTriangles(result[smallestIdx], result[neighborIdx]);
      if (candidate === null) continue;
      const keepIndices: number[] = [];
      for (let k = 0; k < result.length; k++) {
        if (k !== smallestIdx && k !== neighborIdx) keepIndices.push(k);
      }
      const nextTris: Triangle[] = keepIndices.map(ki => ({ ...result[ki] }));
      nextTris.push(candidate);
      const rebuilt = rebuildTopology(nextTris);
      const validCount = rebuilt.filter(t => t.neighbors.length > 0 || rebuilt.length === 1).length;
      if (validCount < rebuilt.length - 2) continue;
      const avgNeighborCount = rebuilt.reduce((s, t) => s + t.neighbors.length, 0) / rebuilt.length;
      if (avgNeighborCount < 2 && rebuilt.length > 10) continue;
      result = rebuilt;
      merged = true;
      break;
    }
    if (!merged) {
      const neighs2 = result[smallestIdx].neighbors;
      if (neighs2.length > 0) {
        const ni = neighs2[0];
        const iMin = Math.min(smallestIdx, ni);
        const iMax = Math.max(smallestIdx, ni);
        const keep: Triangle[] = [];
        for (let k = 0; k < result.length; k++) {
          if (k !== iMin && k !== iMax) keep.push({ ...result[k] });
        }
        const fallback = rebuildTopology(keep);
        if (fallback.length >= maxCount * 0.7) result = fallback;
        else break;
      } else break;
    }
  }
  return result;
}

export async function generateFaces(file: File): Promise<FaceData> {
  const img = await loadImageFromFile(file);
  const { width: imgW, height: imgH } = normalizeImageSize(img.width, img.height);
  const imageData = getImageDataFromImage(img);
  const edges = sobelEdgeDetect(imageData);
  const edgePointCount = Math.floor(MAX_FACES * 1.2);
  const minDist = Math.max(6, Math.min(imgW, imgH) / 50);
  const edgePoints = poissonDiskSampleEdges(edges, imgW, imgH, edgePointCount, minDist);
  const boundaryCount = Math.max(20, Math.floor(MAX_FACES * 0.25));
  const boundaryPoints = generateBoundaryPoints(imgW, imgH, boundaryCount);
  const totalBudget = Math.floor(MAX_FACES * 1.8);
  const interiorCount = Math.max(30, totalBudget - edgePoints.length - boundaryPoints.length);
  const interiorMinDist = Math.max(10, Math.min(imgW, imgH) / 25);
  const interiorPoints = generateInteriorPoints(edges, imgW, imgH, interiorCount, interiorMinDist);
  const allPoints: Point[] = [...edgePoints, ...boundaryPoints, ...interiorPoints];
  const uniqueMap = new Map<string, Point>();
  for (const p of allPoints) {
    const key = `${Math.round(p.x / 2)}_${Math.round(p.y / 2)}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, p);
    }
  }
  const dedupedPoints = Array.from(uniqueMap.values());
  if (dedupedPoints.length < 3) {
    dedupedPoints.push({ x: 0, y: 0 });
    dedupedPoints.push({ x: imgW, y: 0 });
    dedupedPoints.push({ x: imgW / 2, y: imgH });
  }
  const { indices, points: coords } = runDelaunay(dedupedPoints);
  let triangles = buildTriangleData(indices, coords, imageData, imgW, imgH);
  triangles = triangles.filter(t => {
    if (t.centroid.x < 2 || t.centroid.x > imgW - 2) return false;
    if (t.centroid.y < 2 || t.centroid.y > imgH - 2) return false;
    return t.area > 4;
  });
  if (triangles.length > MAX_FACES) {
    triangles = mergeSmallTriangles(triangles, MAX_FACES);
  }
  const maxDim = Math.max(imgW, imgH);
  const normalizedScale = 400 / maxDim;
  URL.revokeObjectURL(img.src);
  return {
    triangles,
    imageWidth: imgW,
    imageHeight: imgH,
    normalizedScale
  };
}

function createFallbackThumbnail(bounds: { minX: number; minY: number; maxX: number; maxY: number }): string {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 220, 100);
  const hueBase = (Math.sin(bounds.minX * 10 + bounds.minY * 20) * 0.5 + 0.5) * 360;
  grad.addColorStop(0, `hsl(${hueBase}, 75%, 55%)`);
  grad.addColorStop(1, `hsl(${(hueBase + 60) % 360}, 75%, 40%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 220, 100);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(110, 50, 35, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL('image/png');
}

export function createThumbnail(
  originalFile: File,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): Promise<string> {
  return new Promise((resolve) => {
    let cleanedUp = false;
    const cleanupAndResolve = (url: string, imgEl?: HTMLImageElement, srcToRevoke?: string) => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (srcToRevoke && imgEl) {
        try { URL.revokeObjectURL(srcToRevoke); } catch { /* ignore */ }
      }
      resolve(url);
    };
    const fallback = createFallbackThumbnail(bounds);
    const img = new Image();
    let revoked = false;
    const srcUrl = URL.createObjectURL(originalFile);
    img.crossOrigin = 'anonymous';
    const cancelTimer = setTimeout(() => {
      if (!revoked) {
        revoked = true;
        try { URL.revokeObjectURL(srcUrl); } catch { /* ignore */ }
      }
      cleanupAndResolve(fallback);
    }, 8000);
    img.onload = () => {
      clearTimeout(cancelTimer);
      const canvas = document.createElement('canvas');
      canvas.width = 220;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      const sx = Math.max(0, bounds.minX * img.width);
      const sy = Math.max(0, bounds.minY * img.height);
      const sw = Math.max(1, Math.min(img.width - sx, (bounds.maxX - bounds.minX) * img.width));
      const sh = Math.max(1, Math.min(img.height - sy, (bounds.maxY - bounds.minY) * img.height));
      try {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 220, 100);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (!revoked) { revoked = true; try { URL.revokeObjectURL(srcUrl); } catch { /* ignore */ } }
        cleanupAndResolve(dataUrl);
      } catch (_err) {
        if (!revoked) { revoked = true; try { URL.revokeObjectURL(srcUrl); } catch { /* ignore */ } }
        cleanupAndResolve(fallback);
      }
    };
    img.onerror = () => {
      clearTimeout(cancelTimer);
      if (!revoked) { revoked = true; try { URL.revokeObjectURL(srcUrl); } catch { /* ignore */ } }
      cleanupAndResolve(fallback);
    };
    img.src = srcUrl;
  });
}
