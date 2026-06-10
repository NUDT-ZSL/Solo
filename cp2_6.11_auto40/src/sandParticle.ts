export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  color: string;
}

export class SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseHue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  life: number;
  maxLife: number;
  isHighlighted: boolean;
  highlightTime: number;
  trail: TrailPoint[];
  isExploding: boolean;
  explodeTime: number;
  explodeDuration: number;
  explodeColor: string;
  settled: boolean;
  settledY: number;

  constructor(x: number, y: number, hue: number = 40) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = Math.random() * 0.5;
    this.radius = 1.2 + Math.random() * 0.8;
    this.baseHue = hue + (Math.random() - 0.5) * 15;
    this.saturation = 55 + Math.random() * 15;
    this.lightness = 62 + Math.random() * 18;
    this.alpha = 0.75 + Math.random() * 0.25;
    this.life = 0;
    this.maxLife = Infinity;
    this.isHighlighted = false;
    this.highlightTime = 0;
    this.trail = [];
    this.isExploding = false;
    this.explodeTime = 0;
    this.explodeDuration = 0.8;
    this.explodeColor = this.getRandomExplodeColor();
    this.settled = false;
    this.settledY = y;
  }

  private getRandomExplodeColor(): string {
    const colors = [
      'hsl(45, 90%, 65%)',
      'hsl(35, 85%, 60%)',
      'hsl(25, 80%, 55%)',
      'hsl(55, 95%, 70%)',
      'hsl(15, 75%, 55%)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  setHue(hue: number): void {
    this.baseHue = hue + (Math.random() - 0.5) * 15;
  }

  highlight(): void {
    this.isHighlighted = true;
    this.highlightTime = 0.3;
  }

  explode(duration: number = 0.8): void {
    this.isExploding = true;
    this.explodeTime = 0;
    this.explodeDuration = duration;
    this.explodeColor = this.getRandomExplodeColor();
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2;
  }

  applyForce(fx: number, fy: number): void {
    this.vx += fx;
    this.vy += fy;
  }

  update(gravity: number, friction: number, deltaTime: number): void {
    this.life += deltaTime;

    if (this.highlightTime > 0) {
      this.highlightTime -= deltaTime;
      if (this.highlightTime <= 0) {
        this.isHighlighted = false;
      }
    }

    if (this.isExploding) {
      this.explodeTime += deltaTime;
      if (this.explodeTime >= this.explodeDuration) {
        this.isExploding = false;
        this.trail = [];
      } else {
        if (this.trail.length > 0 || Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
          this.trail.push({
            x: this.x,
            y: this.y,
            alpha: 1 - this.explodeTime / this.explodeDuration,
            color: this.explodeColor
          });
          if (this.trail.length > 8) {
            this.trail.shift();
          }
        }
      }
    } else {
      if (this.trail.length > 0) {
        this.trail = [];
      }
    }

    if (!this.settled) {
      this.vy += gravity * deltaTime * 60;
      this.vx *= Math.pow(friction, deltaTime * 60);
      this.vy *= Math.pow(friction, deltaTime * 60);

      const maxSpeed = 8;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }

      this.x += this.vx * deltaTime * 60;
      this.y += this.vy * deltaTime * 60;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      ctx.globalAlpha = t.alpha * 0.6 * (i / this.trail.length);
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (0.4 + 0.6 * (i / this.trail.length)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const color = this.getColor();

    if (this.isHighlighted) {
      const glowAlpha = Math.min(1, this.highlightTime / 0.3);
      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 6 * glowAlpha;
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = `hsl(${this.baseHue}, ${this.saturation}%, 95%)`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  getColor(): string {
    if (this.isExploding) {
      return this.explodeColor;
    }
    return `hsl(${this.baseHue}, ${this.saturation}%, ${this.lightness}%)`;
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= (this.radius + 2) * (this.radius + 2);
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = Math.random() * 0.5;
    this.life = 0;
    this.isHighlighted = false;
    this.highlightTime = 0;
    this.trail = [];
    this.isExploding = false;
    this.explodeTime = 0;
    this.settled = false;
  }
}
