import { Particle, ParticleFactory, WeatherType } from './particles';

export interface WeatherConfig {
  bgStart: string;
  bgEnd: string;
  accentColor: string;
  uiBg: string;
  uiBorder: string;
  textColor: string;
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
    name: '晴天'
  },
  rainy: {
    bgStart: '#4A5568',
    bgEnd: '#2D3748',
    accentColor: '#4299E1',
    uiBg: 'rgba(0, 0, 0, 0.3)',
    uiBorder: 'rgba(255, 255, 255, 0.1)',
    textColor: '#E2E8F0',
    name: '雨天'
  },
  snowy: {
    bgStart: '#E2E8F0',
    bgEnd: '#CBD5E0',
    accentColor: '#A0AEC0',
    uiBg: 'rgba(255, 255, 255, 0.4)',
    uiBorder: 'rgba(255, 255, 255, 0.5)',
    textColor: '#2D3748',
    name: '雪天'
  },
  thunder: {
    bgStart: '#2D3748',
    bgEnd: '#1A202C',
    accentColor: '#9F7AEA',
    uiBg: 'rgba(0, 0, 0, 0.4)',
    uiBorder: 'rgba(159, 122, 234, 0.3)',
    textColor: '#E2E8F0',
    name: '雷暴'
  }
};

class ParticlePool {
  private pool: Particle[] = [];
  private activeList: Particle[] = [];
  private type: WeatherType;
  private activeCount: number = 0;

  constructor(type: WeatherType, initialSize: number = 200) {
    this.type = type;
    this.expandPool(initialSize);
  }

  private expandPool(count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = ParticleFactory.create(this.type);
      particle.active = false;
      this.pool.push(particle);
    }
  }

  public acquire(width: number, height: number, fromTop: boolean = false): Particle | null {
    let particle: Particle | null = null;

    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        particle = this.pool[i];
        break;
      }
    }

    if (!particle) {
      const expandCount = Math.max(50, Math.floor(this.pool.length * 0.2));
      this.expandPool(expandCount);
      for (let i = this.pool.length - expandCount; i < this.pool.length; i++) {
        if (!this.pool[i].active) {
          particle = this.pool[i];
          break;
        }
      }
    }

    if (particle) {
      particle.init(width, height, fromTop);
      this.activeCount++;
    }

    return particle;
  }

  public deactivateAll(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
    this.activeCount = 0;
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
}

