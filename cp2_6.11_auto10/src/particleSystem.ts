import * as THREE from 'three'

export type ParticleState = 'inactive' | 'spawning' | 'alive' | 'exploding' | 'dead'

export interface ParticleData {
  position: THREE.Vector3
  targetPosition: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  baseColor: THREE.Color
  size: number
  baseSize: number
  life: number
  maxLife: number
  state: ParticleState
  isChild: boolean
  rippleTime: number
  rippleColor: THREE.Color | null
  scaleMultiplier: number
  spawnDelay: number
  spawnProgress: number
  bloomIntensity: number
}

export interface BFSRipple {
  active: boolean
  cellSize: number
  visited: Set<string>
  currentFront: Array<{ cx: number; cy: number; cz: number }>
  nextFront: Array<{ cx: number; cy: number; cz: number }>
  maxRadius: number
  origin: THREE.Vector3
  cellsPerFrame: number
}

export interface GardenState {
  particles: Array<{
    position: { x: number; y: number; z: number }
    color: { r: number; g: number; b: number }
    size: number
    life: number
    maxLife: number
  }>
  emotion: string
  timestamp: number
}

export class ParticleSystem {
  private scene: THREE.Scene
  private particles: ParticleData[] = []
  private childParticles: ParticleData[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private points: THREE.Points
  private maxParticles: number = 5000
  private maxChildParticles: number = 5000
  private bfsRipples: BFSRipple[] = []
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private emotion: string = 'calm'
  private speedMultiplier: number = 1
  private spawning: boolean = false
  private spawnStartTime: number = 0
  private spawnDuration: number = 2
  private dissolving: boolean = false
  private dissolveStartTime: number = 0
  private dissolveDuration: number = 1.5

  private targetRotX: number = 0
  private targetRotY: number = 0
  private curRotX: number = 0
  private curRotY: number = 0
  private rotVelX: number = 0
  private rotVelY: number = 0
  private springK: number = 25
  private damping: number = 6

  constructor(scene: THREE.Scene, maxParticles: number = 5000) {
    this.scene = scene
    this.maxParticles = maxParticles
    this.maxChildParticles = maxParticles

    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array((this.maxParticles + this.maxChildParticles) * 3)
    this.colors = new Float32Array((this.maxParticles + this.maxChildParticles) * 3)
    this.sizes = new Float32Array(this.maxParticles + this.maxChildParticles)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)

    this.initParticlePool()
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        targetPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        baseColor: new THREE.Color(),
        size: 1,
        baseSize: 1,
        life: 0,
        maxLife: 10,
        state: 'inactive',
        isChild: false,
        rippleTime: 0,
        rippleColor: null,
        scaleMultiplier: 1,
        spawnDelay: 0,
        spawnProgress: 0,
        bloomIntensity: 0
      })
    }

    for (let i = 0; i < this.maxChildParticles; i++) {
      this.childParticles.push({
        position: new THREE.Vector3(),
        targetPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        baseColor: new THREE.Color(),
        size: 0.5,
        baseSize: 0.5,
        life: 0,
        maxLife: 3,
        state: 'inactive',
        isChild: true,
        rippleTime: 0,
        rippleColor: null,
        scaleMultiplier: 1,
        spawnDelay: 0,
        spawnProgress: 1,
        bloomIntensity: 0
      })
    }
  }

  public setCameraRotation(targetX: number, targetY: number): void {
    this.targetRotX = targetX
    this.targetRotY = targetY
  }

  public getEmotion(): string {
    return this.emotion
  }

  public setEmotion(emotion: string): void {
    this.emotion = emotion
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(3, multiplier))
  }

  public startSpawn(): void {
    this.spawning = true
    this.spawnStartTime = performance.now() / 1000
  }

  public startDissolve(): void {
    this.dissolving = true
    this.dissolveStartTime = performance.now() / 1000
  }

  public isDissolving(): boolean {
    return this.dissolving
  }

  public reset(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i].state = 'inactive'
      this.particles[i].life = 0
    }
    for (let i = 0; i < this.maxChildParticles; i++) {
      this.childParticles[i].state = 'inactive'
      this.childParticles[i].life = 0
    }
    this.bfsRipples = []
    this.dissolving = false
    this.spawning = false
    this.curRotX = 0
    this.curRotY = 0
    this.targetRotX = 0
    this.targetRotY = 0
    this.rotVelX = 0
    this.rotVelY = 0
    this.updateBuffers()
  }

  public spawnParticle(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: THREE.Color,
    size: number,
    life: number,
    isChild: boolean = false,
    spawnDelay: number = 0
  ): boolean {
    const pool = isChild ? this.childParticles : this.particles
    const maxCount = isChild ? this.maxChildParticles : this.maxParticles

    for (let i = 0; i < maxCount; i++) {
      if (pool[i].state === 'inactive') {
        const p = pool[i]
        p.targetPosition.copy(position)
        if (isChild) {
          p.position.copy(position)
          p.state = 'alive'
          p.spawnProgress = 1
        } else {
          p.position.set(0, 0, 0)
          p.state = 'spawning'
          p.spawnProgress = 0
        }
        p.velocity.copy(velocity)
        p.color.copy(color)
        p.baseColor.copy(color)
        p.size = size
        p.baseSize = Math.max(0.5, Math.min(3, size))
        p.life = life
        p.maxLife = life
        p.isChild = isChild
        p.rippleTime = 0
        p.rippleColor = null
        p.scaleMultiplier = 1
        p.spawnDelay = spawnDelay
        p.bloomIntensity = 0
        return true
      }
    }
    return false
  }

  public triggerRipple(worldPosition: THREE.Vector3, maxRadius: number = 15): void {
    const cellSize = 1.5
    const origin = worldPosition
    const cx = Math.floor(origin.x / cellSize)
    const cy = Math.floor(origin.y / cellSize)
    const cz = Math.floor(origin.z / cellSize)

    this.bfsRipples.push({
      active: true,
      cellSize,
      visited: new Set([`${cx},${cy},${cz}`]),
      currentFront: [{ cx, cy, cz }],
      nextFront: [],
      maxRadius,
      origin: origin.clone(),
      cellsPerFrame: 30
    })
  }

  public triggerHoverEffect(worldPosition: THREE.Vector3, radius: number = 3): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i]
      if (p.state !== 'alive' && p.state !== 'spawning') continue
      if (p.spawnProgress < 1) continue
      const dist = p.position.distanceTo(worldPosition)
      if (dist < radius) {
        const intensity = 1 - dist / radius
        p.scaleMultiplier = Math.max(p.scaleMultiplier, 1 + intensity * 0.2)
        p.bloomIntensity = Math.max(p.bloomIntensity, intensity)
      }
    }
    for (let i = 0; i < this.maxChildParticles; i++) {
      const p = this.childParticles[i]
      if (p.state !== 'alive') continue
      const dist = p.position.distanceTo(worldPosition)
      if (dist < radius) {
        const intensity = 1 - dist / radius
        p.scaleMultiplier = Math.max(p.scaleMultiplier, 1 + intensity * 0.2)
        p.bloomIntensity = Math.max(p.bloomIntensity, intensity)
      }
    }
  }

  private explodeParticle(p: ParticleData): void {
    const childCount = 10
    for (let i = 0; i < childCount; i++) {
      const theta = (i / childCount) * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 4 + Math.random() * 5
      
      const vx = Math.sin(phi) * Math.cos(theta) * speed
      const vy = Math.sin(phi) * Math.sin(theta) * speed
      const vz = Math.cos(phi) * speed

      const velocity = new THREE.Vector3(vx, vy, vz)
      const childColor = p.color.clone()
      childColor.lerp(new THREE.Color(0xffffff), 0.7)

      this.spawnParticle(
        p.position.clone(),
        velocity,
        childColor,
        p.baseSize * 0.35,
        3,
        true
      )
    }
  }

  public update(delta: number): void {
    const now = performance.now() / 1000
    const dt = Math.min(delta, 0.05)

    this.updateSpringRotation(dt)

    if (this.dissolving) {
      const progress = (now - this.dissolveStartTime) / this.dissolveDuration
      if (progress >= 1) {
        this.dissolving = false
        this.reset()
        return
      }
    }

    this.updateBFSRipples(dt)
    this.updateMainParticles(dt, now)
    this.updateChildParticles(dt)
    this.updateBuffers()
  }

  private updateSpringRotation(dt: number): void {
    const ax = (this.targetRotX - this.curRotX) * this.springK
    const ay = (this.targetRotY - this.curRotY) * this.springK

    this.rotVelX += ax * dt
    this.rotVelY += ay * dt

    this.rotVelX *= (1 - this.damping * dt)
    this.rotVelY *= (1 - this.damping * dt)

    this.curRotX += this.rotVelX * dt
    this.curRotY += this.rotVelY * dt
  }

  private updateBFSRipples(dt: number): void {
    for (let r = this.bfsRipples.length - 1; r >= 0; r--) {
      const ripple = this.bfsRipples[r]
      if (!ripple.active) continue

      let processed = 0
      const cs = ripple.cellSize

      while (processed < ripple.cellsPerFrame && ripple.currentFront.length > 0) {
        const cell = ripple.currentFront.shift()!
        processed++

        for (let i = 0; i < this.maxParticles; i++) {
          const p = this.particles[i]
          if (p.state !== 'alive') continue
          if (p.spawnProgress < 1) continue
          const pcx = Math.floor(p.position.x / cs)
          const pcy = Math.floor(p.position.y / cs)
          const pcz = Math.floor(p.position.z / cs)
          if (pcx === cell.cx && pcy === cell.cy && pcz === cell.cz) {
            if (p.rippleTime <= 0) {
              const comp = new THREE.Color(
                1 - p.baseColor.r,
                1 - p.baseColor.g,
                1 - p.baseColor.b
              )
              p.rippleColor = comp
              p.rippleTime = 1.5
            }
          }
        }

        const dirs = [
          [1, 0, 0], [-1, 0, 0],
          [0, 1, 0], [0, -1, 0],
          [0, 0, 1], [0, 0, -1]
        ]
        for (const d of dirs) {
          const nx = cell.cx + d[0]
          const ny = cell.cy + d[1]
          const nz = cell.cz + d[2]
          const key = `${nx},${ny},${nz}`
          if (!ripple.visited.has(key)) {
            const cellCenter = new THREE.Vector3(
              (nx + 0.5) * cs,
              (ny + 0.5) * cs,
              (nz + 0.5) * cs
            )
            if (cellCenter.distanceTo(ripple.origin) <= ripple.maxRadius) {
              ripple.visited.add(key)
              ripple.nextFront.push({ cx: nx, cy: ny, cz: nz })
            }
          }
        }
      }

      if (ripple.currentFront.length === 0) {
        if (ripple.nextFront.length === 0) {
          ripple.active = false
          this.bfsRipples.splice(r, 1)
        } else {
          ripple.currentFront = ripple.nextFront
          ripple.nextFront = []
        }
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private updateMainParticles(dt: number, now: number): void {
    let globalSpawnProgress = 0
    if (this.spawning) {
      globalSpawnProgress = Math.min(1, (now - this.spawnStartTime) / this.spawnDuration)
      if (globalSpawnProgress >= 1) {
        this.spawning = false
      }
    }

    const cosRX = Math.cos(this.curRotX)
    const sinRX = Math.sin(this.curRotX)
    const cosRY = Math.cos(this.curRotY)
    const sinRY = Math.sin(this.curRotY)

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i]
      if (p.state === 'inactive') continue

      if (p.state === 'spawning') {
        const effectiveProgress = Math.max(0, globalSpawnProgress - p.spawnDelay)
        p.spawnProgress = Math.min(1, effectiveProgress)
        if (p.spawnProgress >= 1) {
          p.state = 'alive'
        }
      }

      if (p.state === 'alive') {
        p.life -= dt
        if (p.life <= 0) {
          p.state = 'exploding'
          this.explodeParticle(p)
          p.state = 'inactive'
          continue
        }
      }

      let bx: number, by: number, bz: number

      if (this.dissolving) {
        p.position.addScaledVector(p.velocity, dt * 3)
        p.velocity.y -= dt * 8
        p.velocity.multiplyScalar(0.99)
        bx = p.position.x
        by = p.position.y
        bz = p.position.z
        const dp = (now - this.dissolveStartTime) / this.dissolveDuration
        p.size = p.baseSize * (1 - this.easeInOutCubic(dp))
      } else if (p.state === 'spawning') {
        const es = this.easeInOutCubic(p.spawnProgress)
        bx = p.targetPosition.x * es
        by = p.targetPosition.y * es
        bz = p.targetPosition.z * es
        p.size = p.baseSize * es
      } else {
        p.position.addScaledVector(p.velocity, dt * this.speedMultiplier)
        const dx = p.targetPosition.x - p.position.x
        const dy = p.targetPosition.y - p.position.y
        const dz = p.targetPosition.z - p.position.z
        p.position.x += dx * 0.015
        p.position.y += dy * 0.015
        p.position.z += dz * 0.015
        bx = p.position.x
        by = p.position.y
        bz = p.position.z
      }

      const lifeRatio = p.state === 'alive' 
        ? Math.max(0, Math.min(1, p.life / p.maxLife)) 
        : 1
      p.color.copy(p.baseColor)
      if (p.state === 'alive') {
        p.color.lerp(new THREE.Color(0xffffff), (1 - lifeRatio) * 0.9)
      }

      if (p.rippleColor && p.rippleTime > 0) {
        p.rippleTime -= dt
        const rr = Math.min(1, Math.max(0, p.rippleTime / 1.5))
        const te = this.easeInOutCubic(rr)
        p.color.lerp(p.rippleColor, te)
        if (p.rippleTime <= 0) {
          p.rippleColor = null
        }
      }

      if (p.scaleMultiplier > 1) {
        p.scaleMultiplier = Math.max(1, p.scaleMultiplier - dt * 5)
      }
      if (p.bloomIntensity > 0) {
        p.bloomIntensity = Math.max(0, p.bloomIntensity - dt * 5)
      }

      if (!this.dissolving && (p.isChild || p.spawnProgress >= 1)) {
        const cx = bx
        const cy = by - 2
        const cz = bz
        const rx = cx * cosRY + cz * sinRY
        const rz = -cx * sinRY + cz * cosRY
        const ry = cy * cosRX - rz * sinRX
        const fz = cy * sinRX + rz * cosRX
        p.position.x = rx
        p.position.y = ry + 2
        p.position.z = fz
      } else {
        p.position.x = bx
        p.position.y = by
        p.position.z = bz
      }
    }
  }

  private updateChildParticles(dt: number): void {
    for (let i = 0; i < this.maxChildParticles; i++) {
      const p = this.childParticles[i]
      if (p.state !== 'alive') continue

      p.life -= dt
      if (p.life <= 0) {
        p.state = 'inactive'
        continue
      }

      p.position.addScaledVector(p.velocity, dt)
      p.velocity.multiplyScalar(0.97)
      p.velocity.y -= dt * 2

      const lifeRatio = Math.max(0, p.life / p.maxLife)
      p.color.copy(p.baseColor)
      p.color.lerp(new THREE.Color(0xffffff), (1 - lifeRatio) * 0.8)
      p.size = p.baseSize * this.easeInOutCubic(lifeRatio)

      if (p.rippleColor && p.rippleTime > 0) {
        p.rippleTime -= dt
        const rr = Math.min(1, Math.max(0, p.rippleTime / 1.5))
        p.color.lerp(p.rippleColor, this.easeInOutCubic(rr))
        if (p.rippleTime <= 0) {
          p.rippleColor = null
        }
      }
    }
  }

  private updateBuffers(): void {
    let writeIdx = 0

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i]
      if (p.state === 'inactive') continue
      if (!this.dissolving && p.state !== 'alive' && p.spawnProgress < 0.01) continue

      const idx = writeIdx * 3
      this.positions[idx] = p.position.x
      this.positions[idx + 1] = p.position.y
      this.positions[idx + 2] = p.position.z
      this.colors[idx] = p.color.r
      this.colors[idx + 1] = p.color.g
      this.colors[idx + 2] = p.color.b
      const bloom = 1 + p.bloomIntensity * 0.8
      this.sizes[writeIdx] = Math.max(0.5, Math.min(3, p.size * p.scaleMultiplier * bloom))
      writeIdx++
    }

    for (let i = 0; i < this.maxChildParticles; i++) {
      const p = this.childParticles[i]
      if (p.state !== 'alive') continue

      const idx = writeIdx * 3
      this.positions[idx] = p.position.x
      this.positions[idx + 1] = p.position.y
      this.positions[idx + 2] = p.position.z
      this.colors[idx] = p.color.r
      this.colors[idx + 1] = p.color.g
      this.colors[idx + 2] = p.color.b
      this.sizes[writeIdx] = Math.max(0.5, Math.min(3, p.size))
      writeIdx++
    }

    const totalCount = this.maxParticles + this.maxChildParticles
    for (let i = writeIdx; i < totalCount; i++) {
      const idx = i * 3
      this.positions[idx] = 0
      this.positions[idx + 1] = -10000
      this.positions[idx + 2] = 0
      this.colors[idx] = 0
      this.colors[idx + 1] = 0
      this.colors[idx + 2] = 0
      this.sizes[i] = 0
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.computeBoundingSphere()
  }

  public getState(): GardenState {
    const result: GardenState['particles'] = []
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i]
      if (p.state === 'alive' || p.state === 'spawning') {
        result.push({
          position: { x: p.position.x, y: p.position.y, z: p.position.z },
          color: { r: p.color.r, g: p.color.g, b: p.color.b },
          size: p.size,
          life: p.life,
          maxLife: p.maxLife
        })
      }
    }
    return {
      particles: result,
      emotion: this.emotion,
      timestamp: Date.now()
    }
  }

  public getPoints(): THREE.Points {
    return this.points
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.scene.remove(this.points)
  }
}
