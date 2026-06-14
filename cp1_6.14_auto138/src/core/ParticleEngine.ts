import * as THREE from 'three'

export interface ParticleData {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  startColor: THREE.Color
  life: number
  maxLife: number
  size: number
  startSize: number
  speedFactor: number
  active: boolean
}

export type BrushType = 'spray' | 'vortex' | 'trail'

export interface BrushParams {
  density?: number
  radius?: number
  length?: number
}

type EventType = 'particleCountChange' | 'needsRender'

interface EventCallback {
  (data?: number): void
}

const COLOR_PALETTE = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24']
const MAX_PARTICLES = 50000

export class ParticleEngine {
  private particles: ParticleData[] = []
  private particlePool: ParticleData[] = []
  private nextId = 0
  private currentBrush: BrushType = 'spray'
  private brushParams: BrushParams = { density: 65, radius: 80, length: 125 }
  private isDrawing = false
  private lastMousePos: THREE.Vector3 | null = null
  private sprayTimer = 0
  private trailPositions: THREE.Vector3[] = []
  private eventListeners: Map<EventType, Set<EventCallback>> = new Map()
  private history: ParticleData[][] = []
  private maxHistory = 20

  constructor() {
    this.initParticlePool()
  }

  private initParticlePool(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePool.push({
        id: -1,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        startColor: new THREE.Color(),
        life: 0,
        maxLife: 0,
        size: 0,
        startSize: 0,
        speedFactor: 0,
        active: false
      })
    }
  }

  private getRandomColor(): THREE.Color {
    const hex = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
    return new THREE.Color(hex)
  }

  private emitParticle(position: THREE.Vector3, velocity: THREE.Vector3): void {
    if (this.particles.length >= MAX_PARTICLES) return

    const poolParticle = this.particlePool.find(p => !p.active)
    if (!poolParticle) return

    const startColor = this.getRandomColor()
    const maxLife = 8 + Math.random() * 4

    poolParticle.id = this.nextId++
    poolParticle.position.copy(position)
    poolParticle.velocity.copy(velocity)
    poolParticle.color.copy(startColor)
    poolParticle.startColor.copy(startColor)
    poolParticle.life = maxLife
    poolParticle.maxLife = maxLife
    poolParticle.size = 3
    poolParticle.startSize = 3
    poolParticle.speedFactor = 1
    poolParticle.active = true

    this.particles.push(poolParticle)
    this.emit('particleCountChange', this.particles.length)
    this.emit('needsRender')
  }

  private emitSpray(worldPos: THREE.Vector3, deltaTime: number): void {
    const density = this.brushParams.density ?? 65
    this.sprayTimer += deltaTime
    const particlesToEmit = Math.floor(this.sprayTimer * density)
    this.sprayTimer -= particlesToEmit / density

    for (let i = 0; i < particlesToEmit; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 20
      const offset = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (Math.random() - 0.5) * 20
      )
      const pos = worldPos.clone().add(offset)
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      )
      this.emitParticle(pos, velocity)
    }
  }

  private emitVortex(worldPos: THREE.Vector3): void {
    const radius = this.brushParams.radius ?? 80
    const particlesToEmit = 3

    for (let i = 0; i < particlesToEmit; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * radius
      const offset = new THREE.Vector3(
        Math.cos(angle) * r,
        Math.sin(angle) * r,
        (Math.random() - 0.5) * 10
      )
      const pos = worldPos.clone().add(offset)
      
      const toCenter = worldPos.clone().sub(pos)
      const tangent = new THREE.Vector3(-toCenter.y, toCenter.x, 0).normalize()
      const velocity = tangent.multiplyScalar(8).add(toCenter.normalize().multiplyScalar(3))
      
      this.emitParticle(pos, velocity)
    }
  }

  private emitTrail(worldPos: THREE.Vector3): void {
    const length = this.brushParams.length ?? 125
    this.trailPositions.push(worldPos.clone())
    
    if (this.trailPositions.length > 20) {
      this.trailPositions.shift()
    }

    if (this.trailPositions.length >= 2) {
      const prev = this.trailPositions[this.trailPositions.length - 2]
      const dir = worldPos.clone().sub(prev).normalize()
      const distance = worldPos.distanceTo(prev)
      const steps = Math.max(1, Math.floor(distance / 5))

      for (let i = 0; i < steps; i++) {
        const t = i / steps
        const pos = prev.clone().lerp(worldPos, t)
        const velocity = dir.clone().multiplyScalar(2)
        
        const sideOffset = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar((Math.random() - 0.5) * 8)
        pos.add(sideOffset)
        
        this.emitParticle(pos, velocity)
      }
    }

    if (this.trailPositions.length > length / 10) {
      this.trailPositions.shift()
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      
      p.life -= deltaTime
      
      if (p.life <= 0) {
        p.active = false
        this.particles.splice(i, 1)
        this.emit('particleCountChange', this.particles.length)
        this.emit('needsRender')
        continue
      }

      const lifeRatio = p.life / p.maxLife
      
      p.speedFactor = lifeRatio
      
      const velocity = p.velocity.clone().multiplyScalar(p.speedFactor * deltaTime * 60)
      p.position.add(velocity)
      
      p.size = 0.5 + (p.startSize - 0.5) * lifeRatio
      
      p.color.copy(p.startColor)
      const alpha = lifeRatio
      ;(p.color as any).a = alpha
    }

    if (this.isDrawing && this.lastMousePos) {
      switch (this.currentBrush) {
        case 'spray':
          this.emitSpray(this.lastMousePos, deltaTime)
          break
        case 'vortex':
          this.emitVortex(this.lastMousePos)
          break
        case 'trail':
          this.emitTrail(this.lastMousePos)
          break
      }
    }
  }

  setBrush(type: BrushType, params?: BrushParams): void {
    this.currentBrush = type
    if (params) {
      this.brushParams = { ...this.brushParams, ...params }
    }
    this.trailPositions = []
  }

  getBrush(): { type: BrushType; params: BrushParams } {
    return { type: this.currentBrush, params: { ...this.brushParams } }
  }

  startDrawing(worldPos: THREE.Vector3): void {
    this.isDrawing = true
    this.lastMousePos = worldPos.clone()
    this.trailPositions = [worldPos.clone()]
    this.saveHistory()
  }

  updateDrawing(worldPos: THREE.Vector3): void {
    this.lastMousePos = worldPos.clone()
  }

  stopDrawing(): void {
    this.isDrawing = false
    this.lastMousePos = null
    this.trailPositions = []
    this.sprayTimer = 0
  }

  getParticles(): ParticleData[] {
    return this.particles
  }

  getParticleCount(): number {
    return this.particles.length
  }

  private saveHistory(): void {
    const snapshot = this.particles.map(p => ({
      ...p,
      position: p.position.clone(),
      velocity: p.velocity.clone(),
      color: p.color.clone(),
      startColor: p.startColor.clone()
    }))
    this.history.push(snapshot)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
  }

  undo(): boolean {
    if (this.history.length === 0) return false

    const previousState = this.history.pop()!
    this.particles.forEach(p => { p.active = false })
    this.particles = []

    for (const state of previousState) {
      const poolParticle = this.particlePool.find(p => !p.active)
      if (poolParticle) {
        poolParticle.id = state.id
        poolParticle.position.copy(state.position)
        poolParticle.velocity.copy(state.velocity)
        poolParticle.color.copy(state.color)
        poolParticle.startColor.copy(state.startColor)
        poolParticle.life = state.life
        poolParticle.maxLife = state.maxLife
        poolParticle.size = state.size
        poolParticle.startSize = state.startSize
        poolParticle.speedFactor = state.speedFactor
        poolParticle.active = true
        this.particles.push(poolParticle)
      }
    }

    this.nextId = this.particles.length > 0 
      ? Math.max(...this.particles.map(p => p.id)) + 1 
      : 0

    this.emit('particleCountChange', this.particles.length)
    this.emit('needsRender')
    return true
  }

  clear(): void {
    this.saveHistory()
    this.particles.forEach(p => { p.active = false })
    this.particles = []
    this.nextId = 0
    this.trailPositions = []
    this.emit('particleCountChange', 0)
    this.emit('needsRender')
  }

  canUndo(): boolean {
    return this.history.length > 0
  }

  on(event: EventType, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: EventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback)
  }

  private emit(event: EventType, data?: number): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data))
  }

  exportState(): string {
    const data = this.particles.map(p => ({
      position: [p.position.x, p.position.y, p.position.z],
      velocity: [p.velocity.x, p.velocity.y, p.velocity.z],
      color: `#${p.startColor.getHexString()}`,
      life: p.life,
      maxLife: p.maxLife,
      size: p.size
    }))
    return JSON.stringify(data)
  }
}
