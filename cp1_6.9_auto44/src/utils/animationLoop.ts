export interface AnimationState {
  isBreathing: boolean
  lastInteractionTime: number
  breathingPhase: number
}

export interface LoopCallbacks {
  onBreathModeChange: (breathing: boolean) => void
  onTick: (delta: number, breathingIntensity: number) => void
  onAutoOrbit: (delta: number) => void
}

const IDLE_THRESHOLD = 5000
const BREATH_PERIOD = 4000
const AUTO_ROTATION_SPEED = 0.02
const ORBIT_RADIUS = 5
const ORBIT_SPEED = 0.01

let animationFrameId: number | null = null
let lastTime = 0
let callbacks: LoopCallbacks | null = null
let isRunning = false
let orbitAngle = 0

const state: AnimationState = {
  isBreathing: false,
  lastInteractionTime: performance.now(),
  breathingPhase: 0,
}

function handleInteraction() {
  state.lastInteractionTime = performance.now()
  if (state.isBreathing && callbacks) {
    state.isBreathing = false
    callbacks.onBreathModeChange(false)
  }
}

function startLoop(cb: LoopCallbacks) {
  if (isRunning) return
  callbacks = cb
  isRunning = true
  lastTime = performance.now()

  window.addEventListener('mousemove', handleInteraction)
  window.addEventListener('mousedown', handleInteraction)
  window.addEventListener('mousewheel', handleInteraction)
  window.addEventListener('keydown', handleInteraction)
  window.addEventListener('touchstart', handleInteraction)
  window.addEventListener('wheel', handleInteraction)

  function tick(now: number) {
    if (!isRunning || !callbacks) return
    const delta = (now - lastTime) / 1000
    lastTime = now
    const idleDuration = now - state.lastInteractionTime

    if (!state.isBreathing && idleDuration >= IDLE_THRESHOLD) {
      state.isBreathing = true
      callbacks.onBreathModeChange(true)
    }

    if (state.isBreathing) {
      state.breathingPhase = (now % BREATH_PERIOD) / BREATH_PERIOD
      const breathingIntensity = 0.4 + 0.6 * (0.5 - 0.5 * Math.cos(state.breathingPhase * Math.PI * 2))
      orbitAngle += ORBIT_SPEED * delta
      callbacks.onTick(delta, breathingIntensity)
      callbacks.onAutoOrbit(delta)
    } else {
      callbacks.onTick(delta, 1.0)
    }

    animationFrameId = requestAnimationFrame(tick)
  }

  animationFrameId = requestAnimationFrame(tick)
}

function stopLoop() {
  isRunning = false
  callbacks = null
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  window.removeEventListener('mousemove', handleInteraction)
  window.removeEventListener('mousedown', handleInteraction)
  window.removeEventListener('mousewheel', handleInteraction)
  window.removeEventListener('keydown', handleInteraction)
  window.removeEventListener('touchstart', handleInteraction)
  window.removeEventListener('wheel', handleInteraction)
}

export { startLoop, stopLoop, AUTO_ROTATION_SPEED, ORBIT_RADIUS }
