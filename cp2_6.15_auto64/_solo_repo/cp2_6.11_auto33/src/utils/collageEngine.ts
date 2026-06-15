import { v4 as uuidv4 } from 'uuid';
import type { Fragment, StyleType, FilterType } from '@/types';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateIrregularPolygon(
  centerX: number,
  centerY: number,
  avgRadius: number,
  sides: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const jitter = randomInRange(0, Math.PI * 2 / sides * 0.3);
    const radiusVariation = randomInRange(avgRadius * 0.55, avgRadius * 1.45);
    const x = centerX + Math.cos(angle + jitter) * radiusVariation;
    const y = centerY + Math.sin(angle + jitter) * radiusVariation;
    points.push({ x, y });
  }
  return points;
}

export function splitImage(
  imageWidth: number,
  imageHeight: number,
  fragmentCount?: number
): Fragment[] {
  const count = fragmentCount ?? Math.floor(Math.random() * 5) + 12;
  const fragments: Fragment[] = [];

  const scaleX = CANVAS_WIDTH / imageWidth;
  const scaleY = CANVAS_HEIGHT / imageHeight;
  const scale = Math.min(scaleX, scaleY) * 0.85;
  const offsetX = (CANVAS_WIDTH - imageWidth * scale) / 2;
  const offsetY = (CANVAS_HEIGHT - imageHeight * scale) / 2;

  const gridCols = Math.ceil(Math.sqrt(count * (imageWidth / imageHeight)));
  const gridRows = Math.ceil(count / gridCols);
  const cellWidth = imageWidth / gridCols;
  const cellHeight = imageHeight / gridRows;

  let generatedCount = 0;

  for (let row = 0; row < gridRows && generatedCount < count; row++) {
    for (let col = 0; col < gridCols && generatedCount < count; col++) {
      const jitterX = randomInRange(-cellWidth * 0.25, cellWidth * 0.25);
      const jitterY = randomInRange(-cellHeight * 0.25, cellHeight * 0.25);
      const sourceCenterX = col * cellWidth + cellWidth / 2 + jitterX;
      const sourceCenterY = row * cellHeight + cellHeight / 2 + jitterY;

      const baseRadius = Math.min(cellWidth, cellHeight) * randomInRange(0.5, 0.85);
      const polygonSides = Math.floor(randomInRange(5, 9));

      const rawPoints = generateIrregularPolygon(0, 0, baseRadius * scale, polygonSides);

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of rawPoints) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const fragWidth = maxX - minX;
      const fragHeight = maxY - minY;

      const normalizedPoints = rawPoints.map((p) => ({
        x: p.x - minX,
        y: p.y - minY,
      }));

      const canvasX = offsetX + sourceCenterX * scale - fragWidth / 2 + randomInRange(-25, 25);
      const canvasY = offsetY + sourceCenterY * scale - fragHeight / 2 + randomInRange(-25, 25);

      const sourceRadius = baseRadius;
      const sourceX = Math.max(0, sourceCenterX - sourceRadius);
      const sourceY = Math.max(0, sourceCenterY - sourceRadius);
      const sourceWidth = Math.min(imageWidth - sourceX, sourceRadius * 2);
      const sourceHeight = Math.min(imageHeight - sourceY, sourceRadius * 2);

      fragments.push({
        id: uuidv4(),
        x: Math.max(0, Math.min(CANVAS_WIDTH - fragWidth, canvasX)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT - fragHeight, canvasY)),
        scale: 1,
        rotation: randomInRange(-12, 12),
        points: normalizedPoints,
        filter: 'none',
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        zIndex: generatedCount,
      });

      generatedCount++;
    }
  }

  return fragments;
}

export function pointsToClipPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));
  if (maxX === 0 || maxY === 0) return '';
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

export function checkCollision(a: Fragment, b: Fragment, threshold: number = 5): boolean {
  const ba = getFragmentBounds(a);
  const bb = getFragmentBounds(b);
  return !(
    ba.right < bb.left - threshold ||
    ba.left > bb.right + threshold ||
    ba.bottom < bb.top - threshold ||
    ba.top > bb.bottom + threshold
  );
}

function applySketchStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const grayData = new Uint8ClampedArray(w * h);

  for (let i = 0; i < data.length; i += 4) {
    grayData[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx = grayData[idx - 1] - grayData[idx + 1];
      const gy = grayData[idx - w] - grayData[idx + w];
      const edge = Math.sqrt(gx * gx + gy * gy);
      const val = edge > 25 ? 30 : 250;
      const p = idx * 4;
      data[p] = val;
      data[p + 1] = val;
      data[p + 2] = val;
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyWatercolorStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d')!;

  tctx.filter = 'blur(1.5px) saturate(1.4) contrast(1.08) brightness(1.08)';
  tctx.drawImage(ctx.canvas, 0, 0);
  tctx.filter = 'none';

  ctx.clearRect(0, 0, w, h);
  ctx.globalAlpha = 0.95;
  ctx.drawImage(tmp, 0, 0);
  ctx.globalAlpha = 1;

  ctx.globalCompositeOperation = 'overlay';
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
  grad.addColorStop(0, 'rgba(255, 240, 220, 0.35)');
  grad.addColorStop(1, 'rgba(180, 140, 100, 0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function applyPixelStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const pixelSize = Math.max(4, Math.floor(Math.min(w, h) / 50));
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
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d')!;

  tctx.filter = 'contrast(1.15) saturate(1.1)';
  tctx.drawImage(ctx.canvas, 0, 0);
  tctx.filter = 'none';

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tmp, 0, 0);

  ctx.strokeStyle = 'rgba(74, 63, 53, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.shadowColor = 'transparent';
}

function applyOilStyle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const radius = 2;
  const intensityBins = 32;
  const result = new Uint8ClampedArray(data.length);

  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const binsR = new Array(intensityBins).fill(0);
      const binsG = new Array(intensityBins).fill(0);
      const binsB = new Array(intensityBins).fill(0);
      const counts = new Array(intensityBins).fill(0);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const p = ((y + dy) * w + (x + dx)) * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const intensity = Math.floor((r + g + b) / 3 / (256 / intensityBins));
          binsR[intensity] += r;
          binsG[intensity] += g;
          binsB[intensity] += b;
          counts[intensity]++;
        }
      }

      let maxIdx = 0;
      for (let i = 1; i < intensityBins; i++) {
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
    data[i] = result[i] || data[i];
  }
  ctx.putImageData(imageData, 0, 0);
}

export function applyStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: StyleType
): void {
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
): void {
  if (filter === 'none') return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    switch (filter) {
      case 'vintage':
        r = r * 0.9 + 35;
        g = g * 0.82 + 20;
        b = b * 0.6;
        break;
      case 'faded':
        r = r * 0.85 + 28;
        g = g * 0.85 + 28;
        b = b * 0.82 + 32;
        break;
      case 'warm':
        r = Math.min(255, r * 1.18 + 12);
        g = Math.min(255, g * 1.06 + 5);
        b = b * 0.82;
        break;
      case 'cool':
        r = r * 0.82;
        g = g * 0.94;
        b = Math.min(255, b * 1.18 + 12);
        break;
      case 'mono': {
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        r = gray;
        g = gray;
        b = gray;
        break;
      }
      case 'pencil': {
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        r = gray * 0.94 + 18;
        g = gray * 0.94 + 18;
        b = gray * 0.88 + 14;
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
): void {
  const maxX = Math.max(...fragment.points.map((p) => p.x));
  const maxY = Math.max(...fragment.points.map((p) => p.y));

  const fragCanvas = document.createElement('canvas');
  fragCanvas.width = Math.max(1, Math.ceil(maxX));
  fragCanvas.height = Math.max(1, Math.ceil(maxY));
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

  if (
    fragment.sourceWidth > 0 &&
    fragment.sourceHeight > 0 &&
    fragCanvas.width > 0 &&
    fragCanvas.height > 0
  ) {
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
  }
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

  if (fragment.textOverlay && fragment.textOverlay.content.trim()) {
    const fontFamily =
      fragment.textOverlay.fontFamily === 'serif'
        ? "'Playfair Display', 'Noto Serif SC', serif"
        : "'Inter', sans-serif";
    ctx.font = `${fragment.textOverlay.fontSize}px ${fontFamily}`;
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
  const renderScale = Math.min(scaleX, scaleY);

  const sortedFragments = [...fragments].sort((a, b) => a.zIndex - b.zIndex);

  for (const frag of sortedFragments) {
    const scaledFragment: Fragment = {
      ...frag,
      x: frag.x * scaleX,
      y: frag.y * scaleY,
      scale: frag.scale * renderScale,
      points: frag.points.map((p) => ({
        x: p.x * renderScale,
        y: p.y * renderScale,
      })),
      textOverlay: frag.textOverlay
        ? {
            ...frag.textOverlay,
            fontSize: Math.round(frag.textOverlay.fontSize * renderScale),
          }
        : undefined,
    };
    renderFragmentToCanvas(ctx, scaledFragment, sourceImage, style);
  }

  return canvas.toDataURL('image/png');
}
