export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  colorStart: string;
  colorEnd: string;
  currentColor: string;
  alpha: number;
  boosted: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 200;
  private boostTime: number = 0;

  public update(dt: number, tailPositions: { x: number; y: number }[], windSpeed: number): void {
    if (this.boostTime > 0) {
      this.boostTime -= dt;
    }

    const emitCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < emitCount; i++) {
      for (const pos of tailPositions) {
        if (this.particles.length < this.maxParticles) {
          this.emitParticle(pos.x, pos.y, windSpeed);
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      const t = 1 - p.life / p.maxLife;
      p.currentColor = this.interpolateColor(p.colorStart, p.colorEnd, t);
      p.alpha = Math.max(0, 1 - t);

      let speedMult = 1;
      if (this.boostTime > 0 || p.boosted) {
        speedMult = 2.5;
        p.currentColor = '#FF4500';
      }

      p.x += p.vx * speedMult;
      p.y += p.vy * speedMult;

      p.vy += 0.02 * speedMult;
      p.vx += (Math.random() - 0.5) * 0.05;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private emitParticle(x: number, y: number, windSpeed: number): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.0;
    const windInfluence = windSpeed * 0.05;

    const particle: Particle = {
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed + windInfluence,
      vy: Math.sin(angle) * speed + 0.3,
      size: 3,
      life: 0.5 + Math.random() * 1.0,
      maxLife: 1.5,
      colorStart: '#FFD700',
      colorEnd: '#FF8C00',
      currentColor: '#FFD700',
      alpha: 1,
      boosted: this.boostTime > 0
    };

    this.particles.push(particle);
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 215, b: 0 };
  }

  public triggerBoost(): void {
    this.boostTime = 1.0;
    for (const p of this.particles) {
      p.boosted = true;
      const angle = Math.random() * Math.PI * 2;
      p.vx += Math.cos(angle) * 2;
      p.vy += Math.sin(angle) * 2;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      const t = 1 - p.life / p.maxLife;
      const trailAlpha = p.alpha * 0.3;
      const trailLength = 5;

      for (let i = 0; i < trailLength; i++) {
        const trailT = i / trailLength;
        const trailX = p.x - p.vx * i * 0.5;
        const trailY = p.y - p.vy * i * 0.5;
        const trailSize = p.size * (1 - trailT * 0.5);

        ctx.globalAlpha = trailAlpha * (1 - trailT);
        ctx.fillStyle = p.currentColor;
        ctx.beginPath();
        ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.currentColor;
      ctx.shadowColor = p.currentColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
