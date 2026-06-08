interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  public targetCount: number = 1500;
  public baseSpeed: number = 80;
  public baseSize: number = 4;

  private readonly COLORS: string[] = ['#C8A882', '#D4A76A', '#B8956A'];
  private readonly WINDUP_DURATION: number = 3000;
  private windupStart: number | null = null;
  private isWindingUp: boolean = false;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public triggerWindup(): void {
    this.isWindingUp = true;
    this.windupStart = performance.now();
    this.targetCount = 2000;
  }

  public setTargetCount(count: number): void {
    this.targetCount = count;
    if (!this.isWindingUp && this.particles.length < count) {
      this.fillToTarget(count);
    } else if (this.particles.length > count) {
      this.particles.length = count;
    }
  }

  public setBaseSpeed(speed: number): void {
    this.baseSpeed = speed;
  }

  public setBaseSize(size: number): void {
    this.baseSize = size;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  private createParticle(fromLeft: boolean = true): Particle {
    const angleDeg = (Math.random() * 30) - 15;
    const angleRad = (angleDeg * Math.PI) / 180;
    const speedMultiplier = 0.6 + Math.random() * 0.8;
    const speed = this.baseSpeed * speedMultiplier;

    const sizeVariance = 0.5 + Math.random() * 1.5;
    const size = Math.max(1, this.baseSize * sizeVariance);

    return {
      x: fromLeft ? -size * 2 : Math.random() * this.canvasWidth,
      y: Math.random() * this.canvasHeight,
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      size,
      color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
      alpha: 0.3 + Math.random() * 0.5
    };
  }

  private fillToTarget(target: number): void {
    while (this.particles.length < target) {
      this.particles.push(this.createParticle(false));
    }
  }

  public update(deltaTime: number): void {
    if (this.isWindingUp && this.windupStart !== null) {
      const elapsed = performance.now() - this.windupStart;
      const progress = Math.min(elapsed / this.WINDUP_DURATION, 1);
      const currentTarget = Math.floor(progress * this.targetCount);

      while (this.particles.length < currentTarget) {
        this.particles.push(this.createParticle(true));
      }

      if (progress >= 1) {
        this.isWindingUp = false;
        this.windupStart = null;
      }
    } else if (this.particles.length < this.targetCount) {
      this.fillToTarget(this.targetCount);
    } else if (this.particles.length > this.targetCount) {
      this.particles.length = this.targetCount;
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      if (p.x > this.canvasWidth + p.size) {
        p.x = -p.size * 2;
        p.y = Math.random() * this.canvasHeight;
      }

      if (p.y < -p.size) {
        p.y = this.canvasHeight + p.size;
      } else if (p.y > this.canvasHeight + p.size) {
        p.y = -p.size;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
