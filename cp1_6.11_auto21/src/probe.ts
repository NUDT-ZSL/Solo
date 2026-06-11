export interface ColorData {
  r: number;
  g: number;
  b: number;
  hex: string;
  hsl: { h: number; s: number; l: number };
}

export class ColorProbe {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;
  private imageWidth: number = 0;
  private imageHeight: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
  }

  loadImage(image: HTMLImageElement): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
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

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.ctx.drawImage(image, this.offsetX, this.offsetY, this.imageWidth, this.imageHeight);
    
    this.imageData = this.ctx.getImageData(
      Math.floor(this.offsetX),
      Math.floor(this.offsetY),
      Math.ceil(this.imageWidth),
      Math.ceil(this.imageHeight)
    );
  }

  getColorAt(clientX: number, clientY: number): ColorData | null {
    if (!this.imageData) return null;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX - this.offsetX;
    const y = (clientY - rect.top) * scaleY - this.offsetY;

    if (x < 0 || x >= this.imageWidth || y < 0 || y >= this.imageHeight) {
      return null;
    }

    const imgX = Math.floor(x / this.scale);
    const imgY = Math.floor(y / this.scale);
    const dataWidth = this.imageData.width;
    
    const index = (imgY * dataWidth + imgX) * 4;
    const r = this.imageData.data[index];
    const g = this.imageData.data[index + 1];
    const b = this.imageData.data[index + 2];

    return {
      r,
      g,
      b,
      hex: this.rgbToHex(r, g, b),
      hsl: this.rgbToHsl(r, g, b)
    };
  }

  isInImage(clientX: number, clientY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX - this.offsetX;
    const y = (clientY - rect.top) * scaleY - this.offsetY;

    return x >= 0 && x < this.imageWidth && y >= 0 && y < this.imageHeight;
  }

  getImagePosition(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    if (!this.isInImage(clientX, clientY)) return null;

    return { x, y };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
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

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
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

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
}
