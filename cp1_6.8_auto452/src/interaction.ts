import type { Star } from './star'

export interface CameraState {
  rotationX: number
  rotationY: number
  zoom: number
  velocityX: number
  velocityY: number
}

export interface InteractionState {
  isDragging: boolean
  lastX: number
  lastY: number
  mouseX: number
  mouseY: number
  hoveredStarId: number | null
  pinchDist: number
}

let cachedAudioContext: AudioContext | null = null

export function createInteractionState(): InteractionState {
  return {
    isDragging: false,
    lastX: 0,
    lastY: 0,
    mouseX: 0,
    mouseY: 0,
    hoveredStarId: null,
    pinchDist: 0
  }
}

export function createCameraState(): CameraState {
  return {
    rotationX: 0,
    rotationY: 0,
    zoom: 1,
    velocityX: 0,
    velocityY: 0
  }
}

export function updateCamera(camera: CameraState, dt: number, rotationSpeed: number): void {
  const dampingFactor = 0.95

  camera.rotationX += camera.velocityX * dt * rotationSpeed
  camera.rotationY += camera.velocityY * dt * rotationSpeed

  camera.velocityX *= dampingFactor
  camera.velocityY *= dampingFactor

  if (Math.abs(camera.velocityX) < 0.0001) camera.velocityX = 0
  if (Math.abs(camera.velocityY) < 0.0001) camera.velocityY = 0

  camera.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotationX))
  camera.zoom = Math.max(0.3, Math.min(3.0, camera.zoom))
}

export function setupInteraction(
  canvas: HTMLCanvasElement,
  state: InteractionState,
  camera: CameraState,
  onStarClick: (star: Star) => void,
  onStarHover: (star: Star | null) => void,
  rotationSpeed: number
): () => void {
  function getStars(): Star[] {
    return (canvas as unknown as Record<string, Star[]>).__stars ?? []
  }

  function findStarAt(x: number, y: number): Star | null {
    const stars = getStars()
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i]
      const dx = x - s.x
      const dy = y - s.y
      const hitRadius = s.size * camera.zoom * 2
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        return s
      }
    }
    return null
  }

  function handlePointerDown(x: number, y: number): void {
    state.isDragging = true
    state.lastX = x
    state.lastY = y
  }

  function handlePointerMove(x: number, y: number): void {
    state.mouseX = x
    state.mouseY = y

    if (state.isDragging) {
      const deltaX = x - state.lastX
      const deltaY = y - state.lastY
      camera.velocityY = deltaX * 0.005
      camera.velocityX = deltaY * 0.005
      state.lastX = x
      state.lastY = y
    }

    const star = findStarAt(x, y)
    const newId = star ? star.id : null
    if (newId !== state.hoveredStarId) {
      state.hoveredStarId = newId
      onStarHover(star)
    }
  }

  function handlePointerUp(x: number, y: number): void {
    if (state.isDragging) {
      const dx = x - state.lastX
      const dy = y - state.lastY
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
        const star = findStarAt(x, y)
        if (star) {
          onStarClick(star)
        }
      }
    }
    state.isDragging = false
  }

  function getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function onMouseDown(e: MouseEvent): void {
    e.preventDefault()
    handlePointerDown(e.clientX, e.clientY)
  }

  function onMouseMove(e: MouseEvent): void {
    handlePointerMove(e.clientX, e.clientY)
  }

  function onMouseUp(e: MouseEvent): void {
    handlePointerUp(e.clientX, e.clientY)
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    camera.zoom -= e.deltaY * 0.001
    camera.zoom = Math.max(0.3, Math.min(3.0, camera.zoom))
  }

  function onTouchStart(e: TouchEvent): void {
    e.preventDefault()
    if (e.touches.length === 1) {
      const t = e.touches[0]
      handlePointerDown(t.clientX, t.clientY)
    } else if (e.touches.length === 2) {
      state.pinchDist = getTouchDistance(e.touches)
    }
  }

  function onTouchMove(e: TouchEvent): void {
    e.preventDefault()
    if (e.touches.length === 1 && state.isDragging) {
      const t = e.touches[0]
      handlePointerMove(t.clientX, t.clientY)
    } else if (e.touches.length === 2) {
      const newDist = getTouchDistance(e.touches)
      const scale = newDist / state.pinchDist
      camera.zoom *= scale
      camera.zoom = Math.max(0.3, Math.min(3.0, camera.zoom))
      state.pinchDist = newDist
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      state.isDragging = false
    }
  }

  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd)

  return () => {
    canvas.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
  }
}

export function getAudioContext(): AudioContext | null {
  if (!cachedAudioContext) {
    try {
      cachedAudioContext = new AudioContext()
    } catch {
      return null
    }
  }
  return cachedAudioContext
}

export function playBellSound(audioCtx: AudioContext): void {
  const now = audioCtx.currentTime
  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(1200, now)
  oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15)

  gainNode.gain.setValueAtTime(0.3, now)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  oscillator.start(now)
  oscillator.stop(now + 0.15)
}

export function playGlassSound(audioCtx: AudioContext): void {
  const now = audioCtx.currentTime
  const duration = 0.5

  const masterGain = audioCtx.createGain()
  masterGain.connect(audioCtx.destination)

  for (let i = 0; i < 5; i++) {
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    const freq = 3000 + Math.random() * 5000
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(freq, now)

    const startOffset = Math.random() * 0.02
    gainNode.gain.setValueAtTime(0, now + startOffset)
    gainNode.gain.linearRampToValueAtTime(0.08, now + startOffset + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration * 0.6)

    oscillator.connect(gainNode)
    gainNode.connect(masterGain)

    oscillator.start(now + startOffset)
    oscillator.stop(now + duration)
  }

  const bufferSize = audioCtx.sampleRate * duration
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const output = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1
  }

  const noiseSource = audioCtx.createBufferSource()
  noiseSource.buffer = noiseBuffer

  const noiseGain = audioCtx.createGain()
  noiseGain.gain.setValueAtTime(0, now)
  noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.1)
  noiseGain.gain.linearRampToValueAtTime(0.05, now + 0.2)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noiseSource.connect(noiseGain)
  noiseGain.connect(masterGain)

  noiseSource.start(now)
  noiseSource.stop(now + duration)
}
