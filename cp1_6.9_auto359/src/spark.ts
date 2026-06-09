import { Particle, RGB, COLOR_START, COLOR_END } from './particle';

export class Spark extends Particle {
  private blinkInterval: number;
  private nextBlinkTime: number;
  private blinkOn: boolean;
  private timeSinceLastBlink: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    birthTime: number,
    lifespan: number = 1500
  ) {
    super(x, y, vx, vy, birthTime, lifespan);

    this.currentSize = 1 + Math.random() * 2;
    this.blinkInterval = 100 + Math.random() * 400;
    this.nextBlinkTime = this.blinkInterval;
    this.blinkOn = true;
    this.timeSinceLastBlink = 0;

    const t = 0.5 + Math.random() * 0.5;
    this.currentColor = this.interpolateColor(COLOR_START, COLOR_END, t);
  }

  public override update(deltaTime: number): void {
    if (!this.isAlive) return;

    this.age += deltaTime;

    if (this.age >= this.lifespan) {
      this.isAlive = false;
      return;
    }

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    this.timeSinceLastBlink += deltaTime;
    if (this.timeSinceLastBlink >= this.nextBlinkTime) {
      this.blinkOn = !this.blinkOn;
      this.timeSinceLastBlink = 0;
      this.nextBlinkTime = this.blinkInterval;
    }

    const lifeT = this.age / this.lifespan;
    const baseOpacity = this.computeOpacity(lifeT);
    if (this.blinkOn) {
      this.currentOpacity = baseOpacity;
    } else {
      this.currentOpacity = baseOpacity * 0.15;
    }

    const colorT = this.age / this.lifespan;
    this.currentColor = this.interpolateColor(COLOR_START, COLOR_END, colorT);
  }

  public override draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    const { r, g, b } = this.currentColor;
    const size = this.currentSize;
    const alpha = this.currentOpacity;

    ctx.beginPath();
    const glow = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      size * 3
    );
    glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
    glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = glow;
    ctx.arc(this.x, this.y, size * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}
