import { Particle } from './particle';
import { WeatherManager } from './weather';
import type { WeatherType } from './weather';
import { UIController } from './ui';

class WeatherSimulator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backBuffer: HTMLCanvasElement;
  private backCtx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private particles: Particle[] = [];
  private weatherManager: WeatherManager;
  private uiController: UIController;
  private lastTime: number = 0;
  private animationId: number = 0;
  private sunRayTimers: number[] = [];
  private sunRayBrightness: number[] = [];
  private lightningTimer: number = 0;
  private lightningActive: boolean = false;
  private lightningIntensity: number = 0;
  private snowAccumulation: Float32Array;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.backBuffer = document.createElement('canvas');
    const backCtx = this.backBuffer.getContext('2d');
    if (!backCtx) throw new Error('Failed to get backbuffer context');
    this.backCtx = backCtx;

    this.weatherManager = new WeatherManager();
    this.snowAccumulation = new Float32Array(1);

    for (let i = 0; i < 12; i++) {
      this.sunRayTimers.push(Math.random() * 300);
      this.sunRayBrightness.push(0.5 + Math.random() * 0.5);
    }

    this.uiController = new UIController({
      onWeatherChange: (weather: WeatherType) => {
        this.weatherManager.setWeather(weather);
      },
      onDensityChange: (density: number) => {
        this.weatherManager.setParticleDensity(density);
      },
      onWindChange: (wind: number) => {
        this.weatherManager.setWindSpeed(wind);
      }
    });

    this.uiController.syncWithWeatherManager(this.weatherManager);

    this.resize();
    this.initParticles();

    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.backBuffer.width = this.width * dpr;
    this.backBuffer.height = this.height * dpr;
    this.backCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.snowAccumulation = new Float32Array(Math.ceil(this.width / 4));

    this.particles.forEach(p => {
      p.canvasWidth = this.width;
      p.canvasHeight = this.height;
    });
  }

  private initParticles(): void {
    this.particles = [];
    const targetCount = this.weatherManager.getParticleDensity();
    const params = this.weatherManager.getCurrentParams();
    const weather = this.weatherManager.getWeather();
    const pixelSize = this.weatherManager.getPixelSize();

    for (let i = 0; i < targetCount; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      this.particles.push(new Particle({ x, y, canvasWidth: this.width, canvasHeight: this.height }, params, weather, pixelSize));
    }
  }

  private adjustParticleCount(): void {
    const targetCount = this.weatherManager.getParticleDensity();
    const pixelSize = this.weatherManager.getPixelSize();

    while (this.particles.length < targetCount) {
      const params = this.weatherManager.getCurrentParams();
      const weather = this.weatherManager.getTargetWeather();
      const x = Math.random() * this.width;
      const y = this.weatherManager.getWeather() === 'rainy' || this.weatherManager.getWeather() === 'stormy'
        ? -20
        : Math.random() * this.height;
      this.particles.push(new Particle({ x, y, canvasWidth: this.width, canvasHeight: this.height }, params, weather, pixelSize));
    }

    while (this.particles.length > targetCount) {
      this.particles.pop();
    }

    this.particles.forEach(p => {
      p.size = pixelSize;
    });
  }

  private updateSunRays(deltaTime: number): void {
    for (let i = 0; i < 12; i++) {
      this.sunRayTimers[i] -= deltaTime;
      if (this.sunRayTimers[i] <= 0) {
        this.sunRayTimers[i] = 200 + Math.random() * 400;
        this.sunRayBrightness[i] = 0.3 + Math.random() * 0.7;
      }
    }
  }

  private updateLightning(deltaTime: number): void {
    const params = this.weatherManager.getCurrentParams();
    if (!params.isLightning) {
      this.lightningActive = false;
      this.lightningIntensity = 0;
      return;
    }

    this.lightningTimer -= deltaTime;
    if (this.lightningTimer <= 0) {
      if (this.lightningActive) {
        this.lightningActive = false;
        this.lightningIntensity = 0;
        this.lightningTimer = 2000 + Math.random() * 5000;
      } else {
        this.lightningActive = true;
        this.lightningIntensity = 0.4 + Math.random() * 0.6;
        this.lightningTimer = 50 + Math.random() * 150;
      }
    }
  }

  private updateSnowAccumulation(deltaTime: number): void {
    const maxSnowHeight = this.height * 0.15;
    const weather = this.weatherManager.getWeather();

    if (weather !== 'snowy') {
      for (let i = 0; i < this.snowAccumulation.length; i++) {
        this.snowAccumulation[i] = Math.max(0, this.snowAccumulation[i] - deltaTime * 0.01);
      }
      return;
    }

    const density = this.weatherManager.getParticleDensity();
    const addRate = (density / 200) * deltaTime * 0.005;

    for (let i = 0; i < this.snowAccumulation.length; i++) {
      this.snowAccumulation[i] += addRate * (0.8 + Math.random() * 0.4);
      if (this.snowAccumulation[i] > maxSnowHeight) {
        this.snowAccumulation[i] = maxSnowHeight;
      }
      this.snowAccumulation[i] = Math.max(0, this.snowAccumulation[i] - deltaTime * 0.002);
    }
  }

  private getSnowHeightAt(x: number): number {
    const index = Math.floor(x / 4);
    if (index < 0 || index >= this.snowAccumulation.length) return 0;
    return this.snowAccumulation[index];
  }

  private drawBackground(): void {
    this.backCtx.fillStyle = '#0B0C10';
    this.backCtx.fillRect(0, 0, this.width, this.height);
  }

  private drawPixelGrid(): void {
    this.backCtx.save();
    this.backCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.backCtx.lineWidth = 1;
    const spacing = 20;

    for (let x = 0; x <= this.width; x += spacing) {
      this.backCtx.beginPath();
      this.backCtx.moveTo(x + 0.5, 0);
      this.backCtx.lineTo(x + 0.5, this.height);
      this.backCtx.stroke();
    }

    for (let y = 0; y <= this.height; y += spacing) {
      this.backCtx.beginPath();
      this.backCtx.moveTo(0, y + 0.5);
      this.backCtx.lineTo(this.width, y + 0.5);
      this.backCtx.stroke();
    }

    this.backCtx.restore();
  }

  private drawSun(): void {
    const weather = this.weatherManager.getWeather();
    if (weather !== 'sunny') return;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const sunRadius = 40;

    this.backCtx.save();
    
    this.backCtx.shadowColor = '#FFD700';
    this.backCtx.shadowBlur = 8;
    this.backCtx.fillStyle = '#FFB347';
    this.drawPixelCircle(cx, cy, sunRadius);
    this.backCtx.restore();

    this.backCtx.fillStyle = '#FFD700';
    this.drawPixelCircle(cx, cy, sunRadius - 8);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const brightness = this.sunRayBrightness[i];
      const length = sunRadius + 20 + Math.sin(performance.now() * 0.003 + i) * 10;
      const innerX = cx + Math.cos(angle) * (sunRadius + 5);
      const innerY = cy + Math.sin(angle) * (sunRadius + 5);
      const outerX = cx + Math.cos(angle) * (sunRadius + length);
      const outerY = cy + Math.sin(angle) * (sunRadius + length);

      this.backCtx.save();
      this.backCtx.globalAlpha = brightness * 0.7;
      this.backCtx.strokeStyle = '#FFD700';
      this.backCtx.lineWidth = 2;
      this.backCtx.lineCap = 'butt';
      this.backCtx.beginPath();
      this.backCtx.moveTo(Math.floor(innerX), Math.floor(innerY));
      this.backCtx.lineTo(Math.floor(outerX), Math.floor(outerY));
      this.backCtx.stroke();
      this.backCtx.restore();
    }
  }

  private drawPixelCircle(cx: number, cy: number, r: number): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) {
          this.backCtx.fillRect(Math.floor(cx + x), Math.floor(cy + y), 1, 1);
        }
      }
    }
  }

  private drawSnowGround(): void {
    if (this.weatherManager.getWeather() !== 'snowy') return;

    this.backCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    for (let i = 0; i < this.snowAccumulation.length; i++) {
      const x = i * 4;
      const h = this.snowAccumulation[i];
      if (h > 1) {
        this.backCtx.fillRect(x, this.height - h, 4, h);
      }
    }
  }

  private drawLightningFlash(): void {
    if (!this.lightningActive || this.lightningIntensity <= 0) return;

    this.backCtx.save();
    this.backCtx.fillStyle = `rgba(159, 122, 234, ${this.lightningIntensity * 0.15})`;
    this.backCtx.fillRect(0, 0, this.width, this.height);
    this.backCtx.restore();

    if (Math.random() < 0.3) {
      this.drawLightningBolt();
    }
  }

  private drawLightningBolt(): void {
    const startX = Math.random() * this.width;
    const startY = 0;
    const endX = startX + (Math.random() - 0.5) * this.width * 0.3;
    const endY = this.height;

    this.backCtx.save();
    this.backCtx.strokeStyle = '#E9D8FD';
    this.backCtx.lineWidth = 3;
    this.backCtx.shadowColor = '#9F7AEA';
    this.backCtx.shadowBlur = 20;
    this.backCtx.lineCap = 'round';
    this.backCtx.lineJoin = 'round';

    this.backCtx.beginPath();
    this.backCtx.moveTo(startX, startY);

    let currentX = startX;
    let currentY = startY;
    const segments = 8 + Math.floor(Math.random() * 5);

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const targetY = startY + (endY - startY) * t;
      const targetX = startX + (endX - startX) * t + (Math.random() - 0.5) * 40;
      
      currentX = targetX;
      currentY = targetY;
      this.backCtx.lineTo(currentX, currentY);
    }

    this.backCtx.stroke();

    this.backCtx.strokeStyle = '#FFFFFF';
    this.backCtx.lineWidth = 1;
    this.backCtx.stroke();

    this.backCtx.restore();
  }

  private drawEdgeMask(): void {
    const gradient = this.backCtx.createRadialGradient(
      this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.3,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(11, 12, 16, 0)');
    gradient.addColorStop(1, 'rgba(11, 12, 16, 0.6)');

    this.backCtx.save();
    this.backCtx.globalCompositeOperation = 'source-over';
    this.backCtx.fillStyle = gradient;
    this.backCtx.fillRect(0, 0, this.width, this.height);
    this.backCtx.restore();
  }

  private draw(): void {
    this.drawBackground();
    this.drawPixelGrid();
    this.drawSun();
    this.drawSnowGround();

    this.particles.forEach(particle => {
      particle.draw(this.backCtx);
    });

    this.drawLightningFlash();
    this.drawEdgeMask();

    this.ctx.drawImage(
      this.backBuffer,
      0, 0, this.backBuffer.width, this.backBuffer.height,
      0, 0, this.width, this.height
    );
  }

  private update(deltaTime: number): void {
    this.weatherManager.update(deltaTime);
    this.adjustParticleCount();
    this.updateSunRays(deltaTime);
    this.updateLightning(deltaTime);
    this.updateSnowAccumulation(deltaTime);

    const params = this.weatherManager.getCurrentParams();
    const weather = this.weatherManager.getTargetWeather();
    const windSpeed = this.weatherManager.getWindSpeed();

    this.particles.forEach(particle => {
      particle.update(deltaTime, windSpeed, params, weather);

      if (particle.isSnowflake && particle.y >= this.height - this.getSnowHeightAt(particle.x) - 5) {
        if (!particle.onGround) {
          particle.landOnGround(this.height - this.getSnowHeightAt(particle.x));
        }
      }

      if (particle.isDead()) {
        let newX: number;
        let newY: number;

        if (weather === 'rainy' || weather === 'stormy') {
          newX = Math.random() * this.width;
          newY = -20;
        } else if (weather === 'sunny') {
          newX = Math.random() * this.width;
          newY = this.height + 20;
        } else if (weather === 'snowy') {
          newX = Math.random() * this.width;
          newY = -20;
        } else {
          newX = Math.random() * this.width;
          newY = Math.random() * this.height;
        }

        particle.reset(newX, newY);
      }
    });
  }

  private loop(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.fpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = currentTime;
    }

    const deltaTime = Math.min(this.lastTime ? currentTime - this.lastTime : 16, 50);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  start(): void {
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  getFps(): number {
    return this.currentFps;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const simulator = new WeatherSimulator();
  simulator.start();
});
