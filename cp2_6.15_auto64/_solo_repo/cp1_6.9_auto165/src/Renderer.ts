import { GRID_SIZE, GRID_COLS, GRID_ROWS, COLORS, DIMENSIONS, TIMINGS, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { Spider, Firefly, SilkThread, ExitPoint, PickupPoint, Particle } from './Entity';

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  offscreenBg: HTMLCanvasElement | null = null;
  offscreenWalls: HTMLCanvasElement | null = null;
  lastWallsKey: string = '';
  lastBgDims: string = '';

  constructor(public canvas: HTMLCanvasElement) {
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Canvas 2D context unavailable');
    this.ctx = c;
  }

  setupSize(displayW: number, displayH: number): void {
    this.canvas.style.width = displayW + 'px';
    this.canvas.style.height = displayH + 'px';
    const scale = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(CANVAS_WIDTH * scale);
    this.canvas.height = Math.floor(CANVAS_HEIGHT * scale);
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.lastBgDims = '';
    this.lastWallsKey = '';
  }

  clear(): void {
    this.ctx.fillStyle = COLORS.BG;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawGrid(): void {
    const key = `${CANVAS_WIDTH}x${CANVAS_HEIGHT}-${GRID_SIZE}`;
    if (this.lastBgDims !== key || !this.offscreenBg) {
      const c = document.createElement('canvas');
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
      const g = c.getContext('2d')!;
      g.fillStyle = COLORS.BG;
      g.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      g.strokeStyle = COLORS.GRID_LINE;
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x <= GRID_COLS; x++) {
        const px = x * GRID_SIZE + 0.5;
        g.moveTo(px, 0);
        g.lineTo(px, CANVAS_HEIGHT);
      }
      for (let y = 0; y <= GRID_ROWS; y++) {
        const py = y * GRID_SIZE + 0.5;
        g.moveTo(0, py);
        g.lineTo(CANVAS_WIDTH, py);
      }
      g.stroke();
      this.offscreenBg = c;
      this.lastBgDims = key;
    }
    this.ctx.drawImage(this.offscreenBg, 0, 0);
  }

  drawWalls(grid: number[][]): void {
    const key = grid.map((r) => r.join('')).join('|');
    if (this.lastWallsKey !== key || !this.offscreenWalls) {
      const c = document.createElement('canvas');
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
      const g = c.getContext('2d')!;
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < (grid[y]?.length || 0); x++) {
          if (grid[y][x] === 1) {
            const px = x * GRID_SIZE;
            const py = y * GRID_SIZE;
            g.fillStyle = COLORS.WALL;
            g.fillRect(px + 2, py + 2, GRID_SIZE - 4, GRID_SIZE - 4);
            g.fillStyle = COLORS.WALL_TOP;
            g.fillRect(px + 2, py + 2, GRID_SIZE - 4, 3);
            g.strokeStyle = COLORS.WALL_EDGE;
            g.lineWidth = 1;
            g.strokeRect(px + 2.5, py + 2.5, GRID_SIZE - 5, GRID_SIZE - 5);
          }
        }
      }
      this.offscreenWalls = c;
      this.lastWallsKey = key;
    }
    this.ctx.drawImage(this.offscreenWalls, 0, 0);
  }

  drawSilk(silk: SilkThread, now: number): void {
    const ctx = this.ctx;
    if (silk.placeRipple) {
      const elapsed = now - silk.placeRipple.startTime;
      const t = Math.min(1, elapsed / silk.placeRipple.duration);
      const r = 15 * t;
      const alpha = 1 - t;
      if (alpha > 0) {
        ctx.strokeStyle = `rgba(100,180,255,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(silk.placeRipple.pos.x, silk.placeRipple.pos.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (const ripple of silk.stepRipples) {
      const elapsed = now - ripple.startTime;
      const t = Math.min(1, elapsed / ripple.duration);
      const r = 12 * t;
      const alpha = (1 - t) * 0.8;
      if (alpha > 0) {
        ctx.strokeStyle = `rgba(100,200,255,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ripple.pos.x, ripple.pos.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const midX = (silk.start.x + silk.end.x) / 2 + silk.controlOffset.x;
    const midY = (silk.start.y + silk.end.y) / 2 + silk.controlOffset.y;
    const lifePct = Math.min(1, silk.lifeTime / TIMINGS.SILK_LIFETIME);
    const baseAlpha = 0.5 + 0.1 * lifePct;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = `rgba(100,180,255,${baseAlpha * 0.6})`;
    ctx.strokeStyle = `rgba(120,200,255,${baseAlpha})`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(silk.start.x, silk.start.y);
    ctx.quadraticCurveTo(midX, midY, silk.end.x, silk.end.y);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = `rgba(180,230,255,${baseAlpha * 0.9})`;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(silk.start.x, silk.start.y);
    ctx.quadraticCurveTo(midX, midY, silk.end.x, silk.end.y);
    ctx.stroke();

    ctx.fillStyle = `rgba(150,220,255,${baseAlpha})`;
    ctx.beginPath();
    ctx.arc(silk.start.x, silk.start.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(silk.end.x, silk.end.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPickupPoint(p: PickupPoint): void {
    const ctx = this.ctx;
    const pulse = (Math.sin(p.pulse * 3.5) + 1) / 2;
    const r = DIMENSIONS.EXIT_POINT_RADIUS + pulse * 2.5;
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = 'rgba(150,230,255,0.9)';
    ctx.fillStyle = `rgba(150,220,255,${0.75 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    const rings = 2;
    for (let i = 0; i < rings; i++) {
      const phase = ((p.pulse * 0.8 + i / rings) % 1);
      const rr = 6 + phase * 18;
      const al = (1 - phase) * 0.45;
      ctx.strokeStyle = `rgba(150,220,255,${al})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawExitPoint(ep: ExitPoint, spiderDist: number): void {
    const ctx = this.ctx;
    const phase = (ep.pulsePhase % TIMINGS.EXIT_PULSE_PERIOD) / TIMINGS.EXIT_PULSE_PERIOD;
    const nearBoost = spiderDist < GRID_SIZE * 3 ? 1.5 : 1;
    const baseR = DIMENSIONS.EXIT_POINT_RADIUS * nearBoost;
    const pulseR = baseR + Math.sin(phase * Math.PI * 2) * 2.5;

    for (let i = 0; i < 3; i++) {
      const rp = ((phase + i / 3) % 1);
      const rr = 8 + rp * 32;
      const al = (1 - rp) * 0.4 * nearBoost;
      ctx.strokeStyle = `rgba(255,215,0,${al})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ep.pos.x, ep.pos.y, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowBlur = 24 * nearBoost;
    ctx.shadowColor = 'rgba(255,215,0,0.95)';
    const grd = ctx.createRadialGradient(ep.pos.x, ep.pos.y, 0, ep.pos.x, ep.pos.y, pulseR * 1.5);
    grd.addColorStop(0, '#FFFFFF');
    grd.addColorStop(0.4, '#FFD700');
    grd.addColorStop(1, 'rgba(255,200,0,0.1)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ep.pos.x, ep.pos.y, pulseR * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ep.pos.x, ep.pos.y, pulseR * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFirefly(f: Firefly, now: number): void {
    const ctx = this.ctx;
    const wingT = (f.wingPhase % 1);
    const wingScale = 0.8 + Math.sin(wingT * Math.PI * 2) * 0.2;
    const wingsDisabled = f.state === 'stunned';

    if (f.state === 'stunned') {
      f.stunFlash += 1 / 60;
    }

    const isStunFlashing = f.state === 'stunned' && Math.floor(f.stunFlash * TIMINGS.STUN_FLASH_FREQ) % 2 === 0;
    const bodyColor = isStunFlashing ? COLORS.FIREFLY_STUN : COLORS.FIREFLY;
    const glowColor = isStunFlashing ? 'rgba(255,80,80,0.5)' : COLORS.FIREFLY_GLOW;

    let pulseR = 0;
    if (f.state === 'alert') {
      const p = (f.alertTime * TIMINGS.ALERT_PULSE_FREQ) % 1;
      pulseR = 5 + Math.sin(p * Math.PI * 2) * 5 + 5;
    }

    ctx.save();
    ctx.translate(f.pos.x, f.pos.y);

    if (!wingsDisabled) {
      ctx.fillStyle = 'rgba(255,220,160,0.55)';
      ctx.beginPath();
      ctx.ellipse(-4, -4, 7 * wingScale, 4 * wingScale, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, -4, 7 * wingScale, 4 * wingScale, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = DIMENSIONS.FIREFLY_GLOW_RADIUS * 2 + pulseR * 0.6;
    ctx.shadowColor = glowColor;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, DIMENSIONS.FIREFLY_WIDTH / 2, DIMENSIONS.FIREFLY_HEIGHT / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (f.state === 'alert') {
      const p = (f.alertTime * TIMINGS.ALERT_PULSE_FREQ) % 1;
      const rad = 5 + p * 18;
      const al = (1 - p) * 0.5;
      ctx.strokeStyle = `rgba(255,200,80,${al})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.pos.x, f.pos.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (f.state === 'stunned') {
      ctx.fillStyle = `rgba(255,255,255,${0.6 + Math.sin(now / 80) * 0.3})`;
      const star = (t: number) => {
        const s = 2 + Math.sin(t * 4) * 0.5;
        return s;
      };
      for (let i = 0; i < 3; i++) {
        const ang = now / 300 + (i * Math.PI * 2) / 3;
        const dx = Math.cos(ang) * 12;
        const dy = Math.sin(ang) * 8 - 12;
        ctx.beginPath();
        ctx.arc(f.pos.x + dx, f.pos.y + dy, star(now / 200 + i), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawSpider(s: Spider, now: number): void {
    const ctx = this.ctx;
    if (s.landingEffect) {
      const elapsed = now - s.landingEffect.startTime;
      const t = Math.min(1, elapsed / s.landingEffect.duration);
      const r = 5 + 15 * t;
      const alpha = 0.6 * (1 - t);
      if (alpha > 0) {
        ctx.fillStyle = `rgba(30,58,95,${alpha})`;
        ctx.beginPath();
        ctx.ellipse(s.landingEffect.pos.x, s.landingEffect.pos.y + 6, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const bodyR = DIMENSIONS.SPIDER_BODY_RADIUS;
    const legs: Array<[number, number, number]> = [];
    const legAngles = [
      -2.4, -1.8, -1.2, -0.6,
      0.6, 1.2, 1.8, 2.4,
    ];
    const phase = (s.legPhase % TIMINGS.LEG_ANIM_PERIOD) / TIMINGS.LEG_ANIM_PERIOD;
    for (let i = 0; i < 8; i++) {
      const a0 = legAngles[i];
      const swing = (i % 2 === 0 ? phase : (phase + 0.5) % 1) * Math.PI * 2;
      const bendOffset = Math.sin(swing) * 0.25;
      const a = a0 + bendOffset;
      const seg1 = bodyR * 1.25;
      const seg2 = bodyR * 1.45;
      const midX = Math.cos(a) * seg1;
      const midY = Math.sin(a) * seg1 * 0.85;
      const tipAng = a + bendOffset * 0.6;
      const tipX = midX + Math.cos(tipAng) * seg2;
      const tipY = midY + Math.sin(tipAng) * seg2 * 0.8;
      legs.push([midX, midY, 0]);
      legs[legs.length - 1][2] = 0;
      ctx.strokeStyle = COLORS.SPIDER_LEG;
      ctx.lineWidth = DIMENSIONS.SPIDER_LEG_WIDTH;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.pos.x, s.pos.y);
      ctx.lineTo(s.pos.x + midX, s.pos.y + midY);
      ctx.lineTo(s.pos.x + tipX, s.pos.y + tipY);
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = 'rgba(106,76,147,0.7)';
    const grd = ctx.createRadialGradient(s.pos.x - bodyR * 0.3, s.pos.y - bodyR * 0.3, 2, s.pos.x, s.pos.y, bodyR);
    grd.addColorStop(0, COLORS.SPIDER_START);
    grd.addColorStop(1, COLORS.SPIDER_END);
    ctx.fillStyle = grd;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    const pts = 8;
    for (let i = 0; i < pts; i++) {
      const ang = (i / pts) * Math.PI * 2 - Math.PI / 2;
      const rr = bodyR * (0.92 + Math.sin(i * 2.5) * 0.08);
      const x = s.pos.x + Math.cos(ang) * rr;
      const y = s.pos.y + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.95;
    const eyeAng = Math.atan2(s.facing.y, s.facing.x);
    for (let i = -1; i <= 1; i += 2) {
      const ex = s.pos.x + Math.cos(eyeAng + i * 0.35) * bodyR * 0.55;
      const ey = s.pos.y + Math.sin(eyeAng + i * 0.35) * bodyR * 0.55;
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (s.invincibleTime > 0) {
      const t = (TIMINGS.INVINCIBLE_DURATION - s.invincibleTime) * 4;
      const al = 0.5 + Math.sin(t) * 0.2 + 0.3;
      ctx.strokeStyle = `rgba(255,255,255,${al * 0.85})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(s.pos.x, s.pos.y, bodyR + 6 + Math.sin(t * 1.3) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(200,220,255,${al * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.pos.x, s.pos.y, bodyR + 10 + Math.sin(t * 1.7) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const t = 1 - p.life / p.maxLife;
    const c = lerpColor(p.colorStart, p.colorEnd, t);
    const alpha = Math.max(0, 1 - t);
    const size = p.size * (1 - t * 0.6);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = c;
    ctx.shadowBlur = 8;
    ctx.shadowColor = c;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLevelTransition(t: number): void {
    if (t <= 0) return;
    const ctx = this.ctx;
    const alpha = Math.min(1, t);
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.75})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (t > 0.3 && t < 1.2) {
      const fade = t < 0.5 ? (t - 0.3) / 0.2 : t > 1 ? 1 - (t - 1) / 0.2 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 52px monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#FFD700';
      ctx.fillText('LEVEL COMPLETE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      ctx.font = '22px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#FFFFFF';
      ctx.fillText('前往下一关...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24);
      ctx.restore();
    }
  }

  drawGameComplete(t: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, t * 0.85)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (t > 0.3) {
      const fade = Math.min(1, (t - 0.3) / 0.5);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 64px monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#FFD700';
      ctx.fillText('恭喜通关！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '24px monospace';
      ctx.shadowBlur = 15;
      ctx.fillText('你已成为真正的影子织网者', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
      ctx.font = '18px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.shadowBlur = 0;
      ctx.fillText('按 R 键重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 56);
      ctx.restore();
    }
  }
}
