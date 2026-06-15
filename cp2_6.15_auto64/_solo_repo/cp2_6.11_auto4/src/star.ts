export interface TrailPoint {
  x: number;
  y: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorR: number;
  colorG: number;
  colorB: number;
  radius: number;
  trail: TrailPoint[] = [];
  brightness: number = 1.0;
  maxLifetime: number;
  age: number = 0;
  alive: boolean = true;
  maxTrailLength: number;
  decaying: boolean = false;
  fadeSpeed: number = 1.2;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    colorR: number,
    colorG: number,
    colorB: number,
    maxLifetime: number,
    maxTrailLength: number = 10
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.colorR = colorR;
    this.colorG = colorG;
    this.colorB = colorB;
    this.maxLifetime = maxLifetime;
    this.maxTrailLength = maxTrailLength;
    this.radius = 3;
  }

  update(dt: number): void {
    if (!this.alive) return;

    this.age += dt;

    if (this.age >= this.maxLifetime && !this.decaying) {
      this.decaying = true;
    }

    if (this.decaying) {
      this.brightness -= this.fadeSpeed * dt;
      if (this.brightness <= 0) {
        this.brightness = 0;
        this.alive = false;
        return;
      }
      const targetTrailLen = Math.max(2, Math.floor(this.maxTrailLength * this.brightness));
      while (this.trail.length > targetTrailLen) {
        this.trail.shift();
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.trail.push({ x: this.x, y: this.y });
    while (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const trailLen = this.trail.length;
    if (trailLen < 2) return;

    for (let i = 0; i < trailLen; i++) {
      const point = this.trail[i];
      const progress = i / (trailLen - 1);
      const r = lerp(1, 4, progress);
      const alpha = progress * this.brightness;
      const grayFactor = 1 - progress * this.brightness;
      const cr = Math.round(lerp(this.colorR, 128, grayFactor));
      const cg = Math.round(lerp(this.colorG, 128, grayFactor));
      const cb = Math.round(lerp(this.colorB, 128, grayFactor));

      if (alpha > 0.01) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    const glowR = this.radius * 4 * this.brightness;
    if (glowR > 0.5) {
      const grad = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, glowR
      );
      grad.addColorStop(0, `rgba(${this.colorR},${this.colorG},${this.colorB},${(this.brightness * 0.8).toFixed(3)})`);
      grad.addColorStop(0.4, `rgba(${this.colorR},${this.colorG},${this.colorB},${(this.brightness * 0.25).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${this.colorR},${this.colorG},${this.colorB},0)`);
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * this.brightness, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.colorR},${this.colorG},${this.colorB},${this.brightness.toFixed(3)})`;
    ctx.fill();
  }
}
