export interface WaveParams {
  amplitude: number;
  frequency: number;
  speed: number;
  layers: number;
  primaryColor: string;
  secondaryColor: string;
}

interface SmoothParams {
  amplitude: number;
  frequency: number;
  speed: number;
  layers: number;
  primaryColor: [number, number, number];
  secondaryColor: [number, number, number];
}

interface WaveLayer {
  phase: number;
  baseY: number;
  freqMult: number;
  ampMult: number;
  speedMult: number;
  noiseOffset: number;
}

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
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

  noise(x: number, y: number): number {
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

    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v
    );
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 198, 255];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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

  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
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

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class FluidWaveRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private params: SmoothParams;
  private targetParams: WaveParams;
  private layers: WaveLayer[] = [];
  private time: number = 0;
  private isPaused: boolean = false;
  private animationId: number | null = null;
  private dpr: number = 1;
  private perlin: PerlinNoise;
  private lastRenderTime: number = 0;
  private dirtyRect: { x: number; y: number; w: number; h: number } | null = null;

  constructor(canvas: HTMLCanvasElement, params: WaveParams) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.targetParams = { ...params };
    this.params = {
      amplitude: params.amplitude,
      frequency: params.frequency,
      speed: params.speed,
      layers: params.layers,
      primaryColor: hexToRgb(params.primaryColor),
      secondaryColor: hexToRgb(params.secondaryColor)
    };

    this.perlin = new PerlinNoise();
    this.initLayers();
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }

  private initLayers(): void {
    this.layers = [];
    for (let i = 0; i < 7; i++) {
      this.layers.push({
        phase: (i / 7) * Math.PI * 2,
        baseY: 0,
        freqMult: 1 + i * 0.15,
        ampMult: 1 - i * 0.08,
        speedMult: 1 + i * 0.1,
        noiseOffset: i * 100
      });
    }
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    const width = rect.width;
    const height = rect.height;
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].baseY = height * (0.55 + i * 0.06);
    }

    this.dirtyRect = { x: 0, y: 0, w: width, h: height };
  }

  setParams(params: Partial<WaveParams>): void {
    this.targetParams = { ...this.targetParams, ...params };
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastRenderTime = performance.now();
    }
  }

  togglePause(): boolean {
    if (this.isPaused) {
      this.resume();
      return false;
    } else {
      this.pause();
      return true;
    }
  }

  getPaused(): boolean {
    return this.isPaused;
  }

  private smoothStep(dt: number): void {
    const lerpFactor = 1 - Math.pow(0.001, dt);
    this.params.amplitude = lerp(this.params.amplitude, this.targetParams.amplitude, lerpFactor);
    this.params.frequency = lerp(this.params.frequency, this.targetParams.frequency, lerpFactor);
    this.params.speed = lerp(this.params.speed, this.targetParams.speed, lerpFactor);
    this.params.layers = lerp(this.params.layers, this.targetParams.layers, lerpFactor);

    const targetPrimary = hexToRgb(this.targetParams.primaryColor);
    const targetSecondary = hexToRgb(this.targetParams.secondaryColor);
    this.params.primaryColor = [
      lerp(this.params.primaryColor[0], targetPrimary[0], lerpFactor),
      lerp(this.params.primaryColor[1], targetPrimary[1], lerpFactor),
      lerp(this.params.primaryColor[2], targetPrimary[2], lerpFactor)
    ];
    this.params.secondaryColor = [
      lerp(this.params.secondaryColor[0], targetSecondary[0], lerpFactor),
      lerp(this.params.secondaryColor[1], targetSecondary[1], lerpFactor),
      lerp(this.params.secondaryColor[2], targetSecondary[2], lerpFactor)
    ];
  }

  private getLayerColor(layerIndex: number, totalLayers: number): string {
    const t = totalLayers <= 1 ? 0 : layerIndex / (totalLayers - 1);

    const [pr, pg, pb] = this.params.primaryColor;
    const [sr, sg, sb] = this.params.secondaryColor;

    const [ph, ps, pl] = rgbToHsl(pr, pg, pb);
    const [sh, ss, sl] = rgbToHsl(sr, sg, sb);

    const h = lerp(ph, sh, t);
    const s = lerp(ps, ss, t);
    const l = lerp(pl, sl, t);

    const [r, g, b] = hslToRgb(h, s, l);

    const alpha = 0.6 + t * 0.3;

    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha.toFixed(3)})`;
  }

  private getWaveY(x: number, layer: WaveLayer, width: number): number {
    const freq = this.params.frequency * layer.freqMult;
    const amp = this.params.amplitude * layer.ampMult;
    const phase = layer.phase + this.time * this.params.speed * layer.speedMult;

    const noiseX = (x + layer.noiseOffset) * 0.005;
    const noiseY = this.time * 0.1 + layer.noiseOffset * 0.01;
    const chaos = this.perlin.noise(noiseX, noiseY) * 2;

    const y = layer.baseY +
      Math.sin(x * freq + phase) * amp * 0.5 +
      Math.sin(x * freq * 1.7 + phase * 1.3) * amp * 0.3 +
      Math.sin(x * freq * 0.5 + phase * 0.7) * amp * 0.2 +
      chaos;

    return y;
  }

  private drawBackground(width: number, height: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a1a3a');
    gradient.addColorStop(1, '#123456');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawWave(layerIndex: number, width: number, height: number, totalLayers: number): void {
    const layer = this.layers[layerIndex];
    if (!layer) return;

    const color = this.getLayerColor(layerIndex, totalLayers);

    this.ctx.beginPath();
    this.ctx.moveTo(0, height);

    let minY = height;
    const step = 4;

    for (let x = 0; x <= width; x += step) {
      const y = this.getWaveY(x, layer, width);
      if (y < minY) minY = y;
      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(width, height);
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();

    if (this.dirtyRect) {
      if (minY < this.dirtyRect.y) this.dirtyRect.y = minY;
    }
  }

  private render(now: number): void {
    const dt = this.lastRenderTime === 0 ? 0.016 : Math.min((now - this.lastRenderTime) / 1000, 0.1);
    this.lastRenderTime = now;

    if (!this.isPaused) {
      this.time += dt;
      this.smoothStep(dt);
    }

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.dirtyRect = { x: 0, y: height, w: width, h: 0 };

    this.drawBackground(width, height);

    const activeLayers = Math.round(this.params.layers);
    for (let i = 0; i < activeLayers; i++) {
      this.drawWave(i, width, height, activeLayers);
    }

    this.animationId = requestAnimationFrame(this.render.bind(this));
  }

  start(): void {
    this.lastRenderTime = performance.now();
    this.animationId = requestAnimationFrame(this.render.bind(this));
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    window.removeEventListener('resize', this.resize.bind(this));
  }

  reset(params: WaveParams): void {
    this.targetParams = { ...params };
  }
}
