import * as THREE from 'three'

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
  active: boolean
  isChild: boolean
  rippleProgress: number
  rippleTriggered: boolean
  complementaryColor: THREE.Color | null
  scaleMultiplier: number
  spawnProgress: number
  spawnDelay: number
  bloomIntensity: number
}

export interface RippleBFS {
  center: THREE.Vector3
  currentRadius: number
  maxRadius: number
  propagationSpeed: number
  active: boolean
  affectedParticles: Set<number>
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
  private ripples: RippleBFS[] = []
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

  private targetRotationY: number = 0
  private targetRotationX: number = 0
  private currentRotationY: number = 0
  private currentRotationX: number = 0
  private rotationDamping: number = 0.05

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

    const vertexShader = `
      attribute float size;
      varying vec3 vColor;
      
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (350.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `

    const fragmentShader = `
      varying vec3 vColor;
      
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        
        if (dist > 0.5) {
          discard;
        }
        
        float edgeGlow = smoothstep(0.0, 0.5, dist);
        float core = smoothstep(0.5, 0.15, dist);
        float alpha = smoothstep(0.5, 0.0, dist) * 0.95;
        
        vec3 edgeColor = vColor * 1.8;
        vec3 coreColor = vColor * 0.9;
        vec3 finalColor = mix(coreColor, edgeColor, edgeGlow);
        finalColor += vColor * core * 0.3;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {}
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
        active: false,
        isChild: false,
        rippleProgress: 0,
        rippleTriggered: false,
        complementaryColor: null,
        scaleMultiplier: 1,
        spawnProgress: 0,
        spawnDelay: 0,
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
        active: false,
        isChild: true,
        rippleProgress: 0,
        rippleTriggered: false,
        complementaryColor: null,
        scaleMultiplier: 1,
        spawnProgress: 1,
        spawnDelay: 0,
        bloomIntensity: 0
      })
    }
  }

  public setCameraRotation(targetX: number, targetY: number): void {
    this.targetRotationX = targetX
    this.targetRotationY = targetY
  }

  public getParticleCount(): number {
    return this.particles.filter(p => p.active).length
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
    this.particles.forEach(p => {
      p.active = false
      p.life = 0
    })
    this.childParticles.forEach(p => {
      p.active = false
      p.life = 0
    })
    this.ripples = []
    this.dissolving = false
    this.spawning = false
    this.currentRotationX = 0
    this.currentRotationY = 0
    this.targetRotationX = 0
    this.targetRotationY = 0
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
      if (!pool[i].active) {
        const p = pool[i]
        p.targetPosition.copy(position)
        if (isChild) {
          p.position.copy(position)
        } else {
          p.position.set(0, 0, 0)
        }
        p.velocity.copy(velocity)
        p.color.copy(color)
        p.baseColor.copy(color)
        p.size = size
        p.baseSize = size
        p.life = life
        p.maxLife = life
        p.active = true
        p.isChild = isChild
        p.rippleProgress = 0
        p.rippleTriggered = false
        p.complementaryColor = null
        p.scaleMultiplier = 1
        p.spawnProgress = isChild ? 1 : 0
        p.spawnDelay = spawnDelay
        p.bloomIntensity = 0
        return true
      }
    }
    return false
  }

  public triggerRipple(worldPosition: THREE.Vector3, maxRadius: number = 15): void {
    this.ripples.push({
      center: worldPosition.clone(),
      currentRadius: 0,
      maxRadius: maxRadius,
      propagationSpeed: 12,
      active: true,
      affectedParticles: new Set()
    })
  }

  public triggerHoverEffect(worldPosition: THREE.Vector3, radius: number = 3): void {
    const allParticles = [...this.particles.filter(p => p.active && p.spawnProgress >= 1), ...this.childParticles.filter(p => p.active)]
    
    for (const p of allParticles) {
      const dist = p.position.distanceTo(worldPosition)
      if (dist < radius) {
        const intensity = 1 - dist / radius
        p.scaleMultiplier = Math.max(p.scaleMultiplier, 1 + intensity * 0.2)
        p.bloomIntensity = Math.max(p.bloomIntensity, intensity)
      }
    }
  }

  private explodeParticle(particle: ParticleData): void {
    const childCount = 10
    for (let i = 0; i < childCount; i++) {
      const theta = (i / childCount) * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 3 + Math.random() * 4
      
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      )

      const childColor = particle.color.clone()
      childColor.lerp(new THREE.Color(0xffffff), 0.6)

      this.spawnParticle(
        particle.position.clone(),
        velocity,
        childColor,
        particle.baseSize * 0.35,
        3,
        true
      )
    }
  }

  public update(delta: number): void {
    const now = performance.now() / 1000

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.rotationDamping
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.rotationDamping

    if (this.dissolving) {
      const dissolveProgress = (now - this.dissolveStartTime) / this.dissolveDuration
      if (dissolveProgress >= 1) {
        this.dissolving = false
        this.reset()
        return
      }
    }

    this.updateRipples(delta)
    this.updateMainParticles(delta, now)
    this.updateChildParticles(delta)
    this.updateBuffers()
  }

  private updateRipples(delta: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i]
      if (!ripple.active) continue

      const prevRadius = ripple.currentRadius
      ripple.currentRadius += ripple.propagationSpeed * delta

      const activeParticles = this.particles.filter(p => p.active && p.spawnProgress >= 1)
      
      for (let idx = 0; idx < activeParticles.length; idx++) {
        const p = activeParticles[idx]
        const globalIdx = this.particles.indexOf(p)
        
        if (ripple.affectedParticles.has(globalIdx)) continue

        const dist = p.position.distanceTo(ripple.center)
        if (dist >= prevRadius && dist <= ripple.currentRadius) {
          ripple.affectedParticles.add(globalIdx)
          const compColor = new THREE.Color(
            1 - p.baseColor.r,
            1 - p.baseColor.g,
            1 - p.baseColor.b
          )
          p.complementaryColor = compColor
          p.rippleProgress = 1.5
          p.rippleTriggered = true
        }
      }

      if (ripple.currentRadius >= ripple.maxRadius) {
        ripple.active = false
        this.ripples.splice(i, 1)
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private updateMainParticles(delta: number, now: number): void {
    let globalSpawnProgress = 0
    if (this.spawning) {
      globalSpawnProgress = Math.min(1, (now - this.spawnStartTime) / this.spawnDuration)
      if (globalSpawnProgress >= 1) {
        this.spawning = false
      }
    }

    const cosRX = Math.cos(this.currentRotationX)
    const sinRX = Math.sin(this.currentRotationX)
    const cosRY = Math.cos(this.currentRotationY)
    const sinRY = Math.sin(this.currentRotationY)

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i]
      if (!p.active) continue

      if (!p.isChild && p.spawnProgress < 1) {
        const effectiveProgress = Math.max(0, globalSpawnProgress - p.spawnDelay)
        p.spawnProgress = Math.min(1, effectiveProgress)
      }

      p.life -= delta

      if (p.life <= 0 && p.spawnProgress >= 1 && !this.dissolving) {
        this.explodeParticle(p)
        p.active = false
        continue
      }

      let baseX: number, baseY: number, baseZ: number

      if (this.dissolving) {
        p.position.addScaledVector(p.velocity, delta * 3)
        p.velocity.y -= delta * 8
        p.velocity.multiplyScalar(0.99)
        baseX = p.position.x
        baseY = p.position.y
        baseZ = p.position.z
        const dissolveProgress = (now - this.dissolveStartTime) / this.dissolveDuration
        p.size = p.baseSize * (1 - this.easeInOutCubic(dissolveProgress))
      } else if (!p.isChild && p.spawnProgress < 1) {
        const easedSpawn = this.easeInOutCubic(p.spawnProgress)
        const origin = new THREE.Vector3(0, 0, 0)
        baseX = origin.x + (p.targetPosition.x - origin.x) * easedSpawn
        baseY = origin.y + (p.targetPosition.y - origin.y) * easedSpawn
        baseZ = origin.z + (p.targetPosition.z - origin.z) * easedSpawn
        p.size = p.baseSize * easedSpawn
      } else {
        p.position.addScaledVector(p.velocity, delta * this.speedMultiplier)
        const dx = p.targetPosition.x - p.position.x
        const dy = p.targetPosition.y - p.position.y
        const dz = p.targetPosition.z - p.position.z
        p.position.x += dx * 0.02
        p.position.y += dy * 0.02
        p.position.z += dz * 0.02
        baseX = p.position.x
        baseY = p.position.y
        baseZ = p.position.z
      }

      const lifeRatio = Math.max(0, Math.min(1, p.life / p.maxLife))
      p.color.copy(p.baseColor)
      p.color.lerp(new THREE.Color(0xffffff), (1 - lifeRatio) * 0.85)

      if (p.rippleTriggered && p.rippleProgress > 0 && p.complementaryColor) {
        p.rippleProgress -= delta
        const rippleRatio = Math.min(1, Math.max(0, p.rippleProgress / 1.5))
        const transitionEase = this.easeInOutCubic(rippleRatio)
        p.color.lerp(p.complementaryColor, transitionEase)
        if (p.rippleProgress <= 0) {
          p.rippleTriggered = false
          p.complementaryColor = null
        }
      }

      if (p.scaleMultiplier > 1) {
        p.scaleMultiplier = Math.max(1, p.scaleMultiplier - delta * 5)
      }

      if (p.bloomIntensity > 0) {
        p.bloomIntensity = Math.max(0, p.bloomIntensity - delta * 5)
      }

      if (!this.dissolving && (p.isChild || p.spawnProgress >= 1)) {
        const cx = baseX
        const cy = baseY - 2
        const cz = baseZ
        const rx = cx * cosRY + cz * sinRY
        const rz = -cx * sinRY + cz * cosRY
        const ry = cy * cosRX - rz * sinRX
        const finalZ = cy * sinRX + rz * cosRX
        p.position.x = rx
        p.position.y = ry + 2
        p.position.z = finalZ
      } else {
        p.position.x = baseX
        p.position.y = baseY
        p.position.z = baseZ
      }
    }
  }

  private updateChildParticles(delta: number): void {
    for (let i = 0; i < this.maxChildParticles; i++) {
      const p = this.childParticles[i]
      if (!p.active) continue

      p.life -= delta

      if (p.life <= 0) {
        p.active = false
        continue
      }

      p.position.addScaledVector(p.velocity, delta)
      p.velocity.multiplyScalar(0.97)
      p.velocity.y -= delta * 2

      const lifeRatio = Math.max(0, p.life / p.maxLife)
      p.color.copy(p.baseColor)
      p.color.lerp(new THREE.Color(0xffffff), (1 - lifeRatio) * 0.7)
      p.size = p.baseSize * this.easeInOutCubic(lifeRatio)

      if (p.rippleTriggered && p.rippleProgress > 0 && p.complementaryColor) {
        p.rippleProgress -= delta
        const rippleRatio = Math.min(1, Math.max(0, p.rippleProgress / 1.5))
        p.color.lerp(p.complementaryColor, this.easeInOutCubic(rippleRatio))
        if (p.rippleProgress <= 0) {
          p.rippleTriggered = false
          p.complementaryColor = null
        }
      }
    }
  }

  private updateBuffers(): void {
    const activeMain = this.particles.filter(p => p.active)
    const activeChild = this.childParticles.filter(p => p.active)
    const allActive = [...activeMain, ...activeChild]

    for (let i = 0; i < allActive.length; i++) {
      const p = allActive[i]
      const idx = i * 3

      this.positions[idx] = p.position.x
      this.positions[idx + 1] = p.position.y
      this.positions[idx + 2] = p.position.z

      this.colors[idx] = p.color.r
      this.colors[idx + 1] = p.color.g
      this.colors[idx + 2] = p.color.b

      const bloomBoost = 1 + p.bloomIntensity * 0.8
      const finalSize = p.size * p.scaleMultiplier * bloomBoost
      this.sizes[i] = finalSize
    }

    const totalCount = this.maxParticles + this.maxChildParticles
    for (let i = allActive.length; i < totalCount; i++) {
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
    const activeParticles = this.particles.filter(p => p.active)
    return {
      particles: activeParticles.map(p => ({
        position: { x: p.position.x, y: p.position.y, z: p.position.z },
        color: { r: p.color.r, g: p.color.g, b: p.color.b },
        size: p.size,
        life: p.life,
        maxLife: p.maxLife
      })),
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
