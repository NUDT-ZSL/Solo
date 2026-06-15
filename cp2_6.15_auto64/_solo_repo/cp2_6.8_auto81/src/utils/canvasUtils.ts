import type { Annotation } from '@/types';

export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  pageWidth: number,
  pageHeight: number,
  isSelected: boolean = false,
  diffColor?: string | null
) {
  const x = annotation.x * pageWidth;
  const y = annotation.y * pageHeight;
  const w = annotation.width * pageWidth;
  const h = annotation.height * pageHeight;

  ctx.save();

  if (annotation.type === 'highlight') {
    ctx.fillStyle = diffColor || 'rgba(255, 215, 0, 0.4)';
    ctx.fillRect(x, y, w, h);
  } else if (annotation.type === 'textbox') {
    ctx.fillStyle = diffColor || '#FFFACD';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = diffColor ? (diffColor.includes('red') ? '#EF4444' : '#3B82F6') : '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    if (annotation.text) {
      ctx.fillStyle = '#000000';
      const fontSize = Math.max(12, Math.min(18, h * 0.4));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const padding = 4;
      const words = annotation.text.split('');
      let line = '';
      let lineY = y + padding;
      const maxWidth = w - padding * 2;
      for (const char of words) {
        const testLine = line + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, x + padding, lineY);
          line = char;
          lineY += fontSize + 2;
          if (lineY + fontSize > y + h - padding) break;
        } else {
          line = testLine;
        }
      }
      if (line && lineY + fontSize <= y + h) {
        ctx.fillText(line, x + padding, lineY);
      }
    }
  }

  if (isSelected) {
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

export function isPointInAnnotation(
  px: number,
  py: number,
  annotation: Annotation,
  pageWidth: number,
  pageHeight: number
): boolean {
  const x = annotation.x * pageWidth;
  const y = annotation.y * pageHeight;
  const w = annotation.width * pageWidth;
  const h = annotation.height * pageHeight;
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

export function getRelativeCoords(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  pageWidth: number,
  pageHeight: number,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const displayW = pageWidth * scale;
  const displayH = pageHeight * scale;
  const canvasX = clientX - canvasRect.left - offsetX;
  const canvasY = clientY - canvasRect.top - offsetY;
  const relX = Math.max(0, Math.min(1, canvasX / displayW));
  const relY = Math.max(0, Math.min(1, canvasY / displayH));
  return { relX, relY, canvasX, canvasY, displayW, displayH };
}

export function exportPageToPNG(
  pageCanvas: HTMLCanvasElement,
  annotations: Annotation[],
  pageNumber: number
): string {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = pageCanvas.width;
  exportCanvas.height = pageCanvas.height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(pageCanvas, 0, 0);

  for (const ann of annotations) {
    if (ann.pageNumber === pageNumber) {
      drawAnnotation(ctx, ann, pageCanvas.width, pageCanvas.height);
    }
  }

  return exportCanvas.toDataURL('image/png');
}
