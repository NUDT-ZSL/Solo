export enum TimePhase {
  DAWN = 'dawn',
  NOON = 'noon',
  DUSK = 'dusk',
  NIGHT = 'night',
}

export enum WeatherType {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  RAINY = 'rainy',
  SNOWY = 'snowy',
}

export interface TimeState {
  phase: TimePhase;
  phaseProgress: number;
  lightIntensity: number;
  totalSeconds: number;
  formattedTime: string;
}

export interface WeatherState {
  type: WeatherType;
  transitionProgress: number;
  previousType: WeatherType;
  particleConfig: ParticleConfig;
  windX: number;
}

export interface ParticleConfig {
  rainRate: number;
  snowRate: number;
  dustRate: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'rain' | 'snow' | 'dust' | 'splash';
  size: number;
}

export interface GameInput {
  keys: Set<string>;
}

export interface CameraState {
  x: number;
  y: number;
}
