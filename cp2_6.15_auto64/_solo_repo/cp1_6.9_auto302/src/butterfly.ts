import * as THREE from 'three'
import {
  randomButterflyColor,
  easeInOutCubic,
  generateWingParticles,
  lerp,
  lerpColor,
  randomRange,
  clamp
} from './particleUtils'

interface TrailPoint {
  position: THREE.Vector3
  age: number
}

interface WingParticle {
  base: THREE.Vector2
  size: number
}

const WING_ANGLE_MIN = -30 * Math.PI / 180
const WING_ANGLE_MAX = 45 * Math.PI / 180
const WING_FREQ = 2
const SPHERE_RADIUS = 7.5

export class Butterfly {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  direction: THREE.Vector3
  primaryColor: THREE.Color
  whiteColor: THREE.Color
  wingParticlesLeft: WingParticle[]
  wingParticlesRight: WingParticle[]
  trail: TrailPoint[]
  wingAngle: number
  wingPhase: number
  wingShakeTimer: number
  wingShakeActive: boolean
  targetPosition: THREE.Vector3 | null
  flyingToTarget: boolean
  speed: number
  wanderTimer: number
  wanderDirection: THREE.Vector3
  nextWanderChange: number
  isAttractedFlower: THREE.Vector3 | null
  attractTimer: number
  attractPhase: number
  headSize: number
  wingParticleCount: number

  constructor(id: number, position: THREE.Vector3, wingParticleCount = 15) {
    this.id = id
    this.position = position.clone()
    this.velocity = new THREE.Vector3()
    this.direction = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize()
    this.primaryColor = randomButterflyColor()
    this.whiteColor = new THREE.Color(1, 1, 1)
    this.wingParticleCount = wingParticleCount
    this.wingParticlesLeft = generateWingParticles(wingParticleCount, true)
    this.wingParticlesRight = generateWingParticles(wingParticleCount, false)
    this.trail = []
    this.wingAngle = WING_ANGLE_MIN
    this.wingPhase = Math.random() * Math.PI * 2
    this.wingShakeTimer = 0
    this.wingShakeActive = false
    this.targetPosition = null
    this.flyingToTarget = false
    this.speed = randomRange(0.8, 1.5)
    this.wanderTimer = 0
    this.wanderDirection = this.direction.clone()
    this.nextWanderChange = randomRange(1.0, 2.5)
    this.isAttractedFlower = null
    this.attractTimer = 0
    this.attractPhase = 0
    this.headSize = 0.3
  }

  setWingParticleCount(count: number) {
    if (count !== this.wingParticleCount) {
      this.wingParticleCount = count
      this.wingParticlesLeft = generateWingParticles(count, true)
      this.wingParticlesRight = generateWingParticles(count, false)
    }
  }

  onClick(targetPos: THREE.Vector3) {
    this.targetPosition = targetPos.clone()
    this.flyingToTarget = true
    this.isAttractedFlower = null
    this.triggerWingShake()
  }

  triggerWingShake() {
    this.wingShakeActive = true
    this.wingShakeTimer = 0
  }

