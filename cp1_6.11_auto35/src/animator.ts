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

export interface RippleState {
  centerX: number;
  centerY: number;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export interface PixelAnimationData {
  scale: number;
  offsetY: number;
  alpha: number;
  brightness: number;
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

  triggerRipple(centerX: number, centerY: number): void {
    this.ripple = {
      centerX,
      centerY,
      startTime: performance.now(),
      duration: 500,
      maxRadius: 16,
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

  getDistanceFromRippleCenter(pixelX: number, pixelY: number): number {
    if (!this.ripple) return Infinity;

    const dx = pixelX - this.ripple.centerX;
    const dy = pixelY - this.ripple.centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getRippleProgress(distance: number, time: number): number {
    if (!this.ripple) return 0;

    const elapsed = time - this.ripple.startTime;
    if (elapsed < 0) return 0;
    if (elapsed > this.ripple.duration) return 0;

    const waveSpeed = this.ripple.maxRadius / (this.ripple.duration * 0.6);
    const wavePosition = elapsed * waveSpeed;
    const waveWidth = 4;

    const distFromWave = Math.abs(distance - wavePosition);
    if (distFromWave > waveWidth) return 0;

    const intensity = 1 - distFromWave / waveWidth;
    const fadeStart = this.ripple.duration * 0.7;
    const fadeOut = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / (this.ripple.duration - fadeStart) : 1;

    return intensity * fadeOut;
  }

  getPixelAnimation(pixelX: number, pixelY: number, time: number): PixelAnimationData {
    const breathingAlpha = this.getBreathingAlpha(time);

    let scale = 1.0;
    let offsetY = 0;
    let brightness = 1.0;

    if (this.ripple) {
      const distance = this.getDistanceFromRippleCenter(pixelX, pixelY);
      const progress = this.getRippleProgress(distance, time);

      if (progress > 0) {
        scale = 1.0 + 0.3 * progress;
        offsetY = -2 * progress;
        brightness = 1.0 + 0.2 * progress;
      }
    }

    return {
      scale,
      offsetY,
      alpha: breathingAlpha,
      brightness,
    };
  }

  getRippleActive(): boolean {
    return this.ripple !== null;
  }

  applyBrightness(color: string, brightness: number): string {
    if (brightness === 1.0) return color;
    return brighten(color, brightness - 1.0);
  }
}
