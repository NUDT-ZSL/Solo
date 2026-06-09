import type { BreathInteraction } from './breath';
import { RECOVER_DURATION_EDGE, RECOVER_DURATION_CENTER } from './breath';
import type { ParticleSystem, Snowflake, WindChime, WindChimeParticle } from './particle';

const WINDOW_FRAME_WIDTH = 60;
const MOON_COLOR = '#ffe0b0';
const FRAME_COLOR = '#4a3728';
const FRAME_GRAIN_COLOR = '#3a2a18';
const FROST_COLOR = '#e0f0ff';
const FROST_BASE_ALPHA = 0.9;
const BG_TOP_COLOR = '#0a0a2e';
const BG_BOTTOM_COLOR = '#2a1040';

interface FrostTexture {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastUpdate: number;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + size * 0.7 * Math.cos(angle), cy + size * 0.7 * Math.sin(angle));
  }
  ctx.stroke();
  ctx.restore();
}

export class SceneRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private frostCanvas: FrostTexture;
  private frostNoiseCanvas: HTMLCanvasElement;
  private lastFrostNoiseUpdate = 0;
  private moonX: number;
  private moonY: number;
  private moonRadius: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.moonRadius = 40;
    this.moonX = width - 180;
    this.moonY = 160;
    this.frostCanvas = this.createFrostTexture(width, height);
    this.frostNoiseCanvas = this.createFrostNoiseCanvas();
  }

  private createFrostTexture(width: number, height: number): FrostTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    this.generateFrostTexture(ctx, width, height);
    return { canvas, ctx, lastUpdate: performance.now() };
  }

  private createFrostNoiseCanvas(): HTMLCanvasElement {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 40);
      imgData.data[i] = 224 + v;
      imgData.data[i + 1] = 240 + v;
      imgData.data[i + 2] = 255;
      imgData.data[i + 3] = Math.floor(Math.random() * 20);
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  private generateFrostTexture(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    const fw = WINDOW_FRAME_WIDTH;
    ctx.save();
    ctx.fillStyle = FROST_COLOR;
    ctx.globalAlpha = FROST_BASE_ALPHA;
    ctx.fillRect(fw, fw, width - fw * 2, height - fw * 2);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const hexCount = Math.floor(((width - fw * 2) * (height - fw * 2)) / 8000);
    for (let i = 0; i < hexCount; i++) {
      const x = fw + randomRange(0, width - fw * 2);
      const y = fw + randomRange(0, height - fw * 2);
      const size = randomRange(5, 12);
      const alpha = randomRange(0.2, 0.5);
      drawHexagon(ctx, x, y, size, alpha);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#d0e8ff';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 80; i++) {
      const x = fw + randomRange(0, width - fw * 2);
      const y = fw + randomRange(0, height - fw * 2);
      const length = randomRange(10, 40);
      const angle = randomRange(0, Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
    ctx.restore();
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.moonX = width - 180;
    this.moonY = 160;
    this.frostCanvas.canvas.width = width;
    this.frostCanvas.canvas.height = height;
    this.generateFrostTexture(this.frostCanvas.ctx, width, height);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const fw = WINDOW_FRAME_WIDTH;
    const grad = ctx.createLinearGradient(fw, fw, fw, this.height - fw);
    grad.addColorStop(0, BG_TOP_COLOR);
    grad.addColorStop(1, BG_BOTTOM_COLOR);
    ctx.save();
    ctx.beginPath();
    ctx.rect(fw, fw, this.width - fw * 2, this.height - fw * 2);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(fw, fw, this.width - fw * 2, this.height - fw * 2);
    ctx.restore();
  }

  private drawMoon(): void {
    const ctx = this.ctx;
    const fw = WINDOW_FRAME_WIDTH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(fw, fw, this.width - fw * 2, this.height - fw * 2);
    ctx.clip();

    const glowRadius = 100;
    const glowGrad = ctx.createRadialGradient(
      this.moonX, this.moonY, this.moonRadius * 0.5,
      this.moonX, this.moonY, glowRadius
    );
    glowGrad.addColorStop(0, 'rgba(255, 224, 176, 0.3)');
    glowGrad.addColorStop(0.4, 'rgba(255, 224, 176, 0.1)');
    glowGrad.addColorStop(1, 'rgba(255, 224, 176, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(this.moonX, this.moonY, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const moonGrad = ctx.createRadialGradient(
      this.moonX - this.moonRadius * 0.3, this.moonY - this.moonRadius * 0.3, 0,
      this.moonX, this.moonY, this.moonRadius
    );
    moonGrad.addColorStop(0, '#fff5d0');
    moonGrad.addColorStop(0.7, MOON_COLOR);
    moonGrad.addColorStop(1, '#e8c890');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(this.moonX, this.moonY, this.moonRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSnowflakes(snowflakes: Snowflake[]): void {
    const ctx = this.ctx;
    const fw = WINDOW_FRAME_WIDTH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(fw, fw, this.width - fw * 2, this.height - fw * 2);
    ctx.clip();

    for (const s of snowflakes) {
      ctx.save();
      ctx.globalAlpha = s.opacity;
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
      grad.addColorStop(0, s.color);
      grad.addColorStop(1, 'rgba(176, 208, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawWindowFrame(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const fw = WINDOW_FRAME_WIDTH;

    ctx.save();
    ctx.fillStyle = FRAME_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.moveTo(fw, fw);
    ctx.lineTo(fw, h - fw);
    ctx.lineTo(w - fw, h - fw);
    ctx.lineTo(w - fw, fw);
    ctx.closePath();
    ctx.fill('evenodd');

    ctx.fillStyle = FRAME_GRAIN_COLOR;
    for (let y = 0; y < h; y += 50) {
      if (y < fw || y > h - fw) {
        ctx.fillRect(0, y, w, 1);
      } else {
        ctx.fillRect(0, y, fw, 1);
        ctx.fillRect(w - fw, y, fw, 1);
      }
    }
    for (let x = 0; x < w; x += 50) {
      if (x < fw || x > w - fw) {
        ctx.fillRect(x, 0, 1, h);
      } else {
        ctx.fillRect(x, 0, 1, fw);
        ctx.fillRect(x, h - fw, 1, fw);
      }
    }

    ctx.fillStyle = '#2a1a08';
    for (let i = 0; i < 30; i++) {
      const side = Math.floor(Math.random() * 4);
      let nx: number, ny: number;
      if (side === 0) { nx = Math.random() * w; ny = Math.random() * fw; }
      else if (side === 1) { nx = Math.random() * w; ny = h - fw + Math.random() * fw; }
      else if (side === 2) { nx = Math.random() * fw; ny = Math.random() * h; }
      else { nx = w - fw + Math.random() * fw; ny = Math.random() * h; }
      ctx.beginPath();
      ctx.arc(nx, ny, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const innerShadowGrad = ctx.createLinearGradient(fw, fw, fw + 30, fw + 30);
    innerShadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    innerShadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerShadowGrad;
    ctx.fillRect(fw, fw, this.width - fw * 2, this.height - fw * 2);

    ctx.restore();
  }

  private drawFrostLayer(breath: BreathInteraction, currentTime: number): void {
    const ctx = this.ctx;
    const fw = WINDOW_FRAME_WIDTH;
    const glassW = this.width - fw * 2;
    const glassH = this.height - fw * 2;

    if (currentTime - this.lastFrostNoiseUpdate > 50) {
      this.lastFrostNoiseUpdate = currentTime;
      this.updateFrostNoise();
    }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = glassW;
    maskCanvas.height = glassH;
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.fillStyle = '#ffffff';
    maskCtx.fillRect(0, 0, glassW, glassH);
    maskCtx.globalCompositeOperation = 'destination-out';

    for (const area of breath.getMeltAreas()) {
      const ax = area.x - fw;
      const ay = area.y - fw;
      maskCtx.save();
      if (area.isRecovering) {
        const recoverProgress = Math.min(area.recoverTimer / 2500, 1);
        for (let r = area.radius; r > 0; r -= 2) {
          const normalizedDist = r / area.radius;
          const edgeFactor = RECOVER_DURATION_EDGE / RECOVER_DURATION_CENTER;
          const localProgress = Math.min(recoverProgress * (1 + normalizedDist * (1 / edgeFactor - 1)), 1);
          const alpha = Math.max(0, 1 - localProgress);
          if (alpha > 0) {
            maskCtx.globalAlpha = alpha;
            maskCtx.fillStyle = '#000000';
            maskCtx.beginPath();
            maskCtx.arc(ax, ay, r, 0, Math.PI * 2);
            maskCtx.fill();
          }
        }
      } else {
        const grad = maskCtx.createRadialGradient(ax, ay, 0, ax, ay, area.radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.9)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        maskCtx.fillStyle = grad;
        maskCtx.beginPath();
        maskCtx.arc(ax, ay, area.radius, 0, Math.PI * 2);
        maskCtx.fill();
      }
      maskCtx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(fw, fw, glassW, glassH);
    ctx.clip();
    ctx.drawImage(this.frostCanvas.canvas, fw, fw);
    const frostImgData = ctx.getImageData(fw, fw, glassW, glassH);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = glassW;
    tempCanvas.height = glassH;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(frostImgData, 0, 0);
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(maskCanvas, 0, 0);
    ctx.drawImage(tempCanvas, fw, fw);

    const pattern = ctx.createPattern(this.frostNoiseCanvas, 'repeat');
    if (pattern) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = pattern;
      ctx.fillRect(fw, fw, glassW, glassH);
    }

    for (const area of breath.getMeltAreas()) {
      if (!area.isRecovering || area.recoverTimer < 100) {
        const alpha = area.isRecovering ? 0.1 * (1 - area.recoverTimer / 100) : 0.1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        const glowGrad = ctx.createRadialGradient(area.x, area.y, area.radius * 0.5, area.x, area.y, area.radius + 15);
        glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        glowGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius + 15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const crystals = breath.getIceCrystals(currentTime);
    for (const crystal of crystals) {
      ctx.globalCompositeOperation = 'source-over';
      drawHexagon(ctx, crystal.x, crystal.y, crystal.size, crystal.opacity);
    }

    ctx.restore();
  }

  private updateFrostNoise(): void {
    const ctx = this.frostCanvas.ctx;
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 30; i++) {
      const fw = WINDOW_FRAME_WIDTH;
      const x = fw + randomRange(0, this.width - fw * 2);
      const y = fw + randomRange(0, this.height - fw * 2);
      const size = randomRange(2, 8);
      const alpha = randomRange(0.1, 0.3);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = alpha;
      drawHexagon(ctx, x, y, size, 1);
    }
    ctx.restore();
  }

  private drawMoonlightSplotches(breath: BreathInteraction): void {
    const ctx = this.ctx;
    const fw = WINDOW_FRAME_WIDTH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(fw, fw, this.width - fw * 2, this.height - fw * 2);
    ctx.clip();

    for (const area of breath.getMeltAreas()) {
      const dx = area.x - this.moonX;
      const dy = area.y - this.moonY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dirX = dx / (dist || 1);
      const dirY = dy / (dist || 1);
      const offset = 80;
      const splotchX = area.x + dirX * offset * 0.3;
      const splotchY = area.y + dirY * offset * 0.3;

      const grad = ctx.createRadialGradient(
        splotchX, splotchY, area.radius * 0.2,
        splotchX, splotchY, area.radius * 1.3
      );
      grad.addColorStop(0, 'rgba(255, 224, 176, 0.15)');
      grad.addColorStop(0.5, 'rgba(255, 224, 176, 0.08)');
      grad.addColorStop(1, 'rgba(255, 224, 176, 0)');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(splotchX, splotchY, area.radius * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawWindChimes(chimes: WindChime[]): void {
    const ctx = this.ctx;

    for (const chime of chimes) {
      const endX = chime.baseX + Math.sin(chime.currentAngle) * chime.stringLength;
      const endY = chime.baseY + Math.cos(chime.currentAngle) * chime.stringLength;

      ctx.save();
      ctx.strokeStyle = '#b0d0ff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(chime.baseX, chime.baseY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.translate(endX, endY);
      ctx.rotate(chime.currentAngle);
      const iceGrad = ctx.createLinearGradient(-1.5, -4, 1.5, 4);
      iceGrad.addColorStop(0, '#ffffff');
      iceGrad.addColorStop(0.5, '#e0f0ff');
      iceGrad.addColorStop(1, '#b0d0ff');
      ctx.fillStyle = iceGrad;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(1.5, -2);
      ctx.lineTo(1.5, 4);
      ctx.lineTo(0, 5);
      ctx.lineTo(-1.5, 4);
      ctx.lineTo(-1.5, -2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawChimeParticles(particles: WindChimeParticle[]): void {
    const ctx = this.ctx;

    for (const p of particles) {
      ctx.save();
      const lifeRatio = p.life / p.maxLife;
      ctx.globalAlpha = p.opacity * lifeRatio;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, 'rgba(208, 176, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public render(
    breath: BreathInteraction,
    particles: ParticleSystem,
    currentTime: number
  ): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawMoon();
    this.drawSnowflakes(particles.getSnowflakes());
    this.drawMoonlightSplotches(breath);
    this.drawFrostLayer(breath, currentTime);
    this.drawChimeParticles(particles.getChimeParticles());
    this.drawWindowFrame();
    this.drawWindChimes(particles.getWindChimes());
  }
}
