import type { GameEngine } from './gameEngine.js';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private bgGradient: CanvasGradient | null = null;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.engine = engine;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  reset(): void {
    this.bgGradient = null;
  }

  triggerScoreExplosion(): void {
    this.engine.triggerScoreExplosion();
  }

  private getScale(): { sx: number; sy: number } {
    const cfg = this.engine.getConfig();
    const dpr = window.devicePixelRatio || 1;
    const displayW = this.canvas.clientWidth || cfg.width;
    const displayH = this.canvas.clientHeight || cfg.height;
    return {
      sx: (this.canvas.width / dpr) / cfg.width,
      sy: (this.canvas.height / dpr) / cfg.height
    };
  }

  private prepareBackground(): void {
    if (this.bgGradient) return;
    const cfg = this.engine.getConfig();
    const { sx, sy } = this.getScale();
    this.bgGradient = this.ctx.createRadialGradient(
      cfg.width * sx / 2,
      cfg.height * sy / 2,
      0,
      cfg.width * sx / 2,
      cfg.height * sy / 2,
      Math.max(cfg.width, cfg.height) * Math.max(sx, sy) / 2
    );
    this.bgGradient.addColorStop(0, '#1A0A2E');
    this.bgGradient.addColorStop(1, '#0D0515');
  }

  render(_dt: number): void {
    const ctx = this.ctx;
    const cfg = this.engine.getConfig();
    const dpr = window.devicePixelRatio || 1;
    const { sx, sy } = this.getScale();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cssW = this.canvas.width / dpr;
    const cssH = this.canvas.height / dpr;
    ctx.clearRect(0, 0, cssW, cssH);

    ctx.scale(sx, sy);

    this.prepareBackground();
    if (this.bgGradient) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = this.bgGradient;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
      ctx.scale(sx, sy);
    }

    this.drawHexGrid(ctx);
    this.drawShards(ctx);
    this.drawMinions(ctx);
    this.drawRift(ctx);
    this.drawDevourRings(ctx);
    this.drawCore(ctx);
    this.drawRipples(ctx);
    this.drawHexParticles(ctx);
    this.drawScoreParticles(ctx);

    if (this.engine.isLowEnergy()) {
      this.drawWarningGlow(ctx);
    }

    ctx.restore();
  }

  private drawHexGrid(ctx: CanvasRenderingContext2D): void {
    const hexes = this.engine.getHexGrid();
    for (const hex of hexes) {
      ctx.beginPath();
      for (let i = 0; i < hex.vertices.length; i++) {
        const v = hex.vertices[i];
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      if (hex.split) {
        ctx.fillStyle = 'rgba(138, 43, 226, 0.08)';
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawCore(ctx: CanvasRenderingContext2D): void {
    const core = this.engine.getCorePosition();
    const cfg = this.engine.getConfig();
    const pulseTime = this.engine.getCorePulseTime();
    const brightness = this.engine.getCoreBrightness();
    const pulsePeriod = this.engine.isLowEnergy() ? 1000 : 2000;
    const t = (pulseTime % pulsePeriod) / pulsePeriod;
    const pulseFactor = 0.85 + 0.3 * Math.sin(t * Math.PI * 2);
    const radius = cfg.coreRadius * pulseFactor;

    const glow = ctx.createRadialGradient(core.x, core.y, radius * 0.3, core.x, core.y, radius * 3);
    glow.addColorStop(0, `rgba(138, 43, 226, ${0.6 * brightness})`);
    glow.addColorStop(0.5, `rgba(75, 0, 130, ${0.3 * brightness})`);
    glow.addColorStop(1, 'rgba(75, 0, 130, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(core.x, core.y, radius * 3, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, radius);
    grad.addColorStop(0, `rgba(138, 43, 226, ${brightness})`);
    grad.addColorStop(1, `rgba(75, 0, 130, ${brightness})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(core.x, core.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 0, 255, ${0.6 * brightness})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawWarningGlow(ctx: CanvasRenderingContext2D): void {
    const cfg = this.engine.getConfig();
    const t = (this.engine.getCorePulseTime() % 1000) / 1000;
    const alpha = 0.08 + 0.08 * Math.sin(t * Math.PI * 2);
    const grad = ctx.createRadialGradient(cfg.width / 2, cfg.height / 2, 0, cfg.width / 2, cfg.height / 2, Math.max(cfg.width, cfg.height) / 2);
    grad.addColorStop(0, `rgba(255, 30, 30, 0)`);
    grad.addColorStop(1, `rgba(255, 30, 30, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cfg.width, cfg.height);
  }

  private drawRift(ctx: CanvasRenderingContext2D): void {
    if (!this.engine.isRiftActive()) return;
    const points = this.engine.getRiftPoints();
    if (points.length < 2) {
      if (points.length === 1) {
        ctx.fillStyle = '#8A2BE2';
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const speedFactor = Math.min(1, p1.speed / 800);
      const r1 = Math.floor(106 + (255 - 106) * speedFactor);
      const g1 = Math.floor(13 + (0 - 13) * speedFactor);
      const b1 = Math.floor(173 + (255 - 173) * speedFactor);
      const color = `rgb(${r1}, ${g1}, ${b1})`;

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const w = (p0.width + p1.width) / 2;

      ctx.beginPath();
      ctx.moveTo(p0.x + nx * w / 2, p0.y + ny * w / 2);
      ctx.lineTo(p1.x + nx * w / 2, p1.y + ny * w / 2);
      ctx.lineTo(p1.x - nx * w / 2, p1.y - ny * w / 2);
      ctx.lineTo(p0.x - nx * w / 2, p0.y - ny * w / 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawMinions(ctx: CanvasRenderingContext2D): void {
    const minions = this.engine.getMinions();
    for (const m of minions) {
      if (!m.alive) continue;
      const glow = ctx.createRadialGradient(m.x, m.y, m.radius * 0.3, m.x, m.y, m.radius * 2.5);
      glow.addColorStop(0, 'rgba(75, 0, 130, 0.7)');
      glow.addColorStop(1, 'rgba(75, 0, 130, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4B0082';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(221, 160, 221, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  private drawShards(ctx: CanvasRenderingContext2D): void {
    const shards = this.engine.getShards();
    const t = performance.now() / 1000;
    for (const s of shards) {
      const alpha = Math.min(1, s.life / 500);
      const floatY = Math.sin(t * 2 + s.floatOffset) * 3;
      const glow = ctx.createRadialGradient(s.x, s.y + floatY, 0, s.x, s.y + floatY, s.radius * 3);
      glow.addColorStop(0, `rgba(255, 215, 0, ${0.6 * alpha})`);
      glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y + floatY, s.radius * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y + floatY, s.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 200, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawRipples(ctx: CanvasRenderingContext2D): void {
    for (const r of this.engine.getRipples()) {
      const alpha = (r.life / r.maxLife) * 0.8;
      ctx.strokeStyle = `rgba(138, 43, 226, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawDevourRings(ctx: CanvasRenderingContext2D): void {
    for (const d of this.engine.getDevourRings()) {
      const alpha = d.life / d.maxLife;
      ctx.strokeStyle = `rgba(255, 0, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawHexParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.engine.getHexParticles()) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(221, 160, 221, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawScoreParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.engine.getScoreParticles()) {
      const alpha = Math.max(0, p.life / p.maxLife);
      let color: string;
      if (p.color === '#FFD700') {
        color = `rgba(255, 215, 0, ${alpha})`;
      } else {
        color = `rgba(255, 0, 255, ${alpha})`;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
