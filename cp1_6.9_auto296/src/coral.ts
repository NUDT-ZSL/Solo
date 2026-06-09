import * as THREE from 'three'

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2
const PHI = GOLDEN_RATIO

type ParticleState = 'idle' | 'exploding' | 'gathering' | 'growing' | 'attached'

interface CoralParticle {
  basePosition: THREE.Vector3
  currentPosition: THREE.Vector3
  velocity: THREE.Vector3
  baseRadius: number
  vibrateFreq: number
  vibrateAmp: number
  vibratePhase: number
  baseHue: number
  currentHue: number
  baseAlpha: number
  currentAlpha: number
  state: ParticleState
  explodeCenter: THREE.Vector3 | null
  explodeTimer: number
  gatherTimer: number
  growthTarget: THREE.Vector3 | null
  growthProgress: number
  parentBud: CoralBud | null
  index: number
}

interface CoralBud {
  position: THREE.Vector3
  avgHue: number
  currentRadius: number
  targetRadius: number
  particles: CoralParticle[]
  growthSpeed: number
  fullyGrown: boolean
}

interface BaseParticle {
  basePosition: THREE.Vector3
  currentPosition: THREE.Vector3
  hue: number
  wanderOffset: THREE.Vector3
  wanderSpeed: THREE.Vector2
}

export class CoralSystem {
  public group: THREE.Group
  public particles: CoralParticle[] = []
  public buds: CoralBud[] = []
  public baseParticles: BaseParticle[] = []

  private pointsMesh: THREE.Points | null = null
  private coreMesh: THREE.Points | null = null
  private baseMesh: THREE.Points | null = null
  private haloMesh: THREE.Mesh | null = null

  private particleGeometry: THREE.BufferGeometry | null = null
  private coreGeometry: THREE.BufferGeometry | null = null
  private baseGeometry: THREE.BufferGeometry | null = null

  private rotationSpeed = (5 * Math.PI) / 180
  private breathPhase = 0
  private breathSpeed = Math.PI * 2
  private maxParticles = 3000

  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private alphas: Float32Array

  private corePositions: Float32Array
  private coreColors: Float32Array
  private coreSizes: Float32Array
  private coreAlphas: Float32Array

  private basePositions: Float32Array
  private baseColors: Float32Array
  private baseSizes: Float32Array
  private baseAlphas: Float32Array

  private raycaster: THREE.Raycaster
  private tempVector = new THREE.Vector3()
  private tempColor = new THREE.Color()

  private time = 0

  constructor() {
    this.group = new THREE.Group()
    this.raycaster = new THREE.Raycaster()

    this.positions = new Float32Array(this.maxParticles * 3)
    this.colors = new Float32Array(this.maxParticles * 3)
    this.sizes = new Float32Array(this.maxParticles)
    this.alphas = new Float32Array(this.maxParticles)

    this.corePositions = new Float32Array(200 * 3)
    this.coreColors = new Float32Array(200 * 3)
    this.coreSizes = new Float32Array(200)
    this.coreAlphas = new Float32Array(200)

    this.basePositions = new Float32Array(200 * 3)
    this.baseColors = new Float32Array(200 * 3)
    this.baseSizes = new Float32Array(200)
    this.baseAlphas = new Float32Array(200)

    this.initCoralParticles()
    this.initCore()
    this.initBase()
    this.createMeshes()
  }