  update(deltaTime: number, flowers: Array<{ position: THREE.Vector3; attractRadius: number; active: boolean }>) {
    this.wingPhase += deltaTime * WING_FREQ * Math.PI * 2

    if (this.wingShakeActive) {
      this.wingShakeTimer += deltaTime
      if (this.wingShakeTimer < 0.2) {
        const shakeT = this.wingShakeTimer / 0.2
        const rapidPhase = this.wingShakeTimer * 4 * Math.PI * 2
        const shakeAmplitude = Math.sin(rapidPhase)
        const baseT = Math.sin(this.wingPhase) * 0.5 + 0.5
        this.wingAngle = lerp(WING_ANGLE_MIN, WING_ANGLE_MAX, baseT) + shakeAmplitude * 0.3 * (1 - shakeT)
      } else {
        this.wingShakeActive = false
      }
    }

    if (!this.wingShakeActive) {
      const cycleT = this.wingPhase % (Math.PI * 2)
      const normalizedT = cycleT / (Math.PI * 2)
      const angleT = normalizedT < 0.5
        ? easeInOutCubic(normalizedT * 2)
        : easeInOutCubic(1 - (normalizedT - 0.5) * 2)
      this.wingAngle = lerp(WING_ANGLE_MIN, WING_ANGLE_MAX, angleT)
    }

    if (this.flyingToTarget && this.targetPosition) {
      const toTarget = new THREE.Vector3().subVectors(this.targetPosition, this.position)
      const dist = toTarget.length()
      if (dist < 0.15) {
        this.flyingToTarget = false
        this.targetPosition = null
      } else {
        this.wanderDirection.copy(toTarget).normalize()
        this.direction.lerp(this.wanderDirection, clamp(deltaTime * 3, 0, 1))
        this.speed = lerp(this.speed, 3.0, deltaTime * 2)
      }
    } else if (this.isAttractedFlower) {
      const toFlower = new THREE.Vector3().subVectors(this.isAttractedFlower, this.position)
      const distF = toFlower.length()
      if (distF < 1.2) {
        this.attractTimer += deltaTime
        this.attractPhase += deltaTime * 2
        const circleAngle = this.attractPhase
        this.wanderDirection.set(
          Math.cos(circleAngle) * 0.3,
          Math.sin(circleAngle * 0.7) * 0.3,
          Math.sin(circleAngle * 1.3) * 0.2
        ).normalize()
        this.speed = lerp(this.speed, 0.6, deltaTime * 2)
        this.direction.lerp(this.wanderDirection, clamp(deltaTime * 2, 0, 1))
      } else {
        this.wanderDirection.copy(toFlower).normalize()
        this.direction.lerp(this.wanderDirection, clamp(deltaTime * 1.5, 0, 1))
        this.speed = lerp(this.speed, 1.3, deltaTime)
      }
    } else {
      this.wanderTimer += deltaTime
      if (this.wanderTimer > this.nextWanderChange) {
        this.wanderTimer = 0
        this.nextWanderChange = randomRange(1.0, 2.5)
        this.wanderDirection.set(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize()
        let nearestFlower: { position: THREE.Vector3; attractRadius: number; active: boolean } | null = null
        let minDist = Infinity
        for (const f of flowers) {
          if (!f.active) continue
          const d = f.position.distanceTo(this.position)
          if (d < f.attractRadius && d < minDist) {
            minDist = d
            nearestFlower = f
          }
        }
        if (nearestFlower && Math.random() < 0.5) {
          this.isAttractedFlower = nearestFlower.position.clone()
          this.attractTimer = 0
          this.attractPhase = Math.random() * Math.PI * 2
          this.triggerWingShake()
        } else {
          this.triggerWingShake()
        }
        if (Math.random() < 0.4) {
          this.speed = randomRange(0.8, 1.5)
        }
      }
      this.direction.lerp(this.wanderDirection, deltaTime * 0.8)
      this.speed = clamp(this.speed + (Math.random() - 0.5) * 0.1, 0.7, 1.6)
    }

    this.direction.normalize()

    const moveAmount = this.direction.clone().multiplyScalar(this.speed * deltaTime)
    this.position.add(moveAmount)

    const distFromCenter = this.position.length()
    if (distFromCenter > SPHERE_RADIUS) {
      const pushBack = this.position.clone().normalize().multiplyScalar(-(distFromCenter - SPHERE_RADIUS))
      this.position.add(pushBack.multiplyScalar(0.5))
      const normal = this.position.clone().normalize().multiplyScalar(-1)
      this.direction.lerp(normal, deltaTime * 2)
      this.wanderDirection.lerp(normal, deltaTime * 2)
    }

    this.trail.unshift({ position: this.position.clone(), age: 0 })
    if (this.trail.length > 20) {
      this.trail = this.trail.slice(0, 20)
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].age = i
    }

    if (this.isAttractedFlower && this.attractTimer > randomRange(4, 8)) {
      this.isAttractedFlower = null
    }
  }

