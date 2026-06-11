import * as THREE from 'three'
import { ParticleSystem, MotionMode } from './ParticleSystem'
import { TrailRenderer } from './TrailRenderer'

const canvasContainer = document.getElementById('canvas-container')
const loadingScreen = document.getElementById('loading-screen')

if (!canvasContainer) {
  throw new Error('Canvas container not found')
}

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)
canvasContainer.appendChild(renderer.domElement)

camera.position.set(0, 2, 18)
camera.lookAt(0, 0, 0)

const gridHelper = new THREE.GridHelper(20, 20, new THREE.Color(0x00ff88), new THREE.Color(0x00ff88))
;(gridHelper.material as THREE.Material).transparent = true
;(gridHelper.material as THREE.Material).opacity = 0.3
scene.add(gridHelper)

const gridHelperXZ = new THREE.GridHelper(20, 20, new THREE.Color(0x00ff88), new THREE.Color(0x00ff88))
gridHelperXZ.rotation.x = Math.PI / 2
;(gridHelperXZ.material as THREE.Material).transparent = true
;(gridHelperXZ.material as THREE.Material).opacity = 0.15
scene.add(gridHelperXZ)

const gridHelperYZ = new THREE.GridHelper(20, 20, new THREE.Color(0x00ff88), new THREE.Color(0x00ff88))
gridHelperYZ.rotation.z = Math.PI / 2
;(gridHelperYZ.material as THREE.Material).transparent = true
;(gridHelperYZ.material as THREE.Material).opacity = 0.15
scene.add(gridHelperYZ)

const primaryColor = new THREE.Color(0x00d4ff)
const secondaryColor = new THREE.Color(0xff00ff)

const particleSystem = new ParticleSystem(200, primaryColor, secondaryColor, 10)
scene.add(particleSystem.group)

const trailRenderer = new TrailRenderer(200, 20)
scene.add(trailRenderer.group)

let isDragging = false
let previousMousePosition = { x: 0, y: 0 }
let cameraAngle = { theta: 0, phi: Math.PI / 3 }
let cameraDistance = 18
let targetCameraAngle = { theta: 0, phi: Math.PI / 3 }
let targetCameraDistance = 18
let isTouching = false

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let isHovering = false
let hoverStartTime = 0
const hoverDuration = 1.5
let hoverRecoveryActive = false
let hoverRecoveryStart = 0

let frameCount = 0
let lastFpsUpdate = performance.now()
let fps = 60

const fpsCounter = document.createElement('div')
fpsCounter.id = 'fps-counter'
fpsCounter.textContent = 'FPS: 60'
document.body.appendChild(fpsCounter)

function onMouseDown(e: MouseEvent): void {
  isDragging = true
  previousMousePosition = { x: e.clientX, y: e.clientY }
}

function onMouseMove(e: MouseEvent): void {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

  if (isDragging) {
    const deltaX = e.clientX - previousMousePosition.x
    const deltaY = e.clientY - previousMousePosition.y

    targetCameraAngle.theta -= deltaX * 0.005
    targetCameraAngle.phi = Math.max(
      0.1,
      Math.min(Math.PI - 0.1, targetCameraAngle.phi + deltaY * 0.005)
    )

    previousMousePosition = { x: e.clientX, y: e.clientY }
  }

  checkHover()
}

function onMouseUp(): void {
  isDragging = false
}

function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const zoomSpeed = 0.003
  targetCameraDistance = Math.max(
    5,
    Math.min(50, targetCameraDistance + e.deltaY * zoomSpeed)
  )
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length === 1) {
    isTouching = true
    isDragging = true
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
}

function onTouchMove(e: TouchEvent): void {
  if (isTouching && e.touches.length === 1) {
    const deltaX = e.touches[0].clientX - previousMousePosition.x
    const deltaY = e.touches[0].clientY - previousMousePosition.y

    targetCameraAngle.theta -= deltaX * 0.005
    targetCameraAngle.phi = Math.max(
      0.1,
      Math.min(Math.PI - 0.1, targetCameraAngle.phi + deltaY * 0.005)
    )

    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }

    mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1
    checkHover()
  }
}

