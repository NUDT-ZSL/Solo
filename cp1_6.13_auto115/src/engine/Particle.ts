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
  lifeSpan?: number;
}

export class Particle {
  public id: string;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: RGB;
  public radius: number;
  public charge: number;
  public mass: number;
  public birthTime: number;
  public lifeSpan: number;
  public selected: boolean;
  public scale: number;
  public scaleStartTime: number;
  public merged: boolean;

  private static idCounter = 0;

  constructor(config: ParticleConfig) {
    this.id = `p_${Particle.idCounter++}_${Date.now().toString(36)}`;
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.color = { ...config.color };
    this.radius = config.radius;
    this.charge = config.charge;
    this.mass = config.mass ?? Math.pow(config.radius, 2);
    this.birthTime = performance.now();
    this.lifeSpan = (config.lifeSpan ?? 60) * 1000;
    this.selected = false;
    this.scale = 1;
    this.scaleStartTime = 0;
    this.merged = false;
  }

  public get age(): number {
    return performance.now() - this.birthTime;
  }

  public get remainingLife(): number {
    return Math.max(0, this.lifeSpan - this.age);
  }

  public get isDead(): boolean {
    return this.remainingLife <= 0;
  }

  public get opacity(): number {
    const remaining = this.remainingLife;
    if (remaining > 5000) return 1;
    return remaining / 5000;
  }

  public get currentScale(): number {
    if (this.scaleStartTime === 0) return this.scale;
    const elapsed = performance.now() - this.scaleStartTime;
    const duration = 200;
    if (elapsed >= duration) {
      this.scale = 1;
      this.scaleStartTime = 0;
      return 1;
    }
    return 0.8 + (elapsed / duration) * 0.2;
  }

  public startScaleAnimation(): void {
    this.scale = 0.8;
    this.scaleStartTime = performance.now();
  }

  public update(deltaTime: number, width: number, height: number): void {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    const r = this.radius;
    if (this.x < r) { this.x = r; this.vx *= -0.8; }
    if (this.x > width - r) { this.x = width - r; this.vx *= -0.8; }
    if (this.y < r) { this.y = r; this.vy *= -0.8; }
    if (this.y > height - r) { this.y = height - r; this.vy *= -0.8; }

    this.vx *= 0.999;
    this.vy *= 0.999;
  }

  public containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= this.radius + 4;
  }

  public distanceTo(other: Particle): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
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

    const maxLife = Math.max(p1.lifeSpan - p1.age, p2.lifeSpan - p2.age);
    const merged = new Particle({
      x: nx,
      y: ny,
      vx: nvx,
      vy: nvy,
      color: mixedColor,
      radius: nradius,
      charge: ncharge,
      mass: totalMass,
      lifeSpan: maxLife / 1000,
    });
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
        lifeSpan: 10,
      }));
    }
    return particles;
  }
}