  private initCoralParticles() {
    const mainCount = 500
    const totalTurns = 10
    const height = 100
    const startRadius = 10
    const endRadius = 80

    for (let i = 0; i < mainCount; i++) {
      const t = i / mainCount
      const angle = t * totalTurns * Math.PI * 2 * PHI
      const radius = startRadius + (endRadius - startRadius) * t
      const y = -height / 2 + t * height

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const basePos = new THREE.Vector3(x, y, z)
      const hue = 120 + Math.random() * 40
      const particle: CoralParticle = {
        basePosition: basePos,
        currentPosition: basePos.clone(),
        velocity: new THREE.Vector3(),
        baseRadius: 2 + Math.random() * 3,
        vibrateFreq: 0.5 + Math.random() * 1.5,
        vibrateAmp: 2 + Math.random() * 3,
        vibratePhase: Math.random() * Math.PI * 2,
        baseHue: hue,
        currentHue: hue,
        baseAlpha: 0.7,
        currentAlpha: 0.7,
        state: 'idle',
        explodeCenter: null,
        explodeTimer: 0,
        gatherTimer: 0,
        growthTarget: null,
        growthProgress: 0,
        parentBud: null,
        index: i,
      }
      this.particles.push(particle)
    }
  }

  private initCore() {
    const height = 100
    const coreCount = 200

    for (let i = 0; i < coreCount; i++) {
      const t = i / coreCount
      const y = -height / 2 + t * height

      const basePos = new THREE.Vector3(0, y, 0)

      const ix = i * 3
      this.corePositions[ix] = basePos.x
      this.corePositions[ix + 1] = basePos.y
      this.corePositions[ix + 2] = basePos.z

      const hue = 120 + t * 40
      this.tempColor.setHSL(hue / 360, 1.0, 0.55)
      this.coreColors[ix] = this.tempColor.r
      this.coreColors[ix + 1] = this.tempColor.g
      this.coreColors[ix + 2] = this.tempColor.b

      this.coreSizes[i] = 8
      this.coreAlphas[i] = 0.95
    }
  }

