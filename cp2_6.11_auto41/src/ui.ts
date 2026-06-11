export type GameState = 'menu' | 'countdown' | 'playing' | 'victory';

export interface GameStats {
  collected: number;
  total: number;
  time: number;
  speedMultiplier: number;
}

export class UIManager {
  gameState: GameState = 'menu';
  countdown = 3;
  countdownTimer = 0;
  stats: GameStats = { collected: 0, total: 0, time: 0, speedMultiplier: 1.0 };
  victoryTimer = 0;
  victoryDuration = 4.0;
  showVictoryPanel = false;
  hoverRestart = false;
  hoverStart = false;

  startCountdown(): void {
    this.gameState = 'countdown';
    this.countdown = 3;
    this.countdownTimer = 0;
  }

  updateStats(stats: GameStats): void {
    this.stats = stats;
  }

  startVictory(): void {
    this.gameState = 'victory';
    this.victoryTimer = 0;
    this.showVictoryPanel = false;
  }

  update(deltaTime: number): void {
    if (this.gameState === 'countdown') {
      this.countdownTimer += deltaTime;
      if (this.countdownTimer >= 1.0) {
        this.countdownTimer -= 1.0;
        this.countdown--;
        if (this.countdown <= 0) {
          this.gameState = 'playing';
        }
      }
    }

    if (this.gameState === 'victory') {
      this.victoryTimer += deltaTime;
      if (this.victoryTimer >= this.victoryDuration) {
        this.showVictoryPanel = true;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    if (this.gameState === 'menu') {
      this.renderMenu(ctx, width, height);
    } else if (this.gameState === 'countdown') {
      this.renderCountdown(ctx, width, height);
    } else if (this.gameState === 'playing') {
      this.renderHUD(ctx, width, height);
    } else if (this.gameState === 'victory') {
      this.renderHUD(ctx, width, height);
      if (this.showVictoryPanel) {
        this.renderVictoryPanel(ctx, width, height);
      }
    }
  }

  private renderMenu(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    ctx.fillStyle = 'rgba(10, 10, 30, 0.6)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '600 56px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText('星轨舞者', width / 2, height / 2 - 60);

    ctx.font = '300 18px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
    ctx.fillText('在星轨网络中穿梭 · 收集能量星球 · 绘制你的星轨画', width / 2, height / 2);

    const btnX = width / 2 - 80;
    const btnY = height / 2 + 50;
    const btnW = 160;
    const btnH = 48;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.strokeStyle = 'rgba(135, 206, 235, 0.5)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '400 18px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText('开始游戏', width / 2, btnY + btnH / 2);

    ctx.font = '300 13px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(224, 224, 224, 0.4)';
    ctx.fillText('鼠标点击邻居节点飞行 · 收集所有能量星球获胜', width / 2, height / 2 + 130);

    ctx.restore();

    this._menuBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private _menuBtn: { x: number; y: number; w: number; h: number } | null = null;
  private _restartBtn: { x: number; y: number; w: number; h: number } | null = null;

  getMenuBtn(): { x: number; y: number; w: number; h: number } | null {
    return this._menuBtn;
  }

  getRestartBtn(): { x: number; y: number; w: number; h: number } | null {
    return this._restartBtn;
  }

  private renderCountdown(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    ctx.fillStyle = 'rgba(10, 10, 30, 0.4)';
    ctx.fillRect(0, 0, width, height);

    const num = this.countdown;
    const progress = this.countdownTimer;
    const scale = 1.0 + (1.0 - progress) * 0.3;
    const alpha = 1.0 - progress * 0.3;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${Math.floor(120 * scale)}px "Segoe UI", "PingFang SC", sans-serif`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(String(num), width / 2, height / 2);

    ctx.restore();
  }

  private renderHUD(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    const progressRatio = this.stats.total > 0 ? this.stats.collected / this.stats.total : 0;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.fillRect(0, 0, width, 4);

    const grad = ctx.createLinearGradient(0, 0, width * progressRatio, 0);
    grad.addColorStop(0, '#FF8C00');
    grad.addColorStop(1, '#8A2BE2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width * progressRatio, 4);

    const panelW = 200;
    const panelH = 90;
    const panelX = 16;
    const panelY = 16;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.strokeStyle = 'rgba(135, 206, 235, 0.15)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '400 14px "Segoe UI", "PingFang SC", sans-serif';

    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(`能量: ${this.stats.collected} / ${this.stats.total}`, panelX + 14, panelY + 12);

    ctx.fillStyle = '#87CEEB';
    ctx.fillText(`用时: ${this.stats.time.toFixed(1)}s`, panelX + 14, panelY + 36);

    const speedColor = this.stats.speedMultiplier > 1.0 ? '#FFD700' : '#E0E0E0';
    ctx.fillStyle = speedColor;
    ctx.fillText(`速度: x${this.stats.speedMultiplier.toFixed(1)}`, panelX + 14, panelY + 60);

    ctx.restore();
  }

  private renderVictoryPanel(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    ctx.fillStyle = 'rgba(10, 10, 30, 0.5)';
    ctx.fillRect(0, 0, width, height);

    const panelW = 320;
    const panelH = 240;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '600 32px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('星轨舞者', width / 2, panelY + 44);

    ctx.font = '300 16px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(`收集: ${this.stats.collected}/${this.stats.total}`, width / 2, panelY + 90);
    ctx.fillText(`用时: ${this.stats.time.toFixed(1)}秒`, width / 2, panelY + 118);
    ctx.fillText(`完成率: 100%`, width / 2, panelY + 146);

    const btnW = 140;
    const btnH = 40;
    const btnX = (width - btnW) / 2;
    const btnY = panelY + panelH - 58;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '400 15px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText('再来一局', width / 2, btnY + btnH / 2);

    this._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
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
}
