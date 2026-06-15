class PerlinNoise2D {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
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

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const p = this.permutation;
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);

    return this.lerp(x1, x2, v);
  }

  public octaveNoise(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

export class BackgroundFlow {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private noise: PerlinNoise2D;
  private startTime: number;

  private readonly BASE_HUE = 220;
  private readonly BASE_SAT = 10;
  private readonly BASE_LIGHT = 8;
  private readonly NOISE_INTENSITY = 0.5;
  private readonly WAVE_SPEED = 0.1;
  private readonly CYCLE_PERIOD = 30000;
  private readonly RESOLUTION = 1 / 8;

  private lastWidth = 0;
  private lastHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Offscreen canvas context not available');
    this.offscreenCtx = offCtx;

    this.noise = new PerlinNoise2D(42);
    this.startTime = performance.now();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    const offW = Math.max(1, Math.floor(width * this.RESOLUTION));
    const offH = Math.max(1, Math.floor(height * this.RESOLUTION));

    if (offW !== this.lastWidth || offH !== this.lastHeight) {
      this.offscreenCanvas.width = offW;
      this.offscreenCanvas.height = offH;
      this.lastWidth = offW;
      this.lastHeight = offH;
    }
  }

  public draw(now: number): void {
    const elapsed = now - this.startTime;
    const cycleT = (elapsed % this.CYCLE_PERIOD) / this.CYCLE_PERIOD;
    const phase = cycleT * Math.PI * 2;

    const offW = this.offscreenCanvas.width;
    const offH = this.offscreenCanvas.height;

    const imageData = this.offscreenCtx.createImageData(offW, offH);
    const data = imageData.data;

    const scaleX = 0.004;
    const scaleY = 0.004;
    const offsetX = Math.cos(phase) * 2 + elapsed * this.WAVE_SPEED * 0.001;
    const offsetY = Math.sin(phase) * 2 + elapsed * this.WAVE_SPEED * 0.0015;

    for (let y = 0; y < offH; y++) {
      for (let x = 0; x < offW; x++) {
        const nx = x * scaleX + offsetX;
        const ny = y * scaleY + offsetY;

        const n1 = this.noise.octaveNoise(nx, ny, 4, 0.5);
        const n2 = this.noise.octaveNoise(nx * 2.3 + 5.2, ny * 2.3 + 1.7, 2, 0.5);
        const noiseVal = (n1 + n2 * 0.5) / 1.5;

        const intensity = noiseVal * this.NOISE_INTENSITY;
        const lightness = this.BASE_LIGHT + intensity * 5;
        const saturation = this.BASE_SAT + intensity * 12;
        const hue = this.BASE_HUE + intensity * 20;

        const rgb = this.hslToRgb(
          ((hue % 360) + 360) % 360,
          Math.max(0, Math.min(100, saturation)),
          Math.max(0, Math.min(100, lightness))
        );

        const idx = (y * offW + x) * 4;
        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = 255;
      }
    }

    this.offscreenCtx.putImageData(imageData, 0, 0);

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(
      this.offscreenCanvas,
      0,
      0,
      offW,
      offH,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    this.ctx.restore();
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
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
