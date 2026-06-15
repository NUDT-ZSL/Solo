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

  private densityToColor(density: number): { r: number; g: number; b: number } {
    const d = Math.max(0, Math.min(1, density));

    const baseR = this.lerp(this.colorDark.r, this.colorLight.r, d);
    const baseG = this.lerp(this.colorDark.g, this.colorLight.g, d);
    const baseB = this.lerp(this.colorDark.b, this.colorLight.b, d);

    if (d > 0.9) {
      const highlightT = (d - 0.9) / 0.1;
      return {
        r: Math.min(255, this.lerp(baseR, this.colorHighlight.r, highlightT)),
        g: Math.min(255, this.lerp(baseG, this.colorHighlight.g, highlightT)),
        b: Math.min(255, this.lerp(baseB, this.colorHighlight.b, highlightT)),
      };
    }

    return { r: baseR, g: baseG, b: baseB };
  }

  private bilinearSample(density: Float32Array, x: number, y: number): number {
    const n = this.gridSize;
    const fx = x * (n - 1);
    const fy = y * (n - 1);

    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, n - 1);
    const y1 = Math.min(y0 + 1, n - 1);

    const tx = fx - x0;
    const ty = fy - y0;

    const d00 = density[x0 + y0 * n];
    const d10 = density[x1 + y0 * n];
    const d01 = density[x0 + y1 * n];
    const d11 = density[x1 + y1 * n];

    const d0 = this.lerp(d00, d10, tx);
    const d1 = this.lerp(d01, d11, tx);
    return this.lerp(d0, d1, ty);
  }

  public render(density: Float32Array): void {
    const n = this.gridSize;
    const data = this.offscreenImageData.data;
    const lut = this.colorLookupTable;

    for (let i = 0; i < n * n; i++) {
      const d = Math.max(0, Math.min(1, density[i]));
      const lutIdx = Math.floor(d * 255) * 4;
      const pixelIdx = i * 4;
      data[pixelIdx] = lut[lutIdx];
      data[pixelIdx + 1] = lut[lutIdx + 1];
      data[pixelIdx + 2] = lut[lutIdx + 2];
      data[pixelIdx + 3] = 255;
    }

    this.offscreenCtx.putImageData(this.offscreenImageData, 0, 0);

    this.ctx.drawImage(
      this.offscreenCanvas,
      0, 0, n, n,
      0, 0, this.canvas.width, this.canvas.height
    );
  }

  public drawSmokeParticle(x: number, y: number, radius: number, density: number): void {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    const color = this.densityToColor(density);
    const alpha = density * 0.8;

    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public drawTrail(points: { x: number; y: number; alpha: number }[], radius: number): void {
    if (points.length < 2) return;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const alpha = p1.alpha;

      const gradient = this.ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      gradient.addColorStop(0, `rgba(255, 238, 221, ${p0.alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(255, 238, 221, 0)`);

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = radius * 2 * alpha;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(p0.x, p0.y);
      this.ctx.lineTo(p1.x, p1.y);
      this.ctx.stroke();
    }
  }
}
