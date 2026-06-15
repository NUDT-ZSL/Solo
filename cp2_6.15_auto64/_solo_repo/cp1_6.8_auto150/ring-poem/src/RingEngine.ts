import type { TimeNode } from './TextParser'
import { getEmotionVisual } from './EmotionMapper'

export interface RingState {
  index: number
  innerRadius: number
  outerRadius: number
  width: number
  color: string
  glowColor: string
  expanded: boolean
  hovered: boolean
  expandProgress: number
  rotationOffset: number
  selfRotation: number
  node: TimeNode
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
  maxLife: number
}

export class RingEngine {
  private rings: RingState[] = []
  private particles: Particle[] = []
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private animFrameId: number = 0
  private globalRotation = 0
  private targetGlobalRotation = 0
  private isDragging = false
  private dragStartAngle = 0
  private dragStartRotation = 0
  private centerX = 0
  private centerY = 0
  private hoveredIndex = -1
  private expandedIndex = -1
  private expandingRings: Map<number, { start: number; duration: number; progress: number }> = new Map()
  private selfRotations: Map<number, number> = new Map()
  private onStateChange: (() => void) | null = null
  private particleCount = 60
  private dpr = 1
  private width = 0
  private height = 0

  constructor() {}

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.dpr = window.devicePixelRatio || 1
    this.resize()
    this.initParticles()
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb
  }

  resize() {
    if (!this.canvas) return
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    if (!rect) return
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.centerX = rect.width / 2
    this.centerY = rect.height / 2
    this.recalculateRings()
  }

  generateRings(nodes: TimeNode[]) {
    this.rings = []
    this.expandedIndex = -1
    this.expandingRings.clear()
    this.selfRotations.clear()
    const baseUnit = Math.min(this.width, this.height) * 0.04
    const gap = baseUnit * 0.35

    nodes.forEach((node, i) => {
      const visual = getEmotionVisual(node.emotion)
      const ringWidth = baseUnit * visual.ringWidth
      const innerR = baseUnit * 1.2 + i * (baseUnit * 0.8 + gap + ringWidth)
      const outerR = innerR + ringWidth
      this.rings.push({
        index: i,
        innerRadius: innerR,
        outerRadius: outerR,
        width: ringWidth,
        color: visual.ringColor,
        glowColor: visual.glowColor,
        expanded: false,
        hovered: false,
        expandProgress: 0,
        rotationOffset: (i * 30) % 360,
        selfRotation: 0,
        node,
      })
      this.selfRotations.set(i, Math.random() * 360)
    })
    this.emitChange()
  }

  getRings(): RingState[] {
    return this.rings
  }

  getGlobalRotation(): number {
    return this.globalRotation
  }

  getExpandedIndex(): number {
    return this.expandedIndex
  }

  getHoveredIndex(): number {
    return this.hoveredIndex
  }

  hitTest(x: number, y: number): number {
    const dx = x - this.centerX
    const dy = y - this.centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    const adjustedAngle = ((angle - this.globalRotation) % 360 + 360) % 360
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]
      if (dist >= ring.innerRadius && dist <= ring.outerRadius) {
        return i
      }
    }
    return -1
  }

  setHovered(index: number) {
    if (this.hoveredIndex === index) return
    this.hoveredIndex = index
    this.emitChange()
  }

  toggleExpand(index: number) {
    if (this.expandedIndex === index) {
      this.expandedIndex = -1
      this.rings[index].expanded = false
      this.expandingRings.delete(index)
    } else {
      if (this.expandedIndex >= 0 && this.expandedIndex < this.rings.length) {
        this.rings[this.expandedIndex].expanded = false
        this.expandingRings.delete(this.expandedIndex)
      }
      this.expandedIndex = index
      this.rings[index].expanded = true
      this.expandingRings.set(index, {
        start: performance.now(),
        duration: 1000,
        progress: 0,
      })
    }
    this.emitChange()
  }

  startDrag(x: number, y: number) {
    this.isDragging = true
    const dx = x - this.centerX
    const dy = y - this.centerY
    this.dragStartAngle = Math.atan2(dy, dx)
    this.dragStartRotation = this.targetGlobalRotation
  }

  updateDrag(x: number, y: number) {
    if (!this.isDragging) return
    const dx = x - this.centerX
    const dy = y - this.centerY
    const currentAngle = Math.atan2(dy, dx)
    const delta = ((currentAngle - this.dragStartAngle) * 180) / Math.PI
    this.targetGlobalRotation = this.dragStartRotation + delta
  }

  endDrag() {
    this.isDragging = false
  }

  start() {
    this.loop()
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = 0
    }
  }

  private loop = () => {
    this.animFrameId = requestAnimationFrame(this.loop)
    this.updateAnimations()
    this.updateParticles()
    this.drawParticles()
  }

  private updateAnimations() {
    const now = performance.now()
    const rotDiff = this.targetGlobalRotation - this.globalRotation
    this.globalRotation += rotDiff * 0.08

    let changed = false
    this.expandingRings.forEach((anim, index) => {
      const elapsed = now - anim.start
      const t = Math.min(elapsed / anim.duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      anim.progress = eased
      if (this.rings[index]) {
        this.rings[index].expandProgress = eased
      }
      if (t >= 1) {
        this.expandingRings.delete(index)
      }
      changed = true
    })

    this.selfRotations.forEach((_, index) => {
      this.selfRotations.set(index, (this.selfRotations.get(index) ?? 0) + 0.05)
    })

    if (changed) this.emitChange()
  }

  private initParticles() {
    this.particles = []
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle(true))
    }
  }

  private createParticle(randomLife = false): Particle {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      life: randomLife ? Math.random() * 300 : 0,
      maxLife: 300 + Math.random() * 200,
    }
  }

  private updateParticles() {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life++
      if (p.life > p.maxLife || p.y < -10 || p.x < -10 || p.x > this.width + 10) {
        this.particles[i] = this.createParticle()
        this.particles[i].y = this.height + 5
      }
    }
  }

  private drawParticles() {
    if (!this.ctx) return
    this.ctx.clearRect(0, 0, this.width, this.height)
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife
      const fadeIn = Math.min(lifeRatio * 5, 1)
      const fadeOut = Math.max(1 - (lifeRatio - 0.7) / 0.3, 0)
      const alpha = p.opacity * fadeIn * (lifeRatio > 0.7 ? fadeOut : 1)
      if (alpha <= 0) continue
      this.ctx!.beginPath()
      this.ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx!.fillStyle = `rgba(210, 190, 160, ${alpha})`
      this.ctx!.fill()
    }
  }

  getSelfRotation(index: number): number {
    return this.selfRotations.get(index) ?? 0
  }

  private recalculateRings() {
    if (this.rings.length === 0) return
    const nodes = this.rings.map(r => r.node)
    const wasExpanded = this.expandedIndex
    this.generateRings(nodes)
    if (wasExpanded >= 0 && wasExpanded < this.rings.length) {
      this.expandedIndex = wasExpanded
      this.rings[wasExpanded].expanded = true
      this.rings[wasExpanded].expandProgress = 1
    }
  }

  private emitChange() {
    this.onStateChange?.()
  }
}
