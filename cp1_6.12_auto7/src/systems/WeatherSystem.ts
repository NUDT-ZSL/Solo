import { WeatherType, WeatherState, Particle, ParticleConfig, CameraState } from '../types.js';

const WEATHER_ORDER: WeatherType[] = [
  WeatherType.SUNNY,
  WeatherType.CLOUDY,
  WeatherType.RAINY,
  WeatherType.SNOWY,
];

const TRANSITION_DURATION = 5;
const MIN_WEATHER_DURATION = 30;
const MAX_WEATHER_DURATION = 45;

export class WeatherSystem {
  private state: WeatherState;
  private weatherDuration: number;
  private weatherElapsed: number;
  private spawnAccumulatorRain: number = 0;
  private spawnAccumulatorSnow: number = 0;
  private targetParticleRates: ParticleConfig;
  private previousParticleRates: ParticleConfig;
  private previousWeatherDarkness: number;
  private targetWeatherDarkness: number;
  private particleLogTimer: number = 0;

  constructor() {
    this.weatherDuration = this.randomDuration();
    this.weatherElapsed = 0;
    this.previousParticleRates = { rainRate: 0, snowRate: 0, dustRate: 0 };
    this.targetParticleRates = this.getRateForWeather(WeatherType.SUNNY);
    this.previousWeatherDarkness = this.getDarknessForWeather(WeatherType.SUNNY);
    this.targetWeatherDarkness = this.getDarknessForWeather(WeatherType.SUNNY);
    this.state = {
      type: WeatherType.SUNNY,
      previousType: WeatherType.SUNNY,
      transitionProgress: 1.0,
      particleConfig: { ...this.targetParticleRates },
      windX: 0,
    };
  }

  private randomDuration(): number {
    return MIN_WEATHER_DURATION + Math.random() * (MAX_WEATHER_DURATION - MIN_WEATHER_DURATION);
  }

  public update(deltaTime: number): void {
    this.weatherElapsed += deltaTime;

    if (this.state.transitionProgress < 1.0) {
      this.state.transitionProgress = Math.min(1.0, this.state.transitionProgress + deltaTime / TRANSITION_DURATION);
      if (this.state.transitionProgress >= 1.0) {
        this.state.previousType = this.state.type;
      }
    }

    if (this.weatherElapsed >= this.weatherDuration && this.state.transitionProgress >= 1.0) {
      this.switchWeather();
    }

    this.updateParticleConfig();
    this.updateWind(deltaTime);
  }

  private switchWeather(): void {
    const currentIndex = WEATHER_ORDER.indexOf(this.state.type);
    const nextIndex = (currentIndex + 1) % WEATHER_ORDER.length;
    const nextType = WEATHER_ORDER[nextIndex];

    this.state.previousType = this.state.type;
    this.state.type = nextType;
    this.state.transitionProgress = 0;
    this.weatherDuration = this.randomDuration();
    this.weatherElapsed = 0;

    this.previousParticleRates = { ...this.state.particleConfig };
    this.targetParticleRates = this.getRateForWeather(nextType);
    this.previousWeatherDarkness = this.getDarknessForWeather(this.state.previousType);
    this.targetWeatherDarkness = this.getDarknessForWeather(nextType);
  }

  private getDarknessForWeather(type: WeatherType): number {
    switch (type) {
      case WeatherType.SUNNY: return 1.0;
      case WeatherType.CLOUDY: return 0.75;
      case WeatherType.RAINY: return 0.55;
      case WeatherType.SNOWY: return 0.65;
    }
  }

  public getInterpolatedDarkness(): number {
    const t = this.state.transitionProgress;
    return this.previousWeatherDarkness + (this.targetWeatherDarkness - this.previousWeatherDarkness) * t;
  }

  private updateParticleConfig(): void {
    const t = this.state.transitionProgress;
    this.state.particleConfig = {
      rainRate: this.previousParticleRates.rainRate + (this.targetParticleRates.rainRate - this.previousParticleRates.rainRate) * t,
      snowRate: this.previousParticleRates.snowRate + (this.targetParticleRates.snowRate - this.previousParticleRates.snowRate) * t,
      dustRate: this.previousParticleRates.dustRate + (this.targetParticleRates.dustRate - this.previousParticleRates.dustRate) * t,
    };
  }

