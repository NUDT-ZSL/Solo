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

  private crosshairX: number = -1;
  private crosshairY: number = -1;
  private animationFrameId: number | null = null;
  private lastSampleTime: number = 0;
  private readonly sampleInterval: number = 1000 / 60;

  private onColorChange: (color: ColorData | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onColorChange: (color: ColorData | null) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.onColorChange = onColorChange;
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

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    
    if (this.imageLoaded && this.imageData) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = this.imageData.width;
      tempCanvas.height = this.imageData.height;
      tempCtx.putImageData(this.imageData, 0, 0);

      const img = new Image();
      img.onload = () => {
        this.drawImageFit(img);
      };
      img.src = tempCanvas.toDataURL();
    }
  }

  sampleColor(clientX: number, clientY: number): ColorData | null {
    if (!this.imageData || !this.isOnImage(clientX, clientY)) {
      return null;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);

    const index = (y * this.imageData.width + x) * 4;
    const r = this.imageData.data[index];
    const g = this.imageData.data[index + 1];
    const b = this.imageData.data[index + 2];

    return createColorData(r, g, b);
  }

  private isOnImage(clientX: number, clientY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return (
      x >= this.imageOffsetX &&
      x <= this.imageOffsetX + this.imageWidth &&
      y >= this.imageOffsetY &&
      y <= this.imageOffsetY + this.imageHeight
    );
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
    this.crosshairX = -1;
    this.crosshairY = -1;
    this.onColorChange(null);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.crosshairX = e.clientX - rect.left;
    this.crosshairY = e.clientY - rect.top;
  };

  private handleMouseLeave = (): void => {
    this.crosshairX = -1;
    this.crosshairY = -1;
    this.onColorChange(null);
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

    if (this.crosshairX >= 0 && this.crosshairY >= 0 && this.imageLoaded) {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = this.crosshairX + rect.left;
      const clientY = this.crosshairY + rect.top;

      const color = this.sampleColor(clientX, clientY);
      this.onColorChange(color);

      if (color) {
        this.drawCrosshair(this.crosshairX, this.crosshairY);
      }
    }
  }

  private drawCrosshair(x: number, y: number): void {
    const ctx = this.ctx;
    const size = 20;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    const pulse = (Math.sin(Date.now() / 250) + 1) / 2;
    const radius = 3 + pulse * 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 210, 255, ${0.5 + pulse * 0.5})`;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  isImageLoaded(): boolean {
    return this.imageLoaded;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getCrosshairPosition(): { x: number; y: number } {
    return { x: this.crosshairX, y: this.crosshairY };
  }
}
