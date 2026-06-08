import * as THREE from 'three'
import { starCoreVertexShader, starCoreFragmentShader } from '@/shaders/starCore'
import { burstVertexShader, burstFragmentShader } from '@/shaders/burstParticle'
import { useSimStore, type StarInfo } from '@/store'
import type { ClusterInfo } from './NebulaSimulator'

const MAX_STARS = 5
const BURST_PARTICLE_COUNT = 200

export class StarCore {
  mesh: THREE.Mesh
  glowSprite: THREE.Sprite
  light: THREE.PointLight
  group: THREE.Group
  info: StarInfo
  private birthTime: number
  private targetScale: number
  private material: THREE.ShaderMaterial

  constructor(position: THREE.Vector3, clusterInfo: ClusterInfo) {
    this.birthTime = Date.now()
    this.targetScale = 0.5 + clusterInfo.particleCount * 0.008

    const mass = +(clusterInfo.totalMass * (10 + Math.random() * 40)).toFixed(1)
    const temperature = Math.round(3000 + mass * 200 + Math.random() * 2000)
    const lifespan = +((10000 - mass * 50) * (0.8 + Math.random() * 0.4)).toFixed(0)

    this.info = {
      id: `star-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mass,
      temperature,
      lifespan: Math.max(100, +lifespan),
      position: { x: position.x, y: position.y, z: position.z },
    }

    this.group = new THREE.Group()
    this.group.position.copy(position)

    const store = useSimStore.getState()

    const geo = new THREE.SphereGeometry(1, 32, 32)
    this.material = new THREE.ShaderMaterial({
      vertexShader: starCoreVertexShader,
      fragmentShader: starCoreFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uGlowIntensity: { value: store.glowIntensity },
      },
    })
    this.mesh = new THREE.Mesh(geo, this.material)
    this.group.add(this.mesh)

    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = 256
    glowCanvas.height = 256
    const ctx = glowCanvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, 'rgba(255,200,100,0.6)')
    gradient.addColorStop(0.3, 'rgba(255,150,50,0.3)')
    gradient.addColorStop(0.7, 'rgba(180,100,255,0.1)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    const glowTex = new THREE.CanvasTexture(glowCanvas)
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.glowSprite = new THREE.Sprite(glowMat)
    this.glowSprite.scale.setScalar(4)
    this.group.add(this.glowSprite)

    this.light = new THREE.PointLight(0xffa040, 2, 15)
    this.group.add(this.light)

    this.group.scale.setScalar(0.01)
  }

  update(time: number) {
    const elapsed = (Date.now() - this.birthTime) / 1000
    const growDuration = 2.0
    const t = Math.min(elapsed / growDuration, 1.0)
    const eased = 1 - Math.pow(1 - t, 3)
    const currentScale = 0.01 + (this.targetScale - 0.01) * eased
    this.group.scale.setScalar(currentScale)

    this.material.uniforms.uTime.value = time
    const store = useSimStore.getState()
    this.material.uniforms.uGlowIntensity.value = store.glowIntensity

    const glowScale = 3 + Math.sin(time * 2) * 0.3
    this.glowSprite.scale.setScalar(glowScale * currentScale * store.glowIntensity)
    this.light.intensity = 2 * store.glowIntensity * eased
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.material.dispose()
    ;(this.glowSprite.material as THREE.SpriteMaterial).map?.dispose()
    ;(this.glowSprite.material as THREE.SpriteMaterial).dispose()
  }
}

export class BurstEffect {
  points: THREE.Points
  private material: THREE.ShaderMaterial
  private startTime: number
  private duration: number = 1.5
  private velocityAttr: THREE.BufferAttribute

  constructor(position: THREE.Vector3) {
    this.startTime = Date.now()
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(BURST_PARTICLE_COUNT * 3)
    const velocities = new Float32Array(BURST_PARTICLE_COUNT * 3)
    const colors = new Float32Array(BURST_PARTICLE_COUNT * 3)
    const sizes = new Float32Array(BURST_PARTICLE_COUNT)
    const alphas = new Float32Array(BURST_PARTICLE_COUNT)

    const palette = [
      new THREE.Color('#fbbf24'),
      new THREE.Color('#f59e0b'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#d946ef'),
      new THREE.Color('#a855f7'),
    ]

    for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
      const i3 = i * 3
      positions[i3] = position.x
      positions[i3 + 1] = position.y
      positions[i3 + 2] = position.z

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 0.3 + Math.random() * 1.2
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      velocities[i3 + 2] = Math.cos(phi) * speed

      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i3] = c.r
      colors[i3 + 1] = c.g
      colors[i3 + 2] = c.b

      sizes[i] = 2.0 + Math.random() * 4.0
      alphas[i] = 0.6 + Math.random() * 0.4
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.velocityAttr = new THREE.BufferAttribute(velocities, 3)
    geo.setAttribute('aVelocity', this.velocityAttr)
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader: burstVertexShader,
      fragmentShader: burstFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(geo, this.material)
    this.points.frustumCulled = false
  }

  update(): boolean {
    const elapsed = (Date.now() - this.startTime) / 1000
    const t = elapsed / this.duration
    this.material.uniforms.uTime.value = t
    return t < 1.0
  }

  dispose() {
    this.points.geometry.dispose()
    this.material.dispose()
  }
}

export class StarFormation {
  stars: StarCore[] = []
  bursts: BurstEffect[] = []
  group: THREE.Group

  constructor() {
    this.group = new THREE.Group()
  }

  tryFormStar(cluster: ClusterInfo): boolean {
    if (this.stars.length >= MAX_STARS) return false
    const pos = cluster.position.clone()
    for (const s of this.stars) {
      if (s.group.position.distanceTo(pos) < 4) return false
    }
    const star = new StarCore(pos, cluster)
    this.stars.push(star)
    this.group.add(star.group)
    return true
  }

  triggerBurst(star: StarCore): BurstEffect {
    const burst = new BurstEffect(star.group.position.clone())
    this.bursts.push(burst)
    this.group.add(burst.points)
    return burst
  }

  removeStar(star: StarCore) {
    const idx = this.stars.indexOf(star)
    if (idx >= 0) {
      this.stars.splice(idx, 1)
      this.group.remove(star.group)
      star.dispose()
    }
  }

  update(time: number) {
    for (const star of this.stars) {
      star.update(time)
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const alive = this.bursts[i].update()
      if (!alive) {
        this.group.remove(this.bursts[i].points)
        this.bursts[i].dispose()
        this.bursts.splice(i, 1)
      }
    }
  }

  dispose() {
    for (const star of this.stars) star.dispose()
    for (const burst of this.bursts) burst.dispose()
  }
}
