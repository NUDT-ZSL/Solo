export interface UIState {
  timeLeft: number;
  totalTime: number;
  progress: number;
  gameState: 'playing' | 'won' | 'lost';
  victoryTime: number | null;
  bestTime: number | null;
  hintText: string;
  mouseDown: boolean;
}

export const UI_CONFIG = {
  RING_DIAMETER: 80,
  RING_PADDING: 25,
  RING_LINE_WIDTH: 6,
  PULSE_INTERVAL: 0.3,
  PULSE_MIN_ALPHA: 0.5,
  PULSE_MAX_ALPHA: 1.0,
  PROGRESS_BAR_WIDTH: 200,
  PROGRESS_BAR_HEIGHT: 6,
  HOURGLASS_SIDE: 120,
  HOURGLASS_GAP: 40,
  HOURLASS_LINE_WIDTH: 1.5,
  HOURLASS_DASH: [6, 6] as [number, number],
  MAGNETIC_RADIUS: 50,
  MAGNETIC_ARC_COUNT: 5,
  RESTART_BUTTON_WIDTH: 140,
  RESTART_BUTTON_HEIGHT: 44,
  RESTART_BUTTON_OFFSET_Y: 60,
} as const;

export class UIManager {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;
  private pulseTimer: number;
  private pulseInterval: number;

  constructor(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.ctx = ctx;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.pulseTimer = 0;
    this.pulseInterval = UI_CONFIG.PULSE_INTERVAL;
  }

  resize(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(deltaTime: number, state: UIState) {
    if (state.gameState === 'playing' && state.timeLeft <= 10) {
      this.pulseTimer += deltaTime;
      if (this.pulseTimer >= this.pulseInterval * 2) {
        this.pulseTimer = 0;
      }
    } else {
      this.pulseTimer = 0;
    }
  }

  private getPulseAlpha(state: UIState): number {
    if (state.gameState !== 'playing' || state.timeLeft > 10) {
      return 1;
    }

    const t = this.pulseTimer / this.pulseInterval;
    const alpha = UI_CONFIG.PULSE_MIN_ALPHA +
      (UI_CONFIG.PULSE_MAX_ALPHA - UI_CONFIG.PULSE_MIN_ALPHA) *
      (0.5 + 0.5 * Math.sin(t * Math.PI));
    return alpha;
  }

  render(state: UIState) {
    this.drawProgressRing(state);
    this.drawHint(state);
    this.drawProgressBar(state);
    this.drawVictoryInfo(state);
    this.drawBestTime(state);
  }

  private drawProgressRing(state: UIState) {
    const ringDiameter = UI_CONFIG.RING_DIAMETER;
    const radius = ringDiameter / 2;
    const padding = UI_CONFIG.RING_PADDING;
    const lineWidth = UI_CONFIG.RING_LINE_WIDTH;
    const cx = this.canvasWidth - radius - padding;
    const cy = radius + padding;

    this.ctx.save();

    const ratio = state.timeLeft / state.totalTime;
    const clampedRatio = Math.max(0, Math.min(1, ratio));

    const green = { r: 0, g: 0xff, b: 0x88 };
    const red = { r: 0xff, g: 0x33, b: 0x66 };
    const t = 1 - clampedRatio;
    const colorR = Math.floor(green.r + (red.r - green.r) * t);
    const colorG = Math.floor(green.g + (red.g - green.g) * t);
    const colorB = Math.floor(green.b + (red.b - green.b) * t);
    const ringColor = `rgb(${colorR},${colorG},${colorB})`;

    const alpha = this.getPulseAlpha(state);

    this.ctx.globalAlpha = alpha;

    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = ringColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + clampedRatio * Math.PI * 2;
    this.ctx.arc(cx, cy, radius, startAngle, endAngle);
    this.ctx.stroke();

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = ringColor;
    this.ctx.font = `bold ${Math.floor(radius * 0.7)}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const seconds = Math.max(0, Math.ceil(state.timeLeft));
    this.ctx.fillText(`${seconds}`, cx, cy);

    this.ctx.restore();
  }

  private drawHint(state: UIState) {
    this.ctx.save();
    this.ctx.fillStyle = '#AAAAAA';
    this.ctx.font = `1rem 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(state.hintText, 25, 25);

    if (state.mouseDown) {
      this.ctx.fillStyle = '#00E5FF';
      this.ctx.font = `0.85rem 'Segoe UI', sans-serif`;
      this.ctx.fillText('磁场激活中', 25, 52);
    }

    this.ctx.restore();
  }

  private drawProgressBar(state: UIState) {
    const barWidth = UI_CONFIG.PROGRESS_BAR_WIDTH;
    const barHeight = UI_CONFIG.PROGRESS_BAR_HEIGHT;
    const padding = UI_CONFIG.RING_PADDING;
    const x = padding;
    const y = this.canvasHeight - padding - barHeight - 30;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.ctx.beginPath();
    this.roundRect(this.ctx, x, y, barWidth, barHeight, 3);
    this.ctx.fill();

    const fillWidth = barWidth * Math.max(0, Math.min(1, state.progress));
    const gradient = this.ctx.createLinearGradient(x, y, x + barWidth, y);
    gradient.addColorStop(0, '#00E5FF');
    gradient.addColorStop(1, '#00FF88');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.roundRect(this.ctx, x, y, fillWidth, barHeight, 3);
    this.ctx.fill();

    const percent = Math.floor(state.progress * 100);
    this.ctx.fillStyle = 'rgba(200,200,200,0.9)';
    this.ctx.font = `0.8rem 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`沙漏成形：${percent}%`, x, y - 8);

    this.ctx.restore();
  }

  private drawVictoryInfo(state: UIState) {
    if (state.victoryTime !== null && state.gameState !== 'playing') {
      this.ctx.save();
      const infoY = 25;
      const info = `本次用时：${state.victoryTime.toFixed(1)}秒`;
      this.ctx.font = `1rem 'Segoe UI', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      const metrics = this.ctx.measureText(info);
      const textX = this.canvasWidth / 2;
      const bgX = textX - metrics.width / 2 - 16;
      const bgY = infoY - 6;
      const bgW = metrics.width + 32;
      const bgH = 32;

      this.ctx.fillStyle = 'rgba(0,229,255,0.1)';
      this.ctx.beginPath();
      this.roundRect(this.ctx, bgX, bgY, bgW, bgH, 6);
      this.ctx.fill();

      this.ctx.fillStyle = '#00E5FF';
      this.ctx.fillText(info, textX, infoY);

      this.ctx.restore();
    }
  }

