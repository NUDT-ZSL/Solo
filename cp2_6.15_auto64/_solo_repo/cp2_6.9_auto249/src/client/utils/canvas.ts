import type { Point, Stroke, CharacterClip } from '../../types';

export function getCanvasPoint(
  e: React.MouseEvent | React.TouchEvent,
  canvas: HTMLCanvasElement
): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX: number, clientY: number, pressure = 0.5;

  if ('touches' in e) {
    const touch = e.touches[0] || e.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
    if ('force' in touch) pressure = Number((touch as Touch).force) || 0.5;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
    if ('pressure' in e) pressure = Number((e as unknown as PointerEvent).pressure) || 0.5;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
    pressure: Math.max(0.1, Math.min(1, pressure || 0.5)),
    timestamp: Date.now()
  };
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  withInkSpread = true
): void {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.globalAlpha = stroke.opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (withInkSpread) {
    ctx.shadowColor = stroke.color;
    ctx.shadowBlur = 0.5;
  }

  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    const size = stroke.brushSize * p.pressure;
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, size / 2), 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const prevSize = stroke.brushSize * prev.pressure;
      const currSize = stroke.brushSize * curr.pressure;

      ctx.lineWidth = currSize;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();

      if (Math.abs(prevSize - currSize) > 0.5) {
        const steps = Math.ceil(Math.max(Math.abs(curr.x - prev.x), Math.abs(curr.y - prev.y)));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const x = prev.x + (curr.x - prev.x) * t;
          const y = prev.y + (curr.y - prev.y) * t;
          const size = prevSize + (currSize - prevSize) * t;
          ctx.fillStyle = stroke.color;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, size / 2), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
}

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  clear = true
): void {
  if (clear) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }
}

export function drawRubbing(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  opacity: number,
  targetWidth: number,
  targetHeight: number
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (!image) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  const imgRatio = image.width / image.height;
  const canvasRatio = targetWidth / targetHeight;

  let drawWidth = targetWidth;
  let drawHeight = targetHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > canvasRatio) {
    drawHeight = targetWidth / imgRatio;
    offsetY = (targetHeight - drawHeight) / 2;
  } else {
    drawWidth = targetHeight * imgRatio;
    offsetX = (targetWidth - drawWidth) / 2;
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
}

export function drawCharacters(
  ctx: CanvasRenderingContext2D,
  characters: CharacterClip[],
  clear = true
): void {
  if (clear) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  for (const char of characters) {
    const img = new Image();
    img.src = char.imageDataUrl;

    ctx.save();
    ctx.translate(char.x + char.width / 2, char.y + char.height / 2);
    ctx.rotate((char.rotation * Math.PI) / 180);
    ctx.scale(char.scale, char.scale);
    ctx.drawImage(
      img,
      -char.width / 2,
      -char.height / 2,
      char.width,
      char.height
    );
    ctx.restore();
  }
}

export function drawHighlightAreas(
  ctx: CanvasRenderingContext2D,
  areas: { x: number; y: number; radius: number; deviation: number }[]
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const area of areas) {
    if (area.deviation > 15) {
      ctx.save();
      ctx.strokeStyle = 'rgba(192, 57, 43, 0.8)';
      ctx.fillStyle = 'rgba(192, 57, 43, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function exportCanvasToPNG(
  canvases: HTMLCanvasElement[],
  width: number,
  height: number
): string {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d')!;

  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, width, height);

  for (const canvas of canvases) {
    ctx.drawImage(canvas, 0, 0);
  }

  return exportCanvas.toDataURL('image/png');
}

export function cropImageToDataURL(
  image: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/png');
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
