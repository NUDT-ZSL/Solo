/**
 * ============================================================
 *  shadowSimulation.ts - 阴影模拟与天气控制模块
 * ============================================================
 *
 * 【职责】
 *    1. 根据太阳方位角/高度角，动态调整方向光位置和阴影相机
 *    2. 管理三种天气预设（晴天/多云/阴天），1秒线性平滑过渡
 *    3. 光照强度与阴影对比度联动：晴天阴影最深，阴天几乎无阴影
 *    4. 基于几何投影精确计算所有建筑的阴影总面积
 *    5. FPS监测 + 阴影精度自动降级策略
 *
 * 【被调用关系】
 *    main.ts → createShadowSimulation(scene)          实例化模块
 *    main.ts → shadowSimulation.setBuildings(list)    传入建筑数据
 *    main.ts → shadowSimulation.updateShadow(azi,alt) 【每帧调用】更新阴影，返回面积
 *    main.ts → shadowSimulation.getWeatherInfo()      获取天气图标+文字
 *    guiController.ts → shadowSimulation.setWeather()  GUI切换天气
 *    guiController.ts → shadowSimulation.setShadowsEnabled()  GUI开关阴影
 *    guiController.ts → shadowSimulation.setShadowResolution() GUI设置分辨率
 *
 * 【数据输入】
 *    ← BuildingData[]    从 buildings.ts 传入，通过 setBuildings()
 *    ← azimuth, altitude 从 timeManager 传出，通过 main.ts 回调传入
 *
 * 【数据输出】
 *    → number (阴影总面积 m²) 从 updateShadow() 返回，main.ts 更新信息板 UI
 * ============================================================
 */

import * as THREE from 'three'
import type { BuildingData } from './buildings'

export type WeatherPreset = 'sunny' | 'cloudy' | 'overcast'

export interface WeatherConfig {
  intensity: number
  ambientColor: number
  shadowIntensity: number
}

/**
 * 三种天气预设配置
 * 光照强度与阴影对比度联动关系：
 *   晴天：强度1.5 → 阴影0.8（最深）
 *   多云：强度0.8 → 阴影0.4（中等）
 *   阴天：强度0.3 → 阴影0.1（几乎消失）
 */
export const WEATHER_PRESETS: Record<WeatherPreset, WeatherConfig> = {
  sunny: {
    intensity: 1.5,
    ambientColor: 0xffffff,
    shadowIntensity: 0.85
  },
  cloudy: {
    intensity: 0.8,
    ambientColor: 0xd0d0d0,
    shadowIntensity: 0.45
  },
  overcast: {
    intensity: 0.3,
    ambientColor: 0x707070,
    shadowIntensity: 0.08
  }
}

export const WEATHER_INFO: Record<WeatherPreset, { icon: string; name: string }> = {
  sunny: { icon: '☀️', name: '晴天' },
  cloudy: { icon: '⛅', name: '多云' },
  overcast: { icon: '☁️', name: '阴天' }
}

/** 阴影精度等级（配合自动降级策略使用） */
export const SHADOW_RESOLUTION_LEVELS: number[] = [256, 512, 1024, 2048, 4096]
export const DEFAULT_SHADOW_RESOLUTION: number = 1024

/** 天气过渡动画时长（纯线性，1秒 = 1000ms） */
const WEATHER_TRANSITION_MS: number = 1000
const SUN_DISTANCE: number = 600
const SHADOW_CAMERA_SIZE: number = 400

/** FPS监测与自动降级参数 */
const FPS_SAMPLE_WINDOW: number = 30
const FPS_LOW_THRESHOLD: number = 45
const FPS_RECOVER_THRESHOLD: number = 58
const FPS_CHECK_INTERVAL: number = 3000

class ShadowSimulation {
  private scene: THREE.Scene
  private directionalLight: THREE.DirectionalLight
  private ambientLight: THREE.AmbientLight
  private buildings: BuildingData[] = []

  private currentWeather: WeatherPreset = 'sunny'
  private weatherStartConfig: WeatherConfig = { ...WEATHER_PRESETS.sunny }
  private weatherTargetConfig: WeatherConfig = { ...WEATHER_PRESETS.sunny }
  private isWeatherTransitioning: boolean = false
  private weatherTransitionStartAt: number = 0

  private shadowResolution: number = DEFAULT_SHADOW_RESOLUTION
  private shadowsEnabled: boolean = true

  private currentShadowArea: number = 0

