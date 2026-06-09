export class ArtGenerator {
  private width: number;
  private height: number;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private permutation: number[];

  constructor(width: number = 800, height: number = 600) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.permutation = this.generatePermutation();
  }

  private generatePermutation(): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private perlinNoise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    );
  }

  private octaveNoise(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.perlinNoise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
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
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  generate(): HTMLCanvasElement {
    this.permutation = this.generatePermutation();
    const warmColors = ['#FF6B6B', '#FF8E53'];
    const coolColors = ['#4ECDC4', '#45B7D1'];
    const useWarm = Math.random() > 0.5;
    const palette = useWarm ? warmColors : coolColors;
    const color1 = this.hexToHsl(palette[0]);
    const color2 = this.hexToHsl(palette[1]);

    const imageData = this.ctx.createImageData(this.width, this.height);
    const data = imageData.data;
    const scale = 0.008;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const nx = x * scale;
        const ny = y * scale;
        const noiseVal = this.octaveNoise(nx, ny, 5, 0.5);
        const normalizedNoise = (noiseVal + 1) / 2;
        const flowX = this.octaveNoise(nx + 100, ny + 100, 3, 0.6);
        const t = (normalizedNoise + flowX * 0.3) / 1.3;
        const clampedT = Math.max(0, Math.min(1, t));
        const h = color1.h + (color2.h - color1.h) * clampedT;
        const s = color1.s + (color2.s - color1.s) * clampedT;
        const l = color1.l + (color2.l - color1.l) * clampedT + normalizedNoise * 15 - 7.5;
        const { r, g, b } = this.hslToRgb(h, s, Math.max(20, Math.min(85, l)));
        const idx = (y * this.width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.addHighlights();
    return this.canvas;
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
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
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  private addHighlights(): void {
    const gradient1 = this.ctx.createRadialGradient(
      this.width * 0.3, this.height * 0.3, 0,
      this.width * 0.3, this.height * 0.3, this.width * 0.5
    );
    gradient1.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    gradient1.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = gradient1;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const gradient2 = this.ctx.createRadialGradient(
      this.width * 0.7, this.height * 0.7, 0,
      this.width * 0.7, this.height * 0.7, this.width * 0.4
    );
    gradient2.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
    gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = gradient2;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }
}
