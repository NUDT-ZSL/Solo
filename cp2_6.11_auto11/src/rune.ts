export type LifeStage = 'emerging' | 'floating' | 'fading';

export interface RuneConfig {
  x: number;
  y: number;
  char: string;
  size?: number;
  floatSpeed?: number;
}

const GOLD_COLOR = '#E8D48B';
const CYAN_COLOR = '#00FFC8';

export class Rune {
  x: number;
  y: number;
  char: string;
  size: number;
  brightness: number = 0;
  isActive: boolean = false;
  lifeStage: LifeStage = 'emerging';
  lifeTime: number = 0;
  emergeDuration: number = 1000;
  floatDuration: number = 4000;
  fadeDuration: number = 800;
  floatSpeed: number;
  activeGlowIntensity: number = 0;
  baseY: number;

  constructor(config: RuneConfig) {
    this.x = config.x;
    this.y = config.y;
    this.baseY = config.y;
    this.char = config.char;
    this.size = config.size ?? 32;
    this.floatSpeed = config.floatSpeed ?? 0.02;
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.activeGlowIntensity = 1;
  }

  fadeOut(): void {
    if (this.lifeStage === 'fading') return;
    this.lifeStage = 'fading';
    this.lifeTime = 0;
  }

  update(dt: number): boolean {
    this.lifeTime += dt;

    if (this.isActive) {
      this.activeGlowIntensity = Math.max(0, this.activeGlowIntensity - dt / 1500);
    }

    switch (this.lifeStage) {
      case 'emerging':
        this.brightness = easeInOutCubic(Math.min(1, this.lifeTime / this.emergeDuration));
        this.y = this.baseY + (1 - this.brightness) * 30;
        if (this.lifeTime >= this.emergeDuration) {
          this.lifeStage = 'floating';
          this.lifeTime = 0;
          this.brightness = 1;
        }
        break;

      case 'floating':
        this.y -= this.floatSpeed * dt;
        this.brightness = 1;
        if (this.lifeTime >= this.floatDuration) {
          this.fadeOut();
        }
        break;

      case 'fading':
        this.brightness = easeInOutCubic(Math.max(0, 1 - this.lifeTime / this.fadeDuration));
        if (this.lifeTime >= this.fadeDuration) {
          return false;
        }
        break;
    }

    return true;
  }

  getColor(): string {
    if (!this.isActive || this.activeGlowIntensity <= 0) {
      return GOLD_COLOR;
    }
    return lerpColor(GOLD_COLOR, CYAN_COLOR, Math.min(1, this.activeGlowIntensity));
  }

  getGlowSize(): number {
    const baseGlow = 6;
    const activeGlow = this.isActive ? 12 * this.activeGlowIntensity : 0;
    return baseGlow + activeGlow;
  }

  contains(px: number, py: number): boolean {
    const halfSize = this.size / 2;
    return (
      px >= this.x - halfSize &&
      px <= this.x + halfSize &&
      py >= this.y - halfSize &&
      py <= this.y + halfSize
    );
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}
