export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export class Trail {
  position: Vector2;
  size: number;
  color: RGB;
  alpha: number;
  life: number;
  maxLife: number;
  flickerTimer: number;
  baseAlpha: number;
  flickerInterval: number;

  constructor(x: number, y: number, size: number, color: RGB, alpha: number) {
    this.position = { x, y };
    this.size = size;
    this.color = { ...color };
    this.baseAlpha = alpha;
    this.alpha = alpha;
    this.maxLife = 2000;
    this.life = this.maxLife;
    this.flickerTimer = 0;
    this.flickerInterval = 100 + Math.random() * 400;
  }

  update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) return false;

    const lifeRatio = this.life / this.maxLife;
    this.alpha = this.baseAlpha * lifeRatio * lifeRatio;
    this.alpha = Math.max(0, this.alpha - 0.02 * (dt / 16.67));

    this.flickerTimer += dt;
    if (this.flickerTimer >= this.flickerInterval) {
      this.flickerTimer = 0;
      this.alpha *= 0.3 + Math.random() * 0.7;
    }

    return this.alpha > 0.005 && this.life > 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;
    const { x, y } = this.position;
    const { r, g, b } = this.color;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.size);
    gradient.addColorStop(0, `rgba(${r},${g},${b},${this.alpha})`);
    gradient.addColorStop(0.5, `rgba(${r},${g},${b},${this.alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
