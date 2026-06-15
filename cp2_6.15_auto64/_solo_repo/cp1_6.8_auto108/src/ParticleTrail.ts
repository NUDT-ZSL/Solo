import type { Beacon } from './BeaconEngine';

interface TrailParticle {
  x: number;
  y: number;
  progress: number;
  segmentIndex: number;
  speed: number;
  size: number;
  opacity: number;
}

export class ParticleTrail {
  private particles: TrailParticle[] = [];
  private particlesPerSegment = 4;

  render(ctx: CanvasRenderingContext2D, beacons: Beacon[], time: number) {
    if (beacons.length < 2) return;

    this.ensureParticleCount(beacons.length - 1);
    this.updateParticles(beacons, time);
    this.drawParticles(ctx, beacons);
  }

  private ensureParticleCount(segments: number) {
    const needed = segments * this.particlesPerSegment;
    while (this.particles.length < needed) {
      const segIdx = Math.floor(this.particles.length / this.particlesPerSegment);
      this.particles.push({
        x: 0,
        y: 0,
        progress: Math.random(),
        segmentIndex: segIdx,
        speed: 0.002 + Math.random() * 0.003,
        size: 1.5 + Math.random() * 1.5,
        opacity: 0.5 + Math.random() * 0.5,
      });
    }

    while (this.particles.length > needed) {
      this.particles.pop();
    }

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].segmentIndex = Math.floor(i / this.particlesPerSegment);
    }
  }

  private updateParticles(beacons: Beacon[], _time: number) {
    for (const p of this.particles) {
      if (p.segmentIndex >= beacons.length - 1) continue;

      p.progress += p.speed;
      if (p.progress > 1) {
        p.progress -= 1;
        p.segmentIndex++;
        if (p.segmentIndex >= beacons.length - 1) {
          p.segmentIndex = 0;
          p.progress = 0;
        }
      }

      const a = beacons[p.segmentIndex];
      const b = beacons[p.segmentIndex + 1];
      if (!a || !b) continue;

      const t = p.progress;
      const cp = this.getControlPoint(a, b, p.segmentIndex);
      const mt = 1 - t;
      p.x = mt * mt * a.x + 2 * mt * t * cp.x + t * t * b.x;
      p.y = mt * mt * a.y + 2 * mt * t * cp.y + t * t * b.y;
    }
  }

  private getControlPoint(a: Beacon, b: Beacon, index: number): { x: number; y: number } {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x: mx, y: my };
    const offset = Math.min(dist * 0.15, 40) * (index % 2 === 0 ? 1 : -1);
    return { x: mx - dy / dist * offset, y: my + dx / dist * offset };
  }

  private drawParticles(ctx: CanvasRenderingContext2D, _beacons: Beacon[]) {
    for (const p of this.particles) {
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      glow.addColorStop(0, `rgba(180, 170, 255, ${p.opacity * 0.6})`);
      glow.addColorStop(0.5, `rgba(140, 120, 255, ${p.opacity * 0.2})`);
      glow.addColorStop(1, 'rgba(100, 80, 255, 0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 220, 255, ${p.opacity * 0.9})`;
      ctx.fill();
    }
  }
}
