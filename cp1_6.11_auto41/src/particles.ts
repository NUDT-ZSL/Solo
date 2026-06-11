export interface BaseParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  dead: boolean;
}

export interface TrailParticle extends BaseParticle {
  type: 'trail';
}

export interface WaveParticle extends BaseParticle {
  type: 'wave';
  startRadius: number;
  maxRadius: number;
  currentRadius: number;
}

export interface StarPointParticle extends BaseParticle {
  type: 'starpoint';
  centerX: number;
  centerY: number;
  angle: number;
  angularSpeed: number;
  orbitRadius: number;
}

export interface VictoryParticle extends BaseParticle {
  type: 'victory';
  rotation: number;
  rotationSpeed: number;
}

export type Particle = TrailParticle | WaveParticle | StarPointParticle | VictoryParticle;

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 300;

  spawnTrail(x: number, y: number, dirX: number, dirY: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = 20 + Math.random() * 30;
      const nx = -dirY * spread + (Math.random() - 0.5) * 0.3;
      const ny = dirX * spread + (Math.random() - 0.5) * 0.3;
      const len = Math.hypot(nx, ny) || 1;

      this.particles.push({
        type: 'trail',
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (nx / len) * speed,
        vy: (ny / len) * speed,
        life: 800,
        maxLife: 800,
        size: 3 + Math.random() * 3,
        color: '#00BFFF',
        dead: false
      });
    }
  }

  spawnWave(x: number, y: number, color: string = '#8A2BE2'): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    this.particles.push({
      type: 'wave',
      x,
      y,
      vx: 0,
      vy: 0,
      life: 600,
      maxLife: 600,
      size: 0,
      color,
      startRadius: 10,
      maxRadius: 80,
      currentRadius: 10,
      dead: false
    });
  }

  spawnStarPoints(centerX: number, centerY: number): void {
    if (this.particles.length >= this.MAX_PARTICLES - 10) return;

    const count = 4 + Math.floor(Math.random() * 3);
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i / count) * Math.PI * 2;
      this.particles.push({
        type: 'starpoint',
        x: centerX + Math.cos(angle) * 10,
        y: centerY + Math.sin(angle) * 10,
        vx: 0,
        vy: 0,
        life: Infinity,
        maxLife: Infinity,
        size: 2 + Math.random() * 2,
        color: '#FFD700',
        centerX,
        centerY,
        angle,
        angularSpeed: (Math.PI * 2) / 1500,
        orbitRadius: 10,
        dead: false
      });
    }
  }

  spawnVictoryBurst(x: number, y: number): void {
    if (this.particles.length >= this.MAX_PARTICLES - 20) return;

    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        type: 'victory',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1500 + Math.random() * 1000,
        maxLife: 2500,
        size: 3 + Math.random() * 4,
        color: '#FFD700',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        dead: false
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.maxLife !== Infinity) {
        p.life -= dt;
        if (p.life <= 0) {
          p.dead = true;
          this.particles.splice(i, 1);
          continue;
        }
      }

      switch (p.type) {
        case 'trail':
          p.x += p.vx * dt / 1000;
          p.y += p.vy * dt / 1000;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;

        case 'wave':
          const t = 1 - p.life / p.maxLife;
          p.currentRadius = p.startRadius + (p.maxRadius - p.startRadius) * t;
          break;

        case 'starpoint':
          p.angle += p.angularSpeed * dt;
          p.x = p.centerX + Math.cos(p.angle) * p.orbitRadius;
          p.y = p.centerY + Math.sin(p.angle) * p.orbitRadius;
          break;

        case 'victory':
          p.x += p.vx * dt / 1000;
          p.y += p.vy * dt / 1000;
          p.vy += 80 * dt / 1000;
          p.rotation += p.rotationSpeed * dt / 1000;
          break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (p.dead) continue;

      switch (p.type) {
        case 'trail':
          this.renderTrail(ctx, p);
          break;
        case 'wave':
          this.renderWave(ctx, p);
          break;
        case 'starpoint':
          this.renderStarPoint(ctx, p);
          break;
        case 'victory':
          this.renderVictory(ctx, p);
          break;
      }
    }
  }

  private renderTrail(ctx: CanvasRenderingContext2D, p: TrailParticle): void {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, `${p.color}00`);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  private renderWave(ctx: CanvasRenderingContext2D, p: WaveParticle): void {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.currentRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderStarPoint(ctx: CanvasRenderingContext2D, p: StarPointParticle): void {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderVictory(ctx: CanvasRenderingContext2D, p: VictoryParticle): void {
    const alpha = Math.min(1, p.life / p.maxLife * 2);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 12;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;

    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const r = i % 2 === 0 ? p.size : p.size * 0.4;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  clearStarPoints(): void {
    this.particles = this.particles.filter(p => p.type !== 'starpoint');
  }

  getCount(): number {
    return this.particles.length;
  }
}
