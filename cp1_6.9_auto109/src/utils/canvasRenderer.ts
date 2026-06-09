import type { RGB, RGBA, RenderParams } from './sceneController';
import { lerp, lerpRgb, rgbToString } from './sceneController';

const LIGHT_WIDTH = 80;
const LIGHT_HEIGHT = 60;
const PARTICLE_COUNT = 100;
const TRAIL_MAX = 20;
const TRAIL_LIFETIME = 300;
const GRID_COLS = 40;
const GRID_ROWS = 30;
const HUE_CYCLE_PERIOD = 2000;
const DECAY_FACTOR = 0.2;
const BG_DRIFT_SPEED = 0.1;
const BURST_MAX_RADIUS = 200;
const BURST_DURATION = 800;
const EDGE_BLUR_RADIUS = 15;

interface Particle {
  offsetX: number;
  offsetY: number;
  size: number;
  radiusRatio: number;
  jitterPhase: number;
  jitterSpeed: number;
}

interface TrailParticle {
  x: number;
  y: number;
  size: number;
  bornTime: number;
  centerOffsetRatio: number;
}

interface BurstEffect {
  active: boolean;
  x: number;
  y: number;
  startTime: number;
  color: string;
}

interface RippleEffect {
  active: boolean;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr = 1;
  private width = 0;
  private height = 0;

  private particles: Particle[] = [];
  private trails: TrailParticle[] = [];
  private lightX = 0;
  private lightY = 0;
  private lightVX = 0;
  private lightVY = 0;
  private prevLightX = 0;
  private prevLightY = 0;
  private isDragging = false;
  private brightness = 0.8;
  private targetBrightness = 0.8;

  private burst: BurstEffect = { active: false, x: 0, y: 0, startTime: 0, color: '' };
  private ripples: RippleEffect[] = [];

