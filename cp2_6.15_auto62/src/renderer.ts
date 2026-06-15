export class SmokeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridSize: number;

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private offscreenImageData: ImageData;
  private colorLookupTable: Uint8ClampedArray;

  private readonly colorDark = { r: 0x33, g: 0x33, b: 0x33 };
  private readonly colorLight = { r: 0xcc, g: 0xcc, b: 0xcc };
  private readonly colorHighlight = { r: 0xff, g: 0xee, b: 0xdd };
  private readonly bgColor = { r: 0x0d, g: 0x11, b: 0x17 };

  constructor(canvas: HTMLCanvasElement, gridSize: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.gridSize = gridSize;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = gridSize;
    this.offscreenCanvas.height = gridSize;
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to get offscreen 2D context');
    this.offscreenCtx = offCtx;
    this.offscreenImageData = offCtx.createImageData(gridSize, gridSize);

    this.colorLookupTable = this.buildColorLookupTable();
    this.resize();
  }

  private buildColorLookupTable(): Uint8ClampedArray {
    const table = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      const d = i / 255;
      const color = this.densityToColor(d);
      table[i * 4] = color.r;
      table[i * 4 + 1] = color.g;
      table[i * 4 + 2] = color.b;
      table[i * 4 + 3] = 255;
    }
    return table;
  }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private densityToColor(density: number): { r: number; g: number; b: number } {
    const d = this.clamp(density, 0, 1);

    const grayT = d;
    const baseR = this.lerp(this.colorDark.r, this.colorLight.r, grayT);
    const baseG = this.lerp(this.colorDark.g, this.colorLight.g, grayT);
    const baseB = this.lerp(this.colorDark.b, this.colorLight.b, grayT);

    if (d > 0.9) {
      const highlightT = this.clamp((d - 0.9) / 0.1, 0, 1);
      const addR = this.colorHighlight.r * highlightT * 0.6;
      const addG = this.colorHighlight.g * highlightT * 0.6;
      const addB = this.colorHighlight.b * highlightT * 0.6;

      return {
        r: this.clamp(baseR + addR, 0, 255),
        g: this.clamp(baseG + addG, 0, 255),
        b: this.clamp(baseB + addB, 0, 255),
      };
    }

    return { r: baseR, g: baseG, b: baseB };
  }

  private densityToColorWithAlpha(density: number): { r: number; g: number; b: number; a: number } {
    const color = this.densityToColor(density);
    const alpha = this.clamp(density * 1.2, 0, 1);
    return { ...color, a: Math.floor(alpha * 255) };
  }

  public render(density: Float32Array): void {
    const n = this.gridSize;
    const data = this.offscreenImageData.data;
    const lut = this.colorLookupTable;
    const bgR = this.bgColor.r;
    const bgG = this.bgColor.g;
    const bgB = this.bgColor.b;

    for (let i = 0; i < n * n; i++) {
      const d = this.clamp(density[i], 0, 1);
      const lutIdx = Math.floor(d * 255);
      const srcR = lut[lutIdx * 4];
      const srcG = lut[lutIdx * 4 + 1];
      const srcB = lut[lutIdx * 4 + 2];

      const alpha = this.clamp(d * 1.5, 0, 1);

      const pixelIdx = i * 4;
      data[pixelIdx] = this.lerp(bgR, srcR, alpha);
      data[pixelIdx + 1] = this.lerp(bgG, srcG, alpha);
      data[pixelIdx + 2] = this.lerp(bgB, srcB, alpha);
      data[pixelIdx + 3] = 255;
    }

    this.offscreenCtx.putImageData(this.offscreenImageData, 0, 0);

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(
      this.offscreenCanvas,
      0, 0, n, n,
      0, 0, this.canvas.width, this.canvas.height
    );
  }

  public drawSmokeParticle(x: number, y: number, radius: number, density: number): void {
    const d = this.clamp(density, 0, 1);
    const color = this.densityToColor(d);
    const alpha = d * 0.85;

    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.6})`);
    gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.25})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  public drawTrail(points: { x: number; y: number; alpha: number }[], radius: number): void {
    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];

      const alpha0 = p0.alpha * 0.6;
      const alpha1 = p1.alpha * 0.6;

      const width0 = radius * 2 * p0.alpha;
      const width1 = radius * 2 * p1.alpha;

      const gradient = this.ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      gradient.addColorStop(0, `rgba(255, 238, 221, ${alpha0})`);
      gradient.addColorStop(1, `rgba(255, 238, 221, ${alpha1 * 0.1})`);

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = (width0 + width1) / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(p0.x, p0.y);
      this.ctx.lineTo(p1.x, p1.y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  public clear(): void {
    this.ctx.fillStyle = `rgb(${this.bgColor.r}, ${this.bgColor.g}, ${this.bgColor.b})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
