export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: RGB;
  radius: number;
  charge: number;
  mass?: number;
  lifeMs?: number;
}

export class Particle {
  public id: number;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: RGB;
  public radius: number;
  public charge: number;
  public mass: number;
  public lifeMs: number;
  public maxLifeMs: number;
  public selected: boolean;
  public merged: boolean;

  public scaleElapsedMs: number;
  public scaleActive: boolean;

  private static readonly SCALE_DURATION_MS = 200;
  private static readonly FADE_DURATION_MS = 5000;
  private static idCounter = 0;

  constructor(config: ParticleConfig) {
    this.id = Particle.idCounter++;
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.color = { ...config.color };
    this.radius = config.radius;
    this.charge = config.charge;
    this.mass = config.mass ?? Math.pow(config.radius, 2);
    this.maxLifeMs = config.lifeMs ?? 60000;
    this.lifeMs = this.maxLifeMs;
    this.selected = false;
    this.merged = false;
    this.scaleElapsedMs = Particle.SCALE_DURATION_MS;
    this.scaleActive = false;
  }

  public get isDead(): boolean {
    return this.lifeMs <= 0;
  }

  public get opacity(): number {
    if (this.lifeMs > Particle.FADE_DURATION_MS) return 1;
    if (this.lifeMs <= 0) return 0;
    return this.lifeMs / Particle.FADE_DURATION_MS;
  }

  public get currentScale(): number {
    if (!this.scaleActive) return 1;
    const t = Math.min(1, this.scaleElapsedMs / Particle.SCALE_DURATION_MS);
    return 0.8 + t * 0.2;
  }

  public startScaleAnimation(): void {
    this.scaleActive = true;
    this.scaleElapsedMs = 0;
  }

  public update(
    dtFactor: number,
    elapsedMs: number,
    width: number,
    height: number
  ): void {
    this.lifeMs -= elapsedMs;

    if (this.scaleActive) {
      this.scaleElapsedMs += elapsedMs;
      if (this.scaleElapsedMs >= Particle.SCALE_DURATION_MS) {
        this.scaleElapsedMs = Particle.SCALE_DURATION_MS;
        this.scaleActive = false;
      }
    }

    this.x += this.vx * dtFactor;
    this.y += this.vy * dtFactor;

    const r = this.radius;
    if (this.x < r) { this.x = r; this.vx *= -0.8; }
    if (this.x > width - r) { this.x = width - r; this.vx *= -0.8; }
    if (this.y < r) { this.y = r; this.vy *= -0.8; }
    if (this.y > height - r) { this.y = height - r; this.vy *= -0.8; }

    const damping = Math.pow(0.999, dtFactor);
    this.vx *= damping;
    this.vy *= damping;
  }

  public containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= (this.radius + 4) * (this.radius + 4);
  }

  public static merge(p1: Particle, p2: Particle): Particle {
    const totalMass = p1.mass + p2.mass;
    const nx = (p1.x * p1.mass + p2.x * p2.mass) / totalMass;
    const ny = (p1.y * p1.mass + p2.y * p2.mass) / totalMass;
    const nvx = (p1.vx * p1.mass + p2.vx * p2.mass) / totalMass;
    const nvy = (p1.vy * p1.mass + p2.vy * p2.mass) / totalMass;
    const nradius = Math.sqrt(totalMass);
    const ncharge = p1.charge + p2.charge;

    const mixedColor: RGB = {
      r: Math.round(p1.color.r * 0.5 + p2.color.r * 0.5),
      g: Math.round(p1.color.g * 0.5 + p2.color.g * 0.5),
      b: Math.round(p1.color.b * 0.5 + p2.color.b * 0.5),
    };

    const maxRemaining = Math.max(p1.lifeMs, p2.lifeMs);

    const merged = new Particle({
      x: nx,
      y: ny,
      vx: nvx,
      vy: nvy,
      color: mixedColor,
      radius: nradius,
      charge: ncharge,
      mass: totalMass,
      lifeMs: maxRemaining,
    });
    merged.maxLifeMs = Math.max(p1.maxLifeMs, p2.maxLifeMs);
    merged.startScaleAnimation();
    return merged;
  }

  public static createSplitParticles(source: Particle): Particle[] {
    const count = 2 + Math.floor(Math.random() * 3);
    const particles: Particle[] = [];
    const splitSpeed = Math.sqrt(source.vx * source.vx + source.vy * source.vy) / 3;
    const splitRadius = Math.max(1, source.radius * 0.3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = splitSpeed * (0.5 + Math.random() * 0.5);
      particles.push(new Particle({
        x: source.x,
        y: source.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: { ...source.color },
        radius: splitRadius,
        charge: source.charge / count,
        lifeMs: 10000,
      }));
    }
    return particles;
  }
}
