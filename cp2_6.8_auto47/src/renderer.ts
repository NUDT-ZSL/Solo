import { Ship, SlotKey, SLOT_MIN, SLOT_MAX } from './ship';
import { AIStrategy, PresetStrategy, PRESET_STRATEGIES } from './ai';

interface DamageFloat {
  x: number;
  y: number;
  value: number;
  startTime: number;
  duration: number;
  target: 'player' | 'ai';
}

interface SliderRect {
  key: SlotKey;
  x: number;
  y: number;
  width: number;
  height: number;
  handleX: number;
  handleY: number;
  handleRadius: number;
}

interface ButtonRect {
  x: number;
  y: number;
  width: number;
  height: number;
  action: () => void;
  hover: boolean;
}

const SLOT_COLORS: Record<SlotKey, string> = {
  weapon: '#FF3B3B',
  shield: '#3B8BFF',
  engine: '#3BFF6B',
};

const SLOT_LABELS: Record<SlotKey, string> = {
  weapon: '武器',
  shield: '护盾',
  engine: '引擎',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr: number = 1;
  private playerShip: Ship;
  private aiShip: Ship;
  private ai: AIStrategy;
  private damageFloats: DamageFloat[] = [];
  public sliders: SliderRect[] = [];
  private buttons: ButtonRect[] = [];
  private draggingSlider: SlotKey | null = null;
  private width: number = 0;
  private height: number = 0;
  private stars: { x: number; y: number; size: number; speed: number }[] = [];

  constructor(canvas: HTMLCanvasElement, playerShip: Ship, aiShip: Ship, ai: AIStrategy) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.playerShip = playerShip;
    this.aiShip = aiShip;
    this.ai = ai;
    this.initStars();
    this.setupInputHandlers();
  }

  private initStars(): void {
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
      });
    }
  }

  public resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private setupInputHandlers(): void {
    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      for (const slider of this.sliders) {
        const dx = pos.x - slider.handleX;
        const dy = pos.y - slider.handleY;
        if (dx * dx + dy * dy <= (slider.handleRadius + 6) * (slider.handleRadius + 6)) {
          this.draggingSlider = slider.key;
          e.preventDefault();
          return;
        }
      }
      for (const btn of this.buttons) {
        if (pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height) {
          btn.action();
          e.preventDefault();
          return;
        }
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      for (const btn of this.buttons) {
        btn.hover = pos.x >= btn.x && pos.x <= btn.x + btn.width && pos.y >= btn.y && pos.y <= btn.y + btn.height;
      }
      if (this.draggingSlider) {
        const slider = this.sliders.find(s => s.key === this.draggingSlider);
        if (slider) {
          const ratio = Math.max(0, Math.min(1, (pos.x - slider.x) / slider.width));
          const value = Math.round(SLOT_MIN + ratio * (SLOT_MAX - SLOT_MIN));
          this.playerShip.setSlot(this.draggingSlider, value);
          this.playerShip.tween = null;
        }
        e.preventDefault();
      }
    };

    const onUp = () => {
      this.draggingSlider = null;
    };

    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('mouseleave', onUp);
    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onUp);
    this.canvas.addEventListener('touchcancel', onUp);
  }

  public addDamageFloat(target: 'player' | 'ai', value: number, now: number): void {
    const layout = this.getLayout();
    const centerX = target === 'player' ? layout.playerShipX : layout.aiShipX;
    this.damageFloats.push({
      x: centerX + (Math.random() - 0.5) * 60,
      y: layout.shipY - 20,
      value,
      startTime: now,
      duration: 600,
      target,
    });
  }

  private getLayout() {
    const w = this.width;
    const h = this.height;
    const isNarrow = w < 640;

    if (isNarrow) {
      return {
        isNarrow: true,
        playerShipX: w * 0.3,
        aiShipX: w * 0.7,
        shipY: h * 0.18,
        sliderAreaY: h * 0.35,
        sliderAreaHeight: h * 0.2,
        presetAreaY: h * 0.57,
        logAreaX: 20,
        logAreaY: h * 0.68,
        logAreaWidth: w - 40,
        logAreaHeight: h * 0.3,
      };
    }

    return {
      isNarrow: false,
      playerShipX: w * 0.25,
      aiShipX: w * 0.75,
      shipY: h * 0.25,
      sliderAreaY: h * 0.55,
      sliderAreaHeight: h * 0.18,
      presetAreaY: h * 0.75,
      logAreaX: w * 0.55,
      logAreaY: h * 0.05,
      logAreaWidth: w * 0.42,
      logAreaHeight: h * 0.48,
    };
  }

  public render(now: number): void {
    const ctx = this.ctx;
    const layout = this.getLayout();

    ctx.fillStyle = '#0D111A';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawStars(now);
    this.drawTitle();

    if (layout.isNarrow) {
      this.drawShip(this.playerShip, layout.playerShipX, layout.shipY, now, false);
      this.drawShip(this.aiShip, layout.aiShipX, layout.shipY, now, true);
      this.drawHpBar(this.playerShip, layout.playerShipX, layout.shipY + 70);
      this.drawHpBar(this.aiShip, layout.aiShipX, layout.shipY + 70);
      this.drawSliders(layout.sliderAreaY, layout.sliderAreaHeight, now);
      this.drawPresetButtons(layout.presetAreaY);
      this.drawLogAreaTimeline(20, layout.logAreaY, this.width - 40, layout.logAreaHeight, now);
    } else {
      this.drawShip(this.playerShip, layout.playerShipX, layout.shipY, now, false);
      this.drawShip(this.aiShip, layout.aiShipX, layout.shipY, now, true);
      this.drawHpBar(this.playerShip, layout.playerShipX, layout.shipY + 75);
      this.drawHpBar(this.aiShip, layout.aiShipX, layout.shipY + 75);
      this.drawSliders(layout.sliderAreaY, layout.sliderAreaHeight, now);
      this.drawPresetButtons(layout.presetAreaY);
      this.drawLogAreaTimeline(layout.logAreaX, layout.logAreaY, layout.logAreaWidth, layout.logAreaHeight, now);
    }

    this.drawDamageFloats(now);

    if (this.ai.gameOver && this.ai.winner) {
      this.drawGameOver(this.ai.winner, now);
    }
  }

  private drawTitle(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 18px -apple-system, sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(74,158,255,0.8)';
    ctx.shadowBlur = 8;
    if (this.width >= 640) {
      ctx.fillText('⚡ 战舰能量策略对抗系统', 20, 28);
    }
    ctx.restore();
  }

  private drawStars(now: number): void {
    const ctx = this.ctx;
    ctx.save();
    for (const star of this.stars) {
      const x = (star.x + now * star.speed * 0.02) % this.width;
      const y = star.y % this.height;
      ctx.fillStyle = `rgba(180,200,255,${0.3 + Math.sin(now * 0.002 + star.x) * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawShip(ship: Ship, cx: number, cy: number, now: number, flipped: boolean): void {
    const ctx = this.ctx;
    const scale = flipped ? -1 : 1;
    const flashing = now < ship.shieldFlashUntil;
    const flashAlpha = flashing ? (Math.sin(now * 0.04 * (ship.shieldFlashFrequency * 3 + 1)) * 0.5 + 0.5) : 0;

    ctx.save();
    ctx.translate(cx, cy);

    this.drawEngineFlame(ship.slots.engine, scale);

    ctx.save();
    ctx.scale(scale, 1);

    ctx.shadowColor = 'rgba(74,158,255,0.6)';
    ctx.shadowBlur = 8;

    ctx.fillStyle = '#2A2A3A';
    ctx.strokeStyle = flashing ? `rgba(255,255,255,${0.5 + flashAlpha * 0.5})` : '#4A9EFF';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(30, -25);
    ctx.lineTo(-40, -30);
    ctx.lineTo(-55, -15);
    ctx.lineTo(-55, 15);
    ctx.lineTo(-40, 30);
    ctx.lineTo(30, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4A9EFF';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(10, 0, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1A2A';
    ctx.shadowBlur = 0;
    ctx.fillRect(-30, -25, 20, 50);

    ctx.fillStyle = '#4A9EFF';
    ctx.shadowColor = 'rgba(74,158,255,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillRect(-28, -22, 4, 44);
    ctx.fillRect(-18, -22, 4, 44);

    ctx.restore();

    if (flashing || ship.slots.shield > 30) {
      ctx.save();
      ctx.scale(scale, 1);
      const shieldPulse = 0.3 + Math.sin(now * 0.003) * 0.1 + flashAlpha * 0.4;
      ctx.strokeStyle = `rgba(59,139,255,${0.3 + ship.slots.shield / 200 + shieldPulse * 0.3})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(59,139,255,0.8)';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(0, 0, 75, 50, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    ctx.save();
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.textAlign = 'center';
    ctx.fillText(flipped ? '敌方 AI' : '我方战舰', cx, cy - 55);
    ctx.restore();
  }

  private drawEngineFlame(engineEnergy: number, scale: number): void {
    const ctx = this.ctx;
    const flameLength = 15 + engineEnergy * 1.2;
    const flicker = Math.sin(performance.now() * 0.03) * 3;

    ctx.save();
    ctx.scale(scale, 1);
    ctx.shadowColor = 'rgba(59,255,107,0.8)';
    ctx.shadowBlur = 10;

    const grad = ctx.createLinearGradient(-55 - flameLength, 0, -55, 0);
    grad.addColorStop(0, 'rgba(59,255,107,0)');
    grad.addColorStop(0.5, 'rgba(59,255,107,0.6)');
    grad.addColorStop(1, 'rgba(74,158,255,0.9)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-55, -8);
    ctx.quadraticCurveTo(-55 - flameLength - flicker, 0, -55, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawHpBar(ship: Ship, x: number, y: number): void {
    const ctx = this.ctx;
    const w = 100;
    const h = 8;
    const ratio = ship.hp / ship.maxHp;

    ctx.save();
    ctx.fillStyle = '#1A1A2A';
    ctx.strokeStyle = 'rgba(74,158,255,0.6)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x - w / 2, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    const hpColor = ratio > 0.5 ? '#3BFF6B' : ratio > 0.25 ? '#FFB73B' : '#FF3B3B';
    ctx.fillStyle = hpColor;
    ctx.shadowColor = hpColor;
    ctx.shadowBlur = 4;
    this.roundRect(ctx, x - w / 2 + 1, y + 1, (w - 2) * ratio, h - 2, 3);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.textAlign = 'center';
    ctx.fillText(`HP ${ship.hp}/${ship.maxHp}`, x, y + h + 14);
    ctx.restore();
  }

  private drawSliders(y: number, areaHeight: number, now: number): void {
    const ctx = this.ctx;
    const keys: SlotKey[] = ['weapon', 'shield', 'engine'];
    const totalWidth = this.width - 80;
    const sliderWidth = Math.min(280, (totalWidth - 40) / 3);
    const spacing = (this.width - sliderWidth * 3) / 4;
    this.sliders = [];

    ctx.save();
    ctx.font = '12px -apple-system, sans-serif';

    keys.forEach((key, i) => {
      const sx = spacing + i * (sliderWidth + spacing);
      const sy = y + 30;
      const sw = sliderWidth;
      const sh = 10;
      const value = this.playerShip.slots[key];
      const ratio = (value - SLOT_MIN) / (SLOT_MAX - SLOT_MIN);
      const handleX = sx + sw * ratio;
      const handleY = sy + sh / 2;
      const brightness = 0.7 + (value / SLOT_MAX) * 0.3;

      this.sliders.push({
        key,
        x: sx,
        y: sy,
        width: sw,
        height: sh,
        handleX,
        handleY,
        handleRadius: 8,
      });

      const baseColor = SLOT_COLORS[key];
      const litColor = this.adjustBrightness(baseColor, brightness);

      ctx.fillStyle = '#1A1A2A';
      ctx.strokeStyle = 'rgba(74,158,255,0.4)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, sx, sy, sw, sh, 5);
      ctx.fill();
      ctx.stroke();

      const grad = ctx.createLinearGradient(sx, 0, sx + sw, 0);
      grad.addColorStop(0, this.adjustBrightness(baseColor, 0.5));
      grad.addColorStop(1, litColor);
      ctx.fillStyle = grad;
      this.roundRect(ctx, sx, sy, sw * ratio, sh, 5);
      ctx.fill();

      ctx.save();
      ctx.shadowColor = litColor;
      ctx.shadowBlur = 12 + Math.sin(now * 0.005) * 4;
      ctx.fillStyle = litColor;
      ctx.beginPath();
      ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#E0E0E0';
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillText(SLOT_LABELS[key], sx, sy - 10);

      ctx.textAlign = 'right';
      ctx.fillStyle = litColor;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillText(`${value}`, sx + sw, sy - 10);
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = '#8899AA';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('拖拽滑块调整能量分配（总能量 150）', spacing, y + areaHeight - 5);
    ctx.restore();
  }

  private drawPresetButtons(y: number): void {
    const ctx = this.ctx;
    const strategies: { key: PresetStrategy; label: string }[] = [
      { key: 'balanced', label: '均分' },
      { key: 'attack', label: '攻击优先' },
      { key: 'defense', label: '防御优先' },
    ];
    const totalWidth = this.width - 80;
    const btnW = Math.min(140, (totalWidth - 40) / 4);
    const btnH = 34;
    const spacing = (this.width - btnW * 4) / 5;
    this.buttons = [];

    strategies.forEach((s, i) => {
      const bx = spacing + i * (btnW + spacing);
      const by = y;
      const rect: ButtonRect = {
        x: bx,
        y: by,
        width: btnW,
        height: btnH,
        hover: false,
        action: () => {
          this.playerShip.startTween({ ...PRESET_STRATEGIES[s.key] }, performance.now(), 500);
        },
      };
      this.buttons.push(rect);
      this.drawButton(ctx, rect, s.label);
    });

    const resetBx = spacing + 3 * (btnW + spacing);
    const resetRect: ButtonRect = {
      x: resetBx,
      y,
      width: btnW,
      height: btnH,
      hover: false,
      action: () => {
        this.playerShip.reset();
        this.aiShip.reset();
        this.ai.reset();
        this.damageFloats = [];
      },
    };
    this.buttons.push(resetRect);
    this.drawButton(ctx, resetRect, '重置对局', '#FF6B6B');
  }

  private drawButton(ctx: CanvasRenderingContext2D, rect: ButtonRect, label: string, accent: string = '#4A9EFF'): void {
    ctx.save();
    const scale = rect.hover ? 1.05 : 1;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    ctx.shadowColor = accent;
    ctx.shadowBlur = rect.hover ? 12 : 6;
    ctx.fillStyle = '#1A1A2A';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = rect.hover ? '#FFFFFF' : accent;
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.restore();
  }

  private drawLogAreaTimeline(x: number, y: number, w: number, h: number, now: number): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = 'rgba(20,25,40,0.6)';
    ctx.strokeStyle = 'rgba(74,158,255,0.4)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'rgba(74,158,255,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#E0E0E0';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📜 战斗日志', x + 15, y + 24);
    ctx.shadowBlur = 0;

    const axisX = x + 25;
    const startY = y + 45;
    const endY = y + h - 15;
    const availableH = endY - startY;

    ctx.strokeStyle = 'rgba(74,158,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(axisX, startY);
    ctx.lineTo(axisX, endY);
    ctx.stroke();

    const logs = this.ai.logs;
    const entryH = Math.min(28, availableH / Math.max(1, Math.min(logs.length, 8)));

    logs.slice(0, 8).forEach((log, i) => {
      const ly = startY + entryH * i + entryH / 2;
      const isPlayerAttack = log.playerDamageToAi > 0;

      ctx.fillStyle = isPlayerAttack ? '#3BFF6B' : '#FF3B3B';
      ctx.shadowColor = isPlayerAttack ? 'rgba(59,255,107,0.8)' : 'rgba(255,59,59,0.8)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(axisX, ly, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#B0B8C8';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      const textX = axisX + 14;
      const maxTextW = w - 45;
      const displayText = this.truncateText(ctx, log.text, maxTextW);
      ctx.fillText(displayText, textX, ly + 4);
    });

    if (logs.length === 0) {
      ctx.fillStyle = '#667788';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('等待战斗开始...', x + w / 2, y + h / 2);
    }

    ctx.restore();
    void now;
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let result = text;
    while (result.length > 2 && ctx.measureText(result + '…').width > maxWidth) {
      result = result.slice(0, -1);
    }
    return result + '…';
  }

  private drawDamageFloats(now: number): void {
    const ctx = this.ctx;
    this.damageFloats = this.damageFloats.filter(d => now - d.startTime < d.duration);

    ctx.save();
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const d of this.damageFloats) {
      const t = (now - d.startTime) / d.duration;
      const alpha = 1 - t;
      const yOffset = -40 * t;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.shadowColor = d.target === 'player' ? 'rgba(255,59,59,0.8)' : 'rgba(255,255,255,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillText(`-${d.value}`, d.x, d.y + yOffset);
    }
    ctx.restore();
  }

  private drawGameOver(winner: 'player' | 'ai', now: number): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const isWin = winner === 'player';
    const color = isWin ? '#4CAF50' : '#F44336';
    const pulse = Math.sin(now * 0.005) * 0.1 + 1;

    ctx.save();
    ctx.fillStyle = 'rgba(13,17,26,0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = color;
    ctx.font = 'bold 48px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isWin ? '胜利！' : '战败！', 0, -30);

    ctx.beginPath();
    if (isWin) {
      ctx.moveTo(0, 30);
      ctx.lineTo(-20, 10);
      ctx.lineTo(-10, 10);
      ctx.lineTo(-10, -10);
      ctx.lineTo(10, -10);
      ctx.lineTo(10, 10);
      ctx.lineTo(20, 10);
      ctx.closePath();
    } else {
      ctx.moveTo(0, -10);
      ctx.lineTo(-20, 10);
      ctx.lineTo(-10, 10);
      ctx.lineTo(-10, 30);
      ctx.lineTo(10, 30);
      ctx.lineTo(10, 10);
      ctx.lineTo(20, 10);
      ctx.closePath();
    }
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#E0E0E0';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText('点击「重置对局」重新开始', 0, 70);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private adjustBrightness(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, Math.round(r * factor));
    const ng = Math.min(255, Math.round(g * factor));
    const nb = Math.min(255, Math.round(b * factor));
    return `rgb(${nr},${ng},${nb})`;
  }
}