function onTouchEnd(): void {
  isTouching = false
  isDragging = false
  isHovering = false
  particleSystem.resetColors()
}

function checkHover(): void {
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(particleSystem.points)

  if (intersects.length > 0) {
    const point = intersects[0].point
    if (!isHovering) {
      isHovering = true
      hoverStartTime = performance.now()
      hoverRecoveryActive = false
    }
    particleSystem.applyHoverEffect(point, 2.5)
  } else {
    if (isHovering && !hoverRecoveryActive) {
      hoverRecoveryActive = true
      hoverRecoveryStart = performance.now()
    }
    if (hoverRecoveryActive) {
      const elapsed = (performance.now() - hoverRecoveryStart) / 1000
      if (elapsed > hoverDuration) {
        isHovering = false
        hoverRecoveryActive = false
        particleSystem.resetColors()
      } else {
        const alpha = 1 - elapsed / hoverDuration
        raycaster.setFromCamera(mouse, camera)
        const newIntersects = raycaster.intersectObject(particleSystem.points)
        if (newIntersects.length > 0) {
          particleSystem.applyHoverEffect(newIntersects[0].point, 2.5 * alpha)
        } else {
          particleSystem.resetColors()
        }
      }
    }
  }
}

renderer.domElement.addEventListener('mousedown', onMouseDown)
renderer.domElement.addEventListener('mousemove', onMouseMove)
renderer.domElement.addEventListener('mouseup', onMouseUp)
renderer.domElement.addEventListener('mouseleave', onMouseUp)
renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true })
renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true })
renderer.domElement.addEventListener('touchend', onTouchEnd)

let lastTime = performance.now()

function animate(): void {
  requestAnimationFrame(animate)

  const currentTime = performance.now()
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1)
  lastTime = currentTime

  frameCount++
  if (currentTime - lastFpsUpdate >= 1000) {
    fps = frameCount
    frameCount = 0
    lastFpsUpdate = currentTime
    fpsCounter.textContent = `FPS: ${fps}`
  }

  const lerpFactor = 0.08
  cameraAngle.theta += (targetCameraAngle.theta - cameraAngle.theta) * lerpFactor
  cameraAngle.phi += (targetCameraAngle.phi - cameraAngle.phi) * lerpFactor
  cameraDistance += (targetCameraDistance - cameraDistance) * lerpFactor

  camera.position.x =
    cameraDistance * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta)
  camera.position.y = cameraDistance * Math.cos(cameraAngle.phi)
  camera.position.z =
    cameraDistance * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta)
  camera.lookAt(0, 0, 0)

  particleSystem.update(deltaTime)

  const positions: THREE.Vector3[] = []
  const colors: THREE.Color[] = []
  for (let i = 0; i < particleSystem.getCount(); i++) {
    positions.push(particleSystem.particles[i].position)
    colors.push(particleSystem.particles[i].color)
  }
  trailRenderer.update(positions, colors)

  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

