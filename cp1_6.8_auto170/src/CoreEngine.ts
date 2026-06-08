import {
  FragmentData,
  Particle,
  StarPoint,
  ViewState,
  ReflectedColor,
  createFragment,
  splitFragment,
  isPointInFragment,
} from './FragmentData'

const PERFORMANCE_THRESHOLD = 200
const EASE_FACTOR = 0.12
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const PARTICLE_COUNT_PER_SPLIT = 16
const STAR_COUNT = 120

export class CoreEngine {
  fragments: FragmentData[] = []
  particles: Particle[] = []
  stars: StarPoint[] = []
  view: ViewState = {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    targetZoom: 1,
    targetOffsetX: 0,
    targetOffsetY: 0,
  }
  autoRotateEnabled = false
  private frameCount = 0
  private reflectedColors: Map<string, ReflectedColor[]> = new Map()
  onFragmentChange: (() => void) | null = null

  constructor() {
    this.initStars()
  }

  private initStars() {
    this.stars = []
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * 4000 - 2000,
        y: Math.random() * 4000 - 2000,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.2 + Math.random() * 0.6,
        speed: 0.1 + Math.random() * 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
      })
    }
  }

  addFragment(worldX: number, worldY: number): FragmentData {
    const frag = createFragment(worldX, worldY)
    this.fragments.push(frag)
    this.notifyChange()
    return frag
  }

  handleCanvasClick(worldX: number, worldY: number): FragmentData | null {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i]
      if (isPointInFragment(frag, worldX, worldY)) {
        this.splitFragmentAt(i)
        return null
      }
    }
    return this.addFragment(worldX, worldY)
  }

  splitFragmentAt(index: number) {
    const frag = this.fragments[index]
    const children = splitFragment(frag)
    this.fragments.splice(index, 1, ...children)
    this.emitParticles(frag.x, frag.y, frag.hue)
    this.notifyChange()
  }

  clearAll() {
    this.fragments = []
    this.particles = []
    this.reflectedColors.clear()
    this.notifyChange()
  }

  setAutoRotate(enabled: boolean) {
    this.autoRotateEnabled = enabled
    this.fragments.forEach((f) => {
      f.autoRotate = enabled
    })
  }

  private emitParticles(x: number, y: number, hue: number) {
    for (let i = 0; i < PARTICLE_COUNT_PER_SPLIT; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 5
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.6,
        hue: (hue + Math.random() * 40 - 20 + 360) % 360,
        size: 2 + Math.random() * 4,
      })
    }
  }

  panBy(dx: number, dy: number) {
    this.view.targetOffsetX += dx / this.view.zoom
    this.view.targetOffsetY += dy / this.view.zoom
  }

  zoomAt(delta: number, screenX: number, screenY: number, canvasW: number, canvasH: number) {
    const oldZoom = this.view.targetZoom
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * (1 - delta * 0.001)))

    const wx = (screenX - canvasW / 2) / oldZoom + this.view.targetOffsetX
    const wy = (screenY - canvasH / 2) / oldZoom + this.view.targetOffsetY

    this.view.targetZoom = newZoom

    this.view.targetOffsetX = wx - (screenX - canvasW / 2) / newZoom
    this.view.targetOffsetY = wy - (screenY - canvasH / 2) / newZoom
  }

  screenToWorld(screenX: number, screenY: number, canvasW: number, canvasH: number): [number, number] {
    const wx = (screenX - canvasW / 2) / this.view.zoom + this.view.offsetX
    const wy = (screenY - canvasH / 2) / this.view.zoom + this.view.offsetY
    return [wx, wy]
  }

  update(dt: number) {
    this.frameCount++

    this.view.offsetX += (this.view.targetOffsetX - this.view.offsetX) * EASE_FACTOR
    this.view.offsetY += (this.view.targetOffsetY - this.view.offsetY) * EASE_FACTOR
    this.view.zoom += (this.view.targetZoom - this.view.zoom) * EASE_FACTOR

    const now = performance.now()
    for (const frag of this.fragments) {
      if (frag.autoRotate) {
        frag.rotation += frag.rotateSpeed
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05
      p.vx *= 0.98
      p.vy *= 0.98
      p.life -= dt / p.maxLife
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }

    for (const star of this.stars) {
      star.y -= star.speed * dt * 0.3
      star.twinklePhase += star.twinkleSpeed * dt
      if (star.y < -2000) {
        star.y = 2000
        star.x = Math.random() * 4000 - 2000
      }
    }

    const shouldComputeReflections =
      this.fragments.length <= PERFORMANCE_THRESHOLD
        ? true
        : this.frameCount % 3 === 0

    if (shouldComputeReflections) {
      this.computeReflections()
    }
  }

  private computeReflections() {
    this.reflectedColors.clear()
    const useSimplified = this.fragments.length > PERFORMANCE_THRESHOLD

    for (const frag of this.fragments) {
      const colors: ReflectedColor[] = []
      const sampleCount = useSimplified ? 3 : 6

      for (let i = 0; i < sampleCount; i++) {
        const angle = (Math.PI * 2 * i) / sampleCount + frag.rotation
        let closestDist = Infinity
        let closestHue = frag.hue
        let closestSat = 70
        let closestLight = 55

        for (const other of this.fragments) {
          if (other.id === frag.id) continue
          const dx = other.x - frag.x
          const dy = other.y - frag.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const angleToOther = Math.atan2(dy, dx)
          const angleDiff = Math.abs(Math.atan2(Math.sin(angle - angleToOther), Math.cos(angle - angleToOther)))

          if (angleDiff < Math.PI / 3 && dist < closestDist && dist < 400) {
            closestDist = dist
            closestHue = other.hue
            closestSat = 75
            closestLight = 60
          }
        }

        const prismShift = Math.sin(angle * 2 + performance.now() * 0.001) * 30
        colors.push({
          h: (closestHue + prismShift + 360) % 360,
          s: closestSat,
          l: closestLight,
        })
      }

      this.reflectedColors.set(frag.id, colors)
    }
  }

  getReflectedColors(fragmentId: string): ReflectedColor[] {
    return this.reflectedColors.get(fragmentId) ?? []
  }

  getFragmentCount(): number {
    return this.fragments.length
  }

  getZoomPercent(): number {
    return Math.round(this.view.zoom * 100)
  }

  private notifyChange() {
    this.onFragmentChange?.()
  }
}
