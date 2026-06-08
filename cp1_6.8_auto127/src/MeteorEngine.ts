import * as THREE from 'three'
import type { MeteorData } from './store'

const MAX_METEORS = 15
const TRAIL_PARTICLES_PER_METEOR = 80
const MAX_TRAIL_PARTICLES = MAX_METEORS * TRAIL_PARTICLES_PER_METEOR
const METEOR_SPEED_MIN = 30
const METEOR_SPEED_MAX = 80

const trailVertexShader = `
  attribute float aAlpha;
  attribute float aSize;
  attribute vec3 aTrailColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aTrailColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const trailFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.15, d);
    vec3 col = mix(vColor, vec3(1.0), core * 0.7);
    gl_FragColor = vec4(col, vAlpha * glow);
  }
`

interface Meteor {
  id: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  hexColor: string
  lifetime: number
  maxLifetime: number
  trailIndex: number
  trailCount: number
  speed: number
}

export class MeteorEngine {
  private meteors: Meteor[] = []
  private trailPoints: THREE.Points
  private trailMaterial: THREE.ShaderMaterial
  private group: THREE.Group
  private spawnAccumulator = 0
  private meteorFrequency = 5
  private trailLifetime = 3
  private idCounter = 0
  private onMeteorSelected: ((data: MeteorData) => void) | null = null
  private raycaster = new THREE.Raycaster()
  private meteorHitSpheres: THREE.Mesh[] = []

  constructor() {
    this.group = new THREE.Group()
    this.trailMaterial = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      uniforms: {},
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.trailPoints = this.createTrailSystem()
    this.group.add(this.trailPoints)
  }

