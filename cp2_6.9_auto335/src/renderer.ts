import type {
  Particle,
  RenderState,
  ReactionResult,
  Product
} from './types';

const CRUCIBLE_CENTER_X = 230;
const CRUCIBLE_CENTER_Y = 260;
const CRUCIBLE_WIDTH = 280;
const CRUCIBLE_HEIGHT = 140;
const CRUCIBLE_LIP_Y = 200;
const MAX_PARTICLES = 500;
const MAX_VICTORY_PARTICLES = 300;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function lerpColor(start: string, end: string, t: number): string {
  const s = hexToRgb(start);
  const e = hexToRgb(end);
  const r = Math.round(s.r + (e.r - s.r) * t);
  const g = Math.round(s.g + (e.g - s.g) * t);
  const b = Math.round(s.b + (e.b - s.b) * t);
  return `rgb(${r},${g},${b})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: RenderState;
  private particleIdCounter = 0;
  private reactionStartTime = 0;
  private shakeStartTime = 0;
  private shakeDuration = 0;
  private shakeIntensity = 0;
  private onVictoryComplete?: () => void;
  private victoryStartTime = 0;
  private lastFrameTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = {
      particles: [],
      liquidColor: '#1A0F0A',
      shakeAngle: 0,
      productDisplay: null,
      crucibleHighlight: 0,
      victoryParticles: [],
      victoryActive: false
    };
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setLiquidColor(color: string): void {
    this.state.liquidColor = color;
  }

  triggerReaction(result: ReactionResult): void {
    this.reactionStartTime = performance.now();
    this.shakeStartTime = performance.now();
    this.shakeDuration = result.shakeDuration;
    this.shakeIntensity = result.shakeIntensity;

    if (result.liquidColor) {
      this.state.liquidColor = result.liquidColor;
    }

    this.spawnParticles(result);

    if (result.success && result.product) {
      this.state.productDisplay = {
        product: result.product,
        startTime: performance.now(),
        duration: 4000,
        typedText: ''
      };
    }
  }

  spawnVictoryParticles(onComplete?: () => void): void {
    this.state.victoryActive = true;
    this.victoryStartTime = performance.now();
    this.onVictoryComplete = onComplete;

    for (let i = 0; i < 200; i++) {
      const particle: Particle = {
        id: this.particleIdCounter++,
        x: Math.random() * this.canvas.clientWidth,
        y: Math.random() * -200 - 100,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1 + Math.random() * 2,
        life: 5000,
        maxLife: 5000,
        size: 1 + Math.random() * 3,
        startColor: '#FFD54F',
        endColor: '#FFA000',
        gravity: 0.02
      };
      this.state.victoryParticles.push(particle);
    }

    if (this.state.victoryParticles.length > MAX_VICTORY_PARTICLES) {
      this.state.victoryParticles = this.state.victoryParticles.slice(
        -MAX_VICTORY_PARTICLES
      );
    }
  }

  setCrucibleHighlight(active: boolean): void {
    this.state.crucibleHighlight = active ? performance.now() : 0;
  }

  private spawnParticles(result: ReactionResult): void {
    const cfg = result.particleConfig;
    const emitX = CRUCIBLE_CENTER_X;
    let emitY: number;

    switch (cfg.emitFrom) {
      case 'bottom':
        emitY = CRUCIBLE_CENTER_Y + CRUCIBLE_HEIGHT / 2 - 20;
        break;
      case 'top':
        emitY = CRUCIBLE_LIP_Y;
        break;
      case 'center':
      default:
        emitY = CRUCIBLE_CENTER_Y;
        break;
    }

    for (let i = 0; i < cfg.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 3;
      const spread = Math.random() * cfg.spreadRadius;

      const particle: Particle = {
        id: this.particleIdCounter++,
        x: emitX + Math.cos(angle) * spread * 0.3,
        y: emitY,
        vx: Math.cos(angle) * speed,
        vy: cfg.emitFrom === 'bottom' ? -Math.abs(Math.sin(angle) * speed * 2) - 1 : Math.sin(angle) * speed - 1,
        life: cfg.duration * (0.7 + Math.random() * 0.3),
        maxLife: cfg.duration,
        size: cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize),
        startColor: cfg.startColor,
        endColor: cfg.endColor,
        gravity: cfg.gravity
      };
      this.state.particles.push(particle);
    }

    if (this.state.particles.length > MAX_PARTICLES) {
      this.state.particles = this.state.particles.slice(-MAX_PARTICLES);
    }
  }

  update(now: number): void {
    const dt = this.lastFrameTime ? (now - this.lastFrameTime) / 16.67 : 1;
    this.lastFrameTime = now;

    if (this.shakeDuration > 0) {
      const elapsed = now - this.shakeStartTime;
      if (elapsed < this.shakeDuration) {
        const t = 1 - elapsed / this.shakeDuration;
        this.state.shakeAngle = Math.sin(elapsed / 50) * this.shakeIntensity * t;
      } else {
        this.state.shakeAngle = 0;
        this.shakeDuration = 0;
      }
    }

    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.98;
      p.life -= 16.67 * dt;
      return p.life > 0;
    });

    if (this.state.victoryActive) {
      this.state.victoryParticles = this.state.victoryParticles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.life -= 16.67 * dt;
        if (p.y > this.canvas.clientHeight + 50) {
          p.y = -50;
          p.x = Math.random() * this.canvas.clientWidth;
          p.life = p.maxLife;
        }
        return p.life > 0;
      });

      if (now - this.victoryStartTime > 5000) {
        this.state.victoryActive = false;
        this.state.victoryParticles = [];
        if (this.onVictoryComplete) {
          this.onVictoryComplete();
          this.onVictoryComplete = undefined;
        }
      }
    }

    if (this.state.productDisplay) {
      const elapsed = now - this.state.productDisplay.startTime;
      const totalDuration = this.state.productDisplay.duration;
      const desc = this.state.productDisplay.product.description;
      const typingDelay = 200;
      const typingDuration = totalDuration - typingDelay - 1000;

      if (elapsed > typingDelay && elapsed < typingDelay + typingDuration) {
        const typeProgress = (elapsed - typingDelay) / typingDuration;
        const charCount = Math.floor(desc.length * Math.min(typeProgress * 1.5, 1));
        this.state.productDisplay.typedText = desc.slice(0, charCount);
      } else if (elapsed >= typingDelay + typingDuration) {
        this.state.productDisplay.typedText = desc;
      }

      if (elapsed > totalDuration) {
        this.state.productDisplay = null;
      }
    }

    this.render(now);
  }

  private render(now: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    if (this.state.victoryActive) {
      this.drawVictoryParticles(ctx);
    }

    ctx.save();
    ctx.translate(w / 2 - CRUCIBLE_CENTER_X, h / 2 - CRUCIBLE_CENTER_Y - 20);

    ctx.save();
    ctx.translate(CRUCIBLE_CENTER_X, CRUCIBLE_CENTER_Y);
    ctx.rotate((this.state.shakeAngle * Math.PI) / 180);
    ctx.translate(-CRUCIBLE_CENTER_X, -CRUCIBLE_CENTER_Y);

    this.drawCrucible(ctx, now);
    this.drawLiquid(ctx, now);
    this.drawParticles(ctx);

    ctx.restore();
    ctx.restore();

    if (this.state.productDisplay) {
      this.drawProductDisplay(ctx, w, h, now);
    }
  }

  private drawCrucible(ctx: CanvasRenderingContext2D, now: number): void {
    const cx = CRUCIBLE_CENTER_X;
    const cy = CRUCIBLE_CENTER_Y;
    const w = CRUCIBLE_WIDTH;
    const h = CRUCIBLE_HEIGHT;

    let highlightAlpha = 0;
    if (this.state.crucibleHighlight > 0) {
      const t = (now - this.state.crucibleHighlight) / 500;
      highlightAlpha = 0.3 + Math.sin(t * Math.PI * 2) * 0.2 + 0.2;
    }

    if (highlightAlpha > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(201, 169, 110, ${highlightAlpha})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#C9A96E';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10, w / 2 + 20, h / 2 + 30, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 + 20, cy - h / 2 - 20);
    ctx.lineTo(cx + w / 2 - 20, cy - h / 2 - 20);
    ctx.quadraticCurveTo(cx + w / 2, cy - h / 2 - 20, cx + w / 2, cy - h / 2 - 10);
    ctx.quadraticCurveTo(cx + w / 2, cy - h / 2, cx + w / 2 - 10, cy - h / 2);
    ctx.lineTo(cx - w / 2 + 10, cy - h / 2);
    ctx.quadraticCurveTo(cx - w / 2, cy - h / 2, cx - w / 2, cy - h / 2 - 10);
    ctx.quadraticCurveTo(cx - w / 2, cy - h / 2 - 20, cx - w / 2 + 20, cy - h / 2 - 20);
    ctx.closePath();

    const rimGrad = ctx.createLinearGradient(
      cx - w / 2,
      cy - h / 2 - 20,
      cx + w / 2,
      cy - h / 2
    );
    rimGrad.addColorStop(0, '#8B7355');
    rimGrad.addColorStop(0.3, '#D4AF37');
    rimGrad.addColorStop(0.5, '#F5DEB3');
    rimGrad.addColorStop(0.7, '#D4AF37');
    rimGrad.addColorStop(1, '#8B7355');
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.strokeStyle = '#5C4A32';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);

    const bodyGrad = ctx.createLinearGradient(
      cx - w / 2,
      cy - h / 2,
      cx + w / 2,
      cy + h / 2
    );
    bodyGrad.addColorStop(0, '#3E2723');
    bodyGrad.addColorStop(0.2, '#5D4037');
    bodyGrad.addColorStop(0.5, '#6D4C41');
    bodyGrad.addColorStop(0.8, '#5D4037');
    bodyGrad.addColorStop(1, '#3E2723');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();

    const highlightGrad = ctx.createLinearGradient(
      cx - w / 2 + 30,
      cy - h / 2,
      cx - w / 2 + 60,
      cy + h / 2
    );
    highlightGrad.addColorStop(0, 'rgba(255, 223, 186, 0.3)');
    highlightGrad.addColorStop(0.5, 'rgba(255, 223, 186, 0.1)');
    highlightGrad.addColorStop(1, 'rgba(255, 223, 186, 0)');
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

    const rimHighlight = ctx.createRadialGradient(
      cx,
      cy - h / 2 + 10,
      0,
      cx,
      cy - h / 2 + 10,
      w / 2
    );
    rimHighlight.addColorStop(0, 'rgba(255, 215, 150, 0.25)');
    rimHighlight.addColorStop(1, 'rgba(255, 215, 150, 0)');
    ctx.fillStyle = rimHighlight;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, 40);

    ctx.restore();

    ctx.strokeStyle = '#2C1810';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy - h / 2, w / 2 - 5, 20, 0, 0, Math.PI * 2);
    const innerShadow = ctx.createRadialGradient(
      cx,
      cy - h / 2,
      0,
      cx,
      cy - h / 2,
      w / 2 - 5
    );
    innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    innerShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    ctx.fillStyle = innerShadow;
    ctx.fill();
    ctx.restore();
  }

  private drawLiquid(ctx: CanvasRenderingContext2D, now: number): void {
    const cx = CRUCIBLE_CENTER_X;
    const cy = CRUCIBLE_CENTER_Y;
    const w = CRUCIBLE_WIDTH - 40;
    const h = CRUCIBLE_HEIGHT - 30;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();

    const color = this.state.liquidColor;
    const waveOffset = Math.sin(now / 300) * 3;
    const waveOffset2 = Math.cos(now / 500) * 2;

    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2 + 15 + waveOffset);
    ctx.quadraticCurveTo(
      cx - w / 4,
      cy - h / 2 + 10 + waveOffset2,
      cx,
      cy - h / 2 + 15 + waveOffset
    );
    ctx.quadraticCurveTo(
      cx + w / 4,
      cy - h / 2 + 20 - waveOffset2,
      cx + w / 2,
      cy - h / 2 + 15 + waveOffset
    );
    ctx.lineTo(cx + w / 2, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy + h / 2);
    ctx.closePath();

    const liquidGrad = ctx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      w / 2
    );
    liquidGrad.addColorStop(0, this.lightenColor(color, 30));
    liquidGrad.addColorStop(0.6, color);
    liquidGrad.addColorStop(1, this.darkenColor(color, 30));
    ctx.fillStyle = liquidGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx, cy - h / 2 + 15, w / 2 - 20, 8, 0, 0, Math.PI * 2);
    const surfaceGrad = ctx.createLinearGradient(
      cx - w / 2,
      cy - h / 2 + 10,
      cx + w / 2,
      cy - h / 2 + 20
    );
    surfaceGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
    surfaceGrad.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    surfaceGrad.addColorStop(1, 'rgba(255,255,255,0.1)');
    ctx.fillStyle = surfaceGrad;
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.state.particles) {
      const t = p.life / p.maxLife;
      const color = lerpColor(p.startColor, p.endColor, 1 - t);
      const alpha = t;
      const size = p.size * (0.5 + t * 0.5);

      ctx.beginPath();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawVictoryParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.state.victoryParticles) {
      const t = p.life / p.maxLife;
      const color = lerpColor(p.startColor, p.endColor, 1 - t);
      const alpha = Math.min(t * 2, 1);
      const size = p.size;

      ctx.beginPath();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawProductDisplay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    now: number
  ): void {
    const display = this.state.productDisplay!;
    const product = display.product;
    const elapsed = now - display.startTime;

    const scaleProgress = Math.min(elapsed / 800, 1);
    const scale = lerp(0.5, 1.0, easeOut(scaleProgress));

    const centerX = w / 2;
    const centerY = h / 2 - CRUCIBLE_HEIGHT - 80;
    const alpha = elapsed < display.duration - 500 ? 1 : (display.duration - elapsed) / 500;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    const iconSize = 80;
    ctx.font = `${iconSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = product.color;
    ctx.shadowBlur = 20;
    ctx.fillText(product.icon, centerX, centerY);

    ctx.font = 'bold 22px "Georgia", serif';
    ctx.fillStyle = '#FFF8E1';
    ctx.shadowColor = product.color;
    ctx.shadowBlur = 15;
    ctx.fillText(product.name, centerX, centerY + 60);

    if (display.typedText.length > 0) {
      ctx.font = '15px "Georgia", serif';
      ctx.fillStyle = 'rgba(255, 248, 225, 0.85)';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#000000';
      this.wrapText(
        ctx,
        display.typedText,
        centerX,
        centerY + 95,
        280,
        22
      );
    }

    ctx.restore();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const chars = text.split('');
    let line = '';
    let lineCount = 0;

    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, y + lineCount * lineHeight);
        line = chars[i];
        lineCount++;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }

  private lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    return `rgb(${Math.min(255, rgb.r + percent)},${Math.min(255, rgb.g + percent)},${Math.min(255, rgb.b + percent)})`;
  }

  private darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    return `rgb(${Math.max(0, rgb.r - percent)},${Math.max(0, rgb.g - percent)},${Math.max(0, rgb.b - percent)})`;
  }

  getState(): RenderState {
    return this.state;
  }
}
