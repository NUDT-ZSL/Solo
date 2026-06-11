export interface MoodColors {
  happy: string;
  sad: string;
  angry: string;
  calm: string;
}

export const moodColors: MoodColors = {
  happy: '#FFD700',
  sad: '#00BFFF',
  angry: '#DC143C',
  calm: '#98FF98',
};

export type MoodType = keyof MoodColors;

export interface GlowState {
  startTime: number;
  duration: number;
}

export interface RipplePixelInfo {
  x: number;
  y: number;
  distance: number;
  ring: number;
  animStart: number;
}

export interface RippleState {
  centerX: number;
  centerY: number;
  startTime: number;
  duration: number;
  pixelMap: Map<string, RipplePixelInfo>;
  glowStates: Map<string, GlowState>;
}

export interface PixelAnimationData {
  scale: number;
  offsetY: number;
  alpha: number;
  brightness: number;
  glowIntensity: number;
}

export interface FilledPixel {
  x: number;
  y: number;
  charCode: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function mixWithWhite(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio);
}

function mixWithBlack(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio));
}

function brighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export class Animator {
  private mood: MoodType = 'happy';
  private baseColor: string = moodColors.happy;
  private lightColor: string = mixWithWhite(moodColors.happy, 0.4);
  private ripple: RippleState | null = null;
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private pixelSize: number = 10;
  private filledPixels: FilledPixel[] = [];

  setMood(mood: MoodType): void {
    this.mood = mood;
    this.baseColor = moodColors[mood];
    this.lightColor = mixWithWhite(moodColors[mood], 0.4);
  }

  getMood(): MoodType {
    return this.mood;
  }

  setGridSize(width: number, height: number, pixelSize: number): void {
    this.gridWidth = width;
    this.gridHeight = height;
    this.pixelSize = pixelSize;
  }

  setFilledPixels(pixels: FilledPixel[]): void {
    this.filledPixels = pixels;
  }

  getManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  triggerRipple(centerX: number, centerY: number): void {
    const now = performance.now();
    const pixelMap = new Map<string, RipplePixelInfo>();

    const sorted = this.filledPixels
      .map((p) => ({
        x: p.x,
        y: p.y,
        distance: this.getManhattanDistance(p.x, p.y, centerX, centerY),
      }))
      .sort((a, b) => a.distance - b.distance);

    const firstRingCount = Math.min(8, sorted.length);
    const secondRingCount = Math.min(16, Math.max(0, sorted.length - firstRingCount));

    for (let i = 0; i < firstRingCount; i++) {
      const p = sorted[i];
      const key = `${p.x},${p.y}`;
      pixelMap.set(key, {
        x: p.x,
        y: p.y,
        distance: p.distance,
        ring: 1,
        animStart: now + 0,
      });
    }

    for (let i = firstRingCount; i < firstRingCount + secondRingCount; i++) {
      const p = sorted[i];
      const key = `${p.x},${p.y}`;
      pixelMap.set(key, {
        x: p.x,
        y: p.y,
        distance: p.distance,
        ring: 2,
        animStart: now + 100,
      });
    }

    this.ripple = {
      centerX,
      centerY,
      startTime: now,
      duration: 800,
      pixelMap,
      glowStates: new Map(),
    };
  }

  clearRipple(): void {
    this.ripple = null;
  }

  getBreathingAlpha(time: number): number {
    const period = 800;
    const phase = (time % period) / period;
    const t = Math.sin(phase * Math.PI * 2);
    return 0.85 + (1.0 - 0.85) * (0.5 + 0.5 * t);
  }

  getGradientColor(time: number): string {
    const period = 1500;
    const phase = (time % period) / period;
    const t = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);

    const base = hexToRgb(this.baseColor);
    const light = hexToRgb(this.lightColor);

    const r = base.r + (light.r - base.r) * t;
    const g = base.g + (light.g - base.g) * t;
    const b = base.b + (light.b - base.b) * t;

    return rgbToHex(r, g, b);
  }

  getPixelColor(charCode: number, time: number): string {
    const gradientColor = this.getGradientColor(time);
    const isOdd = charCode % 2 === 1;

    if (isOdd) {
      return mixWithWhite(gradientColor, 0.3);
    } else {
      return mixWithBlack(gradientColor, 0.1);
    }
  }

  getRipplePixelInfo(pixelX: number, pixelY: number): RipplePixelInfo | null {
    if (!this.ripple) return null;
    const key = `${pixelX},${pixelY}`;
    return this.ripple.pixelMap.get(key) || null;
  }

  getRippleScaleAndOffset(
    pixelX: number,
    pixelY: number,
    time: number
  ): { scale: number; offsetY: number } {
    const info = this.getRipplePixelInfo(pixelX, pixelY);
    if (!info) return { scale: 1.0, offsetY: 0 };

    const elapsed = time - info.animStart;
    if (elapsed < 0) return { scale: 1.0, offsetY: 0 };

    const animationDuration = 300;
    if (elapsed > animationDuration) return { scale: 1.0, offsetY: 0 };

    const phase = elapsed / animationDuration;
    const t = Math.sin(phase * Math.PI);

    return {
      scale: 1.0 + 0.3 * t,
      offsetY: -2 * t,
    };
  }

  updateGlowState(pixelX: number, pixelY: number, time: number): void {
    if (!this.ripple) return;

    const info = this.getRipplePixelInfo(pixelX, pixelY);
    if (!info) return;

    const pixelKey = `${pixelX},${pixelY}`;
    const elapsed = time - info.animStart;

    if (elapsed >= 0 && elapsed < 50 && !this.ripple.glowStates.has(pixelKey)) {
      this.ripple.glowStates.set(pixelKey, {
        startTime: time,
        duration: 500,
      });
    }
  }

  getGlowIntensity(pixelX: number, pixelY: number, time: number): number {
    if (!this.ripple) return 0;

    const pixelKey = `${pixelX},${pixelY}`;
    const glowState = this.ripple.glowStates.get(pixelKey);

    if (!glowState) return 0;

    const elapsed = time - glowState.startTime;
    if (elapsed < 0) return 0;
    if (elapsed > glowState.duration) return 0;

    const fadeOut = 1 - elapsed / glowState.duration;
    return 0.2 * fadeOut;
  }

  getPixelAnimation(pixelX: number, pixelY: number, time: number): PixelAnimationData {
    const breathingAlpha = this.getBreathingAlpha(time);

    const { scale, offsetY } = this.getRippleScaleAndOffset(pixelX, pixelY, time);

    this.updateGlowState(pixelX, pixelY, time);
    const glowIntensity = this.getGlowIntensity(pixelX, pixelY, time);

    const brightness = 1.0 + glowIntensity;

    return {
      scale,
      offsetY,
      alpha: breathingAlpha,
      brightness,
      glowIntensity,
    };
  }

  getRippleActive(): boolean {
    return this.ripple !== null;
  }

  applyBrightness(color: string, brightness: number): string {
    if (brightness === 1.0) return color;
    return brighten(color, brightness - 1.0);
  }

  mixColors(color1: string, color2: string, ratio: number): string {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    return rgbToHex(
      c1.r + (c2.r - c1.r) * ratio,
      c1.g + (c2.g - c1.g) * ratio,
      c1.b + (c2.b - c1.b) * ratio
    );
  }
}
