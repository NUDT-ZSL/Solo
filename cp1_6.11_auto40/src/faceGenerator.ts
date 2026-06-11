export interface Point {
  x: number;
  y: number;
}

export interface Triangle {
  a: Point;
  b: Point;
  c: Point;
  centroid: Point;
  avgColor: { r: number; g: number; b: number };
  neighbors: number[];
  uvBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface FaceData {
  triangles: Triangle[];
  imageWidth: number;
  imageHeight: number;
  normalizedScale: number;
}

const MAX_FACES = 200;
const MAX_IMAGE_SIZE = 400;

function normalizeImageSize(w: number, h: number): { width: number; height: number } {
  const maxDim = Math.max(w, h);
  if (maxDim <= MAX_IMAGE_SIZE) return { width: w, height: h };
  const scale = MAX_IMAGE_SIZE / maxDim;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function getImageData(img: HTMLImageElement): ImageData {
  const { width, height } = normalizeImageSize(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function sobelEdgeDetect(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  const edges = new Uint8Array(width * height);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0, sy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const k = (ky + 1) * 3 + (kx + 1);
          const pixel = gray[(y + ky) * width + (x + kx)];
          sx += pixel * gx[k];
          sy += pixel * gy[k];
        }
      }
      const mag = Math.sqrt(sx * sx + sy * sy);
      edges[y * width + x] = mag > 60 ? 255 : 0;
    }
  }
  return edges;
}

function sampleEdgePoints(edges: Uint8Array, w: number, h: number, targetCount: number): Point[] {
  const points: Point[] = [];
  const edgeIndices: number[] = [];
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] === 255) edgeIndices.push(i);
  }
  const step = Math.max(1, Math.floor(edgeIndices.length / targetCount));
  for (let i = 0; i < edgeIndices.length && points.length < targetCount * 0.7; i += step) {
    const idx = edgeIndices[i];
    points.push({ x: idx % w, y: Math.floor(idx / w) });
  }
  const boundaryStep = Math.max(1, Math.floor((w + h) * 2 / (targetCount * 0.3)));
  for (let x = 0; x < w; x += boundaryStep) {
    points.push({ x, y: 0 });
    points.push({ x, y: h - 1 });
  }
  for (let y = 0; y < h; y += boundaryStep) {
    points.push({ x: 0, y });
    points.push({ x: w - 1, y });
  }
  return points;
}

function sampleInteriorPoints(_edges: Uint8Array, w: number, h: number, targetCount: number): Point[] {
  const points: Point[] = [];
  const cols = Math.ceil(Math.sqrt(targetCount * (w / h)));
  const rows = Math.ceil(targetCount / cols);
  const cellW = w / cols;
  const cellH = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let cx = c * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.5;
      let cy = r * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.5;
      cx = Math.max(2, Math.min(w - 3, cx));
      cy = Math.max(2, Math.min(h - 3, cy));
      points.push({ x: Math.round(cx), y: Math.round(cy) });
    }
  }
  return points;
}

interface DelaunayTri {
  p0: Point;
  p1: Point;
  p2: Point;
  circumX: number;
  circumY: number;
  circumR2: number;
}

function circumcircle(p0: Point, p1: Point, p2: Point): { cx: number; cy: number; r2: number } | null {
  const ax = p0.x, ay = p0.y;
  const bx = p1.x, by = p1.y;
  const cx = p2.x, cy = p2.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-10) return null;
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const r2 = (ax - ux) ** 2 + (ay - uy) ** 2;
  return { cx: ux, cy: uy, r2 };
}

function inCircumcircle(tri: DelaunayTri, p: Point): boolean {
  const dx = p.x - tri.circumX;
  const dy = p.y - tri.circumY;
  return dx * dx + dy * dy <= tri.circumR2 * 1.0001;
}

function bowyerWatson(points: Point[], w: number, h: number): DelaunayTri[] {
  const margin = Math.max(w, h) * 10;
  const superPoints: Point[] = [
    { x: -margin, y: -margin },
    { x: w + margin * 2, y: -margin },
    { x: w / 2, y: h + margin * 2 }
  ];
  const allPoints = [...points, ...superPoints];
  const superCircum = circumcircle(superPoints[0], superPoints[1], superPoints[2])!;
  let triangles: DelaunayTri[] = [{
    p0: superPoints[0], p1: superPoints[1], p2: superPoints[2],
    circumX: superCircum.cx, circumY: superCircum.cy, circumR2: superCircum.r2
  }];
  for (let i = 0; i < allPoints.length; i++) {
    const p = allPoints[i];
    const badTri: DelaunayTri[] = [];
    for (const tri of triangles) {
      if (inCircumcircle(tri, p)) badTri.push(tri);
    }
    const polygon: [Point, Point][] = [];
    for (let j = 0; j < badTri.length; j++) {
      const edges: [Point, Point][] = [
        [badTri[j].p0, badTri[j].p1],
        [badTri[j].p1, badTri[j].p2],
        [badTri[j].p2, badTri[j].p0]
      ];
      for (const edge of edges) {
        let shared = false;
        for (let k = 0; k < badTri.length; k++) {
          if (j === k) continue;
          const otherEdges: [Point, Point][] = [
            [badTri[k].p0, badTri[k].p1],
            [badTri[k].p1, badTri[k].p2],
            [badTri[k].p2, badTri[k].p0]
          ];
          for (const oe of otherEdges) {
            const sameA = (edge[0].x === oe[0].x && edge[0].y === oe[0].y && edge[1].x === oe[1].x && edge[1].y === oe[1].y);
            const sameB = (edge[0].x === oe[1].x && edge[0].y === oe[1].y && edge[1].x === oe[0].x && edge[1].y === oe[0].y);
            if (sameA || sameB) { shared = true; break; }
          }
          if (shared) break;
        }
        if (!shared) polygon.push(edge);
      }
    }
    triangles = triangles.filter(t => !badTri.includes(t));
    for (const edge of polygon) {
      const cc = circumcircle(edge[0], edge[1], p);
      if (cc) {
        triangles.push({
          p0: edge[0], p1: edge[1], p2: p,
          circumX: cc.cx, circumY: cc.cy, circumR2: cc.r2
        });
      }
    }
  }
  const superSet = new Set(superPoints.map(p => `${p.x},${p.y}`));
  return triangles.filter(tri => {
    const keys = [`${tri.p0.x},${tri.p0.y}`, `${tri.p1.x},${tri.p1.y}`, `${tri.p2.x},${tri.p2.y}`];
    return !keys.some(k => superSet.has(k));
  });
}

