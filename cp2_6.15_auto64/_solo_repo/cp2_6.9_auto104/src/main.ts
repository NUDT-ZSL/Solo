import * as THREE from 'three'
import { FluidParticles, FluidParams } from './fluidParticles'

function createGlowTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private particles: FluidParticles
  private points: THREE.Points
  private glowSprite: THREE.Sprite
  private stars: THREE.Points

  private params: FluidParams = {
    magneticStrength: 5,
    viscosity: 0.5,
    particleSize: 0.1,
    colorOffset: 0,
    noiseStrength: 1
  }

  private baseCameraDistance: number = 5
  private targetCameraZoom: number = 1
  private currentCameraZoom: number = 1
  private zoomTransitionProgress: number = 1

  private cameraTheta: number = 0
  private cameraPhi: number = 0.3
  private isDragging: boolean = false
  private lastMouseX: number = 0
  private lastMouseY: number = 0

  private clock: THREE.Clock
  private fpsFrames: number = 0
  private fpsTime: number = 0
  private lastFpsDisplay: number = 0

  private panelVisible: boolean = false
  private panelHideTimeout: number | null = null

  private starAlphas: Float32Array
  private starPhaseOffsets: Float32Array

  constructor() {
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.setupBackground()

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    )
    this.camera.position.set(0, 0, this.baseCameraDistance)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000000, 0)
    document.getElementById('app')!.appendChild(this.renderer.domElement)

    this.particles = new FluidParticles(6000, 3000)
    this.points = this.createParticlePoints()
    this.scene.add(this.points)

    this.glowSprite = this.createGlowSphere()
    this.scene.add(this.glowSprite)

    const starResult = this.createStars()
    this.stars = starResult.stars
    this.starAlphas = starResult.alphas
    this.starPhaseOffsets = starResult.phases
    this.scene.add(this.stars)

    this.setupControls()
    this.setupPanelBehavior()
    this.setupMobileToggle()

    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  private setupBackground() {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#1a1a3e')
    gradient.addColorStop(1, '#0a0a2e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 256)
    const texture = new THREE.CanvasTexture(canvas)
    this.scene.background = texture
  }

  private createParticlePoints(): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particles.getPositionArray(), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particles.getColorArray(), 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(this.particles.getSizeArray(), 1))
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.particles.getAlphaArray(), 1))

    const glowTexture = createGlowTexture()

    const vertexShader = `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * 300.0 / -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `

    const fragmentShader = `
      uniform sampler2D glowTexture;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(glowTexture, gl_PointCoord);
        if (tex.a < 0.01) discard;
        vec3 emissive = vColor * 1.5;
        gl_FragColor = vec4(emissive, tex.a * vAlpha);
      }
    `

    const material = new THREE.ShaderMaterial({
      uniforms: {
        glowTexture: { value: glowTexture }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    return points
  }

  private createGlowSphere(): THREE.Sprite {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(139, 0, 255, 0.15)')
    gradient.addColorStop(0.4, 'rgba(30, 144, 255, 0.08)')
    gradient.addColorStop(0.7, 'rgba(255, 105, 180, 0.03)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(4, 4, 1)
    return sprite
  }

  private createStars(): { stars: THREE.Points; alphas: Float32Array; phases: Float32Array } {
    const numStars = 300
    const positions = new Float32Array(numStars * 3)
    const colors = new Float32Array(numStars * 3)
    const alphas = new Float32Array(numStars)
    const phases = new Float32Array(numStars)

    for (let i = 0; i < numStars; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 30 + Math.random() * 20

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const brightness = 0.7 + Math.random() * 0.3
      colors[i * 3] = brightness
      colors[i * 3 + 1] = brightness
      colors[i * 3 + 2] = brightness

      alphas[i] = 0.3 + Math.random() * 0.4
      phases[i] = Math.random() * Math.PI * 2
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const glowTexture = createGlowTexture()

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const stars = new THREE.Points(geometry, material)
    stars.frustumCulled = false
    return { stars, alphas, phases }
  }

  private setupControls() {
    const sliders: Array<{ id: string; key: keyof FluidParams; valueId: string; format: (v: number) => string }> = [
      { id: 'magneticStrength', key: 'magneticStrength', valueId: 'magneticStrengthValue', format: v => v.toFixed(1) },
      { id: 'viscosity', key: 'viscosity', valueId: 'viscosityValue', format: v => v.toFixed(2) },
      { id: 'particleSize', key: 'particleSize', valueId: 'particleSizeValue', format: v => v.toFixed(2) },
      { id: 'colorOffset', key: 'colorOffset', valueId: 'colorOffsetValue', format: v => v.toFixed(2) },
      { id: 'noiseStrength', key: 'noiseStrength', valueId: 'noiseStrengthValue', format: v => v.toFixed(2) }
    ]

    for (const s of sliders) {
      const slider = document.getElementById(s.id) as HTMLInputElement
      const valueEl = document.getElementById(s.valueId)!
      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value)
        ;(this.params as any)[s.key] = val
        valueEl.textContent = s.format(val)
      })
    }

    const densitySlider = document.getElementById('particleDensity') as HTMLInputElement
    const densityValue = document.getElementById('particleDensityValue')!
    densitySlider.addEventListener('input', () => {
      const val = parseInt(densitySlider.value)
      this.particles.setCount(val)
      densityValue.textContent = val.toString()
    })

    const canvas = this.renderer.domElement
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    })
    window.addEventListener('mouseup', () => {
      this.isDragging = false
    })
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX
        const dy = e.clientY - this.lastMouseY
        this.cameraTheta -= dx * 0.005
        this.cameraPhi += dy * 0.005
        this.cameraPhi = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.cameraPhi))
        this.lastMouseX = e.clientX
        this.lastMouseY = e.clientY
      }
    })
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
      this.baseCameraDistance = Math.max(2.5, Math.min(25, this.baseCameraDistance * zoomFactor))
    }, { passive: false })

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true
        this.lastMouseX = e.touches[0].clientX
        this.lastMouseY = e.touches[0].clientY
      }
    })
    canvas.addEventListener('touchend', () => {
      this.isDragging = false
    })
    canvas.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.lastMouseX
        const dy = e.touches[0].clientY - this.lastMouseY
        this.cameraTheta -= dx * 0.005
        this.cameraPhi += dy * 0.005
        this.cameraPhi = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.cameraPhi))
        this.lastMouseX = e.touches[0].clientX
        this.lastMouseY = e.touches[0].clientY
        e.preventDefault()
      }
    }, { passive: false })
  }

  private setupPanelBehavior() {
    const panel = document.getElementById('control-panel')!
    const showPanel = () => {
      this.panelVisible = true
      panel.classList.add('visible')
      if (this.panelHideTimeout !== null) {
        clearTimeout(this.panelHideTimeout)
        this.panelHideTimeout = null
      }
    }
    const scheduleHide = () => {
      if (window.innerWidth <= 768) return
      if (this.panelHideTimeout !== null) clearTimeout(this.panelHideTimeout)
      this.panelHideTimeout = window.setTimeout(() => {
        this.panelVisible = false
        panel.classList.remove('visible')
        this.panelHideTimeout = null
      }, 2000)
    }

    panel.addEventListener('mouseenter', showPanel)
    panel.addEventListener('mouseleave', scheduleHide)

    const appEl = document.getElementById('app')!
    appEl.addEventListener('mousemove', (e) => {
      if (window.innerWidth <= 768) return
      const rect = appEl.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const inBottomLeft = x < 280 && y > rect.height - 280
      if (inBottomLeft) {
        showPanel()
      } else if (this.panelVisible) {
        scheduleHide()
      }
    })
  }

  private setupMobileToggle() {
    const toggle = document.getElementById('mobile-toggle')!
    const panel = document.getElementById('control-panel')!
    toggle.addEventListener('click', () => {
      panel.classList.toggle('mobile-open')
    })
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private updateCamera(delta: number) {
    const targetZoom = this.particles.isCondensed ? 1.2 : 1.0
    if (targetZoom !== this.targetCameraZoom) {
      this.targetCameraZoom = targetZoom
      this.zoomTransitionProgress = 0
    }
    if (this.zoomTransitionProgress < 1) {
      this.zoomTransitionProgress = Math.min(1, this.zoomTransitionProgress + delta * 1.0)
      const t = easeInOut(this.zoomTransitionProgress)
      const startZoom = this.currentCameraZoom
      this.currentCameraZoom = startZoom + (this.targetCameraZoom - startZoom) * t
    }

    const distance = this.baseCameraDistance / this.currentCameraZoom
    const cx = distance * Math.sin(this.cameraTheta) * Math.cos(this.cameraPhi)
    const cy = distance * Math.sin(this.cameraPhi)
    const cz = distance * Math.cos(this.cameraTheta) * Math.cos(this.cameraPhi)
    this.camera.position.set(cx, cy, cz)
    this.camera.lookAt(0, 0, 0)
  }

  private updateStars(time: number) {
    const mat = this.stars.material as THREE.PointsMaterial
    let twinkleSum = 0
    for (let i = 0; i < 300; i++) {
      const phase = this.starPhaseOffsets[i]
      const period = 1 + (i % 3)
      const twinkle = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * Math.PI * 2 / period + phase))
      twinkleSum += twinkle
    }
    mat.opacity = 0.5 + 0.3 * Math.sin(time * 0.5)
  }

  private updateFPS(delta: number) {
    this.fpsFrames++
    this.fpsTime += delta
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTime)
      if (fps !== this.lastFpsDisplay) {
        const el = document.getElementById('fps-counter')!
        el.textContent = `${fps} FPS`
        this.lastFpsDisplay = fps
      }
      this.fpsFrames = 0
      this.fpsTime = 0
    }
  }

  private animate() {
    const delta = Math.min(this.clock.getDelta(), 0.05)
    const time = this.clock.getElapsedTime()

    this.particles.update(delta, this.params)

    const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    posAttr.needsUpdate = true
    const colorAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute
    colorAttr.needsUpdate = true
    const sizeAttr = this.points.geometry.getAttribute('size') as THREE.BufferAttribute
    sizeAttr.needsUpdate = true
    const alphaAttr = this.points.geometry.getAttribute('alpha') as THREE.BufferAttribute
    alphaAttr.needsUpdate = true
    this.points.geometry.setDrawRange(0, this.particles.count)

    const boundingR = this.particles.getBoundingRadius()
    this.glowSprite.scale.set(boundingR * 2.5, boundingR * 2.5, 1)
    const glowMat = this.glowSprite.material as THREE.SpriteMaterial
    glowMat.opacity = 0.5 + (this.particles.isCondensed ? 0.3 : 0)

    this.updateCamera(delta)
    this.updateStars(time)
    this.updateFPS(delta)

    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.animate.bind(this))
  }

  start() {
    this.animate()
  }
}

const app = new App()
app.start()
