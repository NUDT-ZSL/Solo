import type { WeatherType } from './weather';
import { WeatherManager } from './weather';

export interface UICallbacks {
  onWeatherChange: (weather: WeatherType) => void;
  onDensityChange: (density: number) => void;
  onWindChange: (wind: number) => void;
}

export class UIController {
  private weatherButtons: NodeListOf<HTMLButtonElement>;
  private densitySlider: HTMLInputElement;
  private windSlider: HTMLInputElement;
  private densityValue: HTMLElement;
  private windValue: HTMLElement;
  private fullscreenBtn: HTMLButtonElement;
  private callbacks: UICallbacks;
  private sliderDebounceTimer: number | null = null;
  private pendingDensity: number | null = null;
  private pendingWind: number | null = null;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.weatherButtons = document.querySelectorAll('.weather-btn');
    this.densitySlider = document.getElementById('densitySlider') as HTMLInputElement;
    this.windSlider = document.getElementById('windSlider') as HTMLInputElement;
    this.densityValue = document.getElementById('densityValue') as HTMLElement;
    this.windValue = document.getElementById('windValue') as HTMLElement;
    this.fullscreenBtn = document.getElementById('fullscreenBtn') as HTMLButtonElement;

    this.initWeatherButtonIcons();
    this.bindEvents();
  }

  private initWeatherButtonIcons(): void {
    this.weatherButtons.forEach(btn => {
      const weather = btn.dataset.weather as WeatherType;
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      canvas.style.width = '32px';
      canvas.style.height = '32px';
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        switch (weather) {
          case 'sunny': this.drawSunnyIcon(ctx, 32); break;
          case 'cloudy': this.drawCloudyIcon(ctx, 32); break;
          case 'rainy': this.drawRainyIcon(ctx, 32); break;
          case 'snowy': this.drawSnowyIcon(ctx, 32); break;
          case 'stormy': this.drawStormyIcon(ctx, 32); break;
        }
      }
      btn.appendChild(canvas);
    });
  }

  private drawSunnyIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const center = size / 2;
    const radius = size / 4;
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.fillStyle = '#FFD700';
      const innerX = center + Math.cos(angle) * radius;
      const innerY = center + Math.sin(angle) * radius;
      const outerX = center + Math.cos(angle) * (radius + 4);
      const outerY = center + Math.sin(angle) * (radius + 4);
      this.drawPixelLine(ctx, innerX, innerY, outerX, outerY, 2);
    }

    ctx.fillStyle = '#FFB347';
    this.drawPixelCircle(ctx, center, center, radius - 1);
    ctx.fillStyle = '#FFD700';
    this.drawPixelCircle(ctx, center, center, radius - 3);
  }

  private drawCloudyIcon(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillStyle = '#B8C5D6';
    this.drawPixelCircle(ctx, size * 0.35, size * 0.55, 6);
    this.drawPixelCircle(ctx, size * 0.55, size * 0.5, 7);
    this.drawPixelCircle(ctx, size * 0.7, size * 0.55, 5);
    ctx.fillStyle = '#E2E8F0';
    this.drawPixelCircle(ctx, size * 0.4, size * 0.5, 4);
    this.drawPixelCircle(ctx, size * 0.55, size * 0.45, 5);
    this.drawPixelCircle(ctx, size * 0.68, size * 0.5, 3);
  }

  private drawRainyIcon(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillStyle = '#718096';
    this.drawPixelCircle(ctx, size * 0.35, size * 0.35, 5);
    this.drawPixelCircle(ctx, size * 0.55, size * 0.3, 6);
    this.drawPixelCircle(ctx, size * 0.7, size * 0.35, 4);
    ctx.fillStyle = '#A0AEC0';
    this.drawPixelCircle(ctx, size * 0.4, size * 0.3, 3);
    this.drawPixelCircle(ctx, size * 0.55, size * 0.25, 4);
    this.drawPixelCircle(ctx, size * 0.68, size * 0.3, 2);

    ctx.fillStyle = '#63B3ED';
    for (let i = 0; i < 4; i++) {
      const rx = size * (0.25 + i * 0.15);
      this.drawPixelRect(ctx, rx, size * 0.55, 2, 6);
      this.drawPixelRect(ctx, rx + 1, size * 0.6, 1, 4);
    }
  }

  private drawSnowyIcon(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillStyle = '#A0AEC0';
    this.drawPixelCircle(ctx, size * 0.35, size * 0.3, 5);
    this.drawPixelCircle(ctx, size * 0.55, size * 0.25, 6);
    this.drawPixelCircle(ctx, size * 0.7, size * 0.3, 4);

    ctx.fillStyle = '#FFFFFF';
    const snowPositions = [
      [size * 0.25, size * 0.55],
      [size * 0.5, size * 0.6],
      [size * 0.75, size * 0.55],
      [size * 0.35, size * 0.75],
      [size * 0.65, size * 0.78]
    ];
    snowPositions.forEach(([x, y]) => {
      this.drawSnowflakeIcon(ctx, x, y, 4);
    });
  }

  private drawStormyIcon(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillStyle = '#4A5568';
    this.drawPixelCircle(ctx, size * 0.3, size * 0.3, 5);
    this.drawPixelCircle(ctx, size * 0.5, size * 0.25, 7);
    this.drawPixelCircle(ctx, size * 0.7, size * 0.3, 5);
    ctx.fillStyle = '#2D3748';
    this.drawPixelCircle(ctx, size * 0.4, size * 0.35, 4);
    this.drawPixelCircle(ctx, size * 0.6, size * 0.38, 5);

    ctx.fillStyle = '#9F7AEA';
    const lightningX = size * 0.5;
    const lightningY = size * 0.5;
    this.drawPixelRect(ctx, lightningX, lightningY, 3, 3);
    this.drawPixelRect(ctx, lightningX - 2, lightningY + 3, 3, 3);
    this.drawPixelRect(ctx, lightningX + 1, lightningY + 6, 3, 3);
    this.drawPixelRect(ctx, lightningX - 1, lightningY + 9, 3, 4);
  }

  private drawSnowflakeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.fillStyle = '#FFFFFF';
    this.drawPixelRect(ctx, x - s, y, s * 2 + 1, 1);
    this.drawPixelRect(ctx, x, y - s, 1, s * 2 + 1);
    this.drawPixelRect(ctx, x - s * 0.7, y - s * 0.7, 1, 1);
    this.drawPixelRect(ctx, x + s * 0.7, y - s * 0.7, 1, 1);
    this.drawPixelRect(ctx, x - s * 0.7, y + s * 0.7, 1, 1);
    this.drawPixelRect(ctx, x + s * 0.7, y + s * 0.7, 1, 1);
  }

  private drawPixelCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) {
          ctx.fillRect(Math.floor(cx + x), Math.floor(cy + y), 1, 1);
        }
      }
    }
  }

  private drawPixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  }

  private drawPixelLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, thickness: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      for (let tx = 0; tx < thickness; tx++) {
        for (let ty = 0; ty < thickness; ty++) {
          ctx.fillRect(Math.floor(x + tx - thickness / 2), Math.floor(y + ty - thickness / 2), 1, 1);
        }
      }
    }
  }

  private bindEvents(): void {
    this.weatherButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const weather = btn.dataset.weather as WeatherType;
        this.setActiveWeatherButton(weather);
        this.callbacks.onWeatherChange(weather);
      });
    });

    this.densitySlider.addEventListener('input', () => {
      const value = parseInt(this.densitySlider.value, 10);
      this.densityValue.textContent = value.toString();
      this.pendingDensity = value;
      this.scheduleSliderCallback();
    });

    this.windSlider.addEventListener('input', () => {
      const value = parseInt(this.windSlider.value, 10);
      this.windValue.textContent = value.toString();
      this.pendingWind = value;
      this.scheduleSliderCallback();
    });

    this.fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }

  private scheduleSliderCallback(): void {
    if (this.sliderDebounceTimer !== null) {
      window.clearTimeout(this.sliderDebounceTimer);
    }
    this.sliderDebounceTimer = window.setTimeout(() => {
      if (this.pendingDensity !== null) {
        this.callbacks.onDensityChange(this.pendingDensity);
        this.pendingDensity = null;
      }
      if (this.pendingWind !== null) {
        this.callbacks.onWindChange(this.pendingWind);
        this.pendingWind = null;
      }
      this.sliderDebounceTimer = null;
    }, 100);
  }

  private setActiveWeatherButton(weather: WeatherType): void {
    this.weatherButtons.forEach(btn => {
      if (btn.dataset.weather === weather) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // ignore errors
      });
    } else {
      document.exitFullscreen().catch(() => {
        // ignore errors
      });
    }
  }

  syncWithWeatherManager(manager: WeatherManager): void {
    this.setActiveWeatherButton(manager.getWeather());
    this.densitySlider.value = manager.getParticleDensity().toString();
    this.densityValue.textContent = manager.getParticleDensity().toString();
    this.windSlider.value = manager.getWindSpeed().toString();
    this.windValue.textContent = manager.getWindSpeed().toString();
  }
}
