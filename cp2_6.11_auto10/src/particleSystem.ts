import * as THREE from 'three'

export interface ParticleData {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  baseColor: THREE.Color
  size: number
  baseSize: number
  life: number
  maxLife: number
  active: boolean
  isChild: boolean
  rippleTime: number
  targetColor: THREE.Color | null
  scaleMultiplier: number
  bloomPhase: number
  bloomIntensity: number
}

export interface RippleEvent {
  center: THREE.Vector3
  radius: number
  maxRadius: number
  speed: number
  active: boolean
  color: THREE.Color
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
  private ripples: RippleEvent[] = []
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private emotion: string = 'calm'
  private speedMultiplier: number = 1
  private blooming: boolean = false
  private bloomStartTime: number = 0
  private bloomDuration: number = 2
  private dissolving: boolean = false
  private dissolveStartTime: number = 0
  private dissolveDuration: number = 1.5

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
      varying float vAlpha;
      
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = 1.0;
      }
    `

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) {
          discard;
        }
        
        float alpha = smoothstep(0.5, 0.0, dist);
        float glow = smoothstep(0.5, 0.3, dist) * 0.5;
        
        vec3 finalColor = vColor * (1.0 + glow);
        gl_FragColor = vec4(finalColor, alpha * vAlpha);
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
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        baseColor: new THREE.Color(),
        size: 1,
        baseSize: 1,
        life: 0,
        maxLife: 10,
        active: false,
        isChild: false,
        rippleTime: 0,
        targetColor: null,
        scaleMultiplier: 1,
        bloomPhase: Math.random(),
        bloomIntensity: 0
      })
    }

    for (let i = 0; i < this.maxChildParticles; i++) {
      this.childParticles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        baseColor: new THREE.Color(),
        size: 0.5,
        baseSize: 0.5,
        life: 0,
        maxLife: 3,
        active: false,
        isChild: true,
        rippleTime: 0,
        targetColor: null,
        scaleMultiplier: 1,
        bloomPhase: 0,
        bloomIntensity: 0
      })
    }
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

  public startBloom(): void {
    this.blooming = true
    this.bloomStartTime = performance.now() / 1000
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
    this.blooming = false
    this.updateBuffers()
  }

  public spawnParticle(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: THREE.Color,
    size: number,
    life: number,
    isChild: boolean = false
  ): boolean {
    const pool = isChild ? this.childParticles : this.particles
    const maxCount = isChild ? this.maxChildParticles : this.maxParticles

    for (let i = 0; i < maxCount; i++) {
      if (!pool[i].active) {
        const p = pool[i]
        p.position.copy(position)
        p.velocity.copy(velocity)
        p.color.copy(color)
        p.baseColor.copy(color)
        p.size = size
        p.baseSize = size
        p.life = life
        p.maxLife = life
        p.active = true
        p.isChild = isChild
        p.rippleTime = 0
        p.targetColor = null
        p.scaleMultiplier = 1
        p.bloomPhase = Math.random()
        return true
      }
    }
    return false
  }

  public triggerRipple(worldPosition: THREE.Vector3, maxRadius: number = 15): void {
    const color = new THREE.Color()
    color.setHSL(Math.random(), 0.8, 0.6)

    this.ripples.push({
      center: worldPosition.clone(),
      radius: 0,
      maxRadius: maxRadius,
      speed: 20,
      active: true,
      color: color
    })
  }

  public triggerHoverEffect(worldPosition: THREE.Vector3, radius: number = 3): void {
    const allParticles = [...this.particles.filter(p => p.active), ...this.childParticles.filter(p => p.active)]
    
    for (const p of allParticles) {
      const dist = p.position.distanceTo(worldPosition)
      if (dist < radius) {
        const intensity = 1 - dist / radius
        p.scaleMultiplier = 1 + intensity * 0.2
        p.bloomIntensity = intensity
      }
    }
  }

  private explodeParticle(particle: ParticleData): void {
    const childCount = 10
    for (let i = 0; i < childCount; i++) {
      const angle = (i / childCount) * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 2 + Math.random() * 3
      
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(angle) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(angle) * speed
      )

      const childColor = particle.color.clone()
      childColor.lerp(new THREE.Color(0xffffff), 0.5)

      this.spawnParticle(
        particle.position.clone(),
        velocity,
        childColor,
        particle.size * 0.3,
        3,
        true
      )
    }
  }

  public update(delta: number): void {
    const now = performance.now() / 1000

    if (this.blooming) {
      const bloomProgress = (now - this.bloomStartTime) / this.bloomDuration
      if (bloomProgress >= 1) {
        this.blooming = false
      }
    }

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

      ripple.radius += ripple.speed * delta

      const prevRadius = ripple.radius - ripple.speed * delta
      const allParticles = [...this.particles.filter(p => p.active), ...this.childParticles.filter(p => p.active)]

      for (const p of allParticles) {
        const dist = p.position.distanceTo(ripple.center)
        if (dist >= prevRadius && dist <= ripple.radius) {
          const compColor = new THREE.Color(1 - p.baseColor.r, 1 - p.baseColor.g, 1 - p.baseColor.b)
          p.targetColor = compColor
          p.rippleTime = 1.5
        }
      }

      if (ripple.radius >= ripple.maxRadius) {
        ripple.active = false
        this.ripples.splice(i, 1)
      }
    }
  }

  private updateMainParticles(delta: number, now: number): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i]
      if (!p.active) continue

      p.life -= delta

      if (p.life <= 0) {
        this.explodeParticle(p)
        p.active = false
        continue
      }

      p.position.addScaledVector(p.velocity, delta * this.speedMultiplier)

      const lifeRatio = p.life / p.maxLife
      p.color.copy(p.baseColor)
      p.color.lerp(new THREE.Color(0xffffff), 1 - lifeRatio)

      if (p.targetColor && p.rippleTime > 0) {
        p.rippleTime -= delta
        const rippleRatio = Math.min(1, p.rippleTime / 1.5)
        p.color.lerp(p.targetColor, rippleRatio)
        if (p.rippleTime <= 0) {
          p.targetColor = null
        }
      }

      if (p.scaleMultiplier > 1) {
        p.scaleMultiplier = Math.max(1, p.scaleMultiplier - delta * 2)
      }

      if (p.bloomIntensity > 0) {
        p.bloomIntensity = Math.max(0, p.bloomIntensity - delta * 5)
      }

      if (this.dissolving) {
        const dissolveProgress = (now - this.dissolveStartTime) / this.dissolveDuration
        p.position.addScaledVector(p.velocity, delta * 2)
        p.velocity.y -= delta * 5
        p.size = p.baseSize * (1 - dissolveProgress)
      } else if (this.blooming) {
        const bloomProgress = (now - this.bloomStartTime) / this.bloomDuration
        const bloomEase = this.easeInOutCubic(Math.min(1, bloomProgress + p.bloomPhase * 0.3))
        p.size = p.baseSize * bloomEase
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
      p.velocity.multiplyScalar(0.98)

      const lifeRatio = p.life / p.maxLife
      p.color.copy(p.baseColor)
      p.color.lerp(new THREE.Color(0xffffff), 1 - lifeRatio)
      p.size = p.baseSize * lifeRatio
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
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

      const finalSize = p.size * p.scaleMultiplier * (1 + p.bloomIntensity * 0.5)
      this.sizes[i] = finalSize
    }

    const totalCount = this.maxParticles + this.maxChildParticles
    for (let i = allActive.length; i < totalCount; i++) {
      const idx = i * 3
      this.positions[idx] = 0
      this.positions[idx + 1] = -1000
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