function setupUI(): void {
  const leftPanel = document.createElement('div')
  leftPanel.id = 'left-panel'
  leftPanel.className = 'control-panel left-panel'
  leftPanel.innerHTML = `
    <h3 class="panel-title">颜色控制</h3>
    <div class="color-section">
      <label class="color-label">主色调</label>
      <div class="color-wheel-container">
        <canvas id="color-wheel" width="180" height="180"></canvas>
        <div id="color-indicator" class="color-indicator"></div>
      </div>
    </div>
    <div class="color-section">
      <label class="color-label">辅助色</label>
      <div class="color-input-row">
        <input type="color" id="secondary-color-input" value="#ff00ff">
        <div class="secondary-color-preview" id="secondary-color-preview"></div>
      </div>
    </div>
    <div class="mode-section">
      <label class="color-label">运动模式</label>
      <div class="mode-buttons">
        <button class="mode-btn active" data-mode="spiral">螺旋</button>
        <button class="mode-btn" data-mode="wave">波浪</button>
        <button class="mode-btn" data-mode="random">随机漂移</button>
      </div>
    </div>
  `
  document.body.appendChild(leftPanel)

  const rightPanel = document.createElement('div')
  rightPanel.id = 'right-panel'
  rightPanel.className = 'control-panel right-panel'
  rightPanel.innerHTML = `
    <h3 class="panel-title">参数调节</h3>
    <div class="slider-section">
      <label class="slider-label">
        <span>粒子数量</span>
        <span id="particle-count-value">200</span>
      </label>
      <input type="range" id="particle-count-slider" min="100" max="500" value="200" step="10" class="custom-slider primary-glow">
    </div>
    <div class="slider-section">
      <label class="slider-label">
        <span>运动速度</span>
        <span id="speed-value">1.0</span>
      </label>
      <input type="range" id="speed-slider" min="0.1" max="3" value="1" step="0.1" class="custom-slider primary-glow">
    </div>
    <div class="slider-section">
      <label class="slider-label">
        <span>光轨长度</span>
        <span id="trail-value">20</span>
      </label>
      <input type="range" id="trail-slider" min="5" max="50" value="20" step="1" class="custom-slider primary-glow">
    </div>
  `
  document.body.appendChild(rightPanel)

  const style = document.createElement('style')
  style.id = 'ui-styles'
  style.textContent = `
    #fps-counter {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      font-family: monospace;
      font-size: 14px;
      border-radius: 8px;
      z-index: 100;
      pointer-events: none;
    }

    .control-panel {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      padding: 24px;
      background: linear-gradient(135deg, rgba(240, 240, 240, 0.92) 0%, rgba(224, 224, 224, 0.92) 100%);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 50;
      min-width: 240px;
    }

    .left-panel {
      left: 24px;
    }

    .right-panel {
      right: 24px;
    }

    .panel-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0 0 20px 0;
      text-align: center;
      letter-spacing: 2px;
    }

    .color-section {
      margin-bottom: 24px;
    }

    .color-label {
      display: block;
      font-size: 14px;
      color: #555;
      margin-bottom: 10px;
      font-weight: 500;
    }

    .color-wheel-container {
      position: relative;
      width: 180px;
      height: 180px;
      margin: 0 auto;
    }

    #color-wheel {
      display: block;
      border-radius: 50%;
      cursor: crosshair;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .color-indicator {
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
      pointer-events: none;
      transform: translate(-50%, -50%);
      background: #00d4ff;
    }

    .color-input-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    #secondary-color-input {
      width: 50px;
      height: 40px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      padding: 0;
      background: none;
    }

    .secondary-color-preview {
      flex: 1;
      height: 40px;
      border-radius: 8px;
      background: #ff00ff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .mode-section {
      margin-top: 20px;
    }

    .mode-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mode-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.8);
      color: #333;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mode-btn:hover {
      transform: scale(1.05);
      background: rgba(255, 255, 255, 1);
    }

    .mode-btn:active {
      transform: scale(0.95);
      transition: transform 0.15s ease;
    }

    .mode-btn.active {
      background: linear-gradient(135deg, #00d4ff 0%, #0088ff 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(0, 136, 255, 0.4);
    }

    .slider-section {
      margin-bottom: 20px;
    }

    .slider-section:last-child {
      margin-bottom: 0;
    }

    .slider-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      color: #555;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .slider-label span:last-child {
      font-weight: 600;
      color: #333;
      font-family: monospace;
    }

    .custom-slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.1);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    }

    .custom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #00d4ff;
      cursor: pointer;
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.8);
      transition: all 0.15s ease;
    }

    .custom-slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      box-shadow: 0 0 12px rgba(0, 212, 255, 1);
    }

    .custom-slider::-webkit-slider-thumb:active {
      transform: scale(0.95);
    }

    .custom-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #00d4ff;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 8px rgba(0, 212, 255, 0.8);
      transition: all 0.15s ease;
    }

    .custom-slider::-moz-range-thumb:hover {
      transform: scale(1.1);
      box-shadow: 0 0 12px rgba(0, 212, 255, 1);
    }

    @media (max-width: 900px) {
      .control-panel {
        min-width: auto;
        padding: 16px;
      }

      .left-panel {
        left: 12px;
        right: 12px;
        top: auto;
        bottom: 12px;
        transform: none;
      }

      .right-panel {
        right: 12px;
        top: 60px;
        transform: none;
        width: calc(50% - 18px);
      }

      .color-wheel-container {
        width: 120px;
        height: 120px;
      }

      #color-wheel {
        width: 120px;
        height: 120px;
      }
    }
  `
  document.head.appendChild(style)

  setupColorWheel()
  setupModeButtons()
  setupSliders()
  setupSecondaryColor()
}

