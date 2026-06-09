export interface ParticleParams {
  gravity: number;
  wind: number;
  flowSpeed: number;
  jitterAmount: number;
  targetColor: string;
  colorTransitionProgress: number;
}

export class Particle {
  x: number;
  y: number;
  size: number;
  baseColor: string;
  currentColor: string;
  isFalling: boolean;
  glowPhase: number;
  velocityX: number;
  velocityY: number;
  settled: boolean;

  private static readonly INITIAL_COLORS = ['#C2A77D', '#D4B88A', '#E8D3A6'];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = 2 + Math.random() * 2;
    this.baseColor = Particle.INITIAL_COLORS[Math.floor(Math.random() * Particle.INITIAL_COLORS.length)];
    this.currentColor = this.baseColor;
    this.isFalling = false;
    this.glowPhase = Math.random() * Math.PI * 2;
    this.velocityX = 0;
    this.velocityY = 0;
    this.settled = true;
  }

  static randomColor(): string {
    return Particle.INITIAL_COLORS[Math.floor(Math.random() * Particle.INITIAL_COLORS.length)];
  }

  update(params: ParticleParams): void {
    this.glowPhase += 0.1;

    if (!this.settled) {
      this.velocityY += params.gravity;
      this.velocityX += params.wind;
      this.x += this.velocityX;
      this.y += this.velocityY;
    }

    if (!this.isFalling && params.jitterAmount > 0) {
      this.x += (Math.random() - 0.5) * params.jitterAmount;
      this.y += (Math.random() - 0.5) * params.jitterAmount;
    }

    if (params.colorTransitionProgress > 0) {
      this.currentColor = Particle.lerpColor(
        this.baseColor,
        params.targetColor,
        params.colorTransitionProgress
      );
    } else {
      this.currentColor = this.baseColor;
    }
  }

  render(ctx: CanvasRenderingContext2D, flowSpeed: number): void {
    if (this.isFalling) {
      const glowRadius = 2 + flowSpeed * 0.5;
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, glowRadius + this.size
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, 0.4)`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, 0.1)`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowRadius + this.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = this.currentColor;
    ctx.fill();
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private static lerpColor(color1: string, color2: string, t: number): string {
    const c1 = Particle.hexToRgb(color1);
    const c2 = Particle.hexToRgb(color2);
    return Particle.rgbToHex(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t
    );
  }

  static hslToHex(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    return Particle.rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  static hexToHsl(hex: string): { h: number; s: number; l: number } {
    const rgb = Particle.hexToRgb(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s, l };
  }
}
