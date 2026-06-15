import { RGB, Layer, Frame, Project } from '../types';
import { rgbToString, colorsEqual } from './colorUtils';

export function createEmptyPixels(width: number, height: number): (RGB | null)[][] {
  const pixels: (RGB | null)[][] = [];
  for (let y = 0; y < height; y++) {
    pixels[y] = [];
    for (let x = 0; x < width; x++) {
      pixels[y][x] = null;
    }
  }
  return pixels;
}

export function deepCopyPixels(pixels: (RGB | null)[][]): (RGB | null)[][] {
  return pixels.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function drawPixelOnCtx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: RGB,
  scale: number,
  globalOpacity = 1
) {
  const alpha = (color.a ?? 1) * globalOpacity;
  ctx.fillStyle = rgbToString({ ...color, a: alpha });
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

export function drawLayerOnCtx(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  scale: number,
  globalOpacity = 1
) {
  if (!layer.visible) return;
  const layerOpacity = (layer.opacity / 100) * globalOpacity;
  if (layerOpacity <= 0) return;
  for (let y = 0; y < layer.pixels.length; y++) {
    for (let x = 0; x < layer.pixels[y].length; x++) {
      const pixel = layer.pixels[y][x];
      if (pixel) {
        drawPixelOnCtx(ctx, x, y, pixel, scale, layerOpacity);
      }
    }
  }
}

export function drawFrameOnCtx(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  scale: number,
  options: { currentLayerId?: string; globalOpacity?: number; hideNonActive?: boolean } = {}
) {
  const globalOpacity = options.globalOpacity ?? 1;
  for (const layer of frame.layers) {
    let layerOpacity = 1;
    if (options.hideNonActive && options.currentLayerId && layer.id !== options.currentLayerId) {
      layerOpacity = 0.5;
    }
    drawLayerOnCtx(ctx, layer, scale, globalOpacity * layerOpacity);
  }
}

export function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, scale: number) {
  const gridColor1 = '#c0c0c0';
  const gridColor2 = '#808080';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? gridColor1 : gridColor2;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

export function floodFill(
  pixels: (RGB | null)[][],
  startX: number,
  startY: number,
  fillColor: RGB | null
): (RGB | null)[][] {
  const width = pixels[0].length;
  const height = pixels.length;
  const targetColor = pixels[startY][startX];
  if (colorsEqual(targetColor, fillColor)) return pixels;
  const newPixels = deepCopyPixels(pixels);
  const stack: Array<[number, number]> = [[startX, startY]];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (!colorsEqual(newPixels[y][x], targetColor)) continue;
    visited.add(key);
    newPixels[y][x] = fillColor ? { ...fillColor } : null;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return newPixels;
}

export function getLinePixels(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const pixels: Array<[number, number]> = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    pixels.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return pixels;
}

export function getRectanglePixels(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const pixels: Array<[number, number]> = [];
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  for (let x = minX; x <= maxX; x++) {
    pixels.push([x, minY], [x, maxY]);
  }
  for (let y = minY + 1; y < maxY; y++) {
    pixels.push([minX, y], [maxX, y]);
  }
  return pixels;
}

export function getCirclePixels(cx: number, cy: number, r: number): Array<[number, number]> {
  const pixels: Array<[number, number]> = [];
  let x = r;
  let y = 0;
  let err = 0;
  while (x >= y) {
    pixels.push(
      [cx + x, cy + y], [cx - x, cy + y],
      [cx + x, cy - y], [cx - x, cy - y],
      [cx + y, cy + x], [cx - y, cy + x],
      [cx + y, cy - x], [cx - y, cy - x]
    );
    y++;
    err += 2 * y - 1;
    if (err > 0) { x--; err -= 2 * x + 1; }
  }
  return Array.from(new Set(pixels.map(p => p.join(',')))).map(s => s.split(',').map(Number) as [number, number]);
}

export function renderFramesToSpritesheet(
  project: Project,
  scale: number,
  bgColor: RGB | null
): HTMLCanvasElement {
  const { width, height, frames } = project;
  const cols = Math.ceil(Math.sqrt(frames.length));
  const rows = Math.ceil(frames.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale * cols;
  canvas.height = height * scale * rows;
  const ctx = canvas.getContext('2d')!;
  if (bgColor) {
    ctx.fillStyle = rgbToString(bgColor);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  frames.forEach((frame, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    ctx.save();
    ctx.translate(col * width * scale, row * height * scale);
    drawFrameOnCtx(ctx, frame, scale);
    ctx.restore();
  });
  return canvas;
}

export function renderFrameThumbnail(
  frame: Frame,
  width: number,
  height: number,
  thumbSize: number
): string {
  const scale = Math.floor(thumbSize / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFrameOnCtx(ctx, frame, scale);
  return canvas.toDataURL();
}
