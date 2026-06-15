import type { Particle, EngineState } from './ParticleEngine';

export class ParticleRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(state: EngineState): void {
    this.drawBackground(state.aggregated);
    this.drawHaloLayer(state.particles);
    this.drawParticles(state.particles, state.aggregated);
  }

  private drawBackground(aggregated: number): void {
    const { ctx, width, height } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (aggregated > 0.6) {
      const glowStrength = (aggregated - 0.6) * 2.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.1,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      vignette.addColorStop(0, `rgba(255, 255, 255, ${0.03 * glowStrength})`);
      vignette.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  private drawHaloLayer(particles: Particle[]): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const haloAlpha = p.alpha * 0.15;
      const hr = p.haloRadius * 2.5;
      const r = Math.min(255, p.r + 25);
      const g = Math.min(255, p.g + 25);
      const b = Math.min(255, p.b + 25);

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hr);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${haloAlpha})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, hr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(particles: Particle[], aggregated: number): void {
    const { ctx } = this;
    const brightnessBoost = 1 + aggregated * 0.15;

    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const r = Math.min(255, Math.floor(p.r * brightnessBoost));
      const g = Math.min(255, Math.floor(p.g * brightnessBoost));
      const b = Math.min(255, Math.floor(p.b * brightnessBoost));
      const size = 1.4 + p.haloRadius * 0.1;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (aggregated > 0.7) {
      const edgeGlow = (aggregated - 0.7) * 3.33;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = edgeGlow * 0.12;
      ctx.filter = 'blur(8px)';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
