import * as THREE from 'three'
import type { BuildingData } from './buildings'

export type WeatherPreset = 'sunny' | 'cloudy' | 'overcast'

export interface WeatherConfig {
  intensity: number
  ambientColor: number
  shadowIntensity: number
}

export const WEATHER_PRESETS: Record<WeatherPreset, WeatherConfig> = {
  sunny: {
    intensity: 1.5,
    ambientColor: 0xffffff,
    shadowIntensity: 0.8
  },
  cloudy: {
    intensity: 0.8,
    ambientColor: 0xe0e0e0,
    shadowIntensity: 0.4
  },
  overcast: {
    intensity: 0.3,
    ambientColor: 0x808080,
    shadowIntensity: 0.1
  }
}

export const WEATHER_INFO: Record<WeatherPreset, { icon: string; name: string }> = {
  sunny: { icon: '☀️', name: '晴天' },
  cloudy: { icon: '⛅', name: '多云' },
  overcast: { icon: '☁️', name: '阴天' }
}

const WEATHER_TRANSITION_DURATION = 1000
const SUN_DISTANCE = 500
const SHADOW_CAMERA_SIZE = 350

class ShadowSimulation {
  private scene: THREE.Scene
  private directionalLight: THREE.DirectionalLight
  private ambientLight: THREE.AmbientLight
  private buildings: BuildingData[] = []
  private currentWeather: WeatherPreset = 'sunny'
  private targetWeatherConfig: WeatherConfig = WEATHER_PRESETS.sunny
  private currentWeatherConfig: WeatherConfig = { ...WEATHER_PRESETS.sunny }
  private isWeatherTransitioning = false
  private weatherTransitionStart = 0
  private shadowResolution = 1024
  private shadowsEnabled = true
  private shadowArea = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = this.shadowResolution
    this.directionalLight.shadow.mapSize.height = this.shadowResolution
    this.directionalLight.shadow.camera.near = 1
    this.directionalLight.shadow.camera.far = 1500
    this.directionalLight.shadow.camera.left = -SHADOW_CAMERA_SIZE
    this.directionalLight.shadow.camera.right = SHADOW_CAMERA_SIZE
    this.directionalLight.shadow.camera.top = SHADOW_CAMERA_SIZE
    this.directionalLight.shadow.camera.bottom = -SHADOW_CAMERA_SIZE
    this.directionalLight.shadow.bias = -0.0005
    ;(this.directionalLight.shadow as any).intensity = 0.8

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3)

    this.scene.add(this.directionalLight)
    this.scene.add(this.ambientLight)
  }

  setBuildings(buildings: BuildingData[]): void {
    this.buildings = buildings
  }

  updateShadow(azimuth: number, altitude: number): number {
    if (this.isWeatherTransitioning) {
      this.updateWeatherTransition()
    }

    const azimuthRad = THREE.MathUtils.degToRad(azimuth)
    const altitudeRad = THREE.MathUtils.degToRad(altitude)

    const sunX = Math.cos(altitudeRad) * Math.sin(azimuthRad) * SUN_DISTANCE
    const sunY = Math.sin(altitudeRad) * SUN_DISTANCE
    const sunZ = Math.cos(altitudeRad) * Math.cos(azimuthRad) * SUN_DISTANCE

    this.directionalLight.position.set(sunX, sunY, sunZ)
    this.directionalLight.target.position.set(0, 0, 0)
    this.directionalLight.target.updateMatrixWorld()

    this.shadowArea = this.calculateShadowArea(altitude)

    return this.shadowArea
  }

  setWeather(preset: WeatherPreset): void {
    this.currentWeather = preset
    this.targetWeatherConfig = { ...WEATHER_PRESETS[preset] }
    this.isWeatherTransitioning = true
    this.weatherTransitionStart = performance.now()
  }

  getWeather(): WeatherPreset {
    return this.currentWeather
  }

  getWeatherInfo(): { icon: string; name: string } {
    return WEATHER_INFO[this.currentWeather]
  }

  setShadowResolution(resolution: number): void {
    this.shadowResolution = resolution
    this.directionalLight.shadow.mapSize.width = resolution
    this.directionalLight.shadow.mapSize.height = resolution
    if (this.directionalLight.shadow.map) {
      this.directionalLight.shadow.map.dispose()
      this.directionalLight.shadow.map = null
    }
  }

  getShadowResolution(): number {
    return this.shadowResolution
  }

  setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled
    this.directionalLight.castShadow = enabled
    this.buildings.forEach((building) => {
      building.mesh.castShadow = enabled
    })
    if (this.scene.userData.ground) {
      ;(this.scene.userData.ground as THREE.Mesh).receiveShadow = enabled
    }
  }

  getShadowsEnabled(): boolean {
    return this.shadowsEnabled
  }

  getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight
  }

  getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight
  }

  private calculateShadowArea(altitude: number): number {
    if (altitude <= 0 || !this.shadowsEnabled) return 0

    const altitudeRad = THREE.MathUtils.degToRad(altitude)
    const shadowLengthFactor = 1 / Math.max(Math.tan(altitudeRad), 0.01)

    let totalArea = 0
    const weatherFactor = this.currentWeatherConfig.shadowIntensity

    this.buildings.forEach((building) => {
      const height = building.mesh.userData.baseHeight
      const width = 15
      const depth = 15

      const shadowLength = height * shadowLengthFactor

      const baseArea = width * depth
      const extendedArea = baseArea + shadowLength * (width + depth) * 0.5

      totalArea += extendedArea * weatherFactor
    })

    return Math.round(totalArea * 10) / 10
  }

  private updateWeatherTransition(): void {
    const now = performance.now()
    const elapsed = now - this.weatherTransitionStart
    const progress = Math.min(elapsed / WEATHER_TRANSITION_DURATION, 1)
    const easedProgress = this.easeInOutCubic(progress)

    this.currentWeatherConfig.intensity = this.lerp(
      WEATHER_PRESETS[this.currentWeather].intensity,
      this.targetWeatherConfig.intensity,
      easedProgress
    )

    this.currentWeatherConfig.ambientColor = this.lerpColor(
      WEATHER_PRESETS[this.currentWeather].ambientColor,
      this.targetWeatherConfig.ambientColor,
      easedProgress
    )

    this.currentWeatherConfig.shadowIntensity = this.lerp(
      WEATHER_PRESETS[this.currentWeather].shadowIntensity,
      this.targetWeatherConfig.shadowIntensity,
      easedProgress
    )

    this.directionalLight.intensity = this.currentWeatherConfig.intensity
    ;(this.directionalLight.shadow as any).intensity = this.currentWeatherConfig.shadowIntensity
    this.ambientLight.color.setHex(this.currentWeatherConfig.ambientColor)

    if (progress >= 1) {
      this.isWeatherTransitioning = false
      this.currentWeatherConfig = { ...this.targetWeatherConfig }
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 255
    const g1 = (color1 >> 8) & 255
    const b1 = color1 & 255

    const r2 = (color2 >> 16) & 255
    const g2 = (color2 >> 8) & 255
    const b2 = color2 & 255

    const r = Math.round(this.lerp(r1, r2, t))
    const g = Math.round(this.lerp(g1, g2, t))
    const b = Math.round(this.lerp(b1, b2, t))

    return (r << 16) | (g << 8) | b
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
}

export function createShadowSimulation(scene: THREE.Scene): ShadowSimulation {
  return new ShadowSimulation(scene)
}

export type { ShadowSimulation }

export default createShadowSimulation
