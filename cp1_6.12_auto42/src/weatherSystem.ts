import { Particle, ParticleFactory, WeatherType } from './particles';

export interface WeatherConfig {
  bgStart: string;
  bgEnd: string;
  accentColor: string;
  uiBg: string;
  uiBorder: string;
  textColor: string;
  flashColor: string;
  name: string;
}

export const weatherConfigs: Record<WeatherType, WeatherConfig> = {
  sunny: {
    bgStart: '#87CEEB',
    bgEnd: '#FFD700',
    accentColor: '#FFA500',
    uiBg: 'rgba(255, 255, 255, 0.2)',
    uiBorder: 'rgba(255, 255, 255, 0.3)',
    textColor: '#333333',
    flashColor: 'rgba(255, 200, 100, 0)',
    name: '晴天'
  },
  rainy: {
    bgStart: '#4A5568',
    bgEnd: '#2D3748',
    accentColor: '#4299E1',
    uiBg: 'rgba(0, 0, 0, 0.3)',
    uiBorder: 'rgba(255, 255, 255, 0.1)',
    textColor: '#E2E8F0',
    flashColor: 'rgba(66, 153, 225, 0)',
    name: '雨天'
  },
  snowy: {
    bgStart: '#E2E8F0',
    bgEnd: '#CBD5E0',
    accentColor: '#A0AEC0',
    uiBg: 'rgba(255, 255, 255, 0.4)',
    uiBorder: 'rgba(255, 255, 255, 0.5)',
    textColor: '#2D3748',
    flashColor: 'rgba(255, 255, 255, 0)',
    name: '雪天'
  },
  thunder: {
    bgStart: '#2D3748',
    bgEnd: '#1A202C',
    accentColor: '#9F7AEA',
    uiBg: 'rgba(0, 0, 0, 0.4)',
    uiBorder: 'rgba(159, 122, 234, 0.3)',
    textColor: '#E2E8F0',
    flashColor: 'rgba(200, 180, 255, 0.25)',
    name: '雷暴'
  }
};

class ParticlePool {
  private pool: Particle[] = [];
  private type: WeatherType;
  private activeCount: number = 0;
  private preallocated: boolean = false;

  constructor(type: WeatherType, maxSize: number = 2000) {
    this.type = type;
    this.preallocate(maxSize);
  }

  private preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = ParticleFactory.create(this.type);
      particle.active = false;
      this.pool.push(particle);
    }
    this.preallocated = true;
  }

  public acquire(width: number, height: number, fromTop: boolean = false): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        this.pool[i].init(width, height, fromTop);
        this.activeCount++;
        return this.pool[i];
      }
    }
    return null;
  }

  public acquireBatch(count: number, width: number, height: number, fromTop: boolean = false): number {
    let acquired = 0;
    for (let i = 0; i < this.pool.length && acquired < count; i++) {
      if (!this.pool[i].active) {
        this.pool[i].init(width, height, fromTop);
        acquired++;
      }
    }
    this.activeCount += acquired;
    return acquired;
  }

  public deactivateAll(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
    this.activeCount = 0;
  }

  public setActiveCountImmediately(count: number, width: number, height: number, fromTop: boolean = false): void {
    let currentActive = 0;

    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        currentActive++;
        if (currentActive > count) {
          this.pool[i].active = false;
          this.activeCount--;
        }
      } else if (currentActive < count) {
        this.pool[i].init(width, height, fromTop);
        currentActive++;
        this.activeCount++;
      }
    }
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public updateActiveCount(): void {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) count++;
    }
    this.activeCount = count;
  }

  public getAllParticles(): Particle[] {
    return this.pool;
  }

  public getType(): WeatherType {
    return this.type;
  }

  public fadeOutAll(dt: number, fadeSpeed: number): boolean {
    let allInactive = true;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.active) {
        p.alpha -= fadeSpeed * dt;
        if (p.alpha <= 0) {
          p.active = false;
          this.activeCount--;
        } else {
          allInactive = false;
        }
      }
    }
    return allInactive;
  }

  public fadeInAll(dt: number, fadeSpeed: number): boolean {
    let allFadedIn = true;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.active && p.alpha < 1) {
        p.alpha = Math.min(1, p.alpha + fadeSpeed * dt);
        if (p.alpha < 1) allFadedIn = false;
      }
    }
    return allFadedIn;
  }
}