  private fpsFrameTimes: number[] = []
  private fpsLastFrameAt: number = 0
  private fpsLastCheckAt: number = 0
  private autoDowngradeEnabled: boolean = true

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.directionalLight = new THREE.DirectionalLight(0xffffff, WEATHER_PRESETS.sunny.intensity)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = this.shadowResolution
    this.directionalLight.shadow.mapSize.height = this.shadowResolution
    this.directionalLight.shadow.camera.near = 1
    this.directionalLight.shadow.camera.far = 2000
    this.directionalLight.shadow.camera.left = -SHADOW_CAMERA_SIZE
    this.directionalLight.shadow.camera.right = SHADOW_CAMERA_SIZE
    this.directionalLight.shadow.camera.top = SHADOW_CAMERA_SIZE
    this.directionalLight.shadow.camera.bottom = -SHADOW_CAMERA_SIZE
    this.directionalLight.shadow.bias = -0.0005
    this.directionalLight.shadow.normalBias = 0.02
    ;(this.directionalLight.shadow as any).intensity = WEATHER_PRESETS.sunny.shadowIntensity

    this.ambientLight = new THREE.AmbientLight(
      WEATHER_PRESETS.sunny.ambientColor,
      0.3
    )

    this.scene.add(this.directionalLight)
    this.scene.add(this.ambientLight)

