import type { Region, Point, Bounds } from './types';
import { generateRandomColor } from './colorUtils';

const LINE_THRESHOLD = 128;

function isLinePixel(r: number, g: number, b: number): boolean {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < LINE_THRESHOLD;
}

export interface ParseResult {
  regions: Region[];
  width: number;
  height: number;
  imageData: ImageData;
}

export function parseLineArt(sourceCanvas: HTMLCanvasElement): ParseResult {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const visited = new Uint8Array(width * height);
  const regions: Region[] = [];
  let regionId = 0;

  const linePixels = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    linePixels[i] = isLinePixel(data[idx], data[idx + 1], data[idx + 2]) ? 1 : 0;
  }

  const queue: number[] = [];
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      if (visited[pixelIndex] || linePixels[pixelIndex]) {
        continue;
      }

      queue.length = 0;
      queue.push(pixelIndex);
      visited[pixelIndex] = 1;

      const pixels: Point[] = [];
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let seedX = x;
      let seedY = y;

      while (queue.length > 0) {
        const current = queue.pop()!;
        const cx = current % width;
        const cy = Math.floor(current / width);

        pixels.push({ x: cx, y: cy });

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (const [dx, dy] of directions) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            continue;
          }
          const nIdx = ny * width + nx;
          if (visited[nIdx] || linePixels[nIdx]) {
            continue;
          }
          visited[nIdx] = 1;
          queue.push(nIdx);
        }
      }

      if (pixels.length < 25) {
        continue;
      }

      const bounds: Bounds = { minX, minY, maxX, maxY };
      const seedPoint = { x: seedX, y: seedY };

      regions.push({
        id: regionId++,
        seedPoint,
        bounds,
        pixelCount: pixels.length,
        color: generateRandomColor(),
        pixels,
      });
    }
  }

  regions.sort((a, b) => b.pixelCount - a.pixelCount);

  for (let i = 0; i < regions.length; i++) {
    regions[i].id = i;
  }

  return { regions, width, height, imageData };
}

export function findRegionAtPoint(
  regions: Region[],
  x: number,
  y: number,
): Region | null {
  for (const region of regions) {
    const { minX, minY, maxX, maxY } = region.bounds;
    if (x < minX || x > maxX || y < minY || y > maxY) {
      continue;
    }
    for (const p of region.pixels) {
      if (p.x === x && p.y === y) {
        return region;
      }
    }
  }
  return null;
}
