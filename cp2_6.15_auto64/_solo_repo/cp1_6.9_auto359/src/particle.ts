export interface RGB {
  r: number;
  g: number;
  b: number;
}

const COLOR_START: RGB = { r: 74, g: 0, b: 224 };
const COLOR_END: RGB = { r: 255, g: 77, b: 77 };

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;

  public readonly birthTime: number;
  public lifespan: number;
  public age: number;

  public currentColor: RGB;
  public currentSize: number;
  public currentOpacity: number;

  public isAlive: boolean;

  protected static readonly BASE_SIZE = 6;
  protected static readonly MIN_SIZE = 2;
  protected static readonly SIZE_PERIOD = 2000;
  protected static readonly START_OPACITY = 0.8;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    birthTime: number,
    lifespan: number = 3000
  ) {
    this.x = x + (Math.random() - 0.5) * 4;
    this.y = y + (Math.random() - 0.5) * 4;
    this.vx = vx;
    this.vy = vy;
    this.birthTime = birthTime;
    this.lifespan = lifespan;
    this.age = 0;
    this.currentColor = { ...COLOR_START };
    this.currentSize = Particle.BASE_SIZE;
    this.currentOpacity = Particle.START_OPACITY;
    this.isAlive = true;
  }

  public update(deltaTime: number): void {
    if (!this.isAlive) return;

    this.age += deltaTime;

    if (this.age >= this.lifespan) {
      this.isAlive = false;
      return;
    }

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    const t = this.age / this.lifespan;

    this.currentColor = this.interpolateColor(COLOR_START, COLOR_END, t);

    this.currentSize = this.computeSize(this.age);

    this.currentOpacity = this.computeOpacity(t);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    const { r, g, b } = this.currentColor;
    const size = this.currentSize;
    const alpha = this.currentOpacity;

    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      size * 2
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, size * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha * 1.2, 1)})`;
    ctx.arc(this.x, this.y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  protected interpolateColor(start: RGB, end: RGB, t: number): RGB {
    const clamped = Math.max(0, Math.min(1, t));
    return {
      r: Math.round(start.r + (end.r - start.r) * clamped),
      g: Math.round(start.g + (end.g - start.g) * clamped),
      b: Math.round(start.b + (end.b - start.b) * clamped),
    };
  }

  protected computeSize(age: number): number {
    const phase = (2 * Math.PI * age) / Particle.SIZE_PERIOD;
    const amplitude = (Particle.BASE_SIZE - Particle.MIN_SIZE) / 2;
    const midpoint = (Particle.BASE_SIZE + Particle.MIN_SIZE) / 2;
    return midpoint + amplitude * Math.sin(phase);
  }

  protected computeOpacity(t: number): number {
    if (t < 1 / 3) {
      const localT = t * 3;
      return 0.8 - 0.6 * localT;
    } else if (t < 2 / 3) {
      const localT = (t - 1 / 3) * 3;
      return 0.2 + 0.45 * localT;
    } else {
      const localT = (t - 2 / 3) * 3;
      return 0.65 * (1 - localT);
    }
  }

  public static fuse(
    a: Particle,
    b: Particle,
    now: number
  ): Particle {
    const newX = (a.x + b.x) / 2;
    const newY = (a.y + b.y) / 2;
    const newVx = (a.vx + b.vx) / 2;
    const newVy = (a.vy + b.vy) / 2;

    const newColor: RGB = {
      r: Math.round((a.currentColor.r + b.currentColor.r) / 2),
      g: Math.round((a.currentColor.g + b.currentColor.g) / 2),
      b: Math.round((a.currentColor.b + b.currentColor.b) / 2),
    };

    const combinedSize = (a.currentSize + b.currentSize) * 0.65;
    const newOpacity = Math.max(a.currentOpacity, b.currentOpacity);
    const remainingA = Math.max(0, a.lifespan - a.age);
    const remainingB = Math.max(0, b.lifespan - b.age);
    const newLifespan = Math.max(remainingA, remainingB) * 0.7;

    const fused = new Particle(newX, newY, newVx, newVy, now, newLifespan);
    fused.currentColor = newColor;
    fused.currentSize = combinedSize * 1.3;
    fused.currentOpacity = newOpacity;

    return fused;
  }
}

export { COLOR_START, COLOR_END };
