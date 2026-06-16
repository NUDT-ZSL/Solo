import type { Region } from './types';
import { hexToRgb, lerpColor } from './colorUtils';

const ANIMATION_DURATION = 300;

interface AnimationState {
  animating: boolean;
  startTime: number;
  fromColors: Map<number, string>;
  toColors: Map<number, string>;
  targetRegionIds: Set<number>;
}

export class ColorFiller {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private baseImageData: ImageData | null = null;
  private lineMask: Uint8Array | null = null;
  private width = 0;
  private height = 0;
  private regions: Region[] = [];
  private animationState: AnimationState | null = null;
  private animationFrameId: number | null = null;
  private onAnimationComplete?: () => void;
  private onColorChange?: (regions: Region[]) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
  }

  setOnAnimationComplete(callback: () => void) {
    this.onAnimationComplete = callback;
  }

  setOnColorChange(callback: (regions: Region[]) => void) {
    this.onColorChange = callback;
  }

  initialize(
    imageData: ImageData,
    regions: Region[],
    width: number,
    height: number,
  ): void {
    this.regions = regions;
    this.width = width;
    this.height = height;
    this.baseImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      width,
      height,
    );

    this.lineMask = new Uint8Array(width * height);
    const data = imageData.data;
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const luminance =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      this.lineMask[i] = luminance < 128 ? 1 : 0;
    }

    this.renderAllRegions();
  }

  getRegions(): Region[] {
    return this.regions;
  }

  private renderAllRegions(): void {
    if (!this.baseImageData) return;

    const data = new Uint8ClampedArray(this.baseImageData.data);

    for (const region of this.regions) {
      const { r, g, b } = hexToRgb(region.color);
      for (const p of region.pixels) {
        const idx = (p.y * this.width + p.x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    const imgData = new ImageData(data, this.width, this.height);
    this.ctx.putImageData(imgData, 0, 0);
  }

  private renderRegionsWithColors(colors: Map<number, string>): void {
    if (!this.baseImageData) return;

    const data = new Uint8ClampedArray(this.baseImageData.data);

    for (const region of this.regions) {
      const color = colors.get(region.id) || region.color;
      const { r, g, b } = hexToRgb(color);
      for (const p of region.pixels) {
        const idx = (p.y * this.width + p.x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    const imgData = new ImageData(data, this.width, this.height);
    this.ctx.putImageData(imgData, 0, 0);
  }

  fillRegion(regionId: number, color: string, animate = true): void {
  const region = this.regions.find((r) => r.id === regionId);
  if (!region) return;

  if (!animate) {
    region.color = color;
    this.renderAllRegions();
    this.onColorChange?.(this.regions);
    return;
  }

  this.startAnimation(new Map([[regionId, region.color]]), new Map([[regionId, color]]), new Set([regionId]));
  region.color = color;
}

fillMultipleRegions(colors: Map<number, string>, animate = true): void {
  const fromColors = new Map<number, string>();
  const toColors = new Map<number, string>();
  const targetIds = new Set<number>();

  for (const [regionId, color] of colors) {
    const region = this.regions.find((r) => r.id === regionId);
    if (region) {
      fromColors.set(regionId, region.color);
      toColors.set(regionId, color);
      targetIds.add(regionId);
      region.color = color;
    }
  }

  if (!animate) {
    this.renderAllRegions();
    this.onColorChange?.(this.regions);
    return;
  }

  this.startAnimation(fromColors, toColors, targetIds);
}

  applyPalette(colors: string[], animate = true): void {
  const fromColors = new Map<number, string>();
  const toColors = new Map<number, string>();
  const targetIds = new Set<number>();

  for (let i = 0; i < this.regions.length; i++) {
    const region = this.regions[i];
    const color = colors[i % colors.length];
    fromColors.set(region.id, region.color);
    toColors.set(region.id, color);
    targetIds.add(region.id);
    region.color = color;
  }

  if (!animate) {
    this.renderAllRegions();
    this.onColorChange?.(this.regions);
    return;
  }

  this.startAnimation(fromColors, toColors, targetIds);
}

  private startAnimation(
    fromColors: Map<number, string>,
    toColors: Map<number, string>,
    targetRegionIds: Set<number>,
  ): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationState = {
      animating: true,
      startTime: performance.now(),
      fromColors,
      toColors,
      targetRegionIds,
    };

    this.animate();
  }

  private animate = (): void => {
    if (!this.animationState) return;

    const now = performance.now();
    const elapsed = now - this.animationState.startTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    const currentColors = new Map<number, string>();
    for (const region of this.regions) {
      if (this.animationState.targetRegionIds.has(region.id)) {
        const fromColor = this.animationState.fromColors.get(region.id) || region.color;
        const toColor = this.animationState.toColors.get(region.id) || region.color;
        currentColors.set(region.id, lerpColor(fromColor, toColor, eased));
      } else {
        currentColors.set(region.id, region.color);
      }
    }

    this.renderRegionsWithColors(currentColors);

    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      this.animationState = null;
      this.animationFrameId = null;
      this.renderAllRegions();
      this.onColorChange?.(this.regions);
      this.onAnimationComplete?.();
    }
  };

  highlightRegion(regionId: number | null): void {
    this.renderAllRegions();
    if (regionId === null) return;

    const region = this.regions.find((r) => r.id === regionId);
    if (!region || !this.baseImageData) return;

    const { minX, minY, maxX, maxY } = region.bounds;

    this.ctx.strokeStyle = '#64ffda';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(minX - 1, minY - 1, maxX - minX + 2, maxY - minY + 2);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