function setupColorWheel(): void {
  const canvas = document.getElementById('color-wheel') as HTMLCanvasElement
  const indicator = document.getElementById('color-indicator') as HTMLDivElement
  if (!canvas || !indicator) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(centerX, centerY)

  for (let angle = 0; angle < 360; angle += 1) {
    const startAngle = ((angle - 0.5) * Math.PI) / 180
    const endAngle = ((angle + 0.5) * Math.PI) / 180

    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.closePath()

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'white')
    gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`)

    ctx.fillStyle = gradient
    ctx.fill()
  }

  let isColorDragging = false

  function getColorAtPosition(x: number, y: number): { hex: string; h: number; s: number; l: number } {
    const dx = x - centerX
    const dy = y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    let clampedX = x
    let clampedY = y
    if (dist > radius) {
      const ratio = radius / dist
      clampedX = centerX + dx * ratio
      clampedY = centerY + dy * ratio
    }

    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const saturation = Math.min(dist / radius, 1)
    const hue = (angle + 360) % 360

    const h = hue / 360
    const s = saturation
    const l = 0.5

    const color = new THREE.Color()
    color.setHSL(h, s, l)
    return { hex: `#${color.getHexString()}`, h, s, l }
  }

  function clampPosition(x: number, y: number): { x: number; y: number } {
    const dx = x - centerX
    const dy = y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > radius) {
      const ratio = radius / dist
      return {
        x: centerX + dx * ratio,
        y: centerY + dy * ratio,
      }
    }
    return { x, y }
  }

  function handleColorPick(x: number, y: number): void {
    const clamped = clampPosition(x, y)
    indicator.style.left = `${clamped.x}px`
    indicator.style.top = `${clamped.y}px`
    const colorInfo = getColorAtPosition(x, y)
    indicator.style.background = colorInfo.hex
    primaryColor.set(colorInfo.hex)
    particleSystem.setPrimaryColor(primaryColor)
    updateSliderGlow(colorInfo.hex)
  }

  const initialHue = 190
  const initialSaturation = 0.9
  const initialX = centerX + Math.cos((initialHue * Math.PI) / 180) * radius * initialSaturation
  const initialY = centerY + Math.sin((initialHue * Math.PI) / 180) * radius * initialSaturation
  handleColorPick(initialX, initialY)

  canvas.addEventListener('mousedown', (e) => {
    isColorDragging = true
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    handleColorPick(x, y)
  })

  document.addEventListener('mousemove', (e) => {
    if (!isColorDragging) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    handleColorPick(x, y)
  })

  document.addEventListener('mouseup', () => {
    isColorDragging = false
  })

  canvas.addEventListener('touchstart', (e) => {
    isColorDragging = true
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.touches[0].clientX - rect.left) * scaleX
    const y = (e.touches[0].clientY - rect.top) * scaleY
    handleColorPick(x, y)
  })

  document.addEventListener('touchmove', (e) => {
    if (!isColorDragging) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.touches[0].clientX - rect.left) * scaleX
    const y = (e.touches[0].clientY - rect.top) * scaleY
    handleColorPick(x, y)
  })

  document.addEventListener('touchend', () => {
    isColorDragging = false
  })
}

