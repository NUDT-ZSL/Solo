export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorData {
  hex: string;
  rgb: ColorRGB;
  hsl: ColorHSL;
  rgbString: string;
  hslString: string;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): ColorHSL {
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

export function hslToRgb(h: number, s: number, l: number): ColorRGB {
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

export function hexToRgb(hex: string): ColorRGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

export function createColorData(r: number, g: number, b: number): ColorData {
  const clampedR = Math.max(0, Math.min(255, Math.round(r)));
  const clampedG = Math.max(0, Math.min(255, Math.round(g)));
  const clampedB = Math.max(0, Math.min(255, Math.round(b)));

  const hsl = rgbToHsl(clampedR, clampedG, clampedB);

  return {
    hex: rgbToHex(clampedR, clampedG, clampedB),
    rgb: { r: clampedR, g: clampedG, b: clampedB },
    hsl,
    rgbString: `rgb(${clampedR}, ${clampedG}, ${clampedB})`,
    hslString: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
  };
}

export class ColorProbe {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;
  private imageLoaded: boolean = false;
  private imageOffsetX: number = 0;
  private imageOffsetY: number = 0;
  private imageWidth: number = 0;
  private imageHeight: number = 0;

  private dpr: number = 1;

  private crosshairCssX: number = -1;
  private crosshairCssY: number = -1;
  private animationFrameId: number | null = null;
  private lastSampleTime: number = 0;
  private readonly sampleInterval: number = 1000 / 60;

  private onColorChange: (color: ColorData | null) => void;
  private onCrosshairMove?: (x: number, y: number, color: ColorData | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: {
      onColorChange: (color: ColorData | null) => void;
      onCrosshairMove?: (x: number, y: number, color: ColorData | null) => void;
    }
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.onColorChange = callbacks.onColorChange;
    this.onCrosshairMove = callbacks.onCrosshairMove;
    this.dpr = window.devicePixelRatio || 1;
  }

  setCanvasSize(cssWidth: number, cssHeight: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = cssWidth * this.dpr;
    this.canvas.height = cssHeight * this.dpr;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
  }

  loadImage(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          this.drawImageFit(img);
          this.imageLoaded = true;
          resolve();
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private drawImageFit(img: HTMLImageElement): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth: number;
    let drawHeight: number;

    if (imgRatio > canvasRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
    } else {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
    }

    this.imageOffsetX = (canvasWidth - drawWidth) / 2;
    this.imageOffsetY = (canvasHeight - drawHeight) / 2;
    this.imageWidth = drawWidth;
    this.imageHeight = drawHeight;

    this.ctx.fillStyle = '#16213e';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    this.ctx.drawImage(
      img,
      this.imageOffsetX,
      this.imageOffsetY,
      drawWidth,
      drawHeight
    );

    this.imageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  }

  resize(cssWidth: number, cssHeight: number): void {
    const oldImageData = this.imageData;
    const oldCanvasWidth = this.canvas.width;
    const oldCanvasHeight = this.canvas.height;

    this.setCanvasSize(cssWidth, cssHeight);

    if (this.imageLoaded && oldImageData) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = oldCanvasWidth;
      tempCanvas.height = oldCanvasHeight;
      tempCtx.putImageData(oldImageData, 0, 0);

      const img = new Image();
      img.onload = () => {
        this.drawImageFit(img);
      };
      img.src = tempCanvas.toDataURL();
    }
  }

  sampleColor(cssX: number, cssY: number): ColorData | null {
    if (!this.imageData) return null;

    const pixelX = Math.floor(cssX * this.dpr);
    const pixelY = Math.floor(cssY * this.dpr);

    if (
      pixelX < this.imageOffsetX ||
      pixelX > this.imageOffsetX + this.imageWidth ||
      pixelY < this.imageOffsetY ||
      pixelY > this.imageOffsetY + this.imageHeight
    ) {
      return null;
    }

    const index = (pixelY * this.imageData.width + pixelX) * 4;
    const r = this.imageData.data[index];
    const g = this.imageData.data[index + 1];
    const b = this.imageData.data[index + 2];

    return createColorData(r, g, b);
  }

  startTracking(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.startAnimation();
  }

  stopTracking(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.stopAnimation();
    this.crosshairCssX = -1;
    this.crosshairCssY = -1;
    this.onColorChange(null);
    this.onCrosshairMove?.(-1, -1, null);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.crosshairCssX = e.clientX - rect.left;
    this.crosshairCssY = e.clientY - rect.top;
  };

  private handleMouseLeave = (): void => {
    this.crosshairCssX = -1;
    this.crosshairCssY = -1;
    this.onColorChange(null);
    this.onCrosshairMove?.(-1, -1, null);
  };

  private startAnimation(): void {
    const animate = (time: number) => {
      if (time - this.lastSampleTime >= this.sampleInterval) {
        this.update();
        this.lastSampleTime = time;
      }
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private update(): void {
    if (!this.imageLoaded) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.imageData) {
      this.ctx.putImageData(this.imageData, 0, 0);
    }

    if (this.crosshairCssX >= 0 && this.crosshairCssY >= 0) {
      const color = this.sampleColor(this.crosshairCssX, this.crosshairCssY);
      this.onColorChange(color);
      this.onCrosshairMove?.(this.crosshairCssX, this.crosshairCssY, color);

      if (color) {
        this.drawCrosshair(this.crosshairCssX * this.dpr, this.crosshairCssY * this.dpr);
      }
    }
  }

  private drawCrosshair(x: number, y: number): void {
    const ctx = this.ctx;
    const size = 20 * this.dpr;
    const lineWidth = 1 * this.dpr;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x - 4 * this.dpr, y);
    ctx.moveTo(x + 4 * this.dpr, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y - 4 * this.dpr);
    ctx.moveTo(x, y + 4 * this.dpr);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    const periodMs = 500;
    const phase = (Date.now() % periodMs) / periodMs;
    const pulse = (Math.sin(phase * Math.PI * 2) + 1) / 2;

    const minRadius = 3 * this.dpr;
    const maxRadius = 5 * this.dpr;
    const radius = minRadius + pulse * (maxRadius - minRadius);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    const alpha = 0.5 + pulse * 0.5;
    ctx.fillStyle = `rgba(0, 210, 255, ${alpha})`;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.restore();
  }

  isImageLoaded(): boolean {
    return this.imageLoaded;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getDpr(): number {
    return this.dpr;
  }
}
