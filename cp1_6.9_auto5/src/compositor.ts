import type { LayerData } from './types';
import { BLEND_MODE_MAP, CANVAS_WIDTH, CANVAS_HEIGHT } from './types';
import { computeLayerOffset } from './animator';

interface OffscreenCache {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

const offscreenPool: Map<string, OffscreenCache> = new Map();

const getOrCreateOffscreen = (id: string, w: number, h: number): OffscreenCache => {
  let cache = offscreenPool.get(id);
  if (!cache) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    cache = { canvas, ctx };
    offscreenPool.set(id, cache);
  }
  if (cache.canvas.width !== w || cache.canvas.height !== h) {
    cache.canvas.width = w;
    cache.canvas.height = h;
  }
  return cache;
};

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

interface RenderOptions {
  selectedId: string | null;
  showHandles?: boolean;
  hoveredHandle?: HandleType | null;
}

export type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 'rotate' | 'move';

export const renderLayerToCanvas = (
  mainCtx: CanvasRenderingContext2D,
  layers: LayerData[],
  runtimeImages: Map<string, HTMLImageElement>,
  timeSeconds: number,
  options: RenderOptions = { selectedId: null, showHandles: true, hoveredHandle: null }
): void => {
  const { canvas: mainCanvas } = mainCtx;
  mainCtx.fillStyle = '#1e1e1e';
  mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

  for (const layer of layers) {
    const img = runtimeImages.get(layer.id);
    if (!img || !img.complete || img.naturalWidth === 0) continue;

    const offset = computeLayerOffset(layer.animation, layer.id, timeSeconds);

    const off = getOrCreateOffscreen(layer.id, mainCanvas.width, mainCanvas.height);
    const octx = off.ctx;
    octx.clearRect(0, 0, off.canvas.width, off.canvas.height);
    octx.save();

    const cx = layer.transform.x + offset.dx;
    const cy = layer.transform.y + offset.dy;
    octx.translate(cx, cy);
    octx.rotate(degToRad(layer.transform.rotation));
    octx.scale(layer.transform.scale, layer.transform.scale);

    const dw = layer.width;
    const dh = layer.height;
    octx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    octx.restore();

    mainCtx.save();
    mainCtx.globalAlpha = layer.opacity;
    mainCtx.globalCompositeOperation = BLEND_MODE_MAP[layer.blendMode];
    mainCtx.drawImage(off.canvas, 0, 0);
    mainCtx.restore();
  }

  if (options.selectedId && options.showHandles) {
    const selLayer = layers.find((l) => l.id === options.selectedId);
    if (selLayer) {
      const img = runtimeImages.get(selLayer.id);
      if (img && img.complete && img.naturalWidth > 0) {
        drawSelectionHandles(mainCtx, selLayer, timeSeconds, options.hoveredHandle ?? null);
      }
    }
  }
};

