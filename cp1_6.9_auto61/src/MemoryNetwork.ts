import * as THREE from 'three'

export interface MemoryCurveData {
  id: number
  controlPoints: THREE.Vector3[]
  color: THREE.Color
  baseWidth: number
  emotionIntensity: number
  createdAt: number
  isHovered: boolean
  isSelected: boolean
  adjacentIds: number[]
  pulsePhase: number
}

export interface IntersectionNode {
  id: number
  position: THREE.Vector3
  curveIds: [number, number]
}

export interface ExpandAnimationState {
  curveId: number
  startTime: number
  duration: number
  filaments: { position: THREE.Vector3; rotation: number; phase: number }[]
  particles: { angle: number; offset: THREE.Vector3 }[]
  centerSphere: { radius: number; position: THREE.Vector3; color: THREE.Color }
}

export interface NewCurveWaveState {
  curveId: number
  startTime: number
  duration: number
  wavePosition: number
}

type Listener = () => void

export class MemoryNetwork {
  curves: Map<number, MemoryCurveData> = new Map()
  intersectionNodes: IntersectionNode[] = []
  nextCurveId = 0
  nextNodeId = 0
  breathPhase = 0
  breathStartTime = -999
  selectedCurveId: number | null = null
  hoveredCurveId: number | null = null
  expandAnimation: ExpandAnimationState | null = null
  newCurveWaves: Map<number, NewCurveWaveState> = new Map()
  backgroundT = 0
  currentTime = 0
  rotationAngle = 0
  private listeners: Set<Listener> = new Set()

  private readonly INITIAL_COUNT = 80
  private readonly CONTROL_POINTS_PER = 6
  private readonly SHELL_INNER = 5
  private readonly SHELL_OUTER = 8
  private readonly BREATH_INTERVAL = 30000
  private readonly NEW_CURVE_INTERVAL = 10000
  private readonly ROTATION_PERIOD = 20000

  constructor() {
    this.generateInitialNetwork()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((l) => l())
  }

