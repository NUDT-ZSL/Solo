import type { WeatherType } from './weatherStateMachine'

export interface LightParams {
  directionalIntensity: number
  directionalColor: string
  ambientIntensity: number
  direction: [number, number, number]
}

export interface ParticleParams {
  count: number
  size: number
  speed: number
  color: string
  opacity: number
  length?: number
  rotate?: boolean
}

export interface ObjectResponseParams {
  metalWaterDrop: boolean
  woodShake: boolean
}

export interface EnvironmentParams {
  skyColor: string
  fogDensity: number
  fogColor: string
  light: LightParams
  particles: ParticleParams | null
  flashEnabled: boolean
  objectResponse: ObjectResponseParams
}

const WEATHER_ENVIRONMENTS: Record<WeatherType, EnvironmentParams> = {
  sunny: {
    skyColor: '#87CEEB',
    fogDensity: 0.002,
    fogColor: '#87CEEB',
    light: {
      directionalIntensity: 1.5,
      directionalColor: '#FFE4B5',
      ambientIntensity: 0.6,
      direction: [5, 8, 3],
    },
    particles: {
      count: 200,
      size: 2,
      speed: 0.2,
      color: '#ffffff',
      opacity: 0.3,
    },
    flashEnabled: false,
    objectResponse: {
      metalWaterDrop: false,
      woodShake: false,
    },
  },
  rainy: {
    skyColor: '#696969',
    fogDensity: 0.008,
    fogColor: '#696969',
    light: {
      directionalIntensity: 0.5,
      directionalColor: '#CCCCCC',
      ambientIntensity: 0.3,
      direction: [3, 6, 2],
    },
    particles: {
      count: 3000,
      size: 1,
      speed: 2,
      color: '#4488CC',
      opacity: 0.5,
      length: 15,
    },
    flashEnabled: false,
    objectResponse: {
      metalWaterDrop: true,
      woodShake: false,
    },
  },
  snowy: {
    skyColor: '#B0C4DE',
    fogDensity: 0.006,
    fogColor: '#C8D8E8',
    light: {
      directionalIntensity: 0.8,
      directionalColor: '#D8E8FF',
      ambientIntensity: 0.5,
      direction: [4, 7, 3],
    },
    particles: {
      count: 1500,
      size: 6,
      speed: 0.5,
      color: '#FFFFFF',
      opacity: 0.8,
      rotate: true,
    },
    flashEnabled: false,
    objectResponse: {
      metalWaterDrop: false,
      woodShake: false,
    },
  },
  thunder: {
    skyColor: '#2F2F4F',
    fogDensity: 0.012,
    fogColor: '#2F2F4F',
    light: {
      directionalIntensity: 0.3,
      directionalColor: '#555555',
      ambientIntensity: 0.15,
      direction: [3, 5, 2],
    },
    particles: {
      count: 3000,
      size: 1,
      speed: 2.5,
      color: '#4488CC',
      opacity: 0.5,
      length: 15,
    },
    flashEnabled: true,
    objectResponse: {
      metalWaterDrop: true,
      woodShake: true,
    },
  },
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  )
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpArray(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => lerp(v, b[i], t))
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function getEnvironmentParams(weather: WeatherType): EnvironmentParams {
  return WEATHER_ENVIRONMENTS[weather]
}

export function interpolateEnvironment(
  from: WeatherType,
  to: WeatherType,
  progress: number,
): EnvironmentParams {
  const t = easeInOutCubic(progress)
  const envFrom = WEATHER_ENVIRONMENTS[from]
  const envTo = WEATHER_ENVIRONMENTS[to]

  const fromCount = envFrom.particles?.count ?? 0
  const toCount = envTo.particles?.count ?? 0

  const showParticles = t < 0.5 ? envFrom.particles : envTo.particles
  const interpolatedCount = Math.round(lerp(fromCount, toCount, t))

  const particles: ParticleParams | null = showParticles
    ? {
        ...showParticles,
        count: interpolatedCount,
        size: lerp(envFrom.particles?.size ?? 0, envTo.particles?.size ?? 0, t),
        speed: lerp(envFrom.particles?.speed ?? 0, envTo.particles?.speed ?? 0, t),
        opacity: lerp(envFrom.particles?.opacity ?? 0, envTo.particles?.opacity ?? 0, t),
      }
    : null

  const dirFrom = envFrom.light.direction
  const dirTo = envTo.light.direction
  const dirInterpolated = lerpArray(dirFrom, dirTo, t) as [number, number, number]

  return {
    skyColor: lerpColor(envFrom.skyColor, envTo.skyColor, t),
    fogDensity: lerp(envFrom.fogDensity, envTo.fogDensity, t),
    fogColor: lerpColor(envFrom.fogColor, envTo.fogColor, t),
    light: {
      directionalIntensity: lerp(envFrom.light.directionalIntensity, envTo.light.directionalIntensity, t),
      directionalColor: lerpColor(envFrom.light.directionalColor, envTo.light.directionalColor, t),
      ambientIntensity: lerp(envFrom.light.ambientIntensity, envTo.light.ambientIntensity, t),
      direction: dirInterpolated,
    },
    particles,
    flashEnabled: t >= 0.5 ? envTo.flashEnabled : envFrom.flashEnabled,
    objectResponse: {
      metalWaterDrop: t >= 0.5 ? envTo.objectResponse.metalWaterDrop : envFrom.objectResponse.metalWaterDrop,
      woodShake: t >= 0.5 ? envTo.objectResponse.woodShake : envFrom.objectResponse.woodShake,
    },
  }
}

export interface WeatherMetrics {
  temperature: number
  humidity: number
  windSpeed: number
  precipitation: number
}

const WEATHER_METRICS: Record<WeatherType, WeatherMetrics> = {
  sunny: { temperature: 28, humidity: 35, windSpeed: 8, precipitation: 5 },
  rainy: { temperature: 18, humidity: 85, windSpeed: 22, precipitation: 80 },
  snowy: { temperature: -5, humidity: 70, windSpeed: 12, precipitation: 60 },
  thunder: { temperature: 15, humidity: 92, windSpeed: 45, precipitation: 95 },
}

export function getWeatherMetrics(weather: WeatherType): WeatherMetrics {
  return WEATHER_METRICS[weather]
}

export function interpolateMetrics(
  from: WeatherType,
  to: WeatherType,
  progress: number,
): WeatherMetrics {
  const t = easeInOutCubic(progress)
  const mFrom = WEATHER_METRICS[from]
  const mTo = WEATHER_METRICS[to]
  return {
    temperature: lerp(mFrom.temperature, mTo.temperature, t),
    humidity: lerp(mFrom.humidity, mTo.humidity, t),
    windSpeed: lerp(mFrom.windSpeed, mTo.windSpeed, t),
    precipitation: lerp(mFrom.precipitation, mTo.precipitation, t),
  }
}
