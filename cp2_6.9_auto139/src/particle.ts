export type ColorTheme = 'rainbow' | 'red' | 'green' | 'blue';

export interface ThemeRange {
  min: number;
  max: number;
  name: string;
  glowColor: string;
}

export const THEME_RANGES: Record<ColorTheme, ThemeRange> = {
  rainbow: { min: 0, max: 360, name: '🌈 彩虹模式', glowColor: 'rgba(255, 255, 255, 0.3)' },
  red:     { min: 0, max: 30,  name: '🔴 红色系',     glowColor: 'rgba(255, 60, 60, 0.4)' },
  green:   { min: 90, max: 150, name: '🟢 绿色系',    glowColor: 'rgba(60, 255, 120, 0.4)' },
  blue:    { min: 200, max: 270, name: '🔵 蓝色系',   glowColor: 'rgba(60, 180, 255, 0.4)' }
};

export interface TrailPoint {
  x: number;
  y: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public hue: number;
  public size: number;
  public initialSize: number;
  public life: number;
  public maxLife: number;
  public trail: TrailPoint[];
  public trailLength: number;
  public fadeOut: boolean;
  public fadeProgress: number;
  public angle: number;
  public angularVelocity: number;

  constructor(
    x: number,
    y: number,
    hue: number,
    trailLength: number = 15
  ) {
    this.x = x;
    this.y = y;
    this.hue = hue;
    this.size = 8;
    this.initialSize = 8;
    this.life = 3000;
    this.maxLife = 3000;
    this.trail = [];
    this.trailLength = trailLength;
    this.fadeOut = false;
    this.fadeProgress = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.angularVelocity = (Math.random() - 0.5) * 0.08;

    const speed = 2 + Math.random() * 4;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(deltaTime: number, performanceMode: boolean): boolean {
    if (this.fadeOut) {
      this.fadeProgress += deltaTime / 1000;
      if (this.fadeProgress >= 1) {
        return false;
      }
    }

    this.trail.push({ x: this.x, y: this.y });
    const maxTrail = performanceMode ? Math.min(this.trailLength, 8) : this.trailLength;
    if (this.trail.length > maxTrail) {
      this.trail.shift();
    }

    this.angle += this.angularVelocity;
    const spiralFactor = 0.98;
    this.vx *= spiralFactor;
    this.vy *= spiralFactor;

    const perpX = -this.vy;
    const perpY = this.vx;
    const perpMag = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
    this.vx += (perpX / perpMag) * this.angularVelocity * 0.5;
    this.vy += (perpY / perpMag) * this.angularVelocity * 0.5;

    this.x += this.vx;
    this.y += this.vy;

    if (!this.fadeOut) {
      this.life -= deltaTime;
      const lifeRatio = Math.max(0, this.life / this.maxLife);
      this.size = this.initialSize * lifeRatio;
      if (this.life <= 0) {
        return false;
      }
    }

    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const fadeAlpha = this.fadeOut ? (1 - this.fadeProgress) : 1;

    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        const alpha = t * 0.6 * fadeAlpha;
        const width = this.size * t * 0.6;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = `hsla(${this.hue}, 100%, 65%, ${alpha})`;
        ctx.lineWidth = Math.max(0.5, width);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    const glowAlpha = 0.4 * fadeAlpha;
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size * 2.5
    );
    gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, ${0.8 * fadeAlpha})`);
    gradient.addColorStop(0.4, `hsla(${this.hue}, 100%, 60%, ${glowAlpha})`);
    gradient.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.1, this.size), 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 100%, 80%, ${fadeAlpha})`;
    ctx.fill();
  }

  getAlpha(): number {
    if (this.fadeOut) {
      return 1 - this.fadeProgress;
    }
    return Math.max(0, this.life / this.maxLife);
  }
}
