import { WeatherSystem, weatherConfigs } from './weatherSystem';
import type { WeatherType } from './particles';

class WeatherApp {
  private weatherSystem: WeatherSystem;
  private canvas: HTMLCanvasElement;

  private weatherButtons: NodeListOf<HTMLButtonElement>;
  private densitySlider: HTMLInputElement;
  private densityValue: HTMLElement;
  private weatherNameEl: HTMLElement;
  private particleCountEl: HTMLElement;
  private fpsValueEl: HTMLElement;

  private currentWeather: WeatherType = 'sunny';
  private isWeatherAnimating: boolean = false;
  private displayedParticleCount: number = 0;

  constructor() {
    this.canvas = document.getElementById('weather-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.weatherSystem = new WeatherSystem(this.canvas);

    this.weatherButtons = document.querySelectorAll('.weather-btn');
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.densityValue = document.getElementById('density-value') as HTMLElement;
    this.weatherNameEl = document.getElementById('weather-name') as HTMLElement;
    this.particleCountEl = document.getElementById('particle-count') as HTMLElement;
    this.fpsValueEl = document.getElementById('fps-value') as HTMLElement;

    this.init();
  }

  private init(): void {
    this.applyInitialStyles();
    this.bindEvents();
    this.updateUI();
    this.weatherSystem.start();
    this.animateUI();
  }

  private applyInitialStyles(): void {
    const config = weatherConfigs[this.currentWeather];
    const root = document.documentElement;
    root.style.setProperty('--bg-start', config.bgStart);
    root.style.setProperty('--bg-end', config.bgEnd);
    root.style.setProperty('--accent-color', config.accentColor);
    root.style.setProperty('--ui-bg', config.uiBg);
    root.style.setProperty('--ui-border', config.uiBorder);
    root.style.setProperty('--text-color', config.textColor);
    root.style.setProperty('--flash-overlay', 'rgba(0, 0, 0, 0)');
  }

  private bindEvents(): void {
    this.weatherButtons.forEach(button => {
      button.addEventListener('click', () => {
        const weather = button.dataset.weather as WeatherType;
        if (weather && weather !== this.currentWeather && !this.isWeatherAnimating) {
          this.switchWeather(weather);
        }
      });
    });

    this.densitySlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      this.weatherSystem.setParticleCount(value);
      this.densityValue.textContent = value.toString();
    });

    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case '1':
          this.switchWeather('sunny');
          break;
        case '2':
          this.switchWeather('rainy');
          break;
        case '3':
          this.switchWeather('snowy');
          break;
        case '4':
          this.switchWeather('thunder');
          break;
      }
    });
  }

  private switchWeather(weather: WeatherType): void {
    if (this.isWeatherAnimating || weather === this.currentWeather) return;

    this.isWeatherAnimating = true;
    this.currentWeather = weather;
    this.updateActiveButton(weather);

    this.weatherNameEl.classList.add('fading');

    setTimeout(() => {
      this.weatherNameEl.textContent = weatherConfigs[weather].name;
      this.weatherNameEl.classList.remove('fading');
    }, 400);

    this.weatherSystem.switchWeather(weather);

    setTimeout(() => {
      this.isWeatherAnimating = false;
    }, 1000);
  }

  private updateActiveButton(weather: WeatherType): void {
    this.weatherButtons.forEach(btn => {
      if (btn.dataset.weather === weather) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateUI(): void {
    const particleCount = this.weatherSystem.getTargetParticleCount();
    this.densitySlider.value = particleCount.toString();
    this.densityValue.textContent = particleCount.toString();
    this.weatherNameEl.textContent = weatherConfigs[this.currentWeather].name;
    this.displayedParticleCount = particleCount;
    this.particleCountEl.textContent = particleCount.toString();
  }

  private animateUI = (): void => {
    const actualCount = this.weatherSystem.getParticleCount();
    const pendingCount = this.weatherSystem.getPendingParticleCount();
    const transitioning = this.weatherSystem.isWeatherTransitioning();

    const targetDisplay = transitioning
      ? (pendingCount !== this.weatherSystem.getTargetParticleCount() ? pendingCount : actualCount)
      : actualCount;

    const smoothedCount = this.displayedParticleCount + (targetDisplay - this.displayedParticleCount) * 0.12;
    this.displayedParticleCount = smoothedCount;
    this.particleCountEl.textContent = Math.round(smoothedCount).toString();

    const fps = this.weatherSystem.getFPS();
    this.fpsValueEl.textContent = fps.toString();

    if (fps >= 50) {
      this.fpsValueEl.style.color = 'var(--accent-color)';
    } else if (fps >= 30) {
      this.fpsValueEl.style.color = '#ECC94B';
    } else {
      this.fpsValueEl.style.color = '#F56565';
    }

    requestAnimationFrame(this.animateUI);
  };

  public getWeatherSystem(): WeatherSystem {
    return this.weatherSystem;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new WeatherApp();
    (window as any).weatherApp = app;
  } catch (error) {
    console.error('Failed to initialize weather app:', error);
  }
});
