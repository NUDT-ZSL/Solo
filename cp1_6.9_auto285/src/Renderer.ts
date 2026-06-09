import type { Bubble, Particle, Ripple, Flash, MouseState } from './BubbleManager';
import { BubbleManager } from './BubbleManager';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private shaderCanvas: HTMLCanvasElement;
  private shaderCtx: CanvasRenderingContext2D;
  private time = 0;
  private mouseParticles: { angle: number; offset: number; speed: number }[] = [];
  private readonly MOUSE_PARTICLE_COUNT = 20;
  private readonly MOUSE_RADIUS = 8;

  constructor(
    private canvas: HTMLCanvasElement,
    private manager: BubbleManager
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const octx = this.offscreenCanvas.getContext('2d', { alpha: true });
    if (!octx) throw new Error('无法创建离屏 Canvas');
    this.offscreenCtx = octx;

    this.shaderCanvas = document.createElement('canvas');
    this.shaderCanvas.width = 512;
    this.shaderCanvas.height = 512;
    const sctx = this.shaderCanvas.getContext('2d', { alpha: true });
    if (!sctx) throw new Error('无法创建着色器 Canvas');
    this.shaderCtx = sctx;

    for (let i = 0; i < this.MOUSE_PARTICLE_COUNT; i++) {
      this.mouseParticles.push({
        angle: (i / this.MOUSE_PARTICLE_COUNT) * Math.PI * 2,
        offset: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.2
      });
    }
  }

  resize(w: number, h: number, dpr: number): void {
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.offscreenCanvas.width = Math.max(256, Math.floor(MAX_BUBBLE_DIAMETER * 1.2 * dpr));
    this.offscreenCanvas.height = Math.max(256, Math.floor(MAX_BUBBLE_DIAMETER * 1.2 * dpr));
  }

  private drawShaderTexture(baseHue: number, pulsePhase: number, _displayRadius: number): void {
    const size = this.shaderCanvas.width;
    const ctx = this.shaderCtx;
    void size;

    ctx.clearRect(0, 0, size, size);

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const invSize = 1 / size;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = (x + 0.5) * invSize * 2 - 1;
        const py = (y + 0.5) * invSize * 2 - 1;
        const distSq = px * px + py * py;

        if (distSq > 1.0) continue;

        const dist = Math.sqrt(distSq);
        const nx = px;
        const ny = py;
        const nz = Math.sqrt(Math.max(0, 1 - distSq));

        const noise1 = Math.sin(nx * 4 + pulsePhase * 1.3) * Math.cos(ny * 4 - pulsePhase * 0.9);
        const noise2 = Math.sin(nx * 7 + ny * 3 + pulsePhase * 2.1) * 0.5 + 0.5;
        const noise3 = Math.cos(ny * 6 - pulsePhase * 1.7) * Math.sin(nx * 2 + pulsePhase * 0.5);

        const flowPattern = (noise1 + noise3) * 0.5;
        const hueShift = flowPattern * 70 + noise2 * 30;
        let hue = baseHue + hueShift;
        hue = ((hue % 360) + 360) % 360;

        const lightDirX = 0.45;
        const lightDirY = -0.55;
        const lightDirZ = 0.7;
        const len = Math.sqrt(lightDirX * lightDirX + lightDirY * lightDirY + lightDirZ * lightDirZ);
        const lx = lightDirX / len;
        const ly = lightDirY / len;
        const lz = lightDirZ / len;

        let diffuse = nx * lx + ny * ly + nz * lz;
        diffuse = Math.max(0, diffuse);

        const viewX = 0;
        const viewY = 0;
        const viewZ = 1;
        const halfX = (lx + viewX) * 0.5;
        const halfY = (ly + viewY) * 0.5;
        const halfZ = (lz + viewZ) * 0.5;
        const hLen = Math.sqrt(halfX * halfX + halfY * halfY + halfZ * halfZ);
        const specDot = Math.max(0, (nx * halfX + ny * halfY + nz * halfZ) / (hLen || 1));
        const specular = Math.pow(specDot, 36) * 0.8;
        const pearlGloss = Math.pow(specDot, 12) * 0.35;

        const rim = Math.pow(1 - nz, 2.2);
        const fresnel = rim * 0.6;

        const saturation = 0.7 + flowPattern * 0.25;
        let value = 0.55 + diffuse * 0.35 + specular + pearlGloss + fresnel * 0.4;
        value = Math.min(1, value);

        const rgb = this.manager.hsvToRgb(hue, saturation, value);

        const alphaMask = 1 - Math.pow(dist, 8);
        const softEdge = dist < 0.95 ? 1 : (1 - dist) / 0.05;
        const alpha = Math.min(alphaMask, softEdge);

        const idx = (y * size + x) * 4;
        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = Math.floor(alpha * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  private drawGlow(x: number, y: number, radius: number, hue: number, opacity: number): void {
    const ctx = this.ctx;
    const glowRadius = radius + 4;
    const gradient = ctx.createRadialGradient(x, y, radius * 0.7, x, y, glowRadius);
    const rgb = this.manager.hsvToRgb(hue, 0.85, 0.9);
    gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity * 0.4})`);
    gradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity * 0.15})`);
    gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBubbleSurface(b: Bubble, displayRadius: number): void {
    const ctx = this.offscreenCtx;
    const target = this.ctx;
    const cw = this.offscreenCanvas.width;
    const ch = this.offscreenCanvas.height;
    const cx = cw / 2;
    const cy = ch / 2;

    ctx.clearRect(0, 0, cw, ch);

    this.drawShaderTexture(b.hue, b.pulsePhase, displayRadius);

    const drawSize = Math.min(cw, ch) * 0.96;
    ctx.drawImage(
      this.shaderCanvas,
      0, 0, this.shaderCanvas.width, this.shaderCanvas.height,
      cx - drawSize / 2, cy - drawSize / 2, drawSize, drawSize
    );

    const highlightGrad = ctx.createRadialGradient(
      cx - drawSize * 0.25, cy - drawSize * 0.3, 0,
      cx - drawSize * 0.2, cy - drawSize * 0.25, drawSize * 0.3
    );
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
    highlightGrad.addColorStop(0.4, 'rgba(255,255,255,0.2)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, drawSize * 0.49, 0, Math.PI * 2);
    ctx.fill();

    const innerShadowGrad = ctx.createRadialGradient(cx, cy, drawSize * 0.4, cx, cy, drawSize * 0.5);
    innerShadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    innerShadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.08)');
    innerShadowGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = innerShadowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, drawSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const alpha = 0.3 + (displayRadius / b.maxRadius) * 0.5;

    target.save();
    target.globalAlpha = alpha;
    target.drawImage(
      this.offscreenCanvas,
      0, 0, cw, ch,
      b.x - displayRadius * 1.1, b.y - displayRadius * 1.1,
      displayRadius * 2.2, displayRadius * 2.2
    );

    ctx.clearRect(0, 0, cw, ch);
    const rimGrad = ctx.createRadialGradient(cx, cy, drawSize * 0.44, cx, cy, drawSize * 0.5);
    const rimRGB = this.manager.hsvToRgb(b.hue, 0.9, 1);
    rimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    rimGrad.addColorStop(0.8, `rgba(${rimRGB.r},${rimRGB.g},${rimRGB.b},0.35)`);
    rimGrad.addColorStop(0.95, `rgba(255,255,255,0.6)`);
    rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, drawSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    target.globalAlpha = alpha * 1.1;
    target.drawImage(
      this.offscreenCanvas,
      0, 0, cw, ch,
      b.x - displayRadius * 1.1, b.y - displayRadius * 1.1,
      displayRadius * 2.2, displayRadius * 2.2
    );
    target.restore();
  }

  private drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const lifeRatio = p.life / p.maxLife;
    const alpha = lifeRatio;
    const rgb = this.manager.hsvToRgb(p.hue, p.saturation, p.value);

    const glowR = p.radius * 3;
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
    glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.6})`);
    glow.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 40)},${Math.min(255, rgb.g + 40)},${Math.min(255, rgb.b + 40)},${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRipple(r: Ripple): void {
    const ctx = this.ctx;
    const rgb = this.manager.hsvToRgb(r.hue, 0.75, 0.95);
    const lineWidth = 2.5;

    ctx.save();
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${r.opacity})`;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},${r.opacity * 0.8})`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawFlash(f: Flash): void {
    const ctx = this.ctx;
    const ratio = f.life / f.maxLife;
    const r = f.radius * (1.8 - ratio * 0.8);
    const alpha = ratio;

    const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
    grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
    grad.addColorStop(0.3, `rgba(230,235,255,${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(200,210,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMouseAperture(mouse: MouseState, dt: number): void {
    const ctx = this.ctx;
    const t = this.time;

    for (let i = 0; i < this.mouseParticles.length; i++) {
      const mp = this.mouseParticles[i];
      mp.angle += mp.speed * dt * 0.6;
      const wobble = Math.sin(t * 2 + mp.offset) * 2.5;
      const r = this.MOUSE_RADIUS + wobble;
      const px = mouse.x + Math.cos(mp.angle) * r;
      const py = mouse.y + Math.sin(mp.angle) * r;
      const size = 1.5 + Math.sin(t * 3 + mp.offset) * 0.6;
      const hue = (230 + i * 7 + t * 30) % 360;
      const rgb = this.manager.hsvToRgb(hue, 0.8, 0.95);

      const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, size * 3);
      glowGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`);
      glowGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(px, py, size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const centerHue = (250 + Math.sin(t * 1.5) * 20 + 360) % 360;
    const cRGB = this.manager.hsvToRgb(centerHue, 0.9, 1);
    ctx.fillStyle = `rgba(${cRGB.r},${cRGB.g},${cRGB.b},0.85)`;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0f0a28');
    grad.addColorStop(0.5, '#140c2e');
    grad.addColorStop(1, '#1a0d36');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const t = this.time;
    for (let i = 0; i < 6; i++) {
      const cx = (Math.sin(t * 0.12 + i * 1.7) * 0.3 + 0.5) * w;
      const cy = (Math.cos(t * 0.08 + i * 2.3) * 0.3 + 0.5) * h;
      const r = (Math.sin(t * 0.15 + i) * 0.15 + 0.35) * Math.max(w, h);
      const hue = 250 + i * 8 + Math.sin(t * 0.2 + i) * 10;
      const rgb = this.manager.hsvToRgb(hue, 0.5, 0.12);
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
      rg.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  render(w: number, h: number, dt: number): void {
    this.time += dt;

    this.drawBackground(w, h);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (const r of this.manager.ripples) {
      this.drawRipple(r);
    }
    this.ctx.restore();

    for (const f of this.manager.flashes) {
      this.drawFlash(f);
    }

    const sortedBubbles = [...this.manager.bubbles].sort((a, b) => a.radius - b.radius);
    for (const b of sortedBubbles) {
      const pulse = 1 + Math.sin(b.pulsePhase) * 0.035;
      const displayRadius = b.radius * pulse;
      const glowOpacity = 0.2 * (0.4 + displayRadius / b.maxRadius * 0.6);
      this.drawGlow(b.x, b.y, displayRadius, b.hue, glowOpacity);
    }

    for (const b of sortedBubbles) {
      const pulse = 1 + Math.sin(b.pulsePhase) * 0.035;
      const displayRadius = b.radius * pulse;
      this.drawBubbleSurface(b, displayRadius);
    }

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of this.manager.particles) {
      this.drawParticle(p);
    }
    this.ctx.restore();

    this.drawMouseAperture(this.manager.mouse, dt);
  }
}

const MAX_BUBBLE_DIAMETER = 264;
