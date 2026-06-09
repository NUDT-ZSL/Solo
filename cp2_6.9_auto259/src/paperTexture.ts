export class PaperTexture {
  private textureCanvas: HTMLCanvasElement;
  private textureCtx: CanvasRenderingContext2D;
  private brightnessData: Uint8ClampedArray;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.textureCanvas = document.createElement('canvas');
    this.textureCanvas.width = width;
    this.textureCanvas.height = height;
    this.textureCtx = this.textureCanvas.getContext('2d', { willReadFrequently: true })!;
    this.brightnessData = new Uint8ClampedArray(width * height);
    this.generate();
  }

  private generate(): void {
    const ctx = this.textureCtx;
    const w = this.width;
    const h = this.height;

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#F5F0E1');
    gradient.addColorStop(0.3, '#F0EBD8');
    gradient.addColorStop(0.7, '#EDE5D3');
    gradient.addColorStop(1, '#E8E0D0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const noiseCount = Math.floor(w * h * 0.003);
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const alpha = 0.05 + Math.random() * 0.1;
      const size = 0.3;
      ctx.fillStyle = `rgba(120, 100, 80, ${alpha})`;
      ctx.fillRect(x, y, size, size);
    }

    const fiberCount = Math.floor((w * h) / 8000);
    for (let i = 0; i < fiberCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const length = 10 + Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;

      ctx.strokeStyle = `rgba(140, 120, 90, 0.02)`;
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      this.brightnessData[j] = Math.floor(brightness * 255);
    }
  }

  getBrightness(x: number, y: number): number {
    const px = Math.floor(Math.max(0, Math.min(this.width - 1, x)));
    const py = Math.floor(Math.max(0, Math.min(this.height - 1, y)));
    return this.brightnessData[py * this.width + px] / 255;
  }

  getAbsorptionFactor(x: number, y: number): number {
    const brightness = this.getBrightness(x, y);
    return 1 - brightness;
  }

  draw(ctx: CanvasRenderingContext2D, x: number = 0, y: number = 0): void {
    ctx.drawImage(this.textureCanvas, x, y);
  }

  getCanvas(): HTMLCanvasElement {
    return this.textureCanvas;
  }

  resize(newWidth: number, newHeight: number): void {
    this.width = newWidth;
    this.height = newHeight;
    this.textureCanvas.width = newWidth;
    this.textureCanvas.height = newHeight;
    this.brightnessData = new Uint8ClampedArray(newWidth * newHeight);
    this.generate();
  }
}
