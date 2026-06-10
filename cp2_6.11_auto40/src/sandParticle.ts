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
  mass: number;

  constructor(x: number, y: number, hue: number = 40) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = 0;
    this.radius = 1.0 + Math.random() * 0.6;
    this.mass = this.radius * this.radius;
    this.baseHue = hue + (Math.random() - 0.5) * 12;
    this.saturation = 52 + Math.random() * 12;
    this.lightness = 60 + Math.random() * 16;
    this.alpha = 0.78 + Math.random() * 0.22;
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
  }

  getRandomExplodeColor(): string {
    const colors = [
      'hsl(45, 92%, 68%)',
      'hsl(38, 88%, 62%)',
      'hsl(28, 82%, 58%)',
      'hsl(52, 96%, 72%)',
      'hsl(18, 78%, 56%)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  setHue(hue: number): void {
    this.baseHue = hue + (Math.random() - 0.5) * 12;
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
    const speed = 2.5 + Math.random() * 4.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2.5;
    this.settled = false;
  }

  applyForce(fx: number, fy: number): void {
    this.vx += fx / this.mass;
    this.vy += fy / this.mass;
    this.settled = false;
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
        const shouldAddTrail = Math.abs(this.vx) > 0.4 || Math.abs(this.vy) > 0.4;
        if (shouldAddTrail) {
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
    } else if (this.trail.length > 0) {
      this.trail = [];
    }

    if (this.settled) return;

    this.vy += gravity * deltaTime * 60;
    this.vx *= Math.pow(friction, deltaTime * 60);
    this.vy *= Math.pow(friction, deltaTime * 60);

    const maxSpeed = 10;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;

    if (Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.08) {
      this.vx = 0;
      this.vy = 0;
      this.settled = true;
    }
  }

  resolveCollision(other: SandParticle, restitution: number = 0.12, friction: number = 0.08): boolean {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const minDist = this.radius + other.radius;
    const distSq = dx * dx + dy * dy;

    if (distSq >= minDist * minDist) return false;

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;

    const overlap = minDist - dist;
    const totalMass = this.mass + other.mass;

    const positionCorrection = overlap * 0.8;
    const thisMove = (positionCorrection * other.mass) / totalMass;
    const otherMove = (positionCorrection * this.mass) / totalMass;

    this.x -= nx * thisMove;
    this.y -= ny * thisMove;
    other.x += nx * otherMove;
    other.y += ny * otherMove;

    const dvx = this.vx - other.vx;
    const dvy = this.vy - other.vy;
    const dvn = dvx * nx + dvy * ny;

    if (dvn > 0) {
      const tx = -ny;
      const ty = nx;
      const dvt = dvx * tx + dvy * ty;
      const tangentImpulse = dvt / totalMass;
      const maxTangent = Math.abs(dvn) * friction;
      const clampedTangent = Math.max(-maxTangent, Math.min(maxTangent, tangentImpulse));

      this.vx -= clampedTangent * other.mass * tx;
      this.vy -= clampedTangent * other.mass * ty;
      other.vx += clampedTangent * this.mass * tx;
      other.vy += clampedTangent * this.mass * ty;

      return true;
    }

    const jn = (-(1 + restitution) * dvn) / totalMass;

    this.vx += jn * other.mass * nx;
    this.vy += jn * other.mass * ny;
    other.vx -= jn * this.mass * nx;
    other.vy -= jn * this.mass * ny;

    const tx = -ny;
    const ty = nx;
    const dvt = dvx * tx + dvy * ty;
    const jt = dvt / totalMass;
    const maxJt = Math.abs(jn) * friction;
    const clampedJt = Math.max(-maxJt, Math.min(maxJt, jt));

    this.vx -= clampedJt * other.mass * tx;
    this.vy -= clampedJt * other.mass * ty;
    other.vx += clampedJt * this.mass * tx;
    other.vy += clampedJt * this.mass * ty;

    if (this.settled && !other.settled) {
      this.settled = false;
    }
    if (other.settled && !this.settled) {
      other.settled = false;
    }

    return true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const trailAlpha = t.alpha * 0.6 * (i / this.trail.length);
      const trailSize = this.radius * (0.35 + 0.65 * (i / this.trail.length));
      ctx.globalAlpha = trailAlpha;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const color = this.getColor();

    if (this.isHighlighted) {
      const glowAlpha = Math.min(1, this.highlightTime / 0.3);
      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.92)';
      ctx.shadowBlur = 6 * glowAlpha;
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = `hsl(${this.baseHue}, ${this.saturation}%, 96%)`;
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
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = 0;
    this.life = 0;
    this.isHighlighted = false;
    this.highlightTime = 0;
    this.trail = [];
    this.isExploding = false;
    this.explodeTime = 0;
    this.settled = false;
  }
}
