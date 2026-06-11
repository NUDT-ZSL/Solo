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

export class UIManager {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;
  private pulseTimer: number;
  private pulseVisible: boolean;
  private pulseInterval: number;

  constructor(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.ctx = ctx;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.pulseTimer = 0;
    this.pulseVisible = true;
    this.pulseInterval = 0.3;
  }

  resize(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(deltaTime: number, state: UIState) {
    if (state.gameState === 'playing' && state.timeLeft <= 10) {
      this.pulseTimer += deltaTime;
      if (this.pulseTimer >= this.pulseInterval) {
        this.pulseTimer = 0;
        this.pulseVisible = !this.pulseVisible;
      }
    } else {
      this.pulseVisible = true;
    }
  }

  render(state: UIState) {
    this.drawProgressRing(state);
    this.drawHint(state);
    this.drawProgressBar(state);
    this.drawVictoryInfo(state);
    this.drawBestTime(state);
  }

  private drawProgressRing(state: UIState) {
    const ringDiameter = 80;
    const radius = ringDiameter / 2;
    const padding = 25;
    const cx = this.canvasWidth - radius - padding;
    const cy = radius + padding;
    const lineWidth = 6;

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

    const alpha = state.timeLeft <= 10 && state.gameState === 'playing'
      ? this.pulseVisible ? 1 : 0.5
      : 1;

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
    const barWidth = 200;
    const barHeight = 6;
    const padding = 25;
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
      const barWidth = 200;
      const padding = 25;
      const y = this.canvasHeight - padding;
      const x = this.canvasWidth - barWidth - padding;
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
    const side = 120;
    const gap = 40;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([6, 6]);

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
    const cy = this.canvasHeight / 2 + 60;
    const width = 140;
    const height = 44;
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
    const radius = 50;
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
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + (performance.now() / 1000) * 2;
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
