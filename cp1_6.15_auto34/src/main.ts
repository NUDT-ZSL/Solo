import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildingsModule, type BuildingData } from './modules/buildings'
import { timeManager } from './modules/timeManager'
import { createShadowSimulation, WEATHER_INFO, type WeatherPreset, type ShadowSimulation } from './modules/shadowSimulation'
import { createGUIController, type GUIController } from './utils/guiController'

class ShadowSimulationApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private buildings: BuildingData[] = []
  private shadowSimulation: ShadowSimulation
  private guiController: GUIController | null = null
  private container: HTMLElement
  private timeDisplay: HTMLElement
  private weatherIcon: HTMLElement
  private weatherText: HTMLElement
  private shadowAreaDisplay: HTMLElement
  private currentShadowArea: number = 0
  private animationFrameId: number | null = null

  constructor() {
    this.container = document.getElementById('canvas-container') || document.body

    this.timeDisplay = document.getElementById('time-display')!
    this.weatherIcon = document.getElementById('weather-icon')!
    this.weatherText = document.getElementById('weather-text')!
    this.shadowAreaDisplay = document.getElementById('shadow-area')!

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0a)
    this.scene.fog = new THREE.Fog(0x0a0a0a, 400, 800)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )
    this.camera.position.set(200, 150, 200)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
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
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1
    this.controls.minDistance = 50
    this.controls.maxDistance = 600
    this.controls.target.set(0, 20, 0)

    this.shadowSimulation = createShadowSimulation(this.scene)

    this.init()
  }

  private init(): void {
    this.createEnvironment()
    this.createBuildings()
    this.setupSubscriptions()
    this.setupGUI()
    this.setupEventListeners()
    this.start()
  }

  private createEnvironment(): void {
    const ground = buildingsModule.createGround()
    this.scene.add(ground)
    this.scene.userData.ground = ground

    const grid = buildingsModule.createGridHelper()
    this.scene.add(grid)

    const ambientLight = new THREE.AmbientLight(0x404040, 0.2)
    this.scene.add(ambientLight)
  }

  private createBuildings(): void {
    this.buildings = buildingsModule.getBuildings()
    this.buildings.forEach((building) => {
      this.scene.add(building.mesh)
    })
    this.shadowSimulation.setBuildings(this.buildings)
  }

  private setupSubscriptions(): void {
    timeManager.subscribe((time, sunPosition) => {
      this.updateTimeDisplay(time)
      this.currentShadowArea = this.shadowSimulation.updateShadow(
        sunPosition.azimuth,
        sunPosition.altitude
      )
      this.updateShadowAreaDisplay()
    })
  }

  private setupGUI(): void {
    this.guiController = createGUIController({
      timeManager,
      shadowSimulation: this.shadowSimulation,
      onWeatherChange: (weather: WeatherPreset) => {
        this.updateWeatherDisplay(weather)
      }
    })

    this.updateWeatherDisplay(this.shadowSimulation.getWeather())
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize)
  }

  private onWindowResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private updateTimeDisplay(time: number): void {
    const hours = Math.floor(time)
    const minutes = Math.round((time - hours) * 60)
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
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

  private start(): void {
    timeManager.start()
    this.animate()
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

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

let app: ShadowSimulationApp | null = null

document.addEventListener('DOMContentLoaded', () => {
  app = new ShadowSimulationApp()
})

window.addEventListener('beforeunload', () => {
  app?.destroy()
})

export default ShadowSimulationApp
