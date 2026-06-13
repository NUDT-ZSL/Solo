import { saveAs } from 'file-saver';

export type CanvasData = Map<string, string>;

function generateFileName(extension: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `colorburst_${timestamp}.${extension}`;
}

export function exportToPNG(
  canvasData: CanvasData,
  gridSize: number,
  cellSize: number,
  scale: number
): void {
  const totalSize = gridSize * cellSize * scale;
  const offscreen = document.createElement('canvas');
  offscreen.width = totalSize;
  offscreen.height = totalSize;
  const ctx = offscreen.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalSize, totalSize);

  canvasData.forEach((color, key) => {
    const [xStr, yStr] = key.split(',');
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);
    ctx.fillStyle = color;
    ctx.fillRect(x * cellSize * scale, y * cellSize * scale, cellSize * scale, cellSize * scale);
  });

  offscreen.toBlob((blob) => {
    if (blob) {
      saveAs(blob, generateFileName('png'));
    }
  });
}

export function exportToSVG(
  canvasData: CanvasData,
  gridSize: number,
  cellSize: number
): void {
  const totalSize = gridSize * cellSize;

  let rects = '';
  canvasData.forEach((color, key) => {
    const [xStr, yStr] = key.split(',');
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);
    rects += `  <rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}" />\n`;
  });

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">`,
    `  <rect width="${totalSize}" height="${totalSize}" fill="#ffffff" />`,
    rects,
    `</svg>`
  ].join('\n');

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, generateFileName('svg'));
}
