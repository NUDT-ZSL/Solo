import { ElementType, getElementColor, Point } from './runeRecognizer';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  colorStart: string;
  colorEnd: string;
  trail: Point[];
  trailLength: number;
  mode: 'spiral' | 'lissajous' | 'explode' | 'combo';
  angle: number;
  angularSpeed: number;
  radius: number;
  radiusSpeed: number;
  focusX: number;
  focusY: number;
  lissajousA: number;
  lissajousB: number;
  lissajousDelta: number;
  lissajousScale: number;
  phase: number;
  comboType?: 'fire-wind' | 'thunder-earth' | 'fire-thunder' | 'fire-earth' | 'thunder-wind' | 'wind-earth';
}

interface ParticleSystemOptions {
  maxParticles?: number;
}

export class ParticleEngine {
  private particles: Particle[] = [];
  private maxParticles: number;
  private particlePool: Particle[] = [];
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private lastOffscreenUpdate: number = 0;
  private offscreenUpdateInterval: number = 33;
  private centerX: number = 0;
  private centerY: number = 0;
  private fpsMonitor: { frames: number; lastTime: number; currentFps: number } = { frames: 0, lastTime: 0, currentFps: 60 };

  constructor(options: ParticleSystemOptions = {}) {
    this.maxParticles = options.maxParticles || 500;
  }

