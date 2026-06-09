import { ElementGemSystem, GemType, GEM_CONFIGS } from './elementGem';
import { Spirit } from './spirit';

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
  period: number;
}

const STAR_COUNT = 50;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private spirit: Spirit;
  private gemSystem: ElementGemSystem;
  private stars: Star[] = [];

  private lastTime: number = 0;
  private animationId: number = 0;

  private panelEnterProgress: number = 0;
  private readonly PANEL_ENTER_DURATION = 0.5;

  private absorbedGem: { type: GemType | null; pulseProgress: number } = { type: null, pulseProgress: 1 };

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.gemSystem = new ElementGemSystem();
    this.spirit = new Spirit(0, 0);

    this.initStars();
    this.resize();
    this.bindEvents();

    this.spirit.x = this.width / 2 - 80;
    this.spirit.y = this.height / 2;
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: 0,
        y: 0,
        radius: 0.5 + Math.random() * 1,
        alpha: 0.3 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        period: 3 + Math.random() * 3
      });
    }
  }

  private layoutStars(): void {
    for (const star of this.stars) {
      star.x = Math.random() * this.width;
      star.y = Math.random() * (this.height - 150);
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    dt = Math.min(dt, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.panelEnterProgress < 1) {
      this.panelEnterProgress = Math.min(1, this.panelEnterProgress + dt / this.PANEL_ENTER_DURATION);
    }

    if (this.absorbedGem.pulseProgress < 1) {
      this.absorbedGem.pulseProgress = Math.min(1, this.absorbedGem.pulseProgress + dt / 0.5);
    }

    for (const star of this.stars) {
      star.phase += (Math.PI * 2 / star.period) * dt;
    }

    this.gemSystem.update(dt);
    this.spirit.update(dt);
  }

  private render(): void {
    const ctx = this.ctx;
    this.clearAndDrawBackground();
    this.drawStars();
    this.spirit.render(ctx);
    this.gemSystem.render(ctx);
    this.drawGemSlotBar();
    this.drawStatusPanel();
  }

  private clearAndDrawBackground(): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0D0D2B');
    grad.addColorStop(1, '#1A1A3E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(): void {
    const ctx = this.ctx;
    for (const star of this.stars) {
      const alpha = star.alpha * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(star.phase)));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawGemSlotBar(): void {
    const ctx = this.ctx;
    const barWidth = Math.min(560, this.width - 100);
    const barHeight = 80;
    const barX = (this.width - barWidth) / 2;
    const barY = this.height - barHeight - 15;

    ctx.save();
    this.drawGlassPanel(ctx, barX, barY, barWidth, barHeight, 12);
    ctx.restore();
  }

  private drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.125)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    r = Math.min(r, w / 2, h / 2);
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

  private drawStatusPanel(): void {
    const ctx = this.ctx;
    const panelW = 160;
    const panelH = 340;
    const panelX = this.width - panelW - 20;
    const enterOffset = 20 * (1 - this.easeOutCubic(this.panelEnterProgress));
    const panelY = 20 + enterOffset;
    const panelAlpha = Math.min(1, this.panelEnterProgress * 2);

    ctx.save();
    ctx.globalAlpha = panelAlpha;

    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fillStyle = 'rgba(26,26,46,0.69)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.125)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('精灵状态', panelX + 16, panelY + 16);

    const color = this.spirit.getColorHex();
    let cy = panelY + 50;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('颜色', panelX + 16, cy);

    ctx.beginPath();
    ctx.arc(panelX + 56, cy + 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px monospace';
    ctx.fillText(color.toUpperCase(), panelX + 72, cy + 3);

    cy = panelY + 90;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('情绪值', panelX + 16, cy);

    const emotion = this.spirit.getEmotion();
    const barW = 120;
    const barH = 12;
    const barX = panelX + 16;
    const barY = cy + 20;

    ctx.fillStyle = '#333333';
    this.roundRect(ctx, barX, barY, barW, barH, 6);
    ctx.fill();

    const emotionRatio = emotion / 100;
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, '#FF6B6B');
    barGrad.addColorStop(1, '#4ECDC4');
    ctx.fillStyle = barGrad;
    this.roundRect(ctx, barX, barY, barW * emotionRatio, barH, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(emotion)}`, barX + barW + 6, barY + 1);

    cy = panelY + 150;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('触须', panelX + 16, cy);

    const tentacleCount = this.spirit.getTentacleCount();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${tentacleCount}/6`, panelX + 56, cy - 2);

    const iconX = panelX + 95;
    const iconY = cy + 8;
    for (let i = 0; i < 6; i++) {
      const active = i < tentacleCount;
      const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const cx = iconX + Math.cos(ang) * 7;
      const cyPos = iconY + Math.sin(ang) * 7;
      ctx.beginPath();
      ctx.arc(cx, cyPos, 2, 0, Math.PI * 2);
      ctx.fillStyle = active ? 'rgba(78,205,196,0.9)' : 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(iconX, iconY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(78,205,196,0.6)';
    ctx.fill();

    cy = panelY + 210;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px sans-serif';
    ctx.fillText('已吸收：', panelX + 16, cy);

    const lastAbsorbed = this.gemSystem.getLastAbsorbed();
    if (lastAbsorbed) {
      const config = GEM_CONFIGS[lastAbsorbed];
      const pulseScale = 1 + 0.15 * Math.sin(this.absorbedGem.pulseProgress * Math.PI);
      const iconSize = 24 * pulseScale;
      const gemX = panelX + 16 + iconSize / 2 + 4;
      const gemY = cy + 30;

      ctx.save();
      ctx.shadowColor = config.color;
      ctx.shadowBlur = 12 * this.absorbedGem.pulseProgress;

      ctx.beginPath();
      ctx.arc(gemX, gemY, iconSize / 2, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(gemX - iconSize / 8, gemY - iconSize / 8, 0, gemX, gemY, iconSize / 2);
      grad.addColorStop(0, this.lightenColor(config.color, 40));
      grad.addColorStop(0.6, config.color);
      grad.addColorStop(1, this.darkenColor(config.color, 30));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `${Math.round(iconSize * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.name, gemX, gemY);

      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${config.name}元素`, panelX + 16 + iconSize + 16, cy + 24);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '11px sans-serif';
      ctx.fillText('拖拽晶石到精灵身上', panelX + 16, cy + 24);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('元素精灵养成系统 v1.0', panelX + panelW / 2, panelY + panelH - 20);

    ctx.restore();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }

  private lightenColor(hex: string, percent: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(r + (255 - r) * percent / 100, g + (255 - g) * percent / 100, b + (255 - b) * percent / 100);
  }

  private darkenColor(hex: string, percent: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(r * (1 - percent / 100), g * (1 - percent / 100), b * (1 - percent / 100));
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    this.canvas.width = cssW * dpr;
    this.canvas.height = cssH * dpr;
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.width = cssW;
    this.height = cssH;

    this.spirit.resize(cssW, cssH);
    this.gemSystem.resize(cssW, cssH);
    this.layoutStars();
  }

  private bindEvents(): void {
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);

    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      if ('touches' in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      const me = e as MouseEvent;
      return { x: me.clientX - rect.left, y: me.clientY - rect.top };
    };

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = getPos(e);
      this.gemSystem.handleMouseDown(x, y);
    };
    this.canvas.addEventListener('mousedown', onMouseDown);

    const onMouseMove = (e: MouseEvent) => {
      const { x, y } = getPos(e);
      this.gemSystem.handleMouseMove(x, y);
    };
    window.addEventListener('mousemove', onMouseMove);

    const onMouseUp = (e: MouseEvent) => {
      const { x, y } = getPos(e);
      const result = this.gemSystem.handleMouseUp(x, y, this.spirit.x, this.spirit.y, this.spirit.getRadius());
      if (result) {
        this.absorbedGem.type = result;
        this.absorbedGem.pulseProgress = 0;
        this.spirit.absorbGem(result);
      }
    };
    window.addEventListener('mouseup', onMouseUp);

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e);
      this.gemSystem.handleMouseDown(x, y);
    };
    this.canvas.addEventListener('touchstart', onTouchStart, { passive: false });

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e);
      this.gemSystem.handleMouseMove(x, y);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      let x = 0, y = 0;
      if (e.changedTouches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        x = e.changedTouches[0].clientX - rect.left;
        y = e.changedTouches[0].clientY - rect.top;
      }
      const result = this.gemSystem.handleMouseUp(x, y, this.spirit.x, this.spirit.y, this.spirit.getRadius());
      if (result) {
        this.absorbedGem.type = result;
        this.absorbedGem.pulseProgress = 0;
        this.spirit.absorbGem(result);
      }
    };
    window.addEventListener('touchend', onTouchEnd, { passive: false });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
