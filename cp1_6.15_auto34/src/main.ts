/**
 * ============================================================
 *  main.ts - 应用入口（核心组装层）
 * ============================================================
 *
 * 【职责】
 *    作为整个应用的顶层协调者，负责：
 *    1. 初始化 Three.js 基础环境（Scene / Camera / Renderer / Controls）
 *    2. 加载并组装 4 个独立业务模块
 *    3. 建立模块间的调用关系和数据流管道
 *    4. 启动渲染循环，处理窗口缩放等全局事件
 *    5. 更新 DOM 信息面板（时间/天气/阴影面积）
 *
 * ============================================================
 *  模块调用关系图（由 main.ts 负责装配）
 * ============================================================
 *
 *  ┌───────────────┐     实例化并注册      ┌────────────────────┐
 *  │  buildings.ts │◄─────────────────────│                    │
 *  │  (建筑生成)   │──BuildingData[]──────►│                    │
 *  └───────────────┘   setBuildings()     │                    │
 *                                         │  shadowSimulation  │
 *  ┌───────────────┐  subscribe(callback) │     (阴影模拟)     │
 *  │  timeManager  │─────────────────────►│                    │
 *  │  (时间循环)   │  azimuth, altitude   │                    │
 *  │               │                       │                    │
 *  │               │                       └────────────────────┘
 *  │               │                                  │
 *  │               │◄────setManualTime/resumeAutoPlay │
 *  │               │                                  │ setWeather /
 *  └───────────────┘                                  │ setShadowResolution
 *          ▲                                          │
 *          │                                          ▼
 *          │                                ┌────────────────────┐
 *          │    createGUIController()      │  guiController.ts  │
 *          └───────────────────────────────│     (控制面板)     │
 *                                           └────────────────────┘
 *
 * ============================================================
 *  数据流向详细说明
 * ============================================================
 *
 *  【数据流1：时间 → 阴影 → UI （主循环）】
 *    timeManager 每200ms前进15分钟关键帧
 *      ↓ subscribe() 回调触发
 *    (time, {azimuth, altitude})  传入 main.ts
 *      ↓
 *    ① updateTimeDisplay(time) → DOM显示 HH:MM
 *    ② shadowSimulation.updateShadow(azimuth, altitude)
 *        ├─ 设置 DirectionalLight 位置（球坐标转XYZ）
 *        ├─ 更新阴影相机参数
 *        ├─ 天气过渡插值（如果切换中）
 *        └─ 几何计算阴影面积 → 返回 shadowArea
 *      ↓
 *    ③ updateShadowAreaDisplay(shadowArea) → DOM显示 m²
 *
 *  【数据流2：GUI用户操作 → 各模块】
 *    GUI 拖动时间滑块
 *      ↓ onChange
 *    params.autoPlay = false
 *    timeManager.setManualTime(time) → 暂停循环 + 平滑过渡
 *      ↓ subscribe() 依旧触发
 *    走【数据流1】的路径
 *
 *    GUI 切换天气
 *      ↓ onChange
 *    shadowSimulation.setWeather(preset)
 *      ↓
 *    1秒纯线性渐变：intensity / ambientColor / shadowIntensity 同时插值
 *      ↓ 下一帧 updateShadow() 中应用
 *    渲染结果出现天气变化
 *      ↓ onWeatherChange() 回调
 *    updateWeatherDisplay() → 更新信息板图标
 *
 *    GUI 设置阴影精度
 *      ↓ onChange
 *    shadowSimulation.setShadowResolution(res)
 *      ↓
 *    销毁旧贴图 → 下一帧渲染自动重建新分辨率贴图
 *
 * ============================================================
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/** ───────── 4个独立业务模块的导入 ───────── */
import { buildingsModule, type BuildingData } from './modules/buildings'
import { timeManager, type SunPosition } from './modules/timeManager'
import {
  createShadowSimulation,
  WEATHER_INFO,
  type WeatherPreset,
  type ShadowSimulation
} from './modules/shadowSimulation'
import { createGUIController, type GUIController } from './utils/guiController'

/**
 * 应用主类 - 所有模块的装配容器
 *
 * 初始化流程（在 constructor → init() 中执行）：
 *  Step 1: new THREE.Scene / Camera / Renderer / Controls  → 3D基础环境
 *  Step 2: createShadowSimulation(scene)                    → 阴影模拟模块
 *  Step 3: buildingsModule.getBuildings()                   → 建筑数据
 *  Step 4: shadowSimulation.setBuildings(buildings)         → 传给阴影模块
 *  Step 5: timeManager.subscribe(callback)                  → 注册时间回调
 *  Step 6: createGUIController({timeManager, shadowSim})    → GUI面板
 *  Step 7: timeManager.start() + requestAnimationFrame 循环 → 启动一切
 */
class ShadowSimulationApp {
  /** Three.js 基础对象 */
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls

  /** 4个业务模块实例 */
  private buildings: BuildingData[] = []
  private shadowSimulation: ShadowSimulation
  private guiController: GUIController | null = null

  /** DOM 元素引用（信息面板） */
  private container: HTMLElement
  private timeDisplay: HTMLElement
  private weatherIcon: HTMLElement
  private weatherText: HTMLElement
  private shadowAreaDisplay: HTMLElement

  /** 运行时数据缓存 */
  private currentShadowArea: number = 0
  private animationFrameId: number | null = null

