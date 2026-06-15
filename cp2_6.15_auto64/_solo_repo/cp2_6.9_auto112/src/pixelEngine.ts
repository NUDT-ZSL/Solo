export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PixelBlock {
  id: number;
  x: number;
  y: number;
  size: number;
  color: RGB;
  timestamp: number;
  scale: number;
}

export interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: RGB;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface HistoryEntry {
  blocks: PixelBlock[];
  particles: SplashParticle[];
}

export class PixelEngine {
  private blocks: PixelBlock[] = [];
  private particles: SplashParticle[] = [];
  private history: HistoryEntry[] = [];
  private historyIndex: number = -1;
  private nextId: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private basePixelSize: number = 8;
  private brushMultiplier: number = 1;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  setBrushMultiplier(multiplier: number): void {
    this.brushMultiplier = Math.max(1, Math.min(4, multiplier));
  }

  getBrushSize(): number {
    return this.basePixelSize * this.brushMultiplier;
  }

  addPixel(x: number, y: number, color: RGB): PixelBlock | null {
    const size = this.getBrushSize();
    const halfSize = size / 2;
    const centerX = Math.floor(x - halfSize);
    const centerY = Math.floor(y - halfSize);

    const clampedX = Math.max(0, Math.min(this.canvasWidth - size, centerX));
    const clampedY = Math.max(0, Math.min(this.canvasHeight - size, centerY));

    let finalColor = color;
    const overlappingBlock = this.findOverlappingBlock(clampedX, clampedY, size);

    if (overlappingBlock) {
      finalColor = this.mixColors(overlappingBlock.color, color);
      this.createSplashParticles(clampedX + halfSize, clampedY + halfSize, finalColor);
    }

    const block: PixelBlock = {
      id: this.nextId++,
      x: clampedX,
      y: clampedY,
      size,
      color: finalColor,
      timestamp: performance.now(),
      scale: 0
    };

    this.blocks.push(block);

    if (overlappingBlock) {
      overlappingBlock.color = finalColor;
      overlappingBlock.timestamp = performance.now();
      overlappingBlock.scale = 0;
    }

    this.saveHistory();
    return block;
  }