interface ThunderFlashState {
  isFlashing: boolean;
  flashTimer: number;
  flashDuration: number;
  nextFlashDelay: number;
  flashIntensity: number;
  targetIntensity: number;
}

export class WeatherSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private currentWeather: WeatherType = 'sunny';
  private targetWeather: WeatherType = 'sunny';
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 1;

  private particlePools: Map<WeatherType, ParticlePool> = new Map();
  private targetParticleCount: number = 500;
  private maxParticles: number = 2000;

  private lastTime: number = 0;
  private deltaTime: number = 0;
  private fps: number = 60;
  private fpsUpdateTimer: number = 0;
  private frameCount: number = 0;

  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  private thunderFlash: ThunderFlashState = {
    isFlashing: false,
    flashTimer: 0,
    flashDuration: 0.1,
    nextFlashDelay: 2,
    flashIntensity: 0,
    targetIntensity: 0
  };

  private pendingParticleCount: number = 500;
  private particleCountTransitionSpeed: number = 2000;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.initPools();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.pendingParticleCount = this.targetParticleCount;
  }

  private initPools(): void {
    const weatherTypes: WeatherType[] = ['sunny', 'rainy', 'snowy', 'thunder'];
    for (const type of weatherTypes) {
      this.particlePools.set(type, new ParticlePool(type, this.maxParticles));
    }
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const pool = this.particlePools.get(this.currentWeather);
    if (pool) {
      pool.setActiveCountImmediately(this.targetParticleCount, this.width, this.height, false);
    }

    this.applyWeatherStyles(this.currentWeather);
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.frameCount++;
    this.fpsUpdateTimer += this.deltaTime;
    if (this.fpsUpdateTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsUpdateTimer);
      this.frameCount = 0;
      this.fpsUpdateTimer = 0;
    }

    this.update(this.deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private update(dt: number): void {
    this.updateParticleCount(dt);

    if (this.isTransitioning) {
      this.updateTransition(dt);
    }

    this.updateThunderFlash(dt);
    this.updateParticles(dt);
  }

  private updateParticleCount(dt: number): void {
    if (this.isTransitioning) return;

    if (this.pendingParticleCount !== this.targetParticleCount) {
      const diff = this.pendingParticleCount - this.targetParticleCount;
      const maxChange = this.particleCountTransitionSpeed * dt;

      if (Math.abs(diff) <= maxChange) {
        this.targetParticleCount = this.pendingParticleCount;
      } else {
        this.targetParticleCount += Math.sign(diff) * maxChange;
      }

      const currentType = this.getCurrentWeatherType();
      const pool = this.particlePools.get(currentType);
      if (pool) {
        const fromTop = currentType === 'rainy' || currentType === 'snowy' || currentType === 'thunder';
        pool.setActiveCountImmediately(Math.round(this.targetParticleCount), this.width, this.height, fromTop);
      }
    }
  }

  private updateTransition(dt: number): void {
    this.transitionProgress += dt / this.transitionDuration;

    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.isTransitioning = false;

      const oldWeather = this.currentWeather;
      this.currentWeather = this.targetWeather;

      const oldPool = this.particlePools.get(oldWeather);
      if (oldPool) {
        oldPool.deactivateAll();
      }

      const newPool = this.particlePools.get(this.targetWeather);
      if (newPool) {
        const fromTop = this.targetWeather === 'rainy' || this.targetWeather === 'snowy' || this.targetWeather === 'thunder';
        newPool.setActiveCountImmediately(Math.round(this.targetParticleCount), this.width, this.height, fromTop);
      }
      return;
    }

    const fadeSpeed = 5;
    const currentPool = this.particlePools.get(this.currentWeather);
    const targetPool = this.particlePools.get(this.targetWeather);

    if (this.transitionProgress < 0.5) {
      if (currentPool) {
        currentPool.fadeOutAll(dt, fadeSpeed * 2);
      }
      if (targetPool) {
        targetPool.fadeInAll(dt, fadeSpeed * 2);
      }
    } else {
      if (currentPool) {
        currentPool.fadeOutAll(dt, fadeSpeed * 3);
      }
      if (targetPool) {
        targetPool.fadeInAll(dt, fadeSpeed);
      }
    }
  }

  private updateThunderFlash(dt: number): void {
    if (this.getCurrentWeatherType() !== 'thunder') {
      if (this.thunderFlash.flashIntensity > 0) {
        this.thunderFlash.flashIntensity = Math.max(0, this.thunderFlash.flashIntensity - dt * 3);
        this.updateFlashCSSVariable();
      }
      this.thunderFlash.isFlashing = false;
      this.thunderFlash.targetIntensity = 0;
      return;
    }

    if (this.thunderFlash.isFlashing) {
      this.thunderFlash.flashTimer += dt;
      const progress = this.thunderFlash.flashTimer / this.thunderFlash.flashDuration;
      this.thunderFlash.flashIntensity = this.thunderFlash.targetIntensity * Math.max(0, 1 - progress * progress);
      this.updateFlashCSSVariable();

      if (this.thunderFlash.flashTimer >= this.thunderFlash.flashDuration) {
        this.thunderFlash.isFlashing = false;
        this.thunderFlash.nextFlashDelay = 0.3 + Math.random() * 2;
        this.thunderFlash.flashTimer = 0;
        this.thunderFlash.targetIntensity = 0;
      }
    } else {
      this.thunderFlash.flashTimer += dt;
      this.thunderFlash.flashIntensity = Math.max(0, this.thunderFlash.flashIntensity - dt * 2);
      this.updateFlashCSSVariable();

      if (this.thunderFlash.flashTimer >= this.thunderFlash.nextFlashDelay) {
        this.thunderFlash.isFlashing = true;
        this.thunderFlash.flashTimer = 0;
        this.thunderFlash.flashDuration = 0.04 + Math.random() * 0.12;
        this.thunderFlash.targetIntensity = 0.6 + Math.random() * 0.4;
      }
    }
  }

  private updateFlashCSSVariable(): void {
    const intensity = this.thunderFlash.flashIntensity;
    if (intensity > 0) {
      const r = Math.floor(200 + intensity * 55);
      const g = Math.floor(180 + intensity * 75);
      const b = Math.floor(255);
      const a = intensity * 0.25;
      document.documentElement.style.setProperty('--flash-overlay', `rgba(${r}, ${g}, ${b}, ${a})`);
    } else {
      document.documentElement.style.setProperty('--flash-overlay', 'rgba(0, 0, 0, 0)');
    }
  }

  private updateParticles(dt: number): void {
    const currentPool = this.particlePools.get(this.currentWeather);
    if (currentPool) {
      const particles = currentPool.getAllParticles();
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].active) {
          particles[i].update(dt, this.width, this.height);
        }
      }
      currentPool.updateActiveCount();
    }

    if (this.isTransitioning) {
      const targetPool = this.particlePools.get(this.targetWeather);
      if (targetPool) {
        const particles = targetPool.getAllParticles();
        for (let i = 0; i < particles.length; i++) {
          if (particles[i].active) {
            particles[i].update(dt, this.width, this.height);
          }
        }
        targetPool.updateActiveCount();
      }
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (!this.isTransitioning) {
      const pool = this.particlePools.get(this.currentWeather);
      if (pool) {
        const particles = pool.getAllParticles();
        for (let i = 0; i < particles.length; i++) {
          if (particles[i].active) {
            particles[i].draw(this.ctx);
          }
        }
      }
    } else {
      const currentPool = this.particlePools.get(this.currentWeather);
      const targetPool = this.particlePools.get(this.targetWeather);

      const currentAlpha = this.transitionProgress < 0.5
        ? 1
        : Math.max(0, 1 - (this.transitionProgress - 0.5) * 2);

      const targetAlpha = this.transitionProgress < 0.5
        ? Math.max(0, this.transitionProgress * 2)
        : 1;

      if (currentPool && currentAlpha > 0) {
        this.ctx.globalAlpha = currentAlpha;
        const particles = currentPool.getAllParticles();
        for (let i = 0; i < particles.length; i++) {
          if (particles[i].active) {
            particles[i].draw(this.ctx);
          }
        }
        this.ctx.globalAlpha = 1;
      }

      if (targetPool && targetAlpha > 0) {
        this.ctx.globalAlpha = targetAlpha;
        const particles = targetPool.getAllParticles();
        for (let i = 0; i < particles.length; i++) {
          if (particles[i].active) {
            particles[i].draw(this.ctx);
          }
        }
        this.ctx.globalAlpha = 1;
      }
    }

    this.ctx.globalAlpha = 1;
  }

  public switchWeather(weather: WeatherType): void {
    if (weather === this.targetWeather && !this.isTransitioning) return;

    this.targetWeather = weather;
    this.isTransitioning = true;
    this.transitionProgress = 0;

    const targetPool = this.particlePools.get(weather);
    if (targetPool) {
      targetPool.deactivateAll();
      const fromTop = weather === 'rainy' || weather === 'snowy' || weather === 'thunder';
      targetPool.setActiveCountImmediately(Math.round(this.targetParticleCount), this.width, this.height, fromTop);
      const particles = targetPool.getAllParticles();
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].active) {
          particles[i].alpha = 0;
        }
      }
    }

    this.applyWeatherStyles(weather);
  }

  private applyWeatherStyles(weather: WeatherType): void {
    const config = weatherConfigs[weather];
    const root = document.documentElement;

    root.style.setProperty('--bg-start', config.bgStart);
    root.style.setProperty('--bg-end', config.bgEnd);
    root.style.setProperty('--accent-color', config.accentColor);
    root.style.setProperty('--ui-bg', config.uiBg);
    root.style.setProperty('--ui-border', config.uiBorder);
    root.style.setProperty('--text-color', config.textColor);
  }

  public setParticleCount(count: number): void {
    this.pendingParticleCount = Math.max(100, Math.min(this.maxParticles, count));
  }

  public getParticleCount(): number {
    if (this.isTransitioning) {
      const currentPool = this.particlePools.get(this.currentWeather);
      const targetPool = this.particlePools.get(this.targetWeather);
      const currentCount = currentPool ? currentPool.getActiveCount() : 0;
      const targetCount = targetPool ? targetPool.getActiveCount() : 0;
      return Math.max(currentCount, targetCount);
    }
    const pool = this.particlePools.get(this.currentWeather);
    return pool ? pool.getActiveCount() : 0;
  }

  public getTargetParticleCount(): number {
    return Math.round(this.targetParticleCount);
  }

  public getPendingParticleCount(): number {
    return this.pendingParticleCount;
  }

  public getCurrentWeather(): WeatherType {
    return this.isTransitioning ? this.targetWeather : this.currentWeather;
  }

  private getCurrentWeatherType(): WeatherType {
    if (this.isTransitioning) {
      return this.transitionProgress < 0.3 ? this.currentWeather : this.targetWeather;
    }
    return this.currentWeather;
  }

  public getFPS(): number {
    return this.fps;
  }

  public getWeatherName(weather: WeatherType): string {
    return weatherConfigs[weather].name;
  }

  public getCurrentWeatherName(): string {
    return weatherConfigs[this.getCurrentWeather()].name;
  }

  public isWeatherTransitioning(): boolean {
    return this.isTransitioning;
  }
}
