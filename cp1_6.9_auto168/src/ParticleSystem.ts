export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'fire' | 'steam' | 'boundary';
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private baseParticlesPerFrame = 10;
  private reducedParticles = false;

  public update(now: number, burnAreas: { x: number; y: number; startTime: number; duration: number }[], cellSize: number): void {
    this.removeDeadParticles();
    this.spawnBurnParticles(burnAreas, cellSize, now);
    this.updateParticles();
  }

  private spawnBurnParticles(
    burnAreas: { x: number; y: number; startTime: number; duration: number }[],
    cellSize: number,
    now: number
  ): void {
    const maxPerFrame = this.reducedParticles ? this.baseParticlesPerFrame / 2 : this.baseParticlesPerFrame;
    let spawnedThisFrame = 0;

    for (const area of burnAreas) {
      if (spawnedThisFrame >= maxPerFrame) break;
      const age = now - area.startTime;
      const progress = age / area.duration;
      if (progress >= 1) continue;

      const intensity = 1 - progress * 0.7;
      const count = Math.ceil(intensity * 3);

      for (let i = 0; i < count && spawnedThisFrame < maxPerFrame; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * cellSize * 0.4;
        const baseX = area.x * cellSize + cellSize / 2;
        const baseY = area.y * cellSize + cellSize / 2;

        const colors = ['#ff8833', '#ffaa44', '#ffcc55', '#ff6622', '#ff4411'];

        this.particles.push({
          x: baseX + Math.cos(angle) * r,
          y: baseY + Math.sin(angle) * r,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 2 - 0.5,
          life: 300,
          maxLife: 300,
          size: 2 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          type: 'fire'
        });
        spawnedThisFrame++;
      }
    }
  }

  public spawnSteamParticles(x: number, y: number, cellSize: number): void {
    const count = this.reducedParticles ? 3 : 6;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * cellSize,
        y: y + (Math.random() - 0.5) * cellSize,
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 1.5 - 0.3,
        life: 500,
        maxLife: 500,
        size: 3 + Math.random() * 4,
        color: '#ddeeff',
        type: 'steam'
      });
    }
  }

  private updateParticles(): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 16.67;

      if (p.type === 'fire') {
        p.vy -= 0.05;
      } else if (p.type === 'steam') {
        p.size += 0.05;
      }
    }
  }

  private removeDeadParticles(): void {
    this.particles = this.particles.filter(p => p.life > 0);
  }

  public render(ctx: CanvasRenderingContext2D, _now: number): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'fire') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.5, p.color + '88');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'steam') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  public setReducedParticles(reduced: boolean): void {
    this.reducedParticles = reduced;
  }

  public clear(): void {
    this.particles = [];
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
