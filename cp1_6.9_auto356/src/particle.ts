import { RGB, Vector2, Trail } from './trail';

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  };
}

export class Particle {
  position: Vector2;
  velocity: Vector2;
  size: number;
  baseSize: number;
  color: RGB;
  colorIndex: number;
  colorProgress: number;
  alpha: number;
  alphaDirection: number;
  life: number;
  maxLife: number;
  merged: boolean;
  trailTimer: number;
  sinePhase: number;
  dying: boolean;

  private palette: RGB[];

  constructor(
    x: number, y: number,
    vx: number, vy: number,
    size: number,
    colorIndex: number,
    paletteHex: string[]
  ) {
    this.position = { x, y };
    const speed = Math.sqrt(vx * vx + vy * vy) || 1;
    const targetSpeed = 60;
    this.velocity = {
      x: (vx / speed) * targetSpeed,
      y: (vy / speed) * targetSpeed
    };
    this.baseSize = size;
    this.size = size;
    this.colorIndex = colorIndex % paletteHex.length;
    this.colorProgress = 0;
    this.palette = paletteHex.map(hexToRgb);
    this.color = { ...this.palette[this.colorIndex] };
    this.alpha = 0.8;
    this.alphaDirection = -1;
    this.maxLife = 3000;
    this.life = this.maxLife;
    this.merged = false;
    this.trailTimer = 0;
    this.sinePhase = Math.random() * Math.PI * 2;
    this.dying = false;
  }

  update(
    dt: number,
    particles: Particle[],
    trails: Trail[],
    paletteHex: string[],
    trailInterval: number
  ): boolean {
    this.palette = paletteHex.map(hexToRgb);
    this.life -= dt;

    if (this.life <= 0) {
      this.dying = true;
    }

    const dtRatio = dt / 16.67;

    this.sinePhase += 0.05 * dtRatio;
    const sine = Math.sin(this.sinePhase);
    this.size = this.baseSize + sine * 2;
    this.size = Math.max(2, Math.min(6, this.size));

    this.colorProgress += 0.02 * dtRatio;
    while (this.colorProgress >= 1) {
      this.colorProgress -= 1;
      this.colorIndex = (this.colorIndex + 1) % this.palette.length;
    }
    const nextIdx = (this.colorIndex + 1) % this.palette.length;
    this.color = lerpRgb(this.palette[this.colorIndex], this.palette[nextIdx], this.colorProgress);

    if (this.dying) {
      this.alpha *= 0.92;
    } else {
      if (this.alphaDirection > 0) {
        this.alpha += 0.005 * dtRatio;
        if (this.alpha >= 0.6) {
          this.alpha = 0.6;
          this.alphaDirection = -1;
        }
      } else {
        this.alpha -= 0.003 * dtRatio;
        if (this.alpha <= 0.2) {
          this.alpha = 0.2;
          this.alphaDirection = 1;
        }
      }
    }

    if (!this.merged) {
      for (let i = 0; i < particles.length; i++) {
        const other = particles[i];
        if (other === this || other.dying || this.dying) continue;

        const dx = other.position.x - this.position.x;
        const dy = other.position.y - this.position.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 400 && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          if (dist < 5 && !this.merged && !other.merged) {
            this.mergeWith(other, particles);
            return true;
          }

          const attraction = 0.05 * dtRatio;
          this.velocity.x += nx * attraction;
          this.velocity.y += ny * attraction;
        }
      }
    }

    this.position.x += this.velocity.x * (dt / 1000);
    this.position.y += this.velocity.y * (dt / 1000);

    this.trailTimer += dt;
    const isFinalPhase = this.life < 500 && this.life > 0;
    const currentInterval = isFinalPhase ? 50 : trailInterval;

    if (this.trailTimer >= currentInterval && this.life > 0) {
      this.trailTimer = 0;

      let trailSize: number, trailAlpha: number;
      if (isFinalPhase) {
        trailSize = 0.5 + Math.random() * 1.0;
        trailAlpha = 0.1 + Math.random() * 0.2;
      } else {
        trailSize = 1 + Math.random() * 2;
        trailAlpha = (0.3 + Math.random() * 0.3) * 0.5;
      }

      trails.push(new Trail(
        this.position.x,
        this.position.y,
        trailSize,
        this.color,
        trailAlpha
      ));
    }

    return !(this.dying && this.alpha < 0.01);
  }

  private mergeWith(other: Particle, particles: Particle[]): void {
    const midX = (this.position.x + other.position.x) / 2;
    const midY = (this.position.y + other.position.y) / 2;
    const newSize = Math.max(this.baseSize, other.baseSize) * 1.3;
    const newColor: RGB = {
      r: Math.round((this.color.r + other.color.r) / 2),
      g: Math.round((this.color.g + other.color.g) / 2),
      b: Math.round((this.color.b + other.color.b) / 2)
    };
    const newAlpha = ((this.alpha + other.alpha) / 2) * 0.9;
    const newVx = (this.velocity.x + other.velocity.x) / 2;
    const newVy = (this.velocity.y + other.velocity.y) / 2;

    this.position.x = midX;
    this.position.y = midY;
    this.baseSize = newSize;
    this.size = newSize;
    this.color = newColor;
    this.alpha = newAlpha;
    this.velocity.x = newVx;
    this.velocity.y = newVy;
    this.merged = true;

    const idx = particles.indexOf(other);
    if (idx !== -1) {
      particles.splice(idx, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;
    const { x, y } = this.position;
    const { r, g, b } = this.color;
    const radius = this.size;

    const glowRadius = radius * 2.5;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    gradient.addColorStop(0, `rgba(${r},${g},${b},${this.alpha})`);
    gradient.addColorStop(0.3, `rgba(${r},${g},${b},${this.alpha * 0.6})`);
    gradient.addColorStop(0.7, `rgba(${r},${g},${b},${this.alpha * 0.2})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    coreGradient.addColorStop(0, `rgba(255,255,255,${this.alpha * 0.9})`);
    coreGradient.addColorStop(0.4, `rgba(${r},${g},${b},${this.alpha * 0.7})`);
    coreGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
