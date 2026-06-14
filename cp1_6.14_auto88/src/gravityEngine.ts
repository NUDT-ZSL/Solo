export interface GravitySource {
  id: string;
  x: number;
  y: number;
  mass: number;
  radius: number;
  color: string;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  trail: TrailPoint[];
  dead: boolean;
}

const G = 500;
const SOFTENING = 20;
const MAX_PARTICLES = 200;
const TRAIL_FADE_RATE = 0.016;
const DEAD_TRAIL_FADE_RATE = 0.033;
const TRAIL_MAX_LENGTH = 600;

export class GravityEngine {
  private sources: GravitySource[] = [];
  private particles: Particle[] = [];
  private nextSourceId = 0;
  private nextParticleId = 0;

  addSource(x: number, y: number, mass: number): GravitySource {
    const radius = this.calculateRadius(mass);
    const color = this.calculateColor(mass);
    const source: GravitySource = {
      id: `source_${this.nextSourceId++}`,
      x,
      y,
      mass,
      radius,
      color
    };
    this.sources.push(source);
    return source;
  }

  removeSource(id: string): boolean {
    const index = this.sources.findIndex(s => s.id === id);
    if (index !== -1) {
      this.sources.splice(index, 1);
      return true;
    }
    return false;
  }

  getSources(): GravitySource[] {
    return [...this.sources];
  }

  getSourceById(id: string): GravitySource | undefined {
    return this.sources.find(s => s.id === id);
  }

  updateSourcePosition(id: string, x: number, y: number): boolean {
    const source = this.sources.find(s => s.id === id);
    if (source) {
      source.x = x;
      source.y = y;
      return true;
    }
    return false;
  }

  launchParticle(x: number, y: number, vx: number, vy: number): Particle {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }

    const particle: Particle = {
      id: `particle_${this.nextParticleId++}`,
      x,
      y,
      vx,
      vy,
      age: 0,
      maxAge: 1,
      trail: [],
      dead: false
    };
    this.particles.push(particle);
    return particle;
  }

  getParticles(): Particle[] {
    return [...this.particles];
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clearParticles(): void {
    this.particles = [];
  }

  update(dt: number): void {
    for (const particle of this.particles) {
      if (particle.dead) continue;

      if (particle.trail.length === 0 ||
          Math.hypot(particle.x - particle.trail[particle.trail.length - 1].x,
                     particle.y - particle.trail[particle.trail.length - 1].y) > 1.5) {
        particle.trail.push({
          x: particle.x,
          y: particle.y,
          alpha: 1.0
        });
      }

      if (particle.trail.length > TRAIL_MAX_LENGTH) {
        particle.trail.shift();
      }

      for (const point of particle.trail) {
        point.alpha -= TRAIL_FADE_RATE;
      }
      particle.trail = particle.trail.filter(p => p.alpha > 0);

      this.rk4Step(particle, dt);

      particle.age += dt;

      let collided = false;
      for (const source of this.sources) {
        const dx = particle.x - source.x;
        const dy = particle.y - source.y;
        const dist = Math.hypot(dx, dy);
        if (dist < source.radius * 0.6) {
          collided = true;
          break;
        }
      }

      const bounds = 3000;
      if (collided || particle.age > 60 ||
          Math.abs(particle.x) > bounds || Math.abs(particle.y) > bounds) {
        particle.dead = true;
      }
    }

    for (const particle of this.particles) {
      if (particle.dead && particle.trail.length > 0) {
        for (const point of particle.trail) {
          point.alpha -= DEAD_TRAIL_FADE_RATE;
        }
        particle.trail = particle.trail.filter(p => p.alpha > 0);
      }
    }

    this.particles = this.particles.filter(p => !p.dead || p.trail.length > 0);
  }

  private rk4Step(particle: Particle, dt: number): void {
    const acc = (x: number, y: number): { ax: number; ay: number } => {
      let ax = 0;
      let ay = 0;

      for (const source of this.sources) {
        const dx = source.x - x;
        const dy = source.y - y;
        const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
        const dist = Math.sqrt(distSq);
        const force = (G * source.mass) / distSq;
        ax += force * (dx / dist);
        ay += force * (dy / dist);
      }

      return { ax, ay };
    };

    const { x: x0, y: y0, vx: vx0, vy: vy0 } = particle;

    const a1 = acc(x0, y0);
    const k1x = vx0;
    const k1y = vy0;
    const k1vx = a1.ax;
    const k1vy = a1.ay;

    const x2 = x0 + k1x * dt * 0.5;
    const y2 = y0 + k1y * dt * 0.5;
    const vx2 = vx0 + k1vx * dt * 0.5;
    const vy2 = vy0 + k1vy * dt * 0.5;
    const a2 = acc(x2, y2);
    const k2x = vx2;
    const k2y = vy2;
    const k2vx = a2.ax;
    const k2vy = a2.ay;

    const x3 = x0 + k2x * dt * 0.5;
    const y3 = y0 + k2y * dt * 0.5;
    const vx3 = vx0 + k2vx * dt * 0.5;
    const vy3 = vy0 + k2vy * dt * 0.5;
    const a3 = acc(x3, y3);
    const k3x = vx3;
    const k3y = vy3;
    const k3vx = a3.ax;
    const k3vy = a3.ay;

    const x4 = x0 + k3x * dt;
    const y4 = y0 + k3y * dt;
    const vx4 = vx0 + k3vx * dt;
    const vy4 = vy0 + k3vy * dt;
    const a4 = acc(x4, y4);
    const k4x = vx4;
    const k4y = vy4;
    const k4vx = a4.ax;
    const k4vy = a4.ay;

    particle.x = x0 + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    particle.y = y0 + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    particle.vx = vx0 + (dt / 6) * (k1vx + 2 * k2vx + 2 * k3vx + k4vx);
    particle.vy = vy0 + (dt / 6) * (k1vy + 2 * k2vy + 2 * k3vy + k4vy);
  }

  private calculateRadius(mass: number): number {
    return 15 + mass * 5;
  }

  private calculateColor(mass: number): string {
    if (mass <= 1.0) {
      return '#888888';
    }

    const t = Math.min((mass - 1.0) / 2.0, 1.0);

    const r = Math.round(136 + t * (231 - 136));
    const g = Math.round(136 - t * (136 - 76));
    const b = Math.round(136 - t * (136 - 60));

    return `rgb(${r}, ${g}, ${b})`;
  }

  reset(): void {
    this.sources = [];
    this.particles = [];
    this.nextSourceId = 0;
    this.nextParticleId = 0;
  }
}
