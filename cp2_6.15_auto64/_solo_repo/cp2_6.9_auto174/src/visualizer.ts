import { AudioData, ColorTheme, VisualizerMode, Particle, TransformState, THEME_PALETTES } from './types';

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private maxParticles = 500;
  private mode: VisualizerMode = VisualizerMode.BARS;
  private theme: ColorTheme = ColorTheme.AURORA;
  private targetTheme: ColorTheme = ColorTheme.AURORA;
  private themeTransitionProgress = 1;
  private transform: TransformState = {
    offsetX: 0,
    offsetY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    scale: 1
  };
  private isDragging = false;
  private hueOffset = 0;

  constructor(canvas: HTMLCanvasElement, previewCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.previewCanvas = previewCanvas;
    this.previewCtx = previewCanvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.previewCanvas.width = this.previewCanvas.offsetWidth * window.devicePixelRatio;
    this.previewCanvas.height = this.previewCanvas.offsetHeight * window.devicePixelRatio;
    this.previewCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  setMode(mode: VisualizerMode): void {
    this.mode = mode;
  }

  setTheme(theme: ColorTheme): void {
    if (this.theme !== theme) {
      this.targetTheme = theme;
      this.themeTransitionProgress = 0;
    }
  }

  setDragging(dragging: boolean): void {
    this.isDragging = dragging;
    if (!dragging) {
      this.transform.targetOffsetX = 0;
      this.transform.targetOffsetY = 0;
    }
  }

  setDragOffset(dx: number, dy: number): void {
    if (this.isDragging) {
      this.transform.targetOffsetX = dx;
      this.transform.targetOffsetY = dy;
      this.transform.offsetX = dx;
      this.transform.offsetY = dy;
    }
  }

  setScale(scale: number): void {
    this.transform.scale = Math.max(0.5, Math.min(3.0, scale));
  }

  getScale(): number {
    return this.transform.scale;
  }

  render(data: AudioData): void {
    this.updateThemeTransition();
    this.updateTransform();
    this.hueOffset = (this.hueOffset + data.highFrequency * 0.5) % 360;

    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;

    this.ctx.save();
    this.clearBackground(w, h);
    this.ctx.translate(w / 2 + this.transform.offsetX, h / 2 + this.transform.offsetY);
    this.ctx.scale(this.transform.scale, this.transform.scale);

    switch (this.mode) {
      case VisualizerMode.BARS:
        this.drawBars(data, w, h);
        break;
      case VisualizerMode.PARTICLES:
        this.drawParticles(data, w, h);
        break;
      case VisualizerMode.WAVE:
        this.drawWave(data, w, h);
        break;
    }

    this.ctx.restore();
    this.renderPreview(data);
  }

  private updateThemeTransition(): void {
    if (this.themeTransitionProgress < 1) {
      this.themeTransitionProgress = Math.min(1, this.themeTransitionProgress + 0.02);
      if (this.themeTransitionProgress >= 1) {
        this.theme = this.targetTheme;
      }
    }
  }

  private updateTransform(): void {
    if (!this.isDragging) {
      const spring = 0.3;
      this.transform.offsetX += (this.transform.targetOffsetX - this.transform.offsetX) * spring;
      this.transform.offsetY += (this.transform.targetOffsetY - this.transform.offsetY) * spring;
    }
  }

  private clearBackground(w: number, h: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0A0A1A');
    gradient.addColorStop(1, '#1A1A3A');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(-w / 2 - this.transform.offsetX, -h / 2 - this.transform.offsetY, w, h);
  }

  private getInterpolatedColor(t: number): string {
    const currentColors = THEME_PALETTES[this.theme];
    const targetColors = THEME_PALETTES[this.targetTheme];
    const prog = this.themeTransitionProgress;

    const lerp = (ca: string, cb: string, p: number) => {
      const ah = parseInt(ca.slice(1), 16);
      const bh = parseInt(cb.slice(1), 16);
      const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
      const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
      const r = Math.round(ar + (br - ar) * p);
      const g = Math.round(ag + (bg - ag) * p);
      const bl = Math.round(ab + (bb - ab) * p);
      return `rgb(${r},${g},${bl})`;
    };

    const start = lerp(currentColors.start, targetColors.start, prog);
    const end = lerp(currentColors.end, targetColors.end, prog);

    const parseRGB = (s: string) => {
      const m = s.match(/\d+/g)!;
      return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
    };

    const [sr, sg, sb] = parseRGB(start);
    const [er, eg, eb] = parseRGB(end);
    const r = Math.round(sr + (er - sr) * t);
    const g = Math.round(sg + (eg - sg) * t);
    const bl = Math.round(sb + (eb - sb) * t);
    return `rgb(${r},${g},${bl})`;
  }

  private drawBars(data: AudioData, w: number, h: number): void {
    const barCount = 64;
    const step = Math.floor(data.frequencyData.length / barCount);
    const barWidth = (w * 0.8) / barCount;
    const gap = barWidth * 0.2;

    for (let i = 0; i < barCount; i++) {
      const value = data.frequencyData[i * step] / 255;
      const barHeight = value * h * 0.4;
      const x = -w * 0.4 + i * barWidth;
      const colorT = i / barCount;
      const color = this.getInterpolatedColor(colorT);

      this.ctx.fillStyle = color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = color;
      this.ctx.fillRect(x + gap / 2, h * 0.4 - barHeight, barWidth - gap, barHeight);
    }
    this.ctx.shadowBlur = 0;
  }

  private drawParticles(data: AudioData, w: number, h: number): void {
    const targetCount = Math.floor(50 + data.lowFrequency * 3);
    while (this.particles.length < Math.min(targetCount, this.maxParticles)) {
      this.particles.push(this.createParticle(w, h));
    }
    while (this.particles.length > targetCount) {
      this.particles.pop();
    }

    for (const p of this.particles) {
      p.vx += (Math.random() - 0.5) * data.averageFrequency * 0.01;
      p.vy += (Math.random() - 0.5) * data.averageFrequency * 0.01 - 0.1;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.005;
      p.hue = (this.hueOffset + data.highFrequency + p.hue) % 360;

      const color = this.getInterpolatedColor((Math.sin(p.hue * 0.017) + 1) / 2);

      if (p.life > 0 && Math.abs(p.x) < w / 2 && Math.abs(p.y) < h / 2) {
        this.ctx.globalAlpha = p.life;
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size + data.averageFrequency * 0.02, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        Object.assign(p, this.createParticle(w, h));
      }
    }
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
  }

  private createParticle(w: number, h: number): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2;
    return {
      x: (Math.random() - 0.5) * w * 0.6,
      y: (Math.random() - 0.5) * h * 0.6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3 + 1,
      hue: Math.random() * 360,
      life: Math.random() * 0.5 + 0.5
    };
  }

  private drawWave(data: AudioData, w: number, h: number): void {
    const lineWidth = 2 + data.volume * 8;

    for (let layer = 0; layer < 3; layer++) {
      this.ctx.beginPath();
      this.ctx.lineWidth = lineWidth * (1 - layer * 0.3);
      this.ctx.globalAlpha = 1 - layer * 0.3;
      const colorT = layer / 3;
      this.ctx.strokeStyle = this.getInterpolatedColor(colorT);
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = this.getInterpolatedColor(colorT);

      const sliceWidth = (w * 0.9) / data.timeDomainData.length;
      let x = -w * 0.45;

      for (let i = 0; i < data.timeDomainData.length; i++) {
        const v = data.timeDomainData[i] / 128.0;
        const y = (v - 1) * (h * 0.2) + Math.sin(i * 0.02 + this.hueOffset * 0.01) * (10 + data.lowFrequency * 0.1);
        const layerY = y + (layer - 1) * 10;

        if (i === 0) {
          this.ctx.moveTo(x, layerY);
        } else {
          this.ctx.lineTo(x, layerY);
        }
        x += sliceWidth;
      }
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
  }

  private renderPreview(data: AudioData): void {
    const w = this.previewCanvas.offsetWidth;
    const h = this.previewCanvas.offsetHeight;

    this.previewCtx.fillStyle = 'rgba(10, 10, 26, 0.9)';
    this.previewCtx.fillRect(0, 0, w, h);

    const barCount = 32;
    const step = Math.floor(data.frequencyData.length / barCount);
    const barWidth = w / barCount;

    for (let i = 0; i < barCount; i++) {
      const value = data.frequencyData[i * step] / 255;
      const barHeight = value * h;
      this.previewCtx.fillStyle = this.getInterpolatedColor(i / barCount);
      this.previewCtx.fillRect(i * barWidth + 1, h - barHeight, barWidth - 2, barHeight);
    }
  }
}
