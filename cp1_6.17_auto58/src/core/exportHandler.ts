import type { SavedBoard } from '../types';

export interface ExportData {
  id: string;
  name: string;
  tags: string[];
  elements: Array<{
    elementId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    zIndex: number;
  }>;
  exportedAt: string;
  version: string;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToJSON(
  board: Omit<SavedBoard, 'createdAt' | 'thumbnail'> & { name: string; tags: string[] }
): void {
  const exportData: ExportData = {
    id: board.id,
    name: board.name,
    tags: board.tags,
    elements: board.elements.map((el) => ({
      elementId: el.elementId,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      scale: el.scale,
      zIndex: el.zIndex,
    })),
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, `${board.name || 'mood-board'}.json`);
}

export async function exportToPNG(
  canvas: HTMLCanvasElement,
  primaryColor: string,
  boardName: string
): Promise<void> {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 1200;
  exportCanvas.height = 800;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) throw new Error('无法获取画布上下文');

  ctx.fillStyle = primaryColor || '#FFFFFF';
  ctx.fillRect(0, 0, 1200, 800);

  const scaleX = 1200 / canvas.width;
  const scaleY = 800 / canvas.height;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (1200 - canvas.width * scale) / 2;
  const offsetY = (800 - canvas.height * scale) / 2;

  ctx.drawImage(canvas, offsetX, offsetY, canvas.width * scale, canvas.height * scale);

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(600, 400);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText('审美积木', 0, 0);
  ctx.restore();

  return new Promise((resolve, reject) => {
    exportCanvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${boardName || 'mood-board'}.png`);
        resolve();
      } else {
        reject(new Error('导出PNG失败'));
      }
    }, 'image/png');
  });
}

export function generateThumbnail(canvas: HTMLCanvasElement, size: number = 80): string {
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = size;
  thumbCanvas.height = size;
  const ctx = thumbCanvas.getContext('2d');
  if (!ctx) return '';

  const scale = Math.max(size / canvas.width, size / canvas.height);
  const sw = size / scale;
  const sh = size / scale;
  const sx = (canvas.width - sw) / 2;
  const sy = (canvas.height - sh) / 2;

  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, size, size);

  return thumbCanvas.toDataURL('image/png');
}
