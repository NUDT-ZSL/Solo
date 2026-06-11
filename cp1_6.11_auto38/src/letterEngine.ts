import { SeasonName, SeasonTheme, seasonThemes, lerpColor } from './seasonThemes';

export const PETAL_SWAY_AMPLITUDE = 20;
export const PETAL_FALL_SPEED_MIN = 0.3;
export const PETAL_FALL_SPEED_MAX = 0.6;
export const WAVE_RESET_INTERVAL_MS = 1500;
export const LEAF_SPIRAL_RADIUS_MAX = 35;
export const SNOW_ROTATION_MIN_DEG = 0.5;
export const SNOW_ROTATION_MAX_DEG = 2;
export const PARTICLE_COUNT_GLOBAL_MIN = 80;
export const PARTICLE_COUNT_GLOBAL_MAX = 200;
export const PARTICLE_SIZE_MIN = 2;
export const PARTICLE_SIZE_MAX = 6;

export interface Particle {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  colorT: number;
  vx: number;
  vy: number;
  phase: number;
  life: number;
  spiralSeed: number;
  baseX: number;
}

export class LetterEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private letterEdge: HTMLElement;

  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private currentSeason: SeasonName;
  private theme: SeasonTheme;
  private particles: Particle[] = [];

  private particleCountOverride: number | null = null;
  private waveResetTimerId: number | null = null;
  private animFrameId: number = 0;
  private lastTime: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    letterEdge: HTMLElement,
    initialSeason: SeasonName = 'spring'
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.letterEdge = letterEdge;
    this.currentSeason = initialSeason;
    this.theme = seasonThemes[initialSeason];
    this.initCanvas();
    this.initParticles();
    this.applyEdgeEffect();
    this.startWaveResetTimer();
  }

  private initCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  }

  resize(): void {
    this.initCanvas();
  }

  setParticleCount(count: number): void {
    const clamped = Math.max(
      PARTICLE_COUNT_GLOBAL_MIN,
      Math.min(PARTICLE_COUNT_GLOBAL_MAX, Math.round(count))
    );
    this.particleCountOverride = clamped;
    this.initParticles();
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  private resolveParticleCount(): number {
    if (this.particleCountOverride !== null) {
      return this.particleCountOverride;
    }
    const cfg = this.theme.particle;
    return Math.floor(cfg.minCount + Math.random() * (cfg.maxCount - cfg.minCount));
  }

  private initParticles(): void {
    const count = this.resolveParticleCount();
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomY: boolean = false): Particle {
    const cfg = this.theme.particle;
    const size = PARTICLE_SIZE_MIN + Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
    const behavior = cfg.behavior;
    let x: number, y: number, vx: number, vy: number, phase: number, baseX: number;

    switch (behavior) {
      case 'petal':
        x = Math.random() * this.width;
        baseX = x;
        y = randomY ? Math.random() * this.height : -size * 2;
        vx = 0;
        vy = PETAL_FALL_SPEED_MIN + Math.random() * (PETAL_FALL_SPEED_MAX - PETAL_FALL_SPEED_MIN);
        phase = Math.random() * Math.PI * 2;
        break;
      case 'wave':
        x = -size * 2 - Math.random() * this.width * 0.5;
        baseX = x;
        y = size + Math.random() * (this.height - size * 2);
        vx = (this.width / 90) * (0.7 + Math.random() * 0.6);
        vy = 0;
        phase = Math.random() * Math.PI * 2;
        break;
      case 'leaf':
        x = Math.random() * this.width;
        baseX = x;
        y = randomY ? Math.random() * this.height : -size * 3;
        vx = 0;
        vy = 0.4 + Math.random() * 0.3;
        phase = Math.random() * Math.PI * 2;
        break;
      case 'snow':
      default:
        x = Math.random() * this.width;
        baseX = x;
        y = randomY ? Math.random() * this.height : -size * 2;
        vx = (Math.random() - 0.5) * 0.3;
        vy = 0.2 + Math.random() * 0.3;
        phase = Math.random() * Math.PI * 2;
        break;
    }

    return {
      x, y, size, baseX,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * (behavior === 'snow' ? 0.035 : 0.06),
      opacity: 0.5 + Math.random() * 0.5,
      colorT: Math.random(),
      vx, vy, phase,
      life: 0,
      spiralSeed: Math.random() * Math.PI * 2
    };
  }

  setSeason(season: SeasonName): void {
    this.currentSeason = season;
    this.theme = seasonThemes[season];
    this.initParticles();
    this.applyEdgeEffect();
    this.restartWaveResetTimer();
  }

  getSeason(): SeasonName {
    return this.currentSeason;
  }

  getPrimaryColor(): string {
    return this.theme.particle.primaryColor;
  }

  getTheme(): SeasonTheme {
    return this.theme;
  }

  private applyEdgeEffect(): void {
    const effect = this.theme.edgeEffect;
    if (effect === 'burn') {
      this.letterEdge.style.background = `
        radial-gradient(ellipse at 20% 0%, rgba(139,69,19,0.15) 0%, transparent 40%),
        radial-gradient(ellipse at 80% 0%, rgba(139,69,19,0.12) 0%, transparent 35%),
        radial-gradient(ellipse at 0% 80%, rgba(139,69,19,0.1) 0%, transparent 30%),
        radial-gradient(ellipse at 100% 20%, rgba(139,69,19,0.13) 0%, transparent 35%),
        radial-gradient(ellipse at 50% 100%, rgba(139,69,19,0.1) 0%, transparent 30%),
        inset 0 0 60px rgba(139,69,19,0.08)
      `;
      this.letterEdge.style.boxShadow = 'inset 0 0 40px rgba(120, 60, 20, 0.12)';
    } else {
      const inkColor = this.theme.particle.colorStart;
      this.letterEdge.style.background = `
        radial-gradient(ellipse at 15% 10%, ${inkColor}15 0%, transparent 45%),
        radial-gradient(ellipse at 85% 15%, ${inkColor}12 0%, transparent 40%),
        radial-gradient(ellipse at 10% 90%, ${inkColor}10 0%, transparent 35%),
        radial-gradient(ellipse at 90% 85%, ${inkColor}13 0%, transparent 40%),
        inset 0 0 80px ${inkColor}08
      `;
      this.letterEdge.style.boxShadow = `inset 0 0 50px ${inkColor}10`;
    }
  }

  private startWaveResetTimer(): void {
    if (this.theme.particle.behavior !== 'wave') return;
    this.stopWaveResetTimer();
    const reset = () => {
      for (let i = 0; i < this.particles.length; i++) {
        if (Math.random() < 0.7) {
          this.particles[i] = this.createParticle(false);
        }
      }
    };
    this.waveResetTimerId = window.setInterval(reset, WAVE_RESET_INTERVAL_MS);
  }

  private stopWaveResetTimer(): void {
    if (this.waveResetTimerId !== null) {
      clearInterval(this.waveResetTimerId);
      this.waveResetTimerId = null;
    }
  }

  private restartWaveResetTimer(): void {
    this.stopWaveResetTimer();
    this.startWaveResetTimer();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getDimensions(): { width: number; height: number; dpr: number } {
    return { width: this.width, height: this.height, dpr: this.dpr };
  }

  start(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min(time - this.lastTime, 33);
      this.lastTime = time;
      this.update(dt);
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.stopWaveResetTimer();
  }

  private update(dt: number): void {
    const cfg = this.theme.particle;
    const behavior = cfg.behavior;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.phase += 0.02;
      p.life += dt;

      switch (behavior) {
        case 'petal': {
          const sway = Math.sin(p.phase) * PETAL_SWAY_AMPLITUDE;
          p.x = p.baseX + sway + Math.cos(p.phase * 0.5) * 2;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;
          if (p.y > this.height + p.size * 2 || p.x < -p.size * 4 || p.x > this.width + p.size * 4) {
            this.particles[i] = this.createParticle(false);
            this.particles[i].baseX = Math.random() * this.width;
            this.particles[i].x = this.particles[i].baseX;
          }
          break;
        }
        case 'wave': {
          p.x += p.vx;
          p.y += Math.sin(p.phase * 1.5) * 0.4;
          const speedFactor = Math.min(1, p.vx / ((this.width / 90) * 1.3));
          p.opacity = 0.3 + speedFactor * 0.6;
          p.rotation += p.rotationSpeed * 0.3;
          if (p.x > this.width + p.size * 3) {
            this.particles[i] = this.createParticle(false);
          }
          break;
        }
        case 'leaf': {
          const progressT = Math.min(1, p.y / this.height);
          const radius = LEAF_SPIRAL_RADIUS_MAX * (1 - progressT);
          const angle = p.spiralSeed + p.phase * 1.5;
          p.x = p.baseX + Math.cos(angle) * radius + Math.sin(p.y * 0.008) * 6;
          p.y += p.vy;
          p.rotation += p.rotationSpeed * 1.5;
          if (p.y > this.height + p.size * 3) {
            this.particles[i] = this.createParticle(false);
            this.particles[i].baseX = Math.random() * this.width;
            this.particles[i].x = this.particles[i].baseX;
          }
          break;
        }
        case 'snow':
        default: {
          p.x += p.vx + Math.sin(p.phase) * 0.15;
          p.y += p.vy;
          const rotDeg = SNOW_ROTATION_MIN_DEG + Math.random() * (SNOW_ROTATION_MAX_DEG - SNOW_ROTATION_MIN_DEG);
          p.rotation += rotDeg * (Math.PI / 180);
          if (p.y > this.height + p.size * 2) {
            this.particles[i] = this.createParticle(false);
            this.particles[i].x = Math.random() * this.width;
          }
          break;
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    const cfg = this.theme.particle;

    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      const color = lerpColor(cfg.colorStart, cfg.colorEnd, p.colorT);

      switch (cfg.behavior) {
        case 'petal':
          this.drawPetal(ctx, p.size, color);
          break;
        case 'wave':
          this.drawWave(ctx, p.size, color);
          break;
        case 'leaf':
          this.drawLeaf(ctx, p.size, color);
          break;
        case 'snow':
        default:
          this.drawSnow(ctx, p.size, color);
          break;
      }
      ctx.restore();
    }
  }

  private drawPetal(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    grad.addColorStop(0, color);
    grad.addColorStop(1, lerpColor(this.theme.particle.colorEnd, '#FFFFFF', 0.4));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.6, -size * 0.5, size * 0.7, size * 0.5, 0, size);
    ctx.bezierCurveTo(-size * 0.7, size * 0.5, -size * 0.6, -size * 0.5, 0, -size);
    ctx.fill();
  }

  private drawWave(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.8, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.2, size * 1.2, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }

  private drawLeaf(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    const s = size * 1.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.3, s * 0.5, s * 0.3);
    ctx.quadraticCurveTo(s * 0.2, s * 0.9, 0, s * 0.8);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.9, -s * 0.5, s * 0.3);
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.3, 0, -s);
    ctx.fill();
    ctx.strokeStyle = lerpColor(color, '#000000', 0.2);
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(0, s * 0.6);
    ctx.stroke();
  }

  private drawSnow(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = size * 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha *= 0.7;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.15;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(0, size);
      ctx.stroke();
      ctx.restore();
    }
  }
}
