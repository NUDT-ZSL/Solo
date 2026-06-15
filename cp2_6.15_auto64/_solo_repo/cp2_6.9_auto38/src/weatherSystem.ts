export enum WeatherType {
  Sunny = 'sunny',
  Rainy = 'rainy',
  Thunderstorm = 'thunderstorm',
  Cloudy = 'cloudy'
}

export interface WeatherConfig {
  name: string;
  label: string;
  bgTint: string;
  particleColor: string;
}

export const WEATHER_CONFIGS: Record<WeatherType, WeatherConfig> = {
  [WeatherType.Sunny]: {
    name: 'sunny',
    label: '☀️ 晴朗',
    bgTint: 'rgba(255, 193, 7, 0.06)',
    particleColor: '#ffd93d'
  },
  [WeatherType.Rainy]: {
    name: 'rainy',
    label: '🌧️ 暴雨',
    bgTint: 'rgba(66, 165, 245, 0.08)',
    particleColor: '#7986cb'
  },
  [WeatherType.Thunderstorm]: {
    name: 'thunderstorm',
    label: '⛈️ 雷暴',
    bgTint: 'rgba(156, 39, 176, 0.08)',
    particleColor: '#b388ff'
  },
  [WeatherType.Cloudy]: {
    name: 'cloudy',
    label: '☁️ 多云',
    bgTint: 'rgba(158, 158, 158, 0.06)',
    particleColor: '#9e9e9e'
  }
};

export type WeatherChangeListener = (newWeather: WeatherType, oldWeather: WeatherType) => void;

export class WeatherSystem {
  private currentWeather: WeatherType = WeatherType.Cloudy;
  private listeners: Set<WeatherChangeListener> = new Set();
  private switchInterval: number = 60000;
  private timer: number | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }> = [];
  private flashAlpha: number = 0;
  private nextFlashTime: number = 0;
  private startTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.nextFlashTime = this.getRandomFlashInterval();
  }

  start(): void {
    this.startTime = performance.now();
    this.switchWeather();
    this.timer = window.setInterval(() => this.switchWeather(), this.switchInterval);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.listeners.clear();
  }

  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  onChange(listener: WeatherChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private switchWeather(): void {
    const weathers = Object.values(WeatherType);
    let newWeather: WeatherType;
    do {
      newWeather = weathers[Math.floor(Math.random() * weathers.length)];
    } while (newWeather === this.currentWeather && weathers.length > 1);

    const oldWeather = this.currentWeather;
    this.currentWeather = newWeather;

    for (const listener of this.listeners) {
      listener(newWeather, oldWeather);
    }
  }

  private getRandomFlashInterval(): number {
    return 3000 + Math.random() * 2000;
  }

  update(dt: number, now: number): void {
    if (this.currentWeather === WeatherType.Rainy || this.currentWeather === WeatherType.Thunderstorm) {
      this.updateRain(dt);
    } else {
      this.particles = [];
    }

    if (this.currentWeather === WeatherType.Thunderstorm) {
      if (now - this.startTime > this.nextFlashTime) {
        this.flashAlpha = 0.4;
        this.nextFlashTime = this.getRandomFlashInterval();
        this.startTime = now;
      }
    } else {
      this.flashAlpha = 0;
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 4);
    }
  }

  private updateRain(dt: number): void {
    const maxParticles = 150;
    const spawnRate = 8;
    const speed = this.currentWeather === WeatherType.Thunderstorm ? 900 : 600;
    const angle = Math.PI / 5;

    for (let i = 0; i < spawnRate; i++) {
      if (this.particles.length < maxParticles) {
        this.particles.push({
          x: Math.random() * (this.canvas.width + 200) - 100,
          y: -20,
          vx: Math.cos(angle) * speed * 0.4,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: (this.canvas.height + 50) / (Math.sin(angle) * speed)
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt / p.maxLife;

      if (p.y > this.canvas.height + 20 || p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(): void {
    const config = WEATHER_CONFIGS[this.currentWeather];
    this.ctx.fillStyle = config.bgTint;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.currentWeather === WeatherType.Rainy || this.currentWeather === WeatherType.Thunderstorm) {
      this.renderRain();
    }

    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private renderRain(): void {
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(121, 134, 203, 0.3)`;
    this.ctx.lineWidth = 1;
    this.ctx.lineCap = 'round';

    for (const p of this.particles) {
      const len = 12;
      const angle = Math.PI / 5;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x - Math.cos(angle) * len, p.y - Math.sin(angle) * len);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  destroy(): void {
    this.stop();
    this.particles = [];
  }
}
