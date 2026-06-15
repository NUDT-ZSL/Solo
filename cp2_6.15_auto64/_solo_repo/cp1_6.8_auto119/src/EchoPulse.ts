import { Wall } from './types';

export interface EchoRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export class EchoPulse {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces = 0;
  maxBounces = 3;
  alive = true;
  alpha = 1;
  age = 0;
  maxAge = 3.5;
  rings: EchoRing[] = [];
  ringTimer = 0;
  ringInterval = 0.035;
  headRadius = 7;
  hasHitMechanism = false;
  hasHitGuard = false;

  constructor(x: number, y: number, angle: number, speed: number = 420) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number, walls: Wall[]): void {
    if (!this.alive) return;

    this.age += dt;
    this.alpha = Math.max(0, 1 - this.age / this.maxAge);
    if (this.alpha <= 0.01) {
      this.alive = false;
      return;
    }

    const prevX = this.x;
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    for (const wall of walls) {
      if (this.isInside(wall)) {
        this.resolveBounce(wall, prevX, prevY);
        this.bounces++;
        if (this.bounces > this.maxBounces) {
          this.alive = false;
          return;
        }
        this.spawnBounceRing();
        break;
      }
    }

    this.ringTimer += dt;
    if (this.ringTimer >= this.ringInterval) {
      this.ringTimer -= this.ringInterval;
      this.rings.push({
        x: this.x,
        y: this.y,
        radius: 3,
        maxRadius: 45,
        alpha: 0.45 * this.alpha,
      });
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.radius += 35 * dt;
      r.alpha = 0.45 * this.alpha * Math.max(0, 1 - r.radius / r.maxRadius);
      if (r.alpha <= 0.005) {
        this.rings.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const ring of this.rings) {
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,180,255,${ring.alpha})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    if (!this.alive) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.headRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(160,210,255,${this.alpha * 0.9})`;
    ctx.shadowColor = 'rgba(80,160,255,0.8)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.headRadius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,240,255,${this.alpha})`;
    ctx.fill();
    ctx.restore();
  }

  private spawnBounceRing(): void {
    this.rings.push({
      x: this.x,
      y: this.y,
      radius: 5,
      maxRadius: 70,
      alpha: 0.7,
    });
  }

  private isInside(w: Wall): boolean {
    return (
      this.x > w.x && this.x < w.x + w.w &&
      this.y > w.y && this.y < w.y + w.h
    );
  }

  private resolveBounce(w: Wall, px: number, py: number): void {
    const fromLeft = px <= w.x;
    const fromRight = px >= w.x + w.w;
    const fromTop = py <= w.y;
    const fromBottom = py >= w.y + w.h;

    let reflected = false;
    if (fromLeft || fromRight) {
      this.vx = -this.vx;
      this.x = fromLeft ? w.x - 1 : w.x + w.w + 1;
      reflected = true;
    }
    if (fromTop || fromBottom) {
      this.vy = -this.vy;
      this.y = fromTop ? w.y - 1 : w.y + w.h + 1;
      reflected = true;
    }
    if (!reflected) {
      this.vx = -this.vx;
      this.vy = -this.vy;
      this.x = px;
      this.y = py;
    }
  }
}
