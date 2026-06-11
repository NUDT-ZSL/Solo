export type GameState = 'playing' | 'victory' | 'timeout';

export interface UIState {
  timeLeft: number;
  totalTime: number;
  particlesInShape: number;
  totalParticles: number;
  completionPercentage: number;
  bestTime: number | null;
  currentTime: number;
  gameState: GameState;
  showRestartButton: boolean;
}

export class UIManager {
  private ctx: CanvasRenderingContext2D;
  private canvasSize: number;
  private pulseTimer: number = 0;
  private timeoutTextAlpha: number = 0;

  constructor(ctx: CanvasRenderingContext2D, canvasSize: number) {
    this.ctx = ctx;
    this.canvasSize = canvasSize;
  }

  public resize(canvasSize: number): void {
    this.canvasSize = canvasSize;
  }

  public update(dt: number, state: UIState): void {
    if (state.timeLeft < 10) {
      this.pulseTimer += dt;
    } else {
      this.pulseTimer = 0;
    }

    if (state.gameState === 'timeout') {
      this.timeoutTextAlpha = Math.min(1, this.timeoutTextAlpha + dt * 0.001);
    } else {
      this.timeoutTextAlpha = 0;
    }
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
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private drawCountdown(state: UIState): void {
    const ctx = this.ctx;
    const size = this.canvasSize;
    const diameter = 80;
    const cx = size - diameter / 2 - 20;
    const cy = diameter / 2 + 20;
    const radius = diameter / 2;
    const lineWidth = 5;

    const progress = state.timeLeft / state.totalTime;
    const color = this.lerpColor('#FF3366', '#00FF88', progress);

    let alpha = 1;
    if (state.timeLeft < 10) {
      const pulsePhase = Math.floor(this.pulseTimer / 300) % 2;
      alpha = pulsePhase === 0 ? 1 : 0.5;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = "600 18px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(state.timeLeft).toString(), cx, cy);

    ctx.restore();
  }

  private drawProgressBar(state: UIState): void {
    const ctx = this.ctx;
    const size = this.canvasSize;
    const barWidth = 200;
    const barHeight = 8;
    const x = size - barWidth - 20;
    const y = 120;

    ctx.save();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 4);
    ctx.fill();

    const progress = state.completionPercentage / 100;
    const color = this.lerpColor('#00E5FF', '#00FF88', progress);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth * progress, barHeight, 4);
    ctx.fill();

    ctx.fillStyle = '#AAAAAA';
    ctx.font = "400 12px 'Segoe UI', sans-serif";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`成形进度: ${state.completionPercentage.toFixed(1)}%`, x + barWidth, y - 5);

    ctx.restore();
  }

  private drawInstructions(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#AAAAAA';
    ctx.font = "400 16px 'Segoe UI', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('拖拽鼠标引导粒子', 20, 20);
    ctx.fillText('让 85% 粒子进入沙漏区域', 20, 44);
    ctx.restore();
  }

  private drawBestTime(state: UIState): void {
    if (state.bestTime === null) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = "400 14px 'Segoe UI', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`最快用时: ${state.bestTime.toFixed(1)}s`, 20, 76);
    ctx.restore();
  }

  private drawVictoryStats(state: UIState): void {
    if (state.gameState !== 'victory') return;
    const ctx = this.ctx;
    const size = this.canvasSize;
    ctx.save();

    ctx.fillStyle = '#FFD700';
    ctx.font = "700 36px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('沙漏成形！', size / 2, size / 2 - 60);

    ctx.fillStyle = '#AAAAAA';
    ctx.font = "400 20px 'Segoe UI', sans-serif";
    ctx.fillText(`本次用时: ${state.currentTime.toFixed(1)}s`, size / 2, size / 2 - 10);

    if (state.bestTime !== null) {
      ctx.fillStyle = '#00E5FF';
      ctx.font = "500 16px 'Segoe UI', sans-serif";
      ctx.fillText(`历史最快: ${state.bestTime.toFixed(1)}s`, size / 2, size / 2 + 25);
    }

    ctx.restore();
  }

  private drawTimeoutText(): void {
    if (this.timeoutTextAlpha <= 0) return;
    const ctx = this.ctx;
    const size = this.canvasSize;
    ctx.save();
    ctx.globalAlpha = this.timeoutTextAlpha;
    ctx.fillStyle = '#FF6B6B';
    ctx.font = "700 32px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('时间耗尽', size / 2, size / 2 - 40);
    ctx.restore();
  }

  public drawRestartButton(state: UIState, mouseX: number, mouseY: number): { x: number; y: number; width: number; height: number } | null {
    if (!state.showRestartButton) return null;
    const ctx = this.ctx;
    const size = this.canvasSize;

    const buttonWidth = 160;
    const buttonHeight = 50;
    const x = size / 2 - buttonWidth / 2;
    const y = size / 2 + 60;

    const isHovered =
      mouseX >= x &&
      mouseX <= x + buttonWidth &&
      mouseY >= y &&
      mouseY <= y + buttonHeight;

    ctx.save();
    ctx.fillStyle = isHovered ? '#444444' : '#2D2D2D';
    ctx.strokeStyle = isHovered ? '#00E5FF' : 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, buttonWidth, buttonHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = "500 18px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('再来一次', size / 2, y + buttonHeight / 2);

    ctx.restore();

    return { x, y, width: buttonWidth, height: buttonHeight };
  }

  public drawHourglassOutline(): void {
    const ctx = this.ctx;
    const size = this.canvasSize;
    const cx = size / 2;
    const cy = size / 2;
    const triangleSide = 120;
    const triangleHeight = (Math.sqrt(3) / 2) * triangleSide;
    const gap = 40;

    const topBaseY = cy - gap / 2 - triangleHeight;
    const topApexY = cy - gap / 2;
    const bottomApexY = cy + gap / 2;
    const bottomBaseY = cy + gap / 2 + triangleHeight;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(cx - triangleSide / 2, topBaseY);
    ctx.lineTo(cx + triangleSide / 2, topBaseY);
    ctx.lineTo(cx, topApexY);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, bottomApexY);
    ctx.lineTo(cx - triangleSide / 2, bottomBaseY);
    ctx.lineTo(cx + triangleSide / 2, bottomBaseY);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  public render(state: UIState, mouseX: number, mouseY: number): { x: number; y: number; width: number; height: number } | null {
    this.drawInstructions();
    this.drawBestTime(state);
    this.drawCountdown(state);
    this.drawProgressBar(state);
    this.drawHourglassOutline();
    this.drawVictoryStats(state);
    this.drawTimeoutText();
    return this.drawRestartButton(state, mouseX, mouseY);
  }
}
