import { GameState, LightSource, Platform, Reflector, Prism, Receiver, RaySegment, Particle, Portal, Vec2 } from './types';

const GRID_SIZE = 50;
const CANVAS_W = 1000;
const CANVAS_H = 600;

const RAY_START = { r: 255, g: 235, b: 59 };
const RAY_END = { r: 255, g: 152, b: 0 };
const RAY_ALPHA_START = 0.8;
const RAY_ALPHA_END = 0.2;

interface BlendedCell {
  r: number; g: number; b: number; alpha: number;
}

export class RenderManager {
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = CANVAS_W;
  private height: number = CANVAS_H;
  private frameTime: number = 0;
  private blendGrid: Map<string, BlendedCell> = new Map();
  private gridCellSize: number = 3;

  public attach(canvas: HTMLCanvasElement): void {
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  public detach(): void {
    this.ctx = null;
  }

  public render(state: GameState): void {
    const t0 = performance.now();
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    this.drawBackground(ctx);
    this.drawGrid(ctx);
    this.drawPlatforms(ctx, state.platforms);
    this.drawPrisms(ctx, state.prisms);
    this.drawMirrors(ctx, state.reflectors);
    this.drawReceivers(ctx, state.receivers);
    this.drawPortal(ctx, state.portal);
    this.drawRaysWithBlending(ctx, state);
    this.drawBlockedFlash(ctx, state);
    this.drawLightSources(ctx, state.lightSources);
    this.drawParticles(ctx, state.particles);

    if (state.letterParticles && state.letterParticles.length > 0) {
      this.drawLetterParticles(ctx, state.letterParticles);
    }

    if (state.levelComplete) {
      this.drawLevelComplete(ctx, state.completeAnimationTime);
    }

    if (state.perfStats) {
      this.drawPerfOverlay(ctx, state.perfStats);
    }

    ctx.restore();
    this.frameTime = performance.now() - t0;
  }

  public getLastFrameTime(): number {
    return this.frameTime;
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 50,
      this.width / 2, this.height / 2, this.width * 0.7
    );
    g.addColorStop(0, '#15152a');
    g.addColorStop(1, '#0a0a14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(74, 20, 140, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += GRID_SIZE) {
      ctx.moveTo(x, 0); ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += GRID_SIZE) {
      ctx.moveTo(0, y); ctx.lineTo(this.width, y);
    }
    ctx.stroke();
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[]): void {
    for (const p of platforms) {
      ctx.save();
      ctx.translate(p.position.x, p.position.y);
      ctx.rotate(p.angle);

      const w = p.length, h = p.width, r = 4;

      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.movable && p.isMoving
        ? '#ffeb3b'
        : this.shiftColor(p.color, -40);
      ctx.lineWidth = 2;

      this.roundRect(ctx, -w / 2, -h / 2, w, h, r);
      ctx.fill();
      ctx.stroke();

      if (p.movable) {
        const progress = (p.currentOffset || 0) / (p.moveDistance || 150);
        ctx.fillStyle = p.isMoving ? '#ffeb3b' : 'rgba(255, 235, 59, 0.5)';
        const barW = Math.max(0, Math.min(w - 8, (w - 8) * progress));
        this.roundRect(ctx, -w / 2 + 4, -h / 2 - 6, barW, 2, 1);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawMirrors(ctx: CanvasRenderingContext2D, reflectors: Reflector[]): void {
    for (const r of reflectors) {
      if (r.type !== 'mirror') continue;
      ctx.save();
      ctx.translate(r.position.x, r.position.y);
      ctx.rotate(r.rotation);

      const len = 100;
      ctx.shadowColor = '#e0e0ff';
      ctx.shadowBlur = 8;

      const g = ctx.createLinearGradient(0, -4, 0, 4);
      g.addColorStop(0, '#f5f5f5');
      g.addColorStop(0.5, '#bdbdbd');
      g.addColorStop(1, '#9e9e9e');

      ctx.strokeStyle = g;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2, 0);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#7c4dff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPrisms(ctx: CanvasRenderingContext2D, prisms: Prism[]): void {
    for (const prism of prisms) {
      ctx.save();
      ctx.translate(prism.position.x, prism.position.y);
      ctx.rotate(prism.rotation);
      const s = prism.sideLength;
      const h = (s * Math.sqrt(3)) / 2;

      ctx.shadowColor = '#e1bee7';
      ctx.shadowBlur = 14;

      const g = ctx.createLinearGradient(0, -h, 0, h);
      g.addColorStop(0, 'rgba(224, 64, 251, 0.45)');
      g.addColorStop(0.33, 'rgba(33, 150, 243, 0.45)');
      g.addColorStop(0.66, 'rgba(76, 175, 80, 0.45)');
      g.addColorStop(1, 'rgba(255, 193, 7, 0.45)');

      ctx.fillStyle = g;
      ctx.strokeStyle = 'rgba(225, 190, 231, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -2 * h / 3);
      ctx.lineTo(-s / 2, h / 3);
      ctx.lineTo(s / 2, h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawReceivers(ctx: CanvasRenderingContext2D, receivers: Receiver[]): void {
    const time = performance.now() / 1000;
    for (const recv of receivers) {
      ctx.save();
      ctx.translate(recv.position.x, recv.position.y);
      const phase = (time % 1);
      const pulse = 1 + 0.15 * Math.sin(phase * Math.PI * 2);

      const glowAlpha = recv.activated
        ? 0.8 + 0.2 * Math.sin(phase * Math.PI * 2)
        : 0.3 + 0.1 * Math.sin(phase * Math.PI * 2);

      ctx.shadowColor = recv.activated ? recv.color : this.shiftColor(recv.color, -30);
      ctx.shadowBlur = recv.activated ? 26 : 12;

      ctx.beginPath();
      ctx.arc(0, 0, recv.radius * pulse + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${glowAlpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, recv.radius, 0, Math.PI * 2);
      ctx.fillStyle = recv.color;
      ctx.globalAlpha = recv.activated ? 1 : 0.7;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (!recv.activated && recv.requiredDuration > 0) {
        const p = recv.activationProgress / recv.requiredDuration;
        ctx.beginPath();
        ctx.arc(0, 0, recv.radius + 6, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
        ctx.strokeStyle = recv.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (recv.activated) {
        ctx.beginPath();
        ctx.arc(0, 0, recv.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPortal(ctx: CanvasRenderingContext2D, portal: Portal): void {
    const time = performance.now() / 1000;
    ctx.save();
    ctx.translate(portal.position.x, portal.position.y);

    if (portal.active) {
      for (let i = 0; i < 3; i++) {
        const phase = (time + i * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius * (1 + phase * 0.5), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(224, 64, 251, ${(1 - phase) * 0.5})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 30;

      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, portal.radius);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      g.addColorStop(0.4, 'rgba(224, 64, 251, 0.8)');
      g.addColorStop(1, 'rgba(103, 58, 183, 0.5)');
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.rotate(time * 2);
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(portal.radius * 0.3, 0);
        ctx.lineTo(portal.radius * 0.8, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 100, 140, 0.5)';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(60, 60, 90, 0.3)';
      ctx.fill();
    }
    ctx.restore();
  }

  private drawRaysWithBlending(ctx: CanvasRenderingContext2D, state: GameState): void {
    const composed = (state as any).composedRaySegments;
    if (composed && composed.length > 0) {
      this.buildBlendGrid(composed);
      this.renderBlendedRays(ctx);
      return;
    }

    for (const list of state.raySegments) {
      for (const seg of list) {
        this.drawGradientRay(ctx, seg, RAY_START, RAY_END, RAY_ALPHA_START, RAY_ALPHA_END);
      }
    }
  }

  private buildBlendGrid(segments: any[]): void {
    this.blendGrid.clear();
    const cs = this.gridCellSize;

    for (const seg of segments) {
      const sc = seg.startColor || RAY_START;
      const ec = seg.endColor || RAY_END;
      const sa = seg.startAlpha !== undefined ? seg.startAlpha : RAY_ALPHA_START;
      const ea = seg.endAlpha !== undefined ? seg.endAlpha : RAY_ALPHA_END;

      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const steps = Math.ceil(len / cs);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = seg.start.x + dx * t;
        const py = seg.start.y + dy * t;
        const gx = Math.floor(px / cs);
        const gy = Math.floor(py / cs);
        const key = `${gx},${gy}`;

        const ir = Math.round(sc.r + (ec.r - sc.r) * t);
        const ig = Math.round(sc.g + (ec.g - sc.g) * t);
        const ib = Math.round(sc.b + (ec.b - sc.b) * t);
        const ialpha = sa + (ea - sa) * t;

        const existing = this.blendGrid.get(key);
        if (existing) {
          existing.r = Math.max(existing.r, ir);
          existing.g = Math.max(existing.g, ig);
          existing.b = Math.max(existing.b, ib);
          existing.alpha = Math.min(1, existing.alpha + ialpha);
        } else {
          this.blendGrid.set(key, { r: ir, g: ig, b: ib, alpha: ialpha });
        }
      }
    }
  }

  private renderBlendedRays(ctx: CanvasRenderingContext2D): void {
    const cs = this.gridCellSize;

    let lastKey = '';
    let startX = 0, startY = 0;
    let lastColor: BlendedCell | null = null;

    const sortedKeys = Array.from(this.blendGrid.keys()).sort();

    ctx.save();
    ctx.lineCap = 'butt';
    for (const key of sortedKeys) {
      const val = this.blendGrid.get(key)!;
      const [gxS, gyS] = key.split(',');
      const gx = parseInt(gxS);
      const gy = parseInt(gyS);
      const cx = gx * cs + cs / 2;
      const cy = gy * cs + cs / 2;

      ctx.shadowColor = `rgba(${val.r}, ${val.g}, ${val.b}, 0.4)`;
      ctx.shadowBlur = 6;

      ctx.fillStyle = `rgba(${val.r}, ${val.g}, ${val.b}, ${val.alpha})`;
      ctx.fillRect(gx * cs, gy * cs, cs, cs);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawGradientRay(
    ctx: CanvasRenderingContext2D,
    seg: RaySegment,
    startC: { r: number; g: number; b: number },
    endC: { r: number; g: number; b: number },
    startA: number,
    endA: number
  ): void {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    if (dx * dx + dy * dy < 1) return;

    const intensity = seg.intensity;

    ctx.save();
    const g = ctx.createLinearGradient(seg.start.x, seg.start.y, seg.end.x, seg.end.y);

    const sr = startC.r, sg = startC.g, sb = startC.b;
    const er = endC.r, eg = endC.g, eb = endC.b;

    const mr = Math.round(sr + (er - sr) * 0.5);
    const mg = Math.round(sg + (eg - sg) * 0.5);
    const mb = Math.round(sb + (eb - sb) * 0.5);
    const mAlpha = startA + (endA - startA) * 0.5;

    g.addColorStop(0, `rgba(${sr}, ${sg}, ${sb}, ${startA * intensity})`);
    g.addColorStop(0.5, `rgba(${mr}, ${mg}, ${mb}, ${mAlpha * intensity})`);
    g.addColorStop(1, `rgba(${er}, ${eg}, ${eb}, ${endA * intensity})`);

    ctx.shadowColor = `rgba(${er}, ${eg}, ${eb}, 0.6)`;
    ctx.shadowBlur = 8 * intensity;
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1.5, 3 * intensity);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * intensity})`;
    ctx.lineWidth = Math.max(0.5, 1 * intensity);
    ctx.stroke();
    ctx.restore();
  }

  private drawBlockedFlash(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (state.blockedFlashTime <= 0 || !state.blockedPosition) return;
    const alpha = state.blockedFlashTime / 0.5;
    const pulse = 1 + 0.35 * Math.sin(performance.now() / 40);

    ctx.save();
    ctx.translate(state.blockedPosition.x, state.blockedPosition.y);
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 25;

    ctx.fillStyle = `rgba(255, 23, 68, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 77, 109, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawLightSources(ctx: CanvasRenderingContext2D, sources: LightSource[]): void {
    const time = performance.now() / 1000;
    for (const src of sources) {
      ctx.save();
      ctx.translate(src.position.x, src.position.y);

      for (let i = 3; i >= 1; i--) {
        const r = 12 + i * 6 + Math.sin(time * 3 + i) * 2;
        const a = 0.15 / i;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 235, 59, ${a})`;
        ctx.fill();
      }

      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 22;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#ffeb3b');
      g.addColorStop(1, '#ff9800');

      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.rotate(src.angle);
      const indLen = 28;
      ctx.strokeStyle = src.dragging ? '#ffffff' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = src.dragging ? 3 : 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(indLen, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(indLen, 0);
      ctx.lineTo(indLen - 5, -3);
      ctx.moveTo(indLen, 0);
      ctx.lineTo(indLen - 5, 3);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      const a = p.life / p.maxLife;
      const sz = p.size * (0.5 + a * 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = sz * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawLetterParticles(
    ctx: CanvasRenderingContext2D,
    particles: NonNullable<GameState['letterParticles']>
  ): void {
    for (const p of particles) {
      const a = Math.min(1, (p.life / p.maxLife) * 1.5);
      const sz = p.size * (p.phase === 'gather' ? 1.1 : 0.9 + a * 0.3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = sz * 3.5;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawLevelComplete(ctx: CanvasRenderingContext2D, time: number): void {
    const duration = 3;
    const t = Math.min(time / duration, 1);

    ctx.save();
    let alpha = 0;
    if (t < 0.3) alpha = t / 0.3;
    else if (t < 0.7) alpha = 1;
    else alpha = 1 - (t - 0.7) / 0.3;

    const g = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width
    );
    g.addColorStop(0, `rgba(103, 58, 183, ${0.4 * alpha})`);
    g.addColorStop(1, `rgba(10, 10, 20, ${0.8 * alpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);

    if (t >= 2.0 / duration) {
      const textT = Math.min(1, (t - 2.0 / duration) / (1 - 2.0 / duration));
      const scale = textT < 0.5
        ? 0.82 + (textT / 0.5) * 0.18
        : 1 + 0.05 * Math.sin(time * Math.PI * 4);

      ctx.translate(this.width / 2, this.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-this.width / 2, -this.height / 2);

      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 32 * textT;
      ctx.font = 'bold 64px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = 'Level Complete';
      const colors = ['#ffeb3b', '#ffc107', '#ff9800', '#ffeb3b'];
      const chars = text.split('');
      const charW = 42;
      const totalW = chars.length * charW;
      const startX = this.width / 2 - totalW / 2 + charW / 2;

      for (let i = 0; i < chars.length; i++) {
        const ct = textT * 3 - i * 0.05;
        const bounce = Math.max(0, Math.sin(Math.max(0, ct) * Math.PI)) * 15;
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = textT;
        ctx.fillText(chars[i], startX + i * charW, this.height / 2 - bounce);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawPerfOverlay(
    ctx: CanvasRenderingContext2D,
    stats: NonNullable<GameState['perfStats']>
  ): void {
    const px = 10, py = 10, lh = 16;
    ctx.save();
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';

    const fpsColor = stats.fps >= 30 ? '#00e676' : stats.fps >= 20 ? '#ff9800' : '#ff1744';
    const frameColor = stats.frameTime <= 25 ? '#00e676' : stats.frameTime <= 35 ? '#ff9800' : '#ff1744';
    const rayColor = stats.rayComputeTime <= 1 ? '#00e676' : stats.rayComputeTime <= 3 ? '#ff9800' : '#ff1744';

    let y = py + lh;
    ctx.fillStyle = fpsColor;
    ctx.fillText(`FPS: ${stats.fps}`, px, y); y += lh;
    ctx.fillStyle = frameColor;
    ctx.fillText(`Frame: ${stats.frameTime.toFixed(1)}ms`, px, y); y += lh;
    ctx.fillStyle = rayColor;
    ctx.fillText(`Ray: ${stats.rayComputeTime.toFixed(2)}ms`, px, y);
    ctx.restore();
  }

  private shiftColor(hex: string, amount: number): string {
    const c = this.parseHex(hex);
    const r = Math.max(0, Math.min(255, c.r + amount));
    const g = Math.max(0, Math.min(255, c.g + amount));
    const b = Math.max(0, Math.min(255, c.b + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : { r: 255, g: 255, b: 255 };
  }
}

export const renderManager = new RenderManager();
