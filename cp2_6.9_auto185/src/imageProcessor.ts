export interface Point {
  x: number;
  y: number;
}

export interface BezierCurve {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
}

export interface ExtractedPath {
  id: number;
  points: Point[];
  curves: BezierCurve[];
  color: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export class ImageProcessor {
  private originalImageData: ImageData | null = null;
  private binaryData: Uint8ClampedArray | null = null;
  private width: number = 0;
  private height: number = 0;

  loadImage(img: HTMLImageElement, maxSize: number = 800): { width: number; height: number } {
    const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
    this.width = Math.round(img.width * ratio);
    this.height = Math.round(img.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, this.width, this.height);
    this.originalImageData = ctx.getImageData(0, 0, this.width, this.height);

    return { width: this.width, height: this.height };
  }

  binarize(threshold: number): ImageData {
    if (!this.originalImageData) {
      throw new Error('No image loaded');
    }

    const src = this.originalImageData.data;
    const len = src.length;
    const output = new Uint8ClampedArray(len);
    this.binaryData = new Uint8ClampedArray(this.width * this.height);

    for (let i = 0, p = 0; i < len; i += 4, p++) {
      const gray = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      const binary = gray < threshold ? 0 : 255;
      output[i] = binary;
      output[i + 1] = binary;
      output[i + 2] = binary;
      output[i + 3] = 255;
      this.binaryData[p] = binary === 0 ? 1 : 0;
    }

    return new ImageData(output, this.width, this.height);
  }

  private sobelEdgeDetect(): Uint8ClampedArray {
    if (!this.binaryData) throw new Error('Binary data not available');

    const w = this.width;
    const h = this.height;
    const edges = new Uint8ClampedArray(w * h);

    const gx = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    const gy = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let sumX = 0;
        let sumY = 0;
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const pixel = this.binaryData[(y + j) * w + (x + i)];
            sumX += pixel * gx[j + 1][i + 1];
            sumY += pixel * gy[j + 1][i + 1];
          }
        }
        const mag = Math.sqrt(sumX * sumX + sumY * sumY);
        edges[y * w + x] = mag > 30 ? 1 : 0;
      }
    }

    return edges;
  }

  extractPaths(tolerance: number = 5): ExtractedPath[] {
    const edges = this.sobelEdgeDetect();
    const paths = this.traceContours(edges);
    const result: ExtractedPath[] = [];

    paths.forEach((points, idx) => {
      if (points.length < 4) return;
      const curves = this.fitBezierCurves(points, tolerance);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      result.push({
        id: idx,
        points,
        curves,
        color: '#00FFFF',
        bounds: { minX, minY, maxX, maxY },
      });
    });

    return result;
  }

  private traceContours(edges: Uint8ClampedArray): Point[][] {
    const w = this.width;
    const h = this.height;
    const visited = new Uint8Array(w * h);
    const contours: Point[][] = [];

    const dirs = [
      [1, 0], [1, 1], [0, 1], [-1, 1],
      [-1, 0], [-1, -1], [0, -1], [1, -1],
    ];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (edges[idx] && !visited[idx]) {
          const contour: Point[] = [];
          const stack: Point[] = [{ x, y }];
          while (stack.length) {
            const p = stack.pop()!;
            const pIdx = p.y * w + p.x;
            if (p.x < 0 || p.x >= w || p.y < 0 || p.y >= h) continue;
            if (visited[pIdx] || !edges[pIdx]) continue;
            visited[pIdx] = 1;
            contour.push(p);
            for (const [dx, dy] of dirs) {
              stack.push({ x: p.x + dx, y: p.y + dy });
            }
          }
          if (contour.length >= 8) {
            contours.push(this.orderContourPoints(contour));
          }
        }
      }
    }

    return contours.sort((a, b) => b.length - a.length).slice(0, 50);
  }

  private orderContourPoints(points: Point[]): Point[] {
    if (points.length <= 2) return points;
    const ordered: Point[] = [points[0]];
    const used = new Set([0]);
    let current = 0;

    while (used.size < points.length) {
      let nearest = -1;
      let minDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        if (used.has(i)) continue;
        const d = this.dist(points[current], points[i]);
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
      if (nearest === -1 || minDist > 20) break;
      ordered.push(points[nearest]);
      used.add(nearest);
      current = nearest;
    }

    return this.simplifyPoints(ordered, 2);
  }

  private simplifyPoints(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;
    const result: Point[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      if (this.dist(points[i], result[result.length - 1]) >= tolerance) {
        result.push(points[i]);
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }

  private dist(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private fitBezierCurves(points: Point[], tolerance: number): BezierCurve[] {
    const curves: BezierCurve[] = [];
    if (points.length < 2) return curves;

    const step = Math.max(3, Math.floor(points.length / Math.ceil(points.length / 20)));

    for (let i = 0; i < points.length - 1; i += step) {
      const end = Math.min(i + step, points.length - 1);
      const segment = points.slice(i, end + 1);
      if (segment.length >= 4) {
        curves.push(this.fitCubicBezier(segment));
      } else if (segment.length >= 2) {
        const p0 = segment[0];
        const p3 = segment[segment.length - 1];
        const t = 1 / 3;
        curves.push({
          p0,
          p1: { x: p0.x + (p3.x - p0.x) * t, y: p0.y + (p3.y - p0.y) * t },
          p2: { x: p0.x + (p3.x - p0.x) * (1 - t), y: p0.y + (p3.y - p0.y) * (1 - t) },
          p3,
        });
      }
    }

    return curves;
  }

  private fitCubicBezier(points: Point[]): BezierCurve {
    const n = points.length - 1;
    const p0 = points[0];
    const p3 = points[n];

    if (n === 0) return { p0, p1: p0, p2: p3, p3 };

    let a: Point[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const s = 1 - t;
      const s2 = s * s;
      const s3 = s2 * s;
      const p = {
        x: points[i].x - s3 * p0.x - t3 * p3.x,
        y: points[i].y - s3 * p0.y - t3 * p3.y,
      };
      a.push({
        x: 3 * s2 * t,
        y: 3 * s * t2,
      });
      points[i] = p;
    }

    let c11 = 0, c12 = 0, c22 = 0, x1 = 0, x2 = 0;
    for (let i = 0; i <= n; i++) {
      c11 += a[i].x * a[i].x;
      c12 += a[i].x * a[i].y;
      c22 += a[i].y * a[i].y;
      x1 += a[i].x * (points[i].x / 3 + points[i].y / 3);
      x2 += a[i].y * (points[i].x / 3 + points[i].y / 3);
    }

    const det = c11 * c22 - c12 * c12;
    let alpha1 = 0, alpha2 = 0;
    if (Math.abs(det) > 1e-6) {
      alpha1 = (c22 * x1 - c12 * x2) / det;
      alpha2 = (c11 * x2 - c12 * x1) / det;
    }

    const segLen = this.dist(p0, p3);
    if (segLen < 1) {
      return { p0, p1: p0, p2: p3, p3 };
    }

    if (alpha1 < 0 || alpha2 < 0 || !isFinite(alpha1) || !isFinite(alpha2)) {
      const t = 1 / 3;
      return {
        p0,
        p1: { x: p0.x + (p3.x - p0.x) * t, y: p0.y + (p3.y - p0.y) * t },
        p2: { x: p0.x + (p3.x - p0.x) * (1 - t), y: p0.y + (p3.y - p0.y) * (1 - t) },
        p3,
      };
    }

    return {
      p0,
      p1: { x: p0.x + alpha1 * (p3.x - p0.x), y: p0.y + alpha1 * (p3.y - p0.y) },
      p2: { x: p3.x - alpha2 * (p3.x - p0.x), y: p3.y - alpha2 * (p3.y - p0.y) },
      p3,
    };
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }
}
