export interface Point {
  x: number;
  y: number;
}

export interface Triangle {
  a: Point;
  b: Point;
  c: Point;
  centroid: Point;
  color: { r: number; g: number; b: number };
  neighbors: number[];
  area: number;
}

export interface FaceData {
  triangles: Triangle[];
  imageWidth: number;
  imageHeight: number;
  imageData: ImageData;
}

const MAX_FACES = 200;
const PROCESS_SIZE = 256;

export class FaceGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  async processImage(file: File): Promise<FaceData> {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('文件大小不能超过5MB');
    }

    const img = await this.loadImage(file);
    const { width, height } = this.calculateProcessSize(img.width, img.height);
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(img, 0, 0, width, height);
    
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const edges = this.sobelEdgeDetection(imageData, width, height);
    const points = this.samplePoints(edges, imageData, width, height);
    const triangles = this.delaunayTriangulation(points, width, height);
    const coloredTriangles = this.assignColors(triangles, imageData, width, height);
    const finalTriangles = this.simplifyTriangles(coloredTriangles);
    
    return {
      triangles: finalTriangles,
      imageWidth: width,
      imageHeight: height,
      imageData: this.ctx.getImageData(0, 0, width, height)
    };
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };
      img.src = url;
    });
  }

  private calculateProcessSize(origWidth: number, origHeight: number): { width: number; height: number } {
    const ratio = origWidth / origHeight;
    let width: number, height: number;
    
    if (ratio >= 1) {
      width = PROCESS_SIZE;
      height = Math.round(PROCESS_SIZE / ratio);
    } else {
      height = PROCESS_SIZE;
      width = Math.round(PROCESS_SIZE * ratio);
    }
    
    return { width, height };
  }

  private sobelEdgeDetection(imageData: ImageData, width: number, height: number): Uint8Array {
    const data = imageData.data;
    const gray = new Float32Array(width * height);
    const edges = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumX = 0, sumY = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const k = (ky + 1) * 3 + (kx + 1);
            sumX += gray[idx] * gx[k];
            sumY += gray[idx] * gy[k];
          }
        }
        const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
        edges[y * width + x] = Math.min(255, magnitude);
      }
    }

    return edges;
  }

  private samplePoints(edges: Uint8Array, _imageData: ImageData, width: number, height: number): Point[] {
    const points: Point[] = [];
    const edgeThreshold = 30;
    const targetPoints = 120;
    const gridSize = Math.ceil(Math.sqrt((width * height) / targetPoints));

    points.push({ x: 2, y: 2 });
    points.push({ x: width - 3, y: 2 });
    points.push({ x: 2, y: height - 3 });
    points.push({ x: width - 3, y: height - 3 });
    points.push({ x: width / 2, y: 2 });
    points.push({ x: width / 2, y: height - 3 });
    points.push({ x: 2, y: height / 2 });
    points.push({ x: width - 3, y: height / 2 });

    for (let y = gridSize; y < height - gridSize; y += gridSize) {
      for (let x = gridSize; x < width - gridSize; x += gridSize) {
        let bestX = x, bestY = y, bestEdge = -1;
        
        for (let dy = -gridSize / 2; dy <= gridSize / 2; dy += 2) {
          for (let dx = -gridSize / 2; dx <= gridSize / 2; dx += 2) {
            const px = Math.floor(x + dx);
            const py = Math.floor(y + dy);
            if (px > 0 && px < width - 1 && py > 0 && py < height - 1) {
              const edgeVal = edges[py * width + px];
              if (edgeVal > bestEdge && edgeVal > edgeThreshold) {
                bestEdge = edgeVal;
                bestX = px;
                bestY = py;
              }
            }
          }
        }

        if (bestEdge < 0) {
          bestX = x + (Math.random() - 0.5) * gridSize * 0.5;
          bestY = y + (Math.random() - 0.5) * gridSize * 0.5;
        }

        points.push({
          x: Math.max(1, Math.min(width - 2, bestX)),
          y: Math.max(1, Math.min(height - 2, bestY))
        });
      }
    }

    return points;
  }

  private delaunayTriangulation(points: Point[], width: number, height: number): Triangle[] {
    const triangles: Triangle[] = [];
    
    const margin = Math.max(width, height) * 10;
    const superTri: [Point, Point, Point] = [
      { x: -margin, y: -margin },
      { x: width + margin * 2, y: -margin },
      { x: width / 2, y: height + margin * 2 }
    ];
    
    let workingTriangles: { a: Point; b: Point; c: Point; circumcircle: { cx: number; cy: number; r: number } }[] = [];
    workingTriangles.push(this.createTriangle(superTri[0], superTri[1], superTri[2]));

    for (const point of points) {
      const badTriangles: typeof workingTriangles = [];
      
      for (const tri of workingTriangles) {
        const dx = point.x - tri.circumcircle.cx;
        const dy = point.y - tri.circumcircle.cy;
        if (dx * dx + dy * dy < tri.circumcircle.r) {
          badTriangles.push(tri);
        }
      }

      const polygon: [Point, Point][] = [];
      for (const tri of badTriangles) {
        const edges: [Point, Point][] = [
          [tri.a, tri.b],
          [tri.b, tri.c],
          [tri.c, tri.a]
        ];
        for (const edge of edges) {
          let shared = false;
          for (const other of badTriangles) {
            if (other === tri) continue;
            const otherEdges: [Point, Point][] = [
              [other.a, other.b],
              [other.b, other.c],
              [other.c, other.a]
            ];
            for (const oe of otherEdges) {
              if ((this.pointsEqual(edge[0], oe[0]) && this.pointsEqual(edge[1], oe[1])) ||
                  (this.pointsEqual(edge[0], oe[1]) && this.pointsEqual(edge[1], oe[0]))) {
                shared = true;
                break;
              }
            }
            if (shared) break;
          }
          if (!shared) {
            polygon.push(edge);
          }
        }
      }

      workingTriangles = workingTriangles.filter(t => !badTriangles.includes(t));

      for (const edge of polygon) {
        workingTriangles.push(this.createTriangle(edge[0], edge[1], point));
      }
    }

    for (const tri of workingTriangles) {
      const hasSuper = tri.a === superTri[0] || tri.a === superTri[1] || tri.a === superTri[2] ||
                       tri.b === superTri[0] || tri.b === superTri[1] || tri.b === superTri[2] ||
                       tri.c === superTri[0] || tri.c === superTri[1] || tri.c === superTri[2];
      if (!hasSuper) {
        const centroid = {
          x: (tri.a.x + tri.b.x + tri.c.x) / 3,
          y: (tri.a.y + tri.b.y + tri.c.y) / 3
        };
        const area = Math.abs(
          (tri.b.x - tri.a.x) * (tri.c.y - tri.a.y) -
          (tri.c.x - tri.a.x) * (tri.b.y - tri.a.y)
        ) / 2;
        
        triangles.push({
          a: tri.a,
          b: tri.b,
          c: tri.c,
          centroid,
          color: { r: 128, g: 128, b: 128 },
          neighbors: [],
          area
        });
      }
    }

    this.computeNeighbors(triangles);
    return triangles;
  }

  private createTriangle(a: Point, b: Point, c: Point) {
    const circumcircle = this.circumcircle(a, b, c);
    return { a, b, c, circumcircle };
  }

  private circumcircle(a: Point, b: Point, c: Point): { cx: number; cy: number; r: number } {
    const ax = a.x, ay = a.y;
    const bx = b.x, by = b.y;
    const cx = c.x, cy = c.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-10) {
      return { cx: (ax + bx + cx) / 3, cy: (ay + by + cy) / 3, r: Infinity };
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    const dx = ax - ux;
    const dy = ay - uy;

    return { cx: ux, cy: uy, r: dx * dx + dy * dy + 0.001 };
  }

  private pointsEqual(p1: Point, p2: Point): boolean {
    return Math.abs(p1.x - p2.x) < 0.001 && Math.abs(p1.y - p2.y) < 0.001;
  }

  private edgesEqual(e1: [Point, Point], e2: [Point, Point]): boolean {
    return (this.pointsEqual(e1[0], e2[0]) && this.pointsEqual(e1[1], e2[1])) ||
           (this.pointsEqual(e1[0], e2[1]) && this.pointsEqual(e1[1], e2[0]));
  }

  private computeNeighbors(triangles: Triangle[]): void {
    for (let i = 0; i < triangles.length; i++) {
      triangles[i].neighbors = [];
      const edgesI: [Point, Point][] = [
        [triangles[i].a, triangles[i].b],
        [triangles[i].b, triangles[i].c],
        [triangles[i].c, triangles[i].a]
      ];

      for (let j = 0; j < triangles.length; j++) {
        if (i === j) continue;
        const edgesJ: [Point, Point][] = [
          [triangles[j].a, triangles[j].b],
          [triangles[j].b, triangles[j].c],
          [triangles[j].c, triangles[j].a]
        ];

        for (const ei of edgesI) {
          for (const ej of edgesJ) {
            if (this.edgesEqual(ei, ej)) {
              if (!triangles[i].neighbors.includes(j)) {
                triangles[i].neighbors.push(j);
              }
            }
          }
        }
      }
    }
  }

  private assignColors(triangles: Triangle[], imageData: ImageData, width: number, height: number): Triangle[] {
    const data = imageData.data;

    for (const tri of triangles) {
      let r = 0, g = 0, b = 0, count = 0;

      const minX = Math.max(0, Math.floor(Math.min(tri.a.x, tri.b.x, tri.c.x)));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(tri.a.x, tri.b.x, tri.c.x)));
      const minY = Math.max(0, Math.floor(Math.min(tri.a.y, tri.b.y, tri.c.y)));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(tri.a.y, tri.b.y, tri.c.y)));

      for (let y = minY; y <= maxY; y += 2) {
        for (let x = minX; x <= maxX; x += 2) {
          if (this.pointInTriangle(x, y, tri)) {
            const idx = (y * width + x) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }
      }

      if (count > 0) {
        tri.color = {
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count)
        };
      }
    }

    return triangles;
  }

  private pointInTriangle(px: number, py: number, tri: Triangle): boolean {
    const d1 = this.sign(px, py, tri.a, tri.b);
    const d2 = this.sign(px, py, tri.b, tri.c);
    const d3 = this.sign(px, py, tri.c, tri.a);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
  }

  private sign(px: number, py: number, p1: Point, p2: Point): number {
    return (px - p2.x) * (p1.y - p2.y) - (p1.x - p2.x) * (py - p2.y);
  }

  private simplifyTriangles(triangles: Triangle[]): Triangle[] {
    if (triangles.length <= MAX_FACES) {
      return triangles;
    }

    const sorted = [...triangles].sort((a, b) => a.area - b.area);
    const toRemove = sorted.length - MAX_FACES;
    const removedIndices = new Set<number>();

    const sortedWithIdx = sorted.map(t => ({
      tri: t,
      idx: triangles.indexOf(t)
    }));

    for (let i = 0; i < toRemove && i < sortedWithIdx.length; i++) {
      removedIndices.add(sortedWithIdx[i].idx);
    }

    const result: Triangle[] = [];
    for (let i = 0; i < triangles.length; i++) {
      if (!removedIndices.has(i)) {
        result.push(triangles[i]);
      }
    }

    this.computeNeighbors(result);
    return result;
  }

  getFaceSnippet(imageData: ImageData, tri: Triangle, canvasWidth: number, canvasHeight: number): string {
    const snippetCanvas = document.createElement('canvas');
    const size = 64;
    snippetCanvas.width = size;
    snippetCanvas.height = size;
    const sctx = snippetCanvas.getContext('2d')!;

    const minX = Math.min(tri.a.x, tri.b.x, tri.c.x);
    const maxX = Math.max(tri.a.x, tri.b.x, tri.c.x);
    const minY = Math.min(tri.a.y, tri.b.y, tri.c.y);
    const maxY = Math.max(tri.a.y, tri.b.y, tri.c.y);
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const halfSize = Math.max(maxX - minX, maxY - minY) / 2 + 5;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = canvasWidth;
    srcCanvas.height = canvasHeight;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.putImageData(imageData, 0, 0);

    sctx.fillStyle = '#1a1a2e';
    sctx.fillRect(0, 0, size, size);

    sctx.drawImage(
      srcCanvas,
      Math.max(0, cx - halfSize),
      Math.max(0, cy - halfSize),
      halfSize * 2,
      halfSize * 2,
      0, 0, size, size
    );

    return snippetCanvas.toDataURL();
  }
}
