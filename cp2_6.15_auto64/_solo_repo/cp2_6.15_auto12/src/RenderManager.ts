import type { KeyInputData } from './InputManager';

export interface RenderParams {
  minRadius: number;
  maxRadius: number;
  speedMultiplier: number;
  hueShift: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  baseHue: number;
  hueOffset: number;
  alpha: number;
  scale: number;
  bornAt: number;
  rippleTime: number;
  state: 'normal' | 'exploding' | 'converging' | 'reborn';
  stateStartTime: number;
  originX: number;
  originY: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

interface BurstState {
  phase: 'idle' | 'exploding' | 'converging' | 'reborn';
  startTime: number;
}

const NEON_COLORS_HUES = [330, 170, 50, 270, 15];

const BIRTH_DURATION = 300;
const RIPPLE_DURATION = 600;
const EXPLODE_DURATION = 800;
const CONVERGE_DURATION = 1200;
const PARAM_TRANSITION_DURATION = 500;
const GROWTH_RATE_PER_SEC = 2;
const MAX_RADIUS_FROM_HOLD = 32;
const PULSE_MAX_RADIUS = 250;

export class RenderManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private particleIdCounter = 0;
  private rippleIdCounter = 0;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private fps = 0;
  private fpsFrames = 0;
  private fpsLastUpdate = 0;

  private targetParams: RenderParams;
  private currentParams: RenderParams;
  private paramsTransitionStart: RenderParams | null = null;
  private paramsTransitionTime = 0;

  private burstState: BurstState = { phase: 'idle', startTime: 0 };
  private pulseWave: { startTime: number; active: boolean } = { startTime: 0, active: false };

  private width = 500;
  private height = 500;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;

