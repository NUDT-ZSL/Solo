import {
  Rune,
  RUNE_CONFIG,
  Particle,
  Spirit,
  SpiritType,
  SPIRIT_CONFIG,
  getRuneLevelColor,
  Slot
} from './entities';
import { GameManager } from './gameManager';

export class UIManager {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private gameManager: GameManager;
  public hoveredSpiritIndex: number = -1;
  public selectedSpiritIndex: number = -1;
  private stars: { x: number; y: number; size: number; alpha: number; twinkleSpeed: number }[] = [];
  private dexScrollOffset: number = 0;
  private readonly CARD_WIDTH: number = 80;
  private readonly CARD_HEIGHT: number = 100;
  private readonly CARD_GAP: number = 10;
  private readonly DEX_COLS: number = 2;
  private readonly VISIBLE_CARDS: number = 6;

  constructor(canvas: HTMLCanvasElement, gameManager: GameManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameManager = gameManager;
    this.initStars();
  }

  private initStars(): void {
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 2 + 1
      });
    }
  }

  public render(time: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.drawBackground(time, w, h);
    this.drawFlash(w, h);
    this.drawSlotPanel();
    this.drawPoolPanel();
    this.drawDexPanel(time);
    this.drawSlots();
    this.drawRunePool(time);
    this.drawParticles();
    this.drawSpirits(time);
    this.drawRunes(time);
    this.drawSpiritDetailModal(time);
  }

  private drawBackground(time: number, w: number, h: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0B0B2A');
    gradient.addColorStop(1, '#1A1A3E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    this.stars.forEach(star => {
      const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed * 0.001);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawFlash(w: number, h: number): void {
    if (!this.gameManager.flashColor || this.gameManager.flashTimer <= 0) return;
    const ctx = this.ctx;
    const t = 1 - this.gameManager.flashTimer;
    let alpha = 0;
    if (t < 0.5) alpha = t * 0.6;
    else alpha = (1 - t) * 0.6;
    ctx.fillStyle = this.gameManager.flashColor;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  private drawSlotPanel(): void {
    const ctx = this.ctx;
    const bounds = this.gameManager.getSlotPanelBounds();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.376)';
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 16);
    ctx.stroke();

    ctx.fillStyle = 'rgba(224, 224, 255, 0.8)';
    ctx.font = '14px "Microsoft YaHei"';
    ctx.textAlign = 'left';
    ctx.fillText('符文槽位', bounds.x + 20, bounds.y + 28);
  }

  private drawPoolPanel(): void {
    const ctx = this.ctx;
    const bounds = this.gameManager.getPoolPanelBounds();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.376)';
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 16);
    ctx.stroke();

    ctx.fillStyle = 'rgba(224, 224, 255, 0.8)';
    ctx.font = '14px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('符文池', bounds.x + bounds.width / 2, bounds.y + 28);
    ctx.font = '11px "Microsoft YaHei"';
    ctx.fillStyle = 'rgba(224, 224, 255, 0.5)';
    ctx.fillText('拖拽符文到槽位', bounds.x + bounds.width / 2, bounds.y + 48);
  }

  private drawDexPanel(time: number): void {
    const ctx = this.ctx;
    const bounds = this.gameManager.getDexPanelBounds();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.376)';
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 16);
    ctx.stroke();

    ctx.fillStyle = 'rgba(224, 224, 255, 0.9)';
    ctx.font = 'bold 16px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText('精灵图鉴', bounds.x + bounds.width / 2, bounds.y + 30);

    ctx.font = '12px "Microsoft YaHei"';
    ctx.fillStyle = 'rgba(224, 224, 255, 0.6)';
    ctx.fillText(`已召唤 ${this.gameManager.summonedSpirits.length} / 4`, bounds.x + bounds.width / 2, bounds.y + 52);

    this.drawSpiritCards(bounds, time);
  }

  private drawSpiritCards(bounds: { x: number; y: number; width: number; height: number }, time: number): void {
    const ctx = this.ctx;
    const spirits = this.gameManager.summonedSpirits;
    const totalRows = Math.ceil(spirits.length / this.DEX_COLS);
    const contentHeight = totalRows * (this.CARD_HEIGHT + this.CARD_GAP);
    const maxScroll = Math.max(0, contentHeight - (bounds.height - 80));
    this.dexScrollOffset = Math.min(Math.max(0, this.dexScrollOffset), maxScroll);

    const startX = bounds.x + 20;
    const startY = bounds.y + 60 - this.dexScrollOffset;
    const visibleStart = Math.floor(this.dexScrollOffset / (this.CARD_HEIGHT + this.CARD_GAP)) * this.DEX_COLS;
    const visibleEnd = Math.min(spirits.length, visibleStart + this.VISIBLE_CARDS + this.DEX_COLS);

    for (let i = visibleStart; i < visibleEnd; i++) {
      const col = i % this.DEX_COLS;
      const row = Math.floor(i / this.DEX_COLS);
      const x = startX + col * (this.CARD_WIDTH + this.CARD_GAP);
      const y = startY + row * (this.CARD_HEIGHT + this.CARD_GAP);

      if (y + this.CARD_HEIGHT < bounds.y + 50 || y > bounds.y + bounds.height - 20) continue;

      const isHovered = this.hoveredSpiritIndex === i;
      this.drawSpiritCard(spirits[i], x, y, isHovered, time);
    }
  }

  private drawSpiritCard(spirit: Spirit, x: number, y: number, hovered: boolean, time: number): void {
    const ctx = this.ctx;
    const config = SPIRIT_CONFIG[spirit.type];
    const scale = hovered ? 1.05 : 1;
    const cx = x + this.CARD_WIDTH / 2;
    const cy = y + this.CARD_HEIGHT / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    if (hovered) {
      ctx.shadowColor = config.color;
      ctx.shadowBlur = 15;
    }

    const gradient = ctx.createLinearGradient(x, y, x, y + this.CARD_HEIGHT);
    gradient.addColorStop(0, config.gradientStart);
    gradient.addColorStop(1, config.gradientEnd);
    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y, this.CARD_WIDTH, this.CARD_HEIGHT, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    this.drawSpiritIcon(x + this.CARD_WIDTH / 2, y + 38, spirit.type, 24, time);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 13px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(config.name, x + this.CARD_WIDTH / 2, y + 72);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px "Microsoft YaHei"';
    ctx.fillText(config.typeName, x + this.CARD_WIDTH / 2, y + 88);

    this.drawSkillIcon(x + 8, y + this.CARD_HEIGHT - 18, spirit.type, 10);

    ctx.restore();
  }

  private drawSlots(): void {
    const ctx = this.ctx;
    this.gameManager.slots.forEach((slot: Slot, index: number) => {
      if (!slot.rune) {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, slot.x, slot.y, slot.width, slot.height, 10);
        ctx.stroke();

        ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, slot.x + slot.width / 2, slot.y + slot.height / 2);
        ctx.textBaseline = 'alphabetic';
      }
    });
  }

  private drawRunes(time: number): void {
    const allRunes: Rune[] = [];
    this.gameManager.runePool.forEach(r => { if (!r.isInSlot) allRunes.push(r); });
    this.gameManager.slots.forEach(s => { if (s.rune) allRunes.push(s.rune); });
    allRunes.sort((a, b) => (a.isDragging ? 1 : 0) - (b.isDragging ? 1 : 0));
    allRunes.forEach(rune => this.drawRune(rune, time));
  }

  private drawRunePool(time: number): void {
  }

  private drawRune(rune: Rune, time: number): void {
    if (rune.isFlying && rune.flyProgress >= 1) return;
    const ctx = this.ctx;
    const config = RUNE_CONFIG[rune.type];
    const levelColor = getRuneLevelColor(rune.level);
    const size = 25 * rune.scale;
    const pulse = 1 + 0.05 * Math.sin(time * 0.003 + rune.id);

    const flashing = rune.flashTimer > 0 && rune.flashCount > 0;
    const flashRed = flashing && Math.floor(rune.flashTimer * 10) % 2 === 0;

    ctx.save();
    ctx.translate(rune.x, rune.y);

    const glowSize = (2 + rune.level * 0.8) * pulse;
    ctx.shadowColor = flashRed ? '#FF0000' : levelColor;
    ctx.shadowBlur = glowSize * 3;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, flashRed ? '#FF6666' : '#FFFFFF');
    gradient.addColorStop(0.3, flashRed ? '#FF3333' : levelColor);
    gradient.addColorStop(1, flashRed ? '#990000' : config.color);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(angle) * size * pulse;
      const py = Math.sin(angle) * size * pulse;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = `bold ${Math.floor(size * 0.9)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.symbol, 0, 0);
    ctx.textBaseline = 'alphabetic';

    if (rune.level > 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 9px "Microsoft YaHei"';
      ctx.fillText(`Lv.${rune.level}`, 0, size + 10);
    }

    ctx.restore();
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    this.gameManager.particles.forEach((p: Particle) => {
      const alpha = p.life / p.maxLife;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(0.5, this.hexToRgba(p.color, alpha * 0.5));
      gradient.addColorStop(1, this.hexToRgba(p.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawSpirits(time: number): void {
    this.gameManager.spirits.forEach(spirit => {
      if (!spirit.isSummoning) return;
      this.drawSpirit(spirit, time);
    });
  }

  private drawSpirit(spirit: Spirit, time: number): void {
    const ctx = this.ctx;
    const config = SPIRIT_CONFIG[spirit.type];
    const size = 40 * spirit.scale;

    ctx.save();
    ctx.translate(spirit.x, spirit.y);
    ctx.rotate(spirit.rotation);
    ctx.globalAlpha = spirit.opacity * 0.8;

    ctx.shadowColor = config.color;
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
    gradient.addColorStop(0, config.gradientStart);
    gradient.addColorStop(0.7, this.hexToRgba(config.color, 0.5));
    gradient.addColorStop(1, this.hexToRgba(config.color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    this.drawSpiritIcon(0, 0, spirit.type, size, time);

    ctx.restore();
  }

  private drawSpiritIcon(x: number, y: number, type: SpiritType, size: number, time: number): void {
    const ctx = this.ctx;
    const config = SPIRIT_CONFIG[type];
    ctx.save();
    ctx.translate(x, y);

    switch (type) {
      case SpiritType.FIRE_SPIRIT:
        this.drawFireIcon(ctx, size, time, config.color);
        break;
      case SpiritType.WATER_SPIRIT:
        this.drawWaterIcon(ctx, size, time, config.color);
        break;
      case SpiritType.WIND_SPIRIT:
        this.drawWindIcon(ctx, size, time, config.color);
        break;
      case SpiritType.EARTH_SPIRIT:
        this.drawEarthIcon(ctx, size, time, config.color);
        break;
    }

    ctx.restore();
  }

  private drawFireIcon(ctx: CanvasRenderingContext2D, size: number, time: number, color: string): void {
    const flicker = 1 + 0.1 * Math.sin(time * 0.01);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size * flicker);
    ctx.quadraticCurveTo(size * 0.8, -size * 0.3, size * 0.5, size * 0.3);
    ctx.quadraticCurveTo(0, size * 0.5, -size * 0.5, size * 0.3);
    ctx.quadraticCurveTo(-size * 0.8, -size * 0.3, 0, -size * flicker);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6 * flicker);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.1, size * 0.2, size * 0.2);
    ctx.quadraticCurveTo(0, size * 0.3, -size * 0.2, size * 0.2);
    ctx.quadraticCurveTo(-size * 0.3, -size * 0.1, 0, -size * 0.6 * flicker);
    ctx.fill();
  }

  private drawWaterIcon(ctx: CanvasRenderingContext2D, size: number, time: number, color: string): void {
    const wave = Math.sin(time * 0.005) * 0.05;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.8 + wave), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-size * 0.2, -size * 0.2, size * 0.9, Math.PI * 0.8, Math.PI * 1.1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 0.3, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWindIcon(ctx: CanvasRenderingContext2D, size: number, time: number, color: string): void {
    const rot = time * 0.003;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(rot + (i * Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.5, -size * 0.2, size * 0.8, size * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.6, -size * 0.1);
      ctx.lineTo(size * 0.85, size * 0.15);
      ctx.lineTo(size * 0.65, size * 0.25);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawEarthIcon(ctx: CanvasRenderingContext2D, size: number, time: number, color: string): void {
    const wobble = Math.sin(time * 0.004) * 0.03;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, size * 0.3 + wobble * size);
    ctx.lineTo(-size * 0.5, -size * 0.5 - wobble * size);
    ctx.lineTo(size * 0.2, -size * 0.7);
    ctx.lineTo(size * 0.8, -size * 0.1 + wobble * size);
    ctx.lineTo(size * 0.6, size * 0.6);
    ctx.lineTo(-size * 0.3, size * 0.7 - wobble * size);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.3);
    ctx.lineTo(-size * 0.1, size * 0.2);
    ctx.moveTo(size * 0.1, -size * 0.4);
    ctx.lineTo(size * 0.3, size * 0.1);
    ctx.stroke();
  }

  private drawSkillIcon(x: number, y: number, type: SpiritType, size: number): void {
    const ctx = this.ctx;
    const config = SPIRIT_CONFIG[type];
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold ${size * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let symbol = '★';
    switch (type) {
      case SpiritType.FIRE_SPIRIT: symbol = '🔥'; break;
      case SpiritType.WATER_SPIRIT: symbol = '💧'; break;
      case SpiritType.WIND_SPIRIT: symbol = '🌪'; break;
      case SpiritType.EARTH_SPIRIT: symbol = '🪨'; break;
    }
    ctx.fillText(symbol, 0, 1);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  private drawSpiritDetailModal(time: number): void {
    if (this.selectedSpiritIndex < 0 || this.selectedSpiritIndex >= this.gameManager.summonedSpirits.length) return;

    const ctx = this.ctx;
    const spirit = this.gameManager.summonedSpirits[this.selectedSpiritIndex];
    const config = SPIRIT_CONFIG[spirit.type];
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    const modalW = 320;
    const modalH = 380;
    const mx = (w - modalW) / 2;
    const my = (h - modalH) / 2;

    const gradient = ctx.createLinearGradient(mx, my, mx, my + modalH);
    gradient.addColorStop(0, config.gradientStart);
    gradient.addColorStop(1, config.gradientEnd);
    ctx.fillStyle = gradient;
    this.roundRect(ctx, mx, my, modalW, modalH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, mx, my, modalW, modalH, 16);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Microsoft YaHei"';
    ctx.textAlign = 'center';
    ctx.fillText(config.name, mx + modalW / 2, my + 45);

    ctx.font = '14px "Microsoft YaHei"';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(config.typeName, mx + modalW / 2, my + 70);

    const stars = '★'.repeat(config.stars) + '☆'.repeat(5 - config.stars);
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(stars, mx + modalW / 2, my + 100);

    this.drawSpiritIcon(mx + modalW / 2, my + 180, spirit.type, 50, time);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 15px "Microsoft YaHei"';
    ctx.fillText(`技能：${config.skill}`, mx + modalW / 2, my + 260);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '13px "Microsoft YaHei"';
    this.wrapText(ctx, config.skillDesc, mx + 30, my + 290, modalW - 60, 20);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px "Microsoft YaHei"';
    ctx.fillText('点击任意位置关闭', mx + modalW / 2, my + modalH - 20);
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const chars = text.split('');
    let line = '';
    let lineY = y;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, lineY);
        line = chars[i];
        lineY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, lineY);
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

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public handleMouseMove(x: number, y: number): void {
    this.hoveredSpiritIndex = this.gameManager.getHoveredSpiritIndex(x, y);
    this.canvas.style.cursor = (this.gameManager.isMouseOverRune(x, y) || this.hoveredSpiritIndex >= 0) ? 'grab' : 'default';
  }

  public handleClick(x: number, y: number): void {
    if (this.selectedSpiritIndex >= 0) {
      this.selectedSpiritIndex = -1;
      return;
    }
    const idx = this.gameManager.getHoveredSpiritIndex(x, y);
    if (idx >= 0) {
      this.selectedSpiritIndex = idx;
    }
  }

  public handleWheel(deltaY: number): void {
    this.dexScrollOffset += deltaY * 0.5;
  }
}
