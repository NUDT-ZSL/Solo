import type { Sprite, Note, Bat } from './entities';
import type { Platform } from './platform';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  particles: Particle[] = [];

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  clear(): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#0B0C10');
    grad.addColorStop(1, '#1F2833');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137) % this.canvas.width;
      const sy = (i * 97) % this.canvas.height;
      const r = (i % 3 === 0) ? 1.5 : 1;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawPlatform(platform: Platform): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(platform.x + 4, platform.y + 6, platform.width, platform.height, 6);
    this.ctx.fill();

    this.ctx.fillStyle = platform.color;
    this.roundRect(platform.x, platform.y, platform.width, platform.height, 6);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    this.roundRect(platform.x + 4, platform.y + 3, platform.width - 8, 4, 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.roundRect(platform.x + 4, platform.y + platform.height - 7, platform.width - 8, 4, 2);
    this.ctx.fill();
  }

  drawPlatforms(platforms: Platform[]): void {
    for (const p of platforms) {
      this.drawPlatform(p);
    }
  }

  drawSprite(sprite: Sprite): void {
    const { ox, oy } = sprite.getRenderOffset();
    const x = sprite.x + ox;
    const y = sprite.y + oy;
    const ctx = this.ctx;

    if (sprite.invincible && Math.floor(sprite.invincibleTime * 12) % 2 === 0) {
      return;
    }

    for (let i = sprite.trailLength - 1; i >= 0; i--) {
      const t = i / sprite.trailLength;
      const alpha = (1 - t) * 0.35;
      const cp = sprite.cloakTrail[i];
      ctx.fillStyle = `rgba(138, 43, 226, ${alpha})`;
      const cw = 10 * (1 - t * 0.5);
      this.roundRect(cp.x - cw / 2, cp.y - 4, cw, 12 + t * 4, 3);
      ctx.fill();
    }

    for (let i = sprite.trailLength - 1; i >= 2; i--) {
      const t = i / sprite.trailLength;
      const alpha = (1 - t) * 0.4;
      const rp = sprite.ribbonTrail[i];
      ctx.fillStyle = `rgba(255, 107, 107, ${alpha})`;
      ctx.fillRect(rp.x - 2, rp.y - 1, 4 * (1 - t * 0.3), 2);
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sprite.facing, 1);

    ctx.fillStyle = '#8A2BE2';
    this.roundRect(-8, -2, 16, 14, 4);
    ctx.fill();

    ctx.fillStyle = '#FFE0BD';
    this.roundRect(-7, -14, 14, 12, 4);
    ctx.fill();

    ctx.fillStyle = '#4B3621';
    this.roundRect(-7, -14, 14, 5, 3);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.fillRect(1, -9, 2, 2);
    ctx.fillRect(-3, -9, 2, 2);

    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(-8, -12, 16, 2);
    ctx.fillStyle = '#FF4757';
    ctx.fillRect(4, -12, 5, 2);

    ctx.fillStyle = '#5B2C91';
    this.roundRect(-8, 10, 6, 4, 1);
    ctx.fill();
    this.roundRect(2, 10, 6, 4, 1);
    ctx.fill();

    if (sprite.dashing) {
      ctx.fillStyle = 'rgba(138, 43, 226, 0.4)';
      this.roundRect(-14, -2, 6, 14, 3);
      ctx.fill();
      this.roundRect(-20, 0, 4, 10, 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawNote(note: Note): void {
    if (note.collected) return;
    const ctx = this.ctx;
    const color = note.getPulseColor();

    ctx.save();
    ctx.translate(note.x, note.y);
    ctx.rotate(note.rotation);

    const glowSize = 14 + Math.sin((note.pulseTime / note.pulseDuration) * Math.PI * 2) * 2;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, glowSize);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    glow.addColorStop(1, 'rgba(255, 165, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, note.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, note.radius - 2, -0.8, 0.8);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.fillRect(-1, -note.radius - 4, 2, 6);

    ctx.restore();
  }

  drawBat(bat: Bat): void {
    const ctx = this.ctx;
    if (bat.flashing) {
      ctx.save();
      ctx.globalAlpha = bat.flashTime / bat.flashDuration;
      ctx.fillStyle = '#fff';
      this.roundRect(bat.x - bat.width / 2, bat.y - bat.height / 2, bat.width, bat.height, 6);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(bat.x, bat.y);
    const wing = Math.sin(Date.now() * 0.02) * 4;

    ctx.fillStyle = 'rgba(60, 20, 80, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-12, wing, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, wing, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2D1B4E';
    ctx.beginPath();
    ctx.ellipse(0, 0, bat.width / 2, bat.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3D2B5E';
    ctx.beginPath();
    ctx.ellipse(-12, wing - 2, 9, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, wing - 2, 9, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF0044';
    ctx.fillRect(-5, -3, 3, 3);
    ctx.fillRect(2, -3, 3, 3);

    ctx.fillStyle = '#1D0B3E';
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(-5, -14);
    ctx.lineTo(-3, -8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(5, -14);
    ctx.lineTo(3, -8);
    ctx.fill();

    ctx.restore();
  }

  spawnCollectParticles(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color: Math.random() > 0.5 ? '#FFD700' : '#FFA500',
        size: 2 + Math.random() * 3,
      });
    }
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.3,
      maxLife: 0.3,
      color: '#FFFFFF',
      size: 20,
    });
  }

  updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
    }
  }

  drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      if (p.size > 10) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      }
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