function triangleArea(a: Point, b: Point, c: Point): number {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
}

function triangleCentroid(a: Point, b: Point, c: Point): Point {
  return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
}

function getTriangleAvgColor(imgData: ImageData, a: Point, b: Point, c: Point): { r: number; g: number; b: number } {
  const { data, width } = imgData;
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxY = Math.min(imgData.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const total = triangleArea(a, b, c);
  let r = 0, g = 0, bl = 0, count = 0;
  for (let y = minY; y <= maxY; y += 2) {
    for (let x = minX; x <= maxX; x += 2) {
      const p = { x, y };
      const a1 = triangleArea(p, b, c);
      const a2 = triangleArea(a, p, c);
      const a3 = triangleArea(a, b, p);
      if (Math.abs(a1 + a2 + a3 - total) < total * 0.02) {
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

function getTriangleUVBounds(a: Point, b: Point, c: Point, w: number, h: number) {
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

function mergeSmallTriangles(tris: DelaunayTri[], maxCount: number, imgW: number, imgH: number): DelaunayTri[] {
  if (tris.length <= maxCount) return tris;
  let result = [...tris];
  const totalArea = imgW * imgH;
  const minArea = totalArea / (maxCount * 2);
  while (result.length > maxCount) {
    let smallestIdx = -1;
    let smallestArea = Infinity;
    for (let i = 0; i < result.length; i++) {
      const a = triangleArea(result[i].p0, result[i].p1, result[i].p2);
      if (a < smallestArea) {
        smallestArea = a;
        smallestIdx = i;
      }
    }
    if (smallestIdx === -1 || smallestArea > minArea * 3) break;
    result.splice(smallestIdx, 1);
  }
  return result.slice(0, maxCount);
}

export async function generateFaces(file: File): Promise<FaceData> {
  const img = await loadImage(file);
  const { width: imgW, height: imgH } = normalizeImageSize(img.width, img.height);
  const imageData = getImageData(img);
  const edges = sobelEdgeDetect(imageData);
  const edgePointBudget = Math.floor(MAX_FACES * 0.8);
  const edgePoints = sampleEdgePoints(edges, imgW, imgH, edgePointBudget);
  const interiorCount = Math.max(30, MAX_FACES - edgePoints.length - 4);
  const interiorPoints = sampleInteriorPoints(edges, imgW, imgH, interiorCount);
  let allPoints = [...edgePoints, ...interiorPoints];
  const uniqueMap = new Map<string, Point>();
  for (const p of allPoints) {
    uniqueMap.set(`${Math.round(p.x / 2)}_${Math.round(p.y / 2)}`, p);
  }
  allPoints = Array.from(uniqueMap.values());
  const delaunayTris = bowyerWatson(allPoints, imgW, imgH);
  const filteredTris = delaunayTris.filter(t => {
    const area = triangleArea(t.p0, t.p1, t.p2);
    const cx = (t.p0.x + t.p1.x + t.p2.x) / 3;
    const cy = (t.p0.y + t.p1.y + t.p2.y) / 3;
    return area > 4 && cx >= 0 && cx <= imgW && cy >= 0 && cy <= imgH;
  });
  const mergedTris = mergeSmallTriangles(filteredTris, MAX_FACES, imgW, imgH);
  const triangles: Triangle[] = mergedTris.map((tri) => {
    const centroid = triangleCentroid(tri.p0, tri.p1, tri.p2);
    const avgColor = getTriangleAvgColor(imageData, tri.p0, tri.p1, tri.p2);
    const uvBounds = getTriangleUVBounds(tri.p0, tri.p1, tri.p2, imgW, imgH);
    return {
      a: { ...tri.p0 },
      b: { ...tri.p1 },
      c: { ...tri.p2 },
      centroid,
      avgColor,
      neighbors: [],
      uvBounds
    };
  });
  for (let i = 0; i < triangles.length; i++) {
    for (let j = i + 1; j < triangles.length; j++) {
      const t1 = triangles[i], t2 = triangles[j];
      const pts1 = [t1.a, t1.b, t1.c];
      const pts2 = [t2.a, t2.b, t2.c];
      let shared = 0;
      for (const p1 of pts1) {
        for (const p2 of pts2) {
          if (Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.y - p2.y) < 1) {
            shared++;
            break;
          }
        }
      }
      if (shared >= 2) {
        t1.neighbors.push(j);
        t2.neighbors.push(i);
      }
    }
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

export function createThumbnail(originalFile: File, bounds: { minX: number; minY: number; maxX: number; maxY: number }): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 220;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      const sx = bounds.minX * img.width;
      const sy = bounds.minY * img.height;
      const sw = (bounds.maxX - bounds.minX) * img.width;
      const sh = (bounds.maxY - bounds.minY) * img.height;
      ctx.drawImage(img, Math.max(0, sx), Math.max(0, sy), Math.max(1, sw), Math.max(1, sh), 0, 0, 220, 100);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(originalFile);
  });
}
