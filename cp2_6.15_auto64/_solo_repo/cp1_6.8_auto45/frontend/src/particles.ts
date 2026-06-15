import type { Particle } from './types';

const COLORS = [
  '#ff00ff', '#00ffff', '#ff6ec7', '#7b68ee',
  '#00ff88', '#ffaa00', '#ff4466', '#44aaff',
  '#ff88ff', '#88ffcc', '#ffdd44', '#66ff66',
];

export function createParticles(x: number, y: number, count: number = 40): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      life: 60 + Math.random() * 40,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vx: p.vx * 0.97,
      vy: p.vy * 0.97 + 0.08,
      alpha: p.alpha - 1 / p.life,
      life: p.life - 1,
      size: p.size * 0.98,
    }))
    .filter((p) => p.alpha > 0 && p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
