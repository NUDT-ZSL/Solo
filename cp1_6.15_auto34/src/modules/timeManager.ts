export interface SunPosition {
  azimuth: number
  altitude: number
}

export type TimeUpdateCallback = (time: number, sunPosition: SunPosition) => void

const START_HOUR = 6
const END_HOUR = 20
const STEP_MINUTES = 15
const UPDATE_INTERVAL = 200
const TRANSITION_DURATION = 300

class TimeManager {
  private currentTime: number
  private subscribers: Set<TimeUpdateCallback>
  private animationFrameId: number | null
  private lastUpdateTime: number
  private isAutoPlaying: boolean
  private isTransitioning: boolean
  private transitionStart: number
  private transitionEnd: number
  private transitionStartTime: number
  private currentSunPosition: SunPosition
  private targetSunPosition: SunPosition

  constructor() {
    this.currentTime = START_HOUR
    this.subscribers = new Set()
    this.animationFrameId = null
    this.lastUpdateTime = 0
    this.isAutoPlaying = true
    this.isTransitioning = false
    this.transitionStart = START_HOUR
    this.transitionEnd = START_HOUR
    this.transitionStartTime = 0
    this.currentSunPosition = this.calculateSunPosition(START_HOUR)
    this.targetSunPosition = this.currentSunPosition
  }

  start(): void {
    this.lastUpdateTime = performance.now()
    this.loop()
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  subscribe(callback: TimeUpdateCallback): () => void {
    this.subscribers.add(callback)
    callback(this.currentTime, this.currentSunPosition)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  setManualTime(time: number): void {
    this.isAutoPlaying = false
    this.startTransition(this.currentTime, time)
  }

  resumeAutoPlay(): void {
    if (!this.isAutoPlaying) {
      this.isAutoPlaying = true
      this.lastUpdateTime = performance.now()
    }
  }

  getCurrentTime(): number {
    return this.currentTime
  }

  getSunPosition(): SunPosition {
    return { ...this.currentSunPosition }
  }

  isPlaying(): boolean {
    return this.isAutoPlaying
  }

  private loop = (): void => {
    const now = performance.now()

    if (this.isTransitioning) {
      this.updateTransition(now)
    } else if (this.isAutoPlaying && now - this.lastUpdateTime >= UPDATE_INTERVAL) {
      this.advanceTime()
      this.lastUpdateTime = now
    }

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  private advanceTime(): void {
    let nextTime = this.currentTime + STEP_MINUTES / 60
    if (nextTime >= END_HOUR) {
      nextTime = START_HOUR
    }
    this.startTransition(this.currentTime, nextTime)
  }

  private startTransition(from: number, to: number): void {
    this.transitionStart = from
    this.transitionEnd = to
    this.transitionStartTime = performance.now()
    this.isTransitioning = true
    this.targetSunPosition = this.calculateSunPosition(to)
  }

  private updateTransition(now: number): void {
    const elapsed = now - this.transitionStartTime
    const progress = Math.min(elapsed / TRANSITION_DURATION, 1)
    const easedProgress = this.easeInOutCubic(progress)

    this.currentTime = this.lerp(this.transitionStart, this.transitionEnd, easedProgress)
    this.currentSunPosition = {
      azimuth: this.lerpAngle(
        this.calculateSunPosition(this.transitionStart).azimuth,
        this.targetSunPosition.azimuth,
        easedProgress
      ),
      altitude: this.lerp(
        this.calculateSunPosition(this.transitionStart).altitude,
        this.targetSunPosition.altitude,
        easedProgress
      )
    }

    this.notifySubscribers()

    if (progress >= 1) {
      this.isTransitioning = false
      this.currentTime = this.transitionEnd
      this.currentSunPosition = { ...this.targetSunPosition }
      this.notifySubscribers()
    }
  }

  private calculateSunPosition(time: number): SunPosition {
    const normalizedTime = (time - START_HOUR) / (END_HOUR - START_HOUR)
    const azimuth = (normalizedTime - 0.5) * 180
    const altitude = Math.sin(normalizedTime * Math.PI) * 90
    return { azimuth, altitude }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => {
      callback(this.currentTime, { ...this.currentSunPosition })
    })
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const diff = b - a
    return a + diff * t
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
}

export { TimeManager }
export const timeManager = new TimeManager()

export default timeManager
