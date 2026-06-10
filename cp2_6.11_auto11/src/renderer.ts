import { Rune } from './rune';
import { EffectManager, Crack } from './effectManager';

const COLOR_DEEP_BLUE = '#0D1B2A';
const COLOR_DARK_PURPLE = '#1B0A2E';
const COLOR_GOLD = '#E8D48B';
const COLOR_GOLD_BORDER = '#C5A55A';
const COLOR_CYAN = '#00FFC8';
const COLOR_ROSE = '#FF6B8A';

export interface SteleConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;
  stars: { x: number; y: number; size: number; alpha: number; twinkleSpeed: number }[] = [];
  bgCanvas: HTMLCanvasElement;
  bgCtx: CanvasRenderingContext2D;
  frostCanvas: HTMLCanvasElement;
  frostCtx: CanvasRenderingContext2D;
  steleBodyCanvas: HTMLCanvasElement;
  steleBodyCtx: CanvasRenderingContext2D;
  lastSteleSize: { w: number; h: number; isGolden: boolean; goldenT: number } = { w: 0, h: 0, isGolden: false, goldenT: 0 };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d')!;
    this.frostCanvas = document.createElement('canvas');
    this.frostCtx = this.frostCanvas.getContext('2d')!;
    this.steleBodyCanvas = document.createElement('canvas');
    this.steleBodyCtx = this.steleBodyCanvas.getContext('2d')!;
    this.generateStars(150);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.bgCanvas.width = width;
    this.bgCanvas.height = height;
    this.renderBackgroundToCache();
  }

  private generateStars(count: number): void {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.002 + 0.001,
      });
    }
  }

  private renderBackgroundToCache(): void {
    const ctx = this.bgCtx;
    const w = this.width;
    const h = this.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, COLOR_DEEP_BLUE);
    gradient.addColorStop(1, COLOR_DARK_PURPLE);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const radialGradient = ctx.createRadialGradient(
      w * 0.3, h * 0.4, 0,
      w * 0.3, h * 0.4, w * 0.6
    );
    radialGradient.addColorStop(0, 'rgba(27, 10, 46, 0.5)');
    radialGradient.addColorStop(1, 'rgba(13, 27, 42, 0)');
    ctx.fillStyle = radialGradient;
    ctx.fillRect(0, 0, w, h);
  }

  drawBackground(time: number): void {
    const ctx = this.ctx;
    ctx.drawImage(this.bgCanvas, 0, 0);

    for (const star of this.stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed) * 0.3 + 0.7;
      const alpha = star.alpha * twinkle;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * this.width, star.y * this.height, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawStele(
    config: SteleConfig,
    shakeOffsetX: number,
    cracks: Crack[],
    isGolden: boolean,
    goldenTransition: number
  ): void {
    const ctx = this.ctx;
    const { x, y, w, h, rotation } = config;

    ctx.save();
    ctx.translate(x + w / 2 + shakeOffsetX, y + h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);

    const baseColor = isGolden
      ? this.lerpColor('#6B6B6B', COLOR_GOLD, goldenTransition)
      : '#6B6B6B';
    const lightColor = isGolden
      ? this.lerpColor('#8A8A8A', '#F5E6A8', goldenTransition)
      : '#8A8A8A';
    const darkColor = isGolden
      ? this.lerpColor('#4A4A4A', '#B8963A', goldenTransition)
      : '#4A4A4A';
    const borderColor = isGolden
      ? this.lerpColor(COLOR_GOLD_BORDER, '#FFD700', goldenTransition)
      : COLOR_GOLD_BORDER;

    const borderGlow = isGolden ? 20 + goldenTransition * 15 : 8;

    ctx.shadowColor = borderColor;
    ctx.shadowBlur = borderGlow;

    const radius = 12;
    this.roundRect(ctx, 0, 0, w, h, radius);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowBlur = 0;

    const bodyGradient = ctx.createLinearGradient(0, 0, w, h);
    bodyGradient.addColorStop(0, lightColor);
    bodyGradient.addColorStop(0.5, baseColor);
    bodyGradient.addColorStop(1, darkColor);
    ctx.fillStyle = bodyGradient;
    this.roundRect(ctx, 0, 0, w, h, radius);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.roundRect(ctx, 0, 0, w, h, radius);
    ctx.fill();

    this.drawCracks(ctx, cracks, w, h, isGolden, goldenTransition);

    this.drawFrostedGlass(ctx, w, h);

    ctx.restore();
  }

  private drawCracks(
    ctx: CanvasRenderingContext2D,
    cracks: Crack[],
    w: number,
    h: number,
    isGolden: boolean,
    goldenTransition: number
  ): void {
    ctx.save();
    this.roundRect(ctx, 0, 0, w, h, 12);
    ctx.clip();

    for (const crack of cracks) {
      const startX = crack.startX * w;
      const startY = crack.startY * h;

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      for (const seg of crack.segments) {
        ctx.lineTo(seg.x * w, seg.y * h);
      }
      ctx.lineTo(crack.endX * w, crack.endY * h);

      const glowIntensity = crack.glowIntensity;
      const crackColor = isGolden
        ? this.lerpColor(COLOR_GOLD_BORDER, '#FFD700', goldenTransition)
        : COLOR_GOLD_BORDER;

      ctx.strokeStyle = crackColor;
      ctx.lineWidth = 1.5 + glowIntensity * 1.5;
      ctx.globalAlpha = 0.4 + glowIntensity * 0.6;

      if (glowIntensity > 0.3) {
        ctx.shadowColor = crackColor;
        ctx.shadowBlur = 8 + glowIntensity * 12;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private generateFrostTexture(w: number, h: number): void {
    this.frostCanvas.width = w;
    this.frostCanvas.height = h;
    const fctx = this.frostCtx;
    fctx.clearRect(0, 0, w, h);

    fctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 30 + 8;
      fctx.beginPath();
      fctx.arc(x, y, size, 0, Math.PI * 2);
      fctx.fill();
    }

    const imageData = fctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    fctx.putImageData(imageData, 0, 0);
  }

  private drawFrostedGlass(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.frostCanvas.width !== w || this.frostCanvas.height !== h) {
      this.generateFrostTexture(w, h);
    }

    ctx.save();
    this.roundRect(ctx, 0, 0, w, h, 12);
    ctx.clip();
    ctx.drawImage(this.frostCanvas, 0, 0);
    ctx.restore();
  }

  drawRunes(runes: Rune[]): void {
    const ctx = this.ctx;

    for (const rune of runes) {
      if (rune.brightness <= 0) continue;

      const alpha = rune.brightness;
      const color = rune.getColor();
      const glowSize = rune.getGlowSize();

      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.shadowColor = color;
      ctx.shadowBlur = glowSize;

      ctx.font = `bold ${rune.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(rune.char, rune.x, rune.y);

      ctx.restore();
    }
  }

  drawEffects(effectManager: EffectManager): void {
    this.drawShockwaves(effectManager.shockwaves);
    this.drawTrail(effectManager);
    this.drawLightBeam(effectManager);
    this.drawParticles(effectManager.particles);
  }

  private drawShockwaves(shockwaves: { x: number; y: number; radius: number; maxRadius: number; life: number; duration: number }[]): void {
    const ctx = this.ctx;

    for (const sw of shockwaves) {
      const t = sw.life / sw.duration;
      const alpha = (1 - t) * 0.8;

      ctx.save();
      ctx.strokeStyle = COLOR_CYAN;
      ctx.lineWidth = 2 * (1 - t);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = COLOR_CYAN;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawTrail(effectManager: EffectManager): void {
    const ctx = this.ctx;
    const points = effectManager.trailPoints;

    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const alpha = (curr.life / curr.maxLife) * 0.7;
      const t = i / Math.max(1, points.length - 1);
      const color = this.lerpColor(COLOR_CYAN, COLOR_ROSE, t);

      ctx.strokeStyle = color;
      ctx.lineWidth = 4 * (curr.life / curr.maxLife);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawLightBeam(effectManager: EffectManager): void {
    if (!effectManager.lightBeam) return;

    const ctx = this.ctx;
    const beam = effectManager.lightBeam;
    const opacity = effectManager.getBeamOpacity();

    if (opacity <= 0) return;

    const halfWidth = beam.width / 2;

    const gradient = ctx.createLinearGradient(0, beam.bottomY, 0, beam.topY);
    gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
    gradient.addColorStop(0.3, `rgba(255, 255, 255, ${opacity * 0.5})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${opacity * 0.3})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 30;

    ctx.beginPath();
    ctx.moveTo(beam.x - halfWidth * 0.8, beam.bottomY);
    ctx.lineTo(beam.x - halfWidth, beam.topY);
    ctx.lineTo(beam.x + halfWidth, beam.topY);
    ctx.lineTo(beam.x + halfWidth * 0.8, beam.bottomY);
    ctx.closePath();
    ctx.fill();

    const coreGradient = ctx.createLinearGradient(0, beam.bottomY, 0, beam.topY);
    coreGradient.addColorStop(0, `rgba(200, 230, 255, 0)`);
    coreGradient.addColorStop(0.5, `rgba(200, 230, 255, ${opacity * 0.8})`);
    coreGradient.addColorStop(1, `rgba(200, 230, 255, 0)`);

    ctx.fillStyle = coreGradient;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(beam.x - halfWidth * 0.3, beam.bottomY);
    ctx.lineTo(beam.x - halfWidth * 0.4, beam.topY);
    ctx.lineTo(beam.x + halfWidth * 0.4, beam.topY);
    ctx.lineTo(beam.x + halfWidth * 0.3, beam.bottomY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(particles: { x: number; y: number; size: number; life: number; maxLife: number; color: string }[]): void {
    const ctx = this.ctx;

    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      if (alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (hex.startsWith('rgb')) {
      const match = hex.match(/\d+/g);
      if (match) {
        return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
      }
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { r: 0, g: 0, b: 0 };
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
}
