/**
 * ============================================================
 *  guiController.ts - GUI 控制面板模块
 * ============================================================
 *
 * 【职责】
 *    使用 lil-gui 库创建折叠式控制面板，提供用户交互入口：
 *    1. 时间控制（自动播放开关 + 时间滑块）
 *    2. 天气预设切换（晴天/多云/阴天）
 *    3. 阴影精度设置（开关 + 分辨率选择 + 自动降级开关）
 *
 * 【被调用关系】
 *    main.ts → createGUIController({...})  实例化面板
 *
 * 【调用的外部模块方法】
 *    → timeManager.setManualTime(time)     用户拖动时间滑块
 *    → timeManager.resumeAutoPlay()        用户打开自动播放
 *    → timeManager.getCurrentTime()        初始化滑块值
 *    → timeManager.isPlaying()             初始化开关值
 *    → timeManager.subscribe(callback)     同步时间到滑块
 *
 *    → shadowSimulation.setWeather(type)   用户切换天气
 *    → shadowSimulation.setShadowResolution(res) 用户选分辨率
 *    → shadowSimulation.setShadowsEnabled(bool)  用户开关阴影
 *    → shadowSimulation.setAutoDowngradeEnabled(bool) 开关降级
 *    → shadowSimulation.getWeather()       初始化天气下拉
 *    → shadowSimulation.getShadowResolution() 初始化分辨率
 *    → shadowSimulation.getShadowsEnabled()   初始化阴影开关
 *    → shadowSimulation.getAutoDowngradeEnabled() 初始化降级开关
 *
 * 【回调输出】
 *    → onWeatherChange(weather) 通知 main.ts 更新信息板图标
 * ============================================================
 */

import GUI from 'lil-gui'
import type { TimeManager } from '../modules/timeManager'
import type { ShadowSimulation, WeatherPreset } from '../modules/shadowSimulation'
import { SHADOW_RESOLUTION_LEVELS } from '../modules/shadowSimulation'

interface GUIControllerOptions {
  timeManager: TimeManager
  shadowSimulation: ShadowSimulation
  onWeatherChange?: (weather: WeatherPreset) => void
}

class GUIController {
  private gui: GUI
  private timeManager: TimeManager
  private shadowSimulation: ShadowSimulation
  private onWeatherChange?: (weather: WeatherPreset) => void

  private params: {
    time: number
    autoPlay: boolean
    weather: WeatherPreset
    shadowsEnabled: boolean
    shadowResolution: number
    autoDowngrade: boolean
  }

  private timeController: any
  private autoPlayController: any

  constructor(options: GUIControllerOptions) {
    this.timeManager = options.timeManager
    this.shadowSimulation = options.shadowSimulation
    this.onWeatherChange = options.onWeatherChange

    this.params = {
      time: this.timeManager.getCurrentTime(),
      autoPlay: this.timeManager.isPlaying(),
      weather: this.shadowSimulation.getWeather(),
      shadowsEnabled: this.shadowSimulation.getShadowsEnabled(),
      shadowResolution: this.shadowSimulation.getShadowResolution(),
      autoDowngrade: this.shadowSimulation.getAutoDowngradeEnabled()
    }

    this.gui = new GUI({
      title: '控制面板',
      container: document.body
    })

    this.setupStyle()
    this.setupControls()
    this.setupToggleButton()
    this.setupTimeSyncSubscription()
  }

  private setupStyle(): void {
    const domElement: HTMLElement = this.gui.domElement
    domElement.style.position = 'absolute'
    domElement.style.top = '20px'
    domElement.style.right = '20px'
    domElement.style.zIndex = '1000'
    domElement.style.background = 'rgba(30, 30, 30, 0.85)'
    domElement.style.borderRadius = '8px'
    domElement.style.backdropFilter = 'blur(10px)'
    ;(domElement.style as any).webkitBackdropFilter = 'blur(10px)'
    domElement.style.transition = 'transform 0.2s ease'
    domElement.style.maxHeight = 'calc(100vh - 40px)'
    domElement.style.overflowY = 'auto'

    const controllerElements: NodeListOf<HTMLElement> =
      domElement.querySelectorAll('.lil-gui .controller')
    controllerElements.forEach((el: HTMLElement) => {
      el.style.marginBottom = '8px'
    })
  }

