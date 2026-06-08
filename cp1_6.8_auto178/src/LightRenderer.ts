import {
  Mirror, Core, LightSegment, Particle, LightWave,
  LightSource, Vec2, LightColor,
  COLOR_MAP, COLOR_GLOW, GAME_WIDTH, GAME_HEIGHT,
} from './types';

export class LightRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private bgParticles: Particle[] = [];
  private gridOpacity: number = 0.03;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initBgParticles();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const scaleX = width / GAME_WIDTH;
    const scaleY = height / GAME_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (width - GAME_WIDTH * this.scale) / 2;
    this.offsetY = (height - GAME_HEIGHT * this.scale) / 2;
  }

  screenToGame(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  render(
    mirrors: Mirror[],
    cores: Core[],
    lightSource: LightSource,
    lightSegments: LightSegment[],
    particles: Particle[],
    lightWaves: LightWave[],
    time: number,
  ): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.drawBackground(ctx, time);
    this.drawBgParticles(ctx, time);
    this.drawLightSource(ctx, lightSource, time);
    this.drawLightSegments(ctx, lightSegments, time);
    this.drawMirrors(ctx, mirrors, time);
    this.drawCores(ctx, cores, time);
    this.drawLightWaves(ctx, lightWaves);
    this.drawParticles(ctx, particles);
    this.drawVignette(ctx);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.strokeStyle = `rgba(30, 60, 80, ${this.gridOpacity})`;
    ctx.lineWidth = 0.5;
    const gridSize = 60;
    const offsetX = (time * 3) % gridSize;
    const offsetY = (time * 2) % gridSize;
    for (let x = -gridSize + offsetX; x < GAME_WIDTH + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_HEIGHT);
      ctx.stroke();
    }
    for (let y = -gridSize + offsetY; y < GAME_HEIGHT + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_WIDTH, y);
      ctx.stroke();
    }
  }

  private initBgParticles(): void {
    this.bgParticles = [];
    for (let i = 0; i < 80; i++) {
      this.bgParticles.push({
        position: {
          x: Math.random() * GAME_WIDTH,
          y: Math.random() * GAME_HEIGHT,
        },
        velocity: {
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8,
        },
        alpha: Math.random() * 0.3 + 0.1,
        size: Math.random() * 2 + 0.5,
        color: `rgba(100, 180, 255, `,
        life: Infinity,
        maxLife: Infinity,
        isConverging: false,
      });
    }
  }

  private drawBgParticles(ctx: CanvasRenderingContext2D, time: number): void {
    for (const p of this.bgParticles) {
      p.position.x += p.velocity.x * 0.016;
      p.position.y += p.velocity.y * 0.016;
      if (p.position.x < 0) p.position.x = GAME_WIDTH;
      if (p.position.x > GAME_WIDTH) p.position.x = 0;
      if (p.position.y < 0) p.position.y = GAME_HEIGHT;
      if (p.position.y > GAME_HEIGHT) p.position.y = 0;
      const flicker = 0.7 + 0.3 * Math.sin(time * 2 + p.position.x * 0.01);
      ctx.fillStyle = p.color + (p.alpha * flicker).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawLightSource(ctx: CanvasRenderingContext2D, source: LightSource, time: number): void {
    const pulse = 0.8 + 0.2 * Math.sin(time * 3);
    const color = COLOR_MAP[source.color];
    const glow = COLOR_GLOW[source.color];

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 25 * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(source.position.x, source.position.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const dirX = Math.cos(source.direction);
    const dirY = Math.sin(source.direction);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(source.position.x, source.position.y);
    ctx.lineTo(source.position.x + dirX * 18, source.position.y + dirY * 18);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(source.position.x, source.position.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawLightSegments(ctx: CanvasRenderingContext2D, segments: LightSegment[], time: number): void {
    for (const seg of segments) {
      const color = COLOR_MAP[seg.color];
      const glow = COLOR_GLOW[seg.color];

      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 6 * seg.intensity;
      ctx.globalAlpha = 0.25 * seg.intensity;
      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();

      ctx.shadowBlur = 12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * seg.intensity;
      ctx.globalAlpha = 0.6 * seg.intensity;
      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2 * seg.intensity;
      ctx.globalAlpha = 0.8 * seg.intensity;
      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawMirrors(ctx: CanvasRenderingContext2D, mirrors: Mirror[], time: number): void {
    for (const mirror of mirrors) {
      const verts = mirror.vertices;
      if (verts.length < 3) continue;

      const baseColor = mirror.colorFilter ? COLOR_MAP[mirror.colorFilter] : 'rgba(100, 220, 255, 1)';
      const glowColor = mirror.colorFilter ? COLOR_GLOW[mirror.colorFilter] : 'rgba(50, 150, 255, 1)';

      ctx.save();

      if (mirror.isAutoRotating) {
        ctx.shadowColor = 'rgba(255, 200, 50, 0.6)';
        ctx.shadowBlur = 12 + 4 * Math.sin(time * 4);
      } else if (mirror.glowIntensity > 0.01) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15 + mirror.glowIntensity * 15;
      }

      ctx.fillStyle = mirror.colorFilter
        ? this.colorToAlpha(baseColor, 0.2 + mirror.glowIntensity * 0.15)
        : `rgba(100, 220, 255, ${0.15 + mirror.glowIntensity * 0.15})`;
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(verts[i].x, verts[i].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      const edgeAlpha = 0.6 + mirror.glowIntensity * 0.4;
      ctx.strokeStyle = mirror.colorFilter
        ? this.colorToAlpha(baseColor, edgeAlpha)
        : `rgba(100, 220, 255, ${edgeAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (mirror.isAutoRotating) {
        const cx = mirror.center.x;
        const cy = mirror.center.y;
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, mirror.length / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const arrowAngle = time * mirror.autoRotateSpeed * 2;
        const ar = mirror.length / 2 + 10;
        ctx.fillStyle = 'rgba(255, 200, 50, 0.6)';
        ctx.beginPath();
        ctx.moveTo(
          cx + Math.cos(arrowAngle) * ar,
          cy + Math.sin(arrowAngle) * ar
        );
        ctx.lineTo(
          cx + Math.cos(arrowAngle + 0.3) * (ar - 6),
          cy + Math.sin(arrowAngle + 0.3) * (ar - 6)
        );
        ctx.lineTo(
          cx + Math.cos(arrowAngle - 0.3) * (ar - 6),
          cy + Math.sin(arrowAngle - 0.3) * (ar - 6)
        );
        ctx.closePath();
        ctx.fill();
      }

      if (mirror.colorFilter) {
        const cx = mirror.center.x;
        const cy = mirror.center.y;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(time * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  private drawCores(ctx: CanvasRenderingContext2D, cores: Core[], time: number): void {
    for (const core of cores) {
      const color = COLOR_MAP[core.requiredColor];
      const glow = COLOR_GLOW[core.requiredColor];

      ctx.save();

      if (core.isActivated) {
        const elapsed = time - core.activationTime;
        const pulse = 0.8 + 0.2 * Math.sin(elapsed * 5);

        ctx.shadowColor = glow;
        ctx.shadowBlur = 30 * pulse;
        const grad = ctx.createRadialGradient(
          core.position.x, core.position.y, 0,
          core.position.x, core.position.y, core.radius * 2
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.3, color);
        grad.addColorStop(0.7, this.colorToAlpha(color, 0.3));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(core.position.x, core.position.y, core.radius * 2 * pulse, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(time * 2 + core.pulsePhase);

        ctx.shadowColor = glow;
        ctx.shadowBlur = 10 + pulse * 8;

        ctx.strokeStyle = this.colorToAlpha(color, 0.4 + pulse * 0.2);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(core.position.x, core.position.y, core.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = this.colorToAlpha(color, 0.08 + pulse * 0.05);
        ctx.fill();

        const innerR = core.radius * 0.3;
        ctx.fillStyle = this.colorToAlpha(color, 0.3 + pulse * 0.2);
        ctx.beginPath();
        ctx.arc(core.position.x, core.position.y, innerR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawLightWaves(ctx: CanvasRenderingContext2D, waves: LightWave[]): void {
    for (const wave of waves) {
      ctx.save();
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = wave.alpha;
      ctx.beginPath();
      ctx.arc(wave.center.x, wave.center.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawVignette(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.35,
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.9
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private colorToAlpha(color: string, alpha: number): string {
    if (color.startsWith('rgba')) return color;
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    }
    return color;
  }
}