const drawSelectionHandles = (
  ctx: CanvasRenderingContext2D,
  layer: LayerData,
  timeSeconds: number,
  hoveredHandle: HandleType | null
): void => {
  const offset = computeLayerOffset(layer.animation, layer.id, timeSeconds);
  const cx = layer.transform.x + offset.dx;
  const cy = layer.transform.y + offset.dy;
  const rad = degToRad(layer.transform.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = (layer.width * layer.transform.scale) / 2;
  const hh = (layer.height * layer.transform.scale) / 2;

  const corners = [
    { name: 'tl' as HandleType, x: -hw, y: -hh },
    { name: 'tr' as HandleType, x: hw, y: -hh },
    { name: 'br' as HandleType, x: hw, y: hh },
    { name: 'bl' as HandleType, x: -hw, y: hh },
  ];

  const transformedCorners = corners.map((c) => ({
    name: c.name,
    x: cx + c.x * cos - c.y * sin,
    y: cy + c.x * sin + c.y * cos,
  }));

  ctx.save();
  const flash = 0.6 + 0.4 * Math.sin(timeSeconds * Math.PI * 2);
  ctx.strokeStyle = `rgba(74, 144, 217, ${flash})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -timeSeconds * 30;
  ctx.beginPath();
  ctx.moveTo(transformedCorners[0].x, transformedCorners[0].y);
  for (let i = 1; i < transformedCorners.length; i++) {
    ctx.lineTo(transformedCorners[i].x, transformedCorners[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  for (const c of transformedCorners) {
    const isHover = hoveredHandle === c.name;
    ctx.fillStyle = isHover ? '#357abd' : '#4a90d9';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const s = isHover ? 10 : 8;
    ctx.fillRect(c.x - s / 2, c.y - s / 2, s, s);
    ctx.strokeRect(c.x - s / 2, c.y - s / 2, s, s);
  }

  const topMid = {
    x: cx + 0 * cos - (-hh - 30) * sin,
    y: cy + 0 * sin + (-hh - 30) * cos,
  };
  const edgeTop = {
    x: cx + 0 * cos - (-hh) * sin,
    y: cy + 0 * sin + (-hh) * cos,
  };
  const isRotHover = hoveredHandle === 'rotate';

  ctx.save();
  ctx.strokeStyle = '#4a90d9';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(edgeTop.x, edgeTop.y);
  ctx.lineTo(topMid.x, topMid.y);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = isRotHover ? '#357abd' : '#4a90d9';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(topMid.x, topMid.y, isRotHover ? 10 : 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(topMid.x, topMid.y, 4, -Math.PI * 0.2, Math.PI * 1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(topMid.x + 4, topMid.y - 4);
  ctx.lineTo(topMid.x + 7, topMid.y - 1);
  ctx.lineTo(topMid.x + 2, topMid.y - 1);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
};

export type HitResult =
  | { type: 'handle'; handle: HandleType; layerId: string }
  | { type: 'layer'; layerId: string }
  | null;

export const hitTest = (
  layers: LayerData[],
  runtimeImages: Map<string, HTMLImageElement>,
  timeSeconds: number,
  px: number,
  py: number
): HitResult => {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const img = runtimeImages.get(layer.id);
    if (!img || !img.complete) continue;

    const offset = computeLayerOffset(layer.animation, layer.id, timeSeconds);
    const cx = layer.transform.x + offset.dx;
    const cy = layer.transform.y + offset.dy;
    const rad = degToRad(layer.transform.rotation);
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const hw = (layer.width * layer.transform.scale) / 2;
    const hh = (layer.height * layer.transform.scale) / 2;

    const corners = [
      { name: 'tl' as HandleType, x: -hw, y: -hh },
      { name: 'tr' as HandleType, x: hw, y: -hh },
      { name: 'br' as HandleType, x: hw, y: hh },
      { name: 'bl' as HandleType, x: -hw, y: hh },
    ];

    for (const c of corners) {
      const tx = cx + c.x * Math.cos(rad) - c.y * Math.sin(rad);
      const ty = cy + c.x * Math.sin(rad) + c.y * Math.cos(rad);
      if (Math.abs(px - tx) <= 10 && Math.abs(py - ty) <= 10) {
        return { type: 'handle', handle: c.name, layerId: layer.id };
      }
    }

    const topMidX = cx + 0 * Math.cos(rad) - (-hh - 30) * Math.sin(rad);
    const topMidY = cy + 0 * Math.sin(rad) + (-hh - 30) * Math.cos(rad);
    if (Math.sqrt((px - topMidX) ** 2 + (py - topMidY) ** 2) <= 12) {
      return { type: 'handle', handle: 'rotate', layerId: layer.id };
    }

    const localX = (px - cx) * cos - (py - cy) * sin;
    const localY = (px - cx) * sin + (py - cy) * cos;
    if (localX >= -hw && localX <= hw && localY >= -hh && localY <= hh) {
      return { type: 'layer', layerId: layer.id };
    }
  }
  return null;
};

export const exportToPNG = (
  layers: LayerData[],
  runtimeImages: Map<string, HTMLImageElement>
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const layer of layers) {
    const img = runtimeImages.get(layer.id);
    if (!img || !img.complete) continue;

    const off = getOrCreateOffscreen(`export-${layer.id}`, CANVAS_WIDTH, CANVAS_HEIGHT);
    const octx = off.ctx;
    octx.clearRect(0, 0, off.canvas.width, off.canvas.height);
    octx.save();

    const scaleX = CANVAS_WIDTH / 1000;
    const scaleY = CANVAS_HEIGHT / 562;
    const avgScale = (scaleX + scaleY) / 2;
    const cx = layer.transform.x * scaleX;
    const cy = layer.transform.y * scaleY;

    octx.translate(cx, cy);
    octx.rotate(degToRad(layer.transform.rotation));
    octx.scale(layer.transform.scale * avgScale, layer.transform.scale * avgScale);

    octx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    octx.restore();

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = BLEND_MODE_MAP[layer.blendMode];
    ctx.drawImage(off.canvas, 0, 0);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
};
