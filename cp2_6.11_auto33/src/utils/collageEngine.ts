import { v4 as uuidv4 } from 'uuid';
import type { Fragment, StyleType, FilterType } from '@/types';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateIrregularPolygon(
  cx: number,
  cy: number,
  avgRadius: number,
  sides: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const radiusVariation = randomInRange(avgRadius * 0.6, avgRadius * 1.4);
    const x = cx + Math.cos(angle) * radiusVariation;
    const y = cy + Math.sin(angle) * radiusVariation;
    points.push({ x, y });
  }
  return points;
}

export function splitImage(
  imgWidth: number,
  imgHeight: number,
  count: number = 14
): Fragment[] {
  const fragments: Fragment[] = [];
  const cols = Math.ceil(Math.sqrt(count * (imgWidth / imgHeight)));
  const rows = Math.ceil(count / cols);
  const cellWidth = imgWidth / cols;
  const cellHeight = imgHeight / rows;
  const scaleX = CANVAS_WIDTH / imgWidth;
  const scaleY = CANVAS_HEIGHT / imgHeight;
  const scale = Math.min(scaleX, scaleY) * 0.85;
  const offsetX = (CANVAS_WIDTH - imgWidth * scale) / 2;
  const offsetY = (CANVAS_HEIGHT - imgHeight * scale) / 2;
  let actualCount = 0;

  for (let row = 0; row < rows && actualCount < count; row++) {
    for (let col = 0; col < cols && actualCount < count; col++) {
      const sourceCx = col * cellWidth + cellWidth / 2 + randomInRange(-cellWidth * 0.2, cellWidth * 0.2);
      const sourceCy = row * cellHeight + cellHeight / 2 + randomInRange(-cellHeight * 0.2, cellHeight * 0.2);
      const avgRadius = Math.min(cellWidth, cellHeight) * randomInRange(0.55, 0.8);
      const sides = Math.floor(randomInRange(5, 9));
      const points = generateIrregularPolygon(0, 0, avgRadius * scale, sides);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const fragWidth = maxX - minX;
      const fragHeight = maxY - minY;
      const canvasX = offsetX + sourceCx * scale + randomInRange(-30, 30);
      const canvasY = offsetY + sourceCy * scale + randomInRange(-30, 30);
      const normalizedPoints = points.map((p) => ({
        x: p.x - minX,
        y: p.y - minY,
      }));

      fragments.push({
        id: uuidv4(),
        x: canvasX - fragWidth / 2,
        y: canvasY - fragHeight / 2,
        scale: 1,
        rotation: randomInRange(-8, 8),
        points: normalizedPoints,
        filter: 'none',
        sourceX: Math.max(0, sourceCx - avgRadius),
        sourceY: Math.max(0, sourceCy - avgRadius),
        sourceWidth: Math.min(imgWidth, avgRadius * 2),
        sourceHeight: Math.min(imgHeight, avgRadius * 2),
        zIndex: actualCount,
      });
      actualCount++;
    }
  }

  return fragments;
}

export function pointsToClipPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));
  return points
    .map((p) => `${(p.x / maxX) * 100}% ${(p.y / maxY) * 100}%`)
    .join(', ');
}

export function getFragmentBounds(fragment: Fragment): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of fragment.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const w = (maxX - minX) * fragment.scale;
  const h = (maxY - minY) * fragment.scale;
  return {
    left: fragment.x,
    top: fragment.y,
    right: fragment.x + w,
    bottom: fragment.y + h,
    width: w,
    height: h,
  };
}

export function checkCollision(a: Fragment, b: Fragment): boolean {
  const ba = getFragmentBounds(a);
  const bb = getFragmentBounds(b);
  const padding = 4;
  return !(
    ba.right < bb.left + padding ||
    ba.left > bb.right - padding ||
    ba.bottom < bb.top + padding ||
    ba.top > bb.bottom - padding
  );
}

function applySketchStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const grayData = new Uint8ClampedArray(w * h);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    grayData[i / 4] = gray;
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx = grayData[idx - 1] - grayData[idx + 1];
      const gy = grayData[idx - w] - grayData[idx + w];
      const edge = Math.sqrt(gx * gx + gy * gy);
      const val = edge > 30 ? 40 : 240;
      const p = idx * 4;
      data[p] = val;
      data[p + 1] = val;
      data[p + 2] = val;
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(74, 63, 53, 0.08)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function applyWatercolorStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.filter = 'blur(1.2px) saturate(1.4) contrast(1.1) brightness(1.08)';
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d')!;
  tctx.drawImage(ctx.canvas, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalAlpha = 0.92;
  ctx.drawImage(tmp, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'overlay';
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
  grad.addColorStop(0, 'rgba(255, 240, 220, 0.3)');
  grad.addColorStop(1, 'rgba(180, 140, 100, 0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function applyPixelStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pixelSize = Math.max(4, Math.floor(Math.min(w, h) / 60));
  const tmp = document.createElement('canvas');
  tmp.width = Math.ceil(w / pixelSize);
  tmp.height = Math.ceil(h / pixelSize);
  const tctx = tmp.getContext('2d')!;
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(ctx.canvas, 0, 0, tmp.width, tmp.height);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tmp, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

function applyCollageStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.filter = 'contrast(1.15) saturate(1.1)';
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d')!;
  tctx.drawImage(ctx.canvas, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = 'none';
  ctx.strokeStyle = 'rgba(74, 63, 53, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.shadowColor = 'transparent';
}

function applyOilStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.filter = 'saturate(1.35) contrast(1.1) brightness(1.05)';
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d')!;
  tctx.drawImage(ctx.canvas, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = 'none';
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const radius = 2;
  const result = new Uint8ClampedArray(data.length);
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const binsR = new Array(32).fill(0);
      const binsG = new Array(32).fill(0);
      const binsB = new Array(32).fill(0);
      const counts = new Array(32).fill(0);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const p = ((y + dy) * w + (x + dx)) * 4;
          const intensity = Math.floor((data[p] + data[p + 1] + data[p + 2]) / 3 / 8);
          binsR[intensity] += data[p];
          binsG[intensity] += data[p + 1];
          binsB[intensity] += data[p + 2];
          counts[intensity]++;
        }
      }
      let maxIdx = 0;
      for (let i = 1; i < 32; i++) {
        if (counts[i] > counts[maxIdx]) maxIdx = i;
      }
      const p = (y * w + x) * 4;
      result[p] = Math.floor(binsR[maxIdx] / counts[maxIdx]);
      result[p + 1] = Math.floor(binsG[maxIdx] / counts[maxIdx]);
      result[p + 2] = Math.floor(binsB[maxIdx] / counts[maxIdx]);
      result[p + 3] = 255;
    }
  }
  for (let i = 0; i < data.length; i++) {
    if (result[i] !== 0 || i % 4 === 3) data[i] = result[i];
  }
  ctx.putImageData(imageData, 0, 0);
}

export function applyStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: StyleType
) {
  switch (style) {
    case 'sketch':
      applySketchStyle(ctx, width, height);
      break;
    case 'watercolor':
      applyWatercolorStyle(ctx, width, height);
      break;
    case 'pixel':
      applyPixelStyle(ctx, width, height);
      break;
    case 'collage':
      applyCollageStyle(ctx, width, height);
      break;
    case 'oil':
      applyOilStyle(ctx, width, height);
      break;
  }
}

export function applyFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filter: FilterType
) {
  if (filter === 'none') return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    switch (filter) {
      case 'vintage':
        r = r * 0.9 + 40;
        g = g * 0.85 + 25;
        b = b * 0.65;
        break;
      case 'faded':
        r = r * 0.85 + 30;
        g = g * 0.85 + 30;
        b = b * 0.85 + 35;
        break;
      case 'warm':
        r = Math.min(255, r * 1.15 + 15);
        g = Math.min(255, g * 1.05 + 5);
        b = b * 0.85;
        break;
      case 'cool':
        r = r * 0.85;
        g = g * 0.95;
        b = Math.min(255, b * 1.15 + 15);
        break;
      case 'mono': {
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        r = gray; g = gray; b = gray;
        break;
      }
      case 'pencil': {
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        r = gray * 0.95 + 20;
        g = gray * 0.95 + 20;
        b = gray * 0.9 + 15;
        break;
      }
    }
    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }
  ctx.putImageData(imageData, 0, 0);
}

