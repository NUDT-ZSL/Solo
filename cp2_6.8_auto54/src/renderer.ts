import type { ShipState, SubsystemType, ResourceType } from './ship';
import type { Fault } from './fault';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const SUBSYSTEM_COLORS: Record<SubsystemType, string> = {
  life: '#33B5E5',
  engine: '#FF8800',
  weapon: '#FF4444'
};

const RESOURCE_NAMES: Record<ResourceType, string> = {
  power: '电力',
  oxygen: '氧气',
  fuel: '燃料'
};

const SUBSYSTEM_NAMES: Record<SubsystemType, string> = {
  life: '维生系统',
  engine: '引擎系统',
  weapon: '武器系统'
};

export interface SliderState {
  resource: ResourceType;
  x: number;
  y: number;
  width: number;
  height: number;
  dragging: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles: Particle[] = [];
  private fireworks: Particle[] = [];
  private dpr: number;
  private shakeTime: number = 0;
  private shakeIntensity: number = 2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  public resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public triggerShake(): void {
    this.shakeTime = 0.1;
  }

  private spawnParticles(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.6,
        size: 1 + Math.random() * 2.5,
        color
      });
    }
  }

  public spawnFireworks(centerX: number, centerY: number): void {
    const colors = ['#FFD700', '#FF4444', '#33B5E5', '#00FF88', '#FF00FF', '#FFBB33'];
    for (let burst = 0; burst < 5; burst++) {
      const bx = centerX + (Math.random() - 0.5) * 200;
      const by = centerY + (Math.random() - 0.5) * 150;
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 2 + Math.random() * 4;
        this.fireworks.push({
          x: bx,
          y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 1.5 + Math.random() * 1,
          size: 2 + Math.random() * 3,
          color
        });
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const p = this.fireworks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vy += 0.05;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) this.fireworks.splice(i, 1);
    }
  }

  public getLayout() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    if (w > 1024) {
      return {
        shipArea: { x: 0, y: 0, w: w * 0.6, h },
        sliderArea: { x: w * 0.6, y: 0, w: w * 0.2, h },
        statusArea: { x: w * 0.8, y: 0, w: w * 0.2, h },
        mode: 'wide' as const
      };
    } else if (w >= 768) {
      return {
        shipArea: { x: 0, y: 0, w: w * 0.6, h: h * 0.65 },
        sliderArea: { x: 0, y: h * 0.65, w, h: h * 0.35 },
        statusArea: { x: w * 0.6, y: 0, w: w * 0.4, h: h * 0.65 },
        mode: 'medium' as const
      };
    } else {
      return {
        shipArea: { x: 0, y: 0, w, h: h * 0.45 },
        sliderArea: { x: 0, y: h * 0.45, w, h: h * 0.3 },
        statusArea: { x: 0, y: h * 0.75, w, h: h * 0.25 },
        mode: 'narrow' as const
      };
    }
  }

  private drawTextWithShadow(text: string, x: number, y: number, fontSize: number, color: string = '#FFFFFF', align: CanvasTextAlign = 'left'): void {
    const ctx = this.ctx;
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private drawShipView(area: { x: number; y: number; w: number; h: number }, shipState: ShipState, currentTime: number): void {
    const ctx = this.ctx;
    const cx = area.x + area.w / 2;
    const cy = area.y + area.h / 2;
    const scale = Math.min(area.w / 500, area.h / 400);

    this.drawTextWithShadow('飞船俯视图', area.x + 20, area.y + 15, 14, '#8899AA');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-180, -40);
    ctx.lineTo(-100, -100);
    ctx.lineTo(120, -90);
    ctx.lineTo(200, -30);
    ctx.lineTo(200, 30);
    ctx.lineTo(120, 90);
    ctx.lineTo(-100, 100);
    ctx.lineTo(-180, 40);
    ctx.closePath();
    ctx.fillStyle = '#1a2535';
    ctx.fill();
    ctx.strokeStyle = '#3a5575';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const subsystems: { type: SubsystemType; cx: number; cy: number; r: number }[] = [
      { type: 'life', cx: -100, cy: 0, r: 50 },
      { type: 'engine', cx: 150, cy: 0, r: 55 },
      { type: 'weapon', cx: 30, cy: 0, r: 45 }
    ];

    subsystems.forEach(({ type, cx: sx, cy: sy, r }) => {
      const durability = shipState.subsystems[type];
      const durabilityRatio = durability / 100;
      const sizeRatio = 0.5 + 0.5 * durabilityRatio;
      const actualR = r * sizeRatio;

      let color = SUBSYSTEM_COLORS[type];
      let alpha = 1;

      if (durability <= 0) {
        color = '#666666';
      } else if (durability < 30) {
        const blinkPhase = Math.sin(currentTime * Math.PI * 4);
        alpha = 0.5 + 0.5 * blinkPhase;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, actualR, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, actualR);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, this.darkenColor(color, 0.4));
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (durability <= 0) {
        ctx.fillStyle = '#FFCC00';
        ctx.font = '28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▲', sx, sy);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(SUBSYSTEM_NAMES[type], sx, sy + actualR + 16);
      ctx.font = '12px monospace';
      ctx.fillStyle = durability <= 0 ? '#FF4444' : '#FFFFFF';
      ctx.fillText(`${Math.round(durability)}%`, sx, sy + actualR + 32);

      ctx.restore();

      if (durability < 50 && Math.random() < 0.05) {
        this.spawnParticles(cx + sx * scale, cy + sy * scale, 2, '#FFFFFF');
      }
    });

    ctx.restore();
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
  }

  public getSliderPositions(): { resource: ResourceType; x: number; y: number; w: number; h: number }[] {
    const layout = this.getLayout();
    const area = layout.sliderArea;
    const resources: ResourceType[] = ['power', 'oxygen', 'fuel'];
    const result: { resource: ResourceType; x: number; y: number; w: number; h: number }[] = [];

    if (layout.mode === 'wide') {
      const sliderW = 40;
      const sliderH = Math.min(200, area.h * 0.35);
      const gap = (area.h - sliderH * 3) / 4;
      resources.forEach((res, i) => {
        result.push({
          resource: res,
          x: area.x + (area.w - sliderW) / 2,
          y: area.y + gap + i * (sliderH + gap),
          w: sliderW,
          h: sliderH
        });
      });
    } else {
      const sliderW = Math.min(40, area.w / 5);
      const sliderH = Math.min(200, area.h * 0.7);
      const totalW = sliderW * 3 + 80 * 2;
      const startX = area.x + (area.w - totalW) / 2;
      const y = area.y + (area.h - sliderH) / 2 + 15;
      resources.forEach((res, i) => {
        result.push({
          resource: res,
          x: startX + i * (sliderW + 80),
          y,
          w: sliderW,
          h: sliderH
        });
      });
    }
    return result;
  }

  public isPointInSlider(px: number, py: number, allocation: { power: number; oxygen: number; fuel: number }): ResourceType | null {
    const sliders = this.getSliderPositions();
    for (const s of sliders) {
      const handleY = this.getHandleY(s, allocation[s.resource]);
      if (px >= s.x - 15 && px <= s.x + s.w + 15 &&
          py >= s.y - 20 && py <= s.y + s.h + 20) {
        return s.resource;
      }
      if (Math.abs(px - (s.x + s.w / 2)) < 20 && Math.abs(py - handleY) < 20) {
        return s.resource;
      }
    }
    return null;
  }

  public getValueFromY(resource: ResourceType, py: number): number {
    const sliders = this.getSliderPositions();
    const slider = sliders.find(s => s.resource === resource);
    if (!slider) return 50;
    const ratio = 1 - Math.max(0, Math.min(1, (py - slider.y) / slider.h));
    return ratio * 100;
  }

  private getHandleY(slider: { x: number; y: number; w: number; h: number }, value: number): number {
    return slider.y + slider.h * (1 - value / 100);
  }

  public drawSliders(shipState: ShipState): void {
    const ctx = this.ctx;
    const sliders = this.getSliderPositions();
    const area = this.getLayout().sliderArea;

    this.drawTextWithShadow('资源分配', area.x + 15, area.y + 10, 14, '#8899AA');

    sliders.forEach(s => {
      const value = shipState.allocation[s.resource];

      this.drawTextWithShadow(
        RESOURCE_NAMES[s.resource],
        s.x + s.w / 2,
        s.y - 28,
        13,
        '#FFFFFF',
        'center'
      );

      const grad = ctx.createLinearGradient(s.x, s.y + s.h, s.x, s.y);
      grad.addColorStop(0, '#FF4444');
      grad.addColorStop(0.5, '#FFBB33');
      grad.addColorStop(1, '#00C853');

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(s.x, s.y, s.w, s.h);

      const fillH = (value / 100) * s.h;
      ctx.fillStyle = grad;
      ctx.fillRect(s.x, s.y + s.h - fillH, s.w, fillH);

      ctx.strokeStyle = '#445566';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      const handleY = s.y + s.h - fillH;
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00FFFF';
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, handleY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      this.drawTextWithShadow(
        `${Math.round(value)}%`,
        s.x + s.w / 2,
        s.y + s.h + 8,
        12,
        '#AABBCC',
        'center'
      );
    });
  }

  public drawStatusPanel(shipState: ShipState, score: number, timeRemaining: number): void {
    const ctx = this.ctx;
    const area = this.getLayout().statusArea;

    ctx.fillStyle = 'rgba(20, 25, 40, 0.6)';
    ctx.fillRect(area.x, area.y, area.w, area.h);
    ctx.strokeStyle = '#2a3a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(area.x, area.y, area.w, area.h);

    let y = area.y + 20;
    const left = area.x + 20;

    this.drawTextWithShadow('星际探索者号', left, y, 18, '#00FFFF');
    y += 38;

    this.drawTextWithShadow('━━━━ 子系统耐久 ━━━━', left, y, 11, '#667788');
    y += 20;

    (['life', 'engine', 'weapon'] as SubsystemType[]).forEach(type => {
      const durability = shipState.subsystems[type];
      this.drawTextWithShadow(SUBSYSTEM_NAMES[type], left, y, 12, SUBSYSTEM_COLORS[type]);
      y += 16;

      const barW = area.w - 50;
      const barH = 10;
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(left, y, barW, barH);
      const fillW = (durability / 100) * barW;
      ctx.fillStyle = SUBSYSTEM_COLORS[type];
      ctx.fillRect(left, y, fillW, barH);
      ctx.strokeStyle = '#334455';
      ctx.lineWidth = 1;
      ctx.strokeRect(left, y, barW, barH);

      this.drawTextWithShadow(
        `${Math.round(durability)}/100`,
        left + barW + 6,
        y - 1,
        11,
        '#FFFFFF'
      );
      y += 24;
    });

    y += 8;
    this.drawTextWithShadow('━━━━ 资源池 ━━━━', left, y, 11, '#667788');
    y += 18;

    (['power', 'oxygen', 'fuel'] as ResourceType[]).forEach(r => {
      const val = shipState.resources[r];
      this.drawTextWithShadow(
        `${RESOURCE_NAMES[r]}: ${Math.round(val)}/200`,
        left,
        y,
        12,
        val < 40 ? '#FF4444' : '#CCDDDD'
      );
      y += 20;
    });

    y += 10;
    this.drawTextWithShadow('━━━━ 任务状态 ━━━━', left, y, 11, '#667788');
    y += 20;

    this.drawTextWithShadow(`得分: ${score}`, left, y, 16, '#FFD700');
    y += 28;

    const mins = Math.floor(timeRemaining / 60);
    const secs = Math.floor(timeRemaining % 60);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.drawTextWithShadow(
      `剩余: ${timeStr}`,
      left,
      y,
      16,
      timeRemaining < 20 ? '#FF4444' : '#FFFFFF'
    );
  }

  public drawFaultPopups(faults: Fault[], currentTime: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    faults.forEach((fault, index) => {
      const popupW = 380;
      const popupH = 220;
      let scale = 1;
      let alpha = 1;

      if (!fault.closing) {
        const t = Math.min(1, (currentTime - fault.appearTime) / 0.3);
        scale = 0.5 + 0.5 * (1 - Math.pow(1 - t, 3));
        alpha = t;
      } else {
        const t = Math.min(1, (currentTime - fault.closeStartTime) / 0.2);
        scale = 1 - 0.5 * t;
        alpha = 1 - t;
      }

      const px = w / 2;
      const py = h / 2 - 60 + index * 30;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.scale(scale, scale);
      ctx.translate(-px, -py);

      const x = px - popupW / 2;
      const y = py - popupH / 2;

      ctx.save();
      ctx.beginPath();
      const r = 12;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + popupW - r, y);
      ctx.quadraticCurveTo(x + popupW, y, x + popupW, y + r);
      ctx.lineTo(x + popupW, y + popupH - r);
      ctx.quadraticCurveTo(x + popupW, y + popupH, x + popupW - r, y + popupH);
      ctx.lineTo(x + r, y + popupH);
      ctx.quadraticCurveTo(x, y + popupH, x, y + popupH - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
      ctx.fill();

      const gradient = ctx.createLinearGradient(x, y, x + popupW, y + popupH);
      gradient.addColorStop(0, '#00FFFF');
      gradient.addColorStop(1, '#FF00FF');
      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.stroke();
      ctx.restore();

      let textY = y + 18;
      this.drawTextWithShadow(`⚠ ${fault.name}`, x + 20, textY, 18, '#FFBB33');
      textY += 32;

      ctx.font = '12px monospace';
      ctx.fillStyle = '#AABBCC';
      ctx.textAlign = 'left';
      ctx.fillText(fault.description, x + 20, textY, popupW - 40);
      textY += 30;

      fault.steps.forEach((step, i) => {
        const color = step.completed ? '#00C853' : (i === fault.currentStep ? '#FFFFFF' : '#667788');
        const prefix = step.completed ? '✓ ' : (i === fault.currentStep ? '▶ ' : '  ');
        this.drawTextWithShadow(
          `${prefix}${step.description}`,
          x + 20,
          textY,
          13,
          color
        );
        textY += 22;
      });

      const timeRatio = fault.timeRemaining / fault.totalTime;
      const barW = popupW - 40;
      const barH = 8;
      const barY = y + popupH - 24;
      ctx.fillStyle = '#222233';
      ctx.fillRect(x + 20, barY, barW, barH);
      ctx.fillStyle = timeRatio > 0.3 ? '#00FFFF' : '#FF4444';
      ctx.fillRect(x + 20, barY, barW * timeRatio, barH);

      this.drawTextWithShadow(
        `${Math.ceil(fault.timeRemaining)}s`,
        x + popupW - 35,
        barY - 20,
        14,
        timeRatio > 0.3 ? '#00FFFF' : '#FF4444',
        'right'
      );

      ctx.restore();
    });
  }

  public drawGameOver(score: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.fillStyle = 'rgba(13, 13, 26, 0.85)';
    ctx.fillRect(0, 0, w, h);

    let grade = 'C';
    let gradeColor = '#CCCCCC';
    if (score > 2000) { grade = 'S'; gradeColor = '#FFD700'; }
    else if (score >= 1500) { grade = 'A'; gradeColor = '#00FF88'; }
    else if (score >= 1000) { grade = 'B'; gradeColor = '#33B5E5'; }

    this.drawTextWithShadow('任务结束', w / 2, h / 2 - 120, 32, '#FFFFFF', 'center');

    ctx.save();
    ctx.font = 'bold 120px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 30;
    ctx.shadowColor = gradeColor;
    ctx.fillStyle = gradeColor;
    ctx.fillText(grade, w / 2, h / 2 - 10);
    ctx.restore();

    this.drawTextWithShadow(`最终得分: ${score}`, w / 2, h / 2 + 80, 28, '#FFD700', 'center');

    this.drawTextWithShadow(
      '点击任意位置重新开始',
      w / 2,
      h / 2 + 140,
      14,
      '#8899AA',
      'center'
    );
  }

  public drawParticles(): void {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    this.fireworks.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  public render(
    shipState: ShipState,
    faults: Fault[],
    score: number,
    timeRemaining: number,
    gameOver: boolean,
    currentTime: number,
    dt: number
  ): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      ctx.save();
      ctx.translate(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
    }

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    bgGrad.addColorStop(0, '#12122a');
    bgGrad.addColorStop(1, '#0D0D1A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    this.drawStarfield(w, h, currentTime);

    const layout = this.getLayout();
    this.drawShipView(layout.shipArea, shipState, currentTime);
    this.drawSliders(shipState);
    this.drawStatusPanel(shipState, score, timeRemaining);
    this.drawFaultPopups(faults, currentTime);

    this.updateParticles(dt);
    this.drawParticles();

    if (gameOver) {
      this.drawGameOver(score);
    }

    if (this.shakeTime > 0) {
      ctx.restore();
    }
  }

  private drawStarfield(w: number, h: number, time: number): void {
    const ctx = this.ctx;
    const count = 80;
    for (let i = 0; i < count; i++) {
      const seed = i * 7.13;
      const x = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * w;
      const y = ((Math.cos(seed * 2.3) * 10000) % 1 + 1) % 1 * h;
      const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 2 + seed));
      const size = 0.5 + (i % 3) * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.4 * twinkle})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