  private bgHue = 230;
  private targetBgHue = 230;
  private lastTrailEmitTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get Canvas 2D context');
    this.ctx = ctx;
    this.initParticles();
    this.resize();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const radiusRatio = r;
      const offsetX = Math.cos(angle) * (LIGHT_WIDTH / 2) * r;
      const offsetY = Math.sin(angle) * (LIGHT_HEIGHT / 2) * r;
      this.particles.push({
        offsetX,
        offsetY,
        size: 2 + Math.random() * 3,
        radiusRatio,
        jitterPhase: Math.random() * Math.PI * 2,
        jitterSpeed: 0.002 + Math.random() * 0.003,
      });
    }
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.lightX === 0 && this.lightY === 0) {
      this.lightX = this.width / 2;
      this.lightY = this.height / 2;
      this.prevLightX = this.lightX;
      this.prevLightY = this.lightY;
    }
  }

  setDragging(dragging: boolean): void {
    this.isDragging = dragging;
  }

  setLightPosition(x: number, y: number): void {
    this.lightX = Math.max(40, Math.min(this.width - 40, x));
    this.lightY = Math.max(30, Math.min(this.height - 30, y));
  }

  triggerBurst(color: string): void {
    this.burst = {
      active: true,
      x: this.lightX,
      y: this.lightY,
      startTime: performance.now(),
      color,
    };
  }

  triggerRipple(x: number, y: number): void {
    this.ripples.push({
      active: true,
      x,
      y,
      startTime: performance.now(),
      duration: 300,
    });
  }

  private computeSpeed(): number {
    const dx = this.lightX - this.prevLightX;
    const dy = this.lightY - this.prevLightY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private updateBrightness(speed: number): void {
    if (speed < 10) {
      this.targetBrightness = 0.8;
    } else if (speed > 30) {
      this.targetBrightness = 1.2;
    } else {
      const t = (speed - 10) / 20;
      this.targetBrightness = 0.8 + t * 0.4;
    }
    this.brightness += (this.targetBrightness - this.brightness) * 0.1;
  }

  private updateLightPhysics(): void {
    if (!this.isDragging) {
      this.lightVX *= 1 - DECAY_FACTOR;
      this.lightVY *= 1 - DECAY_FACTOR;
      this.lightX += this.lightVX;
      this.lightY += this.lightVY;
      this.lightX = Math.max(40, Math.min(this.width - 40, this.lightX));
      this.lightY = Math.max(30, Math.min(this.height - 30, this.lightY));
    } else {
      this.lightVX = this.lightX - this.prevLightX;
      this.lightVY = this.lightY - this.prevLightY;
    }
  }

  private emitTrail(now: number, speed: number): void {
    if (speed > 0.5 && now - this.lastTrailEmitTime > 15) {
      this.lastTrailEmitTime = now;
      this.trails.push({
        x: this.lightX,
        y: this.lightY,
        size: 3 + Math.random() * 2,
        bornTime: now,
        centerOffsetRatio: Math.random() * 0.8,
      });
      if (this.trails.length > TRAIL_MAX) {
        this.trails.shift();
      }
    }
  }

  private updateBackgroundHue(renderParams: RenderParams): void {
    const midHue = (renderParams.textureHueMin + renderParams.textureHueMax) / 2;
    const xT = this.lightX / this.width;
    const yT = this.lightY / this.height;
    this.targetBgHue = midHue + (xT - 0.5) * 20 + (yT - 0.5) * 20;

    let diff = this.targetBgHue - this.bgHue;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), BG_DRIFT_SPEED);
    this.bgHue = (this.bgHue + step + 360) % 360;
  }

  private drawBackground(): void {
    const { ctx, width, height, bgHue } = this;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.sqrt(width * width + height * height) / 2;

    const centerColor = this.hslToRgb(bgHue, 40, 14);
    const edgeColor = this.hslToRgb(bgHue, 35, 8);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, rgbToString(centerColor));
    grad.addColorStop(1, rgbToString(edgeColor));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  private drawProjection(now: number, renderParams: RenderParams): void {
    const { ctx } = this;
    const projW = LIGHT_WIDTH * 2.5;
    const projH = LIGHT_HEIGHT * 2.5;
    const projX = this.lightX - projW / 2;
    const projY = this.lightY - projH / 2;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const distFromCenter = Math.sqrt(
      (this.lightX - cx) ** 2 + (this.lightY - cy) ** 2
    );
    const distT = Math.min(distFromCenter / maxDist, 1);
    const hexSize = 10 - 2 * distT;

    ctx.save();

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.ceil(projW) + EDGE_BLUR_RADIUS * 2;
    tempCanvas.height = Math.ceil(projH) + EDGE_BLUR_RADIUS * 2;
    const tctx = tempCanvas.getContext('2d')!;

    tctx.translate(EDGE_BLUR_RADIUS, EDGE_BLUR_RADIUS);
    const clipPath = new Path2D();
    clipPath.ellipse(projW / 2, projH / 2, projW / 2, projH / 2, 0, 0, Math.PI * 2);
    tctx.save();
    tctx.clip(clipPath);

    this.drawHexGrid(tctx, projW, projH, hexSize, now, renderParams);

    tctx.restore();
    ctx.filter = `blur(${EDGE_BLUR_RADIUS * 0.5}px)`;
    ctx.drawImage(tempCanvas, projX - EDGE_BLUR_RADIUS, projY - EDGE_BLUR_RADIUS);
    ctx.filter = 'none';

    const edgeGrad = ctx.createRadialGradient(
      this.lightX, this.lightY, Math.min(projW, projH) * 0.2,
      this.lightX, this.lightY, Math.max(projW, projH) * 0.5
    );
    edgeGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    edgeGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = edgeGrad;
    ctx.beginPath();
    ctx.ellipse(this.lightX, this.lightY, projW / 2, projH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  }

  private drawHexGrid(
    ctx: CanvasRenderingContext2D,
    areaW: number,
    areaH: number,
    hexSize: number,
    now: number,
    params: RenderParams
  ): void {
    const hexW = hexSize * 2;
    const hexH = hexSize * Math.sqrt(3);
    const rowH = hexH * 0.75;
    const offsetX = -hexW * 0.25;
    const offsetY = -hexH * 0.5;

    const timePhase = (now % HUE_CYCLE_PERIOD) / HUE_CYCLE_PERIOD;
    const hueSine = Math.sin(timePhase * Math.PI * 2);
    const hueRange = params.textureHueMax - params.textureHueMin;
    const baseHue = params.textureHueMin + hueRange * 0.5;

    const lightRelX = this.lightX / this.width;
    const lightRelY = this.lightY / this.height;

    const cols = GRID_COLS;
    const rows = GRID_ROWS;
    const cellW = areaW / cols;
    const cellH = areaH / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellCx = (col + 0.5) * cellW;
        const cellCy = (row + 0.5) * cellH;
        const colRel = col / cols;
        const rowRel = row / rows;

        const posFactor = Math.sin((colRel + lightRelX) * Math.PI * 2) *
          Math.cos((rowRel + lightRelY) * Math.PI * 2);
        const hueOffset = 30 * (hueSine * 0.6 + posFactor * 0.4);
        const hue = ((baseHue + hueOffset) % 360 + 360) % 360;

        const distToCenter = Math.sqrt(
          (cellCx - areaW / 2) ** 2 + (cellCy - areaH / 2) ** 2
        );
        const maxR = Math.sqrt((areaW / 2) ** 2 + (areaH / 2) ** 2);
        const edgeFade = 1 - Math.min(distToCenter / maxR, 1) * 0.6;

        const sat = 65 + posFactor * 15;
        const light = 35 + edgeFade * 25 + (params.brightnessMultiplier - 1) * 20;
        const alpha = 0.35 + edgeFade * 0.35;

        const color = this.hslToRgb(hue, sat, light);
        this.drawHexagon(ctx, cellCx + offsetX, cellCy + offsetY, hexSize * 0.85, color, alpha);
      }
    }
  }

  private drawHexagon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: RGB,
    alpha: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + size * Math.cos(angle);
      const py = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = rgbToString(color, alpha);
    ctx.fill();
    ctx.strokeStyle = rgbToString(color, alpha * 0.5);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  private drawTrails(now: number, params: RenderParams): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    this.trails = this.trails.filter((t) => now - t.bornTime < TRAIL_LIFETIME);

    for (const trail of this.trails) {
      const age = now - trail.bornTime;
      const t = age / TRAIL_LIFETIME;
      const alpha = (1 - t) * 0.6;
      if (alpha <= 0) continue;

      const color = lerpRgb(
        params.particleColorCenter,
        params.particleColorEdge,
        trail.centerOffsetRatio
      );

      const offsetX = (Math.random() - 0.5) * LIGHT_WIDTH * 0.3;
      const offsetY = (Math.random() - 0.5) * LIGHT_HEIGHT * 0.3;

      ctx.beginPath();
      ctx.arc(trail.x + offsetX, trail.y + offsetY, trail.size * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = rgbToString(color, alpha * this.brightness * params.brightnessMultiplier);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLightSource(now: number, params: RenderParams): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const isWhite = Math.random() < params.whiteParticleRatio;

      const jitter = Math.sin(now * p.jitterSpeed + p.jitterPhase) * 0.15;
      const scale = 1 + jitter;
      const px = this.lightX + p.offsetX * scale;
      const py = this.lightY + p.offsetY * scale;

      let color: RGB;
      let particleAlpha: number;

      if (isWhite) {
        color = { r: 255, g: 255, b: 255 };
        particleAlpha = 0.95 * this.brightness * params.brightnessMultiplier;
      } else {
        color = lerpRgb(
          params.particleColorCenter,
          {
            r: params.particleColorEdge.r,
            g: params.particleColorEdge.g,
            b: params.particleColorEdge.b,
          },
          p.radiusRatio
        );
        const edgeAlpha = params.particleColorEdge.a;
        particleAlpha = lerp(1, edgeAlpha, p.radiusRatio) * this.brightness * params.brightnessMultiplier;
      }

      const size = p.size * (1 + (this.brightness - 1) * 0.3);
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = rgbToString(color, Math.min(particleAlpha, 1));
      ctx.fill();
    }

    const coreGrad = ctx.createRadialGradient(
      this.lightX, this.lightY, 0,
      this.lightX, this.lightY, Math.max(LIGHT_WIDTH, LIGHT_HEIGHT) * 0.4
    );
    coreGrad.addColorStop(0, rgbToString(params.particleColorCenter, 0.4 * this.brightness * params.brightnessMultiplier));
    coreGrad.addColorStop(1, rgbToString(params.particleColorCenter, 0));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.ellipse(this.lightX, this.lightY, LIGHT_WIDTH / 2, LIGHT_HEIGHT / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawBurst(now: number): void {
    if (!this.burst.active) return;
    const elapsed = now - this.burst.startTime;
    const t = elapsed / BURST_DURATION;
    if (t >= 1) {
      this.burst.active = false;
      return;
    }

    const radius = BURST_MAX_RADIUS * t;
    const alpha = 0.9 * (1 - t);

    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const grad = ctx.createRadialGradient(
      this.burst.x, this.burst.y, 0,
      this.burst.x, this.burst.y, radius
    );
    grad.addColorStop(0, this.burst.color.replace(/[\d.]+\)$/, `${alpha})`));
    grad.addColorStop(0.6, this.burst.color.replace(/[\d.]+\)$/, `${alpha * 0.4})`));
    grad.addColorStop(1, this.burst.color.replace(/[\d.]+\)$/, `0)`));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.burst.x, this.burst.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRipples(now: number): void {
    if (this.ripples.length === 0) return;
    const { ctx } = this;
    ctx.save();

    this.ripples = this.ripples.filter((r) => {
      const elapsed = now - r.startTime;
      const t = elapsed / r.duration;
      if (t >= 1) return false;

      const radius = 30 * t;
      const alpha = 1 - t;
      const lineWidth = 3 * (1 - t);

      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      return true;
    });

    ctx.restore();
  }

  render(now: number, params: RenderParams): void {
    const speed = this.computeSpeed();
    this.updateBrightness(speed);
    this.updateLightPhysics();
    this.emitTrail(now, speed);
    this.updateBackgroundHue(params);

    this.drawBackground();
    this.drawProjection(now, params);
    this.drawTrails(now, params);
    this.drawLightSource(now, params);
    this.drawBurst(now);
    this.drawRipples(now);

    this.prevLightX = this.lightX;
    this.prevLightY = this.lightY;
  }

  private hslToRgb(h: number, s: number, l: number): RGB {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  getLightPosition(): { x: number; y: number } {
    return { x: this.lightX, y: this.lightY };
  }
}