function updateSliderGlow(colorHex: string): void {
  const styleEl = document.getElementById('ui-styles') as HTMLStyleElement
  if (!styleEl) return

  const sliders = document.querySelectorAll('.custom-slider.primary-glow')
  sliders.forEach((slider, index) => {
    ;(slider as HTMLInputElement).style.setProperty('--thumb-color', colorHex)
    ;(slider as HTMLInputElement).style.setProperty('--glow-color', colorHex + 'cc')
  })

  let cssText = styleEl.textContent || ''
  const webkitRule = `.custom-slider.primary-glow::-webkit-slider-thumb { background: ${colorHex}; box-shadow: 0 0 8px ${colorHex}cc; }`
  const mozRule = `.custom-slider.primary-glow::-moz-range-thumb { background: ${colorHex}; box-shadow: 0 0 8px ${colorHex}cc; }`
  const hoverWebkit = `.custom-slider.primary-glow::-webkit-slider-thumb:hover { box-shadow: 0 0 14px ${colorHex}; }`
  const hoverMoz = `.custom-slider.primary-glow::-moz-range-thumb:hover { box-shadow: 0 0 14px ${colorHex}; }`

  const dynamicRules = `
    ${webkitRule}
    ${hoverWebkit}
    ${mozRule}
    ${hoverMoz}
  `

  const markerStart = '/* DYNAMIC_SLIDER_STYLES_START */'
  const markerEnd = '/* DYNAMIC_SLIDER_STYLES_END */'

  if (cssText.includes(markerStart)) {
    const startIdx = cssText.indexOf(markerStart)
    const endIdx = cssText.indexOf(markerEnd) + markerEnd.length
    cssText = cssText.substring(0, startIdx) + markerStart + dynamicRules + markerEnd + cssText.substring(endIdx)
  } else {
    cssText += markerStart + dynamicRules + markerEnd
  }

  styleEl.textContent = cssText
}

function setupSecondaryColor(): void {
  const input = document.getElementById('secondary-color-input') as HTMLInputElement
  const preview = document.getElementById('secondary-color-preview') as HTMLDivElement
  if (!input || !preview) return

  input.addEventListener('input', (e) => {
    const color = (e.target as HTMLInputElement).value
    preview.style.background = color
    secondaryColor.set(color)
    particleSystem.setSecondaryColor(secondaryColor)
  })
}

function setupModeButtons(): void {
  const buttons = document.querySelectorAll('.mode-btn')

  buttons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement
      const mode = target.dataset.mode as MotionMode

      buttons.forEach((b) => b.classList.remove('active'))
      target.classList.add('active')

      particleSystem.setMode(mode)
    })
  })
}

function setupSliders(): void {
  const countSlider = document.getElementById('particle-count-slider') as HTMLInputElement
  const countValue = document.getElementById('particle-count-value') as HTMLSpanElement
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement
  const speedValue = document.getElementById('speed-value') as HTMLSpanElement
  const trailSlider = document.getElementById('trail-slider') as HTMLInputElement
  const trailValue = document.getElementById('trail-value') as HTMLSpanElement

  if (countSlider && countValue) {
    countSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value)
      countValue.textContent = value.toString()
      particleSystem.setCount(value)
      trailRenderer.setParticleCount(value)
    })
  }

  if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      speedValue.textContent = value.toFixed(1)
      particleSystem.setSpeed(value)
    })
  }

  if (trailSlider && trailValue) {
    trailSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value)
      trailValue.textContent = value.toString()
      trailRenderer.setTrailLength(value)
    })
  }
}

setupUI()

if (loadingScreen) {
  setTimeout(() => {
    loadingScreen.classList.add('hidden')
  }, 800)
}

export { scene, camera, renderer, particleSystem, trailRenderer }
