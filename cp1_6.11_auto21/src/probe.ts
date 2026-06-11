import { ColorData, HSL, RGB, IColorProbe, ImageRect } from './types';

export { ColorData, RGB, HSL } from './types';

export class ColorProbe implements IColorProbe {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;
  private imageWidth: number = 0;
  private imageHeight: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
  private imageRect: ImageRect | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
  }

  loadImage(image: HTMLImageElement): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    if (canvasWidth === 0 || canvasHeight === 0) {
      throw new Error('Canvas尺寸为0，无法加载图片');
    }

    const imgRatio = image.width / image.height;
    const canvasRatio = canvasWidth / canvasHeight;

    if (imgRatio > canvasRatio) {
      this.imageWidth = canvasWidth;
      this.imageHeight = canvasWidth / imgRatio;
    } else {
      this.imageHeight = canvasHeight;
      this.imageWidth = canvasHeight * imgRatio;
    }

    this.scale = this.imageWidth / image.width;
    this.offsetX = (canvasWidth - this.imageWidth) / 2;
    this.offsetY = (canvasHeight - this.imageHeight) / 2;

    this.imageRect = {
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      width: this.imageWidth,
      height: this.imageHeight,
      scale: this.scale
    };

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.ctx.drawImage(image, this.offsetX, this.offsetY, this.imageWidth, this.imageHeight);

    try {
      this.imageData = this.ctx.getImageData(
        Math.floor(Math.max(0, this.offsetX)),
        Math.floor(Math.max(0, this.offsetY)),
        Math.ceil(Math.min(this.imageWidth, canvasWidth - this.offsetX)),
        Math.ceil(Math.min(this.imageHeight, canvasHeight - this.offsetY))
      );
    } catch (e) {
      console.error('获取ImageData失败，可能是跨域图片', e);
      this.imageData = null;
    }
  }

  getImageRect(): ImageRect | null {
    return this.imageRect;
  }

  getColorAt(clientX: number, clientY: number): ColorData | null {
    if (!this.imageData || !this.imageRect) return null;

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const x = canvasX - this.offsetX;
    const y = canvasY - this.offsetY;

    if (
      x < 0 ||
      x >= this.imageWidth ||
      y < 0 ||
      y >= this.imageHeight ||
      isNaN(x) ||
      isNaN(y)
    ) {
      return null;
    }

    const imgX = Math.floor(x / this.scale);
    const imgY = Math.floor(y / this.scale);
    const dataWidth = this.imageData.width;
    const dataHeight = this.imageData.height;

    if (imgX < 0 || imgX >= dataWidth || imgY < 0 || imgY >= dataHeight) {
      return null;
    }

    const index = (imgY * dataWidth + imgX) * 4;
    const data = this.imageData.data;
    const dataLength = data.length;

    if (index < 0 || index + 3 >= dataLength) {
      return null;
    }

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    return {
      r,
      g,
      b,
      hex: ColorProbe.rgbToHex(r, g, b),
      hsl: ColorProbe.rgbToHsl(r, g, b)
    };
  }

  isInImage(clientX: number, clientY: number): boolean {
    if (!this.imageRect) return false;

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const x = canvasX - this.offsetX;
    const y = canvasY - this.offsetY;

    return (
      x >= 0 &&
      x < this.imageWidth &&
      y >= 0 &&
      y < this.imageHeight &&
      !isNaN(x) &&
      !isNaN(y)
    );
  }

  getImagePosition(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.isInImage(clientX, clientY)) return null;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    if (isNaN(canvasX) || isNaN(canvasY)) return null;

    return { x: canvasX, y: canvasY };
  }

  // ==================== 静态工具方法 ====================

  static rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const clamped = Math.max(0, Math.min(255, Math.round(n)));
      return clamped.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  static hexToRgb(hex: string): RGB | null {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static rgbToHsl(r: number, g: number, b: number): HSL {
    r = Math.max(0, Math.min(255, r)) / 255;
    g = Math.max(0, Math.min(255, g)) / 255;
    b = Math.max(0, Math.min(255, b)) / 255;

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

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  static hslToRgb(h: number, s: number, l: number): RGB {
    h = ((Math.max(0, Math.min(360, h)) % 360) + 360) % 360 / 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;

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

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
}