  /**
   * 构建所有控制面板控件
   * 注意：时间滑块 onChange 时必须先关闭自动播放，再设置时间
   *       否则自动循环会覆盖用户手动设置的值
   */
  private setupControls(): void {
    const timeFolder: GUI = this.gui.addFolder('时间控制')
    timeFolder.open()

    this.autoPlayController = timeFolder
      .add(this.params, 'autoPlay')
      .name('自动播放')
      .onChange((value: boolean) => {
        if (value) {
          this.timeManager.resumeAutoPlay()
        } else {
          this.timeManager.setManualTime(this.params.time)
        }
      })

    this.timeController = timeFolder
      .add(this.params, 'time', 6, 20, 0.25)
      .name('时间 (小时)')
      .onChange((value: number) => {
        this.params.autoPlay = false
        this.timeManager.setManualTime(value)
        if (this.autoPlayController) {
          this.autoPlayController.updateDisplay()
        }
      })

    const weatherFolder: GUI = this.gui.addFolder('天气预设')
    weatherFolder.open()

    weatherFolder
      .add(this.params, 'weather', {
        '☀️ 晴天': 'sunny' as WeatherPreset,
        '⛅ 多云': 'cloudy' as WeatherPreset,
        '☁️ 阴天': 'overcast' as WeatherPreset
      })
      .name('天气')
      .onChange((value: WeatherPreset) => {
        this.shadowSimulation.setWeather(value)
        if (this.onWeatherChange) {
          this.onWeatherChange(value)
        }
      })

    const shadowFolder: GUI = this.gui.addFolder('阴影设置')
    shadowFolder.open()

    shadowFolder
      .add(this.params, 'shadowsEnabled')
      .name('启用阴影')
      .onChange((value: boolean) => {
        this.shadowSimulation.setShadowsEnabled(value)
      })

    const resolutionOptions: Record<string, number> = {}
    SHADOW_RESOLUTION_LEVELS.forEach((res: number) => {
      resolutionOptions[`${res} × ${res}`] = res
    })
    shadowFolder
      .add(this.params, 'shadowResolution', resolutionOptions)
      .name('阴影分辨率')
      .onChange((value: number) => {
        this.shadowSimulation.setShadowResolution(value)
      })

    shadowFolder
      .add(this.params, 'autoDowngrade')
      .name('FPS自动降级')
      .onChange((value: boolean) => {
        this.shadowSimulation.setAutoDowngradeEnabled(value)
      })
  }

  /**
   * 订阅时间管理器更新 → 同步滑块位置
   * 仅在自动播放模式下更新 GUI，避免打断用户拖动
   */
  private setupTimeSyncSubscription(): void {
    this.timeManager.subscribe((time: number) => {
      if (this.timeManager.isPlaying()) {
        this.params.time = time
        if (this.timeController) {
          this.timeController.updateDisplay()
        }
        this.params.autoPlay = true
        if (this.autoPlayController) {
          this.autoPlayController.updateDisplay()
        }
      }
    })
  }

  /** 右侧折叠按钮：点击后面板滑入/滑出，动画0.2秒 */
  private setupToggleButton(): void {
    const domElement: HTMLElement = this.gui.domElement

    const toggleBtn: HTMLButtonElement = document.createElement('button')
    toggleBtn.innerHTML = '◀'
    toggleBtn.style.cssText = `
      position: absolute;
      left: -32px;
      top: 0;
      width: 32px;
      height: 40px;
      background: rgba(30, 30, 30, 0.85);
      border: none;
      border-radius: 8px 0 0 8px;
      color: white;
      font-size: 16px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    let isCollapsed: boolean = false

    toggleBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed
      if (isCollapsed) {
        domElement.style.transform = 'translateX(calc(100% + 40px))'
        toggleBtn.innerHTML = '▶'
      } else {
        domElement.style.transform = 'translateX(0)'
        toggleBtn.innerHTML = '◀'
      }
    })

    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.background = 'rgba(60, 60, 60, 0.95)'
    })

    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.background = 'rgba(30, 30, 30, 0.85)'
    })

    domElement.appendChild(toggleBtn)
  }

  updateWeatherDisplay(weather: WeatherPreset): void {
    this.params.weather = weather
    this.gui.controllersRecursive().forEach((c: any) => {
      if (c.property === 'weather') {
        c.updateDisplay()
      }
    })
  }

  destroy(): void {
    this.gui.destroy()
  }
}

export function createGUIController(
  options: GUIControllerOptions
): GUIController {
  return new GUIController(options)
}

export type { GUIController }
export default createGUIController