  private createTrailSystem(): THREE.Points {
    const positions = new Float32Array(MAX_TRAIL_PARTICLES * 3)
    const alphas = new Float32Array(MAX_TRAIL_PARTICLES)
    const sizes = new Float32Array(MAX_TRAIL_PARTICLES)
    const colors = new Float32Array(MAX_TRAIL_PARTICLES * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aTrailColor', new THREE.BufferAttribute(colors, 3))
    geo.setDrawRange(0, 0)
    return new THREE.Points(geo, this.trailMaterial)
  }

  setFrequency(freq: number) {
    this.meteorFrequency = freq
  }

  setTrailLifetime(lifetime: number) {
    this.trailLifetime = lifetime
  }

  setOnMeteorSelected(cb: (data: MeteorData) => void) {
    this.onMeteorSelected = cb
  }

  private spawnMeteor() {
    if (this.meteors.length >= MAX_METEORS) return

    const id = `meteor_${this.idCounter++}`
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 150 + Math.random() * 200
    const pos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )

    const dir = new THREE.Vector3(
      -pos.x + (Math.random() - 0.5) * 100,
      -pos.y + (Math.random() - 0.5) * 100,
      -pos.z + (Math.random() - 0.5) * 100
    ).normalize()

    const speed = METEOR_SPEED_MIN + Math.random() * (METEOR_SPEED_MAX - METEOR_SPEED_MIN)
    const velocity = dir.multiplyScalar(speed)

    const hue = 0.55 + Math.random() * 0.15
    const color = new THREE.Color().setHSL(hue, 0.6, 0.7)
    const hexColor = '#' + color.getHexString()

    const maxLifetime = this.trailLifetime * (0.8 + Math.random() * 0.4)

    const trailIndex = this.findFreeTrailSlot()

    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(3, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    hitSphere.position.copy(pos)
    hitSphere.userData.meteorId = id
    this.group.add(hitSphere)
    this.meteorHitSpheres.push(hitSphere)

    const meteor: Meteor = {
      id,
      position: pos.clone(),
      velocity,
      color,
      hexColor,
      lifetime: 0,
      maxLifetime,
      trailIndex,
      trailCount: 0,
      speed,
    }
    this.meteors.push(meteor)
  }

  private findFreeTrailSlot(): number {
    const usedSlots = new Set(this.meteors.map((m) => m.trailIndex))
    for (let i = 0; i < MAX_METEORS; i++) {
      if (!usedSlots.has(i)) return i
    }
    return 0
  }

  handleClick(mouse: THREE.Vector2, camera: THREE.Camera): boolean {
    this.raycaster.setFromCamera(mouse, camera)
    const intersects = this.raycaster.intersectObjects(this.meteorHitSpheres)
    if (intersects.length > 0) {
      const hitId = intersects[0].object.userData.meteorId as string
      const meteor = this.meteors.find((m) => m.id === hitId)
      if (meteor && this.onMeteorSelected) {
        this.onMeteorSelected({
          id: meteor.id,
          speed: Math.round(meteor.speed * 10) / 10,
          color: meteor.hexColor,
          remainingTime: Math.round((meteor.maxLifetime - meteor.lifetime) * 10) / 10,
          position: [
            Math.round(meteor.position.x * 10) / 10,
            Math.round(meteor.position.y * 10) / 10,
            Math.round(meteor.position.z * 10) / 10,
          ],
        })
        return true
      }
    }
    return false
  }

  getExplosionPosition(meteorId: string): THREE.Vector3 | null {
    const meteor = this.meteors.find((m) => m.id === meteorId)
    return meteor ? meteor.position.clone() : null
  }

  removeMeteor(meteorId: string) {
    const idx = this.meteors.findIndex((m) => m.id === meteorId)
    if (idx === -1) return
    const meteor = this.meteors[idx]
    this.clearTrailParticles(meteor.trailIndex)
    const sphereIdx = this.meteorHitSpheres.findIndex(
      (s) => s.userData.meteorId === meteorId
    )
    if (sphereIdx !== -1) {
      const sphere = this.meteorHitSpheres[sphereIdx]
      this.group.remove(sphere)
      sphere.geometry.dispose()
      ;(sphere.material as THREE.Material).dispose()
      this.meteorHitSpheres.splice(sphereIdx, 1)
    }
    this.meteors.splice(idx, 1)
  }

  private clearTrailParticles(trailIndex: number) {
    const geo = this.trailPoints.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const alphaAttr = geo.getAttribute('aAlpha') as THREE.BufferAttribute
    const sizeAttr = geo.getAttribute('aSize') as THREE.BufferAttribute
    const base = trailIndex * TRAIL_PARTICLES_PER_METEOR
    for (let i = 0; i < TRAIL_PARTICLES_PER_METEOR; i++) {
      const gi = base + i
      posAttr.setXYZ(gi, 0, 0, 0)
      alphaAttr.setX(gi, 0)
      sizeAttr.setX(gi, 0)
    }
    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  }

  getMeteorDataForPanel(): MeteorData[] {
    return this.meteors.map((m) => ({
      id: m.id,
      speed: Math.round(m.speed * 10) / 10,
      color: m.hexColor,
      remainingTime: Math.round((m.maxLifetime - m.lifetime) * 10) / 10,
      position: [
        Math.round(m.position.x * 10) / 10,
        Math.round(m.position.y * 10) / 10,
        Math.round(m.position.z * 10) / 10,
      ],
    }))
  }

  update(delta: number) {
    this.spawnAccumulator += delta * this.meteorFrequency
    while (this.spawnAccumulator >= 1) {
      this.spawnMeteor()
      this.spawnAccumulator -= 1
    }

    const geo = this.trailPoints.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const alphaAttr = geo.getAttribute('aAlpha') as THREE.BufferAttribute
    const sizeAttr = geo.getAttribute('aSize') as THREE.BufferAttribute
    const colorAttr = geo.getAttribute('aTrailColor') as THREE.BufferAttribute

    let totalVisible = 0

    for (let mi = this.meteors.length - 1; mi >= 0; mi--) {
      const meteor = this.meteors[mi]
      meteor.lifetime += delta
      meteor.position.add(meteor.velocity.clone().multiplyScalar(delta))

      const hitSphere = this.meteorHitSpheres.find(
        (s) => s.userData.meteorId === meteor.id
      )
      if (hitSphere) {
        hitSphere.position.copy(meteor.position)
      }

      if (meteor.lifetime >= meteor.maxLifetime) {
        this.removeMeteor(meteor.id)
        continue
      }

      const base = meteor.trailIndex * TRAIL_PARTICLES_PER_METEOR
      for (let i = TRAIL_PARTICLES_PER_METEOR - 1; i > 0; i--) {
        const src = base + i - 1
        const dst = base + i
        posAttr.setXYZ(dst, posAttr.getX(src), posAttr.getY(src), posAttr.getZ(src))
      }
      posAttr.setXYZ(base, meteor.position.x, meteor.position.y, meteor.position.z)

      const lifeRatio = meteor.lifetime / meteor.maxLifetime
      for (let i = 0; i < TRAIL_PARTICLES_PER_METEOR; i++) {
        const gi = base + i
        const trailFade = 1.0 - i / TRAIL_PARTICLES_PER_METEOR
        const lifeFade = 1.0 - lifeRatio
        const alpha = trailFade * lifeFade * 0.9
        alphaAttr.setX(gi, alpha)
        const sz = (1.0 - i / TRAIL_PARTICLES_PER_METEOR) * (3.0 - lifeRatio * 1.5) + 0.3
        sizeAttr.setX(gi, sz)
        const blend = i / TRAIL_PARTICLES_PER_METEOR
        colorAttr.setXYZ(
          gi,
          meteor.color.r * (1 - blend) + 1.0 * blend,
          meteor.color.g * (1 - blend) + 1.0 * blend,
          meteor.color.b * (1 - blend) + 1.0 * blend
        )
        if (alpha > 0.01) totalVisible++
      }
    }

    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    colorAttr.needsUpdate = true

    geo.setDrawRange(0, MAX_TRAIL_PARTICLES)
  }

  reset() {
    const ids = this.meteors.map((m) => m.id)
    ids.forEach((id) => this.removeMeteor(id))
    this.spawnAccumulator = 0
    this.idCounter = 0
  }

  getObject(): THREE.Group {
    return this.group
  }

  dispose() {
    this.trailPoints.geometry.dispose()
    this.trailMaterial.dispose()
    this.meteorHitSpheres.forEach((s) => {
      s.geometry.dispose()
      ;(s.material as THREE.Material).dispose()
    })
  }
}
