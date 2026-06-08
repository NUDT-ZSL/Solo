export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface EmitOptions {
  minSpeed?: number;
  maxSpeed?: number;
  minSize?: number;
  maxSize?: number;
  life?: number;
  colors?: string[];
  uniformAngle?: boolean;
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private readonly MAX_PARTICLES = 200;

  constructor() {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        color: '#ffffff',
        alpha: 0,
        life: 0,
        maxLife: 0,
        active: false
      });
    }
  }

  private getParticle(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  private returnParticle(p: Particle): void {
    p.active = false;
  }

  emit(x: number, y: number, count: number, options: EmitOptions = {}): void {
    const {
      minSpeed = 100,
      maxSpeed = 200,
      minSize = 3,
      maxSize = 5,
      life = 0.6,
      colors = ['#ffffff'],
      uniformAngle = false
    } = options;

    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) break;

      let angle: number;
      if (uniformAngle) {
        angle = (i / count) * Math.PI * 2;
      } else {
        angle = Math.random() * Math.PI * 2;
      }

      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = minSize + Math.random() * (maxSize - minSize);
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
      p.life = life;
      p.maxLife = life;
      p.active = true;

      this.activeParticles.push(p);
    }
  }

  burst(x: number, y: number, count: number, colors: string[]): void {
    this.emit(x, y, count, {
      minSpeed: 200,
      maxSpeed: 400,
      minSize: 4,
      maxSize: 10,
      life: 1.5,
      colors,
      uniformAngle: true
    });
  }

  update(dt: number): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.returnParticle(p);
        this.activeParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.activeParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear(): void {
    for (const p of this.activeParticles) {
      this.returnParticle(p);
    }
    this.activeParticles.length = 0;
  }
}
