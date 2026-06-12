import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import { AudioAnalyzer } from '@/audio/AudioAnalyzer'
import { TerrainGenerator } from '@/visual/TerrainGenerator'
import { EffectsManager } from '@/visual/EffectsManager'

export class SceneSetup {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls

  private audioAnalyzer: AudioAnalyzer
  private terrainGenerator: TerrainGenerator
  private effectsManager: EffectsManager
  private terrainMesh: THREE.Mesh | null = null

  private flowSpeed: number = 1.0
  private flowOffset: number = 0
  private lastSpectrumUpdate: number = 0
  private spectrumUpdateInterval: number = 1000 / 30

  private idleTimeoutId: number | null = null
  private idleDelay: number = 3000
  private controlBar: HTMLElement | null = null
  private isControlBarVisible: boolean = true

  private keys: Set<string> = new Set()
  private terrainRotationSpeed: number = 0.5

  private clock: THREE.Clock
  private animationFrameId: number | null = null

  private lastLowEnergy: number = 0
  private pulseThreshold: number = 0.6
  private pulseCooldown: number = 200
  private lastPulseTime: number = 0

  private fpsElement: HTMLElement | null = null
  private frameCount: number = 0
  private lastFpsUpdate: number = 0
  private currentFps: number = 0

  constructor(containerId: string) {
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container #${containerId} not found`)
    }
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0A0A1A)

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 12, 18)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 1
    this.controls.maxDistance = 80
    this.controls.target.set(0, 0, 0)

    this.audioAnalyzer = new AudioAnalyzer()
    this.terrainGenerator = new TerrainGenerator()
    this.effectsManager = new EffectsManager(this.scene)

    this.clock = new THREE.Clock()

    this.setupLights()
    this.setupTerrain()
    this.setupUI()
    this.setupEventListeners()
    this.setupIdleDetection()
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(8, 15, 8)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -15
    directionalLight.shadow.camera.right = 15
    directionalLight.shadow.camera.top = 15
    directionalLight.shadow.camera.bottom = -15
    this.scene.add(directionalLight)

    const pointLight1 = new THREE.PointLight(0x8B5CF6, 0.6, 30)
    pointLight1.position.set(-8, 6, -5)
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xFF6B35, 0.4, 25)
    pointLight2.position.set(8, 5, 5)
    this.scene.add(pointLight2)
  }

  private setupTerrain(): void {
    this.terrainMesh = this.terrainGenerator.buildTerrain()
    this.scene.add(this.terrainMesh)

    const cellSize = this.terrainGenerator.getCellSize()
    this.effectsManager.setCellSize(cellSize.x, cellSize.z)
  }

  private setupUI(): void {
    const controlBar = document.createElement('div')
    controlBar.id = 'control-bar'
    controlBar.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      z-index: 50;
      transition: opacity 500ms ease;
      opacity: 1;
    `
    this.controlBar = controlBar

    const uploadBtn = this.createUploadButton()
    const playBtn = this.createPlayButton()
    const speedSlider = this.createSpeedSlider()
    const timeDisplay = this.createTimeDisplay()

    controlBar.appendChild(uploadBtn)
    controlBar.appendChild(playBtn)
    controlBar.appendChild(speedSlider)
    controlBar.appendChild(timeDisplay)

    document.body.appendChild(controlBar)

    this.fpsElement = document.getElementById('debug-fps')
  }

  private createUploadButton(): HTMLElement {
    const label = document.createElement('label')
    label.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 18px;
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 8px;
      color: #ffffff;
      font-size: 14px;
      cursor: pointer;
      transition: border-color 200ms ease, background-color 200ms ease;
      user-select: none;
    `
    label.textContent = '上传音频'

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mp3,.wav,audio/mpeg,audio/wav'
    input.style.display = 'none'

    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        if (file.size > 20 * 1024 * 1024) {
          alert('文件大小不能超过 20MB')
          return
        }
        try {
          await this.audioAnalyzer.loadAudioFile(file)
          ;(playBtn as HTMLButtonElement).disabled = false
          ;(playBtn as HTMLButtonElement).textContent = '播放'
        } catch (err) {
          console.error('音频加载失败:', err)
          alert('音频加载失败')
        }
      }
    })

    label.appendChild(input)

    label.addEventListener('mouseenter', () => {
      label.style.borderColor = '#8B5CF6'
      label.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'
    })
    label.addEventListener('mouseleave', () => {
      label.style.borderColor = 'rgba(255, 255, 255, 0.6)'
      label.style.backgroundColor = 'transparent'
    })

    return label
  }

  private createPlayButton(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.disabled = true
    btn.textContent = '等待上传'
    btn.style.cssText = `
      padding: 8px 18px;
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 8px;
      background: transparent;
      color: #ffffff;
      font-size: 14px;
      cursor: pointer;
      transition: border-color 200ms ease, background-color 200ms ease, opacity 200ms ease;
    `
    btn.style.opacity = btn.disabled ? '0.5' : '1'

    btn.addEventListener('click', () => {
      if (!this.audioAnalyzer.isAudioLoaded()) return

      if (this.audioAnalyzer.isAudioPlaying()) {
        this.audioAnalyzer.pause()
        btn.textContent = '播放'
      } else {
        this.audioAnalyzer.play()
        btn.textContent = '暂停'
      }
    })

    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) {
        btn.style.borderColor = '#8B5CF6'
        btn.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'
      }
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'rgba(255, 255, 255, 0.6)'
      btn.style.backgroundColor = 'transparent'
    })

    return btn
  }

  private createSpeedSlider(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ffffff;
      font-size: 13px;
    `

    const label = document.createElement('span')
    label.textContent = '流速'

    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = '0.5'
    slider.max = '2.0'
    slider.step = '0.1'
    slider.value = '1.0'
    slider.style.cssText = `
      width: 90px;
      accent-color: #8B5CF6;
      cursor: pointer;
    `

    const valueLabel = document.createElement('span')
    valueLabel.style.cssText = `
      min-width: 30px;
      text-align: right;
      font-family: monospace;
    `
    valueLabel.textContent = '1.0x'

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value)
      this.flowSpeed = val
      valueLabel.textContent = val.toFixed(1) + 'x'
    })

    wrapper.appendChild(label)
    wrapper.appendChild(slider)
    wrapper.appendChild(valueLabel)

    return wrapper
  }

  private createTimeDisplay(): HTMLElement {
    const el = document.createElement('div')
    el.id = 'time-display'
    el.style.cssText = `
      color: #ffffff;
      font-size: 13px;
      font-family: 'Consolas', 'Monaco', monospace;
      min-width: 90px;
      text-align: center;
    `
    el.textContent = '00:00 / 00:00'
    return el
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this))
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))

    document.addEventListener('mousemove', this.onMouseMove.bind(this), true)
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase())
    this.resetIdleTimer()
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase())
  }

  private onMouseMove(e: MouseEvent): void {
    if (e.clientY < 80) {
      this.showControlBar()
    }
    this.resetIdleTimer()
  }

  private setupIdleDetection(): void {
    this.resetIdleTimer()
  }

  private resetIdleTimer(): void {
    if (this.idleTimeoutId !== null) {
      clearTimeout(this.idleTimeoutId)
    }
    this.idleTimeoutId = window.setTimeout(() => {
      this.hideControlBar()
    }, this.idleDelay)
  }

  private showControlBar(): void {
    if (!this.controlBar || this.isControlBarVisible) return

    this.controlBar.style.transition = 'opacity 300ms ease'
    this.controlBar.style.opacity = '1'
    this.isControlBarVisible = true
  }

  private hideControlBar(): void {
    if (!this.controlBar || !this.isControlBarVisible) return

    this.controlBar.style.transition = 'opacity 500ms ease'
    this.controlBar.style.opacity = '0'
    this.isControlBarVisible = false
  }

  start(): void {
    this.clock.start()
    this.animate()
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this))

    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()

    this.updateFPS()

    this.updateTerrainRotation(delta)

    if (this.audioAnalyzer.isAudioPlaying()) {
      const now = performance.now()
      if (now - this.lastSpectrumUpdate >= this.spectrumUpdateInterval) {
        this.lastSpectrumUpdate = now
        const freqData = this.audioAnalyzer.getFrequencyData()
        this.flowOffset = (this.flowOffset + delta * this.flowSpeed * 0.15) % 1

        this.updateTerrain(freqData, this.flowOffset)
        this.detectAndTriggerPulse(freqData, this.flowOffset)
      }
      this.updateTimeDisplay()
    } else {
      this.flowOffset = (this.flowOffset + delta * this.flowSpeed * 0.05) % 1
      const defaultFreq = new Uint8Array(256)
      for (let i = 0; i < 32; i++) {
        defaultFreq[i] = Math.sin(elapsed * 2 + i * 0.3) * 30 + 40
      }
      for (let i = 32; i < 128; i++) {
        defaultFreq[i] = Math.sin(elapsed * 1.5 + i * 0.15) * 20 + 25
      }
      for (let i = 128; i < 256; i++) {
        defaultFreq[i] = Math.sin(elapsed * 3 + i * 0.1) * 15 + 15
      }
      this.updateTerrain(defaultFreq, this.flowOffset)
    }

    this.effectsManager.update(delta)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private updateTerrain(freqData: Uint8Array, flowOffset: number): void {
    if (!this.terrainMesh) return

    this.terrainGenerator.updateTerrain(freqData, flowOffset)

    const geometry = this.terrainMesh.geometry as THREE.BufferGeometry
    const positionAttr = geometry.attributes.position
    const positions = positionAttr.array as Float32Array

    const segments = this.terrainGenerator.getSegments()
    const gridSize = this.terrainGenerator.getGridSize()

    this.effectsManager.applyPulsesToGeometry(
      positions,
      segments.w,
      segments.d,
      gridSize.width,
      gridSize.depth
    )

    positionAttr.needsUpdate = true
    geometry.computeVertexNormals()
  }

  private updateTerrainRotation(delta: number): void {
    if (!this.terrainMesh) return

    let rotDelta = 0
    if (this.keys.has('a')) {
      rotDelta += this.terrainRotationSpeed * delta
    }
    if (this.keys.has('d')) {
      rotDelta -= this.terrainRotationSpeed * delta
    }

    if (rotDelta !== 0) {
      this.terrainMesh.rotation.y += rotDelta
    }
  }

  private detectAndTriggerPulse(freqData: Uint8Array, flowOffset: number): void {
    const now = performance.now()
    if (now - this.lastPulseTime < this.pulseCooldown) return

    let lowEnergy = 0
    const lowBands = 16
    for (let i = 0; i < lowBands && i < freqData.length; i++) {
      lowEnergy += freqData[i] / 255
    }
    lowEnergy /= lowBands

    const energyDiff = lowEnergy - this.lastLowEnergy
    if (lowEnergy > this.pulseThreshold && energyDiff > 0.1) {
      this.triggerPulseEffect(flowOffset)
      this.lastPulseTime = now
    }

    this.lastLowEnergy = lowEnergy
  }

  private triggerPulseEffect(flowOffset: number): void {
    const gridSize = this.terrainGenerator.getGridSize()
    const z = (0.3 - 0.5) * gridSize.depth + flowOffset * gridSize.depth

    const pulsePos = new THREE.Vector3(0, 0, z)

    const intensity = 1.0
    this.effectsManager.triggerPulse(pulsePos, intensity)
    this.effectsManager.addRipple(pulsePos)
    this.effectsManager.addRipple(new THREE.Vector3(-2, 0, z + 0.5))
    this.effectsManager.addRipple(new THREE.Vector3(2, 0, z - 0.3))
  }

  private updateTimeDisplay(): void {
    const display = document.getElementById('time-display')
    if (!display) return

    const current = this.audioAnalyzer.getCurrentTime()
    const duration = this.audioAnalyzer.getDuration()
    display.textContent = `${this.formatTime(current)} / ${this.formatTime(duration)}`
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  private updateFPS(): void {
    this.frameCount++
    const now = performance.now()
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount
      this.frameCount = 0
      this.lastFpsUpdate = now

      if (this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${this.currentFps}`
      }
    }
  }

  getAudioAnalyzer(): AudioAnalyzer {
    return this.audioAnalyzer
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.idleTimeoutId !== null) {
      clearTimeout(this.idleTimeoutId)
    }

    window.removeEventListener('resize', this.onWindowResize.bind(this))
    window.removeEventListener('keydown', this.onKeyDown.bind(this))
    window.removeEventListener('keyup', this.onKeyUp.bind(this))
    document.removeEventListener('mousemove', this.onMouseMove.bind(this), true)

    this.audioAnalyzer.dispose()
    this.terrainGenerator.dispose()
    this.effectsManager.dispose()
    this.renderer.dispose()
    this.controls.dispose()

    if (this.controlBar && this.controlBar.parentNode) {
      this.controlBar.parentNode.removeChild(this.controlBar)
    }
  }
}
