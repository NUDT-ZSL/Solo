import { LightSegment, HitGlow, SplitParticle } from './lightEngine';
import { ComponentState } from './componentManager';

const GRID_SIZE = 40;
const BG_COLOR = '#0a0e27';

export interface TransitionState {
  active: boolean;
  startTime: number;
  duration: number;
  isFadeOut: boolean;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  clear(): void {
    const ctx = this.ctx;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();
  }

  drawLightSource(state: ComponentState, nowTime: number): void {
    const ctx = this.ctx;
    const ls = state.lightSource;
    const pulse = 15 + Math.sin(nowTime / 800 * Math.PI * 2) * 5;

    const grad = ctx.createRadialGradient(ls.x, ls.y, 2, ls.x, ls.y, pulse + 20);
    grad.addColorStop(0, 'rgba(255, 230, 80, 0.9)');
    grad.addColorStop(0.4, 'rgba(255, 200, 60, 0.4)');
    grad.addColorStop(1, 'rgba(255, 180, 40, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ls.x, ls.y, pulse + 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffdd33';
    ctx.beginPath();
    ctx.arc(ls.x, ls.y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ls.x, ls.y, 5, 0, Math.PI * 2);
    ctx.fill();

    const rad = (ls.angle * Math.PI) / 180;
    ctx.strokeStyle = 'rgba(255, 230, 80, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ls.x + Math.cos(rad) * 12, ls.y + Math.sin(rad) * 12);
    ctx.lineTo(ls.x + Math.cos(rad) * 24, ls.y + Math.sin(rad) * 24);
    ctx.stroke();
  }

  drawReceiver(state: ComponentState, nowTime: number, isHit: boolean): void {
    const ctx = this.ctx;
    const r = state.receiver;

    if (isHit) {
      const pulse = 0.5 + Math.sin(nowTime / 1000 * Math.PI * 2) * 0.5;
      const grad = ctx.createRadialGradient(r.x, r.y, 20, r.x, r.y, 55);
      grad.addColorStop(0, `rgba(80, 160, 255, ${0.4 + pulse * 0.4})`);
      grad.addColorStop(1, 'rgba(80, 160, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 55, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(120, 200, 255, ${0.6 + pulse * 0.4})`;
      ctx.lineWidth = 3 + pulse * 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 30 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#22dd66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 20, 0, Math.PI * 2);
    ctx.stroke();

    const innerGrad = ctx.createRadialGradient(r.x, r.y, 2, r.x, r.y, 20);
    innerGrad.addColorStop(0, 'rgba(68, 255, 136, 0.5)');
    innerGrad.addColorStop(1, 'rgba(68, 255, 136, 0.1)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMirrors(state: ComponentState, hoverId: string | null): void {
    const ctx = this.ctx;
    for (const m of state.mirrors) {
      const half = m.length / 2;
      const rad = (m.angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const ax = m.x - cos * half;
      const ay = m.y - sin * half;
      const bx = m.x + cos * half;
      const by = m.y + sin * half;

      const nx = -sin;
      const ny = cos;
      const thickness = 6;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ax + nx * thickness, ay + ny * thickness);
      ctx.lineTo(bx + nx * thickness, by + ny * thickness);
      ctx.lineTo(bx - nx * thickness, by - ny * thickness);
      ctx.lineTo(ax - nx * thickness, ay - ny * thickness);
      ctx.closePath();

      const grad = ctx.createLinearGradient(
        ax - nx * thickness, ay - ny * thickness,
        ax + nx * thickness, ay + ny * thickness
      );
      grad.addColorStop(0, '#808080');
      grad.addColorStop(0.3, '#e8e8e8');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(0.7, '#d0d0d0');
      grad.addColorStop(1, '#606060');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (hoverId === m.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax + nx * (thickness + 2), ay + ny * (thickness + 2));
        ctx.lineTo(bx + nx * (thickness + 2), by + ny * (thickness + 2));
        ctx.lineTo(bx - nx * (thickness + 2), by - ny * (thickness + 2));
        ctx.lineTo(ax - nx * (thickness + 2), ay - ny * (thickness + 2));
        ctx.closePath();
        ctx.stroke();
      }

      if (m.draggable) {
        ctx.fillStyle = hoverId === m.id ? '#ffff88' : '#aaaaaa';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawPrisms(state: ComponentState, hoverId: string | null): void {
    const ctx = this.ctx;
    for (const p of state.prisms) {
      const s = p.size / 2;
      const rad = (p.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const base = [
        { x: 0, y: -s * 1.1547 },
        { x: s, y: s * 0.5774 },
        { x: -s, y: s * 0.5774 },
      ];
      const tri = base.map((v) => ({
        x: p.x + v.x * cos - v.y * sin,
        y: p.y + v.x * sin + v.y * cos,
      }));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tri[0].x, tri[0].y);
      ctx.lineTo(tri[1].x, tri[1].y);
      ctx.lineTo(tri[2].x, tri[2].y);
      ctx.closePath();

      const grad = ctx.createLinearGradient(tri[0].x, tri[0].y, tri[1].x, tri[2].y);
      grad.addColorStop(0, 'rgba(200, 230, 255, 0.7)');
      grad.addColorStop(0.5, 'rgba(136, 204, 255, 0.5)');
      grad.addColorStop(1, 'rgba(100, 180, 255, 0.6)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(180, 220, 255, 0.95)';
      ctx.lineWidth = 3;
      ctx.stroke();

      if (hoverId === p.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tri[0].x, tri[0].y);
        ctx.lineTo(tri[1].x, tri[1].y);
        ctx.lineTo(tri[2].x, tri[2].y);
        ctx.closePath();
        ctx.stroke();
      }

      const cx = (tri[0].x + tri[1].x + tri[2].x) / 3;
      const cy = (tri[0].y + tri[1].y + tri[2].y) / 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`n=${p.refractiveIndex}`, cx, cy + 4);
      ctx.restore();
    }
  }

  drawObstacles(state: ComponentState): void {
    const ctx = this.ctx;
    for (const o of state.obstacles) {
      const grad = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.height);
      grad.addColorStop(0, '#2a2a3e');
      grad.addColorStop(1, '#151528');
      ctx.fillStyle = grad;
      ctx.fillRect(o.x, o.y, o.width, o.height);

      ctx.strokeStyle = '#4a4a6e';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y, o.width, o.height);

      ctx.fillStyle = 'rgba(100, 100, 140, 0.15)';
      for (let i = 0; i < o.width; i += 10) {
        ctx.fillRect(o.x + i, o.y, 1, o.height);
      }
      for (let j = 0; j < o.height; j += 10) {
        ctx.fillRect(o.x, o.y + j, o.width, 1);
      }
    }
  }

  drawLightSegments(segments: LightSegment[]): void {
    const ctx = this.ctx;
    for (const seg of segments) {
      const alpha = Math.max(0.15, seg.intensity);
      ctx.save();
      ctx.shadowBlur = 12 * seg.intensity;
      ctx.shadowColor = seg.color;
      ctx.strokeStyle = seg.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2 + seg.intensity * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.from.x, seg.from.y);
      ctx.lineTo(seg.to.x, seg.to.y);
      ctx.stroke();
      ctx.restore();
    }

    for (const seg of segments) {
      ctx.save();
      ctx.strokeStyle = seg.color;
      ctx.globalAlpha = Math.min(1, seg.intensity * 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(seg.from.x, seg.from.y);
      ctx.lineTo(seg.to.x, seg.to.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHitGlows(glows: HitGlow[], nowTime: number): void {
    const ctx = this.ctx;
    for (const g of glows) {
      const elapsed = nowTime - g.startTime;
      if (elapsed > g.duration) continue;
      const t = 1 - elapsed / g.duration;
      const radius = 6 + (1 - t) * 18;
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, radius);
      grad.addColorStop(0, `rgba(255, 255, 255, ${t * 0.9})`);
      grad.addColorStop(0.4, `rgba(255, 220, 180, ${t * 0.6})`);
      grad.addColorStop(1, 'rgba(255, 180, 120, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(g.x, g.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSplitParticles(particles: SplitParticle[], nowTime: number): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const elapsed = nowTime - p.startTime;
      if (elapsed > p.duration) continue;
      const t = elapsed / p.duration;
      const x = p.x + p.vx * t * (p.duration / 1000);
      const y = p.y + p.vy * t * (p.duration / 1000);
      const alpha = 1 - t;
      const size = p.size * (1 - t * 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawTransition(transition: TransitionState, nowTime: number): void {
    if (!transition.active) return;
    const ctx = this.ctx;
    const elapsed = nowTime - transition.startTime;
    const t = Math.min(1, elapsed / transition.duration);
    const progress = transition.isFadeOut ? t : (1 - t);
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const maxRadius = Math.hypot(this.width, this.height) * 0.6;
    const radius = maxRadius * (1 - progress);

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();
  }
}
