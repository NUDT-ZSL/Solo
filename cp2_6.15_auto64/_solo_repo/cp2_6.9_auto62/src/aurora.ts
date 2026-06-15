export interface AuroraConfig {
  bandCount: number;
  speed: number;
  hueOffset: number;
}

interface TrailPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  timestamp: number;
}

interface Band {
  baseWidth: number;
  baseColors: [string, string];
  phase: number;
}

const DEFAULT_COLORS: Array<[string, string]> = [
  ['#00ff7f', '#00ced1'],
  ['#ff69b4', '#6a5acd'],
  ['#ffa500', '#ff4500'],
  ['#7fff00', '#00fa9a'],
  ['#ff1493', '#8a2be2'],
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
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
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
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
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function shiftHue(hex: string, offset: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newH = ((h + offset) % 360 + 360) % 360;
  const [nr, ng, nb] = hslToRgb(newH, s, l);
  return `rgb(${nr},${ng},${nb})`;
}

function boostSaturation(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newS = Math.min(100, s * (1 + amount));
  const [nr, ng, nb] = hslToRgb(h, newS, l);
  return `rgb(${nr},${ng},${nb})`;
}

export class AuroraEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trail: TrailPoint[] = [];
  private bands: Band[] = [];
  private config: AuroraConfig;
  private mouseX = 0;
  private mouseY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private currentSpeed = 0;
  private running = false;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;
  private noiseCanvas: HTMLCanvasElement;
  private noiseCtx: CanvasRenderingContext2D;
  private starCanvas: HTMLCanvasElement;
  private starCtx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private overlapPulse = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.config = {
      bandCount: 3,
      speed: 0.5,
      hueOffset: 0,
    };

    this.noiseCanvas = document.createElement('canvas');
    this.noiseCtx = this.noiseCanvas.getContext('2d')!;
    this.starCanvas = document.createElement('canvas');
    this.starCtx = this.starCanvas.getContext('2d')!;
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d')!;

    this.initBands();
    this.resize();
  }

  private initBands() {
    this.bands = [];
    for (let i = 0; i < this.config.bandCount; i++) {
      const colorIdx = i % DEFAULT_COLORS.length;
      this.bands.push({
        baseWidth: 60 + Math.random() * 60,
        baseColors: DEFAULT_COLORS[colorIdx],
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.noiseCanvas.width = w;
    this.noiseCanvas.height = h;
    this.generateNoise();

    this.starCanvas.width = w;
    this.starCanvas.height = h;
    this.generateStars();

    this.bgCanvas.width = w;
    this.bgCanvas.height = h;
    this.generateBackground();
  }

  private generateBackground() {
    const ctx = this.bgCtx;
    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(1, '#000011');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private generateNoise() {
    const ctx = this.noiseCtx;
    const w = this.noiseCanvas.width;
    const h = this.noiseCanvas.height;
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.02) {
        const v = 200 + Math.random() * 55;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = 255;
        data[i + 3] = 20;
      } else {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  private generateStars() {
    const ctx = this.starCtx;
    const w = this.starCanvas.width;
    const h = this.starCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const count = Math.floor(w * h * 0.0003);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.2;
      const alpha = 0.3 + Math.random() * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
  }

  setConfig(partial: Partial<AuroraConfig>) {
    const oldCount = this.config.bandCount;
    this.config = { ...this.config, ...partial };
    if (partial.bandCount !== undefined && partial.bandCount !== oldCount) {
      this.initBands();
    }
  }

  getConfig(): AuroraConfig {
    return { ...this.config };
  }

  getMouseInfo() {
    return {
      x: Math.round(this.mouseX),
      y: Math.round(this.mouseY),
      speed: this.currentSpeed,
      bandWidth: this.getEffectiveBandWidth(),
      dominantColor: this.getDominantColor(),
    };
  }

  private getEffectiveBandWidth(): number {
    const avgWidth = this.bands.reduce((s, b) => s + b.baseWidth, 0) / (this.bands.length || 1);
    const speedBoost = 1 + Math.min(this.currentSpeed / 10, 1) * 0.3;
    return Math.round(avgWidth * speedBoost);
  }

  private getDominantColor(): string {
    if (this.bands.length === 0) return '#00ff7f';
    const [c1] = this.bands[0].baseColors;
    return shiftHue(c1, this.config.hueOffset);
  }

  updateMouse(x: number, y: number) {
    const now = performance.now();
    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max(1, now - (this.trail.length > 0 ? this.trail[this.trail.length - 1].timestamp : now - 16));
    const instantSpeed = dist / dt * 16;

    this.currentSpeed = this.currentSpeed * 0.85 + instantSpeed * 0.15;

    this.trail.push({
      x, y, vx: dx, vy: dy,
      speed: this.currentSpeed,
      timestamp: now,
    });

    const maxTrail = 40;
    if (this.trail.length > maxTrail) {
      this.trail.splice(0, this.trail.length - maxTrail);
    }

    this.lastMouseX = x;
    this.lastMouseY = y;
    this.mouseX = x;
    this.mouseY = y;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    this.overlapPulse = (now / 1000) * (Math.PI * 2 / 1.2);
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  getFPS(): number {
    return this.fps;
  }

  private render() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.bgCanvas, 0, 0);

    const twinkle = 0.5 + Math.sin(performance.now() / 500) * 0.2;
    ctx.globalAlpha = 0.08 * twinkle;
    ctx.drawImage(this.noiseCanvas, 0, 0);
    ctx.globalAlpha = 1;

    ctx.drawImage(this.starCanvas, 0, 0);

    if (this.trail.length < 2) return;

    const speedBoost = 1 + Math.min(this.currentSpeed / 10, 1) * 0.3;
    const satBoost = Math.min(this.currentSpeed / 10, 1) * 0.2;
    const flowSpeed = 0.5 + this.config.speed + Math.min(this.currentSpeed / 15, 1) * 1.5;

    ctx.globalCompositeOperation = 'screen';

    for (let b = 0; b < this.bands.length; b++) {
      const band = this.bands[b];
      this.renderBand(ctx, band, b, speedBoost, satBoost, flowSpeed);
    }

    ctx.globalCompositeOperation = 'source-over';

    this.renderOverlapGlow(ctx);
  }

  private renderBand(
    ctx: CanvasRenderingContext2D,
    band: Band,
    bandIdx: number,
    speedBoost: number,
    satBoost: number,
    flowSpeed: number
  ) {
    const trail = this.trail;
    if (trail.length < 2) return;

    const baseWidth = band.baseWidth * speedBoost;
    const offset = (bandIdx - (this.bands.length - 1) / 2) * 25;
    const color1 = shiftHue(boostSaturation(band.baseColors[0], satBoost), this.config.hueOffset);
    const color2 = shiftHue(boostSaturation(band.baseColors[1], satBoost), this.config.hueOffset);

    const time = performance.now() / 1000;

    ctx.save();

    for (let pass = 0; pass < 3; pass++) {
      const blur = 25 - pass * 8;
      const alpha = pass === 0 ? 0.25 : pass === 1 ? 0.5 : 0.8;
      const widthMult = pass === 0 ? 1.6 : pass === 1 ? 1.15 : 0.85;

      ctx.beginPath();

      let first = true;
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const progress = i / trail.length;
        const fadeIn = Math.min(1, progress * 3);
        const fadeOut = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
        const life = fadeIn * fadeOut;

        const wobble = Math.sin(time * 2 + band.phase + i * 0.3) * 8 * life;
        const perpAngle = this.getPerpendicularAngle(i) + Math.PI / 2;
        const normalOffset = offset + wobble;
        const px = p.x + Math.cos(perpAngle) * normalOffset;
        const py = p.y + Math.sin(perpAngle) * normalOffset;

        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = baseWidth * widthMult;

      const grad = ctx.createLinearGradient(
        trail[0].x, trail[0].y,
        trail[trail.length - 1].x, trail[trail.length - 1].y
      );
      grad.addColorStop(0, this.withAlpha(color1, 0));
      grad.addColorStop(0.2, this.withAlpha(color1, alpha * 0.8));
      grad.addColorStop(0.5, this.withAlpha(color2, alpha));
      grad.addColorStop(0.8, this.withAlpha(color2, alpha * 0.8));
      grad.addColorStop(1, this.withAlpha(color1, 0));

      ctx.strokeStyle = grad;
      ctx.filter = `blur(${blur}px)`;
      ctx.stroke();

      if (pass === 2) {
        this.renderStripes(ctx, bandIdx, baseWidth, flowSpeed, time, color1, color2);
      }
    }

    ctx.restore();
    ctx.filter = 'none';
  }

  private renderStripes(
    ctx: CanvasRenderingContext2D,
    bandIdx: number,
    baseWidth: number,
    flowSpeed: number,
    time: number,
    color1: string,
    color2: string
  ) {
    const trail = this.trail;
    if (trail.length < 2) return;

    const offset = (bandIdx - (this.bands.length - 1) / 2) * 25;
    const stripeCount = 5;

    for (let s = 0; s < stripeCount; s++) {
      const stripeProgress = ((time * flowSpeed * 60) % 100) / 100 + s / stripeCount;
      const idx = Math.floor(stripeProgress * (trail.length - 1));
      if (idx < 0 || idx >= trail.length) continue;

      const p = trail[idx];
      const stripePhase = Math.sin(time * 4 + s * 0.8 + bandIdx) * 0.5 + 0.5;
      const perpAngle = this.getPerpendicularAngle(idx) + Math.PI / 2;
      const stripeOffset = offset + (s - stripeCount / 2) * (baseWidth / stripeCount);

      const brightness = 0.4 + stripePhase * 0.6;
      const mixColor = this.mixColors(color1, color2, stripePhase);

      ctx.beginPath();
      ctx.arc(
        p.x + Math.cos(perpAngle) * stripeOffset,
        p.y + Math.sin(perpAngle) * stripeOffset,
        baseWidth * 0.35 * brightness,
        0, Math.PI * 2
      );
      const stripeGrad = ctx.createRadialGradient(
        p.x + Math.cos(perpAngle) * stripeOffset,
        p.y + Math.sin(perpAngle) * stripeOffset,
        0,
        p.x + Math.cos(perpAngle) * stripeOffset,
        p.y + Math.sin(perpAngle) * stripeOffset,
        baseWidth * 0.4
      );
      stripeGrad.addColorStop(0, this.withAlpha(mixColor, 0.6 * brightness));
      stripeGrad.addColorStop(1, this.withAlpha(mixColor, 0));
      ctx.fillStyle = stripeGrad;
      ctx.fill();
    }
  }

  private getPerpendicularAngle(idx: number): number {
    const trail = this.trail;
    if (trail.length < 2) return 0;
    const i = Math.max(0, Math.min(idx, trail.length - 2));
    const p1 = trail[i];
    const p2 = trail[i + 1];
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  private withAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const [r, g, b] = hexToRgb(color);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
    }
    return color;
  }

  private mixColors(c1: string, c2: string, t: number): string {
    const rgb1 = c1.startsWith('#') ? hexToRgb(c1) : this.parseRgb(c1);
    const rgb2 = c2.startsWith('#') ? hexToRgb(c2) : this.parseRgb(c2);
    const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
    const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
    const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);
    return `rgb(${r},${g},${b})`;
  }

  private parseRgb(s: string): [number, number, number] {
    const m = s.match(/\d+/g);
    if (!m) return [255, 255, 255];
    return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
  }

  private renderOverlapGlow(ctx: CanvasRenderingContext2D) {
    if (this.bands.length < 2 || this.trail.length < 2) return;

    const pulse = 0.6 + Math.sin(this.overlapPulse) * 0.3;
    const trail = this.trail;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < trail.length; i += 3) {
      const p = trail[i];
      const progress = i / trail.length;
      const fadeIn = Math.min(1, progress * 3);
      const fadeOut = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
      const life = fadeIn * fadeOut;

      const glowSize = 40 * life;
      if (glowSize < 5) continue;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
      grad.addColorStop(0, `rgba(255,255,255,${0.15 * pulse * life})`);
      grad.addColorStop(0.5, `rgba(200,150,255,${0.08 * pulse * life})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
