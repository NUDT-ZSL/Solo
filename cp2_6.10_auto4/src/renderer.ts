import type { MazeManager, MirrorShard, LightPath, RippleAnimation, BreakParticle, StarDust } from './mazeManager';

const COLOR_BG_START = '#5A6B7C';
const COLOR_BG_END = '#2D1B4E';
const COLOR_EDGE_METAL = '#C0C8D0';
const COLOR_GOLD = '#FFD700';
const COLOR_SILVER = '#E8ECF1';
const COLOR_UI = '#8888AA';
const COLOR_PATH = '#7EC8FF';
const COLOR_CURSOR = '#FFFFFF';

function lerpColor(colorA: { r: number; g: number; b: number }, colorB: { r: number; g: number; b: number }, t: number) {
  return {
    r: colorA.r + (colorB.r - colorA.r) * t,
    g: colorA.g + (colorB.g - colorA.g) * t,
    b: colorA.b + (colorB.b - colorA.b) * t,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgb(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private offCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private mouseX = 0;
  private mouseY = 0;
  private cursorVisible = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    this.offCanvas = document.createElement('canvas');
    const offCtx = this.offCanvas.getContext('2d');
    if (!offCtx) throw new Error('Offscreen canvas context unavailable');
    this.offCtx = offCtx;
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.offCanvas.width = width;
    this.offCanvas.height = height;
  }

  setMouse(x: number, y: number, visible: boolean): void {
    this.mouseX = x;
    this.mouseY = y;
    this.cursorVisible = visible;
  }

  private drawHexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotation: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = rotation + (Math.PI / 3) * i;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawBackground(manager: MazeManager, now: number): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      manager.canvasWidth / 2, manager.canvasHeight / 2, 0,
      manager.canvasWidth / 2, manager.canvasHeight / 2, Math.max(manager.canvasWidth, manager.canvasHeight) * 0.75
    );
    grad.addColorStop(0, COLOR_BG_START);
    grad.addColorStop(1, COLOR_BG_END);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, manager.canvasWidth, manager.canvasHeight);
  }

  private drawStarDust(manager: MazeManager, now: number): void {
    const ctx = this.ctx;
    for (const s of manager.starDust) {
      const twinkle = 0.5 + 0.5 * Math.sin(now * 0.003 + s.x * 0.01 + s.y * 0.01);
      const a = s.alpha * twinkle;
      ctx.fillStyle = rgb(255, 255, 255, a);
      ctx.shadowColor = rgb(200, 220, 255, a * 0.8);
      ctx.shadowBlur = s.size * 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private drawShardBaseLight(manager: MazeManager): void {
    const ctx = this.ctx;
    for (const s of manager.shards) {
      ctx.save();
      this.drawHexPath(ctx, s.x, s.y, s.radius * 1.03, s.rotation);
      ctx.fillStyle = 'rgba(180, 200, 230, 0.04)';
      ctx.fill();
      ctx.restore();
    }
  }

  private drawShardReflection(ctx: CanvasRenderingContext2D, shard: MirrorShard, manager: MazeManager): void {
    ctx.save();
    this.drawHexPath(ctx, shard.x, shard.y, shard.radius * 0.96, shard.rotation);
    ctx.clip();

    const grad = ctx.createLinearGradient(
      shard.x - shard.radius, shard.y - shard.radius,
      shard.x + shard.radius, shard.y + shard.radius
    );
    grad.addColorStop(0, 'rgba(180, 195, 220, 0.22)');
    grad.addColorStop(0.35, 'rgba(90, 107, 124, 0.55)');
    grad.addColorStop(0.7, 'rgba(45, 27, 78, 0.75)');
    grad.addColorStop(1, 'rgba(120, 140, 180, 0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(shard.x - shard.radius * 1.5, shard.y - shard.radius * 1.5, shard.radius * 3, shard.radius * 3);

    const rx = shard.x + Math.cos(shard.rotation + Math.PI / 4) * shard.radius * 0.35;
    const ry = shard.y + Math.sin(shard.rotation + Math.PI / 4) * shard.radius * 0.35;
    const highlight = ctx.createRadialGradient(rx, ry, 0, rx, ry, shard.radius * 0.8);
    highlight.addColorStop(0, 'rgba(230, 240, 255, 0.35)');
    highlight.addColorStop(1, 'rgba(230, 240, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(shard.x - shard.radius * 1.5, shard.y - shard.radius * 1.5, shard.radius * 3, shard.radius * 3);

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a = shard.rotation + i * (Math.PI / 3);
      const px = shard.x + Math.cos(a) * shard.radius * 0.6;
      const py = shard.y + Math.sin(a) * shard.radius * 0.6;
      const g = ctx.createRadialGradient(px, py, 0, px, py, shard.radius * 0.5);
      g.addColorStop(0, 'rgba(170, 190, 220, 0.08)');
      g.addColorStop(1, 'rgba(170, 190, 220, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, shard.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  }

  private drawShardEdge(ctx: CanvasRenderingContext2D, shard: MirrorShard, manager: MazeManager, now: number, isActivated: boolean): void {
    const silver = hexToRgb(COLOR_SILVER);
    const gold = hexToRgb(COLOR_GOLD);
    const metal = hexToRgb(COLOR_EDGE_METAL);

    let glowPhase = shard.edgeGlowPhase;
    let baseColor = metal;
    if (isActivated) {
      glowPhase = Math.max(glowPhase, 0.85 + 0.15 * Math.sin(now * 0.005));
      baseColor = gold;
    }

    const edgeColor = lerpColor(silver, gold, glowPhase);
    const glowAlpha = 0.25 + glowPhase * 0.75;
    const glowWidth = 1.5 + glowPhase * 5 + (isActivated ? 4 : 0);

    ctx.save();
    this.drawHexPath(ctx, shard.x, shard.y, shard.radius, shard.rotation);
    ctx.strokeStyle = rgb(edgeColor.r, edgeColor.g, edgeColor.b, glowAlpha);
    ctx.lineWidth = glowWidth;
    ctx.shadowColor = rgb(edgeColor.r, edgeColor.g, edgeColor.b, 0.8);
    ctx.shadowBlur = 10 + glowPhase * 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    this.drawHexPath(ctx, shard.x, shard.y, shard.radius, shard.rotation);
    ctx.strokeStyle = rgb(baseColor.r, baseColor.g, baseColor.b, 0.85);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const a1 = shard.rotation + (Math.PI / 3) * i;
      const a2 = shard.rotation + (Math.PI / 3) * (i + 0.08);
      const x1 = shard.x + Math.cos(a1) * shard.radius;
      const y1 = shard.y + Math.sin(a1) * shard.radius;
      const x2 = shard.x + Math.cos(a2) * shard.radius;
      const y2 = shard.y + Math.sin(a2) * shard.radius;
      ctx.strokeStyle = rgb(255, 255, 255, 0.35 + glowPhase * 0.35);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawCracks(ctx: CanvasRenderingContext2D, shard: MirrorShard, now: number): void {
    if (!shard.crackAnim) return;
    const elapsed = now - shard.crackAnim.startTime;
    const t = Math.min(1, elapsed / shard.crackAnim.duration);
    const fade = 1 - t;

    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.rotation);

    for (const line of shard.crackAnim.lines) {
      const prog = Math.min(1, line.progress);
      const ex = line.startX + (line.endX - line.startX) * prog;
      const ey = line.startY + (line.endY - line.startY) * prog;

      ctx.strokeStyle = rgb(220, 230, 245, 0.75 * fade);
      ctx.lineWidth = 0.9;
      ctx.shadowColor = rgb(200, 220, 255, 0.9 * fade);
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);

      const midX = (line.startX + ex) / 2 + (Math.random() - 0.5) * 2;
      const midY = (line.startY + ey) / 2 + (Math.random() - 0.5) * 2;
      ctx.quadraticCurveTo(midX, midY, ex, ey);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (prog > 0.6) {
        const subAngle = Math.atan2(ey - line.startY, ex - line.startX) + (Math.random() - 0.5) * 1.2;
        const subLen = shard.radius * (0.15 + Math.random() * 0.2) * (prog - 0.6) * 2.5;
        ctx.strokeStyle = rgb(210, 225, 245, 0.5 * fade);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(subAngle) * subLen, ey + Math.sin(subAngle) * subLen);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawShards(manager: MazeManager, now: number): void {
    const ctx = this.ctx;
    for (const s of manager.shards) {
      const isActivated = manager.activatedLoopShards.has(s.id);
      this.drawShardReflection(ctx, s, manager);
      this.drawShardEdge(ctx, s, manager, now, isActivated);
      this.drawCracks(ctx, s, now);
    }
  }

  private drawLightPaths(manager: MazeManager, now: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const [, path] of manager.paths) {
      const shardA = manager.shards.find(s => s.id === path.fromShardId);
      const shardB = manager.shards.find(s => s.id === path.toShardId);
      if (!shardA || !shardB) continue;

      const isAOn = manager.activatedLoopShards.has(shardA.id);
      const isBOn = manager.activatedLoopShards.has(shardB.id);
      const boost = (isAOn && isBOn) ? 2.2 : 1;

      for (const p of path.particles) {
        const px = shardA.x + (shardB.x - shardA.x) * p.t;
        const py = shardA.y + (shardB.y - shardA.y) * p.t;
        const g = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3 * boost);
        g.addColorStop(0, rgb(200, 230, 255, p.alpha * boost));
        g.addColorStop(1, rgb(126, 200, 255, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 3 * boost, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  private drawRipples(manager: MazeManager, now: number): void {
    const ctx = this.ctx;
    for (const r of manager.ripples) {
      const t = Math.min(1, (now - r.startTime) / r.duration);
      const radius = r.maxRadius * t;
      const alpha = (1 - t) * 0.7;
      const width = 3 + (1 - t) * 10;

      for (let i = 0; i < 3; i++) {
        const rr = radius - i * 25;
        if (rr <= 0) continue;
        const aa = alpha * (1 - i * 0.25);
        ctx.strokeStyle = hsl((r.colorHue + i * 30) % 360, 80, 65, aa);
        ctx.lineWidth = width * (1 - i * 0.25);
        ctx.shadowColor = hsl((r.colorHue + i * 30) % 360, 85, 70, aa);
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  private drawBreakParticles(manager: MazeManager): void {
    const ctx = this.ctx;
    for (const p of manager.breakParticles) {
      ctx.fillStyle = rgb(200, 205, 215, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCursor(now: number): void {
    if (!this.cursorVisible) return;
    const ctx = this.ctx;
    const pulse = 0.6 + 0.4 * Math.sin(now * 0.006);

    const outerG = ctx.createRadialGradient(this.mouseX, this.mouseY, 0, this.mouseX, this.mouseY, 22);
    outerG.addColorStop(0, rgb(255, 255, 255, 0.35 * pulse));
    outerG.addColorStop(1, rgb(255, 255, 255, 0));
    ctx.fillStyle = outerG;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgb(255, 255, 255, 0.95);
    ctx.shadowColor = rgb(200, 220, 255, 0.9);
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawUI(manager: MazeManager, now: number): void {
    const ctx = this.ctx;

    ctx.font = '300 22px "SF Mono", "Consolas", "Menlo", monospace';
    ctx.fillStyle = rgb(136, 136, 170, 0.9);
    ctx.textBaseline = 'top';
    ctx.fillText(`Lv.${manager.level}`, 28, 24);

    const iconX = manager.canvasWidth - 58;
    const iconY = manager.canvasHeight - 52;
    const iconR = 16;
    ctx.save();
    ctx.translate(iconX, iconY);
    this.drawHexPath(ctx, 0, 0, iconR, now * 0.0003);
    ctx.strokeStyle = rgb(136, 200, 255, 0.85);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = rgb(136, 200, 255, 0.8);
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '300 14px "SF Mono", "Consolas", "Menlo", monospace';
    ctx.fillStyle = rgb(180, 200, 255, 0.95);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(manager.getConnectedPathCount()), 0, 1);
    ctx.restore();

    ctx.font = '300 11px "SF Mono", "Consolas", "Menlo", monospace';
    ctx.fillStyle = rgb(136, 136, 170, 0.55);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('connections', manager.canvasWidth - 28, manager.canvasHeight - 22);
  }

  private applyFishEyeDistortion(manager: MazeManager, intensity: number, centerX: number, centerY: number): void {
    if (intensity <= 0.001) return;

    const w = manager.canvasWidth;
    const h = manager.canvasHeight;

    this.offCtx.clearRect(0, 0, w, h);
    this.offCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, w, h);

    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const source = this.offCanvas;
    const tileSize = 8;
    const maxDist = Math.sqrt(w * w + h * h) * 0.6;

    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        const dx = x + tileSize / 2 - centerX;
        const dy = y + tileSize / 2 - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = Math.min(1, dist / maxDist);
        const factor = 1 + intensity * (1 - t) * (1 - t);
        const sx = centerX + dx / factor;
        const sy = centerY + dy / factor;
        ctx.drawImage(
          source,
          sx - tileSize / 2, sy - tileSize / 2, tileSize, tileSize,
          x, y, tileSize, tileSize
        );
      }
    }
    ctx.restore();
  }

  render(manager: MazeManager, now: number): void {
    this.ctx.clearRect(0, 0, manager.canvasWidth, manager.canvasHeight);

    this.drawBackground(manager, now);
    this.drawStarDust(manager, now);
    this.drawShardBaseLight(manager);
    this.drawLightPaths(manager, now);
    this.drawShards(manager, now);
    this.drawBreakParticles(manager);
    this.drawRipples(manager, now);
    this.drawUI(manager, now);
    this.drawCursor(now);

    if (manager.levelTransition.active) {
      const elapsed = now - manager.levelTransition.startTime;
      const t = elapsed / manager.levelTransition.duration;
      let intensity = 0;
      if (t < 0.45) {
        intensity = (t / 0.45) * 0.55;
      } else if (t < 0.55) {
        intensity = 0.55;
      } else {
        intensity = (1 - (t - 0.55) / 0.45) * 0.55;
      }
      intensity = Math.max(0, Math.min(0.55, intensity));

      const ripple = manager.ripples[manager.ripples.length - 1];
      const cx = ripple ? ripple.x : manager.canvasWidth / 2;
      const cy = ripple ? ripple.y : manager.canvasHeight / 2;
      this.applyFishEyeDistortion(manager, intensity, cx, cy);

      const fadeT = t < 0.5 ? (t / 0.45) : (1 - (t - 0.55) / 0.45);
      const fade = Math.max(0, Math.min(0.65, (1 - fadeT) * 0.65));
      if (fade > 0) {
        this.ctx.fillStyle = rgb(15, 10, 30, fade);
        this.ctx.fillRect(0, 0, manager.canvasWidth, manager.canvasHeight);
      }
    }
  }
}