    this.fpsLastFrameAt = performance.now()
    this.fpsLastCheckAt = performance.now()
  }

  setBuildings(buildings: BuildingData[]): void {
    this.buildings = buildings
  }

  /**
   * 【核心更新函数】每帧由 main.ts 调用
   *
   * 执行流程：
   *  1. 采集FPS样本（用于自动降级判定）
   *  2. 更新天气过渡（若正在切换中）
   *  3. 将方位角/高度角转换为球坐标 → 设置方向光位置
   *  4. 计算阴影总面积（几何投影法）
   *
   * @param azimuth  方位角（度）：-90(东) ~ 0(南) ~ +90(西)
   * @param altitude 高度角（度）：0(地平线) ~ 90(天顶)
   * @returns 当前阴影总面积（平方米）
   */
  updateShadow(azimuth: number, altitude: number): number {
    this.collectFpsSample()
    this.checkAutoDowngrade()

    if (this.isWeatherTransitioning) {
      this.updateWeatherTransition(performance.now())
    }

    if (altitude <= 0 || !this.shadowsEnabled) {
      this.currentShadowArea = 0
      this.directionalLight.castShadow = false
      return 0
    }

    this.directionalLight.castShadow = true

    const azimuthRad: number = THREE.MathUtils.degToRad(azimuth)
    const altitudeRad: number = THREE.MathUtils.degToRad(altitude)

    const sunX: number = Math.cos(altitudeRad) * Math.sin(azimuthRad) * SUN_DISTANCE
    const sunY: number = Math.sin(altitudeRad) * SUN_DISTANCE
    const sunZ: number = Math.cos(altitudeRad) * Math.cos(azimuthRad) * SUN_DISTANCE

    this.directionalLight.position.set(sunX, sunY, sunZ)
    this.directionalLight.target.position.set(0, 0, 0)
    this.directionalLight.target.updateMatrixWorld()

    this.currentShadowArea = this.calculateShadowAreaGeometry(
      azimuthRad,
      altitudeRad
    )

    return this.currentShadowArea
  }

  /**
   * 设置天气预设 → 启动1秒纯线性渐变动画
   * 渐变内容：光照强度、环境光颜色、阴影强度三者同时线性插值
   */
  setWeather(preset: WeatherPreset): void {
    if (preset === this.currentWeather) return

    const now: number = performance.now()

    if (this.isWeatherTransitioning) {
      this.weatherStartConfig = this.interpolateConfig(
        WEATHER_PRESETS[this.currentWeather],
        this.weatherTargetConfig,
        Math.min((now - this.weatherTransitionStartAt) / WEATHER_TRANSITION_MS, 1)
      )
    } else {
      this.weatherStartConfig = {
        intensity: this.directionalLight.intensity,
        ambientColor: this.rgbToHex(this.ambientLight.color),
        shadowIntensity: (this.directionalLight.shadow as any).intensity
      }
    }

    this.currentWeather = preset
    this.weatherTargetConfig = { ...WEATHER_PRESETS[preset] }
    this.isWeatherTransitioning = true
    this.weatherTransitionStartAt = now
  }

  getWeather(): WeatherPreset {
    return this.currentWeather
  }

  getWeatherInfo(): { icon: string; name: string } {
    return WEATHER_INFO[this.currentWeather]
  }

  /**
   * 设置阴影贴图分辨率
   * 支持：256 / 512 / 1024 / 2048 / 4096
   * 设置后自动销毁旧贴图，下一帧重建
   */
  setShadowResolution(resolution: number): void {
    const validRes: number = SHADOW_RESOLUTION_LEVELS.includes(resolution)
      ? resolution
      : DEFAULT_SHADOW_RESOLUTION

    this.shadowResolution = validRes
    this.directionalLight.shadow.mapSize.width = validRes
    this.directionalLight.shadow.mapSize.height = validRes

    if (this.directionalLight.shadow.map) {
      this.directionalLight.shadow.map.dispose()
      this.directionalLight.shadow.map = null
    }
  }

  getShadowResolution(): number {
    return this.shadowResolution
  }

  /** 开关阴影渲染 */
  setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled
    this.directionalLight.castShadow = enabled
    this.buildings.forEach((b: BuildingData) => {
      b.mesh.castShadow = enabled
    })
    if (this.scene.userData.ground) {
      ;(this.scene.userData.ground as THREE.Mesh).receiveShadow = enabled
    }
  }

  getShadowsEnabled(): boolean {
    return this.shadowsEnabled
  }

  setAutoDowngradeEnabled(enabled: boolean): void {
    this.autoDowngradeEnabled = enabled
  }

  getAutoDowngradeEnabled(): boolean {
    return this.autoDowngradeEnabled
  }

  getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight
  }

  getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight
  }

  /**
   * ============================================================
   *  阴影面积精确几何计算
   * ============================================================
   *
   *  算法原理（建筑底面为矩形，通过旋转后投影到地面）：
   *
   *  步骤1：计算阴影投影向量
   *    太阳高度角 altitude → 阴影拉伸系数 k = 1 / tan(altitude)
   *    太阳方位角 azimuth  → 阴影延伸方向
   *
   *  步骤2：对每栋建筑，考虑建筑自身旋转 + 太阳方位角，
   *         计算底面矩形投影后的OBB面积
   *
   *  步骤3：阴影长度 = 建筑高度 × k
   *         投影面积 = OBB底面积 + 侧面投影增量
   *
   *  步骤4：乘以天气系数（晴天乘得最多，阴天最少）
   *
   * @param azimuthRad  方位角（弧度）
   * @param altitudeRad 高度角（弧度）
   * @returns 所有建筑阴影总面积（平方米）
   */
  private calculateShadowAreaGeometry(
    azimuthRad: number,
    altitudeRad: number
  ): number {
    const tanAlt: number = Math.max(Math.tan(altitudeRad), 0.01)
    const shadowLengthK: number = 1 / tanAlt

    const sunDirX: number = Math.sin(azimuthRad)
    const sunDirZ: number = Math.cos(azimuthRad)

    let totalArea: number = 0
    const weatherFactor: number = this.interpolateShadowFactor()

    for (let i: number = 0; i < this.buildings.length; i++) {
      const building: BuildingData = this.buildings[i]
      const userData: any = building.mesh.userData

      const height: number = userData.baseHeight || (building.floors * 3)
      const width: number = userData.width || 15
      const depth: number = userData.depth || 15
      const buildingRotation: number = userData.rotation || 0

      const shadowLength: number = height * shadowLengthK

      const cosRot: number = Math.cos(buildingRotation)
      const sinRot: number = Math.sin(buildingRotation)

      const hx: number = width / 2
      const hz: number = depth / 2

      const corners: [number, number][] = [
        [ hx * cosRot - hz * sinRot,  hx * sinRot + hz * cosRot],
        [-hx * cosRot - hz * sinRot, -hx * sinRot + hz * cosRot],
        [-hx * cosRot + hz * sinRot, -hx * sinRot - hz * cosRot],
        [ hx * cosRot + hz * sinRot,  hx * sinRot - hz * cosRot]
      ]

      const shadowOffset: [number, number] = [
        sunDirX * shadowLength,
        sunDirZ * shadowLength
      ]

      const projectedCorners: [number, number][] = []
      for (let c: number = 0; c < 4; c++) {
        projectedCorners.push(corners[c])
      }
      for (let c: number = 0; c < 4; c++) {
        projectedCorners.push([
          corners[c][0] + shadowOffset[0],
          corners[c][1] + shadowOffset[1]
        ])
      }

      const hull: [number, number][] = this.convexHull(projectedCorners)
      const area: number = this.polygonArea(hull)

      totalArea += area
    }

    return Math.round(totalArea * weatherFactor * 10) / 10
  }

  /** Andrew monotone chain 凸包算法 → 计算投影多边形的凸包 */
  private convexHull(points: [number, number][]): [number, number][] {
    if (points.length <= 1) return points.slice()

    const sorted: [number, number][] = points
      .slice()
      .sort((a: [number, number], b: [number, number]) =>
        a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]
      )

    const lower: [number, number][] = []
    for (let i: number = 0; i < sorted.length; i++) {
      while (
        lower.length >= 2 &&
        this.cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0
      ) {
        lower.pop()
      }
      lower.push(sorted[i])
    }

    const upper: [number, number][] = []
    for (let i: number = sorted.length - 1; i >= 0; i--) {
      while (
        upper.length >= 2 &&
        this.cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0
      ) {
        upper.pop()
      }
      upper.push(sorted[i])
    }

    lower.pop()
    upper.pop()
    return lower.concat(upper)
  }

  private cross(o: [number, number], a: [number, number], b: [number, number]): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  }

  /** Shoelace 公式 → 计算多边形面积 */
  private polygonArea(vertices: [number, number][]): number {
    if (vertices.length < 3) return 0
    let sum: number = 0
    const n: number = vertices.length
    for (let i: number = 0; i < n; i++) {
      const j: number = (i + 1) % n
      sum += vertices[i][0] * vertices[j][1]
      sum -= vertices[j][0] * vertices[i][1]
    }
    return Math.abs(sum) / 2
  }

  /** 天气过渡：纯线性插值（1000ms），不使用缓动函数 */
  private updateWeatherTransition(now: number): void {
    const elapsed: number = now - this.weatherTransitionStartAt
    const t: number = Math.min(elapsed / WEATHER_TRANSITION_MS, 1)

    const cfg: WeatherConfig = this.interpolateConfig(
      this.weatherStartConfig,
      this.weatherTargetConfig,
      t
    )

    this.directionalLight.intensity = cfg.intensity
    this.ambientLight.color.setHex(cfg.ambientColor)
    ;(this.directionalLight.shadow as any).intensity = cfg.shadowIntensity

    if (t >= 1) {
      this.isWeatherTransitioning = false
      this.weatherStartConfig = { ...this.weatherTargetConfig }
    }
  }

  /** 获取当前天气插值阴影系数（用于阴影面积联动计算） */
  private interpolateShadowFactor(): number {
    if (!this.isWeatherTransitioning) {
      return WEATHER_PRESETS[this.currentWeather].shadowIntensity
    }
    const t: number = Math.min(
      (performance.now() - this.weatherTransitionStartAt) / WEATHER_TRANSITION_MS,
      1
    )
    return this.lerp(
      this.weatherStartConfig.shadowIntensity,
      this.weatherTargetConfig.shadowIntensity,
      t
    )
  }

  private interpolateConfig(
    from: WeatherConfig,
    to: WeatherConfig,
    t: number
  ): WeatherConfig {
    return {
      intensity: this.lerp(from.intensity, to.intensity, t),
      ambientColor: this.lerpColor(from.ambientColor, to.ambientColor, t),
      shadowIntensity: this.lerp(from.shadowIntensity, to.shadowIntensity, t)
    }
  }

  private collectFpsSample(): void {
    const now: number = performance.now()
    const delta: number = now - this.fpsLastFrameAt
    this.fpsLastFrameAt = now

    this.fpsFrameTimes.push(delta)
    if (this.fpsFrameTimes.length > FPS_SAMPLE_WINDOW) {
      this.fpsFrameTimes.shift()
    }
  }

  /** FPS监测 + 自动降级策略 */
  private checkAutoDowngrade(): void {
    if (!this.autoDowngradeEnabled) return
    const now: number = performance.now()
    if (now - this.fpsLastCheckAt < FPS_CHECK_INTERVAL) return
    if (this.fpsFrameTimes.length < FPS_SAMPLE_WINDOW) {
      this.fpsLastCheckAt = now
      return
    }

    const avgDelta: number =
      this.fpsFrameTimes.reduce((a: number, b: number) => a + b, 0) /
      this.fpsFrameTimes.length
    const avgFps: number = 1000 / avgDelta

    const currentLevel: number = SHADOW_RESOLUTION_LEVELS.indexOf(
      this.shadowResolution
    )

    if (avgFps < FPS_LOW_THRESHOLD && currentLevel > 0) {
      this.setShadowResolution(SHADOW_RESOLUTION_LEVELS[currentLevel - 1])
    } else if (avgFps > FPS_RECOVER_THRESHOLD && currentLevel < SHADOW_RESOLUTION_LEVELS.length - 1) {
      this.setShadowResolution(SHADOW_RESOLUTION_LEVELS[currentLevel + 1])
    }

    this.fpsLastCheckAt = now
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1: number = (color1 >> 16) & 255
    const g1: number = (color1 >> 8) & 255
    const b1: number = color1 & 255

    const r2: number = (color2 >> 16) & 255
    const g2: number = (color2 >> 8) & 255
    const b2: number = color2 & 255

    const r: number = Math.round(this.lerp(r1, r2, t))
    const g: number = Math.round(this.lerp(g1, g2, t))
    const b: number = Math.round(this.lerp(b1, b2, t))

    return (r << 16) | (g << 8) | b
  }

  private rgbToHex(color: THREE.Color): number {
    return (
      (Math.round(color.r * 255) << 16) |
      (Math.round(color.g * 255) << 8) |
      Math.round(color.b * 255)
    )
  }
}

export function createShadowSimulation(scene: THREE.Scene): ShadowSimulation {
  return new ShadowSimulation(scene)
}

export type { ShadowSimulation }
export default createShadowSimulation
