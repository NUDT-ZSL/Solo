export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';

export interface WeatherParams {
  particleColor: string;
  particleColorEnd: string;
  speed: number;
  gravity: number;
  wobbleAmount: number;
  isLightning: boolean;
}

const WEATHER_CONFIGS: Record<WeatherType, WeatherParams> = {
  sunny: {
    particleColor: '#FFD700',
    particleColorEnd: '#FFFACD',
    speed: 0.5,
    gravity: -0.02,
    wobbleAmount: 0.5,
    isLightning: false
  },
  cloudy: {
    particleColor: '#B8C5D6',
    particleColorEnd: '#E2E8F0',
    speed: 0.8,
    gravity: 0.01,
    wobbleAmount: 1,
    isLightning: false
  },
  rainy: {
    particleColor: '#63B3ED',
    particleColorEnd: '#90CDF4',
    speed: 3,
    gravity: 0.3,
    wobbleAmount: 0.2,
    isLightning: false
  },
  snowy: {
    particleColor: '#FFFFFF',
    particleColorEnd: '#F7FAFC',
    speed: 1,
    gravity: 0.05,
    wobbleAmount: 2,
    isLightning: false
  },
  stormy: {
    particleColor: '#9F7AEA',
    particleColorEnd: '#B794F4',
    speed: 2.5,
    gravity: 0.2,
    wobbleAmount: 3,
    isLightning: true
  }
};

export class WeatherManager {
  private currentWeather: WeatherType = 'sunny';
  private targetWeather: WeatherType = 'sunny';
  private particleDensity: number = 100;
  private windSpeed: number = 5;
  private transitionProgress: number = 1;
  private transitionDuration: number = 1000;
  private transitionStartTime: number = 0;
  private previousWeather: WeatherType = 'sunny';

  getWeather(): WeatherType {
    return this.currentWeather;
  }

  getTargetWeather(): WeatherType {
    return this.targetWeather;
  }

  setWeather(weather: WeatherType): void {
    if (weather === this.targetWeather) return;
    this.previousWeather = this.currentWeather;
    this.targetWeather = weather;
    this.transitionProgress = 0;
    this.transitionStartTime = performance.now();
  }

  getParticleDensity(): number {
    return this.particleDensity;
  }

  setParticleDensity(density: number): void {
    this.particleDensity = Math.max(10, Math.min(200, density));
  }

  getWindSpeed(): number {
    return this.windSpeed;
  }

  setWindSpeed(speed: number): void {
    this.windSpeed = Math.max(0, Math.min(10, speed));
  }

  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  isTransitioning(): boolean {
    return this.transitionProgress < 1;
  }

  update(_deltaTime: number): void {
    if (this.transitionProgress < 1) {
      const elapsed = performance.now() - this.transitionStartTime;
      this.transitionProgress = Math.min(1, elapsed / this.transitionDuration);
      
      if (this.transitionProgress >= 1) {
        this.currentWeather = this.targetWeather;
      }
    }
  }

  getCurrentParams(): WeatherParams {
    if (this.transitionProgress >= 1) {
      return { ...WEATHER_CONFIGS[this.currentWeather] };
    }

    const fromParams = WEATHER_CONFIGS[this.previousWeather];
    const toParams = WEATHER_CONFIGS[this.targetWeather];
    const t = this.easeInOutCubic(this.transitionProgress);

    return {
      particleColor: this.lerpColor(fromParams.particleColor, toParams.particleColor, t),
      particleColorEnd: this.lerpColor(fromParams.particleColorEnd, toParams.particleColorEnd, t),
      speed: this.lerp(fromParams.speed, toParams.speed, t),
      gravity: this.lerp(fromParams.gravity, toParams.gravity, t),
      wobbleAmount: this.lerp(fromParams.wobbleAmount, toParams.wobbleAmount, t),
      isLightning: toParams.isLightning
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    return this.rgbToHex(
      this.lerp(c1.r, c2.r, t),
      this.lerp(c1.g, c2.g, t),
      this.lerp(c1.b, c2.b, t)
    );
  }

  getPixelSize(): number {
    return this.particleDensity > 100 ? 2 : 4;
  }
}
