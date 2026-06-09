export interface EmotionColor {
  color: string;
  intensity: number;
}

export interface WaterColorOptions {
  width: number;
  height: number;
  seed?: number;
}

export type AnimationStage = 'idle' | 'base' | 'texture' | 'edge' | 'done';

class PerlinNoise {
  private perm: number[];

  constructor(seed: number = 0) {
    this.perm = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let n = seed || 1;
    for (let i = 255; i > 0; i--) {
      n = (n * 16807) % 2147483647;
      const j = Math.floor((n / 2147483647) * (i + 1));
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
    return (h & 1 ? -1 : 1) * u + (h & 2 ? -1 : 1) * v;
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y), u),
      this.lerp(this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  octaveNoise(x: number, y: number, octaves: number, persistence: number): number {
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  };
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class WaterColorEngine {
  private width: number;
  private height: number;
  private seed: number;
  private noise: PerlinNoise;

  constructor(options: WaterColorOptions) {
    this.width = options.width;
    this.height = options.height;
    this.seed = options.seed ?? Math.floor(Math.random() * 100000);
    this.noise = new PerlinNoise(this.seed);
  }

  private createCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.width;
    c.height = this.height;
    return c;
  }

  private drawBaseLayer(
    ctx: CanvasRenderingContext2D,
    emotions: EmotionColor[],
    progress: number = 1
  ): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxRadius = Math.min(this.width, this.height) * 0.55;

    emotions.forEach((em, idx) => {
      const intensity = em.intensity / 5;
      const angle = (idx / Math.max(emotions.length, 1)) * Math.PI * 2 + this.seed * 0.001;
      const offsetDist = maxRadius * 0.25 * intensity;
      const ex = cx + Math.cos(angle) * offsetDist;
      const ey = cy + Math.sin(angle) * offsetDist;
      const emotionProgress = Math.min(1, progress * 1.2 - idx * 0.08);
      if (emotionProgress <= 0) return;

      const baseRadius =
        (10 + intensity * 20) *
        (1 + this.noise.octaveNoise(idx * 0.5, 0, 3, 0.5) * 0.5) *
        emotionProgress;

      for (let layer = 0; layer < 3; layer++) {
        const layerRadius = baseRadius * (1 + layer * 0.6);
        const alpha = (0.15 + intensity * 0.25) * (1 - layer * 0.22) * Math.min(1, emotionProgress * 1.5);
        const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, layerRadius);
        grad.addColorStop(0, rgba(em.color, alpha));
        grad.addColorStop(0.6, rgba(em.color, alpha * 0.5));
        grad.addColorStop(1, rgba(em.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        const points = 80;
        for (let i = 0; i <= points; i++) {
          const t = (i / points) * Math.PI * 2;
          const noiseVal = this.noise.octaveNoise(
            Math.cos(t) * 1.5 + idx * 10 + layer * 3,
            Math.sin(t) * 1.5 + idx * 7 + layer * 5,
            3,
            0.5
          );
          const r = layerRadius * (0.7 + 0.45 * (0.5 + noiseVal * 0.5));
          const x = ex + Math.cos(t) * r;
          const y = ey + Math.sin(t) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  private drawTextureLayer(ctx: CanvasRenderingContext2D, progress: number = 1): void {
    const imgData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;
    const tp = Math.min(1, progress);

    for (let y = 0; y < this.height; y += 2) {
      for (let x = 0; x < this.width; x += 2) {
        const n = this.noise.octaveNoise(x * 0.02, y * 0.02, 4, 0.5);
        const fiber = (0.5 + n * 0.5) * tp;
        const paperVal = 240 + fiber * 15;
        const i = (y * this.width + x) * 4;
        data[i] = Math.min(255, data[i] + (paperVal - data[i]) * 0.08);
        data[i + 1] = Math.min(255, data[i + 1] + (paperVal * 0.98 - data[i + 1]) * 0.08);
        data[i + 2] = Math.min(255, data[i + 2] + (paperVal * 0.95 - data[i + 2]) * 0.08);
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const spotCount = Math.floor(60 * tp);
    for (let i = 0; i < spotCount; i++) {
      const sx = this.noise.noise(i * 12.9898, 78.233) * 0.5 + 0.5;
      const sy = this.noise.noise(i * 43.2312, 10.121) * 0.5 + 0.5;
      const sr = 2 + Math.abs(this.noise.noise(i * 5.123, 3.321)) * 12;
      const alpha = (0.03 + Math.abs(this.noise.noise(i * 2.1, 7.8)) * 0.08) * tp;
      const x = sx * this.width;
      const y = sy * this.height;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, sr);
      grad.addColorStop(0, `rgba(100, 90, 80, ${alpha})`);
      grad.addColorStop(1, 'rgba(100, 90, 80, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawEdgeLayer(
    ctx: CanvasRenderingContext2D,
    emotions: EmotionColor[],
    progress: number = 1
  ): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxRadius = Math.min(this.width, this.height) * 0.5;
    const ep = Math.min(1, progress);

    emotions.forEach((em, idx) => {
      const intensity = em.intensity / 5;
      const angle = (idx / Math.max(emotions.length, 1)) * Math.PI * 2 + this.seed * 0.001;
      const offsetDist = maxRadius * 0.22 * intensity;
      const ex = cx + Math.cos(angle) * offsetDist;
      const ey = cy + Math.sin(angle) * offsetDist;
      const radius =
        (25 + intensity * 28) *
        (1 + this.noise.octaveNoise(idx * 0.3, 0, 2, 0.5) * 0.3);

      const { r, g, b } = hexToRgb(em.color);
      ctx.strokeStyle = `rgba(${Math.floor(r * 0.5)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.5)}, ${0.35 * ep})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const points = 120;
      for (let i = 0; i <= points; i++) {
        const t = (i / points) * Math.PI * 2;
        const noiseVal = this.noise.octaveNoise(
          Math.cos(t) * 2.5 + idx * 5,
          Math.sin(t) * 2.5 + idx * 3,
          4,
          0.5
        );
        const edgeR = radius * (0.92 + 0.2 * (noiseVal * 0.5 + 0.5));
        const x = ex + Math.cos(t) * edgeR;
        const y = ey + Math.sin(t) * edgeR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = `rgba(40, 30, 20, ${0.12 * ep})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const t = (i / points) * Math.PI * 2;
        const noiseVal = this.noise.octaveNoise(
          Math.cos(t) * 3 + idx * 8 + 100,
          Math.sin(t) * 3 + idx * 6 + 100,
          4,
          0.5
        );
        const edgeR2 = radius * 1.08 * (0.95 + 0.15 * (noiseVal * 0.5 + 0.5));
        const x = ex + Math.cos(t) * edgeR2;
        const y = ey + Math.sin(t) * edgeR2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    });
  }

  render(emotions: EmotionColor[]): string {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FBF7F0';
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawBaseLayer(ctx, emotions, 1);
    this.drawTextureLayer(ctx, 1);
    this.drawEdgeLayer(ctx, emotions, 1);
    return canvas.toDataURL('image/png');
  }

  animate(
    emotions: EmotionColor[],
    targetCanvas: HTMLCanvasElement,
    onProgress?: (stage: AnimationStage, progress: number) => void
  ): () => void {
    const ctx = targetCanvas.getContext('2d')!;
    let rafId = 0;
    let cancelled = false;
    let startTime = 0;
    const TOTAL = 5000;
    const self = this;

    function renderFrame(timestamp: number) {
      if (cancelled) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / TOTAL);

      ctx.fillStyle = '#FBF7F0';
      ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

      let stage: AnimationStage = 'base';
      let baseP = 0;
      let texP = 0;
      let edgeP = 0;

      if (t < 0.3) {
        stage = 'base';
        baseP = t / 0.3;
      } else if (t < 0.6) {
        stage = 'texture';
        baseP = 1;
        texP = (t - 0.3) / 0.3;
      } else if (t < 0.9) {
        stage = 'edge';
        baseP = 1;
        texP = 1;
        edgeP = (t - 0.6) / 0.3;
      } else {
        stage = 'done';
        baseP = 1;
        texP = 1;
        edgeP = 1;
      }

      self.drawBaseLayer(ctx, emotions, baseP);
      if (t >= 0.3) self.drawTextureLayer(ctx, texP);
      if (t >= 0.6) self.drawEdgeLayer(ctx, emotions, edgeP);

      onProgress?.(stage, t);
      if (t < 1) {
        rafId = requestAnimationFrame(renderFrame);
      } else {
        onProgress?.('done', 1);
      }
    }

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }

  getDominantColor(emotions: EmotionColor[]): string {
    if (emotions.length === 0) return '#CCCCCC';
    let totalIntensity = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    emotions.forEach((e) => {
      const rgb = hexToRgb(e.color);
      r += rgb.r * e.intensity;
      g += rgb.g * e.intensity;
      b += rgb.b * e.intensity;
      totalIntensity += e.intensity;
    });
    if (totalIntensity === 0) return emotions[0].color;
    const hex = (n: number) => Math.floor(n / totalIntensity).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
}

export function renderThumbnail(
  emotions: EmotionColor[],
  size: number = 600
): string {
  const engine = new WaterColorEngine({ width: size, height: size });
  return engine.render(emotions);
}

export function getDominantColor(emotions: EmotionColor[]): string {
  const engine = new WaterColorEngine({ width: 1, height: 1 });
  return engine.getDominantColor(emotions);
}
