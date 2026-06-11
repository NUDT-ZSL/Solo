import type { ParticleSystem } from './particles';

export type GameState = 'start' | 'countdown' | 'playing' | 'victory' | 'ended';

export class UIManager {
  state: GameState = 'start';
  countdownValue: number = 3;
  countdownTimer: number = 0;
  collected: number = 0;
  total: number = 0;
  elapsedTime: number = 0;
  speedMultiplier: number = 1;
  finalScore: number = 0;
  victoryTimer: number = 0;
  private readonly VICTORY_DURATION = 4000;
  private readonly COUNTDOWN_INTERVAL = 1000;

  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  startCountdown(): void {
    this.state = 'countdown';
    this.countdownValue = 3;
    this.countdownTimer = 0;
  }

  startGame(): void {
    this.state = 'playing';
    this.elapsedTime = 0;
    this.collected = 0;
  }

  triggerVictory(collected: number, elapsed: number): void {
    this.state = 'victory';
    this.victoryTimer = 0;
    this.finalScore = this.calculateScore(collected, elapsed);
  }

  endGame(): void {
    this.state = 'ended';
  }

  reset(): void {
    this.state = 'start';
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.elapsedTime = 0;
    this.collected = 0;
    this.victoryTimer = 0;
  }

  private calculateScore(collected: number, elapsedMs: number): number {
    const timeBonus = Math.max(0, 300 - Math.floor(elapsedMs / 1000)) * 10;
    return collected * 100 + timeBonus;
  }

  update(dt: number): void {
    if (this.state === 'countdown') {
      this.countdownTimer += dt;
      if (this.countdownTimer >= this.COUNTDOWN_INTERVAL) {
        this.countdownTimer -= this.COUNTDOWN_INTERVAL;
        this.countdownValue--;
        if (this.countdownValue <= 0) {
          this.startGame();
        }
      }
    } else if (this.state === 'playing') {
      this.elapsedTime += dt;
    } else if (this.state === 'victory') {
      this.victoryTimer += dt;
      if (this.victoryTimer >= this.VICTORY_DURATION) {
        this.endGame();
      }
    }
  }

  isVictoryAnimating(): boolean {
    return this.state === 'victory';
  }

  getVictoryProgress(): number {
    return Math.min(1, this.victoryTimer / this.VICTORY_DURATION);
  }

  render(ctx: CanvasRenderingContext2D, _particles: ParticleSystem): void {
    switch (this.state) {
      case 'start':
        this.renderStartScreen(ctx);
        break;
      case 'countdown':
        this.renderCountdown(ctx);
        break;
      case 'playing':
        this.renderHUD(ctx);
        break;
      case 'victory':
        this.renderHUD(ctx);
        break;
      case 'ended':
        this.renderVictoryScreen(ctx);
        break;
    }
  }

  private renderStartScreen(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = '#E0E0E0';
    ctx.font = '300 64px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#8A2BE2';
    ctx.fillText('星轨舞者', cx, cy - 80);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('STAR TRAIL DANCER', cx, cy - 40);

    ctx.fillStyle = 'rgba(224, 224, 224, 0.5)';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('鼠标点击相邻节点，驾驶飞船收集能量星球', cx, cy + 20);
    ctx.fillText('WASD / 方向键 亦可选择最近方向节点', cx, cy + 45);

    this.drawGlassButton(ctx, cx, cy + 100, '开 始 游 戏');
    ctx.restore();
  }

  private drawGlassButton(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
    const w = 200;
    const h = 50;
    const left = x - w / 2;
    const top = y - h / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(left, top, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E0E0E0';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  isStartButtonClicked(x: number, y: number): boolean {
    if (this.state !== 'start') return false;
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2 + 100;
    return x >= cx - 100 && x <= cx + 100 && y >= cy - 25 && y <= cy + 25;
  }

  private renderCountdown(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    const alpha = 1 - (this.countdownTimer / this.COUNTDOWN_INTERVAL) * 0.5;
    const scale = 1 + (this.countdownTimer / this.COUNTDOWN_INTERVAL) * 0.3;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#E0E0E0';
    ctx.font = `300 ${160 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.shadowBlur = 60;
    ctx.shadowColor = '#8A2BE2';
    ctx.fillText(this.countdownValue > 0 ? String(this.countdownValue) : 'GO!', cx, cy);
    ctx.restore();
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    this.renderProgressBar(ctx);
    this.renderStatsPanel(ctx);
  }

  private renderProgressBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.canvasWidth * 0.5;
    const barHeight = 6;
    const x = (this.canvasWidth - barWidth) / 2;
    const y = 24;
    const progress = this.total > 0 ? this.collected / this.total : 0;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 30, 0.5)';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 3);
    ctx.fill();

    const grad = ctx.createLinearGradient(x, y, x + barWidth * progress, y);
    grad.addColorStop(0, '#FF8C00');
    grad.addColorStop(1, '#8A2BE2');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth * progress, barHeight, 3);
    ctx.fill();
    ctx.restore();
  }

  private renderStatsPanel(ctx: CanvasRenderingContext2D): void {
    const panelX = 20;
    const panelY = 50;
    const panelW = 220;
    const panelH = 110;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E0E0E0';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';

    const padding = 18;
    let lineY = panelY + padding;

    ctx.fillStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.fillText('能量收集', panelX + padding, lineY);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${this.collected} / ${this.total}`, panelX + 120, lineY);
    lineY += 28;

    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.fillText('用时', panelX + padding, lineY);
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${(this.elapsedTime / 1000).toFixed(1)}s`, panelX + 120, lineY);
    lineY += 28;

    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.fillText('速度倍率', panelX + padding, lineY);
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    if (this.speedMultiplier > 1) {
      ctx.fillStyle = '#FF4500';
      ctx.fillText(`x${this.speedMultiplier.toFixed(1)} ⚡`, panelX + 120, lineY);
    } else {
      ctx.fillStyle = '#E0E0E0';
      ctx.fillText(`x${this.speedMultiplier.toFixed(1)}`, panelX + 120, lineY);
    }

    ctx.restore();
  }

  private renderVictoryScreen(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();

    const panelW = 360;
    const panelH = 320;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = '#FFD700';
    ctx.font = '300 42px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#FFD700';
    ctx.fillText('✦ 胜利 ✦', cx, py + 60);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('VICTORY', cx, py + 85);

    let lineY = py + 140;

    ctx.fillStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('收集能量', cx - 80, lineY);
    ctx.fillText('用时', cx, lineY);
    ctx.fillText('得分', cx + 80, lineY);

    lineY += 30;

    ctx.fillStyle = '#E0E0E0';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${this.collected}/${this.total}`, cx - 80, lineY);
    ctx.fillText(`${(this.elapsedTime / 1000).toFixed(1)}s`, cx, lineY);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`${this.finalScore}`, cx + 80, lineY);

    this.drawGlassButton(ctx, cx, py + panelH - 50, '再 来 一 局');
    ctx.restore();
  }

  isRestartButtonClicked(x: number, y: number): boolean {
    if (this.state !== 'ended') return false;
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2 + 110;
    return x >= cx - 100 && x <= cx + 100 && y >= cy - 25 && y <= cy + 25;
  }

  updateStats(collected: number, total: number, speedMul: number): void {
    this.collected = collected;
    this.total = total;
    this.speedMultiplier = speedMul;
  }

  getElapsedSeconds(): number {
    return this.elapsedTime / 1000;
  }
}
