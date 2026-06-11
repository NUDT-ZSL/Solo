import { BubbleColor, BUBBLE_COLORS } from './bubble.js';

const MAX_PARTICLES = 150;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  type: 'explosion' | 'fall';
  rotation: number;
  rotationSpeed: number;
}

export class ParticleSystem {
  particles: Particle[];

  constructor() {
    this.particles = [];
  }

  createExplosion(x: number, y: number, color: BubbleColor): void {
    const count = 35 + Math.floor(Math.random() * 16);
    const particleColor = this.getParticleColor(color);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      const life = 0.5 + Math.random() * 0.6;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        radius: 2 + Math.random() * 4,
        color: particleColor,
        type: 'explosion',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3
      });
    }
  }

  createFallDust(x: number, y: number, color: BubbleColor): void {
    const count = 6 + Math.floor(Math.random() * 5);
    const particleColor = this.getParticleColor(color);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 0.5 + Math.random() * 2;
      const life = 0.4 + Math.random() * 0.3;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life,
        maxLife: life,
        radius: 1.5 + Math.random() * 2.5,
        color: particleColor,
        type: 'fall',
        rotation: 0,
        rotationSpeed: 0
      });
    }
  }

  private getParticleColor(color: BubbleColor): string {
    if (color === 'star') {
      const starColors = ['#e040fb', '#7c4dff', '#ffd740', '#ff5252', '#69f0ae'];
      return starColors[Math.floor(Math.random() * starColors.length)];
    }
    const c = BUBBLE_COLORS[color as Exclude<BubbleColor, 'star'>];
    const colors = [c.light, c.main, c.dark, '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'explosion') {
        p.vy += 8 * dt;
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
      } else {
        p.vy += 15 * dt;
        p.vx *= 0.96;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      const progress = 1 - alpha;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);

      if (p.type === 'explosion') {
        ctx.rotate(p.rotation);
        const currentRadius = p.radius * (1 + progress * 0.5);

        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * (1 - progress * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  clear(): void {
    this.particles.length = 0;
  }

  get count(): number {
    return this.particles.length;
  }
}
