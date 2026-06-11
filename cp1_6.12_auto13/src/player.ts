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
  jumpCount: number;
  maxJumps: number;
  gravity: number;
  jumpHeight: number;
  jumpDuration: number;
  groundY: number;
  trail: TrailParticle[];
  runFrame: number;
  runFrameTimer: number;
  isFallingIntoPit: boolean;
  pitFallSpeed: number;

  constructor(startX: number, groundY: number) {
    this.width = 32;
    this.height = 48;
    this.x = startX;
    this.groundY = groundY;
    this.y = groundY - this.height;
    this.vy = 0;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.jumpHeight = 120;
    this.jumpDuration = 0.4;
    this.gravity = (2 * this.jumpHeight) / (this.jumpDuration * this.jumpDuration);
    this.trail = [];
    this.runFrame = 0;
    this.runFrameTimer = 0;
    this.isFallingIntoPit = false;
    this.pitFallSpeed = 0;
  }

  jump(): boolean {
    if (this.isFallingIntoPit) return false;
    if (this.jumpCount < this.maxJumps) {
      const initialVelocity = -Math.sqrt(2 * this.gravity * this.jumpHeight);
      if (this.jumpCount === 1) {
        this.vy = initialVelocity * 0.85;
      } else {
        this.vy = initialVelocity;
      }
      this.jumpCount++;
      return true;
    }
    return false;
  }

  startFallingIntoPit(): void {
    this.isFallingIntoPit = true;
    this.vy = 0;
    this.pitFallSpeed = 0;
  }

  update(
    scrollSpeed: number,
    deltaTime: number,
    groundY: number,
    overPit: boolean
  ): { fellOffScreen: boolean } {
    const dt = deltaTime / 1000;
    this.groundY = groundY;

    if (this.isFallingIntoPit) {
      this.pitFallSpeed += this.gravity * dt;
      this.y += this.pitFallSpeed * dt * 60;
      this.vy = this.pitFallSpeed;

      const fellOffScreen = this.y > this.groundY + 200;
      return { fellOffScreen };
    }

    if (overPit && this.y + this.height >= this.groundY - 5 && this.vy >= 0) {
      this.startFallingIntoPit();
      return { fellOffScreen: false };
    }

    this.vy += this.gravity * dt;
    this.y += this.vy * dt * 60;

    if (this.y + this.height >= this.groundY && !overPit) {
      this.y = this.groundY - this.height;
      this.vy = 0;
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

    return { fellOffScreen: false };
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.fillStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 15;
      this.drawPixelBody(ctx, t.x, t.y, t.width, this.runFrame);
      ctx.restore();
    }

    ctx.save();
    if (this.isFallingIntoPit) {
      ctx.globalAlpha = Math.max(0, 1 - (this.y - this.groundY) / 200);
    }
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 20;
    this.drawPixelBody(ctx, this.x, this.y, this.width, this.runFrame);
    ctx.restore();
  }

  private drawPixelBody(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    frame: number
  ): void {
    const pixel = 4;
    const isJumping = this.jumpCount > 0 || this.vy < 0;

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

    const legOffset = isJumping ? 0 : (frame % 2 === 0 ? pixel : -pixel);

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

  isOnGround(): boolean {
    return this.jumpCount === 0 && this.y + this.height >= this.groundY - 1;
  }

  reset(startX: number, groundY: number): void {
    this.x = startX;
    this.groundY = groundY;
    this.y = groundY - this.height;
    this.vy = 0;
    this.jumpCount = 0;
    this.trail = [];
    this.runFrame = 0;
    this.runFrameTimer = 0;
    this.isFallingIntoPit = false;
    this.pitFallSpeed = 0;
  }
}