  private findOverlappingBlock(x: number, y: number, size: number): PixelBlock | null {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      const overlapX = Math.max(0, Math.min(x + size, block.x + block.size) - Math.max(x, block.x));
      const overlapY = Math.max(0, Math.min(y + size, block.y + block.size) - Math.max(y, block.y));
      const overlapArea = overlapX * overlapY;
      const blockArea = size * size;

      if (overlapArea >= blockArea * 0.5) {
        return block;
      }
    }
    return null;
  }

  mixColors(c1: RGB, c2: RGB): RGB {
    const hsl1 = this.rgbToHsl(c1.r, c1.g, c1.b);
    const hsl2 = this.rgbToHsl(c2.r, c2.g, c2.b);

    let mixedHue: number;
    const hueDiff = Math.abs(hsl1.h - hsl2.h);
    if (hueDiff <= 180) {
      mixedHue = (hsl1.h + hsl2.h) / 2;
    } else {
      mixedHue = ((hsl1.h + hsl2.h + 360) / 2) % 360;
    }

    const mixedSat = Math.max(0, ((hsl1.s + hsl2.s) / 2) - 20);
    const mixedLight = (hsl1.l + hsl2.l) / 2;

    return this.hslToRgb(mixedHue, mixedSat, mixedLight);
  }

  private createSplashParticles(x: number, y: number, color: RGB): void {
    const count = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 20 + 30;
      const speed = distance / 60;

      const rVariation = Math.floor((Math.random() - 0.5) * 40);
      const gVariation = Math.floor((Math.random() - 0.5) * 40);
      const bVariation = Math.floor((Math.random() - 0.5) * 40);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 1 + 2,
        color: {
          r: Math.max(0, Math.min(255, color.r + rVariation)),
          g: Math.max(0, Math.min(255, color.g + gVariation)),
          b: Math.max(0, Math.min(255, color.b + bVariation))
        },
        alpha: 1,
        life: 60,
        maxLife: 60
      });
    }
  }

  update(now: number): void {
    for (const block of this.blocks) {
      const elapsed = now - block.timestamp;
      const duration = 300;
      if (elapsed < duration) {
        const t = elapsed / duration;
        const easeOut = 1 - Math.pow(1 - t, 3);
        block.scale = easeOut;
      } else {
        block.scale = 1;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.alpha = p.life / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    for (const block of this.blocks) {
      this.renderBlock(ctx, block);
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgb(${p.color.r}, ${p.color.g}, ${p.color.b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderBlock(ctx: CanvasRenderingContext2D, block: PixelBlock): void {
    const scale = block.scale;
    if (scale <= 0) return;

    const centerX = block.x + block.size / 2;
    const centerY = block.y + block.size / 2;
    const scaledSize = block.size * scale;
    const x = centerX - scaledSize / 2;
    const y = centerY - scaledSize / 2;

    ctx.fillStyle = `rgb(${block.color.r}, ${block.color.g}, ${block.color.b})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(scaledSize), Math.ceil(scaledSize));
  }

  getPixelCount(): number {
    return this.blocks.length;
  }

  private saveHistory(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const snapshot: HistoryEntry = {
      blocks: this.blocks.map(b => ({ ...b, color: { ...b.color } })),
      particles: this.particles.map(p => ({ ...p, color: { ...p.color } }))
    };

    this.history.push(snapshot);

    if (this.history.length > 10) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): boolean {
    if (this.historyIndex <= 0) {
      if (this.history.length > 0) {
        this.blocks = [];
        this.particles = [];
        this.historyIndex = -1;
        return true;
      }
      return false;
    }

    this.historyIndex--;
    const snapshot = this.history[this.historyIndex];
    if (snapshot) {
      this.blocks = snapshot.blocks.map(b => ({ ...b, color: { ...b.color } }));
      this.particles = snapshot.particles.map(p => ({ ...p, color: { ...p.color } }));
      return true;
    }
    return false;
  }

  clear(): void {
    this.blocks = [];
    this.particles = [];
    this.history = [];
    this.historyIndex = -1;
  }

  exportPNG(canvas: HTMLCanvasElement): void {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvasWidth;
    tempCanvas.height = this.canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return;

    tempCtx.fillStyle = '#2A2A2A';
    tempCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    for (const block of this.blocks) {
      tempCtx.fillStyle = `rgb(${block.color.r}, ${block.color.g}, ${block.color.b})`;
      tempCtx.fillRect(block.x, block.y, block.size, block.size);
    }

    const link = document.createElement('a');
    link.download = `pixel-art-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  private hslToRgb(h: number, s: number, l: number): RGB {
    h /= 360;
    s /= 100;
    l /= 100;

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
}

export const KEY_COLORS: Record<string, RGB> = {};

const letterColors = [
  '#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00',
  '#FFFF00', '#CCFF00', '#99FF00', '#66FF00', '#33FF00',
  '#00FF00', '#00FF33', '#00FF66', '#00FF99', '#00FFCC',
  '#00FFFF', '#00CCFF', '#0099FF', '#0066FF', '#0033FF',
  '#0000FF', '#3300FF', '#6600FF', '#8B00FF', '#6600CC',
  '#4B0082'
];

for (let i = 0; i < 26; i++) {
  const key = String.fromCharCode(65 + i);
  KEY_COLORS[key] = hexToRgb(letterColors[i]);
}

for (let i = 0; i <= 9; i++) {
  const value = Math.round(255 - (i / 9) * 255);
  KEY_COLORS[String(i)] = { r: value, g: value, b: value };
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

export function rgbToHex(rgb: RGB): string {
  return `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1).toUpperCase()}`;
}