interface ThunderFlashState {
  isFlashing: boolean;
  flashTimer: number;
  flashDuration: number;
  nextFlashDelay: number;
  flashIntensity: number;
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
    flashIntensity: 0
  };

  private spawnTimer: number = 0;
  private spawnInterval: number = 0.003;

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
  }

  private initPools(): void {
    const weatherTypes: WeatherType[] = ['sunny', 'rainy', 'snowy', 'thunder'];
    for (const type of weatherTypes) {
      this.particlePools.set(type, new ParticlePool(type, 300));
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

    this.ctx.scale(dpr, dpr);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
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
    if (this.isTransitioning) {
      this.updateTransition(dt);
    }

    this.updateThunderFlash(dt);
    this.updateParticles(dt);
    this.spawnParticles(dt);
  }

  private updateTransition(dt: number): void {
    this.transitionProgress += dt / this.transitionDuration;

    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.isTransitioning = false;
      this.currentWeather = this.targetWeather;

      const oldPool = this.particlePools.get(this.currentWeather);
      if (oldPool) {
        oldPool.deactivateAll();
      }
    }

    const fadeSpeed = 4;
    const currentPool = this.particlePools.get(this.currentWeather);
    const targetPool = this.particlePools.get(this.targetWeather);

    if (this.transitionProgress < 0.5) {
      if (currentPool) {
        currentPool.fadeOutAll(dt, fadeSpeed * 2);
      }
    } else {
      if (targetPool && this.targetParticleCount > 0) {
        const targetCount = Math.floor(this.targetParticleCount * (this.transitionProgress - 0.5) * 2);
        const activeCount = targetPool.getActiveCount();
        if (activeCount < targetCount) {
          const toSpawn = Math.min(30, targetCount - activeCount);
          for (let i = 0; i < toSpawn; i++) {
            targetPool.acquire(this.width, this.height, true);
          }
        }
      }
    }
  }

  private updateThunderFlash(dt: number): void {
    if (this.getCurrentWeatherType() !== 'thunder') {
      this.thunderFlash.isFlashing = false;
      this.thunderFlash.flashIntensity = 0;
      return;
    }

    if (this.thunderFlash.isFlashing) {
      this.thunderFlash.flashTimer += dt;
      this.thunderFlash.flashIntensity = Math.max(
        0,
        1 - this.thunderFlash.flashTimer / this.thunderFlash.flashDuration
      );

      if (this.thunderFlash.flashTimer >= this.thunderFlash.flashDuration) {
        this.thunderFlash.isFlashing = false;
        this.thunderFlash.nextFlashDelay = 0.5 + Math.random() * 3;
        this.thunderFlash.flashTimer = 0;
      }
    } else {
      this.thunderFlash.flashTimer += dt;
      this.thunderFlash.flashIntensity = Math.max(0, this.thunderFlash.flashIntensity - dt * 2);

      if (this.thunderFlash.flashTimer >= this.thunderFlash.nextFlashDelay) {
        this.thunderFlash.isFlashing = true;
        this.thunderFlash.flashTimer = 0;
        this.thunderFlash.flashDuration = 0.05 + Math.random() * 0.15;
      }
    }
  }

  private updateParticles(dt: number): void {
    const currentType = this.getCurrentWeatherType();
    const currentPool = this.particlePools.get(currentType);

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
      const otherType = this.transitionProgress < 0.5 ? this.targetWeather : this.currentWeather;
      if (otherType !== currentType) {
        const otherPool = this.particlePools.get(otherType);
        if (otherPool) {
          const particles = otherPool.getAllParticles();
          for (let i = 0; i < particles.length; i++) {
            if (particles[i].active) {
              particles[i].update(dt, this.width, this.height);
            }
          }
          otherPool.updateActiveCount();
        }
      }
    }
  }

  private spawnParticles(dt: number): void {
    if (this.isTransitioning) return;

    const currentType = this.getCurrentWeatherType();
    const pool = this.particlePools.get(currentType);
    if (!pool) return;

    this.spawnTimer += dt;
    const activeCount = pool.getActiveCount();

    if (activeCount < this.targetParticleCount && this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const diff = this.targetParticleCount - activeCount;
      const toSpawn = Math.min(
        Math.max(1, Math.floor(diff * 0.15)),
        100
      );

      const fromTop = currentType === 'rainy' || currentType === 'snowy' || currentType === 'thunder';
      for (let i = 0; i < toSpawn && activeCount + i < this.targetParticleCount; i++) {
        pool.acquire(this.width, this.height, fromTop);
      }
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const currentType = this.getCurrentWeatherType();
    const pool = this.particlePools.get(currentType);

    if (pool) {
      const particles = pool.getAllParticles();
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].active) {
          particles[i].draw(this.ctx);
        }
      }
    }

    if (this.isTransitioning) {
      const otherType = this.transitionProgress < 0.5 ? this.targetWeather : this.currentWeather;
      if (otherType !== currentType) {
        const otherPool = this.particlePools.get(otherType);
        if (otherPool) {
          const alpha = this.transitionProgress < 0.5
            ? this.transitionProgress * 2
            : (1 - this.transitionProgress) * 2;
          this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          const particles = otherPool.getAllParticles();
          for (let i = 0; i < particles.length; i++) {
            if (particles[i].active) {
              particles[i].draw(this.ctx);
            }
          }
          this.ctx.globalAlpha = 1;
        }
      }
    }

    if (currentType === 'thunder' && this.thunderFlash.flashIntensity > 0) {
      this.ctx.fillStyle = `rgba(200, 180, 255, ${this.thunderFlash.flashIntensity * 0.12})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  public switchWeather(weather: WeatherType): void {
    if (weather === this.targetWeather && !this.isTransitioning) return;

    this.targetWeather = weather;
    this.isTransitioning = true;
    this.transitionProgress = 0;

    const targetPool = this.particlePools.get(weather);
    if (targetPool) {
      targetPool.deactivateAll();
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
    this.targetParticleCount = Math.max(100, Math.min(this.maxParticles, count));
  }

  public getParticleCount(): number {
    const currentType = this.getCurrentWeatherType();
    const pool = this.particlePools.get(currentType);
    return pool ? pool.getActiveCount() : 0;
  }

  public getTargetParticleCount(): number {
    return this.targetParticleCount;
  }

  public getCurrentWeather(): WeatherType {
    return this.isTransitioning ? this.targetWeather : this.currentWeather;
  }

  private getCurrentWeatherType(): WeatherType {
    if (this.isTransitioning) {
      return this.transitionProgress < 0.5 ? this.currentWeather : this.targetWeather;
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
}
