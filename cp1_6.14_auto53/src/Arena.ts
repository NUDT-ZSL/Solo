export type ShrinkSpeed = 'slow' | 'medium' | 'fast';

const SHRINK_RATES: Record<ShrinkSpeed, number> = {
  slow: 10,
  medium: 20,
  fast: 35,
};

const SHRINK_INTERVAL = 10;

export class Arena {
  left: number = 0;
  top: number = 0;
  right: number = 800;
  bottom: number = 600;
  initialLeft: number = 0;
  initialTop: number = 0;
  initialRight: number = 800;
  initialBottom: number = 600;
  shrinkTimer: number = SHRINK_INTERVAL;
  shrinkSpeed: ShrinkSpeed = 'medium';
  isShrinking: boolean = false;
  shrinkFlashTimer: number = 0;
  outsideDamageRate: number = 15;
  totalElapsed: number = 0;

  constructor(shrinkSpeed: ShrinkSpeed = 'medium') {
    this.shrinkSpeed = shrinkSpeed;
    this.initialLeft = this.left;
    this.initialTop = this.top;
    this.initialRight = this.right;
    this.initialBottom = this.bottom;
  }

  update(dt: number): { isShrinking: boolean } {
    this.totalElapsed += dt;
    this.shrinkTimer -= dt;

    if (this.shrinkTimer <= 0) {
      const rate = SHRINK_RATES[this.shrinkSpeed];
      const centerX = (this.left + this.right) / 2;
      const centerY = (this.top + this.bottom) / 2;
      const halfW = (this.right - this.left) / 2;
      const halfH = (this.bottom - this.top) / 2;

      if (halfW > 60 && halfH > 60) {
        this.left += rate / 2;
        this.right -= rate / 2;
        this.top += rate / 2;
        this.bottom -= rate / 2;
        this.isShrinking = true;
        this.shrinkFlashTimer = 1.0;
      }

      this.shrinkTimer = SHRINK_INTERVAL;
    }

    if (this.shrinkFlashTimer > 0) {
      this.shrinkFlashTimer -= dt;
      if (this.shrinkFlashTimer <= 0) {
        this.isShrinking = false;
      }
    }

    return { isShrinking: this.isShrinking };
  }

  isOutOfBounds(x: number, y: number, radius: number): boolean {
    return (
      x - radius < this.left ||
      x + radius > this.right ||
      y - radius < this.top ||
      y + radius > this.bottom
    );
  }

  getOutOfBoundsFactor(x: number, y: number, radius: number): number {
    let factor = 0;
    if (x - radius < this.left) factor = Math.max(factor, (this.left - (x - radius)) / radius);
    if (x + radius > this.right) factor = Math.max(factor, ((x + radius) - this.right) / radius);
    if (y - radius < this.top) factor = Math.max(factor, (this.top - (y - radius)) / radius);
    if (y + radius > this.bottom) factor = Math.max(factor, ((y + radius) - this.bottom) / radius);
    return Math.min(factor, 1);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 800, 600);

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(this.left, this.top, this.right - this.left, this.bottom - this.top);

    const gridSpacing = 50;
    ctx.strokeStyle = 'rgba(59,130,246,0.06)';
    ctx.lineWidth = 1;
    for (let x = this.left; x <= this.right; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, this.top);
      ctx.lineTo(x, this.bottom);
      ctx.stroke();
    }
    for (let y = this.top; y <= this.bottom; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(this.left, y);
      ctx.lineTo(this.right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(59,130,246,0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 8;
    ctx.strokeRect(this.left, this.top, this.right - this.left, this.bottom - this.top);

    if (this.isShrinking || this.shrinkFlashTimer > 0) {
      const flashFreq = 5;
      const alpha = 0.5 * (0.5 + 0.5 * Math.sin(this.totalElapsed * flashFreq * Math.PI * 2));
      ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 12;
      ctx.strokeRect(this.left, this.top, this.right - this.left, this.bottom - this.top);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawOutOfBoundsWarning(ctx: CanvasRenderingContext2D, shipX: number, shipY: number, shipRadius: number, hp: number, maxHp: number) {
    if (!this.isOutOfBounds(shipX, shipY, shipRadius)) return;

    const intensity = 1 - hp / maxHp;
    const alpha = 0.3 + intensity * 0.5;

    ctx.save();
    ctx.strokeStyle = `rgba(239,68,68,${alpha})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(this.left, this.top, this.right - this.left, this.bottom - this.top);
    ctx.restore();
  }

  reset() {
    this.left = this.initialLeft;
    this.top = this.initialTop;
    this.right = this.initialRight;
    this.bottom = this.initialBottom;
    this.shrinkTimer = SHRINK_INTERVAL;
    this.isShrinking = false;
    this.shrinkFlashTimer = 0;
    this.totalElapsed = 0;
  }
}