  private randomOnShell(rMin: number, rMax: number): THREE.Vector3 {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = rMin + Math.random() * (rMax - rMin)
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )
  }

  private randomHSLColor(): THREE.Color {
    const h = Math.random()
    const s = 0.8 + Math.random() * 0.2
    const l = 0.6 + Math.random() * 0.2
    const c = new THREE.Color()
    c.setHSL(h, s, l)
    return c
  }

  private generateCurve(id: number, hueSeed?: number): MemoryCurveData {
    const startPoint = this.randomOnShell(this.SHELL_INNER, this.SHELL_OUTER)
    const endPoint = this.randomOnShell(this.SHELL_INNER, this.SHELL_OUTER)
    const dir = new THREE.Vector3().subVectors(endPoint, startPoint)

    const controlPoints: THREE.Vector3[] = []
    for (let i = 0; i < this.CONTROL_POINTS_PER; i++) {
      if (i === 0) {
        controlPoints.push(startPoint.clone())
      } else if (i === this.CONTROL_POINTS_PER - 1) {
        controlPoints.push(endPoint.clone())
      } else {
        const t = i / (this.CONTROL_POINTS_PER - 1)
        const base = startPoint.clone().add(dir.clone().multiplyScalar(t))
        const curvature = 0.5 + Math.random() * 1.5
        const normal1 = new THREE.Vector3(dir.y, -dir.x, 0).normalize()
        if (normal1.lengthSq() < 0.01) normal1.set(1, 0, 0)
        const normal2 = new THREE.Vector3().crossVectors(dir, normal1).normalize()
        const offset1 = (Math.random() - 0.5) * 2 * curvature
        const offset2 = (Math.random() - 0.5) * 2 * curvature
        base.add(normal1.multiplyScalar(offset1))
        base.add(normal2.multiplyScalar(offset2))
        controlPoints.push(base)
      }
    }

    let color: THREE.Color
    if (hueSeed !== undefined) {
      color = new THREE.Color()
      color.setHSL(hueSeed / 360, 0.85 + Math.random() * 0.15, 0.65 + Math.random() * 0.15)
    } else {
      color = this.randomHSLColor()
    }

    return {
      id,
      controlPoints,
      color,
      baseWidth: 0.05 + Math.random() * 0.25,
      emotionIntensity: Math.round(Math.random() * 10),
      createdAt: this.currentTime,
      isHovered: false,
      isSelected: false,
      adjacentIds: [],
      pulsePhase: Math.random() * Math.PI * 2
    }
  }

  private getCurvePoint(curve: MemoryCurveData, t: number): THREE.Vector3 {
    const cps = curve.controlPoints
    const n = cps.length - 1
    const result = new THREE.Vector3(0, 0, 0)
    const binom = (n: number, k: number): number => {
      let res = 1
      for (let i = 1; i <= k; i++) res = (res * (n - i + 1)) / i
      return res
    }
    for (let i = 0; i <= n; i++) {
      const coeff = binom(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i)
      result.add(cps[i].clone().multiplyScalar(coeff))
    }
    return result
  }

  private findIntersections(c1: MemoryCurveData, c2: MemoryCurveData): THREE.Vector3[] {
    const pts: THREE.Vector3[] = []
    const samples = 40
    const threshold = 0.5
    for (let i = 0; i <= samples; i++) {
      const t1 = i / samples
      const p1 = this.getCurvePoint(c1, t1)
      for (let j = 0; j <= samples; j++) {
        const t2 = j / samples
        const p2 = this.getCurvePoint(c2, t2)
        if (p1.distanceTo(p2) < threshold) {
          const mid = p1.clone().add(p2).multiplyScalar(0.5)
          let tooClose = false
          for (const ep of pts) {
            if (ep.distanceTo(mid) < 0.8) {
              tooClose = true
              break
            }
          }
          if (!tooClose) pts.push(mid)
        }
      }
    }
    return pts
  }

  private computeAdjacency(): void {
    const arr = Array.from(this.curves.values())
    for (const c of arr) {
      c.adjacentIds = []
      const mid = this.getCurvePoint(c, 0.5)
      const distances: { id: number; d: number }[] = []
      for (const other of arr) {
        if (other.id === c.id) continue
        const omid = this.getCurvePoint(other, 0.5)
        distances.push({ id: other.id, d: mid.distanceTo(omid) })
      }
      distances.sort((a, b) => a.d - b.d)
      for (let i = 0; i < Math.min(5, distances.length); i++) {
        if (distances[i].d < 5) c.adjacentIds.push(distances[i].id)
      }
    }
  }

  private regenerateIntersections(): void {
    this.intersectionNodes = []
    this.nextNodeId = 0
    const arr = Array.from(this.curves.values())
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const pts = this.findIntersections(arr[i], arr[j])
        for (const p of pts) {
          this.intersectionNodes.push({
            id: this.nextNodeId++,
            position: p,
            curveIds: [arr[i].id, arr[j].id]
          })
        }
      }
    }
  }

  generateInitialNetwork(): void {
    for (let i = 0; i < this.INITIAL_COUNT; i++) {
      const curve = this.generateCurve(i)
      this.curves.set(i, curve)
    }
    this.nextCurveId = this.INITIAL_COUNT
    this.computeAdjacency()
    this.regenerateIntersections()
  }

  addNewCurve(): void {
    const now = new Date()
    const hue = now.getSeconds() % 360
    const id = this.nextCurveId++
    const curve = this.generateCurve(id, hue)
    let attempts = 0
    while (attempts < 10) {
      let crossCount = 0
      for (const other of this.curves.values()) {
        const pts = this.findIntersections(curve, other)
        crossCount += pts.length
        if (crossCount >= 2) break
      }
      if (crossCount >= 2) break
      for (let i = 0; i < curve.controlPoints.length; i++) {
        curve.controlPoints[i] = this.randomOnShell(this.SHELL_INNER, this.SHELL_OUTER)
      }
      attempts++
    }
    curve.createdAt = this.currentTime
    this.curves.set(id, curve)
    this.computeAdjacency()
    this.regenerateIntersections()
    this.newCurveWaves.set(id, {
      curveId: id,
      startTime: this.currentTime,
      duration: 2000,
      wavePosition: 0
    })
    setTimeout(() => {
      this.newCurveWaves.delete(id)
      this.notify()
    }, 2200)
  }

  setHovered(id: number | null): void {
    if (this.hoveredCurveId === id) return
    if (this.hoveredCurveId !== null) {
      const prev = this.curves.get(this.hoveredCurveId)
      if (prev) prev.isHovered = false
    }
    this.hoveredCurveId = id
    if (id !== null) {
      const cur = this.curves.get(id)
      if (cur) cur.isHovered = true
    }
    this.notify()
  }

  setSelected(id: number | null): void {
    if (this.selectedCurveId === id) return
    if (this.selectedCurveId !== null) {
      const prev = this.curves.get(this.selectedCurveId)
      if (prev) prev.isSelected = false
    }
    this.selectedCurveId = id
    if (id !== null) {
      const cur = this.curves.get(id)
      if (cur) {
        cur.isSelected = true
        this.startExpandAnimation(id)
      }
    }
    this.notify()
  }

  private startExpandAnimation(curveId: number): void {
    const curve = this.curves.get(curveId)
    if (!curve) return
    const center = this.getCurvePoint(curve, 0.5)
    const filaments = []
    for (let i = 0; i < 12; i++) {
      filaments.push({
        position: center.clone(),
        rotation: (i / 12) * Math.PI * 2,
        phase: Math.random() * Math.PI * 2
      })
    }
    const particles = []
    for (let i = 0; i < 32; i++) {
      const normal = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      particles.push({
        angle: (i / 32) * Math.PI * 2,
        offset: normal.multiplyScalar(1.2)
      })
    }
    this.expandAnimation = {
      curveId,
      startTime: this.currentTime,
      duration: 2800,
      filaments,
      particles,
      centerSphere: {
        radius: 0.3 + Math.random() * 0.3,
        position: center.clone(),
        color: curve.color.clone()
      }
    }
    setTimeout(() => {
      this.expandAnimation = null
      this.notify()
    }, 3000)
  }

  getSelectedInfo(): { intensity: number; age: number } | null {
    if (this.selectedCurveId === null) return null
    const curve = this.curves.get(this.selectedCurveId)
    if (!curve) return null
    return {
      intensity: curve.emotionIntensity,
      age: Math.floor((this.currentTime - curve.createdAt) / 1000)
    }
  }

  getBreathScale(): number {
    const timeSince = this.currentTime - this.breathStartTime
    if (timeSince < 0 || timeSince > 1300) return 1
    if (timeSince < 500) {
      const t = timeSince / 500
      return 1 - 0.2 * t
    } else if (timeSince < 1000) {
      const t = (timeSince - 500) / 500
      return 0.8 + 0.3 * t
    } else {
      const t = (timeSince - 1000) / 300
      return 1.1 - 0.1 * t
    }
  }

  getBackgroundT(): number {
    return this.backgroundT
  }

  update(time: number): void {
    const prevSecond = Math.floor(this.currentTime / 1000)
    this.currentTime = time
    const currSecond = Math.floor(time / 1000)

    this.rotationAngle = (time / this.ROTATION_PERIOD) * Math.PI * 2

    if (prevSecond !== currSecond) {
      if (time > 0 && Math.floor(time / this.BREATH_INTERVAL) > Math.floor((time - 1000) / this.BREATH_INTERVAL)) {
        this.breathStartTime = time
      }
      if (time > 0 && Math.floor(time / this.NEW_CURVE_INTERVAL) > Math.floor((time - 1000) / this.NEW_CURVE_INTERVAL)) {
        this.addNewCurve()
      }
    }

    const breathTime = time - this.breathStartTime
    if (breathTime >= 0 && breathTime <= 1300) {
      if (breathTime < 500) {
        this.backgroundT = breathTime / 500
      } else if (breathTime < 1000) {
        this.backgroundT = 1 - (breathTime - 500) / 500
      } else {
        this.backgroundT = Math.max(0, 1 - (breathTime - 1000) / 300)
      }
    } else {
      this.backgroundT = 0
    }

    for (const wave of this.newCurveWaves.values()) {
      const elapsed = time - wave.startTime
      wave.wavePosition = Math.min(1, (elapsed / wave.duration))
    }

    if (this.expandAnimation) {
      const elapsed = time - this.expandAnimation.startTime
      if (elapsed > 800 && elapsed < 2800) {
        const center = this.expandAnimation.centerSphere.position
        const spiralT = Math.min(1, (elapsed - 800) / 1500)
        for (const f of this.expandAnimation.filaments) {
          const radius = spiralT * 1.5
          const angle = f.rotation + spiralT * Math.PI * 2
          f.position.set(
            center.x + Math.cos(angle) * radius,
            center.y + Math.sin(angle) * radius,
            center.z + Math.sin(angle * 0.7) * radius * 0.5
          )
        }
        for (const p of this.expandAnimation.particles) {
          p.angle += (Math.PI * 2) / 60
        }
      }
    }

    this.notify()
  }

  getCurveRenderData(curve: MemoryCurveData): {
    points: THREE.Vector3[]
    width: number
    opacity: number
    glowColor: THREE.Color
    pulse: boolean
  } {
    const samples = 60
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const p = this.getCurvePoint(curve, t)
      points.push(p.clone())
    }

    let width = curve.baseWidth
    let opacity = 0.85
    let glowColor = curve.color.clone()
    let pulse = false

    if (curve.isHovered || curve.isSelected) {
      width = curve.baseWidth * 2
      glowColor = curve.color.clone().offsetHSL(0, 0, 0.15)
    }

    if (curve.isSelected && this.expandAnimation && this.expandAnimation.curveId === curve.id) {
      const elapsed = this.currentTime - this.expandAnimation.startTime
      if (elapsed < 800) {
        const t = elapsed / 800
        const wave = Math.sin(t * Math.PI)
        width = curve.baseWidth * 2 + (1.0 - curve.baseWidth * 2) * wave
      }
    }

    if (this.hoveredCurveId !== null && curve.adjacentIds.includes(this.hoveredCurveId)) {
      const phase = (this.currentTime / 1000) * Math.PI * 2 * 2 + curve.pulsePhase
      opacity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(phase))
      pulse = true
    }

    const wave = this.newCurveWaves.get(curve.id)
    if (wave) {
      glowColor = curve.color.clone().offsetHSL(0, 0, 0.2 * Math.sin(wave.wavePosition * Math.PI))
    }

    return { points, width, opacity, glowColor, pulse }
  }

  getNodePositions(): THREE.Vector3[] {
    return this.intersectionNodes.map((n) => n.position.clone())
  }
}
