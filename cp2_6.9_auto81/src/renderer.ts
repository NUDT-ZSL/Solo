import { PhysicsEngine, Particle, Fragment, RGB } from './physics';

function rgbString(c: RGB, alpha = 1): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get width(): number {
    return window.innerWidth;
  }

  get height(): number {
    return window.innerHeight;
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const gradient = ctx.createRadialGradient(
      w / 2, h / 2, 0,
      w / 2, h / 2, Math.max(w, h) * 0.7
    );
    gradient.addColorStop(0, '#1a1a4e');
    gradient.addColorStop(1, '#0a0a2e');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private drawTrail(particle: Particle): void {
    const ctx = this.ctx;
    const trail = particle.trail;

    if (trail.length < 2) return;

    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const curr = trail[i];
      const alpha = curr.alpha * 0.05;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = rgbString(particle.color, alpha);
      ctx.lineWidth = particle.radius * 0.6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  private drawGlow(particle: Particle): void {
    const ctx = this.ctx;
    const glowRadius = particle.radius + 8;

    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, glowRadius
    );
    gradient.addColorStop(0, rgbString(particle.color, 0.15));
    gradient.addColorStop(1, rgbString(particle.color, 0));

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private drawParticle(particle: Particle): void {
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = rgbString(particle.color, 1);
    ctx.fill();
  }

  private drawFragment(fragment: Fragment): void {
    const ctx = this.ctx;
    const lifeRatio = fragment.life / fragment.maxLife;
    const alpha = lifeRatio;

    let flashAlpha = 0;
    if (fragment.life > fragment.maxLife - 18) {
      flashAlpha = (fragment.life - (fragment.maxLife - 18)) / 18 * 0.5;
    }

    ctx.beginPath();
    ctx.arc(fragment.x, fragment.y, fragment.radius, 0, Math.PI * 2);

    if (flashAlpha > 0) {
      const r = Math.round(fragment.color.r + (255 - fragment.color.r) * flashAlpha);
      const g = Math.round(fragment.color.g + (255 - fragment.color.g) * flashAlpha);
      const b = Math.round(fragment.color.b + (255 - fragment.color.b) * flashAlpha);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    } else {
      ctx.fillStyle = rgbString(fragment.color, alpha);
    }

    ctx.fill();
  }

  private drawStats(engine: PhysicsEngine): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const stats = [
      `粒子: ${engine.totalParticles}`,
      `星云: ${engine.nebulaCount}`,
      `融合: ${engine.fusionCount}`
    ];

    const paddingX = 14;
    const paddingY = 10;
    const lineHeight = 20;
    const fontSize = 14;

    ctx.font = `${fontSize}px monospace`;
    let maxWidth = 0;
    for (const s of stats) {
      const textWidth = ctx.measureText(s).width;
      if (textWidth > maxWidth) maxWidth = textWidth;
    }

    const boxWidth = maxWidth + paddingX * 2;
    const boxHeight = stats.length * lineHeight + paddingY * 2 - 4;
    const boxX = w - boxWidth - 16;
    const boxY = h - boxHeight - 16;

    ctx.beginPath();
    const radius = 8;
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxWidth - radius, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
    ctx.lineTo(boxX + radius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textBaseline = 'top';
    for (let i = 0; i < stats.length; i++) {
      ctx.fillText(stats[i], boxX + paddingX, boxY + paddingY + i * lineHeight);
    }
  }

  private drawFlash(alpha: number): void {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  render(engine: PhysicsEngine): void {
    const ctx = this.ctx;

    this.drawBackground();

    ctx.globalCompositeOperation = 'lighter';

    for (const nebula of engine.nebulas) {
      for (const p of nebula.particles) {
        this.drawTrail(p);
      }
    }

    for (const nebula of engine.nebulas) {
      for (const p of nebula.particles) {
        this.drawGlow(p);
      }
    }

    ctx.globalCompositeOperation = 'source-over';

    for (const nebula of engine.nebulas) {
      for (const p of nebula.particles) {
        this.drawParticle(p);
      }
    }

    for (const f of engine.fragments) {
      this.drawFragment(f);
    }

    this.drawFlash(engine.flashAlpha);
    this.drawStats(engine);
  }
}
