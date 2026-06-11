export interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  width: number;
  height: number;
}

export class Player {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  isJumping: boolean;
  jumpCount: number;
  maxJumps: number;
  gravity: number;
  jumpPower: number;
  groundY: number;
  trail: TrailParticle[];
  runFrame: number;
  runFrameTimer: number;

  constructor(startX: number, groundY: number) {
    this.width = 32;
    this.height = 48;
    this.x = startX;
    this.groundY = groundY;
    this.y = groundY - this.height;
    this.vy = 0;
    this.isJumping = false;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.gravity = 0.9;
    this.jumpPower = -16;
    this.trail = [];
    this.runFrame = 0;
    this.runFrameTimer = 0;
  }

  jump(): boolean {
    if (this.jumpCount < this.maxJumps) {
      this.vy = this.jumpPower;
      this.isJumping = true;
      this.jumpCount++;
      return true;
    }
    return false;
  }

  update(scrollSpeed: number, deltaTime: number, groundY: number): void {
    this.groundY = groundY;
    this.vy += this.gravity;
    this.y += this.vy;

    if (this.y + this.height >= this.groundY) {
      this.y = this.groundY - this.height;
      this.vy = 0;
      this.isJumping = false;
      this.jumpCount = 0;
    }

    this.runFrameTimer += deltaTime;
    if (this.runFrameTimer > 80) {
      this.runFrame = (this.runFrame + 1) % 4;
      this.runFrameTimer = 0;
    }

    this.trail.unshift({
      x: this.x,
      y: this.y,
      alpha: 0.8,
      width: this.width,
      height: this.height,
    });

    if (this.trail.length > 8) {
      this.trail.pop();
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 0.8 - i * 0.1;
      this.trail[i].x -= scrollSpeed * deltaTime * 0.001;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.fillStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 15;
      this.drawPixelBody(ctx, t.x, t.y, t.width, t.height, this.runFrame);
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 20;
    this.drawPixelBody(ctx, this.x, this.y, this.width, this.height, this.runFrame);
    ctx.restore();
  }

  private drawPixelBody(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    _h: number,
    frame: number
  ): void {
    const pixel = 4;

    ctx.fillStyle = '#00fff7';
    ctx.fillRect(x + 4, y, w - 8, pixel);
    ctx.fillRect(x, y + pixel, w, pixel);
    ctx.fillRect(x, y + pixel * 2, w, pixel * 2);

    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(x + 6, y + pixel * 2, pixel, pixel);
    ctx.fillRect(x + w - 10, y + pixel * 2, pixel, pixel);

    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(x + 4, y + pixel * 4, w - 8, pixel);

    ctx.fillStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 15;
    ctx.fillRect(x + 2, y + pixel * 5, w - 4, pixel * 3);

    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(x, y + pixel * 5, pixel, pixel * 3);
    ctx.fillRect(x + w - pixel, y + pixel * 5, pixel, pixel * 3);

    const legOffset = this.isJumping ? 0 : (frame % 2 === 0 ? pixel : -pixel);

    ctx.fillStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 15;
    ctx.fillRect(x + 4, y + pixel * 8, pixel * 2, pixel * 3 + legOffset);
    ctx.fillRect(x + w - 12, y + pixel * 8, pixel * 2, pixel * 3 - legOffset);

    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(x + 2, y + pixel * 11 + legOffset, pixel * 4, pixel);
    ctx.fillRect(x + w - 14, y + pixel * 11 - legOffset, pixel * 4, pixel);
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x + 4,
      y: this.y + 4,
      width: this.width - 8,
      height: this.height - 8,
    };
  }

  reset(startX: number, groundY: number): void {
    this.x = startX;
    this.groundY = groundY;
    this.y = groundY - this.height;
    this.vy = 0;
    this.isJumping = false;
    this.jumpCount = 0;
    this.trail = [];
    this.runFrame = 0;
    this.runFrameTimer = 0;
  }
}
