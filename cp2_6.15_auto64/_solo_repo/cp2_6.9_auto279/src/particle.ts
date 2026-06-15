export interface ColorStop {
  r: number;
  g: number;
  b: number;
}

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  startColor: ColorStop;
  endColor: ColorStop;
  trailLength: number;
  lifespan: number;
  speed: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public startColor: ColorStop;
  public endColor: ColorStop;
  public trailLength: number;
  public lifespan: number;
  public age: number = 0;
  public dead: boolean = false;
  public trail: { x: number; y: number }[] = [];
  public alpha: number = 1;

  constructor(config: ParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.radius = config.radius;
    this.startColor = config.startColor;
    this.endColor = config.endColor;
    this.trailLength = config.trailLength;
    this.lifespan = config.lifespan;
  }

  public update(deltaTime: number): void {
    this.age += deltaTime;
    this.alpha = Math.max(0, 1 - this.age / this.lifespan);

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    this.vx *= 0.98;
    this.vy *= 0.98;

    if (this.age >= this.lifespan) {
      this.dead = true;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const trailProgress = i / this.trail.length;
      const size = this.radius * (1 - trailProgress);
      const alpha = this.alpha * (1 - trailProgress);
      const color = this.interpolateColor(this.startColor, this.endColor, trailProgress);
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    const mainColor = this.interpolateColor(this.startColor, this.endColor, 0);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, ${this.alpha})`;
    ctx.shadowColor = `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, ${this.alpha})`;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private interpolateColor(start: ColorStop, end: ColorStop, t: number): ColorStop {
    return {
      r: Math.round(start.r + (end.r - start.r) * t),
      g: Math.round(start.g + (end.g - start.g) * t),
      b: Math.round(start.b + (end.b - start.b) * t)
    };
  }
}

export function hexToRgb(hex: string): ColorStop {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

export const COLOR_SCHEMES = [
  {
    name: '暖阳',
    start: '#FF6B35',
    end: '#FFD700'
  },
  {
    name: '极光',
    start: '#00E5FF',
    end: '#00FF87'
  },
  {
    name: '幻彩',
    start: '#FF007F',
    end: '#7A00FF'
  }
];

export const BURST_COLORS = {
  start: '#00E5FF',
  end: '#FF007F'
};
