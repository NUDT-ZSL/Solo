export interface Point {
  x: number;
  y: number;
}

export type OpeningType = 'single_door' | 'double_door' | 'sliding_window' | 'casement_window';

export interface Opening {
  id: string;
  type: OpeningType;
  edgeIndex: number;
  position: number;
  width: number;
}

export interface Room {
  id: string;
  name: string;
  color: string;
  points: Point[];
  area: number;
  openings: Opening[];
}

export interface Scale {
  pixels: number;
  meters: number;
}

export interface DetectedRegion {
  points: Point[];
  confidence: number;
}

export const COLOR_PALETTE = [
  '#4A90D9',
  '#E74C3C',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#3498DB',
];

export const OPENING_TYPE_LABELS: Record<OpeningType, string> = {
  single_door: '单开门',
  double_door: '双开门',
  sliding_window: '推拉窗',
  casement_window: '平开窗',
};

export function getNextColor(usedColors: string[]): string {
  for (const color of COLOR_PALETTE) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function pixelsToMeters(pixels: number, scale: Scale): number {
  if (scale.pixels === 0) return 0;
  return (pixels * scale.meters) / scale.pixels;
}

export function metersToPixels(meters: number, scale: Scale): number {
  if (scale.meters === 0) return 0;
  return (meters * scale.pixels) / scale.meters;
}

export function polygonAreaPixels(points: Point[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

export function polygonAreaSquareMeters(points: Point[], scale: Scale): number {
  const pixelArea = polygonAreaPixels(points);
  const pixelToMeter = scale.pixels > 0 ? scale.meters / scale.pixels : 0;
  return pixelArea * pixelToMeter * pixelToMeter;
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): { distance: number; position: number; closestPoint: Point } {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { distance: distance(point, lineStart), position: 0, closestPoint: lineStart };
  }
  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestPoint = lerp(lineStart, lineEnd, t);
  return {
    distance: distance(point, closestPoint),
    position: t,
    closestPoint,
  };
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function formatExportData(rooms: Room[], scale: Scale, imageFilename: string): string {
  const data = {
    scale,
    rooms,
    imageFilename,
    exportTime: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function grayscale(data: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) | 0;
  }
  return gray;
}

export function gaussianBlur(gray: Uint8ClampedArray, width: number, height: number, sigma: number = 1.4): Float32Array {
  const size = Math.ceil(sigma * 3) * 2 + 1;
  const half = Math.floor(size / 2);
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - half;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;

  const temp = new Float32Array(width * height);
  const out = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -half; k <= half; k++) {
        const px = Math.min(width - 1, Math.max(0, x + k));
        val += gray[y * width + px] * kernel[k + half];
      }
      temp[y * width + x] = val;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -half; k <= half; k++) {
        const py = Math.min(height - 1, Math.max(0, y + k));
        val += temp[py * width + x] * kernel[k + half];
      }
      out[y * width + x] = val;
    }
  }

  return out;
}

export function sobelGradient(image: Float32Array, width: number, height: number): { magnitude: Float32Array; direction: Float32Array } {
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0, sy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kidx = (ky + 1) * 3 + (kx + 1);
          sx += image[idx] * gx[kidx];
          sy += image[idx] * gy[kidx];
        }
      }
      const magIdx = y * width + x;
      magnitude[magIdx] = Math.sqrt(sx * sx + sy * sy);
      direction[magIdx] = Math.atan2(sy, sx);
    }
  }
  return { magnitude, direction };
}

export function nonMaxSuppression(magnitude: Float32Array, direction: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = direction[idx];
      const mag = magnitude[idx];
      let q = 255, r = 255;
      if ((angle >= -Math.PI / 8 && angle < Math.PI / 8) || (angle >= 7 * Math.PI / 8) || (angle < -7 * Math.PI / 8)) {
        q = magnitude[idx + 1];
        r = magnitude[idx - 1];
      } else if ((angle >= Math.PI / 8 && angle < 3 * Math.PI / 8) || (angle >= -7 * Math.PI / 8 && angle < -5 * Math.PI / 8)) {
        q = magnitude[idx + width - 1];
        r = magnitude[idx - width + 1];
      } else if ((angle >= 3 * Math.PI / 8 && angle < 5 * Math.PI / 8) || (angle >= -5 * Math.PI / 8 && angle < -3 * Math.PI / 8)) {
        q = magnitude[idx + width];
        r = magnitude[idx - width];
      } else {
        q = magnitude[idx - width - 1];
        r = magnitude[idx + width + 1];
      }
      if (mag >= q && mag >= r) out[idx] = mag;
      else out[idx] = 0;
    }
  }
  return out;
}

export function doubleThreshold(image: Float32Array, width: number, height: number, low: number, high: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0; i < image.length; i++) {
    const v = image[i];
    if (v >= high) out[i] = 255;
    else if (v >= low) out[i] = 128;
    else out[i] = 0;
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (out[idx] === 128) {
        if (out[idx + 1] === 255 || out[idx - 1] === 255 ||
            out[idx + width] === 255 || out[idx - width] === 255 ||
            out[idx + width + 1] === 255 || out[idx + width - 1] === 255 ||
            out[idx - width + 1] === 255 || out[idx - width - 1] === 255) {
          out[idx] = 255;
        } else {
          out[idx] = 0;
        }
      }
    }
  }
  return out;
}

export function cannyEdgeDetect(imageData: ImageData, lowThreshold: number = 30, highThreshold: number = 80): Uint8ClampedArray {
  const { data, width, height } = imageData;
  const gray = grayscale(data);
  const blurred = gaussianBlur(gray, width, height, 1.4);
  const { magnitude, direction } = sobelGradient(blurred, width, height);
  const nms = nonMaxSuppression(magnitude, direction, width, height);
  return doubleThreshold(nms, width, height, lowThreshold, highThreshold);
}

export function findRectangularRegions(edges: Uint8ClampedArray, width: number, height: number): DetectedRegion[] {
  const regions: DetectedRegion[] = [];
  const visited = new Uint8Array(width * height);
  const step = Math.max(1, Math.floor(Math.min(width, height) / 200));

  for (let y = 10; y < height - 10; y += step) {
    for (let x = 10; x < width - 10; x += step) {
      const idx = y * width + x;
      if (edges[idx] !== 255 || visited[idx]) continue;

      const points: Point[] = [];
      const stack: number[] = [idx];
      let minX = x, maxX = x, minY = y, maxY = y;

      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (visited[cur]) continue;
        visited[cur] = 1;
        const cx = cur % width;
        const cy = Math.floor(cur / width);
        points.push({ x: cx, y: cy });
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (edges[nidx] === 255 && !visited[nidx]) {
                stack.push(nidx);
              }
            }
          }
        }
      }

      const rectW = maxX - minX;
      const rectH = maxY - minY;
      if (rectW > 40 && rectH > 40 && points.length > 20) {
        const confidence = Math.min(1, points.length / (rectW * 2 + rectH * 2));
        const padding = 5;
        regions.push({
          points: [
            { x: minX - padding, y: minY - padding },
            { x: maxX + padding, y: minY - padding },
            { x: maxX + padding, y: maxY + padding },
            { x: minX - padding, y: maxY + padding },
          ],
          confidence,
        });
      }
    }
  }

  regions.sort((a, b) => b.confidence - a.confidence);
  return regions.slice(0, 10);
}
