import * as THREE from 'three'
import {
  generateFlowerParticles,
  randomFlowerColor,
  greenBudColor,
  goldColor,
  hslToColor,
  lerp,
  lerpColor,
  easeInOutCubic,
  randomRange,
  smoothstep
} from './particleUtils'

interface FlowerParticle {
  offset: THREE.Vector3
  size: number
  petalIndex: number
  petalT: number
  color: THREE.Color
}

interface BurstParticle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  age: number
  life: number
  size: number
}

const BREATH_FREQ = 0.3
const BREATH_MIN = 0.95
const BREATH_MAX = 1.05

export class Flower {
  id: number
  position: THREE.Vector3
  particles: FlowerParticle[]
  baseParticleCount: number
  particleCount: number
  targetColor: THREE.Color
  currentColor: THREE.Color
  scale: number
  baseScale: number
  breathPhase: number
  active: boolean
  isBud: boolean
  bloomTimer: number
  bloomDuration: number
  attractRadius: number
  attractStrength: number
  isBursting: boolean
  burstTimer: number
  burstDuration: number
  burstParticles: BurstParticle[]
  isDimming: boolean
  dimTimer: number
  dimDuration: number
  dimOpacity: number
  sizeMultiplier: number
  enhanced: boolean
  attractionCount: number

  constructor(id: number, position: THREE.Vector3, isBud = false, particleCount = 60) {
    this.id = id
    this.position = position.clone()
    this.baseParticleCount = particleCount
    this.particleCount = particleCount
    this.targetColor = randomFlowerColor()
    this.currentColor = isBud ? greenBudColor().clone() : this.targetColor.clone()
    this.scale = 1.0
    this.baseScale = 1.0
    this.breathPhase = Math.random() * Math.PI * 2
    this.active = true
    this.isBud = isBud
    this.bloomTimer = 0
    this.bloomDuration = 3.0
    this.attractRadius = 2.5
    this.attractStrength = 1.0
    this.isBursting = false
    this.burstTimer = 0
    this.burstDuration = 1.0
    this.burstParticles = []
    this.isDimming = false
    this.dimTimer = 0
    this.dimDuration = 0.5
    this.dimOpacity = 1.0
    this.sizeMultiplier = 1.0
    this.enhanced = false
    this.attractionCount = 0

    const actualCount = isBud ? 30 : Math.floor(randomRange(50, 80))
    this.particleCount = Math.min(actualCount, particleCount)
    const rawParticles = generateFlowerParticles(Math.max(30, this.particleCount))
    this.particles = []
    for (let i = 0; i < Math.min(this.particleCount, rawParticles.length); i++) {
      const rp = rawParticles[i]
      this.particles.push({
        offset: rp.offset.clone(),
        size: rp.size,
        petalIndex: rp.petalIndex,
        petalT: rp.petalT,
        color: isBud ? greenBudColor().clone() : this.targetColor.clone()
      })
    }

    if (isBud) {
      for (const p of this.particles) {
        p.offset.multiplyScalar(0.2)
      }
    }
  }

  setParticleCount(count: number) {
    const targetCount = Math.min(count, this.baseParticleCount)
    if (targetCount !== this.particleCount) {
      this.particleCount = targetCount
      const rawParticles = generateFlowerParticles(Math.max(30, this.baseParticleCount))
      this.particles = []
      for (let i = 0; i < Math.min(targetCount, rawParticles.length); i++) {
        const rp = rawParticles[i]
        this.particles.push({
          offset: rp.offset.clone(),
          size: rp.size,
          petalIndex: rp.petalIndex,
          petalT: rp.petalT,
          color: this.currentColor.clone()
        })
      }
      if (this.isBud) {
        for (const p of this.particles) {
          p.offset.multiplyScalar(0.2)
        }
      }
    }
  }

  bloom() {
    if (!this.isBud) return
    this.bloomTimer = 0.0001
  }

  attractButterfly() {
    this.attractionCount++
    this.attractStrength = Math.min(2.0, 1.0 + this.attractionCount * 0.1)
    this.attractRadius = Math.min(4.0, 2.5 + this.attractionCount * 0.1)
  }

  onClick() {
    if (this.isBud) {
      this.bloom()
      return { burst: false, bloom: true }
    }
    this.isDimming = true
    this.dimTimer = 0
    this.dimOpacity = 1.0
    this.startBurst()
    return { burst: true, bloom: false }
  }