  constructor() {
    /** ① 获取 HTML 中的 DOM 引用 */
    this.container = document.getElementById('canvas-container') || document.body
    this.timeDisplay = document.getElementById('time-display')!
    this.weatherIcon = document.getElementById('weather-icon')!
    this.weatherText = document.getElementById('weather-text')!
    this.shadowAreaDisplay = document.getElementById('shadow-area')!

    /** ② 初始化 Three.js 三维基础环境 */
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0a)
    this.scene.fog = new THREE.Fog(0x0a0a0a, 400, 900)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    )
    this.camera.position.set(220, 180, 260)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05
    this.controls.minDistance = 50
    this.controls.maxDistance = 700
    this.controls.target.set(0, 30, 0)

    /** ③ 实例化阴影模拟模块（需要 Scene 引用来添加光源） */
    this.shadowSimulation = createShadowSimulation(this.scene)

    /** ④ 执行装配流程 */
    this.init()
  }

  /**
   * 装配流程总入口
   * 按顺序执行 5 个装配步骤
   */
  private init(): void {
    this.step1_createEnvironment()
    this.step2_loadBuildingsAndAttachToShadowSim()
    this.step3_connectTimeManagerToShadowSimAndUI()
    this.step4_setupGuiController()
    this.step5_bindGlobalEventsAndStartLoops()
  }

  /**
   * Step 1: 创建环境（地面 + 网格辅助线 + 基础环境光）
   * 调用 buildingsModule 的 createGround / createGridHelper
   */
  private step1_createEnvironment(): void {
    const ground: THREE.Mesh = buildingsModule.createGround()
    this.scene.add(ground)
    this.scene.userData.ground = ground

    const grid: THREE.GridHelper = buildingsModule.createGridHelper()
    this.scene.add(grid)

    const baseAmbient: THREE.AmbientLight = new THREE.AmbientLight(0x303030, 0.15)
    this.scene.add(baseAmbient)
  }

  /**
   * Step 2: 生成建筑 → 添加到场景 → 传给阴影模拟模块
   *
   * 数据流：
   *   buildingsModule.getBuildings()
   *     → BuildingData[]
   *       → forEach: scene.add(mesh)
   *       → shadowSimulation.setBuildings(list)
   */
  private step2_loadBuildingsAndAttachToShadowSim(): void {
    this.buildings = buildingsModule.getBuildings()
    for (let i: number = 0; i < this.buildings.length; i++) {
      this.scene.add(this.buildings[i].mesh)
    }
    this.shadowSimulation.setBuildings(this.buildings)
  }

  /**
   * Step 3: 建立 时间管理器 → 阴影 + UI 的核心数据管道
   *
   * 这是整个应用最关键的数据流节点！
   * 通过 timeManager.subscribe() 注册回调，
   * 每当时间变化（自动步进 / 手动设置）时：
   *   ① 更新信息板时间显示
   *   ② 调用 shadowSimulation.updateShadow() 传入太阳位置，返回阴影面积
   *   ③ 更新信息板阴影面积显示
   */
  private step3_connectTimeManagerToShadowSimAndUI(): void {
    timeManager.subscribe((time: number, sunPosition: SunPosition) => {
      this.updateTimeDisplay(time)

      /** 核心调用：太阳方位 → 阴影模拟 → 返回面积 */
      this.currentShadowArea = this.shadowSimulation.updateShadow(
        sunPosition.azimuth,
        sunPosition.altitude
      )

      this.updateShadowAreaDisplay()
    })
  }

  /**
   * Step 4: 初始化 GUI 控制面板
   * 传入 timeManager 和 shadowSimulation 的引用供 GUI 调用其方法
   */
  private step4_setupGuiController(): void {
    this.guiController = createGUIController({
      timeManager: timeManager,
      shadowSimulation: this.shadowSimulation,
      onWeatherChange: (weather: WeatherPreset) => {
        this.updateWeatherDisplay(weather)
      }
    })

    this.updateWeatherDisplay(this.shadowSimulation.getWeather())
  }

  /** Step 5: 绑定全局事件 + 启动时间循环 + 启动渲染循环 */
  private step5_bindGlobalEventsAndStartLoops(): void {
    window.addEventListener('resize', this.onWindowResize)
    timeManager.start()
    this.renderLoop()
  }

  /** 渲染主循环（60fps），独立于时间管理器的 200ms 逻辑更新 */
  private renderLoop = (): void => {
    this.animationFrameId = requestAnimationFrame(this.renderLoop)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  /** 窗口缩放响应 */
  private onWindowResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  /** ──────── 信息板 UI 更新函数 ──────── */

  private updateTimeDisplay(time: number): void {
    const hours: number = Math.floor(time)
    const minutes: number = Math.round((time - hours) * 60)
    const timeStr: string =
      hours.toString().padStart(2, '0') +
      ':' +
      minutes.toString().padStart(2, '0')
    this.timeDisplay.textContent = timeStr
  }

  private updateWeatherDisplay(weather: WeatherPreset): void {
    const info = WEATHER_INFO[weather]
    this.weatherIcon.textContent = info.icon
    this.weatherText.textContent = info.name
  }

  private updateShadowAreaDisplay(): void {
    this.shadowAreaDisplay.textContent = this.currentShadowArea.toFixed(1)
  }

  /** 资源释放 */
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    timeManager.stop()
    window.removeEventListener('resize', this.onWindowResize)
    this.guiController?.destroy()
    this.renderer.dispose()
  }
}

/** 页面加载完成后实例化应用 */
let app: ShadowSimulationApp | null = null
document.addEventListener('DOMContentLoaded', () => {
  app = new ShadowSimulationApp()
})

/** 页面卸载前释放资源 */
window.addEventListener('beforeunload', () => {
  app?.destroy()
})

export default ShadowSimulationApp
