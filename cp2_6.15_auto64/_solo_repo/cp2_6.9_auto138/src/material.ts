export type MaterialType = 'wood' | 'stone' | 'water' | 'oil';

export interface MaterialConfig {
  color: string;
  flammability: number;
  burnSpeed: number;
  burnDuration: number;
  waterExtinguish: number;
}

export const MATERIAL_CONFIGS: Record<MaterialType, MaterialConfig> = {
  wood: {
    color: '#8B4513',
    flammability: 0.9,
    burnSpeed: 1,
    burnDuration: 50,
    waterExtinguish: 0
  },
  stone: {
    color: '#808080',
    flammability: 0,
    burnSpeed: 0,
    burnDuration: 0,
    waterExtinguish: 0
  },
  water: {
    color: '#1E90FF',
    flammability: -1,
    burnSpeed: 0,
    burnDuration: 0,
    waterExtinguish: 1
  },
  oil: {
    color: '#FFD700',
    flammability: 1.5,
    burnSpeed: 2,
    burnDuration: 25,
    waterExtinguish: 0
  }
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
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

export class Block {
  x: number;
  y: number;
  size: number;
  type: MaterialType;
  config: MaterialConfig;
  isBurning: boolean = false;
  burnProgress: number = 0;
  currentColor: string;
  rgb: { r: number; g: number; b: number };
  hasExploded: boolean = false;

  constructor(x: number, y: number, size: number, type: MaterialType) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type;
    this.config = MATERIAL_CONFIGS[type];
    this.currentColor = this.config.color;
    this.rgb = hexToRgb(this.config.color);
  }

  ignite(): boolean {
    if (this.isBurning) return false;
    if (this.config.flammability <= 0) return false;
    if (this.burnProgress >= this.config.burnDuration) return false;
    this.isBurning = true;
    return true;
  }

  extinguish(): void {
    this.isBurning = false;
  }

  update(): boolean {
    if (!this.isBurning) return false;
    this.burnProgress += this.config.burnSpeed;
    const total = this.config.burnDuration;
    const t = Math.min(1, this.burnProgress / total);

    if (t < 0.7) {
      const brighten = Math.min(1, (this.burnProgress / total) * 2) * 40;
      this.rgb.r = Math.min(255, hexToRgb(this.config.color).r + brighten);
      this.rgb.g = Math.min(255, hexToRgb(this.config.color).g + brighten * 0.6);
      this.rgb.b = Math.min(255, hexToRgb(this.config.color).b + brighten * 0.3);
    } else {
      const darken = (t - 0.7) / 0.3;
      this.rgb.r = Math.max(20, this.rgb.r * (1 - darken));
      this.rgb.g = Math.max(20, this.rgb.g * (1 - darken));
      this.rgb.b = Math.max(20, this.rgb.b * (1 - darken));
    }

    this.currentColor = rgbToHex(this.rgb.r, this.rgb.g, this.rgb.b);

    if (this.burnProgress >= this.config.burnDuration) {
      this.isBurning = false;
      this.currentColor = '#1a1a1a';
      this.rgb = { r: 26, g: 26, b: 26 };
      return true;
    }
    return false;
  }

  isBurnt(): boolean {
    return this.burnProgress >= this.config.burnDuration;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.currentColor;
    ctx.fillRect(this.x, this.y, this.size, this.size);

    if (this.isBurning) {
      const flicker = Math.random() * 0.3;
      ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.3 + flicker})`;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.size, this.size);
  }
}