  private getRateForWeather(type: WeatherType): ParticleConfig {
    switch (type) {
      case WeatherType.SUNNY:
        return { rainRate: 0, snowRate: 0, dustRate: 2 };
      case WeatherType.CLOUDY:
        return { rainRate: 5, snowRate: 0, dustRate: 0.5 };
      case WeatherType.RAINY:
        return { rainRate: 40, snowRate: 0, dustRate: 0 };
      case WeatherType.SNOWY:
        return { rainRate: 0, snowRate: 25, dustRate: 0 };
    }
  }

  private getWindForWeather(type: WeatherType): number {
    switch (type) {
      case WeatherType.SUNNY: return 0;
      case WeatherType.CLOUDY: return 20;
      case WeatherType.RAINY: return 60;
      case WeatherType.SNOWY: return 40;
    }
  }

  public checkParticleLimit(particles: Particle[], max: number): number {
    let removed = 0;
    while (particles.length > max) {
      particles.shift();
      removed++;
    }
    if (removed > 0) {
      console.log(`[WeatherSystem] Removed ${removed} oldest particles to maintain limit ${max}, current: ${particles.length}`);
    }
    return removed;
  }

  private updateWind(deltaTime: number): void {
    const targetWind = this.getWindForWeather(this.state.type);
    const prevTarget = this.getWindForWeather(this.state.previousType);
    const t = this.state.transitionProgress;
    const blendedTarget = prevTarget + (targetWind - prevTarget) * t;
    this.state.windX += (blendedTarget - this.state.windX) * Math.min(1, deltaTime * 2);
    this.state.windX += (Math.random() - 0.5) * 10 * deltaTime;
  }

  public updateWithParticleCheck(deltaTime: number, particles: Particle[]): void {
    this.update(deltaTime);
    this.particleLogTimer += deltaTime;
    if (this.particleLogTimer >= 5) {
      this.particleLogTimer = 0;
      console.log(`[WeatherSystem] Particle count: ${particles.length}, Weather: ${this.state.type}, Transition: ${(this.state.transitionProgress * 100).toFixed(0)}%`);
    }
  }

  public getState(): WeatherState {
    return this.state;
  }

  public spawnParticles(
    particles: Particle[],
    camera: CameraState,
    viewWidth: number,
    viewHeight: number
  ): void {
    this.spawnAccumulatorRain += this.state.particleConfig.rainRate;
    this.spawnAccumulatorSnow += this.state.particleConfig.snowRate;

    while (this.spawnAccumulatorRain >= 1) {
      this.spawnAccumulatorRain -= 1;
      particles.push(this.createRainParticle(camera, viewWidth, viewHeight));
    }

    while (this.spawnAccumulatorSnow >= 1) {
      this.spawnAccumulatorSnow -= 1;
      particles.push(this.createSnowParticle(camera, viewWidth, viewHeight));
    }
  }

  private createRainParticle(
    camera: CameraState,
    viewWidth: number,
    viewHeight: number
  ): Particle {
    const windOffset = this.state.windX * 0.5;
    return {
      x: camera.x + Math.random() * (viewWidth + 200) - 100 + windOffset,
      y: camera.y - 50 - Math.random() * viewHeight,
      vx: this.state.windX,
      vy: 600 + Math.random() * 200,
      life: 3,
      maxLife: 3,
      type: 'rain',
      size: 2,
    };
  }

  private createSnowParticle(
    camera: CameraState,
    viewWidth: number,
    viewHeight: number
  ): Particle {
    return {
      x: camera.x + Math.random() * (viewWidth + 200) - 100,
      y: camera.y - 20 - Math.random() * viewHeight,
      vx: this.state.windX,
      vy: 50 + Math.random() * 60,
      life: 8,
      maxLife: 8,
      type: 'snow',
      size: 1.5 + Math.random() * 2.5,
    };
  }
}
