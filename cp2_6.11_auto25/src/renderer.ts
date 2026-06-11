import type { Particle, AudioData, ControlParams, Star } from './types';

const COLD_START = { h: 210, s: 45, l: 22 };
const COLD_END   = { h: 204, s: 70, l: 52 };
const WARM_START = { h: 6,  s: 72, l: 55 };
const WARM_END   = { h: 36, s: 90, l: 51 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHSL(
  a: { h: number; s: number; l: number },
  b: { h: number; s: number; l: number },
  t: number
): { h: number; s: number; l: number } {
  return { h: lerp(a.h, b.h, t), s: lerp(a.s, b.s, t), l: lerp(a.l, b.l, t) };
}

function shiftHue(h: number, offset: number): number {
  return ((h + offset) % 360 + 360) % 360;
}

function getGradientColor(t: number, hueOffsetDeg: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const cold = lerpHSL(COLD_START, COLD_END, clamped);
  const warm = lerpHSL(WARM_START, WARM_END, clamped);
  const h = lerp(cold.h, warm.h, clamped) + hueOffsetDeg;
  const s = lerp(cold.s, warm.s, clamped);
  const l = lerp(cold.l, warm.l, clamped);
  return `hsl(${shiftHue(h, 0).toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private stars: Star[] = [];
  private particles: Particle[] = [];
  private lastAudioData: AudioData | null = null;
  private _width: number = 0;
  private _height: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
    this.generateStars();
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this._width = Math.max(1, Math.floor(rect.width));
    this._height = Math.max(1, Math.floor(rect.height));
    this.canvas.width = this._width * this.dpr;
    this.canvas.height = this._height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.generateStars();
  }

  private generateStars(): void {
    const count = Math.floor((this._width * this._height) / 9000);
    const stars: Star[] = new Array(count);
    for (let i = 0; i < count; i++) {
      stars[i] = {
        x: Math.random() * this._width,
        y: Math.random() * this._height * 0.9,
        size: Math.random() * 1.4 + 0.2,
        opacity: 0.25 + Math.random() * 0.6,
        twinkleSpeed: 0.3 + Math.random() * 1.4,
        twinklePhase: Math.random() * Math.PI * 2
      };
    }
    this.stars = stars;
  }

  setParticles(particles: Particle[]): void {
    this.particles = particles;
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }

  private drawBackground(_time: number): void {
    const ctx = this.ctx;
    const w = this._width;
    const h = this._height;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(
      w * 0.5, h * 0.25, Math.min(w, h) * 0.05,
      w * 0.5, h * 0.5,  Math.max(w, h) * 0.75
    );
    grad.addColorStop(0, 'rgba(11, 16, 30, 1)');
    grad.addColorStop(0.5, 'rgba(7, 10, 20, 0.9)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawStars(time: number): void {
    const ctx = this.ctx;
    const stars = this.stars;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const twinkle = 0.65 + 0.35 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.opacity * twinkle;
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  update(
    time: number,
    audioData: AudioData,
    controlParams: ControlParams,
    frameIndex: number
  ): void {
    this.lastAudioData = audioData;
    const particles = this.particles;
    const p = particles;
    const { speed, particleSize } = controlParams;

    const baseAmplitude = particleSize * 1.3;
    const bassWaveHeight = particleSize * 4.5 * audioData.bassAmplitude;
    const midWaveHeight = particleSize * 2.0 * audioData.midAmplitude;
    const localJitter = particleSize * 1.5 * audioData.highAmplitude;

    const sizeScale = particleSize / 14;

    for (let i = 0; i < p.length; i++) {
      const pt = p[i];

      const sinWave = Math.sin(pt.phase + time * pt.frequency * speed) * baseAmplitude;
      const globalWave = (
        Math.sin(i * 0.18 + time * speed * (audioData.bpm / 90) * 0.8) * bassWaveHeight +
        Math.sin(i * 0.35 + time * speed * 1.6) * midWaveHeight
      ) * pt.weight;
      const detailJitter = (Math.sin(time * 8.5 + pt.phase * 3.1) * 0.5 +
                           Math.cos(time * 12 + pt.phase * 1.7) * 0.5) * localJitter * pt.weight;

      pt.offsetY = sinWave + globalWave + detailJitter;
      pt.scale = 1 + audioData.bassAmplitude * 0.12 * pt.weight +
                    audioData.highAmplitude * 0.06;
      pt.fontSize = particleSize * sizeScale;
    }
    void frameIndex;
  }

  render(controlParams: ControlParams): void {
    const ctx = this.ctx;
    const w = this._width;
    const h = this._height;
    const particles = this.particles;
    const hueOffset = controlParams.hueOffset;

    ctx.clearRect(0, 0, w, h);
    this.drawBackground(0);

    const timeSec = performance.now() / 1000;
    this.drawStars(timeSec);

    if (particles.length === 0) return;

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';

    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      if (pt.char === ' ' || pt.char === '\u3000') continue;

      const x = pt.x;
      const y = pt.baseY + pt.offsetY;
      const fontSize = pt.fontSize * pt.scale;

      const baseColor = getGradientColor(pt.colorIndex, hueOffset);
      const audioBoost = this.lastAudioData
        ? this.lastAudioData.bassAmplitude * 0.15 + this.lastAudioData.midAmplitude * 0.1
        : 0;
      const opacity = Math.min(1, pt.opacity + audioBoost);

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y + fontSize * 0.15);
      ctx.lineTo(x, y + fontSize * 1.6 + Math.abs(pt.offsetY) * 0.3);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = `600 ${fontSize.toFixed(1)}px 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      ctx.globalAlpha = opacity * 0.22;
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = fontSize * 1.8;
      ctx.fillText(pt.char, x, y);
      ctx.restore();

      ctx.save();
      ctx.font = `600 ${fontSize.toFixed(1)}px 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = fontSize * 0.4;
      ctx.fillText(pt.char, x, y);
      ctx.restore();
    }
  }
}
