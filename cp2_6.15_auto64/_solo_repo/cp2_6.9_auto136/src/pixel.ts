export interface PixelTrailPoint {
  x: number;
  y: number;
}

export class Pixel {
  public x: number;
  public y: number;
  public radius: number;
  public color: string;
  public baseColor: string;
  public vy: number;
  public swingAngle: number;
  public swingSpeed: number;
  public swingAmplitude: number;
  public trail: PixelTrailPoint[];
  public trailLength: number;
  public originalX: number;
  public active: boolean;

  constructor(x: number, y: number, color: string, radius: number) {
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.radius = radius;
    this.color = color;
    this.baseColor = color;
    this.vy = 2;
    this.swingAngle = Math.random() * Math.PI * 2;
    this.swingSpeed = 0.3;
    this.swingAmplitude = 3 + Math.random() * 2;
    this.trail = [];
    this.trailLength = 15;
    this.active = true;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  public applyBrightness(brightnessPercent: number): void {
    const rgb = this.hexToRgb(this.baseColor);
    if (!rgb) return;
    const factor = 1 + brightnessPercent;
    this.color = this.rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
  }

  public mixWith(other: Pixel): void {
    const rgb1 = this.hexToRgb(this.baseColor);
    const rgb2 = this.hexToRgb(other.baseColor);
    if (!rgb1 || !rgb2) return;
    const mixedR = (rgb1.r + rgb2.r) / 2;
    const mixedG = (rgb1.g + rgb2.g) / 2;
    const mixedB = (rgb1.b + rgb2.b) / 2;
    this.baseColor = this.rgbToHex(mixedR, mixedG, mixedB);
  }

  public update(speedMultiplier: number, canvasWidth: number, canvasHeight: number, widthOffset: number): void {
    if (!this.active) return;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.shift();
    }

    this.swingAngle += this.swingSpeed;
    const swing = Math.sin(this.swingAngle) * this.swingAmplitude;

    this.y += this.vy * speedMultiplier;
    this.x = this.originalX + swing;

    this.originalX += (Math.random() - 0.5) * (widthOffset / 40);
    this.originalX = Math.max(0, Math.min(canvasWidth, this.originalX));

    if (this.y > canvasHeight + this.radius) {
      this.y = -this.radius;
      this.originalX = this.originalX + (Math.random() - 0.5) * 20;
      this.originalX = Math.max(0, Math.min(canvasWidth, this.originalX));
      this.trail = [];
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const alpha = (i / this.trail.length) * 0.15;
      ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      const size = this.radius * 2 * (i / this.trail.length);
      ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    }

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
  }
}

export function getColorBySpeed(speed: number, palette: string[]): string {
  const normalizedSpeed = Math.min(1, speed / 15);
  const index = Math.floor(normalizedSpeed * (palette.length - 1));
  return palette[Math.min(palette.length - 1, Math.max(0, index))];
}

export const PALETTE_COLD = [
  '#1a5276',
  '#2874a6',
  '#3498db',
  '#5dade2',
  '#1e8449',
  '#27ae60',
  '#2ecc71',
  '#58d68d'
];

export const PALETTE_WARM = [
  '#f5b041',
  '#f39c12',
  '#e67e22',
  '#d35400',
  '#e74c3c',
  '#c0392b',
  '#922b21',
  '#641e16'
];

export const FULL_PALETTE = [
  '#e74c3c',
  '#e67e22',
  '#f39c12',
  '#f1c40f',
  '#2ecc71',
  '#27ae60',
  '#1abc9c',
  '#3498db',
  '#2980b9',
  '#9b59b6',
  '#8e44ad',
  '#e91e63'
];
