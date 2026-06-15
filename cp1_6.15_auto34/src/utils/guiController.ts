import GUI from 'lil-gui'
import type { TimeManager } from '../modules/timeManager'
import type { ShadowSimulation, WeatherPreset } from '../modules/shadowSimulation'

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
    weather: WeatherPreset
    shadowResolution: number
    shadowsEnabled: boolean
    autoPlay: boolean
  }

  constructor(options: GUIControllerOptions) {
    this.timeManager = options.timeManager
    this.shadowSimulation = options.shadowSimulation
    this.onWeatherChange = options.onWeatherChange

    this.params = {
      time: this.timeManager.getCurrentTime(),
      weather: this.shadowSimulation.getWeather(),
      shadowResolution: this.shadowSimulation.getShadowResolution(),
      shadowsEnabled: this.shadowSimulation.getShadowsEnabled(),
      autoPlay: this.timeManager.isPlaying()
    }

    this.gui = new GUI({
      title: '控制面板',
      container: document.body
    })

    this.setupStyle()
    this.setupControls()
    this.setupToggleButton()
  }

  private setupStyle(): void {
    const domElement = this.gui.domElement
    domElement.style.position = 'absolute'
    domElement.style.top = '20px'
    domElement.style.right = '20px'
    domElement.style.zIndex = '1000'
    domElement.style.background = 'rgba(30, 30, 30, 0.85)'
    domElement.style.borderRadius = '8px'
    domElement.style.backdropFilter = 'blur(10px)'
    ;(domElement.style as any).webkitBackdropFilter = 'blur(10px)'
    domElement.style.transition = 'all 0.2s ease'
    domElement.style.maxHeight = 'calc(100vh - 40px)'
    domElement.style.overflowY = 'auto'

    const controllerElements = domElement.querySelectorAll('.lil-gui .controller')
    controllerElements.forEach((el) => {
      ;(el as HTMLElement).style.marginBottom = '8px'
    })
  }

  private setupControls(): void {
    const timeFolder = this.gui.addFolder('时间控制')
    timeFolder.close()

    timeFolder
      .add(this.params, 'autoPlay')
      .name('自动播放')
      .onChange((value: boolean) => {
        if (value) {
          this.timeManager.resumeAutoPlay()
        } else {
          this.timeManager.setManualTime(this.params.time)
        }
      })

    timeFolder
      .add(this.params, 'time', 6, 20, 0.25)
      .name('时间 (小时)')
      .onChange((value: number) => {
        this.params.autoPlay = false
        this.timeManager.setManualTime(value)
        this.gui.controllersRecursive().forEach((c) => {
          if (c.property === 'autoPlay') {
            c.updateDisplay()
          }
        })
      })

    const weatherFolder = this.gui.addFolder('天气预设')
    weatherFolder.close()

    weatherFolder
      .add(this.params, 'weather', ['sunny', 'cloudy', 'overcast'] as WeatherPreset[])
      .name('天气')
      .onChange((value: WeatherPreset) => {
        this.shadowSimulation.setWeather(value)
        if (this.onWeatherChange) {
          this.onWeatherChange(value)
        }
      })

    const shadowFolder = this.gui.addFolder('阴影设置')
    shadowFolder.close()

    shadowFolder
      .add(this.params, 'shadowsEnabled')
      .name('启用阴影')
      .onChange((value: boolean) => {
        this.shadowSimulation.setShadowsEnabled(value)
      })

    shadowFolder
      .add(this.params, 'shadowResolution', [512, 1024, 2048, 4096])
      .name('阴影分辨率')
      .onChange((value: number) => {
        this.shadowSimulation.setShadowResolution(value)
      })

    this.timeManager.subscribe((time: number) => {
      if (this.timeManager.isPlaying()) {
        this.params.time = time
        this.gui.controllersRecursive().forEach((c) => {
          if (c.property === 'time') {
            c.updateDisplay()
          }
        })
      }
    })
  }

  private setupToggleButton(): void {
    const domElement = this.gui.domElement

    const toggleBtn = document.createElement('button')
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

    let isCollapsed = false

    toggleBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed
      if (isCollapsed) {
        domElement.style.transform = 'translateX(100%)'
        toggleBtn.innerHTML = '▶'
        toggleBtn.style.left = '-32px'
      } else {
        domElement.style.transform = 'translateX(0)'
        toggleBtn.innerHTML = '◀'
        toggleBtn.style.left = '-32px'
      }
    })

    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.background = 'rgba(60, 60, 60, 0.9)'
    })

    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.background = 'rgba(30, 30, 30, 0.85)'
    })

    domElement.appendChild(toggleBtn)
  }

  updateWeatherDisplay(weather: WeatherPreset): void {
    this.params.weather = weather
    this.gui.controllersRecursive().forEach((c) => {
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
