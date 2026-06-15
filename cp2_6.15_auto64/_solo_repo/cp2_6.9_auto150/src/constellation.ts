import * as THREE from 'three'
import { ThemeManager, mixColors } from './theme'

export interface Star {
  id: number
  position: THREE.Vector3
  radius: number
  colorIndex: number
  mesh: THREE.Mesh
}

export interface Connection {
  starA: Star
  starB: Star
  line: THREE.Line
  fadeStart: number
  fadingIn: boolean
}

export interface FlowParticle {
  connection: Connection
  progress: number
  speed: number
  trail: THREE.Points
  trailPositions: Float32Array
  trailAlphas: Float32Array
  sphere: THREE.Mesh
}

export class ConstellationManager {
  private stars: Star[] = []
  private connections: Connection[] = []
  private flowParticles: FlowParticle[] = []
  private scene: THREE.Scene
  private themeManager: ThemeManager
  private nextStarId: number = 0
  private isDragging: boolean = false
  private dragStarCount: number = 0
  private lastMousePos: THREE.Vector3 = new THREE.Vector3()
  private dragStartDistance: number = 0
  private readonly MAX_STARS_PER_DRAG = 50
  private readonly STAR_OFFSET_MAX = 60
  private readonly CONNECTION_DISTANCE = 120
  private readonly FADE_DURATION = 800
  private readonly PARTICLE_SPEED = 150
  private readonly TRAIL_LENGTH = 20
  private readonly MAX_PARTICLES_PER_CONNECTION = 8
  private flowEnabled: boolean = false
  private starGroup: THREE.Group
  private connectionGroup: THREE.Group
  private particleGroup: THREE.Group

  constructor(scene: THREE.Scene, themeManager: ThemeManager) {
    this.scene = scene
    this.themeManager = themeManager

    this.starGroup = new THREE.Group()
    this.connectionGroup = new THREE.Group()
    this.particleGroup = new THREE.Group()

    this.scene.add(this.starGroup)
    this.scene.add(this.connectionGroup)
    this.scene.add(this.particleGroup)
  }

  getGroup(): THREE.Group {
    return this.starGroup
  }

  startDrag(worldPos: THREE.Vector3): void {
    this.isDragging = true
    this.dragStarCount = 0
    this.lastMousePos.copy(worldPos)
    this.dragStartDistance = 0
    this.addStar(worldPos)
  }

  updateDrag(worldPos: THREE.Vector3): void {
    if (!this.isDragging) return
    if (this.dragStarCount >= this.MAX_STARS_PER_DRAG) return

    const dist = this.lastMousePos.distanceTo(worldPos)
    this.dragStartDistance += dist

    if (this.dragStartDistance >= 8) {
      this.addStar(worldPos)
      this.dragStartDistance = 0
    }
    this.lastMousePos.copy(worldPos)
  }

  endDrag(): void {
    this.isDragging = false
  }

  private addStar(center: THREE.Vector3): void {
    const offsetX = (Math.random() - 0.5) * 2 * this.STAR_OFFSET_MAX
    const offsetY = (Math.random() - 0.5) * 2 * this.STAR_OFFSET_MAX

    const position = new THREE.Vector3(
      center.x + offsetX,
      center.y + offsetY,
      center.z
    )

    const radius = 3 + Math.random() * 5
    const colorIndex = Math.floor(Math.random() * 5)

    const geometry = new THREE.SphereGeometry(radius, 16, 16)
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.themeManager.getInterpolatedColor(colorIndex)),
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    this.starGroup.add(mesh)

    const star: Star = {
      id: this.nextStarId++,
      position,
      radius,
      colorIndex,
      mesh,
    }

