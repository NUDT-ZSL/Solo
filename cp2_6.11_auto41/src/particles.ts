export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'trail' | 'wave' | 'victory';
}

export interface EnergyOrb {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  color: string;
  active: boolean;
}

const MAX_PARTICLES = 200;
const TRAIL_LIFE = 0.8;
const TRAIL_COLOR_START = '#00BFFF';

export class ParticleSystem {
  particles: Particle[] = [];
  energyOrbs: EnergyOrb[] = [];
  waveRings: { x: number; y: number; radius: number; maxRadius: number; alpha: number; color: string }[] = [];

  private spawnParticle(p: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) {
      let oldestIdx = 0;
      let oldestLife = this.particles[0].life;
      for (let i = 1; i < this.particles.length; i++) {
        if (this.particles[i].life < oldestLife) {
          oldestLife = this.particles[i].life;
          oldestIdx = i;
        }
      }
      this.particles[oldestIdx] = p;
    } else {
      this.particles.push(p);
    }
  }

  emitTrail(x: number, y: number): void {
    const size = 3 + Math.random() * 3;
    this.spawnParticle({
      x,
      y,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      life: TRAIL_LIFE,
      maxLife: TRAIL_LIFE,
      size,
      color: TRAIL_COLOR_START,
      type: 'trail',
    });
  }

  emitWave(x: number, y: number, color: string): void {
    this.waveRings.push({
      x,
      y,
      radius: 5,
      maxRadius: 60,
      alpha: 0.8,
      color,
    });
  }

  emitVictory(cx: number, cy: number, canvasWidth: number, canvasHeight: number): void {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 200;
      this.spawnParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 50,
        life: 2.0 + Math.random() * 1.5,
        maxLife: 3.5,
        size: 2 + Math.random() * 3,
        color: '#FFD700',
        type: 'victory',
      });
    }
    for (let i = 0; i < 30; i++) {
      this.spawnParticle({
        x: Math.random() * canvasWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 30,
        vy: 100 + Math.random() * 150,
        life: 2.5 + Math.random() * 1.5,
        maxLife: 4.0,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#FFD700' : '#FF8C00',
        type: 'victory',
      });
    }
  }

  launchEnergy(fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    this.energyOrbs.push({
      x: fromX,
      y: fromY,
      startX: fromX,
      startY: fromY,
      targetX: toX,
      targetY: toY,
      progress: 0,
      duration: 0.4,
      color,
      active: true,
    });
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      if (p.type === 'victory') {
        p.vy += 80 * deltaTime;
      }
    }

    for (let i = this.waveRings.length - 1; i >= 0; i--) {
      const w = this.waveRings[i];
      w.radius += 120 * deltaTime;
      w.alpha -= 1.5 * deltaTime;
      if (w.alpha <= 0 || w.radius >= w.maxRadius) {
        this.waveRings.splice(i, 1);
      }
    }

    for (let i = this.energyOrbs.length - 1; i >= 0; i--) {
      const orb = this.energyOrbs[i];
      if (!orb.active) continue;
      orb.progress += deltaTime / orb.duration;
      if (orb.progress >= 1.0) {
        orb.active = false;
        this.energyOrbs.splice(i, 1);
        continue;
      }

      const t = orb.progress;
      const midX = (orb.startX + orb.targetX) / 2;
      const midY = (orb.startY + orb.targetY) / 2 - 40;
      const u = 1 - t;
      orb.x = u * u * orb.startX + 2 * u * t * midX + t * t * orb.targetX;
      orb.y = u * u * orb.startY + 2 * u * t * midY + t * t * orb.targetY;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = lifeRatio;
      if (p.type === 'trail') {
        const r = p.size * lifeRatio;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(r, 0.1));
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(0,191,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(r, 0.1), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'victory') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const w of this.waveRings) {
      ctx.save();
      ctx.globalAlpha = Math.max(w.alpha, 0);
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, Math.max(w.radius, 0.1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const orb of this.energyOrbs) {
      if (!orb.active) continue;
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(orb.x - 2, orb.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
