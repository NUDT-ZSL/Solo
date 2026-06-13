import { useEffect, useRef } from 'react';

export type Attitude = 'agree' | 'disagree' | 'discuss' | 'confuse';

export interface FeedbackArea {
  x: number;
  y: number;
  width: number;
  height: number;
  attitude: Attitude;
}

export interface HeatmapProps {
  width: number;
  height: number;
  feedbacks: FeedbackArea[];
  showOverlay: boolean;
}

const ATTITUDE_COLORS: Record<Attitude, { r: number; g: number; b: number }> = {
  agree: { r: 34, g: 197, b: 94 },
  disagree: { r: 239, g: 68, b: 68 },
  discuss: { r: 249, g: 115, b: 22 },
  confuse: { r: 168, g: 85, b: 247 }
};

const GRID_SIZE = 10;
const GAUSSIAN_SIGMA = 30;
const MAX_OPACITY = 0.6;

function buildGaussianKernel1D(sigma: number): { kernel: Float32Array; radius: number } {
  const radius = Math.ceil(sigma * 3);
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  const twoSigmaSq = 2 * sigma * sigma;
  const factor = 1 / Math.sqrt(Math.PI * twoSigmaSq);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const val = factor * Math.exp(-(x * x) / twoSigmaSq);
    kernel[i] = val;
    sum += val;
  }
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  return { kernel, radius };
}

function applySeparableGaussianBlur(
  grid: Float32Array,
  cols: number,
  rows: number,
  sigma: number
): Float32Array {
  const { kernel, radius } = buildGaussianKernel1D(sigma);
  const temp = new Float32Array(cols * rows);
  const result = new Float32Array(cols * rows);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let val = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.max(0, Math.min(cols - 1, x + k));
        val += grid[y * cols + xx] * kernel[k + radius];
      }
      temp[y * cols + x] = val;
    }
  }

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let val = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.max(0, Math.min(rows - 1, y + k));
        val += temp[yy * cols + x] * kernel[k + radius];
      }
      result[y * cols + x] = val;
    }
  }

  return result;
}

function buildDensityGrid(
  feedbacks: FeedbackArea[],
  attitude: Attitude,
  cols: number,
  rows: number
): Float32Array {
  const grid = new Float32Array(cols * rows);
  const filtered = feedbacks.filter((f) => f.attitude === attitude);

  for (const fb of filtered) {
    const cx = fb.x + fb.width / 2;
    const cy = fb.y + fb.height / 2;
    const gx = Math.floor(cx / GRID_SIZE);
    const gy = Math.floor(cy / GRID_SIZE);
    const halfW = Math.max(1, Math.floor(fb.width / 2 / GRID_SIZE));
    const halfH = Math.max(1, Math.floor(fb.height / 2 / GRID_SIZE));

    for (let dy = -halfH; dy <= halfH; dy++) {
      for (let dx = -halfW; dx <= halfW; dx++) {
        const x = gx + dx;
        const y = gy + dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        const distRatio = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(halfW * halfW + halfH * halfH);
        const weight = Math.max(0.2, 1 - distRatio);
        grid[y * cols + x] += weight;
      }
    }
  }

  return grid;
}

export default function Heatmap({ width, height, feedbacks, showOverlay }: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    if (!showOverlay || feedbacks.length === 0) return;

    const cols = Math.ceil(width / GRID_SIZE);
    const rows = Math.ceil(height / GRID_SIZE);

    const attitudes: Attitude[] = ['agree', 'disagree', 'discuss', 'confuse'];
    const blurredGrids: Record<Attitude, Float32Array> = {} as Record<Attitude, Float32Array>;

    let maxDensity = 0;
    for (const att of attitudes) {
      const grid = buildDensityGrid(feedbacks, att, cols, rows);
      const sigmaInGrid = GAUSSIAN_SIGMA / GRID_SIZE;
      const blurred = applySeparableGaussianBlur(grid, cols, rows, sigmaInGrid);
      blurredGrids[att] = blurred;
      for (let i = 0; i < blurred.length; i++) {
        if (blurred[i] > maxDensity) maxDensity = blurred[i];
      }
    }

    if (maxDensity === 0) return;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const idx = gy * cols + gx;
        let r = 0,
          g = 0,
          b = 0,
          a = 0;

        for (const att of attitudes) {
          const density = blurredGrids[att][idx];
          if (density <= 0) continue;
          const normalized = density / maxDensity;
          const opacity = Math.min(normalized, 1) * MAX_OPACITY;
          const color = ATTITUDE_COLORS[att];
          r += color.r * opacity;
          g += color.g * opacity;
          b += color.b * opacity;
          a = Math.max(a, opacity);
        }

        if (a <= 0.001) continue;

        const startX = gx * GRID_SIZE;
        const startY = gy * GRID_SIZE;
        const endX = Math.min(startX + GRID_SIZE, width);
        const endY = Math.min(startY + GRID_SIZE, height);

        for (let py = Math.floor(startY); py < endY; py++) {
          for (let px = Math.floor(startX); px < endX; px++) {
            if (px < 0 || py < 0 || px >= width || py >= height) continue;
            const pixelIdx = (py * width + px) * 4;
            data[pixelIdx] = Math.min(255, r);
            data[pixelIdx + 1] = Math.min(255, g);
            data[pixelIdx + 2] = Math.min(255, b);
            data[pixelIdx + 3] = Math.round(a * 255);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [width, height, feedbacks, showOverlay]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none'
      }}
    />
  );
}