    this.stars.push(star)
    this.dragStarCount++
    this.updateConnectionsForStar(star)
  }

  private updateConnectionsForStar(newStar: Star): void {
    for (let i = 0; i < this.stars.length - 1; i++) {
      const existingStar = this.stars[i]
      const distance = newStar.position.distanceTo(existingStar.position)

      if (distance < this.CONNECTION_DISTANCE) {
        this.createConnection(existingStar, newStar)
      }
    }
  }

  private createConnection(starA: Star, starB: Star): void {
    const points = [starA.position.clone(), starB.position.clone()]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      linewidth: 1.5,
    })

    const line = new THREE.Line(geometry, material)
    this.connectionGroup.add(line)

    const connection: Connection = {
      starA,
      starB,
      line,
      fadeStart: performance.now(),
      fadingIn: true,
    }

    this.connections.push(connection)
  }

  toggleFlow(): void {
    this.flowEnabled = !this.flowEnabled
    if (this.flowEnabled) {
      this.createFlowParticles()
    } else {
      this.clearFlowParticles()
    }
  }

  isFlowEnabled(): boolean {
    return this.flowEnabled
  }

  private createFlowParticles(): void {
    for (const connection of this.connections) {
      const particleCount = Math.min(
        this.MAX_PARTICLES_PER_CONNECTION,
        Math.max(1, Math.floor(connection.starA.position.distanceTo(connection.starB.position) / 50))
      )

      for (let i = 0; i < particleCount; i++) {
        this.createSingleParticle(connection, i / particleCount)
      }
    }
  }

  private createSingleParticle(connection: Connection, initialProgress: number): void {
    const mixedColor = mixColors(
      this.themeManager.getInterpolatedColor(connection.starA.colorIndex),
      this.themeManager.getInterpolatedColor(connection.starB.colorIndex)
    )

    const sphereGeo = new THREE.SphereGeometry(1.5, 8, 8)
    const sphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(mixedColor),
      transparent: true,
      opacity: 0.9,
    })
    const sphere = new THREE.Mesh(sphereGeo, sphereMat)

    const trailCount = 10
    const trailPositions = new Float32Array(trailCount * 3)
    const trailAlphas = new Float32Array(trailCount)
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    trailGeo.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1))

    const trailMat = new THREE.PointsMaterial({
      size: 3,
      color: new THREE.Color(mixedColor),
      transparent: true,
      opacity: 0.8,
      vertexColors: false,
      depthWrite: false,
    })

    const trail = new THREE.Points(trailGeo, trailMat)

    this.particleGroup.add(sphere)
    this.particleGroup.add(trail)

    this.flowParticles.push({
      connection,
      progress: initialProgress,
      speed: this.PARTICLE_SPEED,
      trail,
      trailPositions,
      trailAlphas,
      sphere,
    })
  }

  private clearFlowParticles(): void {
    for (const p of this.flowParticles) {
      this.particleGroup.remove(p.sphere)
      this.particleGroup.remove(p.trail)
      p.sphere.geometry.dispose()
      ;(p.sphere.material as THREE.Material).dispose()
      p.trail.geometry.dispose()
      ;(p.trail.material as THREE.Material).dispose()
    }
    this.flowParticles = []
  }

  update(deltaTime: number): void {
    this.themeManager.update()
    this.updateStarColors()
    this.updateConnectionFades()

    if (this.flowEnabled) {
      this.updateFlowParticles(deltaTime)
    }
  }

  private updateStarColors(): void {
    for (const star of this.stars) {
      const color = new THREE.Color(this.themeManager.getInterpolatedColor(star.colorIndex))
      ;(star.mesh.material as THREE.MeshBasicMaterial).color.copy(color)
    }
  }

  private updateConnectionFades(): void {
    const now = performance.now()
    for (const conn of this.connections) {
      if (conn.fadingIn) {
        const elapsed = now - conn.fadeStart
        const t = Math.min(1, elapsed / this.FADE_DURATION)
        ;(conn.line.material as THREE.LineBasicMaterial).opacity = t * 0.4
        if (t >= 1) {
          conn.fadingIn = false
        }
      }
    }
  }

  private updateFlowParticles(deltaTime: number): void {
    for (const p of this.flowParticles) {
      const dist = p.connection.starA.position.distanceTo(p.connection.starB.position)
      if (dist === 0) continue

      const progressDelta = (p.speed * deltaTime) / dist
      p.progress = (p.progress + progressDelta) % 1

      const start = p.connection.starA.position
      const end = p.connection.starB.position

      const currentPos = new THREE.Vector3().lerpVectors(start, end, p.progress)
      p.sphere.position.copy(currentPos)

      const trailPointCount = 10
      for (let i = 0; i < trailPointCount; i++) {
        const trailT = (p.progress - (i / trailPointCount) * (this.TRAIL_LENGTH / dist) + 1) % 1
        const trailPos = new THREE.Vector3().lerpVectors(start, end, trailT)
        p.trailPositions[i * 3] = trailPos.x
        p.trailPositions[i * 3 + 1] = trailPos.y
        p.trailPositions[i * 3 + 2] = trailPos.z
        p.trailAlphas[i] = 0.8 * (1 - i / trailPointCount)
      }
      ;(p.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
  }

  getStars(): Star[] {
    return this.stars
  }

  getConnections(): Connection[] {
    return this.connections
  }

  getFlowParticles(): FlowParticle[] {
    return this.flowParticles
  }

  dispose(): void {
    this.clearFlowParticles()
    for (const star of this.stars) {
      this.starGroup.remove(star.mesh)
      star.mesh.geometry.dispose()
      ;(star.mesh.material as THREE.Material).dispose()
    }
    for (const conn of this.connections) {
      this.connectionGroup.remove(conn.line)
      conn.line.geometry.dispose()
      ;(conn.line.material as THREE.Material).dispose()
    }
    this.stars = []
    this.connections = []
  }
}