  private initOffscreen(width: number, height: number): void {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: false })!;
    }
    const dpr = window.devicePixelRatio || 1;
    this.offscreenCanvas.width = width * dpr;
    this.offscreenCanvas.height = height * dpr;
    this.offscreenCtx!.scale(dpr, dpr);
  }

  setCenter(x: number, y: number): void {
    this.centerX = x;
    this.centerY = y;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  private lerpColor(start: string, end: string, t: number): string {
    const s = this.hexToRgb(start);
    const e = this.hexToRgb(end);
    const r = Math.round(s.r + (e.r - s.r) * t);
    const g = Math.round(s.g + (e.g - s.g) * t);
    const b = Math.round(s.b + (e.b - s.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private getDistanceToCenter(p: Particle): number {
    return Math.sqrt((p.x - this.centerX) ** 2 + (p.y - this.centerY) ** 2);
  }

  private getLODLevel(p: Particle): 'high' | 'medium' | 'low' {
    const dist = this.getDistanceToCenter(p);
    const fps = this.fpsMonitor.currentFps;

    if (fps < 30) {
      if (dist > 200) return 'low';
      if (dist > 100) return 'medium';
      return 'medium';
    }

    if (dist > 250) return 'low';
    if (dist > 120) return 'medium';
    return 'high';
  }

  private acquireParticle(): Particle | null {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    if (this.particles.length >= this.maxParticles) {
      return null;
    }
    return {} as Particle;
  }

  private releaseParticle(p: Particle): void {
    if (this.particlePool.length < this.maxParticles) {
      p.trail = [];
      this.particlePool.push(p);
    }
  }

  spawnElementParticles(
    element: ElementType,
    centerX: number,
    centerY: number,
    count: number = 80,
    isCombo: boolean = false,
    comboType?: Particle['comboType']
  ): void {
    this.centerX = centerX;
    this.centerY = centerY;

    const colors = getElementColor(element);
    const actualCount = isCombo ? Math.min(count * 2, this.maxParticles - this.particles.length) : count;

    for (let i = 0; i < actualCount; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const size = 2 + Math.random() * 4;

      p.x = centerX;
      p.y = centerY;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = size;
      p.alpha = 1;
      p.life = 0;
      p.maxLife = 4 + Math.random() * 3;
      p.colorStart = colors.start;
      p.colorEnd = colors.end;
      p.trail = [];
      p.trailLength = isCombo ? 20 + Math.floor(Math.random() * 15) : 15 + Math.floor(Math.random() * 10);
      p.angle = angle;
      p.angularSpeed = (Math.random() - 0.5) * (isCombo ? 0.05 : 0.03);
      p.radius = 0;
      p.radiusSpeed = 0.5 + Math.random() * (isCombo ? 2.0 : 1.5);
      p.focusX = centerX + (Math.random() - 0.5) * 40;
      p.focusY = centerY + (Math.random() - 0.5) * 40;
      p.lissajousA = 2 + Math.floor(Math.random() * 5);
      p.lissajousB = 3 + Math.floor(Math.random() * 5);
      p.lissajousDelta = Math.random() * Math.PI;
      p.lissajousScale = isCombo ? 80 + Math.random() * 120 : 50 + Math.random() * 100;
      p.phase = Math.random() * Math.PI * 2;
      p.comboType = comboType;

      if (comboType) {
        p.mode = 'combo';
      } else if (isCombo) {
        p.mode = 'lissajous';
      } else {
        p.mode = 'spiral';
      }

      this.particles.push(p);
    }
  }

  spawnComboParticles(
    elements: ElementType[],
    comboType: Particle['comboType'],
    centerX: number,
    centerY: number
  ): void {
    this.centerX = centerX;
    this.centerY = centerY;

    const baseCount = 100;
    for (const element of elements) {
      this.spawnElementParticles(element, centerX, centerY, baseCount, true, comboType);
    }
  }

  update(dt: number): void {
    const toRemove: number[] = [];

    this.fpsMonitor.frames++;
    const now = performance.now();
    if (now - this.fpsMonitor.lastTime >= 500) {
      this.fpsMonitor.currentFps = (this.fpsMonitor.frames * 1000) / (now - this.fpsMonitor.lastTime);
      this.fpsMonitor.frames = 0;
      this.fpsMonitor.lastTime = now;
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        toRemove.push(i);
        continue;
      }

      const lod = this.getLODLevel(p);

      let trailStep = 1;
      if (lod === 'medium') trailStep = 2;
      if (lod === 'low') trailStep = 4;

      if (Math.floor(p.life * 60) % trailStep === 0) {
        p.trail.push({ x: p.x, y: p.y });
        const maxTrail = lod === 'high' ? p.trailLength : Math.floor(p.trailLength / 2);
        if (p.trail.length > maxTrail) {
          p.trail.shift();
        }
      }

      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio < 0.1
        ? lifeRatio * 10
        : lifeRatio > 0.8
        ? (1 - lifeRatio) * 5
        : 1;

      this.updateParticleMotion(p, dt);
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this.particles.splice(idx, 1)[0];
      this.releaseParticle(p);
    }
  }

  private updateParticleMotion(p: Particle, dt: number): void {
    if (p.mode === 'explode') {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vy += 0.05;
    } else if (p.mode === 'spiral') {
      if (p.radius < 100 + Math.random() * 50) {
        p.radius += p.radiusSpeed * dt * 60;
      }
      p.angle += p.angularSpeed * dt * 60;
      p.x = p.focusX + Math.cos(p.angle) * p.radius;
      p.y = p.focusY + Math.sin(p.angle) * p.radius;
      p.focusX += (p.vx * 0.02) * dt * 60;
      p.focusY += (p.vy * 0.02) * dt * 60;
    } else if (p.mode === 'lissajous') {
      p.phase += p.angularSpeed * dt * 60 * 2;
      const t = p.phase;
      const lx = Math.sin(p.lissajousA * t + p.lissajousDelta) * p.lissajousScale;
      const ly = Math.sin(p.lissajousB * t) * p.lissajousScale * 0.8;
      p.x = p.focusX + lx;
      p.y = p.focusY + ly;

      if (p.lissajousScale > 40) {
        p.lissajousScale -= 0.3 * dt * 60;
      }
    } else if (p.mode === 'combo') {
      p.phase += p.angularSpeed * dt * 60 * 1.5;
      const t = p.phase;

      if (p.comboType === 'fire-wind') {
        const baseR = 60 + Math.sin(t * 3) * 40 + (p.life / p.maxLife) * 100;
        const vortexAngle = t * 2;
        const lx = Math.cos(vortexAngle) * baseR + Math.sin(t * 5) * 20;
        const ly = Math.sin(vortexAngle) * baseR * 0.8 + Math.cos(t * 3) * 15;
        p.x = p.focusX + lx;
        p.y = p.focusY + ly;
        p.size += 0.02 * dt * 60;
      } else if (p.comboType === 'thunder-earth') {
        const lx = Math.sin(p.lissajousA * t + p.lissajousDelta) * p.lissajousScale * 0.6
          + Math.sin(t * 7) * 15;
        const ly = Math.sin(p.lissajousB * t) * p.lissajousScale * 0.5
          + Math.cos(t * 5) * 15;
        p.x = p.focusX + lx;
        p.y = p.focusY + ly;
      } else {
        const lx = (Math.sin(p.lissajousA * t + p.lissajousDelta) + Math.cos(t * 2) * 0.3) * p.lissajousScale;
        const ly = (Math.sin(p.lissajousB * t) + Math.sin(t * 3) * 0.2) * p.lissajousScale * 0.8;
        p.x = p.focusX + lx;
        p.y = p.focusY + ly;
      }

      if (p.lissajousScale > 50) {
        p.lissajousScale -= 0.2 * dt * 60;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.initOffscreen(width, height);
    if (!this.offscreenCtx || !this.offscreenCanvas) return;

    const now = performance.now();
    const shouldUpdateOffscreen = now - this.lastOffscreenUpdate >= this.offscreenUpdateInterval;

    if (shouldUpdateOffscreen) {
      this.lastOffscreenUpdate = now;
      const octx = this.offscreenCtx;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      const dpr = window.devicePixelRatio || 1;
      octx.scale(dpr, dpr);

      octx.save();
      octx.globalCompositeOperation = 'lighter';

      const sortedParticles = [...this.particles].sort((a, b) => {
        return this.getDistanceToCenter(a) - this.getDistanceToCenter(b);
      });

      for (const p of sortedParticles) {
        this.renderParticle(octx, p);
      }

      octx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);
    ctx.restore();
  }

  private renderParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const lod = this.getLODLevel(p);
    const colorT = (Math.sin(p.phase * 2) + 1) / 2;
    const color = this.lerpColor(p.colorStart, p.colorEnd, colorT);

    if (lod !== 'low' && p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      const step = lod === 'high' ? 1 : 2;
      for (let i = step; i < p.trail.length; i += step) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = p.size * (lod === 'high' ? 0.6 : 0.4);
      ctx.lineCap = 'round';
      ctx.globalAlpha = p.alpha * (lod === 'high' ? 0.4 : 0.25);
      ctx.stroke();
    }

    const glowSize = lod === 'high' ? p.size * 2.5 : lod === 'medium' ? p.size * 2 : p.size * 1.5;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);

    gradient.addColorStop(0, color);
    gradient.addColorStop(0.4, color);
    gradient.addColorStop(1, 'transparent');

    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    if (lod === 'high') {
      ctx.globalAlpha = p.alpha * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  clear(): void {
    for (const p of this.particles) {
      this.releaseParticle(p);
    }
    this.particles = [];

    if (this.offscreenCtx && this.offscreenCanvas) {
      this.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  getFps(): number {
    return this.fpsMonitor.currentFps;
  }

  setFocusPoint(x: number, y: number): void {
    for (const p of this.particles) {
      p.focusX = x;
      p.focusY = y;
    }
    this.centerX = x;
    this.centerY = y;
  }
}

interface StarParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export class Starfield {
  private stars: StarParticle[] = [];
  private width: number = 0;
  private height: number = 0;

  constructor(count: number = 150) {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.7,
        speed: 0.02 + Math.random() * 0.08,
        twinkleSpeed: 0.01 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(dt: number): void {
    for (const star of this.stars) {
      star.y += star.speed * dt * 60 * 0.1;
      star.twinklePhase += star.twinkleSpeed * dt * 60;

      if (star.y > 1.1) {
        star.y = -0.1;
        star.x = Math.random();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      const x = star.x * this.width;
      const y = star.y * this.height;
      const twinkle = 0.5 + Math.sin(star.twinklePhase) * 0.5;
      const alpha = star.alpha * twinkle;

      ctx.fillStyle = `rgba(200, 180, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();

      if (star.size > 1.5) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, star.size * 3);
        glow.addColorStop(0, `rgba(200, 180, 255, ${alpha * 0.5})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, star.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
