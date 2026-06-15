export interface PulseRingOptions {
  x: number;
  y: number;
  initialRadius?: number;
  maxRadius?: number;
  baseHue?: number;
  colorOffset?: number;
  decayRate?: number;
}

export class PulseRing {
  public x: number;
  public y: number;
  public initialRadius: number;
  public maxRadius: number;
  public baseHue: number;
  public colorOffset: number;
  public decayRate: number;

  public birthTime: number;
  public lastUpdate: number;
  public currentOpacity: number = 1;
  public isClearing: boolean = false;
  public clearStartTime: number = 0;
  public clearDuration: number = 1500;

  private readonly PULSE_PERIOD = 2000;
  private readonly PULSE_AMPLITUDE = 0.3;
  private readonly SOFT_EDGE = 0.5;
  private readonly MIN_OPACITY = 0.03;

  constructor(options: PulseRingOptions) {
    this.x = options.x;
    this.y = options.y;
    this.initialRadius = options.initialRadius ?? 20;
    this.maxRadius = options.maxRadius ?? 80;
    this.baseHue = options.baseHue ?? 30;
    this.colorOffset = options.colorOffset ?? 0;
    this.decayRate = options.decayRate ?? 0.05;
    this.birthTime = performance.now();
    this.lastUpdate = this.birthTime;
  }

  public update(now: number): void {
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (this.isClearing) {
      const elapsed = now - this.clearStartTime;
      const t = Math.min(elapsed / this.clearDuration, 1);
      this.currentOpacity *= (1 - t);
      if (t >= 1) {
        this.currentOpacity = 0;
      }
      return;
    }

    const decayFactor = Math.pow(1 - this.decayRate, dt);
    this.currentOpacity = Math.max(
      this.MIN_OPACITY,
      this.currentOpacity * decayFactor
    );
  }

  public startClear(now: number): void {
    if (!this.isClearing) {
      this.isClearing = true;
      this.clearStartTime = now;
    }
  }

  public isDead(): boolean {
    return this.currentOpacity <= 0.001;
  }

  public getRadius(now: number): number {
    const elapsed = now - this.birthTime;
    const growthProgress = Math.min(elapsed / 800, 1);
    const easedGrowth = 1 - Math.pow(1 - growthProgress, 3);
    const baseRadius =
      this.initialRadius +
      (this.maxRadius - this.initialRadius) * easedGrowth;

    const pulsePhase = (elapsed % this.PULSE_PERIOD) / this.PULSE_PERIOD;
    const pulse = Math.sin(pulsePhase * Math.PI * 2) * this.PULSE_AMPLITUDE;

    return baseRadius * (1 + pulse);
  }

  public draw(ctx: CanvasRenderingContext2D, now: number): void {
    if (this.currentOpacity <= 0.001) return;

    const radius = this.getRadius(now);
    const hue = (this.baseHue + this.colorOffset + 360) % 360;
    const opacity = this.currentOpacity;

    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      radius
    );

    gradient.addColorStop(0, `hsla(${hue}, 90%, 65%, ${opacity})`);
    gradient.addColorStop(0.4, `hsla(${hue}, 85%, 55%, ${opacity * 0.75})`);
    gradient.addColorStop(0.75, `hsla(${hue + 10}, 80%, 50%, ${opacity * 0.35})`);
    gradient.addColorStop(
      1 - this.SOFT_EDGE / radius,
      `hsla(${hue + 20}, 75%, 45%, ${opacity * 0.08})`
    );
    gradient.addColorStop(1, `hsla(${hue + 20}, 70%, 40%, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }
}