    this.targetParams = {
      minRadius: 8,
      maxRadius: 24,
      speedMultiplier: 1,
      hueShift: 0,
    };
    this.currentParams = { ...this.targetParams };
  }

  start(): void {
    this.lastTime = performance.now();
    this.fpsLastUpdate = this.lastTime;
    this.loop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  addParticle(data: KeyInputData): void {
    if (this.burstState.phase !== 'idle' && this.burstState.phase !== 'reborn') return;

    const { x, y, duration, type } = data;

    if (type === 'keydown' || type === 'keypress') {
      const radius = this.calculateRadius(duration, type);
      const hue = this.calculateHue(duration);

      const particle: Particle = {
        id: this.particleIdCounter++,
        x: x * this.width,
        y: y * this.height,
        vx: 0,
        vy: 0,
        radius: 0,
        targetRadius: radius,
        baseHue: hue,
        hueOffset: 0,
        alpha: 1,
        scale: 0,
        bornAt: performance.now(),
        rippleTime: 0,
        state: 'normal',
        stateStartTime: 0,
        originX: x * this.width,
        originY: y * this.height,
      };

      this.particles.push(particle);
      this.addRipple(particle.x, particle.y, radius * 1.5);
    }
  }

  private calculateRadius(duration: number, type: string): number {
    const { minRadius, maxRadius } = this.currentParams;
    let baseRadius = minRadius + Math.random() * (maxRadius - minRadius);

    if (type === 'keypress' && duration > 0) {
      const growth = (duration / 1000) * GROWTH_RATE_PER_SEC;
      baseRadius = Math.min(baseRadius + growth, MAX_RADIUS_FROM_HOLD);
    }

    return baseRadius;
  }

  private calculateHue(duration: number): number {
    const baseHue = NEON_COLORS_HUES[Math.floor(Math.random() * NEON_COLORS_HUES.length)];
    if (duration > 0) {
      const shiftRatio = Math.min(duration / 2000, 1);
      const redHue = 0;
      return baseHue + (redHue - baseHue) * shiftRatio;
    }
    return baseHue;
  }

  private addRipple(x: number, y: number, maxRadius: number): void {
    this.ripples.push({
      id: this.rippleIdCounter++,
      x,
      y,
      maxRadius,
      startTime: performance.now(),
      duration: RIPPLE_DURATION,
    });
  }

  setParams(params: Partial<RenderParams>): void {
    this.paramsTransitionStart = { ...this.currentParams };
    this.paramsTransitionTime = performance.now();
    this.targetParams = { ...this.targetParams, ...params };
  }

  triggerSpaceBurst(charCount: number): void {
    if (this.burstState.phase !== 'idle') return;

    this.burstState = { phase: 'exploding', startTime: performance.now() };
    this.pulseWave = { startTime: performance.now(), active: true };

    for (const p of this.particles) {
      p.state = 'exploding';
      p.stateStartTime = performance.now();
      const angle = Math.random() * Math.PI * 2;
      const speed = (100 + Math.random() * 200) * this.currentParams.speedMultiplier;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    }

    setTimeout(() => {
      this.burstState = { phase: 'converging', startTime: performance.now() };
      for (const p of this.particles) {
        p.state = 'converging';
        p.stateStartTime = performance.now();
      }
    }, EXPLODE_DURATION);

    setTimeout(() => {
      this.burstState = { phase: 'reborn', startTime: performance.now() };
      this.particles = [];

      const newCount = Math.max(charCount * 2, 20);
      for (let i = 0; i < newCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 200;
        const cx = this.width / 2;
        const cy = this.height / 2;

        const radius = this.currentParams.minRadius + Math.random() * (this.currentParams.maxRadius - this.currentParams.minRadius);
        const hue = NEON_COLORS_HUES[Math.floor(Math.random() * NEON_COLORS_HUES.length)];

        this.particles.push({
          id: this.particleIdCounter++,
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          radius,
          targetRadius: radius,
          baseHue: hue,
          hueOffset: 0,
          alpha: 1,
          scale: 0,
          bornAt: performance.now(),
          rippleTime: 0,
          state: 'reborn',
          stateStartTime: performance.now(),
          originX: cx + Math.cos(angle) * dist,
          originY: cy + Math.sin(angle) * dist,
        });
      }

      setTimeout(() => {
        this.burstState = { phase: 'idle', startTime: 0 };
        for (const p of this.particles) {
          p.state = 'normal';
        }
      }, 500);
    }, EXPLODE_DURATION + CONVERGE_DURATION);
  }

  exportPNG(): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    for (const p of this.particles) {
      const hue = (p.baseHue + this.currentParams.hueShift + p.hueOffset) % 360;
      const r = p.radius * p.scale;
      if (r <= 0) continue;

      tempCtx.beginPath();
      tempCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      tempCtx.fillStyle = `hsla(${hue}, 100%, 60%, ${p.alpha})`;
      tempCtx.fill();

      const gradient = tempCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${p.alpha * 0.5})`);
      gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      tempCtx.beginPath();
      tempCtx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
      tempCtx.fillStyle = gradient;
      tempCtx.fill();
    }

    return tempCanvas.toDataURL('image/png');
  }

  getFPS(): number {
    return this.fps;
  }

  private loop = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.fpsFrames++;
    if (now - this.fpsLastUpdate >= 1000) {
      this.fps = Math.round(this.fpsFrames * 1000 / (now - this.fpsLastUpdate));
      this.fpsFrames = 0;
      this.fpsLastUpdate = now;
    }

    this.updateParamsTransition(now);
    this.updateParticles(deltaTime, now);
    this.updateRipples(now);
    this.render(now);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private updateParamsTransition(now: number): void {
    if (!this.paramsTransitionStart) return;

    const elapsed = now - this.paramsTransitionTime;
    const progress = Math.min(elapsed / PARAM_TRANSITION_DURATION, 1);
    const eased = this.easeOutCubic(progress);

    for (const key of Object.keys(this.targetParams) as (keyof RenderParams)[]) {
      const start = this.paramsTransitionStart[key];
      const end = this.targetParams[key];
      (this.currentParams as unknown as Record<string, number>)[key] = start + (end - start) * eased;
    }

    if (progress >= 1) {
      this.paramsTransitionStart = null;
    }
  }

  private updateParticles(deltaTime: number, now: number): void {
    const dt = deltaTime / 1000;
    const cx = this.width / 2;
    const cy = this.height / 2;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      const age = now - p.bornAt;
      if (age < BIRTH_DURATION) {
        p.scale = this.easeOutBack(age / BIRTH_DURATION);
      } else {
        p.scale = 1;
      }

      if (p.radius < p.targetRadius) {
        p.radius = Math.min(p.radius + dt * 50, p.targetRadius);
      }

      if (p.state === 'exploding') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      } else if (p.state === 'converging') {
        const stateAge = now - p.stateStartTime;
        const progress = Math.min(stateAge / CONVERGE_DURATION, 1);
        const eased = this.easeOutCubic(progress);

        const startX = p.originX;
        const startY = p.originY;
        if (stateAge < 16) {
          p.originX = p.x;
          p.originY = p.y;
        }

        p.x = p.originX + (cx - p.originX) * eased;
        p.y = p.originY + (cy - p.originY) * eased;

        p.radius = p.targetRadius * (1 - eased * 0.5);
      } else if (p.state === 'reborn') {
        const stateAge = now - p.stateStartTime;
        if (stateAge < 500) {
          p.scale = this.easeOutBack(stateAge / 500);
        } else {
          p.scale = 1;
        }
      }
    }
  }

  private updateRipples(now: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (now - r.startTime >= r.duration) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private render(now: number): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    const bgGradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width / 2
    );
    bgGradient.addColorStop(0, '#1a1a3a');
    bgGradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const r of this.ripples) {
      const progress = (now - r.startTime) / r.duration;
      if (progress >= 1) continue;

      const radius = r.maxRadius * progress;
      const alpha = 0.6 * (1 - progress);

      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (this.pulseWave.active) {
      const elapsed = now - this.pulseWave.startTime;
      const progress = Math.min(elapsed / 800, 1);
      const radius = PULSE_MAX_RADIUS * progress;
      const alpha = 1 - progress;

      if (progress < 1) {
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        this.pulseWave.active = false;
      }
    }

    for (const p of this.particles) {
      const hue = (p.baseHue + this.currentParams.hueShift + p.hueOffset) % 360;
      const r = p.radius * p.scale;
      if (r <= 0) continue;

      const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
      glowGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${p.alpha * 0.6})`);
      glowGradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${p.alpha * 0.2})`);
      glowGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, 65%, ${p.alpha})`;
      ctx.fill();

      const innerGradient = ctx.createRadialGradient(
        p.x - r * 0.3, p.y - r * 0.3, 0,
        p.x, p.y, r
      );
      innerGradient.addColorStop(0, `hsla(${hue}, 100%, 90%, ${p.alpha * 0.8})`);
      innerGradient.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = innerGradient;
      ctx.fill();
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  destroy(): void {
    this.stop();
    this.particles = [];
    this.ripples = [];
  }
}
