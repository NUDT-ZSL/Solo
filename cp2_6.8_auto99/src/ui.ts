import { Player, MAX_HEALTH } from './player';

export const HEART_COLOR = '#E53E3E';
export const HEART_SIZE = 12;
export const HEART_SPACING = 4;

export class UI {
  private trapMessageTime: number = 0;
  private trapMessageDuration: number = 1;
  private screenShakeTime: number = 0;
  private screenShakeDuration: number = 0.3;
  private screenShakeIntensity: number = 3;
  private screenShakeFreq: number = 10;
  private gameOver: boolean = false;
  private winState: boolean = false;
  private winTime: number = 0;
  private winAnimationTime: number = 0;
  private winAnimationDuration: number = 2;
  private winElapsedTime: number = 0;
  private minimapHoverScale: number = 1;
  private minimapHoverTarget: number = 1;

  public getScreenShake(): { x: number; y: number } {
    if (this.screenShakeTime <= 0) return { x: 0, y: 0 };
    const t = this.screenShakeTime;
    const offset = Math.sin(t * Math.PI * 2 * this.screenShakeFreq) * this.screenShakeIntensity;
    return { x: offset, y: 0 };
  }

  public triggerTrap(): void {
    this.trapMessageTime = this.trapMessageDuration;
    this.screenShakeTime = this.screenShakeDuration;
  }

  public triggerDeath(): void {
    this.gameOver = true;
  }

  public triggerWin(elapsedTime: number): void {
    this.winState = true;
    this.winTime = 0;
    this.winAnimationTime = 0;
    this.winElapsedTime = elapsedTime;
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  public isWin(): boolean {
    return this.winState;
  }

  public getWinProgress(): number {
    return Math.min(1, this.winAnimationTime / this.winAnimationDuration);
  }

  public reset(): void {
    this.trapMessageTime = 0;
    this.screenShakeTime = 0;
    this.gameOver = false;
    this.winState = false;
    this.winTime = 0;
    this.winAnimationTime = 0;
    this.minimapHoverScale = 1;
  }

  public setMinimapHover(hover: boolean): void {
    this.minimapHoverTarget = hover ? 1.5 : 1;
  }

  public getMinimapScale(): number {
    return this.minimapHoverScale;
  }

  public update(deltaTime: number): void {
    if (this.trapMessageTime > 0) {
      this.trapMessageTime -= deltaTime;
    }
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= deltaTime;
    }
    if (this.winState) {
      this.winAnimationTime += deltaTime;
      this.winTime += deltaTime;
    }

    const scaleSpeed = 5;
    if (this.minimapHoverScale < this.minimapHoverTarget) {
      this.minimapHoverScale = Math.min(
        this.minimapHoverTarget,
        this.minimapHoverScale + scaleSpeed * deltaTime
      );
    } else if (this.minimapHoverScale > this.minimapHoverTarget) {
      this.minimapHoverScale = Math.max(
        this.minimapHoverTarget,
        this.minimapHoverScale - scaleSpeed * deltaTime
      );
    }
  }

  public renderHealth(ctx: CanvasRenderingContext2D, player: Player, x: number, y: number): void {
    for (let i = 0; i < MAX_HEALTH; i++) {
      const hx = x + i * (HEART_SIZE + HEART_SPACING);
      const filled = i < player.health;
      this.drawHeart(ctx, hx, y, HEART_SIZE, filled);
    }
  }

  private drawHeart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    ctx.save();

    if (filled) {
      ctx.fillStyle = HEART_COLOR;
      ctx.shadowColor = HEART_COLOR;
      ctx.shadowBlur = 4;
    } else {
      ctx.fillStyle = '#4a5568';
    }

    const s = size;
    const hs = s / 2;

    ctx.beginPath();
    ctx.moveTo(x + hs, y + s * 0.3);
    ctx.bezierCurveTo(x + hs, y, x, y, x, y + s * 0.3);
    ctx.bezierCurveTo(x, y + s * 0.6, x + hs, y + s * 0.8, x + hs, y + s);
    ctx.bezierCurveTo(x + hs, y + s * 0.8, x + s, y + s * 0.6, x + s, y + s * 0.3);
    ctx.bezierCurveTo(x + s, y, x + hs, y, x + hs, y + s * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  public renderTimer(ctx: CanvasRenderingContext2D, elapsedTime: number, x: number, y: number): void {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = Math.floor(elapsedTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    ctx.save();
    ctx.font = '16px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.fillText(timeStr, x, y);
    ctx.restore();
  }

  public renderTrapMessage(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (this.trapMessageTime <= 0) return;

    const alpha = Math.min(1, this.trapMessageTime / 0.3);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '24px monospace';
    ctx.fillStyle = '#E53E3E';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#E53E3E';
    ctx.shadowBlur = 10;
    ctx.fillText('你触发了陷阱！损失1点生命', canvasWidth / 2, canvasHeight / 2);
    ctx.restore();
  }

  public renderGameOver(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.gameOver) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.font = '48px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillText('Game Over', canvasWidth / 2, canvasHeight / 2 - 20);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#a0aec0';
    ctx.shadowBlur = 0;
    ctx.fillText('按空格键重新开始', canvasWidth / 2, canvasHeight / 2 + 30);

    ctx.restore();
  }

  public renderWinOverlay(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.winState) return;

    const progress = this.getWinProgress();

    if (progress < 1) {
      const r = Math.floor(26 * (1 - progress) + 236 * progress);
      const g = Math.floor(32 * (1 - progress) + 201 * progress);
      const b = Math.floor(44 * (1 - progress) + 75 * progress);
      ctx.save();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${progress * 0.3})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }

    if (progress >= 1) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const minutes = Math.floor(this.winElapsedTime / 60);
      const seconds = Math.floor(this.winElapsedTime % 60);
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      ctx.font = '36px monospace';
      ctx.fillStyle = '#48BB78';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#48BB78';
      ctx.shadowBlur = 15;
      ctx.fillText(`恭喜通关！耗时 ${timeStr}`, canvasWidth / 2, canvasHeight / 2 - 20);

      ctx.font = '20px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText('按 R 键重新开始', canvasWidth / 2, canvasHeight / 2 + 30);

      ctx.restore();
    }
  }
}