  getParticles(): {
    positions: Float32Array
    colors: Float32Array
    sizes: Float32Array
    opacities: Float32Array
  } {
    const totalCount = 1 + 3 + this.wingParticlesLeft.length * 2 + this.trail.length
    const positions = new Float32Array(totalCount * 3)
    const colors = new Float32Array(totalCount * 3)
    const sizes = new Float32Array(totalCount)
    const opacities = new Float32Array(totalCount)

    let idx = 0

    const forward = this.direction.clone().normalize()
    let up = new THREE.Vector3(0, 1, 0)
    let right = new THREE.Vector3().crossVectors(forward, up).normalize()
    if (right.lengthSq() < 0.01) {
      right.set(1, 0, 0)
      if (Math.abs(forward.x) > 0.9) {
        right.set(0, 1, 0)
      }
      right.crossVectors(forward, right).normalize()
    }
    const actualUp = new THREE.Vector3().crossVectors(right, forward).normalize()

    positions[idx * 3] = this.position.x
    positions[idx * 3 + 1] = this.position.y
    positions[idx * 3 + 2] = this.position.z
    colors[idx * 3] = this.primaryColor.r
    colors[idx * 3 + 1] = this.primaryColor.g
    colors[idx * 3 + 2] = this.primaryColor.b
    sizes[idx] = this.headSize
    opacities[idx] = 1.0
    idx++

    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4
      const bodyPos = this.position.clone().add(
        forward.clone().multiplyScalar(-t * 0.4)
      )
      positions[idx * 3] = bodyPos.x
      positions[idx * 3 + 1] = bodyPos.y
      positions[idx * 3 + 2] = bodyPos.z
      colors[idx * 3] = this.primaryColor.r
      colors[idx * 3 + 1] = this.primaryColor.g
      colors[idx * 3 + 2] = this.primaryColor.b
      sizes[idx] = 0.08 * (1 - t * 0.5)
      opacities[idx] = 0.9 - t * 0.3
      idx++
    }

    const wingAngle = this.wingAngle

    for (const wp of this.wingParticlesLeft) {
      const worldPos = this.position.clone()
        .add(forward.clone().multiplyScalar(wp.base.x * 0.15 + 0.05))
        .add(right.clone().multiplyScalar(Math.cos(wingAngle) * wp.base.x))
        .add(actualUp.clone().multiplyScalar(Math.sin(wingAngle) * wp.base.y))
      positions[idx * 3] = worldPos.x
      positions[idx * 3 + 1] = worldPos.y
      positions[idx * 3 + 2] = worldPos.z
      const c = lerpColor(this.primaryColor, this.whiteColor, 0.15)
      colors[idx * 3] = c.r
      colors[idx * 3 + 1] = c.g
      colors[idx * 3 + 2] = c.b
      sizes[idx] = wp.size
      opacities[idx] = 0.95
      idx++
    }

    for (const wp of this.wingParticlesRight) {
      const worldPos = this.position.clone()
        .add(forward.clone().multiplyScalar(wp.base.x * 0.15 + 0.05))
        .add(right.clone().multiplyScalar(Math.cos(wingAngle) * wp.base.x * -1))
        .add(actualUp.clone().multiplyScalar(Math.sin(wingAngle) * wp.base.y))
      positions[idx * 3] = worldPos.x
      positions[idx * 3 + 1] = worldPos.y
      positions[idx * 3 + 2] = worldPos.z
      const c = lerpColor(this.primaryColor, this.whiteColor, 0.15)
      colors[idx * 3] = c.r
      colors[idx * 3 + 1] = c.g
      colors[idx * 3 + 2] = c.b
      sizes[idx] = wp.size
      opacities[idx] = 0.95
      idx++
    }

    for (let i = 0; i < this.trail.length; i++) {
      const tp = this.trail[i]
      const t = i / Math.max(this.trail.length - 1, 1)
      positions[idx * 3] = tp.position.x
      positions[idx * 3 + 1] = tp.position.y
      positions[idx * 3 + 2] = tp.position.z
      const c = lerpColor(this.primaryColor, this.whiteColor, t)
      colors[idx * 3] = c.r
      colors[idx * 3 + 1] = c.g
      colors[idx * 3 + 2] = c.b
      sizes[idx] = 0.1 * (1 - t * 0.5)
      opacities[idx] = 0.8 * (1 - t)
      idx++
    }

    return { positions, colors, sizes, opacities }
  }
}
