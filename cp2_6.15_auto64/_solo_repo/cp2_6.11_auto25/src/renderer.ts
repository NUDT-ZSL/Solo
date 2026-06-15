import type { Particle, AudioData, ControlParams, Star } from './types';

const COLD_START = { h: 210, s: 45, l: 22 };
const COLD_END   = { h: 204, s: 70, l: 52 };
const WARM_START = { h: 6,  s: 72, l: 55 };
const WARM_END   = { h: 36, s: 90, l: 51 };

const HUE_DRIFT_DEG_PER_SEC = 0.5;

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

function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function getParticleHue(
  colorIndex: number,
  colorPhase: number,
  timeSec: number,
  colorSpeed: number,
  globalHueOffset: number
): number {
  const cold = lerpHSL(COLD_START, COLD_END, colorIndex);
  const warm = lerpHSL(WARM_START, WARM_END, colorIndex);
  const baseHue = lerp(cold.h, warm.h, colorIndex);
  const drift = colorPhase + timeSec * colorSpeed * HUE_DRIFT_DEG_PER_SEC * 12 + globalHueOffset;
  return wrapHue(baseHue + drift * 0.35);
}

function getParticleColor(
  colorIndex: number,
  colorPhase: number,
  timeSec: number,
  colorSpeed: number,
  globalHueOffset: number
): { h: number; s: number; l: number } {
  const cold = lerpHSL(COLD_START, COLD_END, colorIndex);
  const warm = lerpHSL(WARM_START, WARM_END, colorIndex);
  const baseS = lerp(cold.s, warm.s, colorIndex);
  const baseL = lerp(cold.l, warm.l, colorIndex);
  return {
    h: getParticleHue(colorIndex, colorPhase, timeSec, colorSpeed, globalHueOffset),
    s: baseS,
    l: baseL
  };
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
  private _time: number = 0;

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

  private drawBackground(): void {
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
    this._time = time;
    this.lastAudioData = audioData;
    const particles = this.particles;
    const { speed, particleSize } = controlParams;

    const bassNorm = Math.max(0, Math.min(1, audioData.bassAmplitude));
    const midNorm = Math.max(0, Math.min(1, audioData.midAmplitude));
    const highNorm = Math.max(0, Math.min(1, audioData.highAmplitude));

    const bassWeight = 5.5;
    const midWeight = 2.5;
    const highWeight = 1.2;

    const baseAmplitude = particleSize * 1.2;
    const bassWaveHeight = particleSize * bassWeight * bassNorm;
    const midWaveHeight = particleSize * midWeight * midNorm;
    const localJitter = particleSize * highWeight * highNorm;

    const bpmFactor = audioData.bpm / 90;

    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];

      const sinWave = Math.sin(pt.phase + time * pt.frequency * speed) * baseAmplitude;

      const globalBassWave = Math.sin(i * 0.12 + time * speed * bpmFactor * 0.6)
        * bassWaveHeight * pt.weight;
      const globalMidWave = Math.sin(i * 0.28 + time * speed * 1.4)
        * midWaveHeight * pt.weight * 0.7;

      const detailJitter = (
        Math.sin(time * 9 + pt.phase * 2.7) * 0.5 +
        Math.cos(time * 13 + pt.phase * 1.9) * 0.3 +
        Math.sin(time * 17 + pt.phase * 3.4) * 0.2
      ) * localJitter * pt.weight;

      pt.offsetY = sinWave + globalBassWave + globalMidWave + detailJitter;

      pt.scale = 1 + bassNorm * 0.15 * pt.weight + highNorm * 0.05;
      pt.fontSize = particleSize;
    }
    void frameIndex;
  }

  render(controlParams: ControlParams): void {
    const ctx = this.ctx;
    const w = this._width;
    const h = this._height;
    const particles = this.particles;
    const timeSec = this._time;
    const hueOffset = controlParams.hueOffset;

    ctx.clearRect(0, 0, w, h);
    this.drawBackground();
    this.drawStars(timeSec);

    if (particles.length === 0) return;

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';

    const audioBoost = this.lastAudioData
      ? this.lastAudioData.bassAmplitude * 0.12 + this.lastAudioData.midAmplitude * 0.08
      : 0;

    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      if (pt.char === ' ' || pt.char === '\u3000') continue;

      const x = pt.x;
      const y = pt.baseY + pt.offsetY;
      const fontSize = pt.fontSize * pt.scale;

      const color = getParticleColor(
        pt.colorIndex,
        pt.colorPhase,
        timeSec,
        pt.colorSpeed,
        hueOffset
      );
      const hslStr = `hsl(${color.h.toFixed(1)}, ${color.s.toFixed(1)}%, ${color.l.toFixed(1)}%)`;

      const opacity = Math.min(1, pt.opacity + audioBoost * pt.weight);

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = hslStr;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y + fontSize * 0.15);
      ctx.lineTo(x, y + fontSize * 1.6 + Math.abs(pt.offsetY) * 0.3);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = `600 ${fontSize.toFixed(1)}px 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      ctx.globalAlpha = opacity * 0.22;
      ctx.fillStyle = hslStr;
      ctx.shadowColor = hslStr;
      ctx.shadowBlur = fontSize * 1.8;
      ctx.fillText(pt.char, x, y);
      ctx.restore();

      ctx.save();
      ctx.font = `600 ${fontSize.toFixed(1)}px 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = hslStr;
      ctx.shadowColor = hslStr;
      ctx.shadowBlur = fontSize * 0.4;
      ctx.fillText(pt.char, x, y);
      ctx.restore();
    }
  }
}