  private drawBestTime(state: UIState) {
    if (state.bestTime !== null) {
      this.ctx.save();
      const barWidth = UI_CONFIG.PROGRESS_BAR_WIDTH;
      const padding = UI_CONFIG.RING_PADDING;
      const y = this.canvasHeight - padding;
      this.ctx.fillStyle = '#AAAAAA';
      this.ctx.font = `0.85rem 'Segoe UI', sans-serif`;
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(`最快记录：${state.bestTime.toFixed(1)}秒`, this.canvasWidth - padding, y);
      this.ctx.restore();
    }
  }

  drawHourglassOutline() {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    const side = UI_CONFIG.HOURGLASS_SIDE;
    const gap = UI_CONFIG.HOURGLASS_GAP;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    this.ctx.lineWidth = UI_CONFIG.HOURLASS_LINE_WIDTH;
    this.ctx.setLineDash(UI_CONFIG.HOURLASS_DASH);

    this.drawTriangle(cx, cy - gap / 2 - side / 2, side, 'down');
    this.drawTriangle(cx, cy + gap / 2 + side / 2, side, 'up');

    this.ctx.restore();
  }

  private drawTriangle(cx: number, cy: number, side: number, direction: 'up' | 'down') {
    const h = side * Math.sqrt(3) / 2;
    const halfSide = side / 2;

    this.ctx.beginPath();
    if (direction === 'down') {
      this.ctx.moveTo(cx - halfSide, cy - h / 2);
      this.ctx.lineTo(cx + halfSide, cy - h / 2);
      this.ctx.lineTo(cx, cy + h / 2);
    } else {
      this.ctx.moveTo(cx - halfSide, cy + h / 2);
      this.ctx.lineTo(cx + halfSide, cy + h / 2);
      this.ctx.lineTo(cx, cy - h / 2);
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  drawTimeUpText(alpha: number) {
    if (alpha <= 0) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#FF6B6B';
    this.ctx.font = `bold 2rem 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('时间耗尽', this.canvasWidth / 2, this.canvasHeight / 2);
    this.ctx.restore();
  }

  getRestartButtonBounds() {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2 + UI_CONFIG.RESTART_BUTTON_OFFSET_Y;
    const width = UI_CONFIG.RESTART_BUTTON_WIDTH;
    const height = UI_CONFIG.RESTART_BUTTON_HEIGHT;
    return {
      x: cx - width / 2,
      y: cy - height / 2,
      width,
      height,
      centerX: cx,
      centerY: cy
    };
  }

  drawRestartButton(hover: boolean, gameState: 'won' | 'lost') {
    const bounds = this.getRestartButtonBounds();
    this.ctx.save();

    this.ctx.fillStyle = hover ? '#444444' : '#2D2D2D';
    this.ctx.beginPath();
    this.roundRect(this.ctx, bounds.x, bounds.y, bounds.width, bounds.height, 8);
    this.ctx.fill();

    this.ctx.strokeStyle = gameState === 'won' ? '#00E5FF' : 'rgba(255,107,107,0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.roundRect(this.ctx, bounds.x, bounds.y, bounds.width, bounds.height, 8);
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `1rem 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('再来一次', bounds.centerX, bounds.centerY);

    this.ctx.restore();
  }

  drawMagneticField(mouseX: number, mouseY: number, strength: number) {
    if (strength <= 0) return;
    this.ctx.save();
    const radius = UI_CONFIG.MAGNETIC_RADIUS;
    const innerColor = `rgba(0,229,255,${0.15 * strength})`;
    const outerColor = `rgba(0,229,255,0)`;

    const gradient = this.ctx.createRadialGradient(
      mouseX, mouseY, 0,
      mouseX, mouseY, radius
    );
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(mouseX, mouseY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = `rgba(0,229,255,${0.6 * strength})`;
    this.ctx.lineWidth = 1.5;
    for (let i = 0; i < UI_CONFIG.MAGNETIC_ARC_COUNT; i++) {
      const angle = (i / UI_CONFIG.MAGNETIC_ARC_COUNT) * Math.PI * 2 + (performance.now() / 1000) * 2;
      const r = radius * 0.6;
      this.ctx.beginPath();
      this.ctx.arc(
        mouseX + Math.cos(angle) * r * 0.3,
        mouseY + Math.sin(angle) * r * 0.3,
        r * 0.8,
        angle + Math.PI * 0.3,
        angle + Math.PI * 0.9
      );
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawPerformanceMonitor(fps: number, particleCount: number) {
    this.ctx.save();

    const padding = 25;
    const barHeight = UI_CONFIG.PROGRESS_BAR_HEIGHT;
    const y = this.canvasHeight - padding - barHeight - 30;

    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.font = `0.75rem 'Segoe UI', monospace`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';

    const fpsText = `FPS: ${fps.toFixed(0)}`;
    const particlesText = `粒子: ${particleCount}`;

    const fpsMetrics = this.ctx.measureText(fpsText);
    const particlesMetrics = this.ctx.measureText(particlesText);
    const maxWidth = Math.max(fpsMetrics.width, particlesMetrics.width);
    const bgX = this.canvasWidth - padding - maxWidth - 12;
    const bgY = y - 12 - 32;
    const bgW = maxWidth + 24;
    const bgH = 44;

    this.ctx.fillStyle = 'rgba(10,10,15,0.8)';
    this.ctx.beginPath();
    this.roundRect(this.ctx, bgX, bgY, bgW, bgH, 6);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.roundRect(this.ctx, bgX, bgY, bgW, bgH, 6);
    this.ctx.stroke();

    const fpsColor = fps >= 55 ? '#00FF88' : fps >= 30 ? '#FFD700' : '#FF3366';
    this.ctx.fillStyle = fpsColor;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(fpsText, bgX + bgW - 12, bgY + 8);

    this.ctx.fillStyle = '#AAAAAA';
    this.ctx.fillText(particlesText, bgX + bgW - 12, bgY + 24);

    this.ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    const radius = Math.min(r, w / 2, h / 2);
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
}