export function renderFragmentToCanvas(
  ctx: CanvasRenderingContext2D,
  fragment: Fragment,
  sourceImage: HTMLImageElement,
  style: StyleType
) {
  const maxX = Math.max(...fragment.points.map((p) => p.x));
  const maxY = Math.max(...fragment.points.map((p) => p.y));
  const fragCanvas = document.createElement('canvas');
  fragCanvas.width = Math.ceil(maxX);
  fragCanvas.height = Math.ceil(maxY);
  const fctx = fragCanvas.getContext('2d')!;
  fctx.save();
  fctx.beginPath();
  if (fragment.points.length > 0) {
    fctx.moveTo(fragment.points[0].x, fragment.points[0].y);
    for (let i = 1; i < fragment.points.length; i++) {
      fctx.lineTo(fragment.points[i].x, fragment.points[i].y);
    }
    fctx.closePath();
  }
  fctx.clip();
  fctx.drawImage(
    sourceImage,
    fragment.sourceX,
    fragment.sourceY,
    fragment.sourceWidth,
    fragment.sourceHeight,
    0,
    0,
    fragCanvas.width,
    fragCanvas.height
  );
  fctx.restore();
  applyStyle(fctx, fragCanvas.width, fragCanvas.height, style);
  applyFilter(fctx, fragCanvas.width, fragCanvas.height, fragment.filter);
  ctx.save();
  const centerX = fragment.x + (maxX * fragment.scale) / 2;
  const centerY = fragment.y + (maxY * fragment.scale) / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate((fragment.rotation * Math.PI) / 180);
  ctx.scale(fragment.scale, fragment.scale);
  ctx.drawImage(fragCanvas, -maxX / 2, -maxY / 2);
  if (fragment.textOverlay && fragment.textOverlay.content) {
    ctx.font = `${fragment.textOverlay.fontSize}px ${fragment.textOverlay.fontFamily === 'serif' ? "'Playfair Display', serif" : "'Inter', sans-serif"}`;
    ctx.fillStyle = 'rgba(74, 63, 53, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = fragment.textOverlay.content.split('\n');
    const lineHeight = fragment.textOverlay.fontSize * 1.2;
    const startY = -((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, 0, startY + idx * lineHeight);
    });
  }
  ctx.restore();
}

export function renderCollageToImage(
  fragments: Fragment[],
  sourceImage: HTMLImageElement,
  style: StyleType,
  targetWidth: number = 1920,
  targetHeight: number = 1080
): string {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
  grad.addColorStop(0, '#F5F0E8');
  grad.addColorStop(1, '#E8DDD0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  const scaleX = targetWidth / CANVAS_WIDTH;
  const scaleY = targetHeight / CANVAS_HEIGHT;
  const sorted = [...fragments].sort((a, b) => a.zIndex - b.zIndex);
  for (const frag of sorted) {
    const scaled: Fragment = {
      ...frag,
      x: frag.x * scaleX,
      y: frag.y * scaleY,
      scale: frag.scale * Math.min(scaleX, scaleY),
      points: frag.points.map((p) => ({ x: p.x * Math.min(scaleX, scaleY), y: p.y * Math.min(scaleX, scaleY) })),
      textOverlay: frag.textOverlay
        ? {
            ...frag.textOverlay,
            fontSize: frag.textOverlay.fontSize * Math.min(scaleX, scaleY),
          }
        : undefined,
    };
    renderFragmentToCanvas(ctx, scaled, sourceImage, style);
  }
  return canvas.toDataURL('image/png');
}