  private initBase() {
    const baseCount = 200
    const baseDiameter = 60
    const baseRadius = baseDiameter / 2

    for (let i = 0; i < baseCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = baseRadius * Math.sqrt(Math.random())
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const y = -50

      const hue = 220 + Math.random() * 20

      this.baseParticles.push({
        basePosition: new THREE.Vector3(x, y, z),
        currentPosition: new THREE.Vector3(x, y, z),
        hue,
        wanderOffset: new THREE.Vector3(
          (Math.random() - 0.5) * Math.PI * 2,
          (Math.random() - 0.5) * Math.PI * 2,
          (Math.random() - 0.5) * Math.PI * 2
        ),
        wanderSpeed: new THREE.Vector2(
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5
        ),
      })
    }

    const haloGeo = new THREE.CircleGeometry(60, 64)
    const haloMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center) * 2.0;
          float pulse = 0.8 + 0.2 * sin(uTime * 1.5);
          float alpha = (1.0 - smoothstep(0.0, 1.0, dist)) * 0.2 * pulse;
          vec3 color = mix(vec3(0.2, 0.3, 0.8), vec3(0.1, 0.15, 0.6), dist);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.haloMesh = new THREE.Mesh(haloGeo, haloMat)
    this.haloMesh.rotation.x = -Math.PI / 2
    this.haloMesh.position.y = -50.5
    this.group.add(this.haloMesh)
  }

  private createMeshes() {
    this.particleGeometry = new THREE.BufferGeometry()
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.particleGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1))
    this.particleGeometry.setDrawRange(0, this.particles.length)

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, dist);
          vec3 finalColor = vColor * (1.0 + glow * 1.5);
          gl_FragColor = vec4(finalColor, vAlpha * glow);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.pointsMesh = new THREE.Points(this.particleGeometry, particleMaterial)
    this.group.add(this.pointsMesh)

    this.coreGeometry = new THREE.BufferGeometry()
    this.coreGeometry.setAttribute('position', new THREE.BufferAttribute(this.corePositions, 3))
    this.coreGeometry.setAttribute('color', new THREE.BufferAttribute(this.coreColors, 3))
    this.coreGeometry.setAttribute('size', new THREE.BufferAttribute(this.coreSizes, 1))
    this.coreGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.coreAlphas, 1))

    this.coreMesh = new THREE.Points(this.coreGeometry, particleMaterial.clone())
    this.group.add(this.coreMesh)

    this.baseGeometry = new THREE.BufferGeometry()
    this.baseGeometry.setAttribute('position', new THREE.BufferAttribute(this.basePositions, 3))
    this.baseGeometry.setAttribute('color', new THREE.BufferAttribute(this.baseColors, 3))
    this.baseGeometry.setAttribute('size', new THREE.BufferAttribute(this.baseSizes, 1))
    this.baseGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.baseAlphas, 1))

    this.baseMesh = new THREE.Points(this.baseGeometry, particleMaterial.clone())
    this.group.add(this.baseMesh)
  }

  public handleClick(worldPoint: THREE.Vector3) {
    let nearestIdx = -1
    let nearestDist = 25
    const localPoint = this.tempVector.copy(worldPoint)
    this.group.worldToLocal(localPoint)

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (p.state !== 'idle' && p.state !== 'attached') continue
      const dist = p.currentPosition.distanceTo(localPoint)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestIdx = i
      }
    }

    if (nearestIdx < 0) return

    const center = this.particles[nearestIdx].currentPosition.clone()
    const explodeRadius = 20
    const affected: CoralParticle[] = []

    for (const p of this.particles) {
      if (p.parentBud !== null) continue
      if (p.state !== 'idle' && p.state !== 'attached') continue
      const dist = p.currentPosition.distanceTo(center)
      if (dist < explodeRadius) {
        affected.push(p)
      }
    }

    if (affected.length === 0) return

    let hueSum = 0
    for (const p of affected) {
      p.state = 'exploding'
      p.explodeCenter = center.clone()
      p.explodeTimer = 0

      const dir = p.currentPosition.clone().sub(center).normalize()
      if (dir.lengthSq() < 0.001) {
        dir.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize()
      }
      p.velocity.copy(dir).multiplyScalar(50)

      const newHue = Math.random() * 300
      p.currentHue = newHue
      hueSum += newHue
    }

    const avgHue = hueSum / affected.length

    this.buds.push({
      position: center.clone(),
      avgHue,
      currentRadius: 8,
      targetRadius: 20,
      particles: affected,
      growthSpeed: 0.5,
      fullyGrown: false,
    })

    for (const p of affected) {
      p.gatherTimer = 1.0
    }
  }

  private updateExplosion(p: CoralParticle, dt: number) {
    p.explodeTimer += dt

    if (p.explodeTimer < 0.3) {
      p.currentPosition.addScaledVector(p.velocity, dt)
    }

    p.gatherTimer -= dt
    if (p.gatherTimer <= 0 && p.state === 'exploding') {
      p.state = 'gathering'
    }
  }

  private updateGathering(p: CoralParticle, dt: number) {
    if (!p.explodeCenter) return

    const dir = this.tempVector.copy(p.explodeCenter).sub(p.currentPosition)
    const dist = dir.length()

    if (dist < 0.5) {
      p.state = 'growing'
      p.currentPosition.copy(p.explodeCenter)
      p.growthProgress = 0

      if (p.parentBud === null) {
        for (const bud of this.buds) {
          if (bud.particles.includes(p)) {
            p.parentBud = bud
            break
          }
        }
      }
      return
    }

    dir.normalize().multiplyScalar(20)
    p.currentPosition.addScaledVector(dir, dt)
  }

  private updateGrowing(p: CoralParticle, bud: CoralBud, dt: number) {
    if (bud.fullyGrown) {
      p.state = 'attached'
      return
    }

    const totalInBud = bud.particles.length
    const idx = bud.particles.indexOf(p)
    const angle = (idx / totalInBud) * Math.PI * 2 * PHI
    const turns = 2
    const tAngle = (idx / Math.max(1, totalInBud - 1)) * turns * Math.PI * 2
    const t = idx / Math.max(1, totalInBud - 1)

    const r = bud.currentRadius * (0.3 + 0.7 * t)
    const x = bud.position.x + Math.cos(angle + tAngle) * r
    const z = bud.position.z + Math.sin(angle + tAngle) * r
    const y = bud.position.y + t * bud.currentRadius * 0.5

    const target = this.tempVector.set(x, y, z)
    p.currentPosition.lerp(target, Math.min(1, dt * 5))
    p.currentHue = bud.avgHue + (Math.random() - 0.5) * 10

    p.growthProgress = t
  }

  private updateBuds(dt: number) {
    for (const bud of this.buds) {
      if (!bud.fullyGrown && bud.currentRadius < bud.targetRadius) {
        bud.currentRadius += bud.growthSpeed * dt
        if (bud.currentRadius >= bud.targetRadius) {
          bud.currentRadius = bud.targetRadius
          bud.fullyGrown = true
          for (const p of bud.particles) {
            p.state = 'attached'
            p.basePosition = p.currentPosition.clone()
          }
        }
      }
    }
  }

  private updateIdleParticle(p: CoralParticle, dt: number, breathScale: number, breathAlpha: number) {
    const vibrate = Math.sin(this.time * p.vibrateFreq + p.vibratePhase) * p.vibrateAmp

    let basePos: THREE.Vector3
    if (p.state === 'attached') {
      basePos = p.basePosition
    } else {
      basePos = p.basePosition
    }

    const scaledPos = this.tempVector.copy(basePos).multiplyScalar(breathScale)
    p.currentPosition.set(scaledPos.x, scaledPos.y + vibrate, scaledPos.z)
    p.currentAlpha = p.baseAlpha * breathAlpha
    p.currentHue = p.baseHue
  }

  public update(dt: number) {
    this.time += dt

    this.breathPhase += this.breathSpeed * dt
    const breathScale = 1.0 + 0.1 * Math.sin(this.breathPhase)
    const breathAlpha = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(this.breathPhase))

    this.group.rotation.y += this.rotationSpeed * dt

    for (const p of this.particles) {
      if (p.state === 'idle') {
        this.updateIdleParticle(p, dt, breathScale, breathAlpha)
      } else if (p.state === 'exploding') {
        this.updateExplosion(p, dt)
      } else if (p.state === 'gathering') {
        this.updateGathering(p, dt)
      } else if (p.state === 'growing') {
        if (p.parentBud) {
          this.updateGrowing(p, p.parentBud, dt)
        }
      } else if (p.state === 'attached') {
        const vibrate = Math.sin(this.time * p.vibrateFreq + p.vibratePhase) * p.vibrateAmp
        const scaledPos = this.tempVector.copy(p.basePosition).multiplyScalar(breathScale)
        p.currentPosition.set(scaledPos.x, scaledPos.y + vibrate, scaledPos.z)
        p.currentAlpha = 0.7 * breathAlpha
        p.currentHue = p.parentBud ? p.parentBud.avgHue + (Math.random() - 0.5) * 5 : p.baseHue
      }
    }

    this.updateBuds(dt)
    this.updateParticleBuffers(breathAlpha)
    this.updateCore(breathScale, breathAlpha)
    this.updateBase(dt)

    if (this.haloMesh) {
      const mat = this.haloMesh.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = this.time
      const scale = 1 + 0.05 * Math.sin(this.time * 1.5)
      this.haloMesh.scale.set(scale, scale, scale)
    }
  }

  private updateParticleBuffers(breathAlpha: number) {
    const len = this.particles.length
    for (let i = 0; i < len; i++) {
      const p = this.particles[i]
      const ix = i * 3

      this.positions[ix] = p.currentPosition.x
      this.positions[ix + 1] = p.currentPosition.y
      this.positions[ix + 2] = p.currentPosition.z

      const l = 0.5 + 0.2 * Math.sin(this.breathPhase + i * 0.01)
      this.tempColor.setHSL(p.currentHue / 360, 1.0, l)
      this.colors[ix] = this.tempColor.r
      this.colors[ix + 1] = this.tempColor.g
      this.colors[ix + 2] = this.tempColor.b

      this.sizes[i] = p.baseRadius * (1 + 0.2 * Math.sin(this.breathPhase + i * 0.02))

      let alpha = p.currentAlpha
      if (p.state === 'exploding' || p.state === 'gathering') {
        alpha = 0.9
      }
      this.alphas[i] = Math.min(1, alpha)
    }

    if (this.particleGeometry) {
      this.particleGeometry.attributes.position.needsUpdate = true
      this.particleGeometry.attributes.color.needsUpdate = true
      this.particleGeometry.attributes.size.needsUpdate = true
      this.particleGeometry.attributes.alpha.needsUpdate = true
      this.particleGeometry.setDrawRange(0, len)
    }
  }

  private updateCore(breathScale: number, breathAlpha: number) {
    const coreCount = 200
    const height = 100
    for (let i = 0; i < coreCount; i++) {
      const t = i / coreCount
      const y = (-height / 2 + t * height) * breathScale
      const pulse = 0.9 + 0.1 * Math.sin(this.time * 2 + t * Math.PI * 4)

      const ix = i * 3
      this.corePositions[ix + 1] = y

      const hue = 120 + t * 40
      this.tempColor.setHSL(hue / 360, 1.0, 0.55 + 0.1 * Math.sin(this.breathPhase + t * 5))
      this.coreColors[ix] = this.tempColor.r * pulse
      this.coreColors[ix + 1] = this.tempColor.g * pulse
      this.coreColors[ix + 2] = this.tempColor.b * pulse

      this.coreSizes[i] = 8 * (1 + 0.15 * Math.sin(this.breathPhase + t * 3))
      this.coreAlphas[i] = 0.9 * breathAlpha + 0.05
    }

    if (this.coreGeometry) {
      this.coreGeometry.attributes.position.needsUpdate = true
      this.coreGeometry.attributes.color.needsUpdate = true
      this.coreGeometry.attributes.size.needsUpdate = true
      this.coreGeometry.attributes.alpha.needsUpdate = true
    }
  }

  private updateBase(dt: number) {
    for (let i = 0; i < this.baseParticles.length; i++) {
      const bp = this.baseParticles[i]
      bp.wanderOffset.x += dt * bp.wanderSpeed.x
      bp.wanderOffset.z += dt * bp.wanderSpeed.y

      const wx = Math.sin(bp.wanderOffset.x) * 5
      const wz = Math.cos(bp.wanderOffset.z) * 5

      bp.currentPosition.set(
        bp.basePosition.x + wx,
        bp.basePosition.y,
        bp.basePosition.z + wz
      )

      const ix = i * 3
      this.basePositions[ix] = bp.currentPosition.x
      this.basePositions[ix + 1] = bp.currentPosition.y
      this.basePositions[ix + 2] = bp.currentPosition.z

      this.tempColor.setHSL(bp.hue / 360, 0.8, 0.35 + 0.05 * Math.sin(this.time + i * 0.1))
      this.baseColors[ix] = this.tempColor.r
      this.baseColors[ix + 1] = this.tempColor.g
      this.baseColors[ix + 2] = this.tempColor.b

      this.baseSizes[i] = 3 + Math.random() * 2
      this.baseAlphas[i] = 0.6 + 0.2 * Math.sin(this.time * 1.5 + i * 0.2)
    }

    if (this.baseGeometry) {
      this.baseGeometry.attributes.position.needsUpdate = true
      this.baseGeometry.attributes.color.needsUpdate = true
      this.baseGeometry.attributes.size.needsUpdate = true
      this.baseGeometry.attributes.alpha.needsUpdate = true
    }
  }

  public getParticlesMesh(): THREE.Points | null {
    return this.pointsMesh
  }

  public getAllMeshes(): THREE.Object3D[] {
    const result: THREE.Object3D[] = []
    if (this.pointsMesh) result.push(this.pointsMesh)
    if (this.coreMesh) result.push(this.coreMesh)
    if (this.baseMesh) result.push(this.baseMesh)
    return result
  }
}
