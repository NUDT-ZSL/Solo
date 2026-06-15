export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

export class Player {
  public x: number;
  public y: number;
  public radius: number = 12;
  public targetY: number;

  public isJumping: boolean = false;
  public jumpProgress: number = 0;
  public jumpStartY: number = 0;
  public jumpEndY: number = 0;
  public jumpDuration: number = 0.3;

  public scale: number = 1.0;
  public particles: Particle[] = [];

  public readonly topTrackY: number = 200;
  public readonly bottomTrackY: number = 400;

  constructor(startX: number) {
    this.x = startX;
    this.y = this.bottomTrackY;
    this.targetY = this.bottomTrackY;
  }

  public reset(): void {
    this.y = this.bottomTrackY;
    this.targetY = this.bottomTrackY;
    this.isJumping = false;
    this.jumpProgress = 0;
    this.scale = 1.0;
    this.particles = [];
  }

  public jump(): void {
    if (this.isJumping) return;

    this.isJumping = true;
    this.jumpProgress = 0;
    this.jumpStartY = this.y;
    this.jumpEndY = this.y === this.bottomTrackY ? this.topTrackY : this.bottomTrackY;
    this.targetY = this.jumpEndY;
  }

  public spawnJumpTrail(color: string): void {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * 10,
        y: this.y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0.2,
        maxLife: 0.2,
        color: color,
        radius: 2 + Math.random() * 2
      });
    }
  }

  public update(dt: number): void {
    if (this.isJumping) {
      this.jumpProgress += dt;
      const t = Math.min(this.jumpProgress / this.jumpDuration, 1.0);
      const eased = 1 - Math.pow(1 - t, 3);

      this.y = this.jumpStartY + (this.jumpEndY - this.jumpStartY) * eased;

      if (t < 0.5) {
        this.scale = 1.0 + t * 0.4;
      } else {
        this.scale = 1.2 - (t - 0.5) * 0.4;
      }

      if (t >= 1.0) {
        this.isJumping = false;
        this.y = this.jumpEndY;
        this.scale = 1.0;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 200) {
      this.particles.splice(0, this.particles.length - 200);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
