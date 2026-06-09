import type { GameEngine } from './GameEngine';
import type { IceFloe, Vortex, Probe, Particle, Player } from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private scale: number = 1;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.engine = engine;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  public resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min(width, height) / 720;
  }

  public render(): void {
    const { ctx, engine, scale } = this;
    const { config, state } = engine;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const s = scale * (config.boardRadius / 300);
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-config.boardCenter.x, -config.boardCenter.y);

    this.renderBackground(ctx, w, h);
    this.renderScoreZones(ctx);
    this.renderVortices(ctx, state.vortices);
    this.renderIceFloes(ctx, state.iceFloes);

    if (state.isReplaying && state.lastReplayFrames.length > 0) {
      this.renderReplayTrail(ctx);
    }

    this.renderParticles(ctx, state.particles);

    state.probes.forEach((probe) => {
      this.renderProbe(ctx, probe);
    });

    if (state.phase === ('SCORING' as unknown) && state.scoreAnimation) {
      this.renderScoreAnimation(ctx);
    }

    if (state.aimParams.isAiming && state.currentProbe) {
      this.renderAimLine(ctx);
    }

    if (state.phase === ('GAME_OVER' as unknown) && state.victoryAnimation) {
      this.renderVictoryPulse(ctx);
    }

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D, _w: number, _h: number): void {
    const { boardCenter, boardRadius } = this.engine.config;
    const grad = ctx.createRadialGradient(
      boardCenter.x,
      boardCenter.y,
      0,
      boardCenter.x,
      boardCenter.y,
      boardRadius
    );
    grad.addColorStop(0, '#1A1A2E');
    grad.addColorStop(0.65, '#0f1233');
    grad.addColorStop(1, '#0B0C2A');

    ctx.beginPath();
    ctx.arc(boardCenter.x, boardCenter.y, boardRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(100, 150, 220, 0.08)';
    ctx.lineWidth = 1.5;
    for (let r = 60; r < boardRadius; r += 60) {
      ctx.beginPath();
      ctx.arc(boardCenter.x, boardCenter.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let a = 0; a < 12; a++) {
      const ang = (a * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(boardCenter.x, boardCenter.y);
      ctx.lineTo(
        boardCenter.x + Math.cos(ang) * (boardRadius - 5),
        boardCenter.y + Math.sin(ang) * (boardRadius - 5)
      );
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(boardCenter.x, boardCenter.y, boardRadius - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120, 180, 255, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(120, 180, 255, 0.6)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();
  }

  private renderScoreZones(ctx: CanvasRenderingContext2D): void {
    const { boardCenter, scoreZones } = this.engine.config;
    for (let i = scoreZones.length - 1; i >= 0; i--) {
      const zone = scoreZones[i];
      ctx.beginPath();
      ctx.arc(boardCenter.x, boardCenter.y, zone.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(zone.color, zone.alpha);
      ctx.fill();
      ctx.strokeStyle = this.hexToRgba(zone.color, zone.alpha * 2.2);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  private renderVortices(ctx: CanvasRenderingContext2D, vortices: Vortex[]): void {
    vortices.forEach((v) => {
      ctx.save();
      ctx.translate(v.position.x, v.position.y);
      const r = v.radius;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
      glow.addColorStop(0, 'rgba(180, 130, 255, 0.55)');
      glow.addColorStop(0.35, 'rgba(160, 110, 230, 0.3)');
      glow.addColorStop(0.7, 'rgba(120, 70, 200, 0.1)');
      glow.addColorStop(1, 'rgba(90, 50, 180, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      for (let s = 0; s < 3; s++) {
        ctx.save();
        ctx.rotate(v.rotationAngle + s * ((Math.PI * 2) / 3));
        const rg = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
        rg.addColorStop(0, 'rgba(200, 160, 255, 0.5)');
        rg.addColorStop(1, 'rgba(150, 90, 230, 0)');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let t = 0; t <= 1; t += 0.05) {
          const ang = t * Math.PI * 1.5;
          const rr = t * r;
          ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        for (let t = 1; t >= 0; t -= 0.05) {
          const ang = t * Math.PI * 1.5 + 0.35;
          const rr = t * r;
          ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = rg;
        ctx.fill();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -v.rotationAngle * 30;
      ctx.strokeStyle = 'rgba(180, 140, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });
  }

  private renderIceFloes(ctx: CanvasRenderingContext2D, floes: IceFloe[]): void {
    const anim = this.engine.state.victoryAnimation;
    floes.forEach((f) => {
      ctx.save();
      ctx.translate(f.position.x, f.position.y);
      const grad = ctx.createLinearGradient(-f.size, -f.size, f.size, f.size);
      let c1 = f.colorStart;
      let c2 = f.colorEnd;
      if (anim) {
        const hue = (anim.hueShift + f.position.x * 0.1) % 360;
        c1 = `hsl(${hue}, 85%, 72%)`;
        c2 = `hsl(${(hue + 40) % 360}, 85%, 62%)`;
      }
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.beginPath();
      f.vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = anim ? 0.9 : 0.72;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (anim) {
        ctx.shadowColor = c1;
        ctx.shadowBlur = 18;
      } else {
        ctx.shadowColor = 'rgba(142, 228, 240, 0.55)';
        ctx.shadowBlur = 8;
      }
      ctx.strokeStyle = anim ? c1 : 'rgba(200, 245, 255, 0.8)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(f.vertices[0].x * 0.3, f.vertices[0].y * 0.3);
      ctx.lineTo(f.vertices[2].x * 0.4, f.vertices[2].y * 0.4);
      ctx.lineTo(f.vertices[4].x * 0.35, f.vertices[4].y * 0.35);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
      ctx.restore();
    });
  }

  private renderProbe(ctx: CanvasRenderingContext2D, probe: Probe): void {
    ctx.save();
    ctx.translate(probe.position.x, probe.position.y);
    const isP1 = probe.player === (1 as Player);
    const baseColor = isP1 ? '#8EE4FF' : '#D0A8FF';
    const glowColor = isP1 ? 'rgba(120, 220, 255, 0.7)' : 'rgba(200, 140, 255, 0.7)';
    const innerColor = isP1 ? '#E8FAFF' : '#F5E8FF';

    if (probe.inVortex) {
      for (let w = 0; w < 4; w++) {
        const ang = Date.now() / 1000 * 10 + w * (Math.PI / 2);
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let t = 0; t <= 1; t += 0.08) {
          const rr = probe.radius * (0.6 + t * 1.8);
          const aa = t * Math.PI * 0.8;
          ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr);
        }
        ctx.strokeStyle = `rgba(200, 150, 255, ${0.35 * (1 - 0)})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }
    }

    const glow = ctx.createRadialGradient(0, 0, probe.radius * 0.3, 0, 0, probe.radius * 2.2);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, probe.radius * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const r = probe.radius;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const bodyGrad = ctx.createRadialGradient(-probe.radius * 0.4, -probe.radius * 0.4, 1, 0, 0, probe.radius);
    bodyGrad.addColorStop(0, innerColor);
    bodyGrad.addColorStop(0.6, baseColor);
    bodyGrad.addColorStop(1, isP1 ? '#5CB8E8' : '#A878E0');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = innerColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(0, 0, probe.radius * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = innerColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-probe.radius * 0.1, -probe.radius * 0.1, probe.radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      if (p.type === 'collision') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, Math.max(0.1, p.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderReplayTrail(ctx: CanvasRenderingContext2D): void {
    const frames = this.engine.state.lastReplayFrames;
    const idx = this.engine.state.replayFrameIndex;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < Math.min(idx, frames.length); i += 2) {
      const f1 = frames[i - 1];
      const f2 = frames[i];
      const t = i / frames.length;
      const r = 200 + (200 - 200) * 0;
      const g = 220 + (245 - 220) * t;
      const b = 255;
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 * (i / idx)})`;
      ctx.lineWidth = 2.5 * (1 - t * 0.6);
      ctx.beginPath();
      ctx.moveTo(f1.probePosition.x, f1.probePosition.y);
      ctx.lineTo(f2.probePosition.x, f2.probePosition.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderAimLine(ctx: CanvasRenderingContext2D): void {
    const probe = this.engine.state.currentProbe;
    const aim = this.engine.state.aimParams;
    if (!probe || !aim.startPos) return;
    const maxLen = this.engine.config.maxAimLength;
    const len = aim.power * maxLen;
    const ang = aim.angle;
    const start = aim.startPos;
    const endX = start.x + Math.cos(ang) * len;
    const endY = start.y + Math.sin(ang) * len;

    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -Date.now() / 60;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    const grad = ctx.createLinearGradient(start.x, start.y, endX, endY);
    if (aim.power > 0.5) {
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.4, 'rgba(255,240,180,0.9)');
      grad.addColorStop(1, 'rgba(255,220,80,0.95)');
    } else {
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(200,230,255,0.8)');
    }
    ctx.strokeStyle = grad;
    ctx.shadowColor = aim.power > 0.5 ? 'rgba(255,220,100,0.6)' : 'rgba(180,220,255,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(endX, endY, 5, 0, Math.PI * 2);
    ctx.fillStyle = aim.power > 0.5 ? '#FFE880' : '#FFFFFF';
    ctx.shadowColor = aim.power > 0.5 ? 'rgba(255,220,100,0.8)' : 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 12;
    ctx.fill();

    const pct = Math.round(aim.power * 100);
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'center';
    ctx.fillText(`${pct}%`, start.x, start.y - 28);
    ctx.restore();
  }

  private renderScoreAnimation(ctx: CanvasRenderingContext2D): void {
    const anim = this.engine.state.scoreAnimation;
    if (!anim) return;
    const zones = this.engine.config.scoreZones;
    let zoneIdx = -1;
    for (let i = 0; i < zones.length; i++) {
      const probe = this.engine.state.currentProbe;
      if (probe) {
        const d = Math.hypot(probe.position.x - anim.position.x, probe.position.y - anim.position.y);
        if (d <= zones[i].radius) {
          zoneIdx = i;
          break;
        }
      }
    }
    const radius = zoneIdx >= 0 ? zones[zoneIdx].radius : 50;
    const pulse = 0.5 + Math.abs(Math.sin(anim.pulsePhase)) * 0.5;
    const color = zoneIdx >= 0 ? zones[zoneIdx].color : '#88CCFF';

    ctx.save();
    for (let i = 0; i < 3; i++) {
      const r = radius + i * 8 + pulse * 8;
      ctx.beginPath();
      ctx.arc(anim.position.x, anim.position.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = this.hexToRgba(color, 0.5 * pulse);
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14 * pulse;
      ctx.stroke();
    }
    ctx.restore();

    if (anim.score > 0) {
      ctx.save();
      const probe = this.engine.state.currentProbe;
      const px = probe ? probe.position.x : anim.position.x;
      const py = probe ? probe.position.y - 45 : anim.position.y - 45;
      const scale = 0.6 + Math.min(anim.elapsed / 0.3, 1) * 0.4;
      ctx.translate(px, py);
      ctx.scale(scale, scale);
      ctx.font = 'bold 38px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFE880';
      ctx.shadowColor = 'rgba(255,220,100,0.9)';
      ctx.shadowBlur = 16;
      ctx.fillText(`+${anim.displayedScore}`, 0, 0);
      ctx.restore();
    }
  }

  private renderVictoryPulse(ctx: CanvasRenderingContext2D): void {
    const anim = this.engine.state.victoryAnimation;
    if (!anim) return;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
