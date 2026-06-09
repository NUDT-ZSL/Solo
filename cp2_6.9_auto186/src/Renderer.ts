import {
  Jellyfish, NutrientBall, DisturbanceLine, RGB,
  NutrientColor, NUTRIENT_COLORS, NUTRIENT_COLOR_KEYS, StatCard,
  DISTURBANCE_WIDTH
} from './types';
import { JellyfishManager } from './JellyfishManager';

function rgbToString(c: RGB, alpha = 1): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t))
  };
}

function easeOutElastic(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}

interface RippleEffect {
  x: number;
  y: number;
  color: RGB;
  startTime: number;
  duration: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private selectedColor: NutrientColor | null = null;
  private colorPressAnimations: Map<NutrientColor, number> = new Map();
  private ripples: RippleEffect[] = [];
  private stats: StatCard[] = [
    { label: '水母总数', value: 0, lastAnimated: 0, bounceProgress: 1, prevValue: 0 },
    { label: '平均半径', value: 0, lastAnimated: 0, bounceProgress: 1, prevValue: 0 },
    { label: '最大频率', value: 0, lastAnimated: 0, bounceProgress: 1, prevValue: 0 },
    { label: '已消亡', value: 0, lastAnimated: 0, bounceProgress: 1, prevValue: 0 }
  ];
  private panelCollapsed = false;
  private smallScreen = false;

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.ctx = ctx;
    this.width = w;
    this.height = h;
    for (const k of NUTRIENT_COLOR_KEYS) this.colorPressAnimations.set(k, 1);
    this.smallScreen = w < 600;
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.smallScreen = w < 600;
  }

  setSelectedColor(c: NutrientColor | null): void {
    this.selectedColor = c;
  }

  getSelectedColor(): NutrientColor | null {
    return this.selectedColor;
  }

  triggerColorPress(color: NutrientColor, x: number, y: number): void {
    this.colorPressAnimations.set(color, 0);
    this.ripples.push({
      x, y,
      color: { ...NUTRIENT_COLORS[color] },
      startTime: performance.now(),
      duration: 0.5
    });
  }

  togglePanel(): void {
    this.panelCollapsed = !this.panelCollapsed;
  }

  isPanelCollapsed(): boolean {
    return this.panelCollapsed && this.smallScreen;
  }

  getBottomPanelBounds(): { x: number; y: number; w: number; h: number } {
    const padding = this.smallScreen ? 5 : 10;
    const panelHeight = 60;
    const panelWidth = Math.min(this.width - 40, 450);
    const x = (this.width - panelWidth) / 2;
    const y = this.height - panelHeight - 20;
    void padding;
    return { x, y, w: panelWidth, h: panelHeight };
  }

  getColorBallBounds(index: number): { x: number; y: number; r: number } {
    const panel = this.getBottomPanelBounds();
    const padding = this.smallScreen ? 5 : 10;
    const usableW = panel.w - padding * 2;
    const spacing = usableW / NUTRIENT_COLOR_KEYS.length;
    const cx = panel.x + padding + spacing * index + spacing / 2;
    const cy = panel.y + panel.h / 2;
    const anim = this.colorPressAnimations.get(NUTRIENT_COLOR_KEYS[index]) ?? 1;
    const baseR = 15;
    const r = lerp(20, baseR, easeOutElastic(Math.min(1, anim / 0.3)));
    return { x: cx, y: cy, r };
  }

  getStatsPanelBounds(): { x: number; y: number; w: number; h: number } {
    if (this.panelCollapsed && this.smallScreen) {
      return { x: 0, y: this.height / 2 - 40, w: 40, h: 80 };
    }
    const w = 180;
    const x = this.smallScreen ? 10 : this.width - w - 10;
    return { x, y: 10, w, h: 0 };
  }

  isPointInCollapsedIcon(px: number, py: number): boolean {
    if (!this.smallScreen) return false;
    const b = this.getStatsPanelBounds();
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  private drawBackground(): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0F2027');
    grad.addColorStop(0.5, '#203A43');
    grad.addColorStop(1, '#2C5364');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 60; i++) {
      const x = ((i * 137.5) % this.width);
      const y = ((i * 97.3) % this.height);
      const r = (i % 3 === 0) ? 1.5 : 0.8;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawJellyfish(jf: Jellyfish): void {
    const ctx = this.ctx;
    const glowIntensity = (Math.sin(jf.glowPhase) + 1) / 2;
    const glowAlpha = lerp(0.3, 0.9, glowIntensity);
    const glowColor = lerpColor(jf.color, { r: 255, g: 255, b: 255 }, glowIntensity * 0.4);
    const glowRadius = jf.radius + 8;

    if (jf.isDead) {
      const fadeOut = Math.max(0, 1 - jf.deathProgress);
      ctx.globalAlpha = fadeOut;
      if (jf.radius <= 0 && jf.deathProgress < 1) {
        const fadeR = 2 * (1 - (jf.deathProgress % 1));
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(jf.pos.x, jf.pos.y, fadeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }
    }

    const glowGrad = ctx.createRadialGradient(jf.pos.x, jf.pos.y, jf.radius * 0.5, jf.pos.x, jf.pos.y, glowRadius);
    glowGrad.addColorStop(0, rgbToString(glowColor, glowAlpha * 0.7));
    glowGrad.addColorStop(1, rgbToString(glowColor, 0));
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(jf.pos.x, jf.pos.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(jf.pos.x, jf.pos.y, jf.radius, Math.PI, 0, false);
    const bodyGrad = ctx.createRadialGradient(
      jf.pos.x, jf.pos.y - jf.radius * 0.3, jf.radius * 0.1,
      jf.pos.x, jf.pos.y, jf.radius
    );
    bodyGrad.addColorStop(0, rgbToString(jf.color, 0.9));
    bodyGrad.addColorStop(1, rgbToString(jf.color, 0.5));
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = rgbToString(glowColor, glowAlpha);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(jf.pos.x, jf.pos.y, jf.radius * 0.6, Math.PI, 0, false);
    ctx.fillStyle = rgba(255, 255, 255, 0.15);
    ctx.fill();

    const tentacleCount = 6;
    for (let i = 0; i < tentacleCount; i++) {
      const t = i / (tentacleCount - 1);
      const startX = jf.pos.x - jf.radius + 2 * jf.radius * t;
      const startY = jf.pos.y;
      const wave = Math.sin(jf.tentaclePhase + i * 0.8) * (jf.radius * 0.4);
      const endX = startX + wave;
      const endY = startY + jf.radius * 1.5 + Math.abs(wave) * 0.3;
      const cpX = startX + wave * 0.5;
      const cpY = startY + jf.radius * 0.8;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.strokeStyle = rgbToString(jf.color, 0.4);
      ctx.lineWidth = lerp(3, 1, t === 0 || t === 1 ? 0 : 1);
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    if (jf.energy < 30 && !jf.isDead) {
      const pulseAlpha = (Math.sin(jf.warningPulsePhase) + 1) / 2 * 0.5;
      ctx.fillStyle = rgba(255, 60, 60, pulseAlpha);
      ctx.beginPath();
      ctx.arc(jf.pos.x, jf.pos.y, jf.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private drawNutrientBall(ball: NutrientBall): void {
    const ctx = this.ctx;
    const glowGrad = ctx.createRadialGradient(ball.pos.x, ball.pos.y, 0, ball.pos.x, ball.pos.y, ball.radius * 3);
    glowGrad.addColorStop(0, rgbToString(ball.color, 0.6));
    glowGrad.addColorStop(1, rgbToString(ball.color, 0));
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgbToString(ball.color, 0.9);
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(255, 255, 255, 0.6);
    ctx.beginPath();
    ctx.arc(ball.pos.x - ball.radius * 0.3, ball.pos.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMatingLine(jf1: Jellyfish, jf2: Jellyfish): void {
    const ctx = this.ctx;
    const mixedColor = lerpColor(jf1.color, jf2.color, 0.5);
    ctx.strokeStyle = rgbToString(mixedColor, 0.4);
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(jf1.pos.x, jf1.pos.y);
    ctx.lineTo(jf2.pos.x, jf2.pos.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawDisturbance(d: DisturbanceLine): void {
    const ctx = this.ctx;
    const elapsed = (performance.now() - d.startTime) / 1000;
    const alpha = Math.max(0, 1 - elapsed / d.duration);
    if (alpha <= 0 || d.points.length < 2) return;

    ctx.strokeStyle = rgba(255, 255, 255, alpha * 0.4);
    ctx.lineWidth = DISTURBANCE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(d.points[0].x, d.points[0].y);
    for (let i = 1; i < d.points.length; i++) {
      ctx.lineTo(d.points[i].x, d.points[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = rgba(200, 230, 255, alpha * 0.6);
    ctx.lineWidth = DISTURBANCE_WIDTH * 0.5;
    ctx.stroke();
  }

  private drawBottomPanel(): void {
    const ctx = this.ctx;
    const panel = this.getBottomPanelBounds();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 15);
    ctx.fill();

    for (let i = 0; i < NUTRIENT_COLOR_KEYS.length; i++) {
      const color = NUTRIENT_COLOR_KEYS[i];
      const ball = this.getColorBallBounds(i);
      const isSelected = this.selectedColor === color;

      if (isSelected) {
        ctx.fillStyle = rgbToString(NUTRIENT_COLORS[color], 0.3);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r + 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = rgbToString(NUTRIENT_COLORS[color], 0.95);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
    }
  }

  private drawRipples(): void {
    const ctx = this.ctx;
    const now = performance.now();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      const elapsed = (now - r.startTime) / 1000;
      const t = elapsed / r.duration;
      if (t >= 1) {
        this.ripples.splice(i, 1);
        continue;
      }
      const radius = lerp(10, 60, t);
      const alpha = (1 - t) * 0.6;
      ctx.strokeStyle = rgbToString(r.color, alpha);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawStatsPanel(manager: JellyfishManager): void {
    const ctx = this.ctx;
    const rawStats = manager.getStats();
    const values = [rawStats.total, rawStats.avgRadius, rawStats.maxFreq, rawStats.deadCount];
    const formatFns = [(v: number) => v.toFixed(0), (v: number) => v.toFixed(1), (v: number) => v.toFixed(2) + 'Hz', (v: number) => v.toFixed(0)];

    for (let i = 0; i < this.stats.length; i++) {
      if (Math.abs(this.stats[i].value - values[i]) > 0.01) {
        this.stats[i].prevValue = this.stats[i].value;
        this.stats[i].value = values[i];
        this.stats[i].lastAnimated = performance.now();
        this.stats[i].bounceProgress = 0;
      }
      this.stats[i].bounceProgress = Math.min(1, this.stats[i].bounceProgress + 1 / 12);
    }

    if (this.panelCollapsed && this.smallScreen) {
      const b = this.getStatsPanelBounds();
      ctx.fillStyle = 'rgba(10,10,30,0.8)';
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 1;
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4A90D9';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◀▶', b.x + b.w / 2, b.y + b.h / 2);
      return;
    }

    const panel = this.getStatsPanelBounds();
    const panelW = panel.w;
    const cardH = 65;
    const gap = 8;
    const topY = 20;

    ctx.fillStyle = 'rgba(10,10,30,0.6)';
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 1;
    const panelH = this.stats.length * (cardH + gap) + 20;
    roundRect(ctx, panel.x, topY - 10, panelW, panelH, 10);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < this.stats.length; i++) {
      const card = this.stats[i];
      const bounceT = Math.min(1, (performance.now() - card.lastAnimated) / 200);
      const bounceY = bounceT < 1 ? Math.sin(bounceT * Math.PI) * -5 : 0;

      const cx = panel.x + 10;
      const cy = topY + i * (cardH + gap) + bounceY;

      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      roundRect(ctx, cx, cy, panelW - 20, cardH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(card.label, cx + 12, cy + 10);

      ctx.fillStyle = '#4A90D9';
      ctx.font = 'bold 20px sans-serif';
      const dispVal = lerp(card.prevValue, card.value, Math.min(1, card.bounceProgress));
      ctx.fillText(formatFns[i](dispVal), cx + 12, cy + 30);
    }
  }

  updateAnimations(dt: number): void {
    for (const [k, v] of this.colorPressAnimations) {
      if (v < 1) {
        this.colorPressAnimations.set(k, Math.min(1, v + dt));
      }
    }
  }

  render(manager: JellyfishManager): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();

    for (const d of manager.disturbances) {
      this.drawDisturbance(d);
    }

    const sorted = [...manager.jellyfish].sort((a, b) => a.pos.y - b.pos.y);

    for (const [, pair] of manager.matingPairs) {
      if (pair.lineActive) {
        const jf1 = sorted.find(j => j.id === pair.id1);
        const jf2 = sorted.find(j => j.id === pair.id2);
        if (jf1 && jf2) this.drawMatingLine(jf1, jf2);
      }
    }

    for (const ball of manager.nutrientBalls) {
      this.drawNutrientBall(ball);
    }

    for (const jf of sorted) {
      this.drawJellyfish(jf);
    }

    this.drawRipples();
    this.drawBottomPanel();
    this.drawStatsPanel(manager);
  }
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
