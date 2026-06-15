import { playBounceSound } from './audio';

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  duration: number;
  elapsed: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public hue: number;
  public saturation: number;
  public lightness: number;
  public trail: TrailPoint[];
  public mass: number;
  public isMerging: boolean = false;

  private static readonly TRAIL_LENGTH: number = 20;
  private static readonly MAX_SPEED: number = 5;
  private static readonly SPEED_INCREASE: number = 1.02;

  constructor(x: number, y: number, vx: number, vy: number, radius: number, hue: number, saturation: number, lightness: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.hue = hue;
    this.saturation = saturation;
    this.lightness = lightness;
    this.trail = [];
    this.mass = Math.PI * radius * radius;
  }

  public get color(): string {
    return `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
  }

  public update(canvasWidth: number, canvasHeight: number): Shockwave | null {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > Particle.TRAIL_LENGTH) {
      this.trail.shift();
    }

    this.x += this.vx;
    this.y += this.vy;

    let shockwave: Shockwave | null = null;

    if (this.x - this.radius <= 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx) * Particle.SPEED_INCREASE;
      this.vy *= Particle.SPEED_INCREASE;
      this.clampSpeed();
      shockwave = this.createShockwave(0, this.y, '#ffffff', 30, 0.2);
      playBounceSound(this.radius);
    } else if (this.x + this.radius >= canvasWidth) {
      this.x = canvasWidth - this.radius;
      this.vx = -Math.abs(this.vx) * Particle.SPEED_INCREASE;
      this.vy *= Particle.SPEED_INCREASE;
      this.clampSpeed();
      shockwave = this.createShockwave(canvasWidth, this.y, '#ffffff', 30, 0.2);
      playBounceSound(this.radius);
    }

    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy) * Particle.SPEED_INCREASE;
      this.vx *= Particle.SPEED_INCREASE;
      this.clampSpeed();
      shockwave = this.createShockwave(this.x, 0, '#ffffff', 30, 0.2);
      playBounceSound(this.radius);
    } else if (this.y + this.radius >= canvasHeight) {
      this.y = canvasHeight - this.radius;
      this.vy = -Math.abs(this.vy) * Particle.SPEED_INCREASE;
      this.vx *= Particle.SPEED_INCREASE;
      this.clampSpeed();
      shockwave = this.createShockwave(this.x, canvasHeight, '#ffffff', 30, 0.2);
      playBounceSound(this.radius);
    }

    return shockwave;
  }

  private clampSpeed(): void {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > Particle.MAX_SPEED) {
      const scale = Particle.MAX_SPEED / speed;
      this.vx *= scale;
      this.vy *= scale;
    }
  }

  private createShockwave(x: number, y: number, color: string, maxRadius: number, duration: number): Shockwave {
    return {
      x,
      y,
      radius: 0,
      maxRadius,
      alpha: 1,
      color,
      duration,
      elapsed: 0
    };
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const alpha = (i / this.trail.length) * 0.8;
      const size = this.radius * (0.3 + (i / this.trail.length) * 0.7);
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${alpha})`;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 95%, 1)`);
    gradient.addColorStop(0.4, this.color);
    gradient.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, ${this.lightness - 20}%, 0.9)`);
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 25;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  public applyAttraction(targetX: number, targetY: number, strength: number, range: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < range && dist > 0) {
      this.vx += (dx / dist) * strength;
      this.vy += (dy / dist) * strength;
      this.clampSpeed();
    }
  }

  public static merge(a: Particle, b: Particle): Particle {
    const bigger = a.radius >= b.radius ? a : b;
    const smaller = a.radius >= b.radius ? b : a;
    smaller.isMerging = true;

    const totalMass = a.mass + b.mass;
    const newX = (a.x * a.mass + b.x * b.mass) / totalMass;
    const newY = (a.y * a.mass + b.y * b.mass) / totalMass;
    const newVx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
    const newVy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
    const newRadius = (Math.sqrt(a.radius) + Math.sqrt(b.radius)) * 1.2;

    let hueDiff = Math.abs(a.hue - b.hue);
    let newHue: number;
    if (hueDiff > 180) {
      if (a.hue < b.hue) {
        newHue = (a.hue + 360 + b.hue) / 2 % 360;
      } else {
        newHue = (b.hue + 360 + a.hue) / 2 % 360;
      }
    } else {
      newHue = (a.hue + b.hue) / 2;
    }

    const newSaturation = Math.min(100, (a.saturation + b.saturation) / 2 + 5);
    const newLightness = Math.min(85, (a.lightness + b.lightness) / 2);

    const merged = new Particle(newX, newY, newVx, newVy, newRadius, newHue, newSaturation, newLightness);
    merged.trail = [...bigger.trail];
    return merged;
  }

  public distanceTo(other: Particle): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
