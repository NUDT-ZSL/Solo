import type {
  TextureParams,
  TextureLayer,
  TextureType,
  GradientConfig,
  BlendMode
} from './types';
import { CANVAS_BLEND_MODES } from './types';

interface LayerCache {
  key: string;
  canvas: HTMLCanvasElement;
}

class TextureSynthesizer {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private layerCache: Map<string, LayerCache> = new Map();
  private maxCacheSize: number = 20;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    const ctx = this.offscreenCanvas.getContext('2d');
    if (!ctx) throw new Error('无法创建Canvas 2D上下文');
    this.offscreenCtx = ctx;
  }

  private getLayerCacheKey(layer: TextureLayer, size: number): string {
    return `${layer.type}-${layer.color}-${layer.intensity}-${layer.scale}-${layer.angle}-${size}`;
  }

  private cleanupCache(): void {
    while (this.layerCache.size > this.maxCacheSize) {
      const firstKey = this.layerCache.keys().next().value;
      if (firstKey) this.layerCache.delete(firstKey);
    }
  }

  private ensureCanvasSize(size: number): void {
    if (this.offscreenCanvas.width !== size || this.offscreenCanvas.height !== size) {
      this.offscreenCanvas.width = size;
      this.offscreenCanvas.height = size;
    }
  }

  private hexToRgba(hex: string, alpha: number = 1): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private applyBlendMode(ctx: CanvasRenderingContext2D, mode: BlendMode): void {
    ctx.globalCompositeOperation = CANVAS_BLEND_MODES[mode];
  }

  private drawNoise(size: number, layer: TextureLayer): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const intensity = layer.intensity / 100;
    const scale = Math.max(1, Math.floor(size / (layer.scale * 8)));
    const r = parseInt(layer.color.slice(1, 3), 16);
    const g = parseInt(layer.color.slice(3, 5), 16);
    const b = parseInt(layer.color.slice(5, 7), 16);

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const noise = Math.random();
        const sampledX = Math.floor(x / scale) * scale;
        const sampledY = Math.floor(y / scale) * scale;
        const seed = (sampledX * 7919 + sampledY * 6271) % 10000 / 10000;
        const value = (noise * 0.5 + seed * 0.5) * intensity;

        data[i] = Math.floor(r * value);
        data[i + 1] = Math.floor(g * value);
        data[i + 2] = Math.floor(b * value);
        data[i + 3] = Math.floor(255 * Math.min(1, value * 1.5));
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private drawStripes(size: number, layer: TextureLayer): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const stripeWidth = Math.max(2, size / (layer.scale * 4));
    const intensity = layer.intensity / 100;
    const gapRatio = 0.5 + (100 - layer.intensity) / 200;
    const angleRad = (layer.angle * Math.PI) / 180;

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(angleRad);
    ctx.translate(-size / 2, -size / 2);

    ctx.fillStyle = this.hexToRgba(layer.color, intensity);
    for (let x = -size; x < size * 2; x += stripeWidth) {
      ctx.fillRect(x, -size, stripeWidth * (1 - gapRatio), size * 3);
    }

    ctx.restore();
    return canvas;
  }

  private drawWaves(size: number, layer: TextureLayer): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const intensity = layer.intensity / 100;
    const frequency = layer.scale * 0.01;
    const amplitude = size / (15 + (100 - layer.intensity) / 10);
    const lineWidth = Math.max(1, size / (layer.scale * 12));
    const angleRad = (layer.angle * Math.PI) / 180;

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(angleRad);
    ctx.translate(-size / 2, -size / 2);

    ctx.strokeStyle = this.hexToRgba(layer.color, intensity);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    for (let y = -size * 0.5; y < size * 1.5; y += lineWidth * 2.5) {
      ctx.beginPath();
      for (let x = 0; x <= size; x += 4) {
        const waveY = y + Math.sin((x + y) * frequency) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      ctx.stroke();
    }

    ctx.restore();
    return canvas;
  }

  private drawGrid(size: number, layer: TextureLayer): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const gridSize = Math.max(8, size / (layer.scale * 1.5));
    const lineWidth = Math.max(1, size / (layer.scale * 20)) * (layer.intensity / 100);
    const intensity = layer.intensity / 100;
    const angleRad = (layer.angle * Math.PI) / 180;

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(angleRad);
    ctx.translate(-size / 2, -size / 2);

    ctx.strokeStyle = this.hexToRgba(layer.color, intensity);
    ctx.lineWidth = lineWidth;

    for (let x = -size; x < size * 2; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -size);
      ctx.lineTo(x, size * 2);
      ctx.stroke();
    }

    for (let y = -size; y < size * 2; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-size, y);
      ctx.lineTo(size * 2, y);
      ctx.stroke();
    }

    ctx.fillStyle = this.hexToRgba(layer.color, intensity * 0.4);
    for (let x = -size; x < size * 2; x += gridSize) {
      for (let y = -size; y < size * 2; y += gridSize) {
        const dotSize = lineWidth * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
    return canvas;
  }

  private drawTextureLayer(type: TextureType, size: number, layer: TextureLayer): HTMLCanvasElement {
    switch (type) {
      case 'noise': return this.drawNoise(size, layer);
      case 'stripes': return this.drawStripes(size, layer);
      case 'waves': return this.drawWaves(size, layer);
      case 'grid': return this.drawGrid(size, layer);
    }
  }

  private getOrCreateLayer(layer: TextureLayer, size: number): HTMLCanvasElement {
    const key = this.getLayerCacheKey(layer, size);
    const cached = this.layerCache.get(key);
    if (cached) return cached.canvas;

    const canvas = this.drawTextureLayer(layer.type, size, layer);
    this.layerCache.set(key, { key, canvas });
    this.cleanupCache();
    return canvas;
  }

  private drawGradient(size: number, config: GradientConfig): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx || !config.enabled || config.stops.length < 2) return canvas;

    ctx.globalAlpha = config.opacity / 100;

    let gradient: CanvasGradient;
    if (config.type === 'linear') {
      const angleRad = (config.angle * Math.PI) / 180;
      const cx = size / 2;
      const cy = size / 2;
      const length = size;
      const x1 = cx + Math.cos(angleRad) * length;
      const y1 = cy + Math.sin(angleRad) * length;
      const x2 = cx - Math.cos(angleRad) * length;
      const y2 = cy - Math.sin(angleRad) * length;
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    } else {
      gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.707);
    }

    const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
    sortedStops.forEach(stop => {
      gradient.addColorStop(Math.max(0, Math.min(1, stop.position / 100)), stop.color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return canvas;
  }

  synthesize(params: TextureParams, size: number = 512): HTMLCanvasElement {
    this.ensureCanvasSize(size);
    const ctx = this.offscreenCtx;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = params.backgroundColor;
    ctx.fillRect(0, 0, size, size);

    const sortedLayers = [...params.layers];

    for (const layer of sortedLayers) {
      if (layer.intensity <= 0) continue;

      const layerCanvas = this.getOrCreateLayer(layer, size);

      this.applyBlendMode(ctx, 'overlay');
      ctx.globalAlpha = Math.min(1, layer.intensity / 80);
      ctx.drawImage(layerCanvas, 0, 0);
    }

    if (params.gradient.enabled && params.gradient.stops.length >= 2) {
      const gradientCanvas = this.drawGradient(size, params.gradient);
      this.applyBlendMode(ctx, params.gradient.blendMode);
      ctx.globalAlpha = 1;
      ctx.drawImage(gradientCanvas, 0, 0);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    const result = document.createElement('canvas');
    result.width = size;
    result.height = size;
    const resultCtx = result.getContext('2d');
    if (resultCtx) {
      resultCtx.drawImage(this.offscreenCanvas, 0, 0);
    }

    return result;
  }

  synthesizeToImageData(params: TextureParams, size: number = 512): ImageData {
    const canvas = this.synthesize(params, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    return ctx.getImageData(0, 0, size, size);
  }

  clearCache(): void {
    this.layerCache.clear();
  }
}

export const textureSynthesizer = new TextureSynthesizer();
export default TextureSynthesizer;