  startBurst() {
    this.isBursting = true
    this.burstTimer = 0
    this.burstParticles = []
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(angle),
        Math.sin(phi) * Math.sin(angle),
        Math.cos(phi)
      )
      this.burstParticles.push({
        position: this.position.clone(),
        velocity: dir.multiplyScalar(randomRange(1.5, 2.5)),
        age: 0,
        life: this.burstDuration,
        size: randomRange(0.05, 0.15)
      })
    }
  }

  update(deltaTime: number) {
    this.breathPhase += deltaTime * BREATH_FREQ * Math.PI * 2
    const breathT = Math.sin(this.breathPhase) * 0.5 + 0.5
    const breathScale = lerp(BREATH_MIN, BREATH_MAX, breathT)
    this.scale = this.baseScale * breathScale * this.sizeMultiplier

    if (this.isBud && this.bloomTimer > 0) {
      this.bloomTimer += deltaTime
      const t = Math.min(this.bloomTimer / this.bloomDuration, 1)
      const eT = easeInOutCubic(t)
      const green = greenBudColor()
      this.currentColor = lerpColor(green, this.targetColor, eT)
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i]
        const rawParticles = generateFlowerParticles(Math.max(30, this.particleCount))
        if (i < rawParticles.length) {
          const targetOffset = rawParticles[i].offset
          p.offset.lerp(targetOffset, deltaTime * 2)
        }
        p.color.copy(lerpColor(green, this.targetColor, eT))
      }
      this.baseScale = lerp(0.3, 1.0, eT)
      if (t >= 1) {
        this.isBud = false
        this.bloomTimer = 0
        this.active = true
        this.attractRadius = 2.5
      }
    } else if (!this.isBud) {
      for (const p of this.particles) {
        p.color.lerp(this.targetColor, deltaTime * 2)
      }
    }

    if (this.isDimming) {
      this.dimTimer += deltaTime
      const t = this.dimTimer / this.dimDuration
      if (t < 1) {
        this.dimOpacity = lerp(1.0, 0.1, t)
      } else if (t < 2) {
        this.dimOpacity = lerp(0.1, 1.0, t - 1)
        if (!this.enhanced && t > 1.5) {
          this.sizeMultiplier = 1.1
          this.enhanced = true
        }
      } else {
        this.isDimming = false
        this.dimOpacity = 1.0
      }
    }

    if (this.isBursting) {
      this.burstTimer += deltaTime
      for (const bp of this.burstParticles) {
        bp.age += deltaTime
        bp.position.add(bp.velocity.clone().multiplyScalar(deltaTime))
      }
      if (this.burstTimer > this.burstDuration) {
        this.isBursting = false
        this.burstParticles = []
      }
    }
  }

  getParticles(): {
    positions: Float32Array
    colors: Float32Array
    sizes: Float32Array
    opacities: Float32Array
  } {
    const burstCount = this.burstParticles.length
    const totalCount = this.particles.length + burstCount
    const positions = new Float32Array(totalCount * 3)
    const colors = new Float32Array(totalCount * 3)
    const sizes = new Float32Array(totalCount)
    const opacities = new Float32Array(totalCount)

    let idx = 0

    for (const p of this.particles) {
      const worldPos = this.position.clone().add(
        p.offset.clone().multiplyScalar(this.scale)
      )
      positions[idx * 3] = worldPos.x
      positions[idx * 3 + 1] = worldPos.y
      positions[idx * 3 + 2] = worldPos.z
      colors[idx * 3] = p.color.r
      colors[idx * 3 + 1] = p.color.g
      colors[idx * 3 + 2] = p.color.b
      sizes[idx] = p.size * this.scale
      if (this.isBud && this.bloomTimer > 0) {
        const t = this.bloomTimer / this.bloomDuration
        const appearT = (this.particles.indexOf(p) / this.particles.length) * 0.6
        opacities[idx] = smoothstep(appearT, appearT + 0.3, t)
      } else {
        opacities[idx] = this.isDimming ? this.dimOpacity : 1.0
      }
      idx++
    }

    const gold = goldColor()
    for (const bp of this.burstParticles) {
      const lifeT = 1 - bp.age / bp.life
      const burstProgress = bp.age / bp.life
      const radius = lerp(0.5, 2.0, burstProgress)
      positions[idx * 3] = bp.position.x
      positions[idx * 3 + 1] = bp.position.y
      positions[idx * 3 + 2] = bp.position.z
      colors[idx * 3] = gold.r
      colors[idx * 3 + 1] = gold.g
      colors[idx * 3 + 2] = gold.b
      sizes[idx] = bp.size * lifeT
      opacities[idx] = lifeT
      idx++
    }

    return { positions, colors, sizes, opacities }
  }
}
