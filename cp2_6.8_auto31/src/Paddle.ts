export interface PaddleState {
  isWide: boolean;
  wideTimer: number;
}

export class Paddle {
  public x: number;
  public y: number;
  public width: number;
  public readonly height: number;
  public readonly baseWidth: number;
  public readonly wideWidth: number;
  public speed: number;
  public leftPressed: boolean = false;
  public rightPressed: boolean = false;

  private isWideActive: boolean = false;
  private wideEffectTimer: number = 0;
  private readonly canvasWidth: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.baseWidth = Math.max(80, canvasWidth * 0.18);
    this.wideWidth = this.baseWidth * 1.6;
    this.width = this.baseWidth;
    this.height = 14;
    this.x = (canvasWidth - this.width) / 2;
    this.y = canvasHeight - 40;
    this.speed = canvasWidth * 0.012;
  }

  public resize(canvasWidth: number, canvasHeight: number): void {
    const ratio = canvasWidth / this.canvasWidth;
    this.x = this.x * ratio;
    this.y = canvasHeight - 40;
    this.speed = canvasWidth * 0.012;
  }

  public update(deltaTime: number): void {
    if (this.leftPressed && this.x > 0) {
      this.x -= this.speed * deltaTime * 60;
    }
    if (this.rightPressed && this.x + this.width < this.canvasWidth) {
      this.x += this.speed * deltaTime * 60;
    }
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;

    if (this.isWideActive) {
      this.wideEffectTimer -= deltaTime;
      if (this.wideEffectTimer <= 0) {
        this.deactivateWide();
      }
    }
  }

  public activateWide(duration: number = 5): void {
    this.isWideActive = true;
    this.wideEffectTimer = duration;
    const centerX = this.x + this.width / 2;
    this.width = this.wideWidth;
    this.x = centerX - this.width / 2;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;
  }

  private deactivateWide(): void {
    this.isWideActive = false;
    const centerX = this.x + this.width / 2;
    this.width = this.baseWidth;
    this.x = centerX - this.width / 2;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.canvasWidth) this.x = this.canvasWidth - this.width;
  }

  public getState(): PaddleState {
    return {
      isWide: this.isWideActive,
      wideTimer: this.wideEffectTimer
    };
  }

  public reset(canvasWidth: number): void {
    this.width = this.baseWidth;
    this.x = (canvasWidth - this.width) / 2;
    this.isWideActive = false;
    this.wideEffectTimer = 0;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, 'rgba(220, 220, 235, 0.9)');
    gradient.addColorStop(0.5, 'rgba(180, 180, 200, 0.7)');
    gradient.addColorStop(1, 'rgba(150, 150, 170, 0.5)');

    ctx.shadowColor = this.isWideActive ? '#3399ff' : '#00ffcc';
    ctx.shadowBlur = 20;

    const radius = 7;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = this.isWideActive ? 'rgba(51, 153, 255, 0.9)' : 'rgba(0, 255, 204, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.isWideActive && this.wideEffectTimer > 0) {
      const barWidth = (this.width * this.wideEffectTimer) / 5;
      ctx.fillStyle = 'rgba(51, 153, 255, 0.6)';
      ctx.fillRect(this.x, this.y + this.height + 2, barWidth, 3);
    }

    ctx.shadowBlur = 0;
  }
}
